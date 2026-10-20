/**
 * 全局偏好 store：Pinia 管理跨页面共享状态；ref 是内存状态，persist 才负责本地存储，两者不是同一件事。
 */
import { defineStore } from "pinia";
import { ref } from "vue";
import type { ReferenceStandard } from "../types/records";
import { readStored, writeStored, STORAGE_KEYS } from "../utils/storage";
import { notify } from "../utils/feedback";
// Pinia 的 setup store：函数内定义响应式状态和操作方法，return 的成员才会暴露给页面；通过 store 访问 ref 状态通常不写 .value。
export const useAppStore = defineStore("app-preferences", () => {
  // ref 创建响应式状态；脚本读写用 .value，模板中作为顶层绑定使用时会自动解包。修改它后，依赖它的界面会更新。
  const theme = ref<"light" | "dark">("light");
  const themePreference = ref<"system" | "light" | "dark">("system");
  const lengthUnit = ref<"cm" | "mm">("cm");
  const mode = ref<"pro" | "plain">("pro");
  const standard = ref<ReferenceStandard>("INTERGROWTH");
  let hydrated = false;
  // 普通变量无需触发渲染；这个标记只负责避免重复注册全局监听，不需要使用 ref。
  function systemTheme(): "light" | "dark" {
    try {
      // 使用拆分后的应用信息API，避免微信新基础库提示getSystemInfoSync弃用。
      if (
        typeof uni.getAppBaseInfo === "function" &&
        uni.getAppBaseInfo().theme === "dark"
      )
        return "dark";
    } catch {}
    // #ifdef H5
    if (
      typeof matchMedia === "function" &&
      matchMedia("(prefers-color-scheme: dark)").matches
    )
      return "dark";
    // #endif
    return "light";
  }
  function hydrate() {
    // hydrate 的含义是“从本地存储恢复到内存”，ref 本身不会自动持久化或自动恢复。
    if (hydrated) return;
    hydrated = true;
    if (typeof uni.getNetworkType === "function")
      uni.getNetworkType({
        success: (r) => (isOffline.value = r.networkType === "none"),
      });
    if (typeof uni.onNetworkStatusChange === "function")
      uni.onNetworkStatusChange((r) => (isOffline.value = !r.isConnected));
    // #ifdef H5
    if (typeof window !== "undefined") {
      isOffline.value = !navigator.onLine;
      window.addEventListener("offline", () => (isOffline.value = true));
      window.addEventListener("online", () => (isOffline.value = false));
    }
    // #endif
    try {
      const saved = readStored(STORAGE_KEYS.app) as Record<
        string,
        unknown
      > | null;
      if (
        saved?.theme === "light" ||
        saved?.theme === "dark" ||
        saved?.theme === "system"
      )
        themePreference.value = saved.theme;
      if (saved?.lengthUnit === "cm" || saved?.lengthUnit === "mm")
        lengthUnit.value = saved.lengthUnit;
      theme.value =
        themePreference.value === "system"
          ? systemTheme()
          : themePreference.value;
      if (saved?.mode === "pro" || saved?.mode === "plain")
        mode.value = saved.mode;
      if (saved?.standard === "INTERGROWTH" || saved?.standard === "CUHK")
        standard.value = saved.standard;
    } catch {
      notify("偏好读取失败，请重新选择", "error");
    }
    const update = () => {
      if (themePreference.value === "system") theme.value = systemTheme();
    };
    if (typeof uni.onThemeChange === "function") uni.onThemeChange(update);
    // #ifdef H5
    if (typeof matchMedia === "function")
      matchMedia("(prefers-color-scheme: dark)").addEventListener(
        "change",
        update,
      );
    // #endif
  }
  function persist(next: {
    theme: "system" | "light" | "dark";
    mode: "pro" | "plain";
    standard: ReferenceStandard;
    lengthUnit?: "cm" | "mm";
  }) {
    try {
      const value = {
        ...next,
        lengthUnit: next.lengthUnit ?? lengthUnit.value,
      };
      writeStored(STORAGE_KEYS.app, value);
      // 先写存储再更新 ref；如果存储抛错，界面不会错误显示为“已保存”。
      themePreference.value = next.theme;
      theme.value = next.theme === "system" ? systemTheme() : next.theme;
      mode.value = next.mode;
      standard.value = next.standard;
      lengthUnit.value = value.lengthUnit;
      return true;
    } catch {
      notify("设置未保存，请检查设备存储空间", "error");
      return false;
    }
  }
  function setTheme(value: "system" | "light" | "dark") {
    return persist({
      theme: value,
      mode: mode.value,
      standard: standard.value,
    });
  }
  function setMode(value: "pro" | "plain") {
    const ok = persist({
      theme: themePreference.value,
      mode: value,
      standard: standard.value,
    });
    if (ok)
      notify(
        `已切换为${value === "plain" ? "白话版" : "专业版"}，将应用于全部页面`,
        "success",
      );
    return ok;
  }
  function setStandard(value: ReferenceStandard) {
    return persist({
      theme: themePreference.value,
      mode: mode.value,
      standard: value,
    });
  }
  function setLengthUnit(value: "cm" | "mm") {
    return persist({
      theme: themePreference.value,
      mode: mode.value,
      standard: standard.value,
      lengthUnit: value,
    });
  }
  function restoreDefaults() {
    return persist({
      theme: "system",
      mode: mode.value,
      standard: "INTERGROWTH",
      lengthUnit: "cm",
    });
  }
  const isOffline = ref(false);
  return {
    isOffline,
    theme,
    themePreference,
    lengthUnit,
    mode,
    standard,
    hydrate,
    setTheme,
    setMode,
    setStandard,
    setLengthUnit,
    restoreDefaults,
  };
});
