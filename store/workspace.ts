/**
 * 扩展数据 store：集中管理观察、预约、收藏、反馈和草稿；先成功写入本地存储，再替换响应式状态。
 */
import { defineStore } from "pinia";
import { ref } from "vue";
import type {
  Appointment,
  FeedbackDraft,
  Observation,
  WorkspaceState,
} from "../types/workspace";
import type { StoreResult } from "../types/records";
import { readStored, writeStored } from "../utils/storage";
import { uuid } from "../utils/uuid";
import {
  isValidISODate,
  todayISO,
  validateMeasurementDate,
} from "../engine/gestation";
const KEY = "cy:workspace:v1";
const empty = (): WorkspaceState => ({
  version: 1,
  observations: [],
  appointments: [],
  feedback: [],
  favorites: [],
  drafts: {},
});
// Pinia 的 setup store：函数内定义响应式状态和操作方法，return 的成员才会暴露给页面；通过 store 访问 ref 状态通常不写 .value。
export const useWorkspaceStore = defineStore("workspace", () => {
  // ref 创建响应式状态；脚本读写用 .value，模板中作为顶层绑定使用时会自动解包。修改它后，依赖它的界面会更新。
  const state = ref<WorkspaceState>(empty());
  const error = ref("");
  let loaded = false;
  function hydrate() {
    if (loaded) return;
    loaded = true;
    try {
      const value = readStored(KEY) as WorkspaceState | null;
      if (!value) return;
      if (
        value.version !== 1 ||
        !["observations", "appointments", "feedback", "favorites"].every((k) =>
          Array.isArray(value[k as keyof WorkspaceState]),
        ) ||
        !value.drafts ||
        !value.observations.every(
          (o) =>
            o.id &&
            o.profileId &&
            isValidISODate(o.date) &&
            o.raw &&
            o.normalized &&
            Array.isArray(o.values),
        ) ||
        !value.appointments.every(
          (a) => a.id && a.profileId && isValidISODate(a.date),
        )
      )
        throw new Error("invalid");
      state.value = value;
    } catch {
      error.value =
        "本地扩展记录读取失败，原始存储已保留。请导出原始数据后检查，未覆盖原数据。";
    }
  }
  function commit(next: WorkspaceState): StoreResult {
    // 所有写操作汇总到这里：失败不替换 state，成功替换整个对象后，依赖它的 computed 和模板自动更新。
    if (error.value) return { ok: false, message: error.value };
    try {
      writeStored(KEY, next);
      state.value = next;
      return { ok: true };
    } catch {
      return { ok: false, message: "本地保存失败，请检查存储空间后重试" };
    }
  }
  function saveObservation(
    input: Omit<Observation, "id" | "createdAt" | "revision">,
  ): StoreResult {
    // Omit<T, K> 从类型 T 中排除 K 字段：调用页面提供业务输入，ID、时间与修订号由 store 生成。
    const dateIssue = validateMeasurementDate(input.date, todayISO());
    if (dateIssue) return { ok: false, message: dateIssue };
    if (input.tool === "age" || Object.hasOwn(input.raw, "dob"))
      return {
        ok: false,
        message: "出生日期只允许用于临时年龄换算，不允许保存",
      };
    if (
      input.gaDays !== null &&
      (!Number.isInteger(input.gaDays) ||
        input.gaDays < 0 ||
        input.gaDays > 300)
    )
      return { ok: false, message: "检查孕周无效" };
    if (
      !input.profileId ||
      !isValidISODate(input.date) ||
      !Object.values(input.raw).some((v) => v.trim()) ||
      Object.values(input.normalized).some((n) => !Number.isFinite(n))
    )
      return { ok: false, message: "请补充档案、检查日期和有效输入" };
    const record: Observation = {
      ...input,
      id: uuid(),
      revision: 1,
      createdAt: new Date().toISOString(),
    };
    return commit({
      ...state.value,
      observations: [...state.value.observations, record],
    });
  }
  function saveAppointment(
    input: Omit<Appointment, "id" | "revision" | "reminder"> & { id?: string },
  ): StoreResult {
    if (
      !input.profileId ||
      !input.name.trim() ||
      input.name.length > 40 ||
      !isValidISODate(input.date) ||
      (input.time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.time))
    )
      return {
        ok: false,
        message: "请填写事项名称、有效日期与时间（如 08:30）",
      };
    const old = state.value.appointments.find((a) => a.id === input.id);
    if (old && old.profileId !== input.profileId)
      return { ok: false, message: "不能跨档案修改事项" };
    const record: Appointment = {
      ...input,
      id: old?.id ?? uuid(),
      revision: (old?.revision ?? 0) + 1,
      reminder: "not_enabled",
    };
    return commit({
      ...state.value,
      appointments: [
        ...state.value.appointments.filter((a) => a.id !== record.id),
        record,
      ],
    });
  }
  function deleteAppointment(id: string) {
    return commit({
      ...state.value,
      appointments: state.value.appointments.filter((a) => a.id !== id),
    });
  }
  function removeObservation(id: string) {
    return commit({
      ...state.value,
      observations: state.value.observations.filter((o) => o.id !== id),
    });
  }
  function favorite(id: string) {
    return commit({
      ...state.value,
      favorites: state.value.favorites.includes(id)
        ? state.value.favorites.filter((k) => k !== id)
        : [...state.value.favorites, id],
    });
  }
  function saveFeedback(category: string, body: string): StoreResult {
    if (body.trim().length < 10 || body.length > 1000)
      return { ok: false, message: "反馈说明需为 10–1000 字" };
    const record: FeedbackDraft = {
      id: uuid(),
      category,
      body: body.trim(),
      createdAt: new Date().toISOString(),
      status: "local_draft",
    };
    return commit({
      ...state.value,
      feedback: [...state.value.feedback, record],
    });
  }
  function saveDraft(key: string, values: Record<string, string>) {
    return commit({
      ...state.value,
      drafts: { ...state.value.drafts, [key]: { ...values } },
    });
  }
  function clearDraft(key: string) {
    const drafts = { ...state.value.drafts };
    delete drafts[key];
    return commit({ ...state.value, drafts });
  }
  function clearLocal(): StoreResult {
    const result = commit(empty());
    return result;
  }
  hydrate();
  return {
    state,
    error,
    hydrate,
    saveObservation,
    removeObservation,
    saveAppointment,
    deleteAppointment,
    favorite,
    saveFeedback,
    saveDraft,
    clearDraft,
    clearLocal,
  };
});
