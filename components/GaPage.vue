<script setup lang="ts">
/**
 * 公共页面外壳：统一导航、底部栏、主题、离线提示及插槽。业务页面把正文放到默认插槽，把底部按钮放到 actions 插槽。
 * <script setup> 中的顶层变量、函数和导入可直接在模板里使用，不需要再写 data、methods 或 return。
 */
import { computed, useSlots, ref } from "vue";
import { useAppStore } from "../store/app";
import { useProfileStore } from "../store/profile";
import { palettes } from "../styles/theme";
import assets from "../data/figma-assets.json";
import GaIcon from "./GaIcon.vue";
import GaDisclaimer from "./GaDisclaimer.vue";
import GaAccountBoundary from "./GaAccountBoundary.vue";
import { useH5Accessibility } from "../composables/useH5Accessibility";
import { useNavigationMetrics } from "../composables/useNavigationMetrics";
import { openMainPage } from "../utils/navigation";
const navigationStyle = useNavigationMetrics();
useH5Accessibility();
// defineProps 是 <script setup> 编译宏，声明父组件传入的参数；props 遵循单向数据流，子组件应通过事件请求更新。
// withDefaults 为类型式 props 设置默认值；问号标记可选参数，未传入时使用这里的默认配置。
const props = withDefaults(
  defineProps<{
    title: string;
    tab?: "tools" | "records" | "mine";
    back?: boolean;
    disclaimer?: boolean;
    requiresAccount?: boolean;
    paneLayout?: boolean;
    beforeLeave?: () => Promise<boolean>;
  }>(),
  { back: false, disclaimer: false },
);
const app = useAppStore();
// 验证结果由共享访问边界上报，只有验证通过才展示受保护页面的底部操作。
const verified = ref(false);
const profile = useProfileStore();
// useSlots 读取父组件传入的插槽；slot 是父组件提供给子组件渲染的一段模板内容。
const slots = useSlots();
// computed 表示从现有状态推导出的值，会跟踪依赖并缓存结果；依赖变化后才重新求值，不用手动同步另一份状态。
const themeStyle = computed(() => palettes[app.theme]);
const themeAssets = computed(() => assets[app.theme]);
const tabs = [
  { key: "tools", title: "工具", icon: "nav-tools", url: "/pages/index/index" },
  {
    key: "records",
    title: "档案",
    icon: "nav-records",
    url: "/pages/profile/index",
  },
  { key: "mine", title: "我的", icon: "nav-user", url: "/pages/mine/index" },
];
function navigate(url: string) {
  openMainPage(url);
}
async function goBack() {
  // await 等待页面的未保存提示完成；返回 false 时留在当前页，true 时继续导航。
  if (props.beforeLeave && !(await props.beforeLeave())) return;
  if (getCurrentPages().length > 1) uni.navigateBack();
  else {
    const route = getCurrentPages()[0]?.route ?? "";
    navigate(
      route.startsWith("pages/mine") || route.startsWith("pages/services")
        ? "/pages/mine/index"
        : route.startsWith("pages/profile") ||
            route.startsWith("pages/timeline")
          ? "/pages/profile/index"
          : "/pages/index/index",
    );
  }
}
</script>
<template>
  <view
    class="ga-page"
    :class="[
      'ga-theme-' + app.theme,
      {
        'ga-page--bottom': tab || slots.actions,
        'ga-page--cozy': app.mode === 'plain',
        'ga-page--panes': paneLayout,
      },
    ]"
    :style="[themeStyle, navigationStyle]"
  >
    <!-- #ifndef MP-WEIXIN -->
    <view class="ga-page__glows" aria-hidden="true"
      ><image
        class="ga-glow ga-glow--blue"
        :src="themeAssets.imgGlowBlue"
        mode="aspectFit" /><image
        class="ga-glow ga-glow--teal"
        :src="themeAssets.imgGlowTeal"
        mode="aspectFit" /><image
        class="ga-glow ga-glow--pink"
        :src="themeAssets.imgGlowPink"
        mode="aspectFit"
    /></view>
    <!-- #endif -->
    <view class="ga-nav ga-glass ga-floating">
      <view class="ga-nav__status" />
      <view class="ga-nav__row">
        <button
          v-if="back"
          class="ga-nav__button"
          aria-label="返回上一页"
          @click="goBack"
        >
          <GaIcon name="back" />
        </button>
        <view v-else class="ga-nav__spacer" />
        <text class="ga-nav__title">{{ title }}</text>
        <view class="ga-nav__spacer" />
      </view>
    </view>
    <view class="ga-page__content ga-stack">
      <view v-if="app.isOffline" class="ga-message" role="status"
        >当前离线：本地计算、记录和缓存内容可用，联网服务不可用。</view
      >
      <view v-if="profile.storageError" class="ga-page__error" role="alert">{{
        profile.storageError
      }}</view>
      <!-- 默认插槽：使用方写在 <GaPage> 内的正文会出现在这里。 -->
      <GaAccountBoundary v-if="requiresAccount" @verified="verified = $event"
        ><slot
      /></GaAccountBoundary>
      <slot v-else />
      <GaDisclaimer v-if="disclaimer" />
    </view>
    <view v-if="tab" class="ga-bottom"
      ><view class="ga-bottom__tabs ga-glass ga-floating"
        ><button
          v-for="item in tabs"
          :key="item.key"
          class="ga-bottom__tab"
          :class="{ 'is-selected': tab === item.key }"
          :aria-current="tab === item.key ? 'page' : undefined"
          @click="navigate(item.url)"
        >
          <GaIcon :name="item.icon" :active="tab === item.key" /><text>{{
            item.title
          }}</text>
        </button></view
      ></view
    >
    <!-- 具名插槽：页面用 <template #actions> 提供固定在底部的操作区。 -->
    <view
      v-else-if="slots.actions && (!requiresAccount || verified)"
      class="ga-actions ga-floating"
      ><slot name="actions"
    /></view>
  </view>
</template>
<style scoped>
.ga-page {
  position: relative;
  min-height: 100vh;
  background: linear-gradient(
    145deg,
    var(--bg-gradientStart),
    var(--bg-gradientMid) 54%,
    var(--bg-gradientEnd)
  );
  isolation: isolate;
}
/* #ifdef MP-WEIXIN */
/* 微信端直接绘制光晕，避免每次进入页面等待三张SVG解码时背景突然改变。 */
.ga-page {
  background:
    radial-gradient(ellipse at 15% 0%, var(--tint-blue), transparent 65%),
    linear-gradient(
      145deg,
      var(--bg-gradientStart),
      var(--bg-gradientMid) 54%,
      var(--bg-gradientEnd)
    );
}
/* #endif */
.ga-page__glows {
  position: fixed;
  inset: 0;
  z-index: -1;
  overflow: hidden;
  pointer-events: none;
}
.ga-glow {
  position: absolute;
  max-width: none;
}
.ga-glow--blue {
  width: 590px;
  height: 590px;
  left: calc(50% - 385px);
  top: -230px;
}
.ga-glow--teal {
  width: 550px;
  height: 550px;
  left: calc(50% - 155px);
  top: 100px;
}
.ga-glow--pink {
  width: 590px;
  height: 590px;
  left: calc(50% - 395px);
  top: 450px;
}
.ga-nav {
  position: sticky;
  top: 0;
  z-index: 20;
  /* 顶部不加边框，确保状态栏及标题中心坐标不会被玻璃边框再偏移1px。 */
  border: 0;
  border-bottom: 1px solid var(--glass-stroke);
  border-radius: 0 0 8px 8px;
}
.ga-nav__status {
  height: var(--ga-status-height, var(--status-bar-height, 0px));
}
.ga-nav__row {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: var(--ga-nav-height, 52px);
  padding: 0 var(--ga-nav-side, 52px);
  max-width: 540px;
  margin: 0 auto;
}
.ga-nav__title {
  flex: 1;
  text-align: center;
  font-size: 17px;
  font-weight: 600;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.ga-nav__spacer,
.ga-nav__button {
  position: absolute;
  left: 12px;
  width: 36px;
  min-width: 36px;
  height: 44px;
}
.ga-nav__spacer {
  display: none;
}
.ga-nav__button {
  display: flex;
  align-items: center;
  padding: 0;
  margin: 0;
  border: 0;
  background: transparent;
}
.ga-page__content {
  position: relative;
  max-width: 540px;
  margin: 0 auto;
  padding: 16px 20px 28px;
}
.ga-page--bottom .ga-page__content {
  padding-bottom: calc(116px + env(safe-area-inset-bottom));
}
/* 主界面使用三个独立滚动面板，外壳不滚动、不销毁，二级页面沿用正常页面滚动。 */
.ga-page--panes {
  display: flex;
  flex-direction: column;
  height: 100vh;
}
.ga-page--panes .ga-nav {
  flex-shrink: 0;
}
.ga-page--panes .ga-page__content {
  flex: 1;
  min-height: 0;
  width: 100%;
  padding: 0;
  gap: 0;
}
.ga-page__error {
  padding: 12px;
  border-radius: 12px;
  color: var(--danger);
  background: var(--danger-tint);
  font-size: 13px;
}
.ga-bottom {
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 540px;
  padding: 8px 20px calc(12px + env(safe-area-inset-bottom));
  z-index: 30;
}
.ga-bottom__tabs {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 80px;
  padding: 8px;
}
.ga-bottom__tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  flex: 1;
  min-height: 52px;
  padding: 0;
  margin: 0;
  color: var(--text-tertiary);
  background: transparent;
  font-size: 12px;
  border-radius: 16px;
}
.ga-bottom__tab.is-selected {
  color: var(--primary);
}
.ga-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 540px;
  padding: 8px 20px calc(16px + env(safe-area-inset-bottom));
  z-index: 30;
}
.ga-actions :deep(.ga-button) {
  flex: 1;
  min-width: 0;
}
@media (min-width: 600px) {
  .ga-page__glows {
    max-width: 540px;
    margin: 0 auto;
  }
}
</style>
