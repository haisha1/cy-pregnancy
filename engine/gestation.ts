/**
 * 孕周与日期算法：除 todayISO 读取设备日期外，计算由显式入参决定；不依赖 Vue、页面或存储，便于单独验证。
 */
import type {
  CalculationResult,
  GestationSummary,
  ISODate,
  PregnancyBasis,
  PregnancyBasisInput,
} from "../types/medical";
import { invalid, validateGestation } from "./validation";

export const GESTATION_DAYS = 280;
const DAY_MS = 86_400_000;
const DATING_REFS = ["ACOG_DATING_2017"];

/** 用 UTC 日序号处理纯日期，避免设备时区或夏令时让日期差出现小数天或偏移。 */
function dateToDay(date: ISODate): number {
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date))
    throw new RangeError("请填写 YYYY-MM-DD 格式的有效日期");
  const [year, month, day] = date.split("-").map(Number);
  if (year < 1 || year > 9999) throw new RangeError("日期年份超出支持范围");
  const utc = new Date(0);
  utc.setUTCFullYear(year, month - 1, day);
  utc.setUTCHours(0, 0, 0, 0);
  if (
    utc.getUTCFullYear() !== year ||
    utc.getUTCMonth() !== month - 1 ||
    utc.getUTCDate() !== day
  ) {
    throw new RangeError("日期不存在，请检查年月日");
  }
  return utc.getTime() / DAY_MS;
}

export function isValidISODate(date: string): boolean {
  try {
    dateToDay(date);
    return true;
  } catch {
    return false;
  }
}

export function addDays(date: ISODate, days: number): ISODate {
  if (!Number.isSafeInteger(days)) throw new RangeError("日期偏移须为整数天");
  const result = new Date((dateToDay(date) + days) * DAY_MS);
  if (
    !Number.isFinite(result.getTime()) ||
    result.getUTCFullYear() < 1 ||
    result.getUTCFullYear() > 9999
  ) {
    throw new RangeError("日期超出支持范围");
  }
  return result.toISOString().slice(0, 10);
}

export function diffDays(later: ISODate, earlier: ISODate): number {
  return dateToDay(later) - dateToDay(earlier);
}

/** 这里读取设备本地日历日期；调用计算函数时显式传入日期，历史结果才能复现。 */
export function todayISO(): ISODate {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

/** 历史检查可以补录，但不能晚于调用方提供的当前日期；校验成功返回 null，否则返回错误文案。 */
export function validateMeasurementDate(
  date: ISODate,
  asOfDate: ISODate,
): string | null {
  if (!isValidISODate(date)) return "请选择有效的测量日期";
  if (!isValidISODate(asOfDate)) return "当前日期无效，请检查设备日期设置";
  return diffDays(date, asOfDate) > 0
    ? "测量日期不能晚于今天，请按报告填写实际检查日期"
    : null;
}

export function gestationWarning(totalDays: number): string | null {
  return Number.isInteger(totalDays) && totalDays >= 294
    ? "已达到或超过 42 周，请及时联系产检医生核对孕周与随访安排。"
    : null;
}

export function formatGestation(totalDays: number): string {
  if (!Number.isInteger(totalDays) || totalDays < 0) return "—";
  return `${Math.floor(totalDays / 7)}周+${totalDays % 7}天`;
}

export function splitGestation(totalDays: number): {
  weeks: number;
  days: number;
} {
  if (!Number.isInteger(totalDays) || totalDays < 0)
    throw new RangeError("孕期天数须为非负整数");
  return { weeks: Math.floor(totalDays / 7), days: totalDays % 7 };
}

export function gestationToDays(
  weeks: number,
  days: number,
): CalculationResult<{ totalDays: number }> {
  const issues = validateGestation(weeks, days);
  if (issues.length)
    return {
      status: "invalid",
      message: issues[0].message,
      issues,
      referenceIds: [],
    };
  return {
    status: "ready",
    value: { totalDays: weeks * 7 + days },
    referenceIds: [],
  };
}

export function dateAtGestation(
  basis: { lmpEquivalent: ISODate },
  weeks: number,
  days: number,
): CalculationResult<ISODate> {
  const ga = gestationToDays(weeks, days);
  if (ga.status !== "ready") return { ...ga };
  try {
    return {
      status: "ready",
      value: addDays(basis?.lmpEquivalent, ga.value.totalDays),
      referenceIds: [],
    };
  } catch {
    return invalid("basis", "INVALID_DATE", "孕期基准日期无效，请重新填写");
  }
}

export function crlToGestationDays(crlMm: number): CalculationResult<{
  totalDays: number;
  unroundedDays: number;
  sdDays: number;
}> {
  const referenceIds = ["INTERGROWTH_CRL_2014"];
  if (!Number.isFinite(crlMm) || crlMm < 15 || crlMm > 95) {
    return invalid(
      "crlMm",
      "CRL_OUT_OF_RANGE",
      "该定年公式仅适用于 CRL 15–95 mm，请确认测量值与单位",
      referenceIds,
    );
  }
  const unroundedDays = 40.9041 + 3.21585 * Math.sqrt(crlMm) + 0.348956 * crlMm;
  return {
    status: "ready",
    value: {
      totalDays: Math.round(unroundedDays),
      unroundedDays,
      sdDays: 2.39102 + 0.0193474 * crlMm,
    },
    referenceIds,
  };
}

export function createPregnancyBasis(
  input: PregnancyBasisInput,
): CalculationResult<PregnancyBasis> {
  if (!input || !isValidISODate(input.date))
    return invalid("date", "INVALID_DATE", "请填写有效日期");
  let lmpEquivalent: ISODate;
  let referenceIds = [...DATING_REFS];
  const warnings: string[] = [];
  try {
    switch (input.method) {
      case "LMP":
        lmpEquivalent = input.date;
        warnings.push(
          "末次月经法按 28 天月经周期估算；月经不规律时请与医生核对孕周。",
        );
        break;
      case "EDD":
        lmpEquivalent = addDays(input.date, -GESTATION_DAYS);
        break;
      case "IVF":
        if (
          !Number.isInteger(input.embryoAgeDays) ||
          input.embryoAgeDays < 1 ||
          input.embryoAgeDays > 7
        ) {
          return invalid(
            "embryoAgeDays",
            "INVALID_EMBRYO_AGE",
            "胚胎龄须为 1–7 天的整数，请按生殖中心记录填写",
            referenceIds,
          );
        }
        // On transfer day GA is 14 + embryo age. D3 = 17 d; D5 = 19 d.
        lmpEquivalent = addDays(input.date, -(14 + input.embryoAgeDays));
        break;
      case "CRL": {
        const estimation = crlToGestationDays(input.crlMm);
        if (estimation.status !== "ready") return estimation;
        lmpEquivalent = addDays(input.date, -estimation.value.totalDays);
        referenceIds = [...estimation.referenceIds, ...DATING_REFS];
        warnings.push("CRL 定年是统计估计，不能用于判断胎儿是否发育正常。");
        if (input.crlMm > 84)
          warnings.push(
            "CRL 已超过常规早孕定年使用范围，请由医生结合头围等信息核对孕周。",
          );
        break;
      }
      case "KNOWN_GA": {
        const issues = validateGestation(input.weeks, input.days);
        if (issues.length)
          return {
            status: "invalid",
            message: issues[0].message,
            issues,
            referenceIds,
          };
        lmpEquivalent = addDays(input.date, -(input.weeks * 7 + input.days));
        break;
      }
      default:
        return invalid("method", "UNKNOWN_METHOD", "请选择支持的孕周计算方式");
    }
    return {
      status: "ready",
      value: {
        method: input.method,
        anchorDate: input.date,
        lmpEquivalent,
        edd: addDays(lmpEquivalent, GESTATION_DAYS),
        referenceIds,
        warnings,
        input: { ...input },
      },
      referenceIds,
    };
  } catch (error) {
    return invalid(
      "date",
      "DATE_OUT_OF_RANGE",
      error instanceof Error ? error.message : "日期超出支持范围",
      referenceIds,
    );
  }
}

export function getPregnancySummary(
  basis: {
    lmpEquivalent: ISODate;
    edd?: ISODate;
    referenceIds?: string[];
    warnings?: string[];
  },
  asOfDate: ISODate,
): CalculationResult<GestationSummary> {
  if (
    !basis ||
    !isValidISODate(basis.lmpEquivalent) ||
    (basis.edd !== undefined && !isValidISODate(basis.edd)) ||
    !isValidISODate(asOfDate)
  ) {
    return invalid(
      "date",
      "INVALID_DATE",
      "孕期基准或查询日期无效，请重新填写",
    );
  }
  let edd: string;
  try {
    edd = basis.edd ?? addDays(basis.lmpEquivalent, GESTATION_DAYS);
  } catch {
    return invalid("basis", "DATE_OUT_OF_RANGE", "孕期基准日期超出支持范围");
  }
  const referenceIds = [...(basis.referenceIds ?? DATING_REFS)];
  if (diffDays(edd, basis.lmpEquivalent) !== GESTATION_DAYS) {
    return invalid(
      "basis",
      "INCONSISTENT_BASIS",
      "孕期基准与预产期不一致，请重新建立基准",
    );
  }
  const totalDays = diffDays(asOfDate, basis.lmpEquivalent);
  if (totalDays < 0)
    return invalid(
      "asOfDate",
      "DATE_BEFORE_LMP",
      "查询日期早于等效末次月经日期，请检查日期",
      referenceIds,
    );
  const warnings = [...(basis.warnings ?? [])];
  const posttermWarning = gestationWarning(totalDays);
  if (posttermWarning) {
    warnings.push(posttermWarning);
    if (!referenceIds.includes("ACOG_TERM_2013"))
      referenceIds.push("ACOG_TERM_2013");
  }
  return {
    status: "ready",
    value: {
      weeks: Math.floor(totalDays / 7),
      days: totalDays % 7,
      totalDays,
      edd,
      lmpEquivalent: basis.lmpEquivalent,
      asOfDate,
      daysUntilEdd: diffDays(edd, asOfDate),
      progress: Math.min(1, totalDays / GESTATION_DAYS),
      progressPercent: Math.min(
        100,
        Math.round((totalDays / GESTATION_DAYS) * 100),
      ),
      warnings,
    },
    referenceIds,
  };
}
