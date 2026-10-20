<script setup lang="ts">
/**
 * 空状态组件：接收标题和说明，统一没有数据时的展示，不在组件内部伪造示例记录。
 * <script setup> 中的顶层变量、函数和导入可直接在模板里使用，不需要再写 data、methods 或 return。
 */
import GaIcon from "./GaIcon.vue";
// defineProps 是 <script setup> 编译宏，声明父组件传入的参数；props 遵循单向数据流，子组件应通过事件请求更新。
defineProps<{ title: string; description?: string }>();
</script>
<template>
  <view class="ga-empty">
    <view class="ga-empty__icon"> <GaIcon name="list" :size="28" /> </view
    ><text class="ga-empty__title">{{ title }}</text
    ><text v-if="description" class="ga-empty__description">{{
      description
    }}</text>
    <slot />
  </view>
</template>
<style scoped>
.ga-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 12px;
  padding: 28px 16px;
}

.ga-empty__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 60px;
  height: 60px;
  background: var(--tint-blue);
  border-radius: 20px;
}

.ga-empty__title {
  font-size: 16px;
  font-weight: 500;
}

.ga-empty__description {
  color: var(--text-secondary);
  font-size: 13px;
  max-width: 280px;
}
</style>
