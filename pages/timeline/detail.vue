<script setup lang="ts">
/**
 * 随访编辑页：从路由载入已有预约或新建表单，保存时保留记录 ID 并交由 store 更新修订号。
 * <script setup> 中的顶层变量、函数和导入可直接在模板里使用，不需要再写 data、methods 或 return。
 */
import { ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { useWorkspaceStore } from "../../store/workspace";
import { useProfileStore } from "../../store/profile";
import { todayISO } from "../../engine/gestation";
import { confirmAction, notify } from "../../utils/feedback";
import type { Appointment } from "../../types/workspace";
import GaPage from "../../components/GaPage.vue";
import GaCard from "../../components/GaCard.vue";
import GaField from "../../components/GaField.vue";
import GaDateField from "../../components/GaDateField.vue";
import GaTabs from "../../components/GaTabs.vue";
import GaButton from "../../components/GaButton.vue";
import GaNotice from "../../components/GaNotice.vue";
const workspace = useWorkspaceStore(),
  profile = useProfileStore();
// ref 创建响应式状态；脚本读写用 .value，模板中作为顶层绑定使用时会自动解包。修改它后，依赖它的界面会更新。
const id = ref(""),
  name = ref(""),
  date = ref(todayISO()),
  time = ref(""),
  location = ref(""),
  note = ref(""),
  status = ref<Appointment["status"]>("planned"),
  error = ref(""),
  saved = ref("");
const statuses = [
  { label: "待安排", value: "planned" },
  { label: "已预约", value: "booked" },
  { label: "已完成", value: "completed" },
  { label: "已跳过", value: "skipped" },
];
// uni-app 页面生命周期：onLoad 接收打开页面时的路由参数；它与普通 Vue 子组件的 onMounted 用途不同。
onLoad((q) => {
  if (q?.date) date.value = String(q.date);
  id.value = String(q?.id ?? "");
  if (!id.value) return;
  const entry = workspace.state.appointments.find(
    (a) => a.id === id.value && a.profileId === profile.activeProfileId,
  );
  if (!entry) {
    error.value = "事项不存在或不属于当前档案";
    return;
  }
  name.value = entry.name;
  date.value = entry.date;
  time.value = entry.time;
  location.value = entry.location;
  note.value = entry.note;
  status.value = entry.status;
});
function save() {
  const result = workspace.saveAppointment({
    id: id.value || undefined,
    profileId: profile.activeProfileId,
    name: name.value,
    date: date.value,
    time: time.value,
    location: location.value,
    note: note.value,
    status: status.value,
  });
  if (!result.ok) {
    error.value = result.message;
    return;
  }
  saved.value = "安排已保存在本机；提醒尚未开启。";
  error.value = "";
  notify("已保存产检安排", "success");
  uni.redirectTo({ url: "/pages/timeline/index" });
}
async function remove() {
  if (
    id.value &&
    (await confirmAction(
      "删除产检事项？",
      "删除本机这条安排，不会向医院发送取消预约。",
    ))
  ) {
    const r = workspace.deleteAppointment(id.value);
    if (!r.ok) {
      error.value = r.message;
      return;
    }
    uni.redirectTo({ url: "/pages/timeline/index" });
  }
}
</script>
<template>
  <GaPage title="产检安排详情" back requires-account
    ><GaNotice
      title="以医生安排为准"
      text="本地事项不等同医院预约，也不会自动发送提醒。状态由你明确选择。"
    /><GaCard
      ><view class="ga-stack"
        ><GaField
          v-model="name"
          label="检查 / 事项名称"
          type="text" /><GaDateField
          v-model="date"
          label="用户预约日期" /><GaField
          v-model="time"
          label="时间（可选，24小时制）"
          placeholder="08:30"
          type="text" /><GaField
          v-model="location"
          label="机构 / 地点（可选）"
          type="text" /><GaField
          v-model="note"
          label="备注（可选）"
          type="text" /><GaTabs
          :model-value="status"
          :items="statuses"
          @update:model-value="
            status = $event as Appointment['status']
          " /></view></GaCard
    ><GaButton disabled variant="secondary">订阅提醒服务尚未接通</GaButton
    ><text v-if="error" class="error" role="alert">{{ error }}</text
    ><text v-if="saved" class="ga-muted">{{ saved }}</text
    ><GaButton v-if="id" variant="text" @click="remove">删除这条安排</GaButton
    ><template #actions
      ><GaButton :disabled="!profile.activeProfileId" @click="save"
        >保存安排</GaButton
      ></template
    ></GaPage
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
