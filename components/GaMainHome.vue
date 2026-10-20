<script setup lang="ts">
/** 三个一级入口共用一个页面外壳。v-show保留内容与滚动位置，切换时没有原生页面创建。 */
import { computed } from "vue";
import { useMainNavigationStore, type MainTab } from "../store/mainNavigation";
import GaPage from "./GaPage.vue";
import GaAccountBoundary from "./GaAccountBoundary.vue";
import GaDisclaimer from "./GaDisclaimer.vue";
import GaToolsHome from "./main/GaToolsHome.vue";
import GaRecordsHome from "./main/GaRecordsHome.vue";
import GaMineHome from "./main/GaMineHome.vue";
const props = defineProps<{ initialTab: MainTab }>();
const navigation = useMainNavigationStore();
// 仅在入口创建时读取初始选项；从二级页返回时继续使用当前面板。
navigation.select(props.initialTab);
const titles: Record<MainTab, string> = {
  tools: "孕期超声工具",
  records: "孕期档案",
  mine: "我的",
};
const title = computed(() => titles[navigation.active]);
</script>
<template>
  <GaPage :title="title" :tab="navigation.active" pane-layout>
    <view class="ga-main">
      <scroll-view
        v-show="navigation.active === 'tools'"
        scroll-y
        class="ga-main__panel"
        data-main-panel="tools"
      >
        <view class="ga-main__content"><GaToolsHome /></view>
      </scroll-view>
      <scroll-view
        v-show="navigation.active === 'records'"
        scroll-y
        class="ga-main__panel"
        data-main-panel="records"
      >
        <view class="ga-main__content ga-stack">
          <GaAccountBoundary :active="navigation.active === 'records'"
            ><GaRecordsHome
          /></GaAccountBoundary>
          <GaDisclaimer />
        </view>
      </scroll-view>
      <scroll-view
        v-show="navigation.active === 'mine'"
        scroll-y
        class="ga-main__panel"
        data-main-panel="mine"
      >
        <view class="ga-main__content"
          ><GaMineHome :active="navigation.active === 'mine'"
        /></view>
      </scroll-view>
    </view>
  </GaPage>
</template>
<style scoped>
.ga-main,
.ga-main__panel {
  height: 100%;
  min-height: 0;
}
.ga-main {
  flex: 1;
}
.ga-main__content {
  padding: 16px 20px calc(116px + env(safe-area-inset-bottom));
}
</style>
