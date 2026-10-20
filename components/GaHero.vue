<script setup lang="ts">
/**
 * 页面头部组件：复用标题与装饰结构，展示所需数据由父页面传入。
 * <script setup> 中的顶层变量、函数和导入可直接在模板里使用，不需要再写 data、methods 或 return。
 */
import { computed, ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { getPregnancySummary, todayISO } from "../engine/gestation";
import GaIcon from "./GaIcon.vue";
// defineProps 是 <script setup> 编译宏，声明父组件传入的参数；props 遵循单向数据流，子组件应通过事件请求更新。
const props = defineProps<{ lmpEquivalent: string }>();
// ref 创建响应式状态；脚本读写用 .value，模板中作为顶层绑定使用时会自动解包。修改它后，依赖它的界面会更新。
const today = ref(todayISO());
// uni-app 的 onShow 在页面每次显示时触发，包括从下一页返回；适合刷新当天日期或最新本地状态。
onShow(() => {
  today.value = todayISO();
});
// computed 表示从现有状态推导出的值，会跟踪依赖并缓存结果；依赖变化后才重新求值，不用手动同步另一份状态。
const summary = computed(() =>
  getPregnancySummary({ lmpEquivalent: props.lmpEquivalent }, today.value),
);
function edit() {
  uni.navigateTo({ url: "/pages/pregnancy/edd" });
}
</script>
<template>
  <view class="ga-hero">
    <view class="ga-hero__top"
      ><text>当前孕周</text
      ><button class="ga-hero__edit" aria-label="修改孕期基准" @click="edit">
        <GaIcon name="edit" :size="20" /></button
    ></view>
    <template v-if="summary.status === 'ready'">
      <text class="ga-hero__number"
        >{{ summary.value.weeks }}周+{{ summary.value.days }}天</text
      >
      <view class="ga-hero__track">
        <view
          class="ga-hero__progress"
          :style="{ width: summary.value.progressPercent + '%' }"
        />
      </view>
      <view class="ga-hero__bottom"
        ><text>{{
          summary.value.daysUntilEdd >= 0
            ? "距预产期 " + summary.value.daysUntilEdd + "天"
            : "已超过预产期 " + -summary.value.daysUntilEdd + " 天"
        }}</text
        ><text>{{ summary.value.progressPercent }}%</text>
      </view>
      <text
        v-if="summary.value.totalDays >= 294"
        class="ga-hero__warning"
        role="alert"
        >已达到或超过 42 周，请及时到产科评估。</text
      >
    </template>
    <text v-else>{{ summary.message }}</text>
  </view>
</template>
<style scoped>
.ga-hero {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 24px;
  border-radius: var(--radius-24);
  color: var(--text-inverse);
  background: linear-gradient(135deg, var(--hero-start), var(--hero-end));
}

.ga-hero__top,
.ga-hero__bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
}

.ga-hero__edit {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  min-height: 28px;
  padding: 0;
  margin: -4px -4px -4px 0;
  background: transparent;
}

.ga-hero__number {
  font-size: 34px;
  font-weight: 700;
  line-height: 40px;
  font-family: var(--font-numeric);
}

.ga-hero__track {
  height: 6px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.22);
  overflow: hidden;
}

.ga-hero__progress {
  height: 6px;
  border-radius: 8px;
  background: #fff;
}

.ga-hero__warning {
  font-size: 13px;
  line-height: 20px;
  padding-top: 4px;
}
</style>
