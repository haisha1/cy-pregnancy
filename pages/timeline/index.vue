<script setup lang="ts">
/**
 * 随访时间线：展示本地预约与用户选择的状态；本地保存预约不代表已开通系统提醒。
 * <script setup> 中的顶层变量、函数和导入可直接在模板里使用，不需要再写 data、methods 或 return。
 */
const platform = uni;

import { computed, ref } from "vue";
import { useWorkspaceStore } from "../../store/workspace";
import { useProfileStore } from "../../store/profile";
import { todayISO } from "../../engine/gestation";
import GaPage from "../../components/GaPage.vue";
import GaNotice from "../../components/GaNotice.vue";
import GaTabs from "../../components/GaTabs.vue";
import GaLinkRow from "../../components/GaLinkRow.vue";
import GaEmpty from "../../components/GaEmpty.vue";
import GaButton from "../../components/GaButton.vue";
const workspace = useWorkspaceStore(),
  profile = useProfileStore();
// ref 创建响应式状态；脚本读写用 .value，模板中作为顶层绑定使用时会自动解包。修改它后，依赖它的界面会更新。
const filter = ref("all");
const labels: Record<string, string> = {
  planned: "待安排",
  booked: "已预约",
  completed: "已完成",
  skipped: "已跳过",
};
// computed 表示从现有状态推导出的值，会跟踪依赖并缓存结果；依赖变化后才重新求值，不用手动同步另一份状态。
const items = computed(() =>
  workspace.state.appointments
    .filter(
      (a) =>
        a.profileId === profile.activeProfileId &&
        (filter.value === "all" || a.status === filter.value),
    )
    .sort((a, b) => a.date.localeCompare(b.date)),
);
</script>
<template>
  <GaPage title="产检时间表" back requires-account
    ><GaNotice
      title="使用说明"
      text="这里只展示你亲自安排的事项。参考窗口未审定，不自动生成检查或把过期事项标为完成。提醒服务尚未接通。"
    /><GaTabs
      v-model="filter"
      :items="[
        { label: '全部', value: 'all' },
        ...Object.entries(labels).map(([value, label]) => ({ label, value })),
      ]"
    /><GaLinkRow
      v-for="item in items"
      :key="item.id"
      :title="item.name"
      :subtitle="`${item.date} ${item.time} · ${labels[item.status]}${item.date < todayISO() && item.status !== 'completed' && item.status !== 'skipped' ? ' · 日期已过，状态待确认' : ''}`"
      :url="'/pages/timeline/detail?id=' + item.id"
    /><GaEmpty
      v-if="!items.length"
      title="暂无产检安排"
      description="按医生确认的时间新增事项；可以修改状态，不需要登录。"
    /><GaLinkRow
      v-if="!profile.activeProfileId"
      title="先建立孕期档案"
      url="/pages/profile/manage"
    /><template #actions
      ><GaButton
        :disabled="!profile.activeProfileId"
        @click="platform.navigateTo({ url: '/pages/timeline/detail' })"
        >新增产检事项</GaButton
      ></template
    ></GaPage
  >
</template>
