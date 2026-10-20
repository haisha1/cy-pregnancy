<script setup lang="ts">
/**
 * 受控选项组件：选中值由父组件传入，点击仅上报新值；因此多个业务页面可以复用相同选项外观。
 * <script setup> 中的顶层变量、函数和导入可直接在模板里使用，不需要再写 data、methods 或 return。
 */
// defineProps 是 <script setup> 编译宏，声明父组件传入的参数；props 遵循单向数据流，子组件应通过事件请求更新。
defineProps<{
  modelValue: string;
  items: { label: string; value: string; disabled?: boolean }[];
}>();
// defineEmits 声明组件可发送的事件及参数类型；update:modelValue 对应父组件 v-model 的赋值操作。
defineEmits<{ "update:modelValue": [value: string] }>();
</script>
<template>
  <!-- v-for 遍历选项，稳定的 key 帮助 Vue 识别每个选项；:class 按当前值切换选中样式。
       @click 的 $emit 通知父组件；配合 modelValue，就是 v-model 的完整约定。 -->
  <view class="ga-tabs ga-glass" role="group"
    ><button
      v-for="item in items"
      :key="item.value"
      class="ga-tab"
      :class="{ 'ga-tab--selected': modelValue === item.value }"
      :disabled="item.disabled"
      :aria-pressed="modelValue === item.value"
      @click="$emit('update:modelValue', item.value)"
    >
      {{ item.label }}
    </button></view
  >
</template>
<style scoped>
.ga-tabs {
  display: flex;
  gap: 4px;
  padding: 4px;
  border-radius: var(--radius-24);
}
.ga-tab {
  flex: 1;
  min-width: 0;
  min-height: 32px;
  padding: 6px 2px;
  margin: 0;
  border: 0;
  border-radius: var(--radius-20);
  color: var(--text-secondary);
  background: transparent;
  font-size: 13px;
  line-height: 20px;
}
.ga-tab--selected {
  color: var(--primary);
  background: var(--glass-fillStrong);
}
.ga-tab[disabled] {
  opacity: 0.45;
}
</style>
