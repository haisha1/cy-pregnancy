<script setup lang="ts">
/**
 * 公共按钮：统一样式、加载与禁用状态，并把点击事件交给使用它的页面处理。
 * <script setup> 中的顶层变量、函数和导入可直接在模板里使用，不需要再写 data、methods 或 return。
 */
// defineProps 是 <script setup> 编译宏，声明父组件传入的参数；props 遵循单向数据流，子组件应通过事件请求更新。
// withDefaults 为类型式 props 设置默认值；问号标记可选参数，未传入时使用这里的默认配置。
withDefaults(
  defineProps<{
    variant?: "primary" | "secondary" | "text";
    disabled?: boolean;
    loading?: boolean;
    openType?: "chooseAvatar";
  }>(),
  { variant: "primary", disabled: false, loading: false },
);
// 声明 click 自定义事件并转发平台事件；父组件用 @click="方法名" 响应点击。
const emit = defineEmits<{
  click: [event: Event];
  chooseavatar: [event: { detail: { avatarUrl: string } }];
}>();
</script>
<template>
  <button
    :class="['ga-button', 'ga-button--' + variant]"
    :disabled="disabled || loading"
    :loading="loading"
    :open-type="openType"
    :aria-busy="loading"
    @click="emit('click', $event)"
    @chooseavatar="emit('chooseavatar', $event)"
  >
    <slot />
  </button>
</template>
<style scoped>
.ga-button {
  width: 100%;
  min-height: 44px;
  border: 1px solid transparent;
  border-radius: var(--radius-16);
  padding: 10px 16px;
  margin: 0;
  font-size: 14px;
  font-weight: 500;
}

.ga-button--primary {
  color: var(--text-inverse);
  background: linear-gradient(125deg, var(--action-start), var(--action-end));
}

.ga-button--secondary {
  color: var(--text-primary);
  background: var(--glass-fillStrong);
  border-color: var(--glass-stroke);
}

.ga-button--text {
  width: auto;
  min-height: 36px;
  padding: 6px 0;
  background: transparent;
  color: var(--primary);
}

.ga-button[disabled] {
  color: var(--text-secondary);
  background: var(--glass-fill);
  border-color: var(--glass-stroke);
  opacity: 0.58;
}
</style>
