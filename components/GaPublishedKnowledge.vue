<script setup lang="ts">
/** 游客读取当前发布版本；下架/断网不回退为旧发布正文。正文作为纯文本，不执行HTML。 */
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { ApiError, request } from "../api/http";
import type { PublishedKnowledge, PublishedPage } from "../types/knowledge";
import { useAppStore } from "../store/app";
import GaCard from "./GaCard.vue";
import GaButton from "./GaButton.vue";
import GaNotice from "./GaNotice.vue";
import GaEmpty from "./GaEmpty.vue";
import GaLinkRow from "./GaLinkRow.vue";
import GaSearch from "./GaSearch.vue";
const props = defineProps<{ uuid?: string }>();
const app = useAppStore(),
  search = ref(""),
  rows = ref<PublishedKnowledge[]>([]),
  item = ref<PublishedKnowledge | null>(null);
const busy = ref(false),
  error = ref(""),
  missing = ref(false),
  next = ref<number | null>(null);
const body = computed(() =>
  app.mode === "plain" ? item.value?.plainContent : item.value?.proContent,
);
let sequence = 0,
  timer: ReturnType<typeof setTimeout> | undefined,
  mounted = false;
async function load(more = false) {
  const run = ++sequence;
  busy.value = true;
  error.value = "";
  missing.value = false;
  if (!more) {
    rows.value = [];
    next.value = null;
    item.value = null;
  }
  try {
    if (props.uuid) {
      const value = await request<PublishedKnowledge>(
        "/knowledge/" + encodeURIComponent(props.uuid),
      );
      if (run === sequence) item.value = value;
    } else {
      const query =
        "?limit=20&q=" +
        encodeURIComponent(search.value.trim()) +
        (more && next.value ? "&beforeId=" + next.value : "");
      const page = await request<PublishedPage>("/knowledge" + query);
      if (run === sequence) {
        rows.value = more ? [...rows.value, ...page.records] : page.records;
        next.value = page.nextBeforeId;
      }
    }
  } catch (cause) {
    if (run === sequence) {
      missing.value = cause instanceof ApiError && cause.status === 404;
      error.value =
        cause instanceof ApiError ? cause.message : "内容加载失败，请重试";
    }
  } finally {
    if (run === sequence) busy.value = false;
  }
}
watch(search, () => {
  clearTimeout(timer);
  timer = setTimeout(() => load(), 300);
});
onMounted(() => {
  mounted = true;
  load();
});
onShow(() => {
  if (mounted) load();
});
onUnmounted(() => {
  sequence++;
  clearTimeout(timer);
});
</script>
<template>
  <view class="ga-stack">
    <GaNotice
      title="后台已发布知识"
      text="内容经编辑、审核和发布流程维护。请结合原始文献及医生意见，不作为诊断或自动计算参数。"
    />
    <GaSearch v-if="!uuid" v-model="search" placeholder="搜索已发布知识标题" />
    <text v-if="busy" role="status">正在读取当前发布内容…</text>
    <GaNotice
      v-if="error"
      :title="missing ? '内容已下架或不存在' : '内容暂不可用'"
      :text="error"
    />
    <GaButton
      v-if="error && !missing"
      variant="secondary"
      :loading="busy"
      @click="load(!!rows.length)"
      >重新加载发布内容</GaButton
    >
    <template v-if="item">
      <GaCard
        ><view class="published-article"
          ><text class="published-title">{{ item.title }}</text
          ><text class="ga-caption"
            >{{ item.category }} · 版本 {{ item.versionNo }} ·
            {{ item.publishedAt }}</text
          ><text class="published-body">{{ body }}</text></view
        ></GaCard
      >
      <GaCard
        ><view class="published-article"
          ><text class="published-title">论文与证据说明</text
          ><text class="published-body">{{ item.evidenceNote }}</text
          ><text
            v-for="(source, index) in item.references"
            :key="index"
            class="published-body"
            >{{ index + 1 }}. {{ source }}</text
          ></view
        ></GaCard
      >
    </template>
    <GaLinkRow
      v-for="row in rows"
      :key="row.uuid"
      :title="row.title"
      :subtitle="row.category + ' · 已发布版本 ' + row.versionNo"
      :url="'/pages/knowledge/detail?publishedUuid=' + row.uuid"
    />
    <GaEmpty
      v-if="!uuid && !busy && !error && !rows.length"
      title="暂无匹配的已发布知识"
      description="可清除搜索，或稍后重新查看。"
    />
    <GaButton
      v-if="!uuid && next"
      variant="secondary"
      :loading="busy"
      @click="load(true)"
      >加载更多已发布知识</GaButton
    >
    <GaLinkRow
      title="查看本地编审资料"
      subtitle="本地资料单独标注编审状态，不代替已下架的发布内容"
      url="/pages/knowledge/index"
    />
  </view>
</template>
<style scoped>
.published-article {
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-wrap: anywhere;
}
.published-title {
  font-size: 17px;
  font-weight: 600;
}
.published-body {
  font-size: 14px;
  line-height: 1.7;
  white-space: pre-wrap;
}
</style>
