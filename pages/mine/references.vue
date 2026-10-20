<script setup lang="ts">
/**
 * 参考文献目录：集中展示来源元数据，工具中的 referenceIds 与这里的文献 ID 对应。
 * <script setup> 中的顶层变量、函数和导入可直接在模板里使用，不需要再写 data、methods 或 return。
 */
import { computed, ref } from "vue";
import { medicalReferences } from "../../data/references";
import sources from "../../data/knowledge-sources.json";
import GaPage from "../../components/GaPage.vue";
import GaSearch from "../../components/GaSearch.vue";
import GaNotice from "../../components/GaNotice.vue";
import GaReference from "../../components/GaReference.vue";
import GaSourceList from "../../components/GaSourceList.vue";
import GaEmpty from "../../components/GaEmpty.vue";
// ref 创建响应式状态；脚本读写用 .value，模板中作为顶层绑定使用时会自动解包。修改它后，依赖它的界面会更新。
const search = ref("");
// computed 表示从现有状态推导出的值，会跟踪依赖并缓存结果；依赖变化后才重新求值，不用手动同步另一份状态。
const refs = computed(() =>
  medicalReferences.filter((r) =>
    (r.title + r.authors + r.id)
      .toLowerCase()
      .includes(search.value.trim().toLowerCase()),
  ),
);
const content = computed(() =>
  sources.filter((r) =>
    (r.title + r.id).toLowerCase().includes(search.value.trim().toLowerCase()),
  ),
);
</script>
<template>
  <GaPage title="参考文献与版本" back
    ><GaNotice
      title="可追溯不等于临床发布审核"
      text="公式开发核对、内容编审、参考数据审批分别记录。这里保留原始链接与适用边界，不以竞品作为医学依据。" /><GaSearch
      v-model="search"
      placeholder="搜索标题、作者或模型 ID" /><GaReference
      v-for="r in refs"
      :key="r.id"
      :ids="[r.id]" /><GaSourceList
      v-if="content.length"
      :urls="content.map((s) => s.url)" /><GaEmpty
      v-if="!refs.length && !content.length"
      title="没有匹配文献"
      description="试试作者、模型缩写，或清除搜索。"
  /></GaPage>
</template>
