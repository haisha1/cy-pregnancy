<script setup lang="ts">
/**
 * 分享卡片：同一组标题和文本用于预览及 canvas 图片；父组件通过组件 ref 调用暴露的 exportImage 方法。
 * <script setup> 中的顶层变量、函数和导入可直接在模板里使用，不需要再写 data、methods 或 return。
 */
import { computed, getCurrentInstance, nextTick, ref } from "vue";
import { useAppStore } from "../store/app";
import { getChartColors } from "../styles/theme";
import GaCard from "./GaCard.vue";
// defineProps 是 <script setup> 编译宏，声明父组件传入的参数；props 遵循单向数据流，子组件应通过事件请求更新。
const props = defineProps<{ title: string; lines: string[] }>();
const app = useAppStore(),
  instance = getCurrentInstance();
// ref 创建响应式状态；脚本读写用 .value，模板中作为顶层绑定使用时会自动解包。修改它后，依赖它的界面会更新。
// computed 表示从现有状态推导出的值，会跟踪依赖并缓存结果；依赖变化后才重新求值，不用手动同步另一份状态。
const canvasId = "ga-share-" + instance?.uid,
  width = ref(310),
  height = computed(() => 180 + props.lines.length * 80),
  generating = ref(false);
async function exportImage(): Promise<string> {
  if (generating.value) throw Error("图片正在生成");
  generating.value = true;
  try {
    await nextTick();
    // nextTick 等待本轮响应式数据对应的视图更新完成，再读取和绘制画布。
    const ctx = uni.createCanvasContext(canvasId, instance?.proxy),
      colors = getChartColors(app.theme);
    ctx.setFillStyle(colors.background);
    ctx.fillRect(0, 0, width.value, height.value);
    ctx.setFillStyle(colors.primary);
    ctx.setFontSize(17);
    ctx.fillText(props.title, 16, 30);
    ctx.setFillStyle(colors.textSecondary);
    ctx.setFontSize(12);
    let y = 60;
    for (const line of props.lines) {
      let row = "";
      for (const char of line) {
        if (ctx.measureText(row + char).width > width.value - 32) {
          ctx.fillText(row, 16, y);
          y += 20;
          row = char;
        } else row += char;
      }
      if (row) {
        ctx.fillText(row, 16, y);
        y += 20;
      }
      y += 10;
    }
    ctx.fillText("结果仅供参考，不能替代执业医师诊断。", 16, height.value - 20);
    // 把 uni-app 的回调接口包装成 Promise，确保绘制结束后才导出，防止得到空白图片。
    await new Promise<void>((r) => ctx.draw(false, r));
    return await new Promise((resolve, reject) =>
      uni.canvasToTempFilePath(
        {
          canvasId,
          width: width.value,
          height: height.value,
          destWidth: width.value * 2,
          destHeight: height.value * 2,
          fileType: "png",
          success: (r) => resolve(r.tempFilePath),
          fail: () => reject(Error("图片生成失败，请重试")),
        },
        instance?.proxy,
      ),
    );
  } finally {
    // 无论成功或失败都恢复按钮状态；finally 不会吞掉错误，调用页面仍需提示失败。
    generating.value = false;
  }
}
// script setup 默认不向父组件公开内部方法；defineExpose 显式允许父组件通过组件 ref 调用这里的方法。
defineExpose({ exportImage });
</script>
<template>
  <GaCard
    ><view class="ga-stack"
      ><text class="share-title">{{ title }}</text
      ><text v-for="(line, index) in lines" :key="index" class="share-line">{{
        line
      }}</text
      ><text class="ga-caption"
        >结果仅供参考，不能替代执业医师诊断。</text
      ></view
    ><canvas
      :id="canvasId"
      :canvas-id="canvasId"
      class="share-canvas"
      :style="{ height: height + 'px' }"
      aria-hidden="true"
  /></GaCard>
</template>
<style scoped>
.share-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--primary);
}
.share-line {
  font-size: 14px;
  line-height: 23px;
  overflow-wrap: anywhere;
}
.share-canvas {
  position: fixed;
  left: -10000px;
  top: 0;
  width: 310px;
  pointer-events: none;
}
</style>
