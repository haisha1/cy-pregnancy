/**
 * 工具目录配置：维护工具入口与分组信息，页面读取配置生成列表，计算实现放在 engine 中。
 */
export const tools = [
  {
    label: "孕周计算",
    icon: "calendar",
    tint: "blue",
    route: "/pages/pregnancy/edd",
  },
  {
    label: "胎儿生长",
    icon: "chart",
    tint: "teal",
    route: "/pages/growth/biometry",
  },
  {
    label: "多普勒",
    icon: "pulse",
    tint: "orange",
    route: "/pages/tools/calculator?tool=ua",
  },
  {
    label: "NT",
    icon: "ruler",
    tint: "pink",
    route: "/pages/tools/calculator?tool=nt",
  },
  {
    label: "羊水",
    icon: "drop",
    tint: "blue",
    route: "/pages/tools/calculator?tool=mvp",
  },
  {
    label: "年龄风险",
    icon: "dna",
    tint: "teal",
    route: "/pages/tools/calculator?tool=age",
  },
  {
    label: "产检表",
    icon: "list",
    tint: "orange",
    route: "/pages/timeline/index",
  },
  { label: "全部", icon: "grid", tint: "pink", route: "/pages/index/all" },
] as const;
import { toolDefinitions } from "./tool-definitions";
export const toolDirectory = [
  {
    label: "预产期与孕周",
    alias: "EDD LMP CRL IVF",
    group: "孕周与生长",
    description: "多种定年方式与日期换算",
    route: "/pages/pregnancy/edd",
  },
  {
    label: "胎儿生长与体重",
    alias: "BPD HC AC FL EFW",
    group: "孕周与生长",
    description: "测量、四参数估重与个人历史曲线",
    route: "/pages/growth/biometry",
  },
  {
    label: "孕周双向日期",
    alias: "calendar date",
    group: "孕周与生长",
    description: "已有基准的日期与孕周互查",
    route: "/pages/pregnancy/dates",
  },
  ...toolDefinitions.map((t) => ({
    label: t.title,
    alias: t.key,
    group: t.group,
    description: t.description,
    route: "/pages/tools/calculator?tool=" + t.key,
  })),
  {
    label: "产检时间表",
    alias: "schedule",
    group: "档案与产检",
    description: "用户自定义安排与完成状态",
    route: "/pages/timeline/index",
  },
  {
    label: "档案管理",
    alias: "profile",
    group: "档案与产检",
    description: "多孕期、单双胎、基准历史与归档",
    route: "/pages/profile/manage",
  },
  {
    label: "报告识别 OCR",
    alias: "OCR",
    group: "档案与产检",
    description: "本机选图可用，识别服务未接通",
    route: "/pages/services/index?kind=ocr",
  },
  {
    label: "超声知识库",
    alias: "knowledge soft markers",
    group: "知识",
    description: "22个首版条目，中性概念与来源",
    route: "/pages/knowledge/index",
  },
  {
    label: "宫内治疗知识",
    alias: "treatment",
    group: "知识",
    description: "17个主题，内容编审中",
    route: "/pages/knowledge/index?kind=treatment",
  },
  {
    label: "TAPS / TRAP 知识",
    alias: "TAPS TRAP",
    group: "知识",
    description: "分别理解两种特殊双胎情况",
    route: "/pages/knowledge/index?kind=twins",
  },
  {
    label: "双胎总览",
    alias: "twins A B",
    group: "双胎",
    description: "同次双胎数据与专科观察目录",
    route: "/pages/tools/advanced?kind=twins",
  },
  {
    label: "胎儿脏器与专科",
    alias: "organ",
    group: "专科",
    description: "按系统查询测量定义，模型待审核",
    route: "/pages/tools/advanced",
  },
];
