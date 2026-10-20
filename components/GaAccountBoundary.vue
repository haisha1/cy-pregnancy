<script setup lang="ts">
/** 共享档案访问边界：隐藏的面板不验账号，切换本身不等待网络；失效后立即隐藏档案。 */
import { ref, watch } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { useAccountStore } from "../store/account";
import GaAccountGate from "./GaAccountGate.vue";
import GaButton from "./GaButton.vue";
const props = withDefaults(defineProps<{ active?: boolean }>(), {
  active: true,
});
const emit = defineEmits<{ verified: [value: boolean] }>();
const account = useAccountStore();
const verified = ref(false);
watch(
  () => account.authenticated && verified.value,
  (value) => emit("verified", value),
  { immediate: true },
);
async function verify() {
  if (!props.active || !account.authenticated) return;
  await account.verify();
  verified.value = account.authenticated && !account.error;
}
watch(
  () => [props.active, account.authenticated] as const,
  ([active, signedIn]) => {
    if (!signedIn) verified.value = false;
    if (active && signedIn) void verify();
  },
  { immediate: true },
);
onShow(verify);
</script>
<template>
  <view class="ga-stack">
    <GaAccountGate v-if="active && !account.authenticated" />
    <view v-else-if="active && !verified" class="ga-stack" role="status">
      <text>{{
        account.checking
          ? "正在确认登录状态…"
          : account.error || "正在打开档案…"
      }}</text>
      <GaButton v-if="!account.checking" variant="secondary" @click="verify"
        >重新加载档案</GaButton
      >
    </view>
    <slot v-else-if="account.authenticated && verified" />
  </view>
</template>
