<script setup lang="ts">
/**
 * 档案管理：把创建、切换、归档、删除交给 store；页面负责用户输入、确认和错误反馈。
 * <script setup> 中的顶层变量、函数和导入可直接在模板里使用，不需要再写 data、methods 或 return。
 */
import { ref, computed } from "vue";
import { useProfileStore } from "../../store/profile";
import { useWorkspaceStore } from "../../store/workspace";
import { confirmAction, notify } from "../../utils/feedback";
import GaPage from "../../components/GaPage.vue";
import GaCard from "../../components/GaCard.vue";
import GaField from "../../components/GaField.vue";
import GaTabs from "../../components/GaTabs.vue";
import GaButton from "../../components/GaButton.vue";
import GaNotice from "../../components/GaNotice.vue";
import GaLinkRow from "../../components/GaLinkRow.vue";
const profile = useProfileStore(),
  workspace = useWorkspaceStore();
// ref 创建响应式状态；脚本读写用 .value，模板中作为顶层绑定使用时会自动解包。修改它后，依赖它的界面会更新。
const name = ref(""),
  count = ref("1"),
  chorion = ref("unknown"),
  error = ref("");
const chorions = [
  { label: "未确认", value: "unknown" },
  { label: "单绒双羊", value: "MCDA" },
  { label: "双绒双羊", value: "DCDA" },
  { label: "单绒单羊", value: "MCMA" },
];
function feedback(result: { ok: boolean; message?: string }) {
  if (!result.ok) {
    error.value = result.message ?? "操作失败";
    return false;
  }
  error.value = "";
  return true;
}
function create() {
  if (
    feedback(
      profile.createProfile(
        name.value,
        count.value === "2" ? 2 : 1,
        chorion.value,
      ),
    )
  ) {
    name.value = "";
    notify("档案已建立，请补充孕期基准", "success");
    uni.navigateTo({ url: "/pages/pregnancy/edd" });
  }
}
async function activate(id: string) {
  if (id === profile.activeProfileId) return;
  if (
    await confirmAction(
      "切换当前孕期档案？",
      "后续计算与新记录将归入所选档案；其他档案的历史数据保持独立。",
    )
  ) {
    if (feedback(profile.switchProfile(id)))
      notify("已切换当前档案", "success");
  }
}
async function archive(id: string) {
  if (
    await confirmAction(
      "归档孕期档案？",
      "归档保留历史记录，若为当前档案则退出当前孕期。",
    )
  )
    feedback(profile.archiveProfile(id));
}
async function remove(id: string) {
  const p = profile.profiles.find((p) => p.id === id);
  if (!p) return;
  const linked =
    workspace.state.observations.filter((o) => o.profileId === id).length +
    workspace.state.appointments.filter((o) => o.profileId === id).length;
  if (linked) {
    error.value =
      "此档案还有工具输入或产检事项，请先在隐私与数据中导出并清理，避免遗留关联记录。";
    return;
  }
  if (
    await confirmAction(
      "永久删除本机档案？",
      `将删除「${p.label}」及其 ${p.records.length} 条生长记录、基准与修订历史，不能撤销。`,
    )
  )
    feedback(profile.deleteProfile(id));
}
</script>
<template>
  <GaPage title="档案管理" back requires-account
    ><GaNotice
      title="独立管理每次孕期"
      text="档案切换不会移动历史数据；胎儿 A/B 按报告身份固定，不随体重排序。"
    /><GaCard
      ><view class="ga-stack"
        ><GaField
          v-model="name"
          label="新档案昵称（1–20字）"
          type="text"
        /><GaTabs
          v-model="count"
          :items="[
            { label: '单胎', value: '1' },
            { label: '双胎', value: '2' },
          ]"
        /><GaTabs
          v-if="count === '2'"
          v-model="chorion"
          :items="chorions"
        /><GaButton @click="create">新建孕期档案</GaButton></view
      ></GaCard
    ><GaCard v-for="item in profile.profiles" :key="item.id"
      ><view class="ga-stack"
        ><GaLinkRow
          :title="item.label"
          :subtitle="`${item.fetusCount === 2 ? '双胎' : '单胎'} · ${item.state === 'archived' ? '已归档' : item.id === profile.activeProfileId ? '当前档案' : '本地档案'} · ${item.records.length} 次生长记录`"
          :url="'/pages/profile/detail?profileId=' + item.id"
        /><view class="ga-row"
          ><GaButton variant="text" @click="activate(item.id)"
            >设为当前</GaButton
          ><GaButton variant="text" @click="archive(item.id)">归档</GaButton
          ><GaButton variant="text" @click="remove(item.id)"
            >删除</GaButton
          ></view
        ></view
      ></GaCard
    ><text v-if="error" class="error" role="alert">{{ error }}</text></GaPage
  >
</template>
<style scoped>
.error {
  color: var(--danger);
  font-size: 13px;
}
.ga-tabs {
  flex-wrap: wrap;
}
</style>
