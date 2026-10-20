/**
 * 档案 store：管理多孕期档案、基准和生长记录。basis/records 是当前选中档案的视图，profiles 保存全部档案。
 */
import { defineStore } from "pinia";
import { ref } from "vue";
import type {
  MeasurementSession,
  SavedBasis,
  StoreResult,
  ProfileEntry,
} from "../types/records";
import { uuid } from "../utils/uuid";
import { readStored, writeStored, STORAGE_KEYS } from "../utils/storage";
import { notify } from "../utils/feedback";
import { isValidISODate } from "../engine/gestation";
import { validateGrowthMeasurement } from "../engine/validation";
import type { GrowthMetric } from "../types/records";
const methods = ["LMP", "EDD", "IVF", "CRL", "KNOWN_GA"];
function validMeasurements(
  values: MeasurementSession["measurements"],
): boolean {
  if (
    !values ||
    typeof values !== "object" ||
    Array.isArray(values) ||
    !Object.keys(values).length
  )
    return false;
  return Object.entries(values).every(
    ([metric, value]) =>
      ["CRL", "BPD", "HC", "AC", "FL"].includes(metric) &&
      typeof value === "number" &&
      validateGrowthMeasurement(metric as GrowthMetric, value) === null,
  );
}
function validRecord(record: MeasurementSession): boolean {
  return (
    !!record &&
    typeof record.id === "string" &&
    typeof record.profileId === "string" &&
    isValidISODate(record.date) &&
    Number.isInteger(record.gaDays) &&
    record.gaDays >= 0 &&
    record.gaDays <= 300 &&
    ["INTERGROWTH", "CUHK"].includes(record.standard) &&
    validMeasurements(record.measurements) &&
    (record.efwGrams === null ||
      (Number.isFinite(record.efwGrams) && record.efwGrams > 0)) &&
    typeof record.formulaVersion === "string" &&
    typeof record.referenceVersion === "string"
  );
}
const id = uuid;
// Pinia 的 setup store：函数内定义响应式状态和操作方法，return 的成员才会暴露给页面；通过 store 访问 ref 状态通常不写 .value。
export const useProfileStore = defineStore("pregnancy-profile", () => {
  // ref 创建响应式状态；脚本读写用 .value，模板中作为顶层绑定使用时会自动解包。修改它后，依赖它的界面会更新。
  const basis = ref<SavedBasis | null>(null);
  const records = ref<MeasurementSession[]>([]);
  const storageError = ref("");
  const profiles = ref<ProfileEntry[]>([]);
  const activeProfileId = ref("");
  let hydrated = false;
  function hydrate() {
    // 本地 JSON 也可能来自旧版本或损坏数据；as 只是类型断言，下面仍需要逐项运行时校验。
    if (hydrated) return;
    hydrated = true;
    try {
      const saved = readStored(STORAGE_KEYS.profile) as {
        version?: number;
        activeProfileId?: string;
        profiles?: ProfileEntry[];
        basis: SavedBasis | null;
        records: MeasurementSession[];
      } | null;
      if (!saved) return;
      if (
        !Array.isArray(saved.records) ||
        (saved.basis &&
          (!isValidISODate(saved.basis.lmpEquivalent) ||
            typeof saved.basis.id !== "string" ||
            !methods.includes(saved.basis.method))) ||
        !saved.records.every(validRecord) ||
        saved.records.some((r) => r.profileId !== saved.basis?.id)
      )
        throw new Error("invalid storage");
      basis.value = saved.basis;
      records.value = saved.records;
      if (saved.version === 2) {
        if (
          !Array.isArray(saved.profiles) ||
          !saved.profiles.every(
            (p) =>
              p.id &&
              p.label &&
              [1, 2].includes(p.fetusCount) &&
              Array.isArray(p.records) &&
              p.records.every((r) => validRecord(r) && r.profileId === p.id) &&
              Array.isArray(p.basisHistory) &&
              Array.isArray(p.recordHistory),
          ) ||
          (saved.activeProfileId &&
            !saved.profiles.some((p) => p.id === saved.activeProfileId))
        )
          throw new Error("invalid profile catalog");
        profiles.value = saved.profiles;
        activeProfileId.value = saved.activeProfileId ?? "";
        const selected = profiles.value.find(
          (p) => p.id === activeProfileId.value,
        );
        basis.value = selected?.basis ?? null;
        records.value = selected?.records ?? [];
      } else if (saved.basis) {
        // 兼容旧版单档案结构：先在内存中转换为多档案，保留原记录，不在读取时覆盖原存储。
        activeProfileId.value = saved.basis.id;
        profiles.value = [
          {
            id: saved.basis.id,
            label: "本次孕期",
            fetusCount: 1,
            chorionicity: "unknown",
            state: "active",
            basis: saved.basis,
            records: saved.records.map((r) => ({
              ...r,
              fetus: r.fetus ?? "singleton",
            })),
            basisHistory: [],
            recordHistory: [],
          },
        ];
        records.value = profiles.value[0].records;
      }
    } catch {
      storageError.value =
        "档案读取失败。原始数据仍保留，请检查设备存储后重新打开。";
      notify(storageError.value, "error");
    }
  }
  function persist(
    nextBasis: SavedBasis | null,
    nextRecords: MeasurementSession[],
  ): StoreResult {
    if (storageError.value) return { ok: false, message: storageError.value };
    try {
      const profileId = activeProfileId.value || nextBasis?.id || "";
      let nextProfiles = profiles.value.slice();
      if (profileId) {
        const current = nextProfiles.find((p) => p.id === profileId);
        const oldBasis = current?.basis;
        const history = current?.basisHistory ?? [];
        const changed = (current?.records ?? []).filter((old) =>
          nextRecords.some(
            (next) =>
              next.id === old.id &&
              JSON.stringify(next) !== JSON.stringify(old),
          ),
        );
        const retainedHistory = (current?.recordHistory ?? []).filter((old) =>
          nextRecords.some((next) => next.id === old.id),
        );
        const entry: ProfileEntry = {
          id: profileId,
          label: current?.label ?? "本次孕期",
          fetusCount: current?.fetusCount ?? 1,
          chorionicity: current?.chorionicity ?? "unknown",
          state: current?.state ?? "active",
          basis: nextBasis,
          records: nextRecords,
          basisHistory:
            oldBasis && JSON.stringify(oldBasis) !== JSON.stringify(nextBasis)
              ? [...history, oldBasis]
              : history,
          recordHistory: [...retainedHistory, ...changed],
        };
        nextProfiles = [
          ...nextProfiles.filter((p) => p.id !== profileId),
          entry,
        ];
      }
      writeStored(STORAGE_KEYS.profile, {
        version: 2,
        activeProfileId: profileId,
        profiles: nextProfiles,
        basis: nextBasis,
        records: nextRecords,
      });
      basis.value = nextBasis;
      records.value = nextRecords;
      activeProfileId.value = profileId;
      profiles.value = nextProfiles;
      return { ok: true };
    } catch {
      return { ok: false, message: "保存失败，请检查设备存储空间后重试" };
    }
  }
  function saveBasis(
    input: Pick<SavedBasis, "method" | "lmpEquivalent"> &
      Partial<Omit<SavedBasis, "id" | "createdAt">>,
  ): StoreResult {
    if (!isValidISODate(input.lmpEquivalent) || !methods.includes(input.method))
      return { ok: false, message: "孕期基准日期或方式无效" };
    return persist(
      {
        ...input,
        id: activeProfileId.value || basis.value?.id || id(),
        createdAt: new Date().toISOString(),
        revisionId: uuid(),
      },
      records.value,
    );
  }
  function saveMeasurement(
    input: Omit<MeasurementSession, "id" | "profileId">,
    overwrite = false,
    keepBoth = false,
    replaceId?: string,
  ): StoreResult {
    // keepBoth=true：同一天可以新增多次检查；replaceId：明确编辑哪一条，不能只靠日期定位。
    // overwrite 保留旧调用方式的确认语义，真正的历史快照由 persist 统一维护。
    if (!basis.value) return { ok: false, message: "请先建立孕期档案" };
    if (!validRecord({ ...input, id: "validation", profileId: basis.value.id }))
      return { ok: false, message: "测量数据无效，请检查数值、单位与孕周" };
    const fetus = input.fetus ?? "singleton";
    const selected = profiles.value.find((p) => p.id === activeProfileId.value);
    if (
      (selected?.fetusCount === 2 && fetus === "singleton") ||
      (selected?.fetusCount === 1 && fetus !== "singleton")
    )
      return { ok: false, message: "胎儿标识与当前档案胎数不一致，请核对档案" };
    const existing = replaceId
      ? records.value.find((r) => r.id === replaceId)
      : keepBoth
        ? undefined
        : records.value.find(
            (r) =>
              r.profileId === basis.value!.id &&
              r.date === input.date &&
              (r.fetus ?? "singleton") === fetus,
          );
    if (existing && !overwrite)
      return { ok: false, message: "该日期已有测量记录，请确认是否覆盖" };
    const record: MeasurementSession = {
      ...input,
      fetus,
      measurements: { ...input.measurements },
      revision: (existing?.revision ?? 0) + 1,
      id: existing?.id ?? id(),
      profileId: basis.value.id,
    };
    const outcome = persist(
      basis.value,
      [...records.value.filter((r) => r.id !== existing?.id), record].sort(
        (a, b) => b.date.localeCompare(a.date),
      ),
    );
    return outcome;
  }
  function removeMeasurement(recordId: string): StoreResult {
    if (!records.value.some((r) => r.id === recordId))
      return { ok: false, message: "记录已不存在，请刷新档案" };
    return persist(
      basis.value,
      records.value.filter((r) => r.id !== recordId),
    );
  }
  function publish(catalog: ProfileEntry[], active: string): StoreResult {
    // 发布整个档案目录时，同时维护“当前档案”与兼容字段 basis/records，防止页面读取到两个不同档案。
    if (storageError.value) return { ok: false, message: storageError.value };
    catalog = catalog.map((p) => ({
      ...p,
      state: p.id === active ? "active" : "archived",
    }));
    const current = catalog.find((p) => p.id === active);
    try {
      writeStored(STORAGE_KEYS.profile, {
        version: 2,
        activeProfileId: active,
        profiles: catalog,
        basis: current?.basis ?? null,
        records: current?.records ?? [],
      });
      profiles.value = catalog;
      activeProfileId.value = active;
      basis.value = current?.basis ?? null;
      records.value = current?.records ?? [];
      return { ok: true };
    } catch {
      return { ok: false, message: "档案保存失败，请检查存储空间" };
    }
  }
  function createProfile(
    label: string,
    fetusCount: 1 | 2,
    chorionicity = "unknown",
  ): StoreResult {
    if (!label.trim() || Array.from(label.trim()).length > 20)
      return { ok: false, message: "档案昵称需为1–20字" };
    const profileId = id();
    return publish(
      [
        ...profiles.value,
        {
          id: profileId,
          label: label.trim(),
          fetusCount,
          chorionicity,
          state: "active",
          basis: null,
          records: [],
          basisHistory: [],
          recordHistory: [],
        },
      ],
      profileId,
    );
  }
  function switchProfile(profileId: string): StoreResult {
    const p = profiles.value.find((p) => p.id === profileId);
    return p
      ? publish(
          profiles.value.map((p) =>
            p.id === profileId ? { ...p, state: "active" } : p,
          ),
          profileId,
        )
      : { ok: false, message: "档案不存在" };
  }
  function renameProfile(profileId: string, label: string): StoreResult {
    if (!label.trim() || Array.from(label).length > 20)
      return { ok: false, message: "昵称需为1–20字" };
    return publish(
      profiles.value.map((p) =>
        p.id === profileId ? { ...p, label: label.trim() } : p,
      ),
      activeProfileId.value,
    );
  }
  function archiveProfile(profileId: string): StoreResult {
    return publish(
      profiles.value.map((p) =>
        p.id === profileId ? { ...p, state: "archived" } : p,
      ),
      activeProfileId.value === profileId ? "" : activeProfileId.value,
    );
  }
  function deleteProfile(profileId: string): StoreResult {
    return publish(
      profiles.value.filter((p) => p.id !== profileId),
      activeProfileId.value === profileId ? "" : activeProfileId.value,
    );
  }
  function clearLocal(): StoreResult {
    return publish([], "");
  }
  return {
    basis,
    records,
    profiles,
    activeProfileId,
    storageError,
    hydrate,
    saveBasis,
    saveMeasurement,
    removeMeasurement,
    createProfile,
    switchProfile,
    renameProfile,
    archiveProfile,
    deleteProfile,
    clearLocal,
  };
});
