<script setup lang="ts">
/**
 * 反馈草稿：当前只写入本机 workspace，不发送给服务端；保存草稿与正式提交需要明确区分。
 * <script setup> 中的顶层变量、函数和导入可直接在模板里使用，不需要再写 data、methods 或 return。
 */
import { ref } from "vue";
import { useWorkspaceStore } from "../../store/workspace";
import { notify } from "../../utils/feedback";
import GaPage from "../../components/GaPage.vue";
import GaNotice from "../../components/GaNotice.vue";
import GaCard from "../../components/GaCard.vue";
import GaTabs from "../../components/GaTabs.vue";
import GaButton from "../../components/GaButton.vue";
import GaLinkRow from "../../components/GaLinkRow.vue";
// ref 创建响应式状态；脚本读写用 .value，模板中作为顶层绑定使用时会自动解包。修改它后，依赖它的界面会更新。
const workspace = useWorkspaceStore(),
  category = ref("功能"),
  body = ref(""),
  error = ref("");
const categories = [
  "功能",
  "数据或公式疑问",
  "内容",
  "体验",
  "隐私",
  "其他",
].map((label) => ({ label, value: label }));
function save() {
  const r = workspace.saveFeedback(category.value, body.value);
  if (!r.ok) {
    error.value = r.message;
    return;
  }
  body.value = "";
  error.value = "";
  notify("已保存本机草稿，尚未发送", "success");
}
</script>
<template>
  <GaPage title="反馈与本机草稿" back
    ><GaNotice
      title="反馈服务尚未接通"
      text="你可以先记录疑问；保存仅创建本机草稿，不生成服务端工单或已收到回执。请勿填写不必要的身份信息。" /><GaTabs
      v-model="category"
      :items="categories" /><GaCard
      ><label for="feedback-body">说明（10–1000字）</label
      ><textarea
        id="feedback-body"
        v-model="body"
        :maxlength="1000"
        class="feedback-body"
        style="resize: none"
        aria-label="反馈说明"
        placeholder="请描述遇到的操作、问题和预期结果，不要粘贴完整个人报告。"
      /><text class="ga-caption">{{ body.length }} / 1000</text></GaCard
    ><text v-if="error" class="error" role="alert">{{ error }}</text
    ><GaButton @click="save">保留本机反馈草稿</GaButton
    ><GaLinkRow title="查看反馈草稿与状态" url="/pages/mine/feedback-history"
  /></GaPage>
</template>
<style scoped>
.feedback-body {
  width: 100%;
  min-height: 180px;
  box-sizing: border-box;
  padding: 12px 0;
  resize: none;
  color: var(--text-primary);
  font: inherit;
}
.error {
  color: var(--danger);
}
.ga-tabs {
  flex-wrap: wrap;
}
</style>
