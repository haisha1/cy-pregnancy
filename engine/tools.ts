/**
 * 通用工具纯计算层：字符串输入 → 校验 → 规范单位 → 可执行的算术结果。ready 仅表示该结果可用，不表示临床正常。
 */
import type { ToolDefinition } from "../data/tool-definitions";
import { diffDays, gestationToDays, isValidISODate } from "./gestation";
export interface ToolResult {
  status: "ready" | "incomplete" | "invalid" | "unavailable";
  values: { label: string; value: number; unit: string }[];
  message: string;
  errors: Record<string, string>;
  normalized: Record<string, number>;
  formulaId: string;
  referenceIds: string[];
}
export function calculateTool(
  tool: ToolDefinition,
  raw: Record<string, string>,
  unit: "cm" | "mm",
): ToolResult {
  const result: ToolResult = {
    status: "unavailable",
    values: [],
    message: "参考数据待核验，暂不提供百分位、区间或临床分类。",
    errors: {},
    normalized: {},
    formulaId: "INPUT_ONLY_V1",
    referenceIds: [...tool.references],
  };
  for (const field of tool.fields) {
    const text = raw[field.key]?.trim();
    if (
      !text ||
      field.kind === "choice" ||
      field.kind === "text" ||
      field.kind === "date"
    )
      continue;
    const n = Number(text);
    if (
      !Number.isFinite(n) ||
      n < 0 ||
      (!field.zero && n === 0) ||
      (field.max !== undefined && n > field.max)
    ) {
      result.errors[field.key] = "请核对有效数值、单位与录入范围";
      continue;
    }
    result.normalized[field.key] =
      n *
      (field.dimension === "length"
        ? unit === "mm"
          ? 0.1
          : 1
        : field.dimension === "area"
          ? unit === "mm"
            ? 0.01
            : 1
          : field.key === "nt"
            ? 0.1
            : 1);
  }
  if (Object.keys(result.errors).length) {
    result.status = "invalid";
    result.message = "请先修正输入错误";
    return result;
  }
  const v = result.normalized;
  function output(
    label: string,
    value: number,
    outUnit: string,
    formulaId: string,
  ) {
    result.status = "ready";
    result.values.push({ label, value, unit: outUnit });
    result.formulaId = formulaId;
  }
  if (tool.key === "cpr") {
    if (v.ua !== undefined && v.mca !== undefined) {
      if (raw.sameExam !== "已核对一致") {
        result.status = "invalid";
        result.errors.sameExam = "请确认两项来自同次检查、同一胎儿";
        result.message = result.errors.sameExam;
      } else
        output(
          "CPR（算术比值）",
          v.mca / v.ua,
          "无量纲",
          "CPR_MCA_PI_DIV_UA_PI_V1",
        );
    } else {
      result.status = "incomplete";
      result.message = "请填写 MCA PI、UA PI，并核对检查与胎儿一致。";
    }
  } else if (tool.key === "uta") {
    if (v.left !== undefined && v.right !== undefined)
      output(
        "双侧 PI 算术均值",
        (v.left + v.right) / 2,
        "无量纲",
        "UTA_ARITHMETIC_MEAN_V1",
      );
    else {
      result.status = "incomplete";
      result.message = "两侧值齐全后才能计算双侧均值，单侧输入可以保存。";
    }
  } else if (tool.key === "afi") {
    const entered = ["q1", "q2", "q3", "q4"].filter((k) => v[k] !== undefined);
    if (entered.length) {
      output(
        entered.length === 4
          ? "AFI 四象限合计"
          : "已填象限合计（不是完整 AFI）",
        entered.reduce((sum, k) => sum + v[k], 0),
        "cm",
        "AFI_FOUR_QUADRANT_SUM_V1",
      );
      if (entered.length < 4)
        result.message = `还缺 ${4 - entered.length} 个象限，不能作为完整 AFI 判断。`;
    }
  } else if (tool.key === "twin-growth") {
    if (v.a !== undefined && v.b !== undefined && raw.sameExam === "已核对一致")
      output(
        "估重算术差异（较大值为分母）",
        (Math.abs(v.a - v.b) / Math.max(v.a, v.b)) * 100,
        "%",
        "EFW_DISCORDANCE_LARGER_DENOMINATOR_V1",
      );
    else {
      result.status = "incomplete";
      result.message = "需要同次检查的两胎 EFW；不跨日期组合。";
    }
  } else if (tool.key === "age") {
    if (!raw.dob || !raw.edd) {
      result.status = "incomplete";
      result.message = "请填写出生日期与预产期（生日仅用于本次计算）。";
    } else if (
      !isValidISODate(raw.dob) ||
      !isValidISODate(raw.edd) ||
      diffDays(raw.edd, raw.dob) < 0
    ) {
      result.status = "invalid";
      result.errors.dob = "请核对出生日期与预产期先后顺序";
      result.message = result.errors.dob;
    } else {
      const age =
        Number(raw.edd.slice(0, 4)) -
        Number(raw.dob.slice(0, 4)) -
        (raw.edd.slice(5) < raw.dob.slice(5) ? 1 : 0);
      output("预产期时的日历周岁", age, "岁", "CALENDAR_COMPLETED_YEARS_V1");
      result.message =
        "年龄不是个体疾病概率。风险表尚未核验，暂不提供背景风险。";
    }
  }
  return result;
}
export function resolveExamDays(
  context: { date: string; weeks: string; days: string; manual: boolean },
  basis: { lmpEquivalent: string } | null,
): number | null {
  if (!isValidISODate(context.date)) return null;
  if (basis && !context.manual) {
    const days = diffDays(context.date, basis.lmpEquivalent);
    return days >= 0 && days <= 300 ? days : null;
  }
  if (!context.weeks.trim()) return null;
  const result = gestationToDays(
    Number(context.weeks),
    Number(context.days || "0"),
  );
  return result.status === "ready" ? result.value.totalDays : null;
}
export function convertDimension(
  value: string,
  from: "cm" | "mm",
  to: "cm" | "mm",
  dimension: "length" | "area",
): string {
  if (!value.trim() || from === to) return value;
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  return String(
    Number(
      (
        n *
        (from === "cm" ? 10 : 0.1) ** (dimension === "area" ? 2 : 1)
      ).toPrecision(14),
    ),
  );
}
export function calculateOrganRatio(
  numerator: string,
  denominator: string,
  confirmed: boolean,
): { value: number | null; error: string } {
  if (!numerator.trim() || !denominator.trim())
    return { value: null, error: "请填写同次检查的分子与分母" };
  const a = Number(numerator),
    b = Number(denominator);
  if (!Number.isFinite(a) || !Number.isFinite(b) || a <= 0 || b <= 0)
    return { value: null, error: "分子、分母须为大于0的有限数值" };
  if (!confirmed)
    return {
      value: null,
      error: "请核对两项来自同次检查、相同心动周期和测量切面",
    };
  return { value: a / b, error: "" };
}
