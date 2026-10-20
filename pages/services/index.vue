<script setup lang="ts">
/**
 * 服务状态页：按 kind 展示同步、登录或 OCR。当前只有本地图片选择与预览，不会模拟服务端成功回执。
 * <script setup> 中的顶层变量、函数和导入可直接在模板里使用，不需要再写 data、methods 或 return。
 */
const platform = uni;

import { computed, ref } from "vue";
import { useAccountStore } from "../../store/account";
import { onLoad } from "@dcloudio/uni-app";
import { useProfileStore } from "../../store/profile";
import { useWorkspaceStore } from "../../store/workspace";
import { notify } from "../../utils/feedback";
import GaPage from "../../components/GaPage.vue";
import GaCard from "../../components/GaCard.vue";
import GaNotice from "../../components/GaNotice.vue";
import GaButton from "../../components/GaButton.vue";
import GaLinkRow from "../../components/GaLinkRow.vue";
import GaOcrReview from "../../components/GaOcrReview.vue";
import type { OcrCandidate } from "../../types/ocr";
// ref 创建响应式状态；脚本读写用 .value，模板中作为顶层绑定使用时会自动解包。修改它后，依赖它的界面会更新。
const reviewFields = ref<OcrCandidate[]>([]);
const kind = ref("sync"),
  stage = ref("upload"),
  image = ref(""),
  consent = ref(false),
  error = ref("");
const account = useAccountStore();
const profile = useProfileStore(),
  workspace = useWorkspaceStore();
const titles: Record<string, string> = {
  sync: "同步中心",
  login: "登录与备份",
  ocr: "报告识别 OCR",
};
// computed 表示从现有状态推导出的值，会跟踪依赖并缓存结果；依赖变化后才重新求值，不用手动同步另一份状态。
const title = computed(() => titles[kind.value] || "服务状态");
// uni-app 页面生命周期：onLoad 接收打开页面时的路由参数；它与普通 Vue 子组件的 onMounted 用途不同。
onLoad((q) => {
  kind.value = String(q?.kind ?? "sync");
  stage.value = String(q?.stage ?? "upload");
});
function selectImage() {
  uni.chooseImage({
    count: 1,
    sourceType: ["album", "camera"],
    success: (r) => {
      image.value = r.tempFilePaths[0];
      error.value =
        "图片仅在本机预览，尚未上传。请遮挡姓名、电话等非必要信息。";
    },
    fail: () => {
      error.value = "未选择图片；可以重试相册或改为手动输入。";
    },
  });
}
function preview() {
  if (image.value) uni.previewImage({ urls: [image.value] });
}
</script>
<template>
  <GaPage :title="title" back
    ><GaNotice
      v-if="kind !== 'login'"
      title="云服务尚未接通"
      text="本地计算与档案仍可使用。OCR、健康数据上传和云同步仍未接通，不会显示虚构回执。"
    />
    <template v-if="kind === 'sync'"
      ><GaCard
        ><view class="ga-stack"
          ><text
            >账户状态：{{
              account.authenticated ? "已登录" : "游客"
            }}，本机记录未同步</text
          ><text>最近成功同步：尚无</text
          ><text
            >本机档案 {{ profile.profiles.length }} 个 · 当前生长记录
            {{ profile.records.length }} 次</text
          ><text>工具原始输入 {{ workspace.state.observations.length }} 次</text
          ><text class="ga-muted"
            >没有云端副本，不把本地保存写作“已同步”。首次登录后的合并与冲突需要真实服务才能执行。</text
          ></view
        ></GaCard
      ><GaButton disabled>云同步暂不可用</GaButton
      ><GaLinkRow title="本地导出与数据管理" url="/pages/mine/data" /><GaLinkRow
        title="了解登录与授权"
        url="/pages/services/index?kind=login"
    /></template>
    <template v-else-if="kind === 'login'">
      <GaCard
        ><view class="ga-stack"
          ><text>工具和知识可直接使用游客模式。</text
          ><text
            >进入档案后，可主动选择微信登录。登录后头像和昵称可选填；本机健康记录不会自动上传，云同步仍未开通。</text
          ></view
        ></GaCard
      >
      <GaLinkRow title="登录与个人信息说明" url="/pages/mine/privacy" />
      <GaLinkRow title="进入孕期档案" url="/pages/profile/index" />
    </template>
    <template v-else-if="kind === 'ocr'"
      ><GaNotice
        :title="
          stage === 'review'
            ? '识别结果复核'
            : stage === 'processing'
              ? '识别任务状态'
              : '上传前先确认用途'
        "
        text="OCR 供应商、保存期限和删除接口尚未配置，不会自动上传报告。选图仅用于本机预览，不代表已识别。"
      /><GaCard v-if="image"
        ><button
          class="image-button"
          aria-label="预览本机选中的报告图片"
          @click="preview"
        >
          <image :src="image" mode="widthFix" class="report-image" /></button
        ><GaButton
          variant="text"
          @click="
            image = '';
            error = '';
          "
          >移除本机预览</GaButton
        ></GaCard
      ><GaButton
        v-if="stage === 'upload'"
        variant="secondary"
        @click="selectImage"
        >选择图片，仅本机预览</GaButton
      ><GaNotice
        v-if="stage !== 'upload'"
        title="暂无真实识别任务"
        text="没有任务就不显示虚构进度或候选字段。可返回选择图片，或改为手动录入。"
      /><GaButton disabled>上传并识别 · 服务未接通</GaButton
      ><GaLinkRow
        title="改为手动填写 B 超测量"
        url="/pages/growth/biometry"
      /><GaLinkRow
        v-if="stage !== 'upload'"
        title="返回报告选择"
        url="/pages/services/index?kind=ocr"
      /><GaOcrReview
        v-if="stage === 'review'"
        v-model="reviewFields"
      /><GaButton v-if="stage === 'review'" disabled
        >逐项核对后带入 · 暂无识别结果</GaButton
      ></template
    ><text v-if="error" class="ga-muted" role="status">{{
      error
    }}</text></GaPage
  >
</template>
<style scoped>
.consent {
  margin: 0;
  padding: 10px 0;
  background: transparent;
  text-align: left;
  color: var(--primary);
  font-size: 14px;
}
.image-button {
  margin: 0;
  padding: 0;
  background: transparent;
  width: 100%;
}
.report-image {
  width: 100%;
}
</style>
