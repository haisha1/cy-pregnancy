---
version: alpha
name: "春雨孕算工具"
description: "以 Figma 玻璃材质原型为依据的孕周与超声测量工具"
colors:
  primary: "#2F6BFF"
  secondary: "#34C9B8"
  background: "#EAF2FF"
  text: "#1A1A2E"
  muted: "#5A6178"
  success: "#008755"
  warning: "#A65300"
  danger: "#CB2546"
typography:
  sans:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Noto Sans SC, PingFang SC, Microsoft YaHei, sans-serif"
  numeric:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
rounded:
  sm: "8px"
  md: "16px"
  lg: "24px"
spacing:
  page: "20px"
  gap: "16px"
  compact: "8px"
components:
  button:
    height: "44px"
    textColor: "{colors.text}"
  card:
    rounded: "{rounded.lg}"
  input:
    height: "44px"
    textColor: "{colors.muted}"
  success:
    textColor: "{colors.success}"
  warning:
    textColor: "{colors.warning}"
  danger:
    textColor: "{colors.danger}"
---

# 春雨孕算工具 Design System

## Overview

原型来源：[Obstetrics-Tools · Design System](https://www.figma.com/design/v2qVMT75ALDDAhMiKboLlD?node-id=12-2)。面向中文孕期工具用户与医学生，优先完成孕周换算、超声测量录入和本地回看。主要环境为微信小程序，H5 用于开发校验。语言为简体中文；日期存 YYYY-MM-DD，当前日期取设备当地日历，纯日期运算使用 UTC 日序号避免时区漂移。

标志性视觉为蓝青孕周卡、蓝青粉背景光晕、圆角玻璃卡。依据 docs/prd 与 Figma 完整交付扩展工具、档案、知识、专科及服务边界，沿用双主题。专业/白话唯一可写入口为 S18「我的」最外层，所有子页读取全局偏好。可读性优先于透明度；医学结果不可用装饰性假数据补齐。

颜色唯一运行来源为 `styles/theme.ts` 的 palettes；GaPage 将其适配为 CSS 变量，canvas 通过 getChartColors 读取同源值。`styles/tokens.scss` 拥有间距、圆角和字体变量；本文件记录 accepted values，不生成第二套 token。深色 primary 使用更亮的 #79A4FF，文字三级色与语义色适度加深/提亮，以保证玻璃背景上的可读性，这是相对设计稿的可访问性调整。

## Colors

主色只用于选中与操作。primary→`--primary`；secondary→`--primary-gradientEnd`；text/muted→`--text-primary/secondary`；语义色→`--success/warning/danger`。浅色背景 EAF2FF→E6F7F4→FFF0F6；深色背景 0B1020→111C38→16132E。未验证参考值显示中性“待核验”，禁止绿色“正常”误导。色彩必须配文字说明。

## Typography

中文系统无衬线字体，避免远程字体请求；数字使用 tabular-nums 和 numeric 字体栈。正文 14px/1.5，标签 13px，辅助文字 12px，结果数字 34px/40px，标题 17px/24px。白话模式保留准确数值，增加四段式解释，不自动生成判断。

## Layout

390px 画板为基准，左右 20px、卡片间 16px；内容最大 540px，320px 仍可操作。页面自然滚动，顶部 sticky 导航，底部 actions/tab 固定并预留 env(safe-area-inset-bottom)。不伪造手机状态时间和微信系统胶囊，使用运行平台提供的真实 UI。底部内容留足滚动空间，不遮挡输入与免责声明。

## Elevation & Depth

玻璃卡 24px 背景模糊、1px 描边、顶部高光和 0 8px 24px 阴影。浮层背景更不透明。无 backdrop-filter 时降级为实色面板；组件禁止自行添加另一套玻璃实现。

## Shapes

卡片 24px、按钮 16px、字段 12px、语义标签 8px；模式切换采用胶囊。工具图标底板 52px，图标 24px。SVG 来自 Figma，保存到 static/figma 后使用，不在运行时请求临时资产地址。

## Components

GaPage 统一壳层、主题、安全区和导航；GaCard 统一材质；GaButton 统一操作状态；GaTabs/GaModeSwitch 统一切换；GaField/GaDateField 统一字段；GaToolGrid 统一首页和全部工具；GaMeasureRow/GaResultChart 为业务复用组件；GaHero、GaEmpty、GaReference、GaDisclaimer、GaSection 全局复用。

### Foundational visual states

按钮有 hover、focus-visible、pressed、disabled、loading；loading 不改变宽度。字段预留错误区并关联 aria-describedby，防止失焦校验导致点击目标跳动。未核验模型提供完整输入但保留临床结果门禁，未接通服务禁用联网动作。本地写入失败不改变已保存状态，错误留在当前页面；载入损坏数据时禁止覆盖原存储。

### Buttons and actions

每屏一个主要操作；次要操作使用玻璃底。删除与覆盖先弹共享确认。成功反馈经 utils/feedback；保存基准进入档案，保存测量留在结果页便于继续核对，这是两种明确业务流程。

### Navigation and data display

底栏工具/档案/我的共用GaMainHome中的同一外壳，通过会话状态切换三个保留挂载的独立滚动面板，不创建原生页面。原三个URL仍作为初始面板入口；二级页返回已有主界面。微信端玻璃卡片保留透明填充、描边和阴影，不使用实时背景模糊，减少手机绘制开销。历史数据按日期降序，每页十条按需加载。canvas 必须同时提供文字记录和单位。无参数时显示空态，不绘制假均值、±2SD 或百分位。

### Forms and overlays

GaDateField 使用 uni-app 平台 picker，接受平台中文日期弹层的几何和交互；业务只持有纯日期，不自写日历。确认与通知由 uni 平台能力承载，通过 utils/feedback 统一调用。计算为同步纯函数；账号请求采用GaButton loading、行内错误和明确重试。头像昵称使用微信原生填写组件，资料可选。默认游客，只有档案及受保护子页提示登录，见docs/微信登录与服务端联调.md。

### Iconography

Figma 导出线性图标，工具和导航均有文字。系统状态栏图标由系统提供。图标装饰无可访问名称，操作按钮持有中文名称。

### Motion

只保留按压反馈；不添加循环光晕动画。prefers-reduced-motion 关闭过渡与动画，避免连续输入布局跳动。

### Content and data visualization

每个结果注明论文来源、单位、公式版本和适用范围。预产期为估计值；不输出诊断。临床参数未审定时诚实显示不可用。蓝线连接真实历史测量点，红点表示测量而非异常，图例明示用途。

## Do's and Don'ts

- 所有临床换算调用 engine 纯函数，页面只负责状态和展示。
- 通过相同组件维持不同页面的操作与错误反馈一致。
- 不把 Figma 的示例日期、百分位和曲线写成用户数据。
- 不把工程回归测试称为论文原文病例核验或临床发布验证。
