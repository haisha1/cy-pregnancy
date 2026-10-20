<script setup lang="ts">
/**
 * 检查上下文组件：统一收集检查日期、孕周和胎儿身份；更新对象时创建副本，避免直接修改父组件传入的数据。
 * <script setup> 中的顶层变量、函数和导入可直接在模板里使用，不需要再写 data、methods 或 return。
 */
import { computed } from "vue";
import { useProfileStore } from "../store/profile";
import {
  diffDays,
  formatGestation,
  gestationToDays,
  isValidISODate,
} from "../engine/gestation";
import GaDateField from "./GaDateField.vue";
import GaField from "./GaField.vue";
import GaTabs from "./GaTabs.vue";
export interface ExamContext {
  date: string;
  weeks: string;
  days: string;
  fetus: string;
  manual: boolean;
}
// defineProps 是 <script setup> 编译宏，声明父组件传入的参数；props 遵循单向数据流，子组件应通过事件请求更新。
const props = defineProps<{ modelValue: ExamContext; paired?: boolean }>();
// defineEmits 声明组件可发送的事件及参数类型；update:modelValue 对应父组件 v-model 的赋值操作。
const emit = defineEmits<{ "update:modelValue": [ExamContext] }>();
const profile = useProfileStore();
function set(key: keyof ExamContext, value: string | boolean) {
  // keyof 限制 key 只能是 ExamContext 的字段名；展开运算符复制旧值，再覆盖指定字段。
  // 不写 props.modelValue[key] = value，父组件才始终是这份表单数据的更新入口。
  emit("update:modelValue", { ...props.modelValue, [key]: value });
}
// computed 表示从现有状态推导出的值，会跟踪依赖并缓存结果；依赖变化后才重新求值，不用手动同步另一份状态。
const summary = computed(() =>
  profile.basis && isValidISODate(props.modelValue.date)
    ? diffDays(props.modelValue.date, profile.basis.lmpEquivalent)
    : null,
);
</script>
<template>
  <view class="ga-stack">
    <GaDateField
      :model-value="modelValue.date"
      label="检查日期"
      @update:model-value="set('date', $event)"
    />
    <view v-if="profile.basis && !modelValue.manual" class="ga-muted"
      >来自当前档案：{{
        summary !== null ? formatGestation(summary) : "日期待填写"
      }}</view
    ><button
      v-if="profile.basis"
      class="ga-context-action"
      @click="set('manual', !modelValue.manual)"
    >
      {{ modelValue.manual ? "使用档案孕周" : "手动填写本次孕周" }}
    </button>
    <view v-if="!profile.basis || modelValue.manual" class="ga-row">
      <view class="ga-context-field">
        <GaField
          :model-value="modelValue.weeks"
          label="孕周"
          unit="周"
          type="number"
          @update:model-value="set('weeks', $event)"
        />
      </view>
      <view class="ga-context-field">
        <GaField
          :model-value="modelValue.days"
          label="余天"
          unit="天"
          type="number"
          @update:model-value="set('days', $event)"
        />
      </view>
    </view>
    <text v-if="paired" class="ga-muted"
      >胎儿 A / B · 同次双胎检查，身份不随体重排序</text
    >
    <GaTabs
      v-else
      :model-value="modelValue.fetus"
      :items="[
        { label: '单胎', value: 'singleton' },
        { label: '胎儿 A', value: 'A' },
        { label: '胎儿 B', value: 'B' },
      ]"
      @update:model-value="set('fetus', $event)"
    />
  </view>
</template>
<style scoped>
.ga-context-action {
  margin: 0;
  padding: 4px;
  background: transparent;
  color: var(--primary);
  font-size: 12px;
}

/* 微信WXSS不接受通配选择器；样式放在显式view容器，避免跨自定义组件样式隔离失效。 */
.ga-context-field {
  flex: 1;
  min-width: 0;
}
</style>
