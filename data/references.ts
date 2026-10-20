/**
 * 文献元数据：集中维护论文、指南和核验状态；存在来源条目并不表示对应模型系数已经完成审核。
 */
import type { MedicalReference } from "../types/medical";

/** Independently version this snapshot when a reviewed formula/reference changes. */
export const REFERENCE_VERSION = "2026.10.18-verified-core.1";

export const medicalReferences: MedicalReference[] = [
  {
    id: "ACOG_DATING_2017",
    title: "Methods for Estimating the Due Date (Committee Opinion No. 700)",
    authors: "ACOG · AIUM · SMFM",
    journal: "Obstetrics & Gynecology",
    year: 2017,
    url: "https://www.acog.org/clinical/clinical-guidance/committee-opinion/articles/2017/05/methods-for-estimating-the-due-date",
    formula: "EDD = LMP + 280 天；IVF EDD = 移植日 + 266 天 − 胚胎龄",
    scope:
      "LMP 法以 28 天月经周期和第 14 天排卵为假设；辅助生殖以移植日期和胚胎龄定年。",
    note: "D3 胚胎移植后 263 天、D5 后 261 天为预产期。已由医生确定的预产期不应自行反复修改。",
    verifiedAt: "2026-10-18",
  },
  {
    id: "ACOG_TERM_2013",
    title: "Definition of term pregnancy (Committee Opinion No. 579)",
    authors: "ACOG · SMFM",
    journal: "Obstet Gynecol. 122(5):1139–1140",
    year: 2013,
    doi: "10.1097/01.AOG.0000437385.88715.4a",
    url: "https://pubmed.ncbi.nlm.nih.gov/24150030/",
    scope: "42+0 周及以后属于过期妊娠的孕周定义范围。",
    note: "应用据此提示联系产检医生核对孕周和随访安排，不据此自动作出诊断或分娩决定。",
    verifiedAt: "2026-10-18",
  },
  {
    id: "INTERGROWTH_CRL_2014",
    title:
      "International standards for early fetal size and pregnancy dating based on ultrasound measurement of crown–rump length in the first trimester of pregnancy",
    authors: "Papageorghiou AT, Kennedy SH, Salomon LJ, et al.",
    journal: "Ultrasound Obstet Gynecol. 44:641–648",
    year: 2014,
    doi: "10.1002/uog.13448",
    url: "https://obgyn.onlinelibrary.wiley.com/doi/10.1002/uog.13448",
    formula: "GA（天）= 40.9041 + 3.21585 × √CRL + 0.348956 × CRL；CRL 单位 mm",
    scope:
      "定年方程的自变量范围为 CRL 15–95 mm；研究队列主要在 9+0 至 13+6 周入组。",
    note: "孕周均值四舍五入到整日；这是统计估计，不代表生长诊断。范围与队列入组孕周不能混为一谈。",
    verifiedAt: "2026-10-18",
  },
  {
    id: "HADLOCK_EFW_1985",
    title:
      "Estimation of fetal weight with the use of head, body, and femur measurements—A prospective study",
    authors: "Hadlock FP, Harrist RB, Sharman RS, Deter RL, Park SK",
    journal: "Am J Obstet Gynecol. 151(3):333–337",
    year: 1985,
    doi: "10.1016/0002-9378(85)90298-4",
    url: "https://obgyn.utoronto.ca/sites/default/files/Hadlock%20Model%20for%20EFW%20AC-FL-HC%20-%20AJOG%201985.pdf",
    formula:
      "log₁₀(EFW) = 1.3596 − 0.00386·AC·FL + 0.0064·HC + 0.00061·BPD·AC + 0.0424·AC + 0.174·FL",
    scope:
      "Table II 四参数模型：BPD、HC、AC、FL 全部以 cm 输入，EFW 以 g 输出。",
    note: "该研究含早产、足月及过期胎儿；估重存在误差。本文不提供本应用的百分位表，不应据此编造生长百分位。",
    verifiedAt: "2026-10-18",
  },
  {
    id: "HADLOCK_GROWTH_1991",
    title: "In utero analysis of fetal growth: a sonographic weight standard",
    authors: "Hadlock FP, Harrist RB, Martinez-Poyer J",
    journal: "Radiology. 181(1):129–133",
    year: 1991,
    doi: "10.1148/radiology.181.1.1887021",
    url: "https://pubmed.ncbi.nlm.nih.gov/1887021/",
    scope:
      "按孕周建立的宫内胎儿体重参考标准，与 1985 年生物测量估重公式是不同模型。",
    note: "当前仅登记文献信息，尚未导入和复核百分位参数，因此不参与数值计算。",
    verifiedAt: "2026-10-18",
  },
  {
    id: "INTERGROWTH_STANDARDS",
    title: "INTERGROWTH-21st Standards and Tools",
    authors: "INTERGROWTH-21st Consortium",
    journal: "The Global Health Network · University of Oxford",
    year: 2014,
    url: "https://intergrowth21.tghn.org/standards-tools/",
    scope: "官方标准、图表、计算器与原始论文下载入口。",
    note: "本轮未完成胎儿生长回归参数双人复核，INTERGROWTH/CUHK 生长百分位均保持不可计算状态。",
    verifiedAt: "2026-10-18",
  },
];

export function getReferences(ids: readonly string[]): MedicalReference[] {
  return medicalReferences.filter((reference) => ids.includes(reference.id));
}
medicalReferences.push(
  {
    id: "DOPPLER_CPR_2018",
    title:
      "Fetal Medicine Foundation reference ranges for umbilical artery and middle cerebral artery pulsatility index and cerebroplacental ratio",
    authors: "Ciobanu A et al.",
    journal: "Ultrasound Obstet Gynecol",
    year: 2019,
    url: "https://pubmed.ncbi.nlm.nih.gov/30353583/",
    scope:
      "CPR定义为同次同胎MCA-PI/UA-PI。本应用仅提供算术比值，未导入参考分布。",
    verifiedAt: "2026-10-19",
  },
  {
    id: "AFI_ISUOG_2022",
    title:
      "ISUOG Practice Guidelines: performance of the routine mid-trimester fetal ultrasound scan",
    authors: "Salomon LJ et al.",
    journal: "Ultrasound Obstet Gynecol",
    year: 2022,
    doi: "10.1002/uog.24888",
    url: "https://obgyn.onlinelibrary.wiley.com/doi/full/10.1002/uog.24888",
    scope: "AFI为子宫四象限垂直羊水池测量的合计。这里不输出羊水正常/异常阈值。",
    verifiedAt: "2026-10-19",
  },
  {
    id: "TWIN_ISUOG_2025",
    title:
      "ISUOG Practice Guidelines (updated): role of ultrasound in twin pregnancy",
    authors: "ISUOG Clinical Standards Committee",
    journal: "Ultrasound Obstet Gynecol",
    year: 2025,
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC11788470/",
    formula: "(较大胎EFW − 较小胎EFW) / 较大胎EFW ×100%",
    scope: "同次检查的双胎EFW算术差异；本应用不依此单项分期或诊断。",
    verifiedAt: "2026-10-19",
  },
);
