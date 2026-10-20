<script setup lang="ts">
/**
 * 说明提示组件：使用 props 区分普通提示与警告，共享布局和颜色，具体文案由使用方提供。
 * <script setup> 中的顶层变量、函数和导入可直接在模板里使用，不需要再写 data、methods 或 return。
 */
// defineProps 是 <script setup> 编译宏，声明父组件传入的参数；props 遵循单向数据流，子组件应通过事件请求更新。
defineProps<{ title?: string; text: string; warning?: boolean }>();
</script>
<template>
  <view
    class="ga-notice ga-glass"
    :class="{ 'ga-notice--warning': warning }"
    role="status"
    ><text v-if="title" class="ga-notice__title">{{ title }}</text
    ><text>{{ text }}</text></view
  >
</template>
<style scoped>
.ga-notice {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 20px;
  font-size: 14px;
  line-height: 23px;
  color: var(--text-secondary);
  overflow-wrap: anywhere;
}
.ga-notice__title {
  color: var(--primary);
  font-size: 17px;
  font-weight: 500;
}
.ga-notice--warning .ga-notice__title {
  color: var(--warning);
}
</style>
