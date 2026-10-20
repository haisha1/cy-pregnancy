/**
 * 应用入口：创建 Vue 应用并安装 Pinia。uni-app 调用 createApp，页面无需自行创建应用实例。
 */
import { createSSRApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
export function createApp() {
  // 这是 uni-app Vue 3 工程约定的工厂入口；安装插件后返回 app，由框架继续完成各端的挂载。
  const app = createSSRApp(App);
  app.use(createPinia());
  return { app };
}
