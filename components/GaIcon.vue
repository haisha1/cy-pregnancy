<script setup lang="ts">
/**
 * 图标适配层：集中选择图标资源与主题状态，业务页面通过 name 引用，避免散落图片路径。
 * <script setup> 中的顶层变量、函数和导入可直接在模板里使用，不需要再写 data、methods 或 return。
 */
import { computed } from "vue";
import { useAppStore } from "../store/app";
import assets from "../data/figma-assets.json";
import details from "../data/figma-detail-assets.json";
import prdAssets from "../data/prd-assets.json";
// defineProps 是 <script setup> 编译宏，声明父组件传入的参数；props 遵循单向数据流，子组件应通过事件请求更新。
// withDefaults 为类型式 props 设置默认值；问号标记可选参数，未传入时使用这里的默认配置。
const props = withDefaults(
  defineProps<{ name: string; size?: number; active?: boolean }>(),
  { size: 24, active: false },
);
const app = useAppStore();
const names: Record<string, keyof typeof assets.light> = {
  calendar: "imgIconCalendar",
  chart: "imgIconChart",
  pulse: "imgIconPulse",
  ruler: "imgIconRuler",
  drop: "imgIconDrop",
  dna: "imgIconDna",
  list: "imgIconList",
  grid: "imgIconGrid",
  user: "imgIconUser",
  edit: "imgIconEdit",
  back: "imgIconBack",
};
// computed 表示从现有状态推导出的值，会跟踪依赖并缓存结果；依赖变化后才重新求值，不用手动同步另一份状态。
const src = computed(() => {
  const theme = app.theme;
  if (props.name === "right") return prdAssets[theme].imgIconRight;
  if (props.name === "hero-user") return prdAssets[theme].imgIconUser1;
  if (props.name === "nav-user")
    return props.active
      ? prdAssets[theme].imgIconUser
      : assets[theme].imgIconUser;
  if (props.name === "info") return details[theme].imgIconInfo1;
  if (props.name === "check") return details[theme].imgIconCheck;
  if (props.name === "nav-tools")
    return props.active
      ? assets[theme].imgIconGrid1
      : details[theme].imgIconGrid;
  if (props.name === "nav-records")
    return props.active
      ? details[theme].imgIconChart
      : assets[theme].imgIconChart1;
  return assets[theme][names[props.name] ?? "imgIconGrid"];
});
</script>
<template>
  <image
    :src="src"
    class="ga-icon"
    :style="{ width: size + 'px', height: size + 'px' }"
    mode="aspectFit"
    aria-hidden="true"
  />
</template>
<style scoped>
.ga-icon {
  display: inline-block;
  flex-shrink: 0;
  vertical-align: middle;
}
</style>
