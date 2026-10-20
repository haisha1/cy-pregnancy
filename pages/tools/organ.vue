<script setup lang="ts">
/**
 * 器官测量页面：按路由选择器官配置；长度、面积、比值使用不同输入与换算规则，不能统一当作长度处理。
 * <script setup> 中的顶层变量、函数和导入可直接在模板里使用，不需要再写 data、methods 或 return。
 */
import { computed, ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import catalog from "../../data/organ-catalog.json";
import { useProfileStore } from "../../store/profile";
import { useWorkspaceStore } from "../../store/workspace";
import {
  resolveExamDays,
  convertDimension,
  calculateOrganRatio,
} from "../../engine/tools";
import { todayISO } from "../../engine/gestation";
import { notify } from "../../utils/feedback";
import type { ExamContext } from "../../components/GaExamContext.vue";
import GaPage from "../../components/GaPage.vue";
import GaNotice from "../../components/GaNotice.vue";
import GaExamContext from "../../components/GaExamContext.vue";
import GaCard from "../../components/GaCard.vue";
import GaField from "../../components/GaField.vue";
import GaTabs from "../../components/GaTabs.vue";
import GaButton from "../../components/GaButton.vue";
// ref 创建响应式状态；脚本读写用 .value，模板中作为顶层绑定使用时会自动解包。修改它后，依赖它的界面会更新。
// computed 表示从现有状态推导出的值，会跟踪依赖并缓存结果；依赖变化后才重新求值，不用手动同步另一份状态。
const key = ref(""),
  item = computed(() => catalog.find((i) => i.key === key.value)),
  context = ref<ExamContext>({
    date: todayISO(),
    weeks: "",
    days: "",
    manual: false,
    fetus: "singleton",
  }),
  raw = ref(""),
  unit = ref("mm"),
  method = ref(""),
  error = ref("");
const numerator = ref(""),
  denominator = ref(""),
  samePhase = ref("unknown");
const ratio = computed(() =>
  [
    "right-left-ventricular-diameter-ratio",
    "pulmonary-aortic-annulus-ratio",
    "cardiothoracic-area-ratio",
  ].includes(key.value),
);
const ratioResult = computed(() =>
  calculateOrganRatio(
    numerator.value,
    denominator.value,
    samePhase.value === "confirmed",
  ),
);
const profile = useProfileStore(),
  workspace = useWorkspaceStore();
function changeUnit(value: string) {
  if (value !== "cm" && value !== "mm") return;
  raw.value = convertDimension(
    raw.value,
    unit.value === "cm" ? "cm" : "mm",
    value,
    area.value ? "area" : "length",
  );
  unit.value = value;
  numerator.value = convertDimension(
    numerator.value,
    value === "cm" ? "mm" : "cm",
    value,
    area.value ? "area" : "length",
  );
  denominator.value = convertDimension(
    denominator.value,
    value === "cm" ? "mm" : "cm",
    value,
    area.value ? "area" : "length",
  );
}
// uni-app 页面生命周期：onLoad 接收打开页面时的路由参数；它与普通 Vue 子组件的 onMounted 用途不同。
onLoad((q) => {
  key.value = String(q?.key ?? "");
  context.value.fetus =
    profile.profiles.find((p) => p.id === profile.activeProfileId)
      ?.fetusCount === 2
      ? "A"
      : "singleton";
});
const area = computed(
  () => !!item.value?.fields.some((f) => f.includes("面积")),
);
const canSave = computed(
  () =>
    (ratio.value
      ? ratioResult.value.value !== null
      : Number.isFinite(Number(raw.value)) && Number(raw.value) > 0) &&
    !!profile.basis &&
    resolveExamDays(context.value, profile.basis) !== null,
);
function save() {
  if (!item.value || !canSave.value) return;
  const actualUnit = unit.value + (area.value ? "²" : "");
  const result = workspace.saveObservation({
    profileId: profile.activeProfileId,
    tool: "organ:" + key.value,
    date: context.value.date,
    gaDays: resolveExamDays(context.value, profile.basis),
    fetus: context.value.fetus,
    unit: unit.value === "cm" ? "cm" : "mm",
    raw: ratio.value
      ? {
          numerator: numerator.value,
          denominator: denominator.value,
          unit: actualUnit,
          method: method.value,
          samePhase: samePhase.value,
        }
      : { value: raw.value, unit: actualUnit, method: method.value },
    normalized: {
      ...(ratio.value
        ? {
            numerator:
              Number(numerator.value) *
              (unit.value === "mm" ? (area.value ? 0.01 : 0.1) : 1),
            denominator:
              Number(denominator.value) *
              (unit.value === "mm" ? (area.value ? 0.01 : 0.1) : 1),
          }
        : {
            value:
              Number(raw.value) *
              (unit.value === "mm" ? (area.value ? 0.01 : 0.1) : 1),
          }),
    },
    status: "unavailable",
    formulaId: "INPUT_ONLY_V1",
    referenceIds: [],
    values:
      ratio.value && ratioResult.value.value !== null
        ? [
            {
              label: "原始算术比值（不作临床判断）",
              value: ratioResult.value.value,
              unit: "无量纲",
            },
          ]
        : [],
  });
  if (!result.ok) {
    error.value = result.message;
    return;
  }
  notify("原始测量已本地保存", "success");
}
</script>
<template>
  <GaPage :title="item?.name || '脏器指标'" back disclaimer
    ><template v-if="item"
      ><GaNotice
        title="本项填写要求"
        :text="item.fields.join(' · ')"
      /><GaExamContext v-model="context" /><GaCard
        ><view class="ga-stack"
          ><GaField
            v-if="!ratio"
            v-model="raw"
            label="本次测量值"
            :unit="unit + (area ? '²' : '')" /><GaTabs
            :model-value="unit"
            @update:model-value="changeUnit"
            :items="[
              { label: area ? 'mm²' : 'mm', value: 'mm' },
              { label: area ? 'cm²' : 'cm', value: 'cm' },
            ]" /><template v-if="ratio"
            ><GaField
              v-model="numerator"
              :label="item.fields[2]"
              :unit="unit + (area ? '²' : '')"
            /><GaField
              v-model="denominator"
              :label="item.fields[3]"
              :unit="unit + (area ? '²' : '')"
            /><GaTabs
              v-model="samePhase"
              :items="[
                { label: '未核对切面与时相', value: 'unknown' },
                { label: '已核对同次同切面与时相', value: 'confirmed' },
              ]"
            /><text class="ga-muted">{{
              ratioResult.value === null
                ? ratioResult.error
                : "原始算术比值：" +
                  Number(ratioResult.value.toPrecision(8)) +
                  "（无量纲）"
            }}</text></template
          ><GaField
            v-model="method"
            label="侧别 / 测量切面与端点"
            type="text" /></view></GaCard
      ><GaNotice title="尚无已审核参考" :text="item.reference" /><text
        v-if="error"
        class="ga-muted"
        >{{ error }}</text
      ></template
    ><GaNotice
      v-else
      title="没有这个指标"
      text="请返回脏器目录重新选择。"
    /><template v-if="item" #actions
      ><GaButton :disabled="!canSave" @click="save"
        >保存原始测量</GaButton
      ></template
    ></GaPage
  >
</template>
