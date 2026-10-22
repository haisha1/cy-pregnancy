# 春雨孕算工具 · 前端

工程位于 `D:\code\cy-pregnancy\app\cy-pregnancy`，使用 uni-app + Vue 3 + TypeScript + Pinia，保留 HBuilderX 的根目录源码结构。四项目入口及完整联调记录见根目录README和docs/INTEGRATION.md。

重新熟悉 Vue 3 时，先看 [Vue 3 代码阅读指南](docs/CODE-READING.md)。页面、公共组件、store 和计算文件中补充了中文注释，说明基础语法、数据流和保存边界；指南也给出了建议阅读顺序。

H5 与微信小程序分别发布，共用现有 Java 后端。H5 的 Jenkins、Docker、SSH 预览和域名入口见 [H5 部署说明](docs/H5部署说明.md)。

## 运行

2026-10-19补充：已接入微信账号与选填头像昵称，默认游客，仅档案及其子页提示登录。工具、知识和「我的」不主动弹登录。健康记录仍仅存本机。配置与真实微信待验项见[微信登录与服务端联调](docs/微信登录与服务端联调.md)。新增账号资料和个人信息说明两条路由，当前共27条路由。

2026-10-19 已按 `docs/prd` 与 Figma 完整交付扩展至 **25 条复用路由**：多普勒五分支、NT、MVP/AFI、预产期年龄、双胎与专科输入，37项脏器目录，22条知识与17条宫内治疗主题，多档案/胎儿A-B隔离、基准修订、产检安排、收藏、反馈草稿、本机备份及分享图片。专业/白话唯一入口已收敛到「我的」外层。

PRD的52逻辑页/56显式功能类型复用这些路由与通用状态组件，逐项映射见 `../../docs/figma-build/implementation-20261019.json`；本轮验证及未接能力见 `../../docs/12-PRD全量前端扩展与验收记录.md`。**这份映射证明前端绑定，不表示临床审批或后端服务已完成。**

安装 Node.js 20.19+，在本目录执行 `npm ci`。HBuilderX 中打开本目录，选择“运行到浏览器”或“运行到小程序模拟器 → 微信开发者工具”。微信真机/提审前填写 `manifest.json` 的 `mp-weixin.appid`；不填入他人 AppID。

也可使用命令行：

```sh
npm run dev:h5
npm run dev:mp-weixin
npm run build:h5
npm run build:mp-weixin
```

H5 预览：`http://127.0.0.1:5173`。产物：`unpackage/dist/build/h5`、`unpackage/dist/build/mp-weixin`。`scripts/uni.mjs` 负责将根源码布局适配 CLI，不需要再复制一份 src。

## 已接通的页面

- 首页与全部工具：共享工具网格、建档空态和当前孕周卡。
- 预产期/孕周：末次月经、CRL、胚胎移植、已知孕周、已知预产期，支持日期与孕周互查。
- 胎儿生长：BPD/HC/AC/FL/CRL 录入、逐项 cm/mm 换算、Hadlock 四参数估重、保存与同日覆盖确认。
- 生长曲线：真实历史点、指标切换、记录回看和本地 PNG 导出。
- 档案/我的：本地持久化、删除确认、浅深色、专业/白话偏好与论文依据。

## 维护边界

`components/Ga*.vue` 是统一组件层；页面只组合组件与管理交互。`styles/theme.ts` 是颜色唯一来源，`styles/tokens.scss` 管理非颜色变量，canvas 与页面读取同一主题。参见 `DESIGN.md` 与 `UX-CONTRACT.md`。

`engine/` 只维护纯 TypeScript 算法和校验，不依赖 Vue、uni、网络或存储；`data/references.ts` 维护公式来源与版本；`types/medical.ts` 统一医学契约。新增计算必须先核对原始论文、单位、适用范围与对照算例，再接页面，不得在 Vue 文件写公式。

`store/profile.ts` 是档案唯一持久化入口，使用 `cy:profile:v1`；`store/app.ts` 使用 `cy:app:v1`。测量保存统一 cm，孕周与公式版本保存快照，更新基准不改写既有快照。写入失败不更新内存；损坏存储会显示错误并阻止覆盖原始数据。当前未提供云同步。

原 hello-uniapp 模板不参与当前构建，MIT LICENSE 保留。遗留备份已列入根docs/cleanup-20261019.json；目录删除被工具策略拒绝，仍保留原路径。

## 验证

```sh
npm run typecheck
npm test
npm run test:e2e
npm run check:design
npm run build:h5
npm run build:mp-weixin
npm run audit:dependencies
```

浏览器测试当前使用系统 Microsoft Edge（`playwright.config.ts`），可按本机环境改为已安装的 Playwright Chromium。视觉截图位于 `artifacts/`，静态 UI 审计结果为 `premium-audit.json`。依赖审计有告警时退出码为 1，并保存机器可读报告；不要用 `npm audit fix --force` 将 uni-app Vue3 编译器误降级到旧 npm latest 标签。

## 微信开发者工具白屏排查

若 Console 出现 `WXSS 文件编译错误`，先修复这条错误。微信 WXSS 不接受本项目曾使用的 `.ga-row > *` 及 `> :first-child` 写法；已改用明确的布局容器类名，避免 Vue scoped 编译后被微信拒绝。不要直接修改 `unpackage` 中的生成文件。

`npm run build:mp-weixin` 会检查生成的 WXSS 中已知不兼容选择器。HBuilderX 运行产物也可执行 `npm run check:wxss -- unpackage/dist/dev/mp-weixin` 检查；该检查不能代替微信开发者工具和真机验证。

修复后在 HBuilderX 停止运行，再次运行到微信开发者工具并重新编译；若仍显示旧选择器，清除开发者工具编译缓存后再编译。`getSystemInfoSync is deprecated`、开发模式域名校验提示及 preload 提示应与编译错误分开判断，本次启动主题读取已改用 `getAppBaseInfo`。

## 微信导航与布局适配

工具、档案、我的现在共用 `GaMainHome`，仅通过 `store/mainNavigation.ts` 改变选中项和内容可见性，不再调用微信Tab路由。顶部、背景及底栏保留，三个 `scroll-view` 独立滚动。原三个入口URL继续可用；`utils/navigation.ts` 从二级页优先返回栈中已有主界面。此前的原生Tab配置与空白 `custom-tab-bar` 组件已移除，请在HBuilderX停止后重新运行，微信开发者工具清除编译缓存后重新预览真机。

公共导航在首次渲染前读取状态栏和胶囊矩形，处理标题对齐、左右避让及窗口尺寸变化；微信端背景不再等待光晕SVG解码，卡片以相同玻璃填充与阴影替代实时背景模糊。登录区与发布知识区使用独立 `ga-stack` 根容器，保持组件内部卡片间距。`GaAccountBoundary` 只在进入档案且已经登录时验证身份，游客切换不发起账号请求。后续新增组合组件也应明确布局根节点，避免依赖H5多根节点的布局表现。

2026-10-20验证：51项单元测试、23项浏览器测试通过，覆盖首次/连续切换保持外壳节点、零路由调用、游客零账号请求、320px档案间距和三组胶囊几何布局。编译检查和浏览器验证不能证明手机上的实际帧率或首次响应时间；仍需在iOS/Android微信验证冷启动、底栏首次/连续切换、滚动位置、二级页返回和深色模式。实现依据：[uni-app路由](https://uniapp.dcloud.net.cn/collocation/pages.html)、[自定义导航胶囊适配](https://uniapp.dcloud.net.cn/component/uniui/uni-nav-bar)。

## 尚未开放

INTERGROWTH/CUHK 的百分位、Z-score、均值和 ±2SD 曲线仍待论文参数复核。NT、多普勒、羊水、年龄及专科工具的表单已开放，但未获批参考模型不生成临床分类、疾病概率、分期、评分或输血用量。确定性日期/估重和新增CPR、双侧PI均值、AFI合计、双胎算术差异分别标明来源与边界。产检安排为用户自定义，不自动推断检查完成。

OCR识别、云同步、订阅提醒、云端分享和反馈接收尚未接通；可查看真实未接通态、选择本机图片预览、保存本机草稿，不模拟服务成功。正式公开发布前仍需真实 AppID、正式隐私政策、医学审阅及 iOS/Android 微信真机验证。

完整医学依据与已纠正草案公式见 `../../docs/10-前端医学引擎依据与核验记录.md`；当前工程回归测试不能代替独立临床验证。
