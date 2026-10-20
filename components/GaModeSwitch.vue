<script setup lang="ts">
/**
 * 专业/白话模式开关：状态属于 app store，切换后影响所有读取该模式的页面，目前只放在“我的”入口。
 * <script setup> 中的顶层变量、函数和导入可直接在模板里使用，不需要再写 data、methods 或 return。
 */
import { useAppStore } from "../store/app";
import GaTabs from "./GaTabs.vue";
const app = useAppStore();
function update(value: string) {
  if (value === "pro" || value === "plain") app.setMode(value);
}
</script>
<template>
  <GaTabs
    :model-value="app.mode"
    :items="[
      { label: '专业版', value: 'pro' },
      { label: '白话版', value: 'plain' },
    ]"
    @update:model-value="update"
  />
</template>
