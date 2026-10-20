<script setup lang="ts">
/**
 * 通用工具页：路由 tool 参数选择配置，同一套表单支持不同工具；计算、草稿、正式保存分别走不同入口。
 * <script setup> 中的顶层变量、函数和导入可直接在模板里使用，不需要再写 data、methods 或 return。
 */
import { computed, ref, watch } from "vue";
import { chooseUnsavedAction } from "../../utils/unsaved";
import { onLoad } from "@dcloudio/uni-app";
import { getTool, toolDefinitions } from "../../data/tool-definitions";
import {
  calculateTool,
  convertDimension,
  resolveExamDays,
} from "../../engine/tools";
import { todayISO } from "../../engine/gestation";
import { validateMeasurementDate } from "../../engine/gestation";
import { useProfileStore } from "../../store/profile";
import { useWorkspaceStore } from "../../store/workspace";
import { useAppStore } from "../../store/app";
import { notify } from "../../utils/feedback";
import type { ExamContext } from "../../components/GaExamContext.vue";
import GaPage from "../../components/GaPage.vue";
import GaCard from "../../components/GaCard.vue";
import GaField from "../../components/GaField.vue";
import GaDateField from "../../components/GaDateField.vue";
import GaTabs from "../../components/GaTabs.vue";
import GaButton from "../../components/GaButton.vue";
import GaNotice from "../../components/GaNotice.vue";
import GaExamContext from "../../components/GaExamContext.vue";
import GaReference from "../../components/GaReference.vue";
import GaLinkRow from "../../components/GaLinkRow.vue";
const app = useAppStore(),
  profile = useProfileStore(),
  workspace = useWorkspaceStore();
// ref 创建响应式状态；脚本读写用 .value，模板中作为顶层绑定使用时会自动解包。修改它后，依赖它的界面会更新。
const key = ref("ua");
// computed 表示从现有状态推导出的值，会跟踪依赖并缓存结果；依赖变化后才重新求值，不用手动同步另一份状态。
const tool = computed(() => getTool(key.value));
// Record<string, string> 表示“字段名 → 输入文字”的字典；例如 CPR 的 ua、mca 共用这份表单结构。
const values = ref<Record<string, string>>({});
const unit = ref<"cm" | "mm">(app.lengthUnit);
const context = ref<ExamContext>({
  date: todayISO(),
  weeks: "",
  days: "",
  manual: false,
  fetus: "singleton",
});
const saveError = ref(""),
  saved = ref("");
const validTool = computed(() => tool.value ?? toolDefinitions[0]);
const result = computed(() =>
  calculateTool(validTool.value, values.value, unit.value),
);
const gaDays = computed(() => resolveExamDays(context.value, profile.basis));
const siblings = computed(() =>
  ["ua", "mca", "dv", "uta", "cpr"].includes(key.value)
    ? toolDefinitions.filter((t) =>
        ["ua", "mca", "dv", "uta", "cpr"].includes(t.key),
      )
    : ["mvp", "afi"].includes(key.value)
      ? toolDefinitions.filter((t) => ["mvp", "afi"].includes(t.key))
      : [],
);
function openTool(value: string) {
  uni.redirectTo({ url: "/pages/tools/calculator?tool=" + value });
}
function setUnit(value: string) {
  // 切换单位时同步换算已填数值，不能只把 cm 标签改成 mm；面积要按平方倍数换算。
  if (value !== "cm" && value !== "mm") return;
  const next = { ...values.value };
  for (const field of validTool.value.fields)
    if (field.dimension)
      next[field.key] = convertDimension(
        next[field.key] ?? "",
        unit.value,
        value,
        field.dimension,
      );
  values.value = next;
  unit.value = value;
}
const hasInput = computed(() =>
  validTool.value.fields.some((f) => {
    const v = values.value[f.key];
    return v && v !== "unknown" && f.key !== "dob";
  }),
);
const canSave = computed(
  () =>
    !!profile.basis &&
    hasInput.value &&
    result.value.status !== "invalid" &&
    gaDays.value !== null &&
    key.value !== "age",
);
const paired = computed(() =>
  ["twin-growth", "ttts", "sfgr"].includes(key.value),
);
const isTwinProfile = computed(
  () =>
    profile.profiles.find((p) => p.id === profile.activeProfileId)
      ?.fetusCount === 2,
);
function saveDraft() {
  // 展开复制只复制这一层；这里字段都是字符串，所以足够隔离接下来的删除与赋值。
  // DOB 是临时计算信息，保存草稿前也要移除，不能只在正式记录保存时过滤。
  const safe = { ...values.value };
  delete safe.dob;
  Object.assign(safe, {
    __unit: unit.value,
    __date: context.value.date,
    __weeks: context.value.weeks,
    __days: context.value.days,
    __fetus: context.value.fetus,
    __manual: String(context.value.manual),
  });
  const outcome = workspace.saveDraft(
    key.value + ":" + profile.activeProfileId,
    safe,
  );
  if (!outcome.ok) {
    saveError.value = outcome.message;
    return false;
  }
  notify("输入草稿已保存在本机", "success");
  return true;
}
async function beforeLeave() {
  if (!hasInput.value || saved.value || key.value === "age") return true;
  const action = await chooseUnsavedAction();
  if (action === "stay") return false;
  if (action === "save") return saveDraft();
  return true;
}
function save() {
  // computed 负责实时预览，这个显式事件才负责落盘；先检查上下文，再创建记录快照。
  saveError.value = "";
  if (paired.value && !isTwinProfile.value) {
    saveError.value = "请先明确选择双胎档案，不能把两胎资料保存到单胎档案";
    return;
  }
  const issue = validateMeasurementDate(context.value.date, todayISO());
  if (issue) {
    saveError.value = issue;
    return;
  }
  if (!canSave.value) {
    saveError.value = "请先建立档案并核对本次孕周、胎儿及输入";
    return;
  }
  const selected = profile.profiles.find(
    (p) => p.id === profile.activeProfileId,
  );
  if (
    (selected?.fetusCount === 2 && context.value.fetus === "singleton") ||
    (selected?.fetusCount === 1 && context.value.fetus !== "singleton")
  ) {
    saveError.value = "胎儿标识与档案胎数不一致，请核对";
    return;
  }
  const outcome = workspace.saveObservation({
    profileId: profile.activeProfileId,
    tool: key.value,
    date: context.value.date,
    gaDays: gaDays.value,
    fetus: paired.value ? "A+B" : context.value.fetus,
    raw: { ...values.value },
    unit: unit.value,
    normalized: { ...result.value.normalized },
    status: result.value.status,
    values: result.value.values,
    formulaId: result.value.formulaId,
    referenceIds: result.value.referenceIds,
  });
  if (!outcome.ok) {
    saveError.value = outcome.message;
    return;
  }
  saved.value = "原始输入已保存到本地档案；未核验模型未生成临床结果。";
  notify("已本地保存", "success");
}
// watch 用于依赖变化后的副作用，例如清除提示或重新绘图；只计算显示值时优先用 computed。
watch(
  [values, context, unit],
  () => {
    saved.value = "";
    saveError.value = "";
  },
  { deep: true },
  // deep 让 values/context 对象内部字段的修改也触发监听，而非仅监听整个对象被替换。
);
// uni-app 页面生命周期：onLoad 接收打开页面时的路由参数；它与普通 Vue 子组件的 onMounted 用途不同。
onLoad((query) => {
  // 例如 /pages/tools/calculator?tool=cpr；路由参数是不可信输入，先核对类型并提供默认值。
  key.value = typeof query?.tool === "string" ? query.tool : "ua";
  const selected = profile.profiles.find(
    (p) => p.id === profile.activeProfileId,
  );
  context.value.fetus = selected?.fetusCount === 2 ? "A" : "singleton";
  const draft =
    workspace.state.drafts[key.value + ":" + profile.activeProfileId];
  if (draft) {
    values.value = Object.fromEntries(
      Object.entries(draft).filter(
        ([key]) => !key.startsWith("__") && key !== "dob",
      ),
    );
    if (draft.__unit === "cm" || draft.__unit === "mm")
      unit.value = draft.__unit;
    if (draft.__date) context.value.date = draft.__date;
    context.value.weeks = draft.__weeks ?? "";
    context.value.days = draft.__days ?? "";
    context.value.manual = draft.__manual === "true";
    context.value.fetus = draft.__fetus ?? context.value.fetus;
  }
  if (key.value === "age" && profile.basis)
    values.value.edd = profile.basis.edd ?? "";
});
</script>
<template>
  <GaPage
    :title="tool?.title || '工具不存在'"
    back
    disclaimer
    :before-leave="beforeLeave"
  >
    <template v-if="tool"
      ><GaTabs
        v-if="siblings.length"
        :model-value="key"
        :items="
          siblings.map((t) => ({ label: t.key.toUpperCase(), value: t.key }))
        "
        @update:model-value="openTool"
      /><GaNotice title="使用说明" :text="tool.description" />
      <GaNotice
        v-if="workspace.error"
        title="本地记录异常"
        :text="workspace.error"
        warning
      />
      <GaExamContext v-if="key !== 'age'" v-model="context" :paired="paired" />
      <GaNotice
        v-if="paired && !isTwinProfile"
        title="临时双胎查阅"
        text="当前不是双胎档案。计算不会改变原档案；保存前请在档案管理中明确建立或选择双胎档案。"
      />
      <GaTabs
        v-if="tool.fields.some((f) => f.dimension)"
        :model-value="unit"
        :items="[
          { label: '厘米 cm / cm²', value: 'cm' },
          { label: '毫米 mm / mm²', value: 'mm' },
        ]"
        @update:model-value="setUnit"
      />
      <template v-for="field in tool.fields" :key="field.key"
        ><GaDateField
          v-if="field.kind === 'date'"
          v-model="values[field.key]"
          :label="field.label"
          :error="result.errors[field.key]" /><GaCard
          v-else-if="field.kind === 'choice'"
          ><text class="ga-muted">{{ field.label }}</text
          ><GaTabs
            :model-value="values[field.key] || 'unknown'"
            :items="field.options || []"
            @update:model-value="values[field.key] = $event"
          /><text v-if="result.errors[field.key]" class="tool-error">{{
            result.errors[field.key]
          }}</text></GaCard
        ><GaCard v-else
          ><GaField
            :model-value="values[field.key] || ''"
            :label="field.label"
            :unit="
              field.dimension === 'length'
                ? unit
                : field.dimension === 'area'
                  ? unit + '²'
                  : field.unit
            "
            :type="field.kind === 'text' ? 'text' : 'digit'"
            :error="result.errors[field.key]"
            @update:model-value="values[field.key] = $event" /></GaCard
      ></template>
      <GaCard v-if="result.values.length"
        ><view
          v-for="item in result.values"
          :key="item.label"
          class="tool-result"
          ><text class="ga-muted">{{ item.label }}</text
          ><text class="tool-result__value"
            >{{ Number(item.value.toPrecision(8)) }}
            <text class="ga-muted">{{ item.unit }}</text></text
          ></view
        ></GaCard
      >
      <GaNotice
        :title="tool.highRisk ? '模型待专科审核' : '结果与参考状态'"
        :text="result.message"
        :warning="result.status === 'invalid'"
      />
      <GaButton v-if="tool.highRisk" disabled>临床计算尚未开放</GaButton>
      <GaLinkRow
        v-if="!profile.basis && key !== 'age'"
        title="建立孕期基准后可保存测量"
        url="/pages/pregnancy/edd"
      />
      <GaButton v-if="key !== 'age'" variant="text" @click="saveDraft"
        >保留输入草稿</GaButton
      ><GaReference v-if="tool.references.length" :ids="tool.references" /><text
        v-if="saveError"
        class="tool-error"
        role="alert"
        >{{ saveError }}</text
      ><text v-if="saved" class="tool-saved" role="status">{{
        saved
      }}</text> </template
    ><GaNotice v-else title="未找到工具" text="请返回全部工具重新选择。" />
    <template v-if="tool && key !== 'age'" #actions
      ><GaButton :disabled="!canSave" @click="save"
        >保存本次输入</GaButton
      ></template
    >
  </GaPage>
</template>
<style scoped>
.tool-error {
  display: block;
  color: var(--danger);
  font-size: 13px;
}
.tool-saved {
  color: var(--success);
  font-size: 13px;
}
.tool-result {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.tool-result__value {
  color: var(--primary);
  font-size: 30px;
  font-weight: 600;
}
.ga-tabs {
  flex-wrap: wrap;
  gap: 6px;
}
</style>
