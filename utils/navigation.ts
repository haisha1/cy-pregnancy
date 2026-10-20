import {
  mainRoutes,
  tabForRoute,
  useMainNavigationStore,
} from "../store/mainNavigation";

/** 主界面内只更新状态；二级页回到已有主界面，不重新创建三个Tab页面。 */
export function openMainPage(url: string) {
  const tab = tabForRoute(url);
  if (!tab) return;
  const navigation = useMainNavigationStore();
  navigation.select(tab);
  const pages = getCurrentPages();
  for (let index = pages.length - 1; index >= 0; index--) {
    if (!tabForRoute("/" + pages[index].route)) continue;
    const delta = pages.length - 1 - index;
    if (delta) uni.navigateBack({ delta });
    return;
  }
  // 只有外部直达二级页、栈中没有主界面时，才需要创建一个入口。
  uni.reLaunch({ url: mainRoutes[tab] });
}
