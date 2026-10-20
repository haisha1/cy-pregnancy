<script setup lang="ts">
/**
 * 工具网格组件：配置决定入口内容，组件负责布局和点击，避免每个首页分组重复写网格。
 * <script setup> 中的顶层变量、函数和导入可直接在模板里使用，不需要再写 data、methods 或 return。
 */
import { tools } from "../data/tools";
import GaIcon from "./GaIcon.vue";
function open(route: string) {
  const pages = getCurrentPages();
  if (route && "/" + pages[pages.length - 1]?.route !== route)
    uni.navigateTo({ url: route });
}
</script>
<template>
  <view class="ga-tools ga-glass"
    ><button
      v-for="tool in tools"
      :key="tool.label"
      class="ga-tool"
      :disabled="!tool.route"
      :aria-label="tool.label + (!tool.route ? '，待开放' : '')"
      @click="open(tool.route)"
    >
      <view
        class="ga-tool__tile"
        :style="{ background: 'var(--tint-' + tool.tint + ')' }"
        ><GaIcon :name="tool.icon" /></view
      ><text class="ga-tool__label">{{ tool.label }}</text
      ><text v-if="!tool.route" class="ga-tool__soon">待开放</text>
    </button></view
  >
</template>
<style scoped>
.ga-tools {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px 8px;
  padding: 16px;
}
.ga-tool {
  display: flex;
  align-items: center;
  flex-direction: column;
  min-height: 82px;
  gap: 8px;
  padding: 0;
  margin: 0;
  background: transparent;
  color: var(--text-primary);
  border: 0;
  position: relative;
}
.ga-tool__tile {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  border-radius: 16px;
}
.ga-tool__label {
  font-size: 12px;
  white-space: nowrap;
}
.ga-tool__soon {
  position: absolute;
  top: 0;
  right: 0;
  font-size: 8px;
  border-radius: 4px;
  padding: 0 3px;
  background: var(--glass-fillStrong);
  color: var(--text-secondary);
}
.ga-tool[disabled] {
  background: transparent;
  color: var(--text-secondary);
}
</style>
