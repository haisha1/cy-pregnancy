<script setup lang="ts">
/**
 * 公共卡片容器：通过 slot 接收内容，布局外观复用而业务内容由父组件决定。
 * <script setup> 中的顶层变量、函数和导入可直接在模板里使用，不需要再写 data、methods 或 return。
 */
// defineProps 是 <script setup> 编译宏，声明父组件传入的参数；props 遵循单向数据流，子组件应通过事件请求更新。
// withDefaults 为类型式 props 设置默认值；问号标记可选参数，未传入时使用这里的默认配置。
withDefaults(defineProps<{ variant?: "default" | "hero" }>(), {
  variant: "default",
});
</script>
<template>
  <view :class="['ga-card', variant === 'hero' ? 'ga-card--hero' : 'ga-glass']">
    <slot />
  </view>
</template>
<style scoped>
.ga-card {
  padding: 16px;
  min-width: 0;
}

.ga-card--hero {
  padding: 24px;
  border-radius: var(--radius-24);
  color: var(--text-inverse);
  background: linear-gradient(135deg, var(--hero-start), var(--hero-end));
}
</style>
