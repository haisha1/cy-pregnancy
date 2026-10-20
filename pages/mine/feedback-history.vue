<script setup lang="ts">
/**
 * 反馈历史：读取本地反馈草稿列表，没有真实服务端工单状态。
 * <script setup> 中的顶层变量、函数和导入可直接在模板里使用，不需要再写 data、methods 或 return。
 */
import { useWorkspaceStore } from "../../store/workspace";
import GaPage from "../../components/GaPage.vue";
import GaNotice from "../../components/GaNotice.vue";
import GaCard from "../../components/GaCard.vue";
import GaEmpty from "../../components/GaEmpty.vue";
import GaLinkRow from "../../components/GaLinkRow.vue";
const workspace = useWorkspaceStore();
</script>
<template>
  <GaPage title="反馈草稿与状态" back
    ><GaNotice
      title="尚未发送到服务端"
      text="下列内容保存在本机，没有工单编号、处理回复或云端副本。真实提交服务接通后还需要你主动确认发送。" /><GaCard
      v-for="item in [...workspace.state.feedback].reverse()"
      :key="item.id"
      ><view class="ga-stack"
        ><text>{{ item.category }} · 本机草稿</text><text>{{ item.body }}</text
        ><text class="ga-caption">{{ item.createdAt }}</text></view
      ></GaCard
    ><GaEmpty
      v-if="!workspace.state.feedback.length"
      title="还没有反馈草稿"
      description="可以先把问题记下来。" /><GaLinkRow
      title="新增反馈草稿"
      url="/pages/mine/feedback"
  /></GaPage>
</template>
