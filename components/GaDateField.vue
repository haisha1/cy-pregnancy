<script setup lang="ts">
/**
 * 日期输入组件：封装 uni-app picker，把平台 change 事件转换为 Vue 自定义 v-model 更新事件。
 * <script setup> 中的顶层变量、函数和导入可直接在模板里使用，不需要再写 data、methods 或 return。
 */
import GaIcon from "./GaIcon.vue";
// defineProps 是 <script setup> 编译宏，声明父组件传入的参数；props 遵循单向数据流，子组件应通过事件请求更新。
// withDefaults 为类型式 props 设置默认值；问号标记可选参数，未传入时使用这里的默认配置。
withDefaults(
  defineProps<{ modelValue: string; label: string; error?: string }>(),
  { error: "" },
);
// defineEmits 声明组件可发送的事件及参数类型；update:modelValue 对应父组件 v-model 的赋值操作。
defineEmits<{ "update:modelValue": [value: string] }>();
</script>
<template>
  <view class="ga-date ga-glass">
    <text class="ga-date__label">{{ label }}</text>
    <picker
      mode="date"
      :value="modelValue"
      :aria-label="label"
      @change="$emit('update:modelValue', String($event.detail.value))"
    >
      <view
        class="ga-date__trigger"
        role="button"
        tabindex="0"
        data-ga-picker-trigger="true"
        :aria-label="label + '，' + (modelValue || '请选择日期')"
      >
        <GaIcon name="calendar" :size="20" /><text>{{
          modelValue || "请选择日期"
        }}</text
        ><text class="ga-date__arrow">›</text>
      </view>
    </picker>
    <text v-if="error" class="ga-date__error" role="alert">{{ error }}</text>
  </view>
</template>
<style scoped>
.ga-date {
  border-radius: var(--radius-12);
  padding: 12px;
}

.ga-date__label {
  display: block;
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.ga-date__trigger {
  display: flex;
  gap: 8px;
  align-items: center;
  width: 100%;
  min-height: 32px;
  padding: 0;
  margin: 0;
  text-align: left;
  background: transparent;
  color: var(--text-primary);
  font-size: 14px;
}

.ga-date__arrow {
  margin-left: auto;
  color: var(--text-tertiary);
  font-size: 24px;
}

.ga-date__error {
  display: block;
  font-size: 12px;
  color: var(--danger);
  margin-top: 4px;
}
</style>
