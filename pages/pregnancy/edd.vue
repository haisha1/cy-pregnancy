<template>
  <!-- v-model 把表单值交给下方 script 中的 ref；v-if/v-else-if 只渲染当前定年方式的表单。
       模板直接使用 method，脚本读写则用 method.value。 -->
  <GaPage title="预产期及孕周计算" back disclaimer>
    <GaTabs v-model="method" :items="methods" />

    <template v-if="method === 'LMP'">
      <GaDateField v-model="lmpDate" label="末次月经第一天" />
      <GaButton variant="text" @click="method = 'EDD'"
        >已经知道预产期？</GaButton
      >
    </template>
    <template v-else-if="method === 'EDD'">
      <GaDateField v-model="eddDate" label="医生确认的预产期" />
      <GaButton variant="text" @click="method = 'LMP'"
        >返回末次月经计算</GaButton
      >
    </template>
    <template v-else-if="method === 'CRL'">
      <GaDateField v-model="crlDate" label="早孕 B 超测量日期" />
      <GaTabs
        :model-value="crlUnit"
        :items="lengthUnits"
        @update:model-value="changeCrlUnit"
      />
      <GaField
        v-model="crl"
        label="头臀径 CRL"
        placeholder="请输入 B 超报告中的头臀径"
        :unit="crlUnit"
        type="digit"
      />
      <text class="field-hint"
        >方程输入范围为 15–95
        mm。定年结果应由医生结合检查时机确认，不能用于评估发育是否正常。</text
      >
    </template>
    <template v-else-if="method === 'IVF'">
      <GaDateField v-model="transferDate" label="胚胎移植日期" />
      <GaCard>
        <view class="input-group">
          <text class="field-title">移植时的胚胎日龄</text>
          <GaTabs v-model="embryoType" :items="embryoTypes" />
          <GaField
            v-if="embryoType === 'custom'"
            v-model="embryoAge"
            label="胚胎日龄"
            placeholder="请填写医生确认的日龄"
            unit="天"
            type="number"
          />
          <text class="field-hint"
            >填写移植时胚胎已发育的天数，请以生殖中心记录为准。</text
          >
        </view>
      </GaCard>
    </template>
    <template v-else>
      <GaDateField v-model="knownDate" label="已知孕周对应的日期" />
      <view class="paired-fields">
        <GaField
          v-model="knownWeeks"
          label="该日孕周"
          placeholder="周"
          unit="周"
          type="number"
        />
        <GaField
          v-model="knownDays"
          label="另加天数"
          placeholder="0–6"
          unit="天"
          type="number"
        />
      </view>
    </template>

    <GaCard v-if="summary?.status === 'ready'">
      <view class="result" aria-live="polite">
        <text class="result-label">{{
          app.mode === "plain" ? "你现在怀孕" : "计算结果 · 当前孕周"
        }}</text>
        <text class="gestation"
          >{{ summary.value.weeks }}周+{{ summary.value.days }}天</text
        >
        <view class="result-row"
          ><text>预产期</text
          ><text class="result-value">{{ summary.value.edd }}</text></view
        >
        <view class="result-row"
          ><text>已孕</text
          ><text class="result-value"
            >{{ summary.value.totalDays }} 天</text
          ></view
        >
        <view class="result-row">
          <text>{{
            summary.value.daysUntilEdd >= 0 ? "距预产期" : "已过预产期"
          }}</text>
          <text class="result-value"
            >{{ Math.abs(summary.value.daysUntilEdd) }} 天</text
          >
        </view>
        <text v-if="app.mode === 'plain'" class="plain-copy"
          >预产期是估计日期，医生会结合月经情况和早孕 B
          超核对。请按约定时间产检。</text
        >
        <view
          v-if="summary.value.warnings.length"
          class="warnings"
          role="status"
        >
          <text
            v-for="warning in summary.value.warnings"
            :key="warning"
            class="warning-copy"
            >{{ warning }}</text
          >
        </view>
      </view>
    </GaCard>
    <GaCard v-else-if="calculation && calculation.status !== 'ready'">
      <view class="validation" role="alert"
        ><GaIcon name="info" /><text>{{ calculation.message }}</text></view
      >
    </GaCard>
    <GaCard v-else-if="summary">
      <view class="validation" role="alert"
        ><GaIcon name="info" /><text>{{ summary.message }}</text></view
      >
    </GaCard>
    <GaEmpty
      v-else
      title="填好日期，结果自动出现"
      description="选择适合你的方式，输入后即可查看孕周和预产期。"
    />

    <template v-if="calculation?.status === 'ready'">
      <GaSection title="日期与孕周互查" />
      <GaTabs v-model="queryMode" :items="queryModes" />
      <GaCard>
        <view v-if="queryMode === 'date'" class="input-group">
          <GaDateField v-model="queryDate" label="查这一天的孕周" />
          <text v-if="querySummary?.status === 'ready'" class="query-result"
            >{{ queryDate }} · {{ querySummary.value.weeks }}周+{{
              querySummary.value.days
            }}天</text
          >
          <text v-else-if="querySummary" class="field-error">{{
            querySummary.message
          }}</text>
        </view>
        <view v-else class="input-group">
          <view class="paired-fields">
            <GaField
              v-model="queryWeeks"
              label="要查询的孕周"
              placeholder="周"
              unit="周"
              type="number"
            />
            <GaField
              v-model="queryDays"
              label="查询孕周余天"
              placeholder="0–6"
              unit="天"
              type="number"
            />
          </view>
          <text
            v-if="queryGestationDate?.status === 'ready'"
            class="query-result"
            >对应日期 {{ queryGestationDate.value }}</text
          >
          <text v-else-if="queryGestationDate" class="field-error">{{
            queryGestationDate.message
          }}</text>
        </view>
      </GaCard>
    </template>

    <GaSection title="关键产检节点" />
    <GaCard>
      <view class="plan">
        <view class="plan-icon"><GaIcon name="calendar" /></view>
        <view class="plan-copy">
          <text class="plan-title">和产科医生确认产检安排</text>
          <text class="field-hint"
            >具体检查项目和时间因个人情况而异，请以医生预约单为准。</text
          >
        </view>
      </view>
    </GaCard>
    <GaReference :ids="referenceIds" />
    <text v-if="saveError" class="field-error" role="alert">{{
      saveError
    }}</text>

    <template #actions>
      <GaButton
        :disabled="
          calculation?.status !== 'ready' || summary?.status !== 'ready'
        "
        :loading="saving"
        @click="saveBasis"
        >保存为我的孕期基准</GaButton
      >
    </template>
  </GaPage>
</template>

<script setup lang="ts">
/**
 * 预产期页面：表单输入 → engine 创建孕期基准 → computed 展示结果 → 用户确认后写入档案。输入变化本身不会保存。
 * <script setup> 中的顶层变量、函数和导入可直接在模板里使用，不需要再写 data、methods 或 return。
 */
import { computed, ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import GaPage from "@/components/GaPage.vue";
import GaTabs from "@/components/GaTabs.vue";
import GaDateField from "@/components/GaDateField.vue";
import GaField from "@/components/GaField.vue";
import GaCard from "@/components/GaCard.vue";
import GaIcon from "@/components/GaIcon.vue";
import GaEmpty from "@/components/GaEmpty.vue";
import GaSection from "@/components/GaSection.vue";
import GaReference from "@/components/GaReference.vue";
import GaButton from "@/components/GaButton.vue";
import {
  createPregnancyBasis,
  dateAtGestation,
  getPregnancySummary,
  todayISO,
  validateMeasurementDate,
} from "@/engine/gestation";
import { convertLength, invalid } from "@/engine/validation";
import type { LengthUnit, PregnancyBasis } from "@/types/medical";
import { useAppStore } from "@/store/app";
import { useProfileStore } from "@/store/profile";
import { confirmAction, notify } from "@/utils/feedback";
import { openMainPage } from "@/utils/navigation";

const app = useAppStore();
const profile = useProfileStore();
// ref 创建响应式状态；脚本读写用 .value，模板中作为顶层绑定使用时会自动解包。修改它后，依赖它的界面会更新。
const method = ref("LMP");
const methods = [
  { label: "末次月经", value: "LMP" },
  { label: "CRL", value: "CRL" },
  { label: "胚胎移植", value: "IVF" },
  { label: "已知孕周", value: "KNOWN_GA" },
];
const embryoTypes = [
  { label: "第 3 天胚胎", value: "3" },
  { label: "第 5 天囊胚", value: "5" },
  { label: "其他日龄", value: "custom" },
];
const lmpDate = ref("");
const eddDate = ref("");
const crlDate = ref(todayISO());
const crl = ref("");
const crlUnit = ref<LengthUnit>("mm");
const lengthUnits = [
  { label: "毫米 mm", value: "mm" },
  { label: "厘米 cm", value: "cm" },
];
const transferDate = ref("");
const embryoType = ref("5");
const embryoAge = ref("");
const knownDate = ref(todayISO());
const knownWeeks = ref("");
const knownDays = ref("0");
const queryDate = ref(todayISO());
const queryMode = ref("date");
const queryModes = [
  { label: "查某天的孕周", value: "date" },
  { label: "查某孕周的日期", value: "gestation" },
];
const queryWeeks = ref("");
const queryDays = ref("0");
const asOfDate = ref(todayISO());
const saveError = ref("");
const saving = ref(false);
// uni-app 的 onShow 在页面每次显示时触发，包括从下一页返回；适合刷新当天日期或最新本地状态。
onShow(() => {
  asOfDate.value = todayISO();
});

function changeCrlUnit(value: string) {
  if (value !== "mm" && value !== "cm") return;
  if (crl.value && Number.isFinite(Number(crl.value)))
    crl.value = String(convertLength(Number(crl.value), crlUnit.value, value));
  crlUnit.value = value;
}

// computed 表示从现有状态推导出的值，会跟踪依赖并缓存结果；依赖变化后才重新求值，不用手动同步另一份状态。
const calculation = computed(() => {
  // computed 会自动收集本次执行读到的响应式依赖；切换方式或修改对应输入后，结果会重新计算。
  // 这里只返回结果，不保存档案，避免用户每输入一个字符就改动正式记录。
  switch (method.value) {
    case "LMP":
      return lmpDate.value
        ? createPregnancyBasis({ method: "LMP", date: lmpDate.value })
        : null;
    case "EDD":
      return eddDate.value
        ? createPregnancyBasis({ method: "EDD", date: eddDate.value })
        : null;
    case "CRL": {
      if (!crl.value || !crlDate.value) return null;
      const error = validateMeasurementDate(crlDate.value, asOfDate.value);
      return error
        ? invalid<PregnancyBasis>("date", "INVALID_MEASUREMENT_DATE", error, [
            "INTERGROWTH_CRL_2014",
          ])
        : createPregnancyBasis({
            method: "CRL",
            date: crlDate.value,
            crlMm: convertLength(Number(crl.value), crlUnit.value, "mm"),
          });
    }
    case "IVF": {
      const age =
        embryoType.value === "custom" ? embryoAge.value : embryoType.value;
      if (!transferDate.value || !age) return null;
      const error = validateMeasurementDate(transferDate.value, asOfDate.value);
      return error
        ? invalid<PregnancyBasis>("date", "INVALID_TRANSFER_DATE", error, [
            "ACOG_DATING_2017",
          ])
        : createPregnancyBasis({
            method: "IVF",
            date: transferDate.value,
            embryoAgeDays: Number(age),
          });
    }
    default:
      return knownDate.value && knownWeeks.value && knownDays.value !== ""
        ? createPregnancyBasis({
            method: "KNOWN_GA",
            date: knownDate.value,
            weeks: Number(knownWeeks.value),
            days: Number(knownDays.value),
          })
        : null;
  }
});
const summary = computed(() =>
  // status 是类型区分字段：只有 ready 分支才有可读取的 value，先判断再取值可避免空结果报错。
  calculation.value?.status === "ready"
    ? getPregnancySummary(calculation.value.value, asOfDate.value)
    : null,
);
const querySummary = computed(() =>
  calculation.value?.status === "ready" && queryDate.value
    ? getPregnancySummary(calculation.value.value, queryDate.value)
    : null,
);
const queryGestationDate = computed(() =>
  calculation.value?.status === "ready" &&
  queryWeeks.value &&
  queryDays.value !== ""
    ? dateAtGestation(
        calculation.value.value,
        Number(queryWeeks.value),
        Number(queryDays.value),
      )
    : null,
);
const referenceIds = computed(() => [
  ...new Set([
    ...(calculation.value?.referenceIds ?? [
      method.value === "CRL" ? "INTERGROWTH_CRL_2014" : "ACOG_DATING_2017",
    ]),
    ...(summary.value?.referenceIds ?? []),
  ]),
]);

async function saveBasis() {
  const current = calculation.value;
  if (
    saving.value ||
    current?.status !== "ready" ||
    summary.value?.status !== "ready"
  )
    return;
  saving.value = true;
  saveError.value = "";
  try {
    if (
      profile.basis &&
      !(await confirmAction(
        "更新孕期基准？",
        `旧预产期：${profile.basis.edd ?? "未登记"}；新预产期：${current.value.edd}。确认后新增基准修订，后续推算使用新基准；既往检查日期、孕周与预约日期保持不变。`,
      ))
    )
      return;
    const result = profile.saveBasis(current.value);
    if (!result.ok) {
      saveError.value = result.message ?? "保存失败，请稍后重试。";
      notify(saveError.value, "error");
      return;
    }
    notify("孕期基准已保存", "success");
    openMainPage("/pages/profile/index");
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.input-group,
.result,
.plan-copy {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.field-title {
  font-size: 13px;
  line-height: 18px;
  color: var(--text-secondary);
}
.field-hint {
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 20px;
}
.paired-fields {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 12px;
}
.result {
  gap: 10px;
  padding: 4px 8px;
}
.result-label {
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 18px;
}
.gestation {
  color: var(--primary);
  font-size: 34px;
  font-weight: 700;
  line-height: 44px;
  font-variant-numeric: tabular-nums;
}
.result-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 22px;
}
.result-value {
  color: var(--text-primary);
  font-size: 15px;
  font-variant-numeric: tabular-nums;
}
.plain-copy {
  padding-top: 6px;
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 23px;
}
.warnings {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 12px;
  background: var(--warning-tint);
}
.warning-copy {
  color: var(--warning);
  font-size: 12px;
  line-height: 20px;
}
.validation {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  color: var(--danger);
  font-size: 13px;
  line-height: 21px;
}
.field-error {
  color: var(--danger);
  font-size: 13px;
  line-height: 21px;
}
.query-result {
  color: var(--primary);
  font-size: 15px;
  line-height: 24px;
  font-variant-numeric: tabular-nums;
}
.plan {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}
.plan-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  color: var(--primary);
  background: var(--tint-blue);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.plan-copy {
  gap: 4px;
}
.plan-title {
  font-size: 15px;
  line-height: 22px;
  color: var(--text-primary);
}
</style>
