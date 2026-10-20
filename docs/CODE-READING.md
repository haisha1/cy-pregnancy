# Vue3与本项目代码阅读

先读main.ts：createApp安装Pinia；App.vue在onLaunch恢复偏好、档案和账号缓存。启动恢复不等于微信登录。

Vue单文件组件包含script setup、template、style。script setup顶层变量可直接在模板使用。ref声明响应式状态，脚本读写用.value，模板自动解包；computed推导值，不手工维护第二份状态；watch处理搜索等副作用，不在其中复制计算公式。defineProps是父传子的只读参数，defineEmits向父组件发送事件，v-model对应modelValue和update:modelValue。onLoad/onShow属于uni-app页面生命周期，onMounted属于Vue组件生命周期。

按一条功能链阅读：pages/pregnancy/edd.vue收集输入 → engine/gestation.ts纯函数计算 → store/profile.ts先持久化再更新状态 → pages/profile/index.vue展示。保存不上传服务器，基准修订不重算历史测量快照。

账号链：GaAccountGate → store/account.ts → api/wechat.ts取得一次性code → api/http.ts请求服务端。账号store合并并发续期，异常恢复为游客；页面负责展示错误。头像昵称与健康档案分区。

知识链：GaPublishedKnowledge → 用户服务/api/v1/knowledge → 管理服务内部只读接口，只读取当前发布指针。专业/白话读取同一发布版本的两个字段。原本地PRD资料仍单独标“编审中”，不冒充已发布版本。

组件公共样式来自styles/theme.ts和tokens.scss；GaPage负责页面壳层，GaButton/Card/Field/Search/LinkRow负责复用。新增逻辑应放engine、api或store，页面组合这些能力。进一步对照见[React开发者速学Vue3](React开发者快速入门Vue3.md)。
