<template>
  <GaCard>
    <view class="ga-measure-row">
      <view class="ga-measure-row__main">
        <label :for="fieldId" class="ga-measure-row__label">
          <text class="ga-measure-row__name">{{ label }}</text>
          <text class="ga-measure-row__metric">{{ metric }}</text>
        </label>
        <view class="ga-measure-row__value">
          <input
            :id="fieldId"
            class="ga-measure-row__input"
            :value="modelValue"
            :disabled="readonly"
            type="digit"
            placeholder="未填写"
            :aria-label="`${label} ${metric}，单位${unit}`"
            :aria-invalid="Boolean(error)"
            :aria-describedby="error ? errorId : undefined"
            :adjust-position="true"
            :cursor-spacing="120"
            @input="onInput"
            @blur="onInput"
          />
          <button
            v-if="unit !== 'g' && !readonly"
            class="ga-measure-row__unit"
            role="button"
            tabindex="0"
            :aria-label="`${label}当前单位${unit}，点击切换为${unit === 'cm' ? 'mm' : 'cm'}`"
            @click="emit('change-unit')"
          >
            {{ unit }} <text class="ga-measure-row__swap">⇅</text>
          </button>
          <text v-else class="ga-measure-row__fixed-unit">{{ unit }}</text>
        </view>
        <button
          v-if="chart"
          class="ga-measure-row__chart"
          role="button"
          tabindex="0"
          :aria-label="`查看${label}历史曲线`"
          @click="emit('chart')"
        >
          <GaIcon name="chart" />
        </button>
      </view>
      <text
        v-if="error"
        :id="errorId"
        class="ga-measure-row__error"
        role="alert"
        >{{ error }}</text
      >
      <view v-else class="ga-measure-row__assessment">
        <view class="ga-measure-row__marker" />
        <text>{{ note || "参考值待核验，暂不提供百分位与正常范围" }}</text>
      </view>
    </view>
  </GaCard>
</template>

<script setup lang="ts">
/**
 * 测量输入行：复用输入、单位切换、校验提示和曲线入口；只发送事件，不自行执行医学计算或写档案。
 * <script setup> 中的顶层变量、函数和导入可直接在模板里使用，不需要再写 data、methods 或 return。
 */
import { computed } from "vue";
import GaCard from "./GaCard.vue";
import GaIcon from "./GaIcon.vue";

// defineProps 是 <script setup> 编译宏，声明父组件传入的参数；props 遵循单向数据流，子组件应通过事件请求更新。
// withDefaults 为类型式 props 设置默认值；问号标记可选参数，未传入时使用这里的默认配置。
const props = withDefaults(
  defineProps<{
    modelValue: string;
    label: string;
    metric: string;
    unit?: "cm" | "mm" | "g";
    error?: string;
    note?: string;
    readonly?: boolean;
    chart?: boolean;
  }>(),
  { unit: "cm", error: "", note: "", readonly: false, chart: true },
);

// defineEmits 声明组件可发送的事件及参数类型；update:modelValue 对应父组件 v-model 的赋值操作。
const emit = defineEmits<{
  "update:modelValue": [value: string];
  "change-unit": [];
  chart: [];
}>();
// computed 表示从现有状态推导出的值，会跟踪依赖并缓存结果；依赖变化后才重新求值，不用手动同步另一份状态。
const fieldId = computed(() => `measure-${props.metric.toLowerCase()}`);
const errorId = computed(() => `${fieldId.value}-error`);
function onInput(event: Event) {
  const detail = (event as unknown as { detail: { value: string } }).detail;
  emit("update:modelValue", detail.value);
}
</script>

<style scoped>
.ga-measure-row {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.ga-measure-row__main {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.ga-measure-row__label {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 3px;
  min-width: 70px;
}
.ga-measure-row__name {
  font-size: 15px;
  line-height: 22px;
  color: var(--text-primary);
}
.ga-measure-row__metric {
  font-size: 12px;
  line-height: 16px;
  color: var(--text-secondary);
}
.ga-measure-row__value {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}
.ga-measure-row__input {
  width: 80px;
  min-width: 0;
  height: 40px;
  border-bottom: 1px solid var(--glass-stroke);
  color: var(--text-primary);
  font-size: 20px;
  font-weight: 600;
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.ga-measure-row__input:focus {
  border-color: var(--primary);
}
.ga-measure-row__unit,
.ga-measure-row__chart {
  margin: 0;
  padding: 0;
  border: 0;
  background: var(--tint-blue);
  color: var(--primary);
  cursor: pointer;
}
.ga-measure-row__unit::after,
.ga-measure-row__chart::after {
  border: 0;
}
.ga-measure-row__unit {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  min-width: 44px;
  min-height: 40px;
  border-radius: 10px;
  font-size: 12px;
  line-height: 16px;
}
.ga-measure-row__swap {
  font-size: 14px;
}
.ga-measure-row__fixed-unit {
  min-width: 24px;
  font-size: 12px;
  color: var(--text-secondary);
}
.ga-measure-row__chart {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  min-height: 40px;
  border-radius: 10px;
  flex-shrink: 0;
}
.ga-measure-row__unit:hover,
.ga-measure-row__chart:hover {
  background: var(--glass-fillStrong);
}
.ga-measure-row__unit:active,
.ga-measure-row__chart:active {
  opacity: 0.7;
}
.ga-measure-row__unit:focus-visible,
.ga-measure-row__chart:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}
.ga-measure-row__assessment {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding-top: 10px;
  border-top: 1px solid var(--glass-stroke);
  font-size: 12px;
  line-height: 18px;
  color: var(--text-tertiary);
}
.ga-measure-row__marker {
  width: 5px;
  height: 5px;
  margin-top: 6px;
  flex-shrink: 0;
  border-radius: 50%;
  background: var(--text-tertiary);
}
.ga-measure-row__error {
  font-size: 12px;
  line-height: 18px;
  color: var(--danger);
}
@media (max-width: 350px) {
  .ga-measure-row__input {
    width: 60px;
  }
  .ga-measure-row__chart {
    width: 34px;
  }
}
</style>
