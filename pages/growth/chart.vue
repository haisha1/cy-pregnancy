<template>
  <GaPage title="生长曲线" back disclaimer>
    <view class="chart-page">
      <GaTabs v-model="selectedMetric" :items="metricOptions" />
      <GaTabs
        v-model="fetus"
        :items="
          profile.profiles.find((p) => p.id === profile.activeProfileId)
            ?.fetusCount === 2
            ? [
                { label: '胎儿 A', value: 'A' },
                { label: '胎儿 B', value: 'B' },
              ]
            : [{ label: '单胎', value: 'singleton' }]
        "
      />
      <GaResultChart
        ref="chartRef"
        :metric="selectedMetric"
        :records="profile.records"
        :height="275"
        :fetus="fetus"
      />
      <view class="chart-section"
        ><GaSection title="历史测量" /><text
          >孕周 / {{ metricLabel }}</text
        ></view
      >
      <GaEmpty
        v-if="!metricRecords.length"
        title="还没有这项测量"
        :description="`前往胎儿生长页，录入并保存${metricLabel}后即可查看。`"
      />
      <button
        v-for="record in visibleRecords"
        :key="record.id"
        class="chart-session"
        role="button"
        tabindex="0"
        :aria-label="`查看${record.date}测量，孕${formatGestation(record.gaDays)}，${metricLabel}${record.measurements[selectedMetric]}厘米`"
        @click="openSession(record.id)"
      >
        <view class="chart-session__top">
          <text class="chart-session__date">{{ record.date }}</text>
          <text class="chart-session__value"
            >{{ record.measurements[selectedMetric] }}
            <text class="chart-session__unit">cm</text></text
          >
        </view>
        <view class="chart-session__bottom">
          <text>孕 {{ formatGestation(record.gaDays) }}</text>
          <text class="chart-session__link">查看本次测量 ›</text>
        </view>
      </button>
      <GaButton
        v-if="visibleCount < metricRecords.length"
        variant="secondary"
        @click="visibleCount += 10"
        >加载更多测量</GaButton
      >
      <GaCard v-if="metricRecords.length">
        <view class="chart-note">
          <view class="chart-note__icon"><GaIcon name="info" /></view>
          <text
            >图中连线只表示已保存测量的变化。参考曲线待核验，不能据此判断宝宝是否正常。</text
          >
        </view>
      </GaCard>
      <view v-if="shareImage" class="chart-share">
        <text class="chart-share__title">曲线图片已生成</text>
        <button
          class="chart-share__preview"
          role="button"
          tabindex="0"
          :aria-label="`预览${metricLabel}历史曲线图片`"
          @click="previewShareImage"
        >
          <image
            class="chart-share__image"
            :src="shareImage"
            mode="widthFix"
            :alt="`${metricLabel}历史曲线图片`"
          />
        </button>
        <text class="chart-share__hint"
          >点击预览，可使用设备提供的保存或分享功能。完整测量值请同时提供 B
          超报告。</text
        >
      </view>
      <text v-if="shareError" class="chart-error" role="alert">{{
        shareError
      }}</text>
      <GaReference :ids="['INTERGROWTH_STANDARDS']" />
    </view>
    <template #actions>
      <view class="chart-actions">
        <view class="chart-actions__share">
          <GaButton
            :disabled="!metricRecords.length"
            :loading="sharing"
            @click="createShareImage"
            >生成曲线图片</GaButton
          >
        </view>
        <view class="chart-actions__add">
          <GaButton variant="secondary" @click="addMeasurement"
            >录入测量</GaButton
          >
        </view>
      </view>
    </template>
  </GaPage>
</template>

<script setup lang="ts">
/**
 * 历史曲线页面：页面管理指标和胎儿筛选，GaResultChart 负责绘图，不能把胎儿 A、B 的测量混成一条曲线。
 * <script setup> 中的顶层变量、函数和导入可直接在模板里使用，不需要再写 data、methods 或 return。
 */
import { computed, ref, watch } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { formatGestation } from "../../engine/gestation";
import { useProfileStore } from "../../store/profile";
import { notify } from "../../utils/feedback";
import GaPage from "../../components/GaPage.vue";
import GaTabs from "../../components/GaTabs.vue";
import GaButton from "../../components/GaButton.vue";
import GaCard from "../../components/GaCard.vue";
import GaSection from "../../components/GaSection.vue";
import GaEmpty from "../../components/GaEmpty.vue";
import GaIcon from "../../components/GaIcon.vue";
import GaReference from "../../components/GaReference.vue";
import GaResultChart from "../../components/GaResultChart.vue";

type ChartMetric = "HC" | "BPD" | "AC" | "FL";
const profile = useProfileStore();
profile.hydrate();
// ref 创建响应式状态；脚本读写用 .value，模板中作为顶层绑定使用时会自动解包。修改它后，依赖它的界面会更新。
const selectedMetric = ref<ChartMetric>("HC");
const fetus = ref(
  profile.profiles.find((p) => p.id === profile.activeProfileId)?.fetusCount ===
    2
    ? "A"
    : "singleton",
);
const metricOptions = [
  { label: "HC", value: "HC" },
  { label: "BPD", value: "BPD" },
  { label: "AC", value: "AC" },
  { label: "FL", value: "FL" },
];
const metricLabels: Record<ChartMetric, string> = {
  HC: "头围",
  BPD: "双顶径",
  AC: "腹围",
  FL: "股骨长",
};
// computed 表示从现有状态推导出的值，会跟踪依赖并缓存结果；依赖变化后才重新求值，不用手动同步另一份状态。
const metricLabel = computed(() => metricLabels[selectedMetric.value]);
const metricRecords = computed(() =>
  profile.records
    .filter(
      (record) =>
        (record.fetus ?? "singleton") === fetus.value &&
        Number.isFinite(record.measurements[selectedMetric.value]) &&
        Number(record.measurements[selectedMetric.value]) > 0,
    )
    .slice()
    .sort((left, right) => right.date.localeCompare(left.date)),
);
const visibleCount = ref(10);
const visibleRecords = computed(() =>
  metricRecords.value.slice(0, visibleCount.value),
);
const chartRef = ref<InstanceType<typeof GaResultChart> | null>(null);
const sharing = ref(false);
const shareImage = ref("");
const shareError = ref("");

function openSession(id: string) {
  uni.navigateTo({
    url: `/pages/growth/biometry?sessionId=${encodeURIComponent(id)}`,
  });
}
function addMeasurement() {
  uni.navigateTo({ url: "/pages/growth/biometry" });
}
function previewShareImage() {
  if (!shareImage.value) return;
  uni.previewImage({ urls: [shareImage.value], current: shareImage.value });
}
async function createShareImage() {
  if (sharing.value || !metricRecords.value.length) return;
  sharing.value = true;
  shareError.value = "";
  try {
    if (!chartRef.value) throw new Error("曲线尚未准备好，请稍后重试");
    shareImage.value = await chartRef.value.exportImage();
    notify("曲线图片已生成", "success");
    previewShareImage();
  } catch (error) {
    shareError.value =
      error instanceof Error ? error.message : "图片生成失败，请稍后重试";
    notify(shareError.value, "error");
  } finally {
    sharing.value = false;
  }
}
// watch 用于依赖变化后的副作用，例如清除提示或重新绘图；只计算显示值时优先用 computed。
watch(selectedMetric, () => {
  visibleCount.value = 10;
  shareImage.value = "";
  shareError.value = "";
});
// uni-app 页面生命周期：onLoad 接收打开页面时的路由参数；它与普通 Vue 子组件的 onMounted 用途不同。
onLoad((query) => {
  if (query?.fetus && ["singleton", "A", "B"].includes(String(query.fetus)))
    fetus.value = String(query.fetus);
  if (
    query?.metric &&
    metricOptions.some((item) => item.value === query.metric)
  )
    selectedMetric.value = query.metric as ChartMetric;
});
</script>

<style scoped>
.chart-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.chart-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}
.chart-section > text {
  color: var(--text-tertiary);
  font-size: 12px;
  line-height: 18px;
}
.chart-session {
  display: flex;
  flex-direction: column;
  width: 100%;
  margin: 0;
  padding: 16px;
  gap: 8px;
  box-sizing: border-box;
  border: 1px solid var(--glass-stroke);
  border-radius: 24px;
  background: var(--glass-fill);
  color: var(--text-primary);
  text-align: left;
  line-height: 22px;
  cursor: pointer;
  backdrop-filter: blur(12px);
}
.chart-session::after {
  border: 0;
}
.chart-session:hover {
  background: var(--glass-fillStrong);
}
.chart-session:active {
  opacity: 0.75;
}
.chart-session:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}
.chart-session__top,
.chart-session__bottom {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
  width: 100%;
}
.chart-session__date {
  font-size: 15px;
  font-weight: 500;
}
.chart-session__value {
  font-size: 19px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.chart-session__unit {
  font-size: 12px;
  font-weight: 400;
  color: var(--text-secondary);
}
.chart-session__bottom {
  font-size: 12px;
  line-height: 18px;
  color: var(--text-secondary);
}
.chart-session__link {
  color: var(--primary);
}
.chart-note {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 20px;
}
.chart-note__icon {
  flex-shrink: 0;
  margin-top: 2px;
}
.chart-actions {
  display: flex;
  gap: 12px;
  width: 100%;
}
.chart-actions__share {
  flex: 1.35;
}
.chart-actions__add {
  flex: 1;
}
.chart-share {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.chart-share__title {
  color: var(--text-primary);
  font-size: 15px;
  line-height: 22px;
}
.chart-share__preview {
  width: 100%;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  line-height: 0;
  cursor: pointer;
}
.chart-share__preview::after {
  border: 0;
}
.chart-share__preview:hover {
  opacity: 0.85;
}
.chart-share__preview:active {
  opacity: 0.7;
}
.chart-share__preview:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 3px;
}
.chart-share__image {
  width: 100%;
  border: 1px solid var(--glass-stroke);
  border-radius: 16px;
}
.chart-share__hint {
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 20px;
}
.chart-error {
  color: var(--danger);
  font-size: 12px;
  line-height: 18px;
}
</style>
