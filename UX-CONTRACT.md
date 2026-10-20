# 共享交互约定

2026-10-19账号增补：[微信联调契约](docs/微信登录与服务端联调.md)，来源为用户当日要求，优先于旧稿“账号未接通”。游客启动零账号请求；仅档案及其受保护子页展示GaAccountGate。头像昵称选填，拒绝不阻挡工具。store/account、api/http和api/wechat统一请求、串行续期及失效恢复；503可重试，409保留资料输入后明确重新加载。登录不启用健康数据同步，头像昵称写入为真实服务端接口。

视觉和token来源见 DESIGN.md；本轮业务来源为 docs/prd 1.0，覆盖旧文档冲突规则。医学纠错以 docs/10 和原始论文及逐模型审核状态为准。模式仅在「我的」S18可写，S19只有主题/单位/标准；首次无主题偏好时跟随系统。

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
|---|---|---|---|---|
| Select/Listbox | GaTabs、GaModeSwitch | 本契约 | 按钮组，无自定义listbox | 页面交互测试、键盘焦点 |
| Date | GaDateField / uni picker | 本契约 | native 平台拥有日期弹层 | 中文弹层/日期换算测试 |
| Form | GaField、GaMeasureRow、engine/validation.ts | 医学引擎与本契约 | 日期、长度、孕周 | 非法数值/单位切换测试 |
| Scrollbar | styles/base.scss | DESIGN.md | 全局，几何可自适应 | 窄屏和长页面回归 |
| Toast | utils/feedback.ts / uni.showToast | 本契约 | success/info/error | 保存/失败反馈 |
| CRUD | store/profile.ts、store/workspace.ts | 本契约 | 多档案、同日多次、修订、本地计划 | 保存/刷新/隔离/修订/删除测试 |

数据默认为空，输入完整后同步计算，无需确认计算。计算无网络依赖；不创建假等待。数字非法时显示文字错误，不显示旧结果。cm/mm切换调用纯函数并保持物理量不变。

孕期基准保存完整方法、原输入、等效LMP、EDD、引用、修订UUID与时间；修订前展示新旧差异并确认。基准变更不改既有gaDays快照或用户预约。同日新建检查独立保存；编辑明确选中的记录需确认并保留原版本。档案、胎儿A/B、检查会话严格分离，曲线按胎儿过滤。扩展工具草稿保存单位与检查上下文，返回按钮可保留/放弃/继续编辑；年龄工具不保存生日。删除先说明范围。云端同步和跨设备恢复尚未接通。

持久化先写入存储，成功后更新内存。失败显示可恢复错误，保留输入；载入损坏档案不静默重置或覆盖。个人孕期信息仅保存当前设备，不发送后端，不启用模板统计、定位或广告。

导航保留GaPage自定义底栏。工具/档案/我的由GaMainHome和store/mainNavigation管理，共用一个导航、背景和底栏；v-show保留三个scroll-view面板，点击不调用switchTab/reLaunch，不写磁盘、不等待联网。原三个URL仅决定新建主界面时的初始面板，会话内选中项由store维护。二级页navigateTo/navigateBack；utils/navigation优先返回栈中已有主界面并选中目标面板，只有深链无主界面时才reLaunch创建入口。GaAccountBoundary统一保护档案，隐藏面板不发起身份验证；游客首次进入也不自动联网，登录失效立即隐藏受保护内容。顶部由useNavigationMetrics读取状态栏和微信胶囊坐标，首次渲染前同步计算高度及左右避让；旋转时更新。多根内容组件统一有独立ga-stack容器，间距不依赖H5的Fragment表现。曲线历史每次显示十条，支持加载更多。用户信息不放进URL，仅使用记录id定位；生日不进入存储、日志或分享。知识与脏器目录本地搜索，清除立即恢复。联网能力未接通时诚实展示门禁，不模拟加载和成功。

日期存储YYYY-MM-DD，UI简体中文。设备当前日历用于“今天”；纯日期加减不受时区和夏令时影响。单位和孕周余天始终可见。按钮可键盘操作、有名称和焦点态；字段标签和错误关联；图表有等效文字记录。

未核验临床参考不出百分位或颜色判断，未开发工具禁用并解释。首次公开发布仍需完成正式隐私政策、真实AppID、医学参数与论文病例门禁及iOS/Android微信真机验证。
