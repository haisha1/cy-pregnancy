<script setup lang="ts">
/**
 * 内容来源列表：把知识条目的来源数据渲染为统一列表，与工具模型的计算实现分开维护。
 * <script setup> 中的顶层变量、函数和导入可直接在模板里使用，不需要再写 data、methods 或 return。
 */
import { computed } from "vue";
import sources from "../data/knowledge-sources.json";
import { notify } from "../utils/feedback";
import GaCard from "./GaCard.vue";
// defineProps 是 <script setup> 编译宏，声明父组件传入的参数；props 遵循单向数据流，子组件应通过事件请求更新。
const props = defineProps<{ urls: string[] }>();
// computed 表示从现有状态推导出的值，会跟踪依赖并缓存结果；依赖变化后才重新求值，不用手动同步另一份状态。
const entries = computed(() =>
  props.urls.map((url) => ({
    url,
    title: sources.find((s) => s.url === url)?.title ?? url,
  })),
);
function copy(url: string) {
  uni.setClipboardData({
    data: url,
    success: () => notify("来源链接已复制", "success"),
    fail: () => notify("复制失败，请重试", "error"),
  });
}
</script>
<template>
  <GaCard
    ><view class="ga-stack"
      ><text class="source-title">来源与内容版本</text
      ><view v-for="entry in entries" :key="entry.url"
        ><text class="source-name">{{ entry.title }}</text
        ><button class="source-link" @click="copy(entry.url)">
          复制原始来源链接 ↗
        </button></view
      ><text class="ga-caption"
        >内容版本 PRD-1.0 ·
        编审状态：待临床审核。来源链接不等同于内容已完成医学审核。</text
      ></view
    ></GaCard
  >
</template>
<style scoped>
.source-title {
  color: var(--primary);
  font-size: 17px;
}
.source-name {
  font-size: 13px;
  overflow-wrap: anywhere;
}
.source-link {
  margin: 4px 0 0;
  padding: 4px 0;
  text-align: left;
  color: var(--primary);
  background: transparent;
  font-size: 12px;
}
</style>
