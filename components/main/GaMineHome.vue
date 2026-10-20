<script setup lang="ts">
/**
 * 我的页面：专业版/白话版的唯一切换入口；主题与单位等独立偏好在设置页面维护。
 * <script setup> 中的顶层变量、函数和导入可直接在模板里使用，不需要再写 data、methods 或 return。
 */
import { useProfileStore } from "../../store/profile";
import GaCard from "../../components/GaCard.vue";
import GaModeSwitch from "../../components/GaModeSwitch.vue";
import GaNotice from "../../components/GaNotice.vue";
import GaLinkRow from "../../components/GaLinkRow.vue";
import GaIcon from "../../components/GaIcon.vue";
import { useAccountStore } from "../../store/account";
import GaAccountSummary from "../../components/GaAccountSummary.vue";
withDefaults(defineProps<{ active?: boolean }>(), { active: true });
const account = useAccountStore();
const profile = useProfileStore();
const links = [
  ["通用偏好", "/pages/mine/preferences", "主题、长度单位与默认标准"],
  ["当前孕期档案", "/pages/profile/detail", "查看基准与原始输入"],
  ["同步与备份", "/pages/services/index?kind=sync", "本地可用，云服务未接通"],
  ["隐私与数据", "/pages/mine/data", "按范围导出与删除"],
  ["登录与个人信息说明", "/pages/mine/privacy", "微信身份、头像昵称与本机记录"],
  ["反馈", "/pages/mine/feedback", "本机草稿，尚未发送"],
  ["参考文献", "/pages/mine/references", "来源、版本与模型边界"],
  ["关于", "/pages/mine/about", "版本、用途及提供方状态"],
];
</script>
<template>
  <view class="ga-stack"
    ><GaAccountSummary v-if="account.authenticated && active" /><GaCard
      v-else
      variant="hero"
      ><view class="ga-stack"
        ><view class="ga-row"
          ><text class="mine-title">我的</text
          ><GaIcon name="hero-user" :size="32" /></view
        ><text>游客使用 · 本机已有 {{ profile.records.length }} 次生长记录</text
        ><text class="mine-caption"
          >工具和知识可直接使用，进入档案后可选择微信登录</text
        ></view
      ></GaCard
    ><GaNotice
      title="选择适合你的表达"
      text="专业版保留术语与详细数据；白话版增加解释。选择对所有页面生效，已填写数值和历史快照保持不变。" /><GaModeSwitch /><GaNotice
      title="显示偏好对全局生效"
      text="仅在这里设置说明方式。返回任意工具、档案和知识页面后均使用当前选择。" /><GaLinkRow
      v-for="link in links"
      :key="link[0]"
      :title="link[0]"
      :subtitle="link[2]"
      :url="link[1]"
  /></view>
</template>
<style scoped>
.mine-title {
  font-size: 25px;
  font-weight: 600;
}
.mine-caption {
  font-size: 12px;
}
</style>
