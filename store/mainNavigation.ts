import { defineStore } from "pinia";
import { ref } from "vue";

export type MainTab = "tools" | "records" | "mine";
export const mainRoutes: Record<MainTab, string> = {
  tools: "/pages/index/index",
  records: "/pages/profile/index",
  mine: "/pages/mine/index",
};
export function tabForRoute(url: string): MainTab | undefined {
  const path = url.split("?")[0];
  return (Object.keys(mainRoutes) as MainTab[]).find(
    (tab) => mainRoutes[tab] === path,
  );
}
/** 仅保存当前会话的选中项，不在点击底栏时写磁盘或调用微信路由。 */
export const useMainNavigationStore = defineStore("main-navigation", () => {
  const active = ref<MainTab>("tools");
  function select(tab: MainTab) {
    active.value = tab;
  }
  return { active, select };
});
