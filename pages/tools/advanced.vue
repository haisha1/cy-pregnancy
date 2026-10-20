<script setup lang="ts">
/**
 * 高级工具目录：复用工具配置与链接组件；这里只负责展示入口，不包含医学计算。
 * <script setup> 中的顶层变量、函数和导入可直接在模板里使用，不需要再写 data、methods 或 return。
 */
import { computed, ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import organCatalog from "../../data/organ-catalog.json";
import { useProfileStore } from "../../store/profile";
import GaPage from "../../components/GaPage.vue";
import GaNotice from "../../components/GaNotice.vue";
import GaSearch from "../../components/GaSearch.vue";
import GaTabs from "../../components/GaTabs.vue";
import GaLinkRow from "../../components/GaLinkRow.vue";
import GaEmpty from "../../components/GaEmpty.vue";
import GaButton from "../../components/GaButton.vue";
// ref 创建响应式状态；脚本读写用 .value，模板中作为顶层绑定使用时会自动解包。修改它后，依赖它的界面会更新。
const profile = useProfileStore(),
  kind = ref("organ"),
  search = ref(""),
  category = ref("all");
const categories = [
  { label: "全部", value: "all" },
  ...Array.from(new Set(organCatalog.map((o) => o.category))).map((c) => ({
    label: c,
    value: c,
  })),
];
// computed 表示从现有状态推导出的值，会跟踪依赖并缓存结果；依赖变化后才重新求值，不用手动同步另一份状态。
const items = computed(() =>
  organCatalog.filter(
    (o) =>
      (category.value === "all" || o.category === category.value) &&
      (o.name + " " + o.key + " " + o.category)
        .toLowerCase()
        .includes(search.value.trim().toLowerCase()),
  ),
);
// uni-app 页面生命周期：onLoad 接收打开页面时的路由参数；它与普通 Vue 子组件的 onMounted 用途不同。
onLoad((q) => (kind.value = String(q?.kind ?? "organ")));
</script>
<template>
  <GaPage
    :title="kind === 'twins' ? '双胎工具总览' : '胎儿脏器与专科'"
    back
    disclaimer
    ><GaNotice
      title="使用说明"
      :text="
        kind === 'twins'
          ? 'A/B 以报告身份固定。同次同胎数据分别保存，未审核的分期工具只记录原始观察。'
          : '按系统查看测量与专科工具，每项切面、单位、方法和参考模型独立维护。'
      " />
    <template v-if="kind === 'twins'"
      ><GaNotice
        v-if="
          profile.profiles.find((p) => p.id === profile.activeProfileId)
            ?.fetusCount !== 2
        "
        title="临时双胎查阅"
        text="当前不是双胎档案，浏览不会改变当前档案。保存双胎输入前需显式建立或选择双胎档案。" /><GaLinkRow
        v-for="item in [
          { key: 'twin-growth', title: '双胎生长对比' },
          { key: 'ttts', title: 'TTTS 分期参考' },
          { key: 'sfgr', title: 'sFGR 分类参考' },
        ]"
        :key="item.key"
        :title="item.title"
        :url="'/pages/tools/calculator?tool=' + item.key" /><GaLinkRow
        title="TAPS / TRAP 知识"
        url="/pages/knowledge/index?kind=twins" /><GaLinkRow
        title="管理单 / 双胎档案"
        url="/pages/profile/manage"
    /></template>
    <template v-else
      ><GaSearch v-model="search" placeholder="搜索脏器、指标或缩写" /><GaTabs
        v-model="category"
        :items="categories" /><GaLinkRow
        v-for="item in [
          { key: 'lhr', title: '肺头比 LHR' },
          { key: 'cvr', title: '肺病灶容积比 CVR' },
          { key: 'cvps', title: 'CVPS 评分参考' },
          { key: 'iut', title: '宫内输血工作表' },
        ]"
        :key="item.key"
        :title="item.title"
        subtitle="原始输入可记录，临床模型待审核"
        :url="'/pages/tools/calculator?tool=' + item.key" /><GaLinkRow
        v-for="item in items"
        :key="item.key"
        :title="item.name"
        :subtitle="item.category + ' · 参考模型待核验'"
        :url="'/pages/tools/organ?key=' + item.key" /><GaEmpty
        v-if="!items.length"
        title="没有匹配指标"
        description="试试器官中文名或英文缩写。" /></template
  ></GaPage>
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
