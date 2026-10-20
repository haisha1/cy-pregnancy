<script setup lang="ts">
/**
 * 区块标题组件：通过 title 和可选 action 文案组合标题与右侧操作，点击操作后通知父组件。
 * <script setup> 中的顶层变量、函数和导入可直接在模板里使用，不需要再写 data、methods 或 return。
 */
// defineProps 是 <script setup> 编译宏，声明父组件传入的参数；props 遵循单向数据流，子组件应通过事件请求更新。
defineProps<{ title: string; action?: string }>();
// action 是无参数事件；父组件使用 @action 处理右侧操作，组件本身不决定业务动作。
defineEmits<{ action: [] }>();
</script>
<template>
  <view class="ga-section"
    ><text>{{ title }}</text
    ><button v-if="action" class="ga-section__action" @click="$emit('action')">
      {{ action }}
    </button></view
  >
</template>
<style scoped>
.ga-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-height: 28px;
  color: var(--text-secondary);
  font-size: 13px;
}
.ga-section__action {
  background: transparent;
  color: var(--primary);
  font-size: 13px;
  padding: 6px 0 6px 12px;
  margin: 0;
}
</style>
