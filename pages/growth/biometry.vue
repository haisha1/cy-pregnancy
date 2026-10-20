<template>
  <GaPage title="胎儿生长与体重" back disclaimer>
    <view class="growth-page">
      <GaCard>
        <view class="measurement-context">
          <view class="measurement-context__heading">
            <text class="measurement-context__gestation">{{
              gaDays !== null ? `孕 ${formatGestation(gaDays)}` : "填写本次测量"
            }}</text>
            <text class="measurement-context__unit">cm / mm</text>
          </view>
          <text class="growth-caption">{{
            sessionId
              ? "已保存的测量记录，可核对后更新"
              : "按 B 超报告填写，数值会自动计算"
          }}</text>
          <GaDateField v-model="measurementDate" label="测量日期" />
          <text v-if="dateError" class="growth-error" role="alert">{{
            dateError
          }}</text>
          <view
            v-if="manualGestation || !profile.basis"
            class="gestation-fields"
          >
            <view class="gestation-field">
              <GaField
                v-model="weeks"
                label="测量时孕周"
                placeholder="周数"
                type="number"
                unit="周"
                :error="gestationError"
              />
            </view>
            <view class="gestation-field">
              <GaField
                v-model="days"
                label="余天"
                placeholder="0–6"
                type="number"
                unit="天"
              />
            </view>
          </view>
          <view v-else class="measurement-context__basis">
            <GaIcon name="calendar" />
            <text>按已保存的孕期基准带入测量日孕周</text>
          </view>
          <text
            v-if="
              !manualGestation && profile.basis && gaDays === null && !dateError
            "
            class="growth-error"
            role="alert"
            >测量日不在当前基准的 0–42 周 +6
            天内，请核对日期或手动输入孕周。</text
          >
          <text v-if="gestationNotice" class="growth-warning" role="status">{{
            gestationNotice
          }}</text>
          <GaButton
            v-if="profile.basis"
            variant="text"
            @click="toggleGestation"
            >{{ manualGestation ? "使用档案孕周" : "手动输入孕周" }}</GaButton
          >
          <GaTabs v-model="selectedStandard" :items="standardOptions" />
          <GaTabs v-model="fetus" :items="fetusOptions" />
          <GaField
            v-model="reportedEfw"
            label="报告单记录体重（可选，不参与公式）"
            unit="g"
            :error="reportedEfwError"
          />
        </view>
      </GaCard>

      <GaResultChart
        metric="HC"
        :records="profile.records"
        :height="205"
        :fetus="fetus"
      />
      <GaButton variant="text" @click="openChart('HC')"
        >查看完整生长曲线 <GaIcon name="chart"
      /></GaButton>

      <view class="growth-section"
        ><GaSection title="本次测量" /><text>逐项切换 cm / mm</text></view
      >
      <GaMeasureRow
        v-for="item in metricItems"
        :key="item.metric"
        v-model="inputs[item.metric]"
        :metric="item.metric"
        :label="item.label"
        :unit="units[item.metric]"
        :error="measurementErrors[item.metric]"
        :note="measurementNote(item.metric)"
        :chart="item.metric !== 'CRL'"
        @change-unit="switchUnit(item.metric)"
        @chart="openChart(item.metric)"
      />
      <GaMeasureRow
        :model-value="efwGrams !== null ? efwGrams.toFixed(0) : ''"
        metric="EFW"
        label="估测体重"
        unit="g"
        readonly
        :chart="false"
        :note="
          efwGrams !== null
            ? 'Hadlock 四参数估计；模型存在测量与估计误差'
            : '填写 BPD、HC、AC、FL 四项后自动估算体重'
        "
      />

      <GaSection :title="app.mode === 'plain' ? '白话解读' : '结果说明'" />
      <GaCard>
        <view class="growth-explanation">
          <template v-if="app.mode === 'plain'">
            <view
              v-for="item in plainExplanation"
              :key="item.title"
              class="growth-explanation__item"
            >
              <text class="growth-explanation__label">{{ item.title }}</text>
              <text class="growth-explanation__text">{{ item.text }}</text>
            </view>
          </template>
          <template v-else>
            <view class="growth-explanation__item">
              <text class="growth-explanation__label">{{
                efwGrams !== null
                  ? `EFW ${efwGrams.toFixed(0)} g`
                  : "等待完整的四项测量"
              }}</text>
              <text class="growth-explanation__text">{{
                efwGrams !== null
                  ? "采用 Hadlock 1985 年 BPD、HC、AC、FL 四参数公式。计算统一使用 cm，输出单位为 g。"
                  : "可先保存单项测量；估测体重需要 BPD、HC、AC、FL 全部填写。"
              }}</text>
            </view>
            <view class="growth-explanation__item">
              <text class="growth-explanation__label">参考曲线待核验</text>
              <text class="growth-explanation__text"
                >{{
                  selectedStandard === "INTERGROWTH"
                    ? "INTERGROWTH-21st"
                    : "CUHK"
                }}
                参考参数尚未完成论文核验，暂不显示
                Z-score、百分位或正常/异常判断。</text
              >
            </view>
          </template>
        </view>
      </GaCard>

      <GaCard v-if="!profile.basis">
        <view class="growth-profile-hint">
          <text class="growth-explanation__label"
            >先建立孕期档案，再保存测量</text
          >
          <text class="growth-caption"
            >可以继续使用本页计算；建立孕期基准后，记录会保存在本机。</text
          >
          <GaButton variant="secondary" @click="openBasis"
            >建立孕期档案</GaButton
          >
        </view>
      </GaCard>
      <text v-if="saveError" class="growth-error" role="alert">{{
        saveError
      }}</text>
      <text v-if="savedMessage" class="growth-saved" role="status">{{
        savedMessage
      }}</text>
      <GaReference :ids="['HADLOCK_EFW_1985', 'INTERGROWTH_STANDARDS']" />
    </view>
    <template #actions>
      <view class="growth-actions">
        <view class="growth-actions__save">
          <GaButton
            :disabled="!canSave"
            :loading="saving"
            @click="saveMeasurement"
            >保存本次测量</GaButton
          >
        </view>
        <view class="growth-actions__history">
          <GaButton variant="secondary" @click="openChart('HC')"
            >历史曲线</GaButton
          >
        </view>
      </view>
    </template>
  </GaPage>
</template>

<script setup lang="ts">
/**
 * 生长测量页面：输入保留报告单位，计算时统一换算；报告体重和公式估重分开处理，保存操作由 store 执行。
 * <script setup> 中的顶层变量、函数和导入可直接在模板里使用，不需要再写 data、methods 或 return。
 */
import { computed, reactive, ref, watch } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import type {
  GrowthMetric,
  MeasurementSession,
  ReferenceStandard,
} from "../../types/records";
import type { LengthUnit } from "../../types/medical";
import { useAppStore } from "../../store/app";
import { useProfileStore } from "../../store/profile";
import { calculateHadlockEfw } from "../../engine/efw";
import { assessGrowth } from "../../engine/growth";
import {
  diffDays,
  formatGestation,
  gestationToDays,
  gestationWarning,
  splitGestation,
  todayISO,
  validateMeasurementDate,
} from "../../engine/gestation";
import {
  convertLength,
  validateGrowthMeasurement,
} from "../../engine/validation";
import { REFERENCE_VERSION } from "../../data/references";
import { confirmAction, notify } from "../../utils/feedback";
import GaPage from "../../components/GaPage.vue";
import GaCard from "../../components/GaCard.vue";
import GaButton from "../../components/GaButton.vue";
import GaDateField from "../../components/GaDateField.vue";
import GaField from "../../components/GaField.vue";
import GaTabs from "../../components/GaTabs.vue";
import GaSection from "../../components/GaSection.vue";
import GaIcon from "../../components/GaIcon.vue";
import GaMeasureRow from "../../components/GaMeasureRow.vue";
import GaResultChart from "../../components/GaResultChart.vue";
import GaReference from "../../components/GaReference.vue";

const app = useAppStore();
const profile = useProfileStore();
app.hydrate();
profile.hydrate();
const metricItems: { metric: GrowthMetric; label: string }[] = [
  { metric: "CRL", label: "头臀径" },
  { metric: "BPD", label: "双顶径" },
  { metric: "HC", label: "头围" },
  { metric: "AC", label: "腹围" },
  { metric: "FL", label: "股骨长" },
];
const standardOptions = [
  { label: "INTERGROWTH-21st", value: "INTERGROWTH" },
  { label: "CUHK · 待开放", value: "CUHK", disabled: true },
];
// ref 创建响应式状态；脚本读写用 .value，模板中作为顶层绑定使用时会自动解包。修改它后，依赖它的界面会更新。
const selectedStandard = ref<ReferenceStandard>(app.standard);
// 初始值来自偏好，但这是页面自己的 ref；查看旧记录时修改它，不会反过来覆盖用户的全局默认标准。
const fetus = ref<"singleton" | "A" | "B">("singleton");
// computed 表示从现有状态推导出的值，会跟踪依赖并缓存结果；依赖变化后才重新求值，不用手动同步另一份状态。
const fetusOptions = computed(() =>
  profile.profiles.find((p) => p.id === profile.activeProfileId)?.fetusCount ===
  2
    ? [
        { label: "胎儿 A", value: "A" },
        { label: "胎儿 B", value: "B" },
      ]
    : [{ label: "单胎", value: "singleton" }],
);
const reportedEfw = ref("");
const reportedEfwError = computed(() =>
  reportedEfw.value.trim() &&
  (!Number.isFinite(Number(reportedEfw.value)) ||
    Number(reportedEfw.value) <= 0)
    ? "请核对报告体重（大于0的有限数值）"
    : "",
);
// reactive 把对象变为响应式代理，可直接读写属性而不用 .value；这里保留整个对象引用，逐个更新表单字段。
const inputs = reactive<Record<GrowthMetric, string>>({
  CRL: "",
  BPD: "",
  HC: "",
  AC: "",
  FL: "",
});
const units = reactive<Record<GrowthMetric, LengthUnit>>({
  CRL: "mm",
  BPD: "cm",
  HC: "cm",
  AC: "cm",
  FL: "cm",
});
const measurementDate = ref(todayISO());
const weeks = ref("");
const days = ref("");
const manualGestation = ref(false);
const sessionId = ref("");
const saving = ref(false);
const saveError = ref("");
const savedMessage = ref("");
const dateError = computed(
  () => validateMeasurementDate(measurementDate.value, todayISO()) || "",
);
const manualGa = computed(() =>
  weeks.value.trim() === ""
    ? null
    : gestationToDays(Number(weeks.value), Number(days.value || "0")),
);
const gaDays = computed<number | null>(() => {
  if (dateError.value) return null;
  if (!manualGestation.value && profile.basis) {
    const totalDays = diffDays(
      measurementDate.value,
      profile.basis.lmpEquivalent,
    );
    if (totalDays < 0 || totalDays > 300) return null;
    return totalDays;
  }
  return manualGa.value?.status === "ready"
    ? manualGa.value.value.totalDays
    : null;
});
const gestationError = computed(() =>
  manualGa.value && manualGa.value.status !== "ready"
    ? manualGa.value.message
    : "",
);
const gestationNotice = computed(() =>
  gaDays.value === null ? "" : gestationWarning(gaDays.value) || "",
);
const measurementErrors = computed(() => {
  const errors: Partial<Record<GrowthMetric, string>> = {};
  for (const { metric } of metricItems) {
    if (!inputs[metric].trim()) continue;
    const cm = convertLength(Number(inputs[metric]), units[metric], "cm");
    const error = validateGrowthMeasurement(metric, cm);
    if (error) errors[metric] = error;
  }
  return errors;
});
const measurementValues = computed<MeasurementSession["measurements"]>(() => {
  // MeasurementSession["measurements"] 是索引访问类型，直接复用记录定义中的字段类型。
  // 表单保存输入文字和各自单位；这份派生数据才统一换算成 cm，供计算和记录使用。
  const values: MeasurementSession["measurements"] = {};
  for (const { metric } of metricItems) {
    if (inputs[metric].trim() && !measurementErrors.value[metric])
      values[metric] = convertLength(
        Number(inputs[metric]),
        units[metric],
        "cm",
      );
  }
  return values;
});
const efwResult = computed(() => {
  const { BPD, HC, AC, FL } = measurementValues.value;
  return BPD !== undefined &&
    HC !== undefined &&
    AC !== undefined &&
    FL !== undefined
    ? calculateHadlockEfw({ BPD, HC, AC, FL })
    : null;
});
const efwGrams = computed(() =>
  efwResult.value?.status === "ready" ? efwResult.value.value.grams : null,
);
const canSave = computed(
  () =>
    Boolean(profile.basis) &&
    gaDays.value !== null &&
    !dateError.value &&
    !reportedEfwError.value &&
    !Object.keys(measurementErrors.value).length &&
    Object.keys(measurementValues.value).length > 0 &&
    !saving.value,
);
const plainExplanation = computed(() => [
  {
    title: "这是什么",
    text: "头围、腹围、股骨长等，是 B 超记录宝宝大小的几种测量。四项完整时，可以估算宝宝的体重。",
  },
  {
    title: "你的结果",
    text:
      efwGrams.value !== null
        ? `按本次输入，估测体重约 ${efwGrams.value.toFixed(0)} 克。这是估计值，不是实际出生体重。`
        : "照着报告填入测量值；填写完整四项后，估测体重会自动出现。",
  },
  {
    title: "要不要紧",
    text: "参考曲线还在核验中，这里暂时不能判断宝宝偏大、偏小或是否正常。一次测量也不能代替连续观察。",
  },
  {
    title: "该怎么办",
    text: "保存历次测量，产检时带上完整报告，让医生结合准确孕周和生长趋势解读。不要根据单次数值自行进补。",
  },
]);

function measurementNote(metric: GrowthMetric) {
  const value = measurementValues.value[metric];
  if (value === undefined || gaDays.value === null)
    return "录入后可保存；参考百分位待论文核验";
  const assessment = assessGrowth(metric, gaDays.value, value, app.standard);
  return assessment.status === "unavailable"
    ? "参考值待核验，暂不提供百分位与正常范围"
    : assessment.status === "invalid"
      ? assessment.message
      : "已完成参考值评估";
}
function switchUnit(metric: GrowthMetric) {
  const previous = units[metric];
  const next = previous === "cm" ? "mm" : "cm";
  if (inputs[metric].trim() && Number.isFinite(Number(inputs[metric]))) {
    inputs[metric] = String(
      Number(convertLength(Number(inputs[metric]), previous, next).toFixed(6)),
    );
  }
  units[metric] = next;
}
function toggleGestation() {
  if (!manualGestation.value && gaDays.value !== null) {
    const gestation = splitGestation(gaDays.value);
    weeks.value = String(gestation.weeks);
    days.value = String(gestation.days);
  }
  manualGestation.value = !manualGestation.value;
}
function openChart(metric: GrowthMetric) {
  if (metric === "CRL") return;
  uni.navigateTo({ url: `/pages/growth/chart?metric=${metric}` });
}
async function openBasis() {
  if (
    Object.keys(measurementValues.value).length &&
    !(await confirmAction(
      "先建立孕期档案？",
      "本页尚未保存的测量不会带入建档页面。请保留 B 超报告，建档后可重新录入。",
    ))
  )
    return;
  uni.navigateTo({ url: "/pages/pregnancy/edd" });
}
async function saveMeasurement() {
  if (!canSave.value || gaDays.value === null || saving.value) return;
  saving.value = true;
  saveError.value = "";
  savedMessage.value = "";
  try {
    const existing = sessionId.value
      ? profile.records.find((record) => record.id === sessionId.value)
      : undefined;
    if (
      existing &&
      !(await confirmAction(
        "保存测量修订？",
        "将更新当前选中的检查记录并保留原修订快照。同日其他检查和另一胎儿的记录不会被覆盖。",
      ))
    )
      return;
    const outcome = profile.saveMeasurement(
      {
        date: measurementDate.value,
        gaDays: gaDays.value,
        standard: selectedStandard.value,
        fetus: fetus.value,
        rawInputs: Object.fromEntries(
          metricItems
            .filter((item) => inputs[item.metric].trim())
            .map((item) => [
              item.metric,
              { value: inputs[item.metric], unit: units[item.metric] },
            ]),
        ),
        reportedEfwGrams: reportedEfw.value.trim()
          ? Number(reportedEfw.value)
          : null,
        basisRevisionId: profile.basis?.revisionId ?? profile.basis?.createdAt,
        measurements: { ...measurementValues.value },
        efwGrams: efwGrams.value,
        formulaVersion:
          efwResult.value?.status === "ready"
            ? efwResult.value.value.formulaId
            : "MEASUREMENTS_ONLY_V1",
        referenceVersion: REFERENCE_VERSION,
      },
      Boolean(existing),
      !existing,
      existing?.id,
    );
    if (!outcome.ok) {
      saveError.value = outcome.message;
      notify(outcome.message, "error");
      return;
    }
    savedMessage.value = "已保存到我的档案，记录保存在本机。";
    notify("已保存到我的档案", "success");
  } finally {
    saving.value = false;
  }
}
// watch 用于依赖变化后的副作用，例如清除提示或重新绘图；只计算显示值时优先用 computed。
watch(
  [inputs, units, measurementDate, weeks, days, selectedStandard],
  () => {
    savedMessage.value = "";
    saveError.value = "";
  },
  { deep: true },
);
// uni-app 页面生命周期：onLoad 接收打开页面时的路由参数；它与普通 Vue 子组件的 onMounted 用途不同。
onLoad((query) => {
  fetus.value =
    profile.profiles.find((p) => p.id === profile.activeProfileId)
      ?.fetusCount === 2
      ? "A"
      : "singleton";
  for (const metric of ["BPD", "HC", "AC", "FL"] as GrowthMetric[])
    units[metric] = app.lengthUnit;
  if (!query?.sessionId) return;
  const record = profile.records.find((item) => item.id === query.sessionId);
  if (!record) {
    notify("测量记录已不存在，请返回档案查看", "error");
    return;
  }
  sessionId.value = record.id;
  measurementDate.value = record.date;
  const gestation = splitGestation(record.gaDays);
  weeks.value = String(gestation.weeks);
  days.value = String(gestation.days);
  manualGestation.value = true;
  selectedStandard.value = record.standard;
  fetus.value = record.fetus ?? "singleton";
  reportedEfw.value = record.reportedEfwGrams
    ? String(record.reportedEfwGrams)
    : "";
  for (const { metric } of metricItems) {
    units[metric] = metric === "CRL" ? "mm" : "cm";
    const value = record.measurements[metric];
    inputs[metric] =
      value === undefined
        ? ""
        : String(Number(convertLength(value, "cm", units[metric]).toFixed(6)));
  }
});
</script>

<style scoped>
.growth-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.growth-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.growth-section > text {
  color: var(--text-tertiary);
  font-size: 12px;
  line-height: 18px;
}
.measurement-context {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.measurement-context__heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.measurement-context__gestation {
  color: var(--text-primary);
  font-size: 22px;
  font-weight: 600;
  line-height: 30px;
  font-variant-numeric: tabular-nums;
}
.measurement-context__unit {
  color: var(--primary);
  font-size: 12px;
  line-height: 18px;
}
.measurement-context__basis {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 18px;
}
.gestation-fields {
  display: flex;
  gap: 12px;
}
.gestation-field {
  flex: 1;
  min-width: 0;
}
.growth-caption {
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 20px;
}
.growth-explanation {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.growth-explanation__item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.growth-explanation__label {
  color: var(--text-primary);
  font-size: 15px;
  font-weight: 500;
  line-height: 22px;
}
.growth-explanation__text {
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 23px;
}
.growth-profile-hint {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.growth-actions {
  display: flex;
  gap: 12px;
  width: 100%;
}
.growth-actions__save {
  flex: 1.35;
}
.growth-actions__history {
  flex: 1;
}
.growth-error {
  color: var(--danger);
  font-size: 12px;
  line-height: 18px;
}
.growth-warning {
  color: var(--warning);
  font-size: 12px;
  line-height: 18px;
}
.growth-saved {
  color: var(--success);
  font-size: 13px;
  line-height: 20px;
}
</style>
