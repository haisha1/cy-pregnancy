<script setup lang="ts">
/**
 * 列表链接组件：统一标题、说明、右箭头和点击导航，供设置页、目录和记录入口复用。
 * <script setup> 中的顶层变量、函数和导入可直接在模板里使用，不需要再写 data、methods 或 return。
 */
import GaIcon from "./GaIcon.vue";
// defineProps 是 <script setup> 编译宏，声明父组件传入的参数；props 遵循单向数据流，子组件应通过事件请求更新。
defineProps<{
  title: string;
  subtitle?: string;
  url?: string;
  disabled?: boolean;
}>();
// 声明列表项的点击事件；导航和父组件附加动作的具体顺序见下面的 open 方法。
const emit = defineEmits<{ click: [] }>();
function open(url?: string) {
  emit("click");
  if (url) uni.navigateTo({ url });
}
</script>
<template>
  <button class="ga-link-row ga-glass" :disabled="disabled" @click="open(url)">
    <view
      ><text class="ga-link-row__title">{{ title }}</text
      ><text v-if="subtitle" class="ga-link-row__subtitle">{{
        subtitle
      }}</text></view
    ><GaIcon name="right" />
  </button>
</template>
<style scoped>
.ga-link-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  width: 100%;
  padding: 16px 20px;
  text-align: left;
  margin: 0;
  color: var(--text-primary);
  font-size: 15px;
  min-height: 72px;
}

.ga-link-row > view {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.ga-link-row__subtitle {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 19px;
}

.ga-link-row__arrow {
  color: var(--primary);
  font-size: 24px;
  flex-shrink: 0;
}
</style>
