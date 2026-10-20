<template>
  <view class="ga-stack">
    <GaAccountSummary />
    <GaLinkRow
      :title="
        profile.profiles.find((p) => p.id === profile.activeProfileId)?.label ||
        '管理我的孕期档案'
      "
      subtitle="切换 / 新建 / 归档，数据按孕期隔离"
      url="/pages/profile/manage"
    />
    <GaLinkRow
      title="产检时间表"
      subtitle="查看与新增本机安排"
      url="/pages/timeline/index"
    />
    <GaLinkRow
      title="当前档案详情"
      subtitle="基准来源、原输入与修订历史"
      url="/pages/profile/detail"
    />
    <GaLinkRow
      v-for="item in workspace.state.observations
        .filter((o) => o.profileId === profile.activeProfileId)
        .slice()
        .reverse()"
      :key="item.id"
      :title="getTool(item.tool)?.title || '脏器测量记录'"
      :subtitle="`${item.date} · 胎儿 ${item.fetus} · 本地输入快照`"
      :url="'/pages/profile/detail?id=' + item.id"
    />
    <template v-if="profile.basis">
      <GaHero :lmp-equivalent="profile.basis.lmpEquivalent" />
      <GaCard>
        <view class="overview">
          <view class="overview-icon"><GaIcon name="user" /></view>
          <view class="overview-copy">
            <text class="overview-title">本次怀孕</text>
            <text class="caption">已保存检查 {{ records.length }} 次</text>
            <text class="caption"
              >{{ methodLabel }} ·
              {{
                summary?.status === "ready"
                  ? `预产期 ${summary.value.edd}`
                  : "请核对孕期基准"
              }}</text
            >
          </view>
        </view>
        <view class="basis-actions">
          <GaButton variant="text" @click="openDating">更新孕期基准</GaButton>
          <GaButton
            variant="text"
            :disabled="records.length === 0"
            @click="openChart"
            >查看生长曲线</GaButton
          >
        </view>
      </GaCard>

      <GaSection title="产检时间轴" />
      <GaCard>
        <view class="timeline">
          <view class="timeline-marker"><GaIcon name="calendar" /></view>
          <view class="timeline-copy">
            <view class="timeline-heading"
              ><text>产检计划</text
              ><text class="timeline-state">待确认</text></view
            >
            <text class="caption">请按产科医生确认的检查项目与日期预约。</text>
          </view>
        </view>
      </GaCard>

      <GaSection title="B 超记录" />
      <template v-if="records.length">
        <GaCard v-for="session in records" :key="session.id">
          <button
            class="session"
            role="button"
            tabindex="0"
            :aria-label="`查看 ${session.date} 的 B 超记录`"
            @click="openSession(session.id)"
          >
            <view class="session-copy">
              <text class="session-title">{{ session.date }}</text>
              <text class="caption"
                >{{ formatGestation(session.gaDays) }} ·
                {{ Object.keys(session.measurements).length }} 项测量</text
              >
              <view class="session-tags">
                <text class="session-tag">{{
                  session.standard === "CUHK" ? "CUHK" : "INTERGROWTH-21st"
                }}</text>
                <text v-if="session.efwGrams !== null" class="session-tag"
                  >估重 {{ session.efwGrams.toFixed(0) }} g</text
                >
              </view>
            </view>
            <text class="session-arrow" aria-hidden="true">›</text>
          </button>
          <view class="record-actions"
            ><GaButton
              variant="text"
              @click="deleteSession(session.id, session.date)"
              >删除这次记录</GaButton
            ></view
          >
        </GaCard>
      </template>
      <GaEmpty
        v-else
        title="还没有 B 超记录"
        description="在胎儿生长工具中输入测量值并保存，记录会出现在这里。"
      />
      <GaButton variant="secondary" @click="openGrowth"
        >记录一次 B 超测量</GaButton
      >
      <text v-if="recordError" class="record-error" role="alert">{{
        recordError
      }}</text>
    </template>
    <template v-else>
      <GaEmpty
        title="建立属于你的孕期档案"
        description="先保存孕期基准，再把每次 B 超测量记录在一起，方便复查时查看。"
      />
      <GaButton @click="openDating">建立我的孕期档案</GaButton>
      <GaCard
        ><text class="caption"
          >档案保存在当前设备。清理应用数据或更换设备可能导致本地记录丢失。</text
        ></GaCard
      >
    </template>
  </view>
</template>

<script setup lang="ts">
/**
 * 档案概览：读取当前档案的基准、测量和扩展观察记录；记录详情和编辑使用独立入口。
 * <script setup> 中的顶层变量、函数和导入可直接在模板里使用，不需要再写 data、methods 或 return。
 */
import { computed, ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import GaLinkRow from "@/components/GaLinkRow.vue";
import { useWorkspaceStore } from "@/store/workspace";
import { getTool } from "@/data/tool-definitions";
import GaHero from "@/components/GaHero.vue";
import GaCard from "@/components/GaCard.vue";
import GaIcon from "@/components/GaIcon.vue";
import GaButton from "@/components/GaButton.vue";
import GaSection from "@/components/GaSection.vue";
import GaEmpty from "@/components/GaEmpty.vue";
import { useProfileStore } from "@/store/profile";
import {
  formatGestation,
  getPregnancySummary,
  todayISO,
} from "@/engine/gestation";
import { confirmAction, notify } from "@/utils/feedback";

const profile = useProfileStore();
const workspace = useWorkspaceStore();
// ref 创建响应式状态；脚本读写用 .value，模板中作为顶层绑定使用时会自动解包。修改它后，依赖它的界面会更新。
const asOfDate = ref(todayISO());
// uni-app 的 onShow 在页面每次显示时触发，包括从下一页返回；适合刷新当天日期或最新本地状态。
onShow(() => {
  asOfDate.value = todayISO();
});
const recordError = ref("");
const deleting = ref(false);
// computed 表示从现有状态推导出的值，会跟踪依赖并缓存结果；依赖变化后才重新求值，不用手动同步另一份状态。
const records = computed(() =>
  [...profile.records].sort((a, b) => b.date.localeCompare(a.date)),
);
const summary = computed(() =>
  profile.basis ? getPregnancySummary(profile.basis, asOfDate.value) : null,
);
const methodLabels: Record<string, string> = {
  LMP: "末次月经",
  EDD: "已知预产期",
  CRL: "早孕 CRL",
  IVF: "胚胎移植",
  KNOWN_GA: "已知孕周",
};
const methodLabel = computed(() =>
  profile.basis ? (methodLabels[profile.basis.method] ?? "孕期基准") : "",
);
const openDating = () => uni.navigateTo({ url: "/pages/pregnancy/edd" });
const openGrowth = () => uni.navigateTo({ url: "/pages/growth/biometry" });
const openChart = () => uni.navigateTo({ url: "/pages/growth/chart" });
const openSession = (id: string) =>
  uni.navigateTo({ url: `/pages/profile/detail?id=${encodeURIComponent(id)}` });

async function deleteSession(id: string, date: string) {
  if (deleting.value) return;
  deleting.value = true;
  recordError.value = "";
  try {
    if (
      !(await confirmAction(
        "删除这次 B 超记录？",
        `将删除 ${date} 的测量记录，删除后无法恢复。`,
      ))
    )
      return;
    const result = profile.removeMeasurement(id);
    if (!result.ok) {
      recordError.value = result.message ?? "删除失败，请稍后重试。";
      notify(recordError.value, "error");
      return;
    }
    notify("测量记录已删除", "success");
  } finally {
    deleting.value = false;
  }
}
</script>

<style scoped>
.overview {
  display: flex;
  gap: 16px;
  align-items: center;
}
.overview-icon {
  width: 64px;
  height: 64px;
  border: 2px solid var(--primary);
  color: var(--primary);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: var(--tint-blue);
}
.overview-copy {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.overview-title {
  color: var(--text-primary);
  font-size: 17px;
  line-height: 24px;
  font-weight: 500;
}
.caption {
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 19px;
}
.basis-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12px;
  gap: 8px;
}
.timeline {
  display: flex;
  align-items: center;
  gap: 12px;
}
.timeline-marker {
  color: var(--primary);
  flex-shrink: 0;
}
.timeline-copy {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 4px;
}
.timeline-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: var(--text-primary);
  font-size: 15px;
  line-height: 22px;
}
.timeline-state {
  color: var(--text-secondary);
  font-size: 12px;
}
.session {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 0;
  margin: 0;
  width: 100%;
  border: 0;
  background: transparent;
  text-align: left;
  border-radius: 8px;
  line-height: inherit;
}
.session::after {
  border: 0;
}
.session:active {
  opacity: 0.72;
}
.session:hover {
  background: var(--tint-blue);
}
.session {
  cursor: pointer;
}
.session:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 4px;
}
.session-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.session-title {
  color: var(--text-primary);
  font-size: 15px;
  line-height: 22px;
  font-variant-numeric: tabular-nums;
}
.session-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 4px;
}
.session-tag {
  color: var(--primary);
  background: var(--tint-blue);
  padding: 4px 6px;
  border-radius: 8px;
  font-size: 11px;
  line-height: 16px;
}
.session-arrow {
  flex-shrink: 0;
  color: var(--text-tertiary);
  font-size: 26px;
}
.record-actions {
  display: flex;
  justify-content: flex-end;
  padding-top: 6px;
}
.record-error {
  color: var(--danger);
  font-size: 13px;
  line-height: 21px;
}
</style>
