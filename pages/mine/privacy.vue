<script setup lang="ts">
import { ref } from "vue";
import GaPage from "../../components/GaPage.vue";
import GaCard from "../../components/GaCard.vue";
import GaButton from "../../components/GaButton.vue";
import GaLinkRow from "../../components/GaLinkRow.vue";
import GaNotice from "../../components/GaNotice.vue";
import { openWechatPrivacy } from "../../utils/wechatPrivacy";
const error = ref("");
</script>
<template>
  <GaPage title="登录与个人信息说明" back>
    <GaCard
      ><view class="ga-stack">
        <text>游客模式</text
        ><text
          >默认不登录，不请求头像、昵称、手机号、位置或通讯录。计算和知识浏览无需账号。</text
        >
        <text>微信账号</text
        ><text
          >进入档案后由你主动点击微信登录。一次性凭证交由微信验证；账号用于识别当前用户，登录凭据用于维持会话。</text
        >
        <text>头像和昵称</text
        ><text
          >登录后可自愿选择或填写，用于账号展示。保存时上传并进行内容检查，检查通过后在服务端保存；你可在资料页清除，也可始终使用默认头像和名称。</text
        >
        <text>本机健康记录</text
        ><text
          >孕期记录仍仅保存当前设备，未接通云同步。它们属于本机数据分区，不是微信云档案；退出或切换微信账号不会清除本机记录。共享设备时请及时导出或清理。</text
        >
        <text>授权和退出</text
        ><text
          >拒绝资料授权不影响工具或已登录账号。平台需要隐私授权时由微信提示；退出登录清除本机凭据并尝试撤销当前服务端会话。</text
        >
      </view></GaCard
    >
    <GaButton
      variant="secondary"
      @click="openWechatPrivacy((message) => (error = message))"
      >查看微信隐私保护指引</GaButton
    >
    <GaNotice v-if="error" title="查看提示" :text="error" />
    <GaLinkRow title="管理本机数据与导出" url="/pages/mine/data" />
  </GaPage>
</template>
