<script setup lang="ts">
/**
 * 关于页面：展示产品信息与使用边界，复用统一页面容器和说明组件。
 * <script setup> 中的顶层变量、函数和导入可直接在模板里使用，不需要再写 data、methods 或 return。
 */
import { version } from "../../package.json";
import { REFERENCE_VERSION } from "../../data/references";
import GaPage from "../../components/GaPage.vue";
import GaCard from "../../components/GaCard.vue";
import GaNotice from "../../components/GaNotice.vue";
import GaLinkRow from "../../components/GaLinkRow.vue";
</script>
<template>
  <GaPage title="关于" back disclaimer
    ><GaNotice
      title="春雨孕算工具 · 开发版"
      text="孕期日期换算、测量记录、参考资料与沟通辅助。不是诊断、处方或治疗服务。" /><GaCard
      ><view class="ga-stack"
        ><text>应用版本 {{ version }}</text
        ><text class="ga-muted">参考版本 {{ REFERENCE_VERSION }}</text
        ><text>提供方主体：待登记</text
        ><text>临床参数与内容：按模型逐项待审核</text
        ><text>当前服务：本机使用，未接通云端 / OCR</text></view
      ></GaCard
    ><GaLinkRow
      title="参考文献与使用范围"
      url="/pages/mine/references" /><GaLinkRow
      title="隐私与本地数据"
      url="/pages/mine/data" /><GaLinkRow
      title="反馈功能与数据疑问"
      url="/pages/mine/feedback"
  /></GaPage>
</template>
