<script setup lang="ts">
/**
 * 工具来源组件：使用文献 ID 查询集中维护的元数据，计算代码只需返回 ID，不重复硬编码引用文案。
 * <script setup> 中的顶层变量、函数和导入可直接在模板里使用，不需要再写 data、methods 或 return。
 */
import { computed, ref } from "vue";
import { getReferences } from "../data/references";
import { notify } from "../utils/feedback";
// defineProps 是 <script setup> 编译宏，声明父组件传入的参数；props 遵循单向数据流，子组件应通过事件请求更新。
const props = defineProps<{ ids: readonly string[] }>();
// ref 创建响应式状态；脚本读写用 .value，模板中作为顶层绑定使用时会自动解包。修改它后，依赖它的界面会更新。
const expanded = ref(false);
// computed 表示从现有状态推导出的值，会跟踪依赖并缓存结果；依赖变化后才重新求值，不用手动同步另一份状态。
const references = computed(() => getReferences(props.ids));
function copy(url: string) {
  uni.setClipboardData({
    data: url,
    success: () => notify("文献链接已复制", "success"),
    fail: () => notify("复制失败，请重试", "error"),
  });
}
</script>
<template>
  <view class="ga-reference ga-glass">
    <button
      class="ga-reference__toggle"
      :aria-expanded="expanded"
      @click="expanded = !expanded"
    >
      <text>论文与计算依据 · {{ references.length }}</text
      ><text>{{ expanded ? "收起 −" : "展开 +" }}</text>
    </button>
    <view v-if="expanded" class="ga-reference__list">
      <view
        v-for="reference in references"
        :key="reference.id"
        class="ga-reference__entry"
      >
        <text class="ga-reference__title">{{ reference.title }}</text>
        <text class="ga-reference__meta"
          >{{ reference.authors }} · {{ reference.journal }} ·
          {{ reference.year }}</text
        >
        <text class="ga-reference__meta">{{ reference.scope }}</text>
        <text v-if="reference.formula" class="ga-reference__formula">{{
          reference.formula
        }}</text>
        <text v-if="reference.note" class="ga-reference__meta">{{
          reference.note
        }}</text>
        <button class="ga-reference__link" @click="copy(reference.url)">
          复制原文链接 ↗
        </button>
      </view>
    </view>
  </view>
</template>
<style scoped>
.ga-reference {
  padding: 12px 16px;
  border-radius: var(--radius-16);
}
.ga-reference__toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  min-height: 28px;
  padding: 0;
  margin: 0;
  background: transparent;
  font-size: 12px;
  color: var(--text-secondary);
}
.ga-reference__list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-top: 16px;
}
.ga-reference__entry {
  display: flex;
  flex-direction: column;
  gap: 6px;
  overflow-wrap: anywhere;
}
.ga-reference__title {
  font-size: 13px;
  font-weight: 500;
}
.ga-reference__meta,
.ga-reference__formula {
  font-size: 11px;
  color: var(--text-secondary);
}
.ga-reference__link {
  color: var(--primary);
  font-size: 12px;
  padding: 6px 0;
  margin: 0;
  text-align: left;
  background: transparent;
}
</style>
