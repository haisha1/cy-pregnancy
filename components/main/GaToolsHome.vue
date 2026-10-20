<template>
  <view class="ga-stack">
    <GaHero
      v-if="profile.basis"
      :lmp-equivalent="profile.basis.lmpEquivalent"
    />
    <GaCard v-else variant="hero">
      <view class="welcome">
        <view class="welcome-heading">
          <text class="welcome-label">我的孕期</text>
          <GaIcon name="calendar" />
        </view>
        <text class="welcome-title">从了解孕周开始</text>
        <text class="welcome-description"
          >保存孕期基准，计算时自动带入孕周。</text
        >
        <GaButton variant="secondary" @click="openDating"
          >建立我的孕期档案</GaButton
        >
      </view>
    </GaCard>

    <GaSection title="常用工具" action="全部工具" @action="openAll" />
    <GaToolGrid />

    <GaCard>
      <view class="appointment">
        <view class="appointment-copy">
          <text class="appointment-title">产检安排</text>
          <text class="appointment-description"
            >请按产科医生确认的时间预约与复查。</text
          >
        </view>
        <view class="appointment-tag"><text>以医嘱为准</text></view>
      </view>
    </GaCard>
  </view>
</template>

<script setup lang="ts">
/**
 * 工具首页：把全局模式、当前档案和工具目录组合成界面；点击入口后交给 uni-app 路由跳转。
 * <script setup> 中的顶层变量、函数和导入可直接在模板里使用，不需要再写 data、methods 或 return。
 */
import GaHero from "@/components/GaHero.vue";
import GaCard from "@/components/GaCard.vue";
import GaButton from "@/components/GaButton.vue";
import GaIcon from "@/components/GaIcon.vue";
import GaSection from "@/components/GaSection.vue";
import GaToolGrid from "@/components/GaToolGrid.vue";
import { useProfileStore } from "@/store/profile";

const profile = useProfileStore();
const openDating = () => uni.navigateTo({ url: "/pages/pregnancy/edd" });
const openAll = () => uni.navigateTo({ url: "/pages/index/all" });
</script>

<style scoped>
.welcome {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.welcome-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.welcome-label {
  font-size: 13px;
  line-height: 18px;
}
.welcome-title {
  font-size: 27px;
  line-height: 38px;
  font-weight: 700;
}
.welcome-description {
  font-size: 13px;
  line-height: 20px;
  opacity: 0.92;
}
.appointment {
  display: flex;
  align-items: center;
  gap: 12px;
  justify-content: space-between;
}
.appointment-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.appointment-title {
  color: var(--text-primary);
  font-size: 17px;
  line-height: 24px;
  font-weight: 500;
}
.appointment-description {
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 18px;
}
.appointment-tag {
  flex-shrink: 0;
  color: var(--warning);
  background: var(--warning-tint);
  border-radius: 8px;
  padding: 4px 6px;
  font-size: 11px;
  line-height: 16px;
}
</style>
