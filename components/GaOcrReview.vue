<script setup lang="ts">
/**
 * OCR 人工核对组件：接收候选字段并上报修改；数值或单位改变后需重新确认，校验规则在 engine/ocr.ts。
 * <script setup> 中的顶层变量、函数和导入可直接在模板里使用，不需要再写 data、methods 或 return。
 */
import type { OcrCandidate } from "../types/ocr";
import GaCard from "./GaCard.vue";
import GaField from "./GaField.vue";
import GaTabs from "./GaTabs.vue";
import GaButton from "./GaButton.vue";
// defineProps 是 <script setup> 编译宏，声明父组件传入的参数；props 遵循单向数据流，子组件应通过事件请求更新。
const props = defineProps<{ modelValue: OcrCandidate[] }>();
// defineEmits 声明组件可发送的事件及参数类型；update:modelValue 对应父组件 v-model 的赋值操作。
const emit = defineEmits<{ "update:modelValue": [OcrCandidate[]] }>();
function update(id: string, value: Partial<OcrCandidate>) {
  emit(
    "update:modelValue",
    props.modelValue.map((f) => (f.id === id ? { ...f, ...value } : f)),
  );
}
</script>
<template>
  <view class="ga-stack"
    ><GaCard v-for="field in modelValue" :key="field.id"
      ><view class="ga-stack"
        ><text>{{ field.metric }} · 原识别文字 {{ field.rawText }}</text
        ><text class="ga-caption"
          >{{
            field.confidence === null
              ? "置信度未知"
              : "置信度 " + Math.round(field.confidence * 100) + "%"
          }}
          ·
          {{
            field.discarded
              ? "已舍弃"
              : field.confirmed
                ? "已人工确认"
                : "待逐项核对"
          }}</text
        ><GaField
          :model-value="field.value"
          :label="field.metric + '识别值'"
          @update:model-value="
            update(field.id, { value: $event, confirmed: false })
          "
        /><GaTabs
          :model-value="field.unit"
          :items="[
            { label: '未知单位', value: 'unknown' },
            { label: 'cm', value: 'cm' },
            { label: 'mm', value: 'mm' },
          ]"
          @update:model-value="
            update(field.id, {
              unit: $event as OcrCandidate['unit'],
              confirmed: false,
            })
          "
        /><view class="ga-row"
          ><GaButton
            variant="secondary"
            @click="update(field.id, { confirmed: !field.confirmed })"
            >{{ field.confirmed ? "取消确认" : "已核对原报告" }}</GaButton
          ><GaButton
            variant="text"
            @click="update(field.id, { discarded: !field.discarded })"
            >{{ field.discarded ? "恢复字段" : "舍弃字段" }}</GaButton
          ></view
        ></view
      ></GaCard
    ></view
  >
</template>
