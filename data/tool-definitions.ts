/**
 * 动态表单配置：每个工具描述字段、单位维度和来源；同一配置同时供通用表单与计算层读取。
 */
export interface ToolField {
  key: string;
  label: string;
  kind?: "number" | "choice" | "date" | "text";
  unit?: string;
  dimension?: "length" | "area";
  options?: { label: string; value: string }[];
  zero?: boolean;
  max?: number;
}
export interface ToolDefinition {
  key: string;
  title: string;
  group: string;
  description: string;
  fields: ToolField[];
  references: string[];
  highRisk?: boolean;
}
const n = (
  key: string,
  label: string,
  unit = "",
  extra: Partial<ToolField> = {},
): ToolField => ({ key, label, unit, ...extra });
const choice = (key: string, label: string, labels: string[]): ToolField => ({
  key,
  label,
  kind: "choice",
  options: [
    { label: "未评估 / 未记录", value: "unknown" },
    ...labels.map((label) => ({ label, value: label })),
  ],
});
const length = (key: string, label: string, zero = false): ToolField =>
  n(key, label, "", { dimension: "length", zero, max: 1000 });
const flow = () => choice("flow", "频谱原文观察", ["正向", "缺失", "反向"]);
export const toolDefinitions: ToolDefinition[] = [
  {
    key: "ua",
    title: "超声多普勒 · UA",
    group: "血流与羊水",
    description: "脐动脉原始测量与频谱观察，PI、RI 与 S/D 分别保存。",
    fields: [
      n("pi", "脐动脉 PI"),
      n("ri", "脐动脉 RI"),
      n("sd", "脐动脉 S/D"),
      flow(),
    ],
    references: ["DOPPLER_CPR_2018"],
  },
  {
    key: "mca",
    title: "超声多普勒 · MCA",
    group: "血流与羊水",
    description: "大脑中动脉 PI、PSV；MoM 需要经过审核的对应孕周中位数。",
    fields: [n("pi", "MCA PI"), n("psv", "MCA PSV", "cm/s")],
    references: ["DOPPLER_CPR_2018"],
  },
  {
    key: "dv",
    title: "超声多普勒 · DV",
    group: "血流与羊水",
    description: "静脉导管 PI 与 a 波分开记录，不将未测量等同于正常。",
    fields: [
      n("pi", "静脉导管 PI"),
      choice("wave", "a 波观察", ["正向", "缺失", "反向"]),
      { key: "definition", label: "报告中的 PI/PIV 测量定义", kind: "text" },
    ],
    references: [],
  },
  {
    key: "uta",
    title: "超声多普勒 · UtA",
    group: "血流与羊水",
    description: "双侧值齐全后显示算术均值；单侧值不冒充双侧平均。",
    fields: [
      n("left", "左侧 PI"),
      n("right", "右侧 PI"),
      n("reported", "报告记录平均 PI"),
    ],
    references: [],
  },
  {
    key: "cpr",
    title: "脑胎盘比 · CPR",
    group: "血流与羊水",
    description:
      "同次检查、同一胎儿的 MCA-PI / UA-PI；仅展示算术值，不作风险判定。",
    fields: [
      n("mca", "MCA PI"),
      n("ua", "UA PI"),
      choice("sameExam", "两项是否同次检查、同一胎儿", [
        "已核对一致",
        "不是同次同胎",
      ]),
    ],
    references: ["DOPPLER_CPR_2018"],
  },
  {
    key: "nt",
    title: "NT 参考",
    group: "孕周与生长",
    description: "NT 模型与 CRL 定年是不同模型；保留测量，未核验时不输出界值。",
    fields: [length("crl", "头臀径 CRL"), n("nt", "实测 NT", "mm")],
    references: ["INTERGROWTH_CRL_2014"],
  },
  {
    key: "mvp",
    title: "羊水 · MVP",
    group: "血流与羊水",
    description: "记录最大羊水池垂直深度及胎儿归属，参考范围按获批模型提供。",
    fields: [
      length("mvp", "最大羊水池垂直深度", true),
      { key: "method", label: "报告中的测量方法", kind: "text" },
    ],
    references: ["AFI_ISUOG_2022"],
  },
  {
    key: "afi",
    title: "羊水 · AFI",
    group: "血流与羊水",
    description: "四象限深度之和；不足四项只展示已填合计，不作为完整 AFI。",
    fields: [
      length("q1", "第一象限", true),
      length("q2", "第二象限", true),
      length("q3", "第三象限", true),
      length("q4", "第四象限", true),
    ],
    references: ["AFI_ISUOG_2022"],
  },
  {
    key: "age",
    title: "预产期年龄与背景风险",
    group: "孕周与生长",
    description:
      "按预产期计算周岁；风险表未核验时不输出疾病概率。出生日期仅用于本次计算，不保存、不分享。",
    fields: [
      { key: "dob", label: "出生日期（不保存）", kind: "date" },
      { key: "edd", label: "医生确认的预产期", kind: "date" },
    ],
    references: [],
  },
  {
    key: "twin-growth",
    title: "双胎生长对比",
    group: "双胎",
    description:
      "A/B 始终按报告身份固定；填写同次报告的 EFW，仅显示算术差异，不作 sFGR 分期。",
    fields: [
      n("a", "胎儿 A · 报告 EFW", "g"),
      n("b", "胎儿 B · 报告 EFW", "g"),
      choice("sameExam", "两胎是否同次检查", ["已核对一致", "不是同次检查"]),
    ],
    references: ["TWIN_ISUOG_2025"],
  },
  {
    key: "ttts",
    title: "TTTS 分期参考",
    group: "双胎",
    description:
      "记录专科观察；Quintero 规则未审核时不自动分期，不推荐治疗路径。",
    highRisk: true,
    fields: [
      choice("chorion", "绒毛膜 / 羊膜性", [
        "单绒双羊",
        "双绒双羊",
        "单绒单羊",
      ]),
      length("mvpA", "胎儿 A 羊水池", true),
      length("mvpB", "胎儿 B 羊水池", true),
      choice("bladder", "供血胎膀胱观察", ["显示", "未显示"]),
      choice("doppler", "报告频谱描述", ["无相关异常描述", "报告记载异常"]),
      choice("hydrops", "水肿观察", ["有", "无"]),
      choice("survival", "存活观察", ["两胎存活", "报告另有记录"]),
    ],
    references: ["TWIN_ISUOG_2025"],
  },
  {
    key: "sfgr",
    title: "sFGR 分类参考",
    group: "双胎",
    description:
      "定义与类型分类分开核对；无审核的双胎百分位和频谱模型时不作诊断。",
    highRisk: true,
    fields: [
      choice("chorion", "绒毛膜性", ["单绒毛膜", "双绒毛膜"]),
      n("a", "胎儿 A EFW", "g"),
      n("b", "胎儿 B EFW", "g"),
      { key: "percentileSource", label: "两胎百分位来源及版本", kind: "text" },
      choice("smaller", "报告标识的较小胎", ["胎儿 A", "胎儿 B"]),
      choice("flow", "较小胎 UA 舒张末期频谱", [
        "持续正向",
        "持续缺失或反向",
        "间歇缺失或反向",
      ]),
    ],
    references: ["TWIN_ISUOG_2025"],
  },
  {
    key: "lhr",
    title: "肺头比 · LHR",
    group: "专科",
    description:
      "保存肺面积与头围原始测量。期待值模型和测量方法未审定，不输出 o/e LHR 或生存率。",
    highRisk: true,
    fields: [
      choice("side", "病变侧别", ["左侧", "右侧", "双侧"]),
      choice("method", "肺面积测量方法", ["描记法", "最大径法", "前后径法"]),
      n("area", "对侧肺面积", "", { dimension: "area" }),
      length("hc", "头围 HC"),
    ],
    references: [],
  },
  {
    key: "cvr",
    title: "肺病灶容积比 · CVR",
    group: "专科",
    description:
      "分别记录长、宽、高与 HC，公式与适用背景审核前不生成临床模型结果。",
    highRisk: true,
    fields: [
      length("length", "病灶长"),
      length("width", "病灶宽"),
      length("height", "病灶高"),
      length("hc", "头围 HC"),
      { key: "source", label: "病灶测量来源 / 切面", kind: "text" },
    ],
    references: [],
  },
  {
    key: "cvps",
    title: "CVPS 评分参考",
    group: "专科",
    description: "量表版本及逐域定义待临床审核；未评估项不记作正常，不凑总分。",
    highRisk: true,
    fields: [
      { key: "scale", label: "量表版本及来源", kind: "text" },
      choice("hydrops", "水肿观察", ["报告有描述", "报告无相关描述"]),
      choice("heart", "心脏大小观察", ["报告有描述", "报告无相关描述"]),
      choice("function", "心功能观察", ["报告有描述", "报告无相关描述"]),
      choice("venous", "静脉血流观察", ["报告有描述", "报告无相关描述"]),
      choice("arterial", "动脉血流观察", ["报告有描述", "报告无相关描述"]),
    ],
    references: [],
  },
  {
    key: "iut",
    title: "宫内输血工作表",
    group: "专科",
    description:
      "高风险专科资料核对。公式待专科审核，暂不提供输血量；仅保存已确认的原始参数。",
    highRisk: true,
    fields: [
      n("efw", "估测胎儿体重 EFW", "g"),
      n("currentHct", "胎儿当前血细胞比容", "%", { max: 100 }),
      n("donorHct", "供血血细胞比容", "%", { max: 100 }),
      n("targetHct", "团队已确认的目标 Hct", "%", { max: 100 }),
      choice("history", "既往输血情况", ["首次", "既往有输血"]),
    ],
    references: [],
  },
];
export const getTool = (key: string) =>
  toolDefinitions.find((t) => t.key === key);
