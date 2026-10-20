import { ref, onUnmounted } from "vue";
import { navigationMetrics } from "../utils/navigationMetrics";

/** 在首次渲染前同步测量，避免页面出现后再补状态栏高度产生跳动。 */
export function useNavigationMetrics() {
  const style = ref<Record<string, string>>({});
  // #ifdef MP-WEIXIN
  function measure() {
    let status = 0;
    try {
      const windowInfo = uni.getWindowInfo();
      status = windowInfo.statusBarHeight || 0;
      const capsule = uni.getMenuButtonBoundingClientRect();
      const metrics = navigationMetrics(
        windowInfo.statusBarHeight,
        windowInfo.windowWidth,
        capsule,
      );
      style.value = {
        "--ga-status-height": `${metrics.status}px`,
        "--ga-nav-height": `${metrics.height}px`,
        "--ga-nav-side": `${metrics.side}px`,
      };
    } catch {
      // 获取胶囊失败时仍保留状态栏安全区，不阻断页面。
      style.value = {
        "--ga-status-height": `${status}px`,
        "--ga-nav-height": "44px",
      };
    }
  }
  measure();
  uni.onWindowResize(measure);
  onUnmounted(() => uni.offWindowResize(measure));
  // #endif
  return style;
}
