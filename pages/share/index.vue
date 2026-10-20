<script setup lang="ts">
/**
 * 分享预览页：先按用户选项组装允许分享的文本，再调用 GaShareCard 导出本地图片，不直接分享完整档案。
 * <script setup> 中的顶层变量、函数和导入可直接在模板里使用，不需要再写 data、methods 或 return。
 */
import { computed, ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { useProfileStore } from "../../store/profile";
import { useWorkspaceStore } from "../../store/workspace";
import { useAppStore } from "../../store/app";
import { formatGestation } from "../../engine/gestation";
import { getTool } from "../../data/tool-definitions";
import GaPage from "../../components/GaPage.vue";
import GaNotice from "../../components/GaNotice.vue";
import GaButton from "../../components/GaButton.vue";
import GaShareCard from "../../components/GaShareCard.vue";
// ref 创建响应式状态；脚本读写用 .value，模板中作为顶层绑定使用时会自动解包。修改它后，依赖它的界面会更新。
const profile = useProfileStore(),
  workspace = useWorkspaceStore(),
  app = useAppStore(),
  id = ref(""),
  includeDate = ref(true),
  includeGa = ref(true),
  includeValues = ref(true),
  error = ref(""),
  image = ref(""),
  busy = ref(false);
const card = ref<InstanceType<typeof GaShareCard> | null>(null);
// computed 表示从现有状态推导出的值，会跟踪依赖并缓存结果；依赖变化后才重新求值，不用手动同步另一份状态。
const record = computed(() =>
  profile.profiles.flatMap((p) => p.records).find((r) => r.id === id.value),
);
const observation = computed(() =>
  workspace.state.observations.find((o) => o.id === id.value),
);
const available = computed(() => !!record.value || !!observation.value);
const generatedAt = new Date().toISOString();
const lines = computed(() => {
  const r = record.value,
    o = observation.value;
  if (!r && !o) return [];
  const text: string[] = [];
  if (includeDate.value) text.push("检查日期：" + (r?.date ?? o?.date));
  const days = r?.gaDays ?? o?.gaDays;
  if (includeGa.value && days !== null && days !== undefined)
    text.push("当时孕周：" + formatGestation(days));
  text.push("胎儿标识：" + (r?.fetus ?? o?.fetus ?? "singleton"));
  if (includeValues.value && r) {
    for (const [key, value] of Object.entries(r.measurements))
      text.push(`${key}：${value} cm`);
    if (r.efwGrams !== null) text.push(`模型估重：${r.efwGrams.toFixed(0)} g`);
    text.push("模型：" + r.formulaVersion + " · " + r.referenceVersion);
  }
  if (includeValues.value && o) {
    const tool = getTool(o.tool);
    for (const field of tool?.fields ?? []) {
      if (field.key === "dob") continue;
      const value = o.raw[field.key];
      if (value)
        text.push(
          `${field.label}：${value} ${field.dimension ? o.unit : (field.unit ?? "")}`,
        );
    }
    text.push("模型状态：参考数据待核验，仅为测量记录");
  }
  text.push("表达：" + (app.mode === "plain" ? "白话版" : "专业版"));
  text.push("生成时间：" + generatedAt);
  return text;
});
// uni-app 页面生命周期：onLoad 接收打开页面时的路由参数；它与普通 Vue 子组件的 onMounted 用途不同。
onLoad((q) => (id.value = String(q?.id ?? "")));
async function generate() {
  if (!card.value || busy.value) return;
  busy.value = true;
  error.value = "";
  try {
    image.value = await card.value.exportImage();
    uni.previewImage({ urls: [image.value] });
  } catch (e) {
    error.value = e instanceof Error ? e.message : "生成失败";
  } finally {
    busy.value = false;
  }
}
</script>
<template>
  <GaPage title="分享预览" back
    ><GaNotice
      title="只分享你选择的记录"
      text="默认不含姓名、生日、账号、机构与原图。生成预览不会自动发送，也不会创建云端短链授权。"
    /><template v-if="available"
      ><view class="ga-row"
        ><view class="share-option"
          ><GaButton
            variant="secondary"
            :aria-pressed="includeDate"
            @click="includeDate = !includeDate"
            >{{ includeDate ? "显示" : "隐藏" }}检查日期</GaButton
          ></view
        ><view class="share-option"
          ><GaButton
            variant="secondary"
            :aria-pressed="includeGa"
            @click="includeGa = !includeGa"
            >{{ includeGa ? "显示" : "隐藏" }}孕周</GaButton
          ></view
        ></view
      ><GaButton
        variant="secondary"
        :aria-pressed="includeValues"
        @click="includeValues = !includeValues"
        >{{ includeValues ? "显示" : "隐藏" }}测量指标</GaButton
      ><GaShareCard
        ref="card"
        title="测量记录 · 本机导出"
        :lines="lines"
      /><text v-if="image" class="ga-muted"
        >图片已在本机生成，可在设备预览中保存或主动分享。</text
      ></template
    ><GaNotice
      v-else
      title="尚未选择有效记录"
      text="请从测量详情进入，只分享明确选中的快照。"
    /><text v-if="error" class="error" role="alert">{{ error }}</text
    ><template #actions
      ><GaButton :disabled="!available" :loading="busy" @click="generate"
        >生成本机分享图片</GaButton
      ></template
    ></GaPage
  >
</template>
<style scoped>
.error {
  color: var(--danger);
  font-size: 13px;
}
.share-option {
  min-width: 0;
  flex: 1;
}
</style>
