<script setup lang="ts">
/**
 * 应用根组件：在启动时恢复本地状态，并加载所有页面共用的样式；具体页面由 pages.json 注册。
 * <script setup> 中的顶层变量、函数和导入可直接在模板里使用，不需要再写 data、methods 或 return。
 */
import { onLaunch } from "@dcloudio/uni-app";
import { useAppStore } from "./store/app";
import { useProfileStore } from "./store/profile";
import { useAccountStore } from "./store/account";
// onLaunch 是 uni-app 应用启动钩子；在这里恢复持久化数据，而不是每进入一个页面都重新初始化全部状态。
onLaunch(() => {
  useAppStore().hydrate();
  useProfileStore().hydrate();
  useAccountStore().hydrate();
});
</script>
<style lang="scss">
@import "./styles/tokens.scss";
@import "./styles/glass.scss";
@import "./styles/base.scss";
</style>
