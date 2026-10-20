<script setup lang="ts">
/** 头像/昵称为独立选填资料。取消选择、审核失败、并发冲突均保留当前输入。 */
import { computed, onMounted, ref } from "vue";
import { useAccountStore } from "../../store/account";
import { nicknameError } from "../../utils/account";
import { confirmAction, notify } from "../../utils/feedback";
import GaPage from "../../components/GaPage.vue";
import GaCard from "../../components/GaCard.vue";
import GaButton from "../../components/GaButton.vue";
import GaNotice from "../../components/GaNotice.vue";
import GaLinkRow from "../../components/GaLinkRow.vue";
const auth = useAccountStore();
const nickname = ref(auth.account?.nickname || ""),
  image = ref(""),
  localError = ref("");
const clearing = ref(false);
const savedNickname = ref(nickname.value);
const dirty = computed(
  () => nickname.value !== savedNickname.value || !!image.value,
);
async function beforeLeave() {
  return (
    !dirty.value ||
    (await confirmAction(
      "放弃未保存的头像昵称？",
      "所选头像和填写的昵称尚未保存，返回后需要重新选择或填写。",
    ))
  );
}
async function reload() {
  if (!(await beforeLeave())) return;
  await auth.verify();
  if (auth.error) return;
  nickname.value = auth.account?.nickname || "";
  savedNickname.value = nickname.value;
  image.value = "";
  localError.value = "";
  try {
    await auth.loadAvatar();
  } catch {
    localError.value = "头像加载失败，可重新加载资料，昵称仍可编辑";
  }
}
onMounted(reload);
function chooseAvatar(event: { detail: { avatarUrl: string } }) {
  if (event.detail.avatarUrl) {
    image.value = event.detail.avatarUrl;
    localError.value = "";
  }
}
function reviewNickname(event: {
  detail: { pass: boolean; timeout?: boolean };
}) {
  if (event.detail.pass === false)
    localError.value = "昵称未通过微信检查，请修改后再保存";
}
async function save() {
  localError.value = nicknameError(nickname.value);
  if (localError.value) return;
  if (await auth.saveProfile(nickname.value, image.value)) {
    image.value = "";
    savedNickname.value = nickname.value;
    notify("资料已保存", "success");
    await reload();
  }
}
async function clear() {
  if (
    !(await confirmAction(
      "清除账号头像和昵称？",
      "将删除服务端保存的头像和昵称。登录账号与本机孕期记录保留，可稍后重新填写。",
    ))
  )
    return;
  clearing.value = true;
  try {
    await auth.clearProfile();
    nickname.value = "";
    savedNickname.value = "";
    image.value = "";
    localError.value = "";
    notify("头像和昵称已清除", "success");
  } catch (cause) {
    localError.value =
      cause instanceof Error ? cause.message : "清除失败，请重试";
  } finally {
    clearing.value = false;
  }
}
async function logout() {
  if (
    await confirmAction(
      "退出当前微信账号？",
      "返回游客模式，本机孕期记录保留。共享设备上的本机记录请在隐私与数据中单独清理。",
    )
  )
    await auth.logout();
}
</script>
<template>
  <GaPage title="头像与昵称" back requires-account :before-leave="beforeLeave">
    <GaNotice
      title="资料由你决定"
      text="头像和昵称都可跳过。保存时仅上传所选头像与填写的昵称，用于本人的账号展示；不会上传孕期记录或授权云同步。"
    />
    <GaCard
      ><view class="ga-stack">
        <image
          v-if="image || auth.avatarPath"
          :src="image || auth.avatarPath"
          class="avatar-preview"
          mode="aspectFill"
          aria-label="头像预览"
        />
        <!-- 微信原生chooseAvatar触发用户主动选择和平台隐私流程，不使用已回收的getUserProfile获取真实资料。 -->
        <!-- #ifdef MP-WEIXIN -->
        <GaButton
          variant="secondary"
          open-type="chooseAvatar"
          :disabled="auth.busy || clearing"
          @chooseavatar="chooseAvatar"
          >选择头像（选填）</GaButton
        >
        <!-- #endif -->
        <!-- #ifndef MP-WEIXIN -->
        <text class="ga-caption"
          >请在微信小程序中选择头像和使用微信昵称快捷填写。</text
        >
        <!-- #endif -->
        <view class="nickname-field">
          <label for="account-nickname">昵称（选填，最多32个字符）</label>
          <input
            id="account-nickname"
            v-model="nickname"
            type="nickname"
            :maxlength="32"
            placeholder="输入昵称或使用微信快捷填写"
            :disabled="auth.busy || clearing"
            aria-describedby="nickname-help"
            :aria-invalid="!!localError"
            @nicknamereview="reviewNickname"
          />
          <text id="nickname-help" class="ga-caption"
            >留空使用“微信用户”。请勿填写姓名、电话等非必要个人信息。</text
          >
        </view>
        <GaButton :loading="auth.busy" :disabled="clearing" @click="save"
          >保存资料</GaButton
        >
        <GaButton
          variant="text"
          :disabled="auth.busy || clearing"
          @click="reload"
          >重新加载资料</GaButton
        >
      </view></GaCard
    >
    <GaNotice
      v-if="localError || auth.error"
      title="操作未完成"
      :text="localError || auth.error"
    />
    <GaLinkRow title="个人信息与微信隐私指引" url="/pages/mine/privacy" />
    <GaButton
      variant="secondary"
      :loading="clearing"
      :disabled="auth.busy"
      @click="clear"
      >清除头像和昵称</GaButton
    >
    <GaButton
      variant="secondary"
      :disabled="auth.busy || clearing"
      @click="logout"
      >退出登录，返回游客</GaButton
    >
  </GaPage>
</template>
<style scoped>
.avatar-preview {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  align-self: center;
}
.nickname-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.nickname-field label {
  font-size: 13px;
  font-weight: 500;
}
.nickname-field input {
  min-height: 44px;
  padding: 0 12px;
  border: 1px solid var(--glass-stroke);
  border-radius: var(--radius-12);
  background: var(--glass-fillStrong);
  color: var(--text-primary);
  font-size: 14px;
}
</style>
