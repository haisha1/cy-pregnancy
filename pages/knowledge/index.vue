<script setup lang="ts">
/**
 * 知识目录：本地内容按类别和关键词筛选，收藏状态保存在 workspace；知识和处理建议共用这个页面。
 * <script setup> 中的顶层变量、函数和导入可直接在模板里使用，不需要再写 data、methods 或 return。
 */
import { computed, ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import knowledge from "../../data/knowledge-content.json";
import treatment from "../../data/treatment-content.json";
import { useWorkspaceStore } from "../../store/workspace";
import GaPage from "../../components/GaPage.vue";
import GaNotice from "../../components/GaNotice.vue";
import GaSearch from "../../components/GaSearch.vue";
import GaTabs from "../../components/GaTabs.vue";
import GaLinkRow from "../../components/GaLinkRow.vue";
import GaEmpty from "../../components/GaEmpty.vue";
import GaButton from "../../components/GaButton.vue";
import GaPublishedKnowledge from "../../components/GaPublishedKnowledge.vue";
// ref 创建响应式状态；脚本读写用 .value，模板中作为顶层绑定使用时会自动解包。修改它后，依赖它的界面会更新。
const workspace = useWorkspaceStore(),
  kind = ref("knowledge"),
  search = ref(""),
  category = ref("all"),
  count = ref(10);
// computed 表示从现有状态推导出的值，会跟踪依赖并缓存结果；依赖变化后才重新求值，不用手动同步另一份状态。
const all = computed(() =>
  kind.value === "treatment"
    ? treatment
    : kind.value === "twins"
      ? treatment.filter(
          (t) => t.key.startsWith("taps") || t.key.startsWith("trap"),
        )
      : knowledge,
);
const categories = computed(() => [
  { label: "全部", value: "all" },
  { label: "已收藏", value: "favorites" },
  ...Array.from(new Set(all.value.map((i) => i.category))).map((c) => ({
    label: c,
    value: c,
  })),
]);
const matches = computed(() =>
  all.value.filter(
    (i) =>
      (category.value === "all" ||
        (category.value === "favorites" &&
          workspace.state.favorites.includes(i.id)) ||
        i.category === category.value) &&
      `${i.title} ${i.key} ${i.category} ${i.what} ${i.professional}`
        .toLocaleLowerCase()
        .includes(search.value.trim().toLocaleLowerCase()),
  ),
);
// uni-app 页面生命周期：onLoad 接收打开页面时的路由参数；它与普通 Vue 子组件的 onMounted 用途不同。
onLoad((q) => {
  kind.value = String(q?.kind ?? "knowledge");
});
</script>
<template>
  <GaPage
    :title="
      kind === 'treatment'
        ? '宫内治疗知识'
        : kind === 'twins'
          ? 'TAPS / TRAP 知识'
          : '超声知识库'
    "
    back
    disclaimer
    ><GaPublishedKnowledge v-if="kind === 'published'" />
    <template v-else
      ><GaLinkRow
        title="查看后台已发布知识"
        subtitle="读取当前发布版本，游客可用"
        url="/pages/knowledge/index?kind=published"
      /><GaNotice
        title="使用说明"
        text="从报告术语出发，了解概念与沟通问题。内容编审中，不自动匹配你的档案或生成诊断。"
      /><GaSearch
        v-model="search"
        placeholder="搜索报告术语、中文或缩写"
      /><GaTabs v-model="category" :items="categories" /><GaNotice
        title="先看是否孤立，再看筛查背景"
        text="知识条目帮助准备咨询问题，不通过一个词判断宝宝是否有病。"
      /><text class="ga-muted"
        >共 {{ matches.length }} 个匹配条目 · 本地内容 PRD-1.0</text
      ><GaLinkRow
        v-for="entry in matches.slice(0, count)"
        class="knowledge-entry"
        :key="entry.id"
        :title="entry.title"
        :subtitle="entry.category + ' · 内容编审中'"
        :url="'/pages/knowledge/detail?id=' + entry.id"
      /><GaEmpty
        v-if="!matches.length"
        title="没有匹配内容"
        description="换个名称、缩写或清除筛选试试。"
      /><GaButton
        v-if="count < matches.length"
        variant="secondary"
        @click="count += 10"
        >加载更多条目</GaButton
      ><GaButton
        v-if="search || category !== 'all'"
        variant="text"
        @click="
          search = '';
          category = 'all';
        "
        >清除搜索与筛选</GaButton
      ></template
    ></GaPage
  >
</template>
<style scoped>
.ga-tabs {
  flex-wrap: wrap;
}
.ga-tabs :deep(.ga-tab) {
  flex: auto;
  padding-inline: 8px;
}
</style>
