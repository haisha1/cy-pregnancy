<script setup lang="ts">
/**
 * 日期与孕周互查：复用档案中的孕期基准，页面只管理查询输入，日期算法统一交给 engine/gestation.ts。
 * <script setup> 中的顶层变量、函数和导入可直接在模板里使用，不需要再写 data、methods 或 return。
 */
import { computed, ref } from "vue";
import { useProfileStore } from "../../store/profile";
import {
  todayISO,
  getPregnancySummary,
  dateAtGestation,
} from "../../engine/gestation";
import GaPage from "../../components/GaPage.vue";
import GaNotice from "../../components/GaNotice.vue";
import GaDateField from "../../components/GaDateField.vue";
import GaField from "../../components/GaField.vue";
import GaTabs from "../../components/GaTabs.vue";
import GaCard from "../../components/GaCard.vue";
import GaLinkRow from "../../components/GaLinkRow.vue";
// ref 创建响应式状态；脚本读写用 .value，模板中作为顶层绑定使用时会自动解包。修改它后，依赖它的界面会更新。
const profile = useProfileStore(),
  mode = ref("date"),
  date = ref(todayISO()),
  weeks = ref(""),
  days = ref("");
// computed 表示从现有状态推导出的值，会跟踪依赖并缓存结果；依赖变化后才重新求值，不用手动同步另一份状态。
const summary = computed(() =>
  profile.basis ? getPregnancySummary(profile.basis, date.value) : null,
);
const target = computed(() =>
  profile.basis && weeks.value.trim()
    ? dateAtGestation(
        profile.basis,
        Number(weeks.value),
        Number(days.value || "0"),
      )
    : null,
);
</script>
<template>
  <GaPage title="孕周双向日期" back disclaimer
    ><GaNotice
      title="查询不改变孕期基准"
      text="按当前档案计算日期与孕周，余天为0–6。查询结果不是新的临床定年。" /><template
      v-if="profile.basis"
      ><GaTabs
        v-model="mode"
        :items="[
          { label: '某天是孕几周', value: 'date' },
          { label: '某孕周是哪天', value: 'weeks' },
        ]" /><GaDateField
        v-if="mode === 'date'"
        v-model="date"
        label="要查询的日期" /><view v-else class="ga-row"
        ><view class="date-query-field"
          ><GaField
            v-model="weeks"
            label="孕周"
            unit="周"
            type="number" /></view
        ><view class="date-query-field"
          ><GaField
            v-model="days"
            label="余天"
            unit="天"
            type="number" /></view></view
      ><GaCard v-if="mode === 'date' && summary?.status === 'ready'"
        ><text
          >{{ date }} · {{ summary.value.weeks }}周+{{
            summary.value.days
          }}天</text
        ></GaCard
      ><GaNotice
        v-else-if="mode === 'date' && summary"
        title="日期待核对"
        :text="summary.status === 'ready' ? '' : summary.message" /><GaCard
        v-if="mode === 'weeks' && target?.status === 'ready'"
        ><text>对应日期 {{ target.value }}</text></GaCard
      ><GaNotice
        v-else-if="mode === 'weeks' && target"
        title="孕周待核对"
        :text="target.status === 'ready' ? '' : target.message" /><GaLinkRow
        title="把查询日期记为自定义产检事项"
        :url="
          '/pages/timeline/detail?date=' +
          encodeURIComponent(
            mode === 'date'
              ? date
              : target?.status === 'ready'
                ? target.value
                : '',
          )
        " /></template
    ><GaLinkRow v-else title="先建立本次孕期基准" url="/pages/pregnancy/edd"
  /></GaPage>
</template>
<style scoped>
.date-query-field {
  min-width: 0;
  flex: 1;
}
</style>
