<script setup lang="ts">
/**
 * 通用输入框：父组件持有实际值，本组件接收 modelValue 并通过 update:modelValue 通知父组件修改。
 * <script setup> 中的顶层变量、函数和导入可直接在模板里使用，不需要再写 data、methods 或 return。
 */
import { getCurrentInstance, ref } from "vue";
// defineProps 是 <script setup> 编译宏，声明父组件传入的参数；props 遵循单向数据流，子组件应通过事件请求更新。
// withDefaults 为类型式 props 设置默认值；问号标记可选参数，未传入时使用这里的默认配置。
const props = withDefaults(
  defineProps<{
    modelValue: string;
    label: string;
    placeholder?: string;
    unit?: string;
    type?: "text" | "digit" | "number";
    error?: string;
  }>(),
  { type: "digit", placeholder: "请输入" },
);
// defineEmits 声明组件可发送的事件及参数类型；update:modelValue 对应父组件 v-model 的赋值操作。
const emit = defineEmits<{ "update:modelValue": [value: string] }>();
function onInput(event: Event) {
  // uni-app 的输入值在 event.detail.value 中，与浏览器原生 input 的 event.target.value 不同。
  // 这里保留字符串，让空值和输入中的小数点先留在表单，业务层再决定何时转换为数字。
  emit(
    "update:modelValue",
    (event as unknown as { detail: { value: string } }).detail.value,
  );
}
// ref 创建响应式状态；脚本读写用 .value，模板中作为顶层绑定使用时会自动解包。修改它后，依赖它的界面会更新。
const focused = ref(false);
// 每个组件实例有独立 uid，避免多个输入框的 label 指向同一个元素。
const fieldId = "ga-field-" + getCurrentInstance()?.uid;
</script>
<template>
  <!-- :value 是单向绑定，@input 是事件监听；两者配合上面的 emit，组成自定义 v-model。 -->
  <view class="ga-field">
    <label :for="fieldId" class="ga-field__label">{{ label }}</label>
    <view
      class="ga-field__control"
      :class="{ 'is-invalid': error, 'is-focused': focused }"
    >
      <input
        :id="fieldId"
        :value="modelValue"
        :type="type"
        :placeholder="placeholder"
        :aria-label="label"
        :aria-invalid="!!error"
        :aria-describedby="error ? fieldId + '-error' : undefined"
        @input="onInput"
        @focus="focused = true"
        @blur="
          focused = false;
          onInput($event);
        "
      />
      <text v-if="unit" class="ga-field__unit">{{ unit }}</text>
    </view>
    <view class="ga-field__message"
      ><text
        v-if="error"
        :id="fieldId + '-error'"
        class="ga-field__error"
        role="alert"
        >{{ error }}</text
      ></view
    >
  </view>
</template>
<style scoped>
.ga-field {
  min-width: 0;
}

.ga-field__label {
  display: block;
  color: var(--text-secondary);
  font-size: 13px;
  margin-bottom: 8px;
}

.ga-field__control {
  display: flex;
  gap: 8px;
  align-items: center;
  min-height: 44px;
  padding: 10px 12px;
  background: var(--glass-fillStrong);
  border: 1px solid var(--glass-stroke);
  border-radius: var(--radius-12);
}

.ga-field__control input {
  flex: 1;
  min-width: 0;
  height: 24px;
  font-size: 16px;
}

.ga-field__control.is-focused {
  border-color: var(--primary);
}

.ga-field__control.is-invalid {
  border-color: var(--danger);
}

.ga-field__unit {
  color: var(--text-secondary);
  font-size: 13px;
}

.ga-field__message {
  /* 预留错误文案高度，避免失焦校验后页面跳动，使紧接着的保存点击落空。 */
  min-height: 24px;
}
.ga-field__error {
  display: block;
  padding-top: 6px;
  font-size: 12px;
  color: var(--danger);
}
</style>
