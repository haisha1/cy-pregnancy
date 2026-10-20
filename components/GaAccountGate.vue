<script setup lang="ts">
/** 档案入口的唯一登录提示，不使用全局路由拦截，游客可随时返回工具。 */
import { useAccountStore } from "../store/account";
import GaCard from "./GaCard.vue";
import GaButton from "./GaButton.vue";
import GaNotice from "./GaNotice.vue";
import GaLinkRow from "./GaLinkRow.vue";
const account = useAccountStore();
import { openMainPage } from "../utils/navigation";
</script>
<template>
  <view class="ga-stack ga-account-gate">
    <GaCard>
      <view class="ga-stack">
        <text class="gate-title">登录后查看孕期档案</text>
        <text
          >使用微信身份登录，方便识别当前账号。头像和昵称可在登录后选填。</text
        >
        <text class="ga-caption"
          >工具和知识无需登录。本机记录仍保存在当前设备，登录不会自动上传或开启云同步。</text
        >
        <GaButton :loading="account.busy" @click="account.login()"
          >微信登录</GaButton
        >
        <GaButton
          variant="secondary"
          :disabled="account.busy"
          @click="openMainPage('/pages/index/index')"
          >继续游客使用</GaButton
        >
      </view>
    </GaCard>
    <GaNotice v-if="account.error" title="登录未完成" :text="account.error" />
    <GaLinkRow
      title="登录与个人信息说明"
      subtitle="了解微信身份、资料和本机记录的用途"
      url="/pages/mine/privacy"
    />
  </view>
</template>
<style scoped>
.gate-title {
  font-size: 21px;
  font-weight: 600;
}
</style>
