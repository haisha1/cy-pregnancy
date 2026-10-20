<script setup lang="ts">
/**
 * 偏好设置：通过 app store 的方法更新并持久化设置，不直接修改 store 字段，以便处理存储失败。
 * <script setup> 中的顶层变量、函数和导入可直接在模板里使用，不需要再写 data、methods 或 return。
 */
import { useAppStore } from "../../store/app";
import { confirmAction, notify } from "../../utils/feedback";
import GaPage from "../../components/GaPage.vue";
import GaCard from "../../components/GaCard.vue";
import GaTabs from "../../components/GaTabs.vue";
import GaNotice from "../../components/GaNotice.vue";
import GaButton from "../../components/GaButton.vue";
const app = useAppStore();
function theme(v: string) {
  if (v === "system" || v === "light" || v === "dark") app.setTheme(v);
}
function unit(v: string) {
  if (v === "cm" || v === "mm") app.setLengthUnit(v);
}
async function reset() {
  if (
    await confirmAction(
      "恢复通用偏好默认值？",
      "恢复跟随系统主题、cm单位与默认参考标准，不改变说明方式、档案或历史测量。",
    )
  ) {
    if (app.restoreDefaults()) notify("通用偏好已恢复", "success");
  }
}
</script>
<template>
  <GaPage title="通用偏好" back
    ><GaNotice
      title="显示偏好独立生效"
      text="只影响以后新建会话，不重算历史快照。专业 / 白话请在「我的」最外层设置。"
    /><GaCard
      ><view class="ga-stack"
        ><text>界面主题</text
        ><GaTabs
          :model-value="app.themePreference"
          :items="[
            { label: '跟随系统', value: 'system' },
            { label: '浅色', value: 'light' },
            { label: '深色', value: 'dark' },
          ]"
          @update:model-value="theme" /></view></GaCard
    ><GaCard
      ><view class="ga-stack"
        ><text>默认长度单位</text
        ><GaTabs
          :model-value="app.lengthUnit"
          :items="[
            { label: '厘米 cm', value: 'cm' },
            { label: '毫米 mm', value: 'mm' },
          ]"
          @update:model-value="unit" /></view></GaCard
    ><GaCard
      ><view class="ga-stack"
        ><text>默认参考标准</text
        ><GaTabs
          :model-value="app.standard"
          :items="[
            { label: 'INTERGROWTH', value: 'INTERGROWTH' },
            { label: 'CUHK 待核验', value: 'CUHK', disabled: true },
          ]"
        /><text class="ga-muted"
          >生长参考数据尚未批准，当前不输出百分位；已知标准不代表其参数已可用。</text
        ></view
      ></GaCard
    ><GaButton variant="secondary" @click="reset"
      >恢复通用偏好默认值</GaButton
    ></GaPage
  >
</template>
