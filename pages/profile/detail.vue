<script setup lang="ts">
/**
 * 档案详情：根据路由中的档案或记录 ID 查找已保存快照，避免使用今天的默认设置重新解释历史记录。
 * <script setup> 中的顶层变量、函数和导入可直接在模板里使用，不需要再写 data、methods 或 return。
 */
import { computed, ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { useProfileStore } from "../../store/profile";
import { useWorkspaceStore } from "../../store/workspace";
import { formatGestation } from "../../engine/gestation";
import { getTool } from "../../data/tool-definitions";
import { confirmAction, notify } from "../../utils/feedback";
import GaPage from "../../components/GaPage.vue";
import GaCard from "../../components/GaCard.vue";
import GaNotice from "../../components/GaNotice.vue";
import GaLinkRow from "../../components/GaLinkRow.vue";
import GaReference from "../../components/GaReference.vue";
import GaButton from "../../components/GaButton.vue";
const profile = useProfileStore(),
  workspace = useWorkspaceStore();
// ref 创建响应式状态；脚本读写用 .value，模板中作为顶层绑定使用时会自动解包。修改它后，依赖它的界面会更新。
const id = ref(""),
  profileId = ref("");
// computed 表示从现有状态推导出的值，会跟踪依赖并缓存结果；依赖变化后才重新求值，不用手动同步另一份状态。
const entry = computed(() =>
  profile.profiles.find(
    (p) => p.id === (profileId.value || profile.activeProfileId),
  ),
);
const record = computed(() =>
  profile.profiles.flatMap((p) => p.records).find((r) => r.id === id.value),
);
const observation = computed(() =>
  workspace.state.observations.find((o) => o.id === id.value),
);
const error = ref("");
// uni-app 页面生命周期：onLoad 接收打开页面时的路由参数；它与普通 Vue 子组件的 onMounted 用途不同。
onLoad((q) => {
  id.value = String(q?.id ?? "");
  profileId.value = String(q?.profileId ?? "");
});
function share() {
  uni.navigateTo({
    url: "/pages/share/index?id=" + encodeURIComponent(id.value),
  });
}
async function remove() {
  if (
    !(await confirmAction(
      "删除本机记录？",
      "仅删除当前选中的记录，此操作不能撤销。",
    ))
  )
    return;
  const r = observation.value
    ? workspace.removeObservation(id.value)
    : profile.removeMeasurement(id.value);
  if (!r.ok) {
    error.value = r.message;
    return;
  }
  notify("已删除本机记录", "success");
  uni.navigateBack();
}
</script>
<template>
  <GaPage
    :title="id ? '测量详情' : '档案详情'"
    back
    disclaimer
    requires-account
  >
    <template v-if="record"
      ><GaNotice
        :title="record.date + ' · ' + formatGestation(record.gaDays)"
        :text="`胎儿 ${record.fetus ?? 'singleton'} · 本地保存 · ${record.standard} · 原版本快照`" /><GaCard
        ><view class="ga-stack"
          ><view
            v-for="(value, metric) in record.measurements"
            :key="metric"
            class="ga-row"
            ><text>{{ metric }}</text
            ><text>{{ value }} cm</text></view
          ><text
            >模型估重：{{
              record.efwGrams === null
                ? "未生成"
                : record.efwGrams.toFixed(0) + " g"
            }}</text
          ><text
            >报告估重：{{ record.reportedEfwGrams ?? "未记录"
            }}{{ record.reportedEfwGrams ? " g" : "" }}</text
          ><text class="ga-caption"
            >{{ record.formulaVersion }} · {{ record.referenceVersion }}</text
          ><text v-if="record.rawInputs" class="ga-caption"
            >原始输入：{{ JSON.stringify(record.rawInputs) }}</text
          ></view
        ></GaCard
      ><GaLinkRow title="查看生长曲线" url="/pages/growth/chart" /><GaLinkRow
        v-if="record.profileId === profile.activeProfileId"
        title="编辑测量（保存修订）"
        :url="'/pages/growth/biometry?sessionId=' + record.id"
    /></template>
    <template v-else-if="observation"
      ><GaNotice
        :title="getTool(observation.tool)?.title || '原始观察记录'"
        :text="`${observation.date} · ${observation.gaDays !== null ? formatGestation(observation.gaDays) : '孕周未记录'} · 胎儿 ${observation.fetus}`" /><GaCard
        ><view class="ga-stack"
          ><view v-for="(value, key) in observation.raw" :key="key"
            ><text
              >{{
                getTool(observation.tool)?.fields.find((f) => f.key === key)
                  ?.label || key
              }}：{{ value || "未填写" }}</text
            ></view
          ><text class="ga-caption"
            >长度录入单位 {{ observation.unit }}；标准化长度 cm / 面积 cm²</text
          ></view
        ></GaCard
      ><GaCard v-for="value in observation.values" :key="value.label"
        ><text
          >{{ value.label }}：{{ Number(value.value.toPrecision(8)) }}
          {{ value.unit }}</text
        ></GaCard
      ><GaNotice
        title="结果边界"
        text="原始输入快照，参考模型尚未核验；算术值不等于诊断或临床分类。" /><GaReference
        :ids="observation.referenceIds"
    /></template>
    <template v-else-if="!id && entry"
      ><GaNotice
        :title="entry.label"
        :text="`${entry.fetusCount === 2 ? '双胎' : '单胎'} · 绒毛膜性 ${entry.chorionicity} · 本地档案`" /><GaCard
        ><view class="ga-stack"
          ><text>孕期基准：{{ entry.basis?.method || "待补充" }}</text
          ><text>等效末次月经：{{ entry.basis?.lmpEquivalent || "—" }}</text
          ><text>预产期：{{ entry.basis?.edd || "—" }}</text
          ><text v-if="entry.basis?.input" class="ga-muted"
            >原输入：{{ JSON.stringify(entry.basis.input) }}</text
          ><text>基准历史修订 {{ entry.basisHistory.length }} 次</text
          ><view
            v-for="(basis, index) in entry.basisHistory"
            :key="index"
            class="ga-muted"
            >{{ basis.createdAt }} · {{ basis.method }} · LMP
            {{ basis.lmpEquivalent }}</view
          ></view
        ></GaCard
      ><GaLinkRow
        v-if="entry.id === profile.activeProfileId"
        title="补充 / 修订孕期基准"
        url="/pages/pregnancy/edd" /><GaLinkRow
        title="管理档案"
        url="/pages/profile/manage"
    /></template>
    <GaNotice
      v-else
      title="记录不存在或已删除"
      text="请返回档案重新选择，其他档案的数据不会自动带入。"
    />
    <text v-if="error" class="error">{{ error }}</text
    ><template v-if="record || observation" #actions
      ><GaButton @click="share">分享预览</GaButton
      ><GaButton variant="secondary" @click="remove"
        >删除记录</GaButton
      ></template
    ></GaPage
  >
</template>
<style scoped>
.error {
  color: var(--danger);
}
.ga-caption {
  overflow-wrap: anywhere;
}
</style>
