<template>
  <GaCard>
    <view class="ga-result-chart">
      <view class="ga-result-chart__heading">
        <text class="ga-result-chart__title"
          >{{ metricLabel }} {{ metric }}（cm）</text
        >
        <text class="ga-result-chart__count">{{ points.length }} 次测量</text>
      </view>
      <view v-if="points.length" class="ga-result-chart__plot">
        <canvas
          :id="canvasId"
          :canvas-id="canvasId"
          class="ga-result-chart__canvas"
          :style="{ height: `${height}px` }"
          :aria-label="`${metricLabel}历史生长曲线，${points.length}次真实测量，具体数值见下方历史记录`"
          role="img"
        />
      </view>
      <GaEmpty
        v-else
        title="还没有测量点"
        :description="`保存${metricLabel}测量后，在这里查看变化趋势。`"
      />
      <view class="ga-result-chart__legend">
        <view class="ga-result-chart__dot" />
        <text>已保存的真实测量</text>
      </view>
      <text class="ga-result-chart__notice"
        >参考曲线待核验 · 暂不绘制均值与 ±2SD</text
      >
      <text v-if="drawError" class="ga-result-chart__error" role="alert">{{
        drawError
      }}</text>
      <text v-if="points.length" class="ga-result-chart__caption"
        >横轴：孕周 · 纵轴：{{ metricLabel }}（cm）</text
      >
    </view>
  </GaCard>
</template>

<script setup lang="ts">
/**
 * 历史测量图：先按指标和胎儿筛选真实记录，再通过 uni-app canvas 绘制；尚未核验的参考曲线不在这里补造。
 * <script setup> 中的顶层变量、函数和导入可直接在模板里使用，不需要再写 data、methods 或 return。
 */
import {
  computed,
  getCurrentInstance,
  nextTick,
  onMounted,
  onUnmounted,
  ref,
  watch,
} from "vue";
import type { MeasurementSession } from "../types/records";
import { useAppStore } from "../store/app";
import { getChartColors } from "../styles/theme";
import GaCard from "./GaCard.vue";
import GaEmpty from "./GaEmpty.vue";

type ChartMetric = "HC" | "BPD" | "AC" | "FL";
// defineProps 是 <script setup> 编译宏，声明父组件传入的参数；props 遵循单向数据流，子组件应通过事件请求更新。
// withDefaults 为类型式 props 设置默认值；问号标记可选参数，未传入时使用这里的默认配置。
const props = withDefaults(
  defineProps<{
    metric: ChartMetric;
    records: MeasurementSession[];
    height?: number;
    fetus?: string;
  }>(),
  { height: 236, fetus: "singleton" },
);

const labels: Record<ChartMetric, string> = {
  HC: "头围",
  BPD: "双顶径",
  AC: "腹围",
  FL: "股骨长",
};
// computed 表示从现有状态推导出的值，会跟踪依赖并缓存结果；依赖变化后才重新求值，不用手动同步另一份状态。
const metricLabel = computed(() => labels[props.metric]);
const instance = getCurrentInstance();
const app = useAppStore();
const canvasId = `ga-growth-${instance?.uid ?? 0}`;
// ref 创建响应式状态；脚本读写用 .value，模板中作为顶层绑定使用时会自动解包。修改它后，依赖它的界面会更新。
const drawError = ref("");
const canvasWidth = ref(0);
const points = computed(() =>
  props.records
    .filter(
      (record) =>
        (record.fetus ?? "singleton") === props.fetus &&
        Number.isFinite(record.measurements[props.metric]) &&
        Number(record.measurements[props.metric]) > 0 &&
        Number.isInteger(record.gaDays) &&
        record.gaDays >= 0,
    )
    .map((record) => ({
      date: record.date,
      gaDays: record.gaDays,
      value: Number(record.measurements[props.metric]),
    }))
    .sort(
      (left, right) =>
        left.gaDays - right.gaDays || left.date.localeCompare(right.date),
    ),
);

async function drawChart() {
  if (!points.value.length || !instance?.proxy) return;
  await nextTick();
  return new Promise<void>((resolve, reject) => {
    uni
      .createSelectorQuery()
      .in(instance.proxy)
      .select(".ga-result-chart__canvas")
      .boundingClientRect((rect) => {
        if (!rect || Array.isArray(rect) || !rect.width) {
          reject(new Error("曲线显示区域尚未准备好"));
          return;
        }
        canvasWidth.value = rect.width;
        const ctx = uni.createCanvasContext(canvasId, instance.proxy);
        const colors = getChartColors(app.theme);
        const width = rect.width;
        const height = props.height;
        const plot = {
          left: 35,
          right: width - 14,
          top: 33,
          bottom: height - 65,
        };
        const weeks = points.value.map((point) => point.gaDays / 7);
        const minWeek = Math.min(10, Math.floor(Math.min(...weeks) / 2) * 2);
        const maxWeek = Math.max(42, Math.ceil(Math.max(...weeks) / 2) * 2);
        const maxValue = Math.max(...points.value.map((point) => point.value));
        const topValue = Math.max(1, Math.ceil(maxValue * 1.18));
        const x = (gaDays: number) =>
          plot.left +
          ((gaDays / 7 - minWeek) / (maxWeek - minWeek)) *
            (plot.right - plot.left);
        const y = (value: number) =>
          plot.bottom - (value / topValue) * (plot.bottom - plot.top);
        ctx.clearRect(0, 0, width, height);
        ctx.setFillStyle(colors.background);
        ctx.fillRect(0, 0, width, height);
        ctx.setFontSize(12);
        ctx.setTextAlign("left");
        ctx.setFillStyle(colors.textSecondary);
        ctx.fillText(
          `${metricLabel.value} ${props.metric} / cm`,
          plot.left,
          17,
        );
        for (let index = 0; index <= 4; index += 1) {
          const tick = (topValue / 4) * index;
          const py = y(tick);
          ctx.beginPath();
          ctx.setStrokeStyle(colors.grid);
          ctx.setLineWidth(1);
          ctx.moveTo(plot.left, py);
          ctx.lineTo(plot.right, py);
          ctx.stroke();
          ctx.setFillStyle(colors.textTertiary);
          ctx.setFontSize(10);
          ctx.setTextAlign("right");
          ctx.fillText(
            tick.toFixed(topValue < 8 ? 1 : 0),
            plot.left - 7,
            py + 3,
          );
        }
        for (let index = 0; index <= 4; index += 1) {
          const week = minWeek + ((maxWeek - minWeek) / 4) * index;
          ctx.setTextAlign("center");
          ctx.fillText(`${Math.round(week)}周`, x(week * 7), plot.bottom + 18);
        }
        ctx.setStrokeStyle(colors.primary);
        ctx.setLineWidth(2);
        ctx.beginPath();
        points.value.forEach((point, index) => {
          if (index === 0) ctx.moveTo(x(point.gaDays), y(point.value));
          else ctx.lineTo(x(point.gaDays), y(point.value));
        });
        ctx.stroke();
        points.value.forEach((point) => {
          ctx.beginPath();
          ctx.arc(x(point.gaDays), y(point.value), 4, 0, Math.PI * 2);
          ctx.setFillStyle(colors.pointFill);
          ctx.fill();
          ctx.setLineWidth(2);
          ctx.setStrokeStyle(colors.background);
          ctx.stroke();
        });
        ctx.setFontSize(10);
        ctx.setTextAlign("left");
        ctx.setFillStyle(colors.textTertiary);
        ctx.fillText("仅展示历史测量 · 参考曲线待核验", plot.left, height - 24);
        ctx.fillText(
          "结果仅供参考，不能替代执业医师诊断。",
          plot.left,
          height - 9,
        );
        ctx.draw(false, () => {
          drawError.value = "";
          resolve();
        });
      })
      .exec();
  });
}

async function exportImage(): Promise<string> {
  if (!points.value.length) throw new Error("请先保存至少一次测量");
  await drawChart();
  if (!canvasWidth.value) throw new Error("曲线尚未绘制完成，请稍后重试");
  return new Promise((resolve, reject) => {
    uni.canvasToTempFilePath(
      {
        canvasId,
        width: canvasWidth.value,
        height: props.height,
        destWidth: Math.round(canvasWidth.value * 3),
        destHeight: props.height * 3,
        fileType: "png",
        success: (result) => resolve(result.tempFilePath),
        fail: () => reject(new Error("曲线图片生成失败，请重试")),
      },
      instance?.proxy,
    );
  });
}

function redraw() {
  drawChart().catch(() => {
    drawError.value = "曲线绘制失败，可在下方查看完整测量记录。";
  });
}
// watch 用于依赖变化后的副作用，例如清除提示或重新绘图；只计算显示值时优先用 computed。
watch([points, () => app.theme], redraw, { deep: true });
// Vue 挂载钩子：组件渲染后执行，适合访问画布或 H5 DOM；它不等同于页面每次重新显示。
onMounted(() => {
  redraw();
  uni.onWindowResize(redraw);
});
// Vue 卸载钩子：释放该组件创建的监听器或观察器，避免页面销毁后仍收到回调。
onUnmounted(() => uni.offWindowResize(redraw));
// script setup 默认不向父组件公开内部方法；defineExpose 显式允许父组件通过组件 ref 调用这里的方法。
defineExpose({ exportImage });
</script>

<style scoped>
.ga-result-chart {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}
.ga-result-chart__heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}
.ga-result-chart__title {
  color: var(--text-primary);
  font-size: 15px;
  font-weight: 500;
  line-height: 22px;
}
.ga-result-chart__count {
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 18px;
  flex-shrink: 0;
}
.ga-result-chart__plot {
  width: 100%;
}
.ga-result-chart__canvas {
  display: block;
  width: 100%;
}
.ga-result-chart__legend {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 18px;
}
.ga-result-chart__dot {
  width: 7px;
  height: 7px;
  background: var(--primary);
  border-radius: 50%;
}
.ga-result-chart__notice,
.ga-result-chart__caption {
  color: var(--text-tertiary);
  font-size: 12px;
  line-height: 18px;
}
.ga-result-chart__error {
  color: var(--danger);
  font-size: 12px;
  line-height: 18px;
}
</style>
