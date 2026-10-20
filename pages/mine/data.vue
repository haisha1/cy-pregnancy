<script setup lang="ts">
/**
 * 本地数据管理：提供导出及分范围清理；删除档案数据和删除扩展记录是两次独立操作。
 * <script setup> 中的顶层变量、函数和导入可直接在模板里使用，不需要再写 data、methods 或 return。
 */
import { computed, ref } from "vue";
import { useProfileStore } from "../../store/profile";
import { useWorkspaceStore } from "../../store/workspace";
import { readStored, STORAGE_KEYS } from "../../utils/storage";
import { confirmAction, notify } from "../../utils/feedback";
import GaPage from "../../components/GaPage.vue";
import GaNotice from "../../components/GaNotice.vue";
import GaCard from "../../components/GaCard.vue";
import GaButton from "../../components/GaButton.vue";
// ref 创建响应式状态；脚本读写用 .value，模板中作为顶层绑定使用时会自动解包。修改它后，依赖它的界面会更新。
const profile = useProfileStore(),
  workspace = useWorkspaceStore(),
  error = ref("");
// computed 表示从现有状态推导出的值，会跟踪依赖并缓存结果；依赖变化后才重新求值，不用手动同步另一份状态。
const growthCount = computed(() =>
  profile.profiles.reduce((n, p) => n + p.records.length, 0),
);
async function exportData() {
  if (
    !(await confirmAction(
      "复制本机备份到系统剪贴板？",
      "备份包含健康数据和备注。请仅粘贴到你信任的私密位置；本操作不上传服务器。",
    ))
  )
    return;
  try {
    const text = JSON.stringify(
      {
        schemaVersion: 2,
        exportedAt: new Date().toISOString(),
        profile: readStored(STORAGE_KEYS.profile),
        workspace: readStored("cy:workspace:v1"),
        preferences: readStored(STORAGE_KEYS.app),
      },
      null,
      2,
    );
    uni.setClipboardData({
      data: text,
      success: () => notify("本机备份已复制，请妥善保存", "success"),
      fail: () => (error.value = "复制失败，原始数据未改变"),
    });
  } catch {
    error.value = "备份读取失败，原始数据仍保留。";
  }
}
async function clearProfiles() {
  if (
    await confirmAction(
      "清空本机孕期档案与生长记录？",
      `将删除 ${profile.profiles.length} 个档案、${growthCount.value} 条生长记录及基准修订。工具输入、产检和反馈在另一分区单独处理，不会删除云端数据。`,
    )
  ) {
    const r = profile.clearLocal();
    if (!r.ok) {
      error.value = r.message;
      return;
    }
    notify("指定本机档案数据已清空", "success");
  }
}
async function clearWorkspace() {
  if (
    await confirmAction(
      "清空本机扩展数据？",
      `将删除 ${workspace.state.observations.length} 次工具输入、${workspace.state.appointments.length} 条产检安排、反馈草稿与收藏；不删除孕期基准和生长记录。`,
    )
  ) {
    const r = workspace.clearLocal();
    if (!r.ok) {
      error.value = r.message;
      return;
    }
    notify("指定本机扩展数据已清空", "success");
  }
}
</script>
<template>
  <GaPage title="隐私与数据" back
    ><GaNotice
      title="数据位置与用途"
      text="孕期信息、草稿、安排和偏好仅保存在当前设备，用于计算与回看。当前未接通云同步、OCR上传或授权分享。清理应用数据可能丢失记录。"
    /><GaCard
      ><view class="ga-stack"
        ><text
          >档案 {{ profile.profiles.length }} 个 · 生长记录
          {{ growthCount }} 条</text
        ><text>工具输入 {{ workspace.state.observations.length }} 次</text
        ><text>产检事项 {{ workspace.state.appointments.length }} 条</text
        ><text>反馈草稿 {{ workspace.state.feedback.length }} 条</text
        ><text class="ga-caption"
          >数据保留至你主动清理或设备应用数据被清除。当前无已上传原图和账户云副本。正式政策版本及服务提供方待发布。</text
        ></view
      ></GaCard
    ><GaButton @click="exportData">复制本机数据备份</GaButton
    ><GaButton variant="secondary" @click="clearProfiles"
      >清空档案与生长记录</GaButton
    ><GaButton variant="secondary" @click="clearWorkspace"
      >清空工具输入与产检等扩展数据</GaButton
    ><GaNotice
      title="云端与授权"
      text="当前没有已接通的云端删除、OCR留存或分享授权服务，不显示虚构的云端回执。拒绝非必要服务仍可使用本地工具。"
    /><text v-if="error" class="error" role="alert">{{ error }}</text></GaPage
  >
</template>
<style scoped>
.error {
  color: var(--danger);
  font-size: 13px;
}
</style>
