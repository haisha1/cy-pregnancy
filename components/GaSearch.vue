<script setup lang="ts">
/**
 * 搜索输入组件：维护统一搜索外观，通过 v-model 把关键词交给父页面筛选，不绑定具体内容目录。
 * <script setup> 中的顶层变量、函数和导入可直接在模板里使用，不需要再写 data、methods 或 return。
 */
import { ref } from "vue";
// defineProps 是 <script setup> 编译宏，声明父组件传入的参数；props 遵循单向数据流，子组件应通过事件请求更新。
defineProps<{ modelValue: string; placeholder?: string }>();
// defineEmits 声明组件可发送的事件及参数类型；update:modelValue 对应父组件 v-model 的赋值操作。
defineEmits<{ "update:modelValue": [string] }>();
// ref 创建响应式状态；脚本读写用 .value，模板中作为顶层绑定使用时会自动解包。修改它后，依赖它的界面会更新。
const focus = ref(false);
</script>
<template>
  <view class="ga-search ga-glass"
    ><input
      :value="modelValue"
      :focus="focus"
      type="text"
      :aria-label="placeholder || '搜索'"
      :placeholder="placeholder || '搜索名称或缩写'"
      @input="$emit('update:modelValue', ($event as any).detail.value)"
    /><button
      v-if="modelValue"
      aria-label="清除搜索"
      @click="
        $emit('update:modelValue', '');
        focus = true;
      "
    >
      清除
    </button></view
  >
</template>
<style scoped>
.ga-search {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 12px 16px;
  border-radius: 12px;
}
.ga-search input {
  flex: 1;
  min-width: 0;
  height: 24px;
  font-size: 14px;
}
.ga-search button {
  margin: 0;
  padding: 0 4px;
  background: transparent;
  color: var(--primary);
  font-size: 12px;
}
</style>
