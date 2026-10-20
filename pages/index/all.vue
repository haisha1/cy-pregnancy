<script setup lang="ts">
/**
 * 全部工具目录：搜索和分类只筛选配置数据，工具的计算规则仍维护在 engine 中。
 * <script setup> 中的顶层变量、函数和导入可直接在模板里使用，不需要再写 data、methods 或 return。
 */
import { computed, ref } from "vue";
import { toolDirectory } from "../../data/tools";
import GaPage from "../../components/GaPage.vue";
import GaNotice from "../../components/GaNotice.vue";
import GaSearch from "../../components/GaSearch.vue";
import GaLinkRow from "../../components/GaLinkRow.vue";
import GaEmpty from "../../components/GaEmpty.vue";
// ref 创建响应式状态；脚本读写用 .value，模板中作为顶层绑定使用时会自动解包。修改它后，依赖它的界面会更新。
const search = ref("");
// computed 表示从现有状态推导出的值，会跟踪依赖并缓存结果；依赖变化后才重新求值，不用手动同步另一份状态。
const groups = computed(() =>
  Array.from(new Set(toolDirectory.map((t) => t.group))),
);
const matches = computed(() =>
  toolDirectory.filter((t) =>
    (t.label + " " + t.alias + " " + t.description)
      .toLowerCase()
      .includes(search.value.trim().toLowerCase()),
  ),
);
</script>
<template>
  <GaPage title="全部工具" back
    ><GaNotice
      title="孕期计算工具"
      text="工具表单均可查看。参考模型待核验时只保存原始输入，不补示例结果；联网服务未接通时明确说明。" /><GaSearch
      v-model="search"
      placeholder="搜索中文名称、缩写或用途" /><template
      v-for="group in groups"
      :key="group"
      ><text v-if="matches.some((t) => t.group === group)" class="ga-muted">{{
        group
      }}</text
      ><GaLinkRow
        v-for="item in matches.filter((t) => t.group === group)"
        :key="item.label"
        :title="item.label"
        :subtitle="item.description"
        :url="item.route" /></template
    ><GaEmpty
      v-if="!matches.length"
      title="没有匹配工具"
      description="换个名称或英文缩写试试。"
  /></GaPage>
</template>
