<script setup lang="ts">
/**
 * 知识详情：路由 kind 与 id 决定内容，正文和来源来自数据文件；草稿内容不作为自动诊断结论。
 * <script setup> 中的顶层变量、函数和导入可直接在模板里使用，不需要再写 data、methods 或 return。
 */
const platform = uni;

import { computed, ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import knowledge from "../../data/knowledge-content.json";
import treatment from "../../data/treatment-content.json";
import { useAppStore } from "../../store/app";
import { useWorkspaceStore } from "../../store/workspace";
import { notify } from "../../utils/feedback";
import GaPage from "../../components/GaPage.vue";
import GaNotice from "../../components/GaNotice.vue";
import GaCard from "../../components/GaCard.vue";
import GaButton from "../../components/GaButton.vue";
import GaSourceList from "../../components/GaSourceList.vue";
import GaLinkRow from "../../components/GaLinkRow.vue";
import GaPublishedKnowledge from "../../components/GaPublishedKnowledge.vue";
const publishedUuid = ref("");
// ref 创建响应式状态；脚本读写用 .value，模板中作为顶层绑定使用时会自动解包。修改它后，依赖它的界面会更新。
const app = useAppStore(),
  workspace = useWorkspaceStore(),
  id = ref("");
// computed 表示从现有状态推导出的值，会跟踪依赖并缓存结果；依赖变化后才重新求值，不用手动同步另一份状态。
const entry = computed(() =>
  [...knowledge, ...treatment].find((i) => i.id === id.value),
);
const error = ref("");
// uni-app 页面生命周期：onLoad 接收打开页面时的路由参数；它与普通 Vue 子组件的 onMounted 用途不同。
onLoad((q) => {
  id.value = String(q?.id ?? "");
  publishedUuid.value = String(q?.publishedUuid ?? "");
});
function favorite() {
  if (!entry.value) return;
  const r = workspace.favorite(entry.value.id);
  if (!r.ok) {
    error.value = r.message;
    return;
  }
  notify(
    workspace.state.favorites.includes(id.value)
      ? "已收藏到本机"
      : "已取消收藏",
    "success",
  );
}
</script>
<template>
  <GaPage :title="entry?.title || '知识条目'" back disclaimer
    ><GaPublishedKnowledge
      v-if="publishedUuid"
      :uuid="publishedUuid"
    /><template v-else-if="entry"
      ><GaNotice
        title="内容编审中"
        text="以下为有来源的中性概念说明和咨询问题，不表示该条目已通过临床发布审核。"
      /><GaCard
        ><view class="article"
          ><text class="article-title">{{
            app.mode === "plain" ? "这是什么" : "概念说明"
          }}</text
          ><text>{{ entry.what }}</text
          ><text class="article-title">{{
            app.mode === "plain" ? "怎样看报告" : "需要结合的信息"
          }}</text
          ><text>{{ entry.result }}</text
          ><text class="article-title">需要注意什么</text
          ><text>{{ entry.concern }}</text
          ><text class="article-title">和医生沟通的问题</text
          ><text>{{ entry.action }}</text></view
        ></GaCard
      ><GaSourceList :urls="entry.sourceIds" /><GaLinkRow
        title="参考文献与使用边界"
        url="/pages/mine/references"
      /><text v-if="error" class="error">{{ error }}</text></template
    ><GaNotice
      v-else
      title="条目不存在"
      text="请返回知识目录重新选择。"
    /><template v-if="entry && !publishedUuid" #actions
      ><GaButton @click="favorite">{{
        workspace.state.favorites.includes(id) ? "取消收藏" : "收藏本条知识"
      }}</GaButton
      ><GaButton variant="secondary" @click="platform.navigateBack()"
        >返回目录</GaButton
      ></template
    ></GaPage
  >
</template>
<style scoped>
.article {
  display: flex;
  flex-direction: column;
  gap: 12px;
  font-size: 14px;
  line-height: 24px;
  color: var(--text-secondary);
}
.article-title {
  font-size: 16px;
  font-weight: 500;
  color: var(--text-primary);
  padding-top: 4px;
}
.error {
  color: var(--danger);
}
</style>
