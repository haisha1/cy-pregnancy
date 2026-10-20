<script setup lang="ts">
import { onMounted, watch } from "vue";
import { useAccountStore } from "../store/account";
import GaCard from "./GaCard.vue";
import GaIcon from "./GaIcon.vue";
import GaButton from "./GaButton.vue";
const auth = useAccountStore();
const platform = uni;
async function avatar() {
  try {
    await auth.loadAvatar();
  } catch {
    /* 缩略图失败不阻挡档案，资料页提供重新加载。 */
  }
}
onMounted(avatar);
watch(() => auth.account?.profileRevision, avatar);
</script>
<template>
  <GaCard>
    <view class="account-summary">
      <image
        v-if="auth.avatarPath"
        :src="auth.avatarPath"
        class="account-avatar"
        mode="aspectFill"
        aria-label="我的头像"
      />
      <view v-else class="account-avatar account-placeholder"
        ><GaIcon name="user"
      /></view>
      <view class="account-copy"
        ><text class="account-name">{{
          auth.account?.nickname || "微信用户"
        }}</text
        ><text class="ga-caption">已登录 · 健康记录仅存本机</text></view
      >
    </view>
    <GaButton
      variant="text"
      @click="platform.navigateTo({ url: '/pages/mine/account' })"
      >{{
        auth.account?.nickname ? "编辑头像与昵称" : "完善头像与昵称（选填）"
      }}</GaButton
    >
  </GaCard>
</template>
<style scoped>
.account-summary {
  display: flex;
  align-items: center;
  gap: 12px;
}
.account-avatar {
  width: 52px;
  height: 52px;
  flex: 0 0 52px;
  border-radius: 50%;
}
.account-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--glass-fillStrong);
}
.account-copy {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.account-name {
  font-weight: 600;
  overflow-wrap: anywhere;
}
</style>
