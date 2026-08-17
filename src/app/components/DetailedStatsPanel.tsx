/**
 * 研究生综合能力与状态档案面板
 * - 纯净扁平化设计：极简细线分割，字号微调至精巧黄金比例，紧凑精致
 * - 顶部二级子标签：【能力总览】 / 【个人简历】
 * - 【能力总览】：三栏通栏布局（个人概况 | 24项能力矩阵与赛道匹配 | 六维雷达与诊断）
 * - 【个人简历】：纯净版文档式简历布局（教育背景、可编辑实战项目、核心优势与资产）
 */
import { useState, useMemo, useCallback, useEffect } from "react";
import {
  Pencil,
  GraduationCap,
  Sparkles,
  Briefcase,
  Wallet,
} from "lucide-react";
import { PARTNER_BUFF_DEFINITIONS } from "../npc/peerData";
import {
  getActivePerks,
  type Perk,
  type PerkStats,
} from "../perks/perkRegistry";
import { moneyToBalance, formatYuan } from "../economy/finance";
import { calculateThesisGrade, getMentorThesisBoostLabel } from "../thesis/thesisScore";

// ============================================================================
// 类型与属性元数据
// ============================================================================

export type StatusKey =
  | "arch" | "logic" | "expression" | "english" | "structured"
  | "stress" | "network" | "money" | "selfDoubt" | "ageAnxiety" | "mentorFavorability"
  | "dataSense" | "visualTaste" | "writingDepth" | "codeBasic" | "commercial"
  | "negotiation" | "leadership" | "empathy" | "execution"
  | "reputation" | "health" | "riskTolerance" | "aestheticTheory"
  | "industryResearch" | "fastLearning" | "alignment" | "infoChannels"
  | "thesisScore";

export type StatusStats = Record<StatusKey, number>;

interface StatMeta {
  label: string;
  category: "hard" | "soft" | "resource";
  positive: boolean;
  desc: string;
}

const META: Record<StatusKey, StatMeta> = {
  // 1. 专业硬实力 (Hard Skills - 9项)
  arch:           { label: "建筑专业力", category: "hard",     positive: true,  desc: "建筑学科硬实力，含方案图纸、规范与空间工程" },
  structured:     { label: "结构化思维", category: "hard",     positive: true,  desc: "拆解复杂议题并输出清晰框架结构的能力" },
  dataSense:      { label: "数据分析",   category: "hard",     positive: true,  desc: "对量化指标、统计分析与转化率的直觉与洞察" },
  codeBasic:      { label: "代码基础",   category: "hard",     positive: true,  desc: "编程入门，与开发及算法研发团队的沟通桥梁" },
  visualTaste:    { label: "审美直觉",   category: "hard",     positive: true,  desc: "高级视觉把控力，跨界 UI/UX 与三维数字资产" },
  writingDepth:   { label: "文档能力",   category: "hard",     positive: true,  desc: "文字驾驭力，撰写学术论文、产品PRD与深度行研报告" },
  aestheticTheory:{ label: "美学理论",   category: "hard",     positive: true,  desc: "风格史、艺术哲学与建筑设计批评理论储备" },
  commercial:     { label: "商业嗅觉",   category: "hard",     positive: true,  desc: "洞悉商业闭环、客户付费意愿与市场风口" },
  industryResearch:{ label: "行业研判", category: "hard",     positive: true,  desc: "宏观产业分析、TAM测算与商业财务估值模型" },

  // 2. 综合软实力 (Soft Skills - 9项)
  logic:          { label: "逻辑推理",   category: "soft",     positive: true,  desc: "严谨推演因果关系、批判性思考与论证能力" },
  expression:     { label: "口头表达",   category: "soft",     positive: true,  desc: "公开路演、答辩陈述与极具感染力的说服力" },
  negotiation:    { label: "谈判博弈",   category: "soft",     positive: true,  desc: "与导师讨论课题分工、与HR谈薪等权益博弈" },
  leadership:     { label: "组织领导",   category: "soft",     positive: true,  desc: "凝聚跨学科团队共识、推动大项目的统筹力" },
  empathy:        { label: "共情感知",   category: "soft",     positive: true,  desc: "敏锐体察用户痛点、团队情绪与人际细节" },
  execution:      { label: "交付执行",   category: "soft",     positive: true,  desc: "不拖延，把概念草图与方案PPT高效落地为结果" },
  riskTolerance:  { label: "风险偏好",   category: "soft",     positive: true,  desc: "拥抱不确定性、敢于跨界尝试未知赛道的魄力" },
  fastLearning:   { label: "跨界学习力", category: "soft",     positive: true,  desc: "快速吃透未知领域业务、黑话与认知破壁迁移速度" },
  alignment:      { label: "跨职能拉通", category: "soft",     positive: true,  desc: "跨部门协作、向上管理与多方诉求协调推动手腕" },

  // 3. 个人状态与资源 (State & Resources - 9项)
  health:         { label: "身体健康",   category: "resource", positive: true,  desc: "体能储备与应对高强度赶图的抗疲劳基础" },
  stress:         { label: "心理抗压",   category: "resource", positive: true,  desc: "心理承重墙厚度，面对批评与挫折的高逆商" },
  network:        { label: "人脉资源",   category: "resource", positive: true,  desc: "校友学长、行业同行与导师圈内人脉链接" },
  english:        { label: "外语能力",   category: "resource", positive: true,  desc: "跨国企业沟通、国际文献阅读与海外视野" },
  mentorFavorability: { label: "导师认可度", category: "resource", positive: true, desc: "导师支持度、学术资源倾斜与毕业推荐背书" },
  reputation:     { label: "行业声望",   category: "resource", positive: true,  desc: "在建筑圈与跨界赛道中的专业口碑与影响力" },
  selfDoubt:      { label: "自我怀疑",   category: "resource", positive: false, desc: "内耗焦虑程度（数值越低越自信稳健）" },
  ageAnxiety:     { label: "同辈焦虑",   category: "resource", positive: false, desc: "毕业时间与年龄压力（数值越低越从容）" },
  infoChannels:   { label: "信息渠道",   category: "resource", positive: true,  desc: "跨界一手HC动向、校友内推源与行业前沿信息掌握度" },
  money:          { label: "储蓄资金",   category: "resource", positive: true,  desc: "流动资金保障与毕业过渡期抗风险安全垫" },
};

const TIER_LABELS: Record<number, string> = {
  4: "TOP2 (清北)",
  3: "985 / 建筑老八校",
  2: "211 院校",
  1: "双非本科",
};

const TIER_COLORS: Record<number, string> = {
  4: "#f0c040",
  3: "#64b5f6",
  2: "#81c784",
  1: "#9e9e9e",
};

export interface InternshipItem {
  id: string;
  title: string;
  companyName: string;
  category?: string;
  stipend: string;
  description: string;
  detailedAchievements?: string[];
}

export interface DetailedStatsPanelProps {
  stats: StatusStats;
  character?: {
    name?: string;
    undergradSchool?: string;
    undergradTier?: number;
    masterSchool?: string;
    masterTier?: number;
    isOverseas?: boolean;
  };
  mentor?: {
    name?: string;
    displayName?: string;
    title?: string;
    emoji?: string;
    id?: string;
    favorability?: number;
  } | null;
  onViewResume?: () => void;
  semester?: number;
  round?: number;
  totalRound?: number;
  phase?: string;
  actionDelta?: Partial<StatusStats>;
  eventDelta?: Partial<StatusStats>;
  lastRoundDelta?: Partial<StatusStats>;
  pastInternships?: InternshipItem[];
  onUpdateInternshipDetails?: (
    internshipId: string,
    updates: { stipend: string; description: string; detailedAchievements: string[] }
  ) => void;
}

interface CareerTrack {
  code: string;
  name: string;
  category: string;
  keyStats: StatusKey[];
  desc: string;
}

const CAREER_TRACKS: CareerTrack[] = [
  {
    code: "PM",
    name: "互联网 / AI空间产品经理",
    category: "科技大厂",
    keyStats: ["logic", "dataSense", "structured", "commercial", "alignment"],
    desc: "定义空间交互需求、量化算法与跨职能团队推动落地",
  },
  {
    code: "FIN",
    name: "战略咨询 / 产业行研 (VC/PE)",
    category: "金融与咨询",
    keyStats: ["industryResearch", "logic", "structured", "commercial", "fastLearning"],
    desc: "宏观产业研判、TAM测算、财务模型与商业尽调",
  },
  {
    code: "AUTO",
    name: "新能源车企 / 智能座舱体验专家",
    category: "智能出行",
    keyStats: ["visualTaste", "fastLearning", "dataSense", "alignment", "expression"],
    desc: "车载人机交互、空间美学与软硬件跨部门体验闭环",
  },
  {
    code: "TA",
    name: "空间计算 / 技术美术 (TA)",
    category: "前沿数字化",
    keyStats: ["visualTaste", "codeBasic", "arch", "fastLearning"],
    desc: "三维图形引擎、空间算法与视觉艺术的跨界枢纽",
  },
  {
    code: "BD",
    name: "商业策划 / 品牌主理人",
    category: "新消费与商管",
    keyStats: ["commercial", "expression", "visualTaste", "network", "industryResearch"],
    desc: "空间叙事变现、品牌孵化与线下商业体验运营",
  },
  {
    code: "ARCH",
    name: "头部事务所方案主创",
    category: "专业设计",
    keyStats: ["arch", "visualTaste", "aestheticTheory", "stress", "execution"],
    desc: "掌控概念深度、方案落地与前沿建筑空间美学",
  },
  {
    code: "GOV",
    name: "大型央国企 / 规划设计院",
    category: "体制内与基建",
    keyStats: ["writingDepth", "structured", "alignment", "network", "mentorFavorability"],
    desc: "大型公建规划、宏观政策对接与稳健职业路径",
  },
];

// ============================================================================
// 辅助计算
// ============================================================================

function getStatGradeColor(value: number, positive: boolean): string {
  const v = positive ? value : 100 - value;
  if (v >= 80) return "#4ade80";
  if (v >= 65) return "#a3e635";
  if (v >= 50) return "#facc15";
  if (v >= 35) return "#fb923c";
  return "#f87171";
}

/** 属性升降徽标：▲/▼ 图标 + 悬浮显示详细数值变化 */
function DeltaBadge({ delta, label }: { delta: number; label: string }) {
  const up = delta > 0;
  return (
    <span className="relative inline-flex group/delta">
      <span className={`font-mono text-[10px] leading-none ${up ? "text-emerald-400" : "text-rose-400"}`}>
        {up ? "▲" : "▼"}
      </span>
      <span className="pointer-events-none absolute -top-6 left-1/2 z-50 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-white/10 bg-[#0d0a14]/95 px-2 py-0.5 text-[12px] font-mono text-slate-100 shadow-xl group-hover/delta:block">
        {label} {up ? "+" : ""}{delta}
      </span>
    </span>
  );
}

function getEvaluationLabel(ovr: number): string {
  if (ovr >= 85) return "领军潜质";
  if (ovr >= 75) return "卓越竞争力";
  if (ovr >= 60) return "稳健进阶";
  if (ovr >= 45) return "蓄力成长期";
  return "初入探索";
}

function estimateMarketSalary(ovr: number, internshipsCount: number, reputation: number): string {
  const baseSalary = 12 + (ovr - 50) * 0.45 + internshipsCount * 2.5 + reputation * 0.08;
  const minSal = Math.max(8, Math.round(baseSalary * 0.85));
  const maxSal = Math.max(minSal + 4, Math.round(baseSalary * 1.25));
  return `¥${minSal}万 - ¥${maxSal}万/年`;
}

// ============================================================================
// 主组件
// ============================================================================

const DEFAULT_FALLBACK_STATS: StatusStats = {
  arch: 60, logic: 50, expression: 50, english: 45, structured: 50,
  stress: 55, network: 30, money: 38, selfDoubt: 30, ageAnxiety: 20, mentorFavorability: 40,
  dataSense: 30, codeBasic: 20, visualTaste: 60, writingDepth: 40, aestheticTheory: 55,
  commercial: 25, industryResearch: 20, negotiation: 30, leadership: 30, empathy: 50,
  execution: 50, reputation: 20, health: 75, riskTolerance: 40, fastLearning: 40,
  alignment: 30, infoChannels: 20,
};

export function DetailedStatsPanel({
  stats,
  character,
  mentor,
  semester = 1,
  round = 1,
  totalRound = 24,
  phase = "action",
  actionDelta = {},
  eventDelta = {},
  lastRoundDelta = {},
  pastInternships = [],
  partners = [],
  onUpdateInternshipDetails,
  onViewResume,
}: DetailedStatsPanelProps) {
  const [activeSubTab, setActiveSubTab] = useState<"overview" | "resume">("overview");
  const [selectedTrackCode, setSelectedTrackCode] = useState<string>("PM");

  const safeStats = useMemo(() => ({ ...DEFAULT_FALLBACK_STATS, ...(stats || {}) }), [stats]);

  const activePerks = useMemo(() => getActivePerks(safeStats as PerkStats), [safeStats]);

  const positiveKeys = useMemo(
    () => (Object.keys(META) as StatusKey[]).filter((k) => META[k].positive && k !== "money"),
    []
  );
  const ovr = useMemo(() => {
    const sum = positiveKeys.reduce((acc, k) => acc + (safeStats[k] ?? 50), 0);
    return Math.round(sum / positiveKeys.length);
  }, [positiveKeys, safeStats]);

  const marketSalary = useMemo(
    () => estimateMarketSalary(ovr, pastInternships.length, safeStats.reputation ?? 50),
    [ovr, pastInternships.length, safeStats.reputation]
  );

  const trackScores = useMemo(() => {
    return CAREER_TRACKS.map((track) => {
      const avg = track.keyStats.reduce((sum, k) => sum + (safeStats[k] ?? 50), 0) / track.keyStats.length;
      const score = Math.round(avg);
      let stars = "★★★☆☆";
      if (score >= 80) stars = "★★★★★";
      else if (score >= 70) stars = "★★★★☆";
      else if (score >= 58) stars = "★★★☆☆";
      else if (score >= 45) stars = "★★☆☆☆";
      else stars = "★☆☆☆☆";
      return { ...track, score, stars };
    }).sort((a, b) => b.score - a.score);
  }, [safeStats]);

  const selectedTrack = useMemo(
    () => CAREER_TRACKS.find((t) => t.code === selectedTrackCode) ?? CAREER_TRACKS[0],
    [selectedTrackCode]
  );

  const { strengths, weaknesses } = useMemo(() => {
    const sList: string[] = [];
    const wList: string[] = [];

    if (safeStats.arch >= 75) sList.push("建筑学科硬实力扎实，方案概念与制图表现出色");
    if (safeStats.logic >= 75) sList.push("逻辑严密，具备极佳的批判性分析与问题推演力");
    if (safeStats.fastLearning >= 70) sList.push("跨界学习力极强，能迅速吸收新行业业务与黑话体系");
    if (safeStats.alignment >= 70) sList.push("跨职能拉通与向上管理成熟，善于推动大厂复杂项目");
    if (safeStats.industryResearch >= 70) sList.push("行业研判深入，具备自上而下的市场测算与模型功底");
    if (safeStats.infoChannels >= 65) sList.push("掌握丰富的一手内推渠道与跨界前沿资讯，信息差优势明显");
    if (safeStats.structured >= 75) sList.push("信息结构化极强，善于梳理复杂项目与输出方法论");
    if (safeStats.visualTaste >= 75) sList.push("审美直觉敏锐，跨界设计与UI/视觉表现优势突出");
    if (safeStats.commercial >= 70) sList.push("商业敏感度高，能清晰把握市场需求与变现逻辑");
    if (safeStats.mentorFavorability >= 70) sList.push("导师关系非常稳固，学术资源支持充分");
    if (safeStats.stress >= 70) sList.push("心理抗压墙深厚，高压逆境下仍能从容交付");
    if (pastInternships.length >= 2) sList.push(`已积累 ${pastInternships.length} 段高含金量实战项目履历`);

    if (safeStats.selfDoubt >= 70) wList.push("自我怀疑偏高，方案被推翻时容易产生内耗");
    if (safeStats.ageAnxiety >= 70) wList.push("毕业求职焦虑明显，急于求成");
    if (safeStats.infoChannels < 30) wList.push("跨界求职信息渠道闭塞，缺乏优质一手内推资源");
    if (safeStats.alignment < 35) wList.push("跨部门协作与拉通手腕尚浅，组织博弈经验不足");
    if (safeStats.health < 40) wList.push("身体健康指标偏低，需预防熬夜劳损");
    if (safeStats.stress < 40) wList.push("抗压韧性较弱，遇突发挫折易产生心理波动");
    if (safeStats.codeBasic < 40) wList.push("代码与量化技术尚浅，跨界技术岗存在认知壁垒");
    if (safeStats.network < 45) wList.push("行业人脉尚在初建期，缺乏关键引荐人");
    if (safeStats.money < 30) wList.push("存款储备吃紧，过渡期抗风险容错率低");

    if (sList.length === 0) sList.push("各项属性均衡成长，具备广阔的多向突破潜质");
    if (wList.length === 0) wList.push("当前各项关键指标平稳，未出现明显危急短板");

    return { strengths: sList.slice(0, 3), weaknesses: wList.slice(0, 3) };
  }, [safeStats, pastInternships.length]);

  const currentDelta = useMemo(() => {
    return phase === "action_result" ? { ...eventDelta, ...actionDelta } : eventDelta;
  }, [phase, actionDelta, eventDelta]);

  // 状态页展示的升降：action_result 阶段用即时反馈，其余阶段用「上一回合完整结算」
  const displayDelta = useMemo(() => {
    return phase === "action_result" ? currentDelta : lastRoundDelta;
  }, [phase, currentDelta, lastRoundDelta]);

  const hardSkillKeys = useMemo(
    () => (Object.keys(META) as StatusKey[]).filter((k) => META[k].category === "hard"),
    []
  );
  const softSkillKeys = useMemo(
    () => (Object.keys(META) as StatusKey[]).filter((k) => META[k].category === "soft"),
    []
  );
  const resourceKeys = useMemo(
    () => (Object.keys(META) as StatusKey[]).filter((k) => META[k].category === "resource" && k !== "money"),
    []
  );

  const playerName = character?.name || "Yuxuan Cao";
  const playerSchool = character?.masterSchool || "东南大学";
  const undergradSchool = character?.undergradSchool || "建筑学本科院校";
  const undergradTier = character?.undergradTier ?? 3;
  const masterTier = character?.masterTier ?? 3;
  const mentorName = mentor?.displayName || mentor?.name || "齐廷宝";
  const semesterStr = `研${Math.ceil(semester / 2)}${semester % 2 === 1 ? "上" : "下"}`;
  const partnerNameMap: Record<string, string> = {
    zhang_yifan: "张一帆",
    lu_yuchen: "陆予忱",
    bai_xu: "白栩",
    jiang_huai: "江淮",
    shen_qinghuai: "沈清淮",
    lab_senior: "沈清淮",
    professor: "导师 · " + mentorName,
  };

  const effectivePartners = useMemo(() => {
    if (partners && partners.length > 0) return partners;
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("arch_sim_partners");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    return [];
  }, [partners]);

  const partnersDisplay = useMemo(() => {
    if (!effectivePartners || effectivePartners.length === 0) return "单身（暂无）";
    return effectivePartners.map((id) => partnerNameMap[id] || id).join("、");
  }, [effectivePartners, mentorName]);


  const thesisGrade = useMemo(() => calculateThesisGrade(safeStats.thesisScore ?? 0), [safeStats.thesisScore]);

  const delayRisk = useMemo(() => {
    const score = safeStats.thesisScore ?? 0;
    const requiredBySemester = semester * 15;
    if (score >= requiredBySemester + 15 || score >= 75) {
      return { label: "低风险", color: "#4ade80", desc: "论文撰写与课题推进节奏良好，达标概率极高。" };
    } else if (score >= requiredBySemester - 5 || score >= 50) {
      return { label: "中度预警", color: "#facc15", desc: "论文进度略显滞后，建议增加【改论文】频次防范延毕。" };
    } else {
      return { label: "高危延毕", color: "#f87171", desc: "当前学术指标危急，若答辩前未达及格线将触发延毕！" };
    }
  }, [safeStats.thesisScore, semester]);

  return (
    <div className="w-full bg-[#080d1a] text-slate-200 select-none font-sans rounded-2xl border border-white/[.08] shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden text-[13px]">
      {/* ────────────────────────────────────────────────────────── */}
      {/* 1. 顶栏：大气大头像 + 扁平高亮切换器 */}
      {/* ────────────────────────────────────────────────────────── */}
      <header className="border-b border-white/[.08] px-6 py-4 flex flex-wrap items-center justify-between gap-4 bg-[#0a1122]/90 backdrop-blur-md">
        <div className="flex items-center gap-4 min-w-0">
          {/* 头像 */}
          <div className="relative w-13 h-13 sm:w-14 sm:h-14 shrink-0 rounded-2xl bg-gradient-to-br from-[#c9a84c]/25 via-slate-800 to-slate-900 border border-[#c9a84c]/40 p-0.5 shadow-[0_0_15px_rgba(201,168,76,0.15)] flex items-center justify-center overflow-hidden">
            <span className="text-2xl select-none">👨‍🎓</span>
            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-400 border-2 border-[#0a1122] shadow-[0_0_8px_#34d399]" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-[18.5px] sm:text-[20px] font-bold text-white tracking-tight leading-none">{playerName}</h2>
            </div>
            <p className="text-xs text-slate-400 font-medium mt-1.5 truncate flex items-center gap-1.5">
              <span>{playerSchool}</span>
              <span className="text-slate-600">·</span>
              <span>{semesterStr}</span>
              <span className="text-slate-500 font-mono">（第 {round}/{totalRound} 回合）</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* 纯净线框胶囊切换器 */}
          <div className="flex items-center border border-white/10 rounded-xl p-1 text-xs bg-black/40 shadow-inner">
            <button
              onClick={() => setActiveSubTab("overview")}
              className={`px-4 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                activeSubTab === "overview"
                  ? "bg-[#2a2315] text-[#f5d77f] font-bold border border-[#c9a84c]/40 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              能力总览
            </button>
            <button
              onClick={() => setActiveSubTab("resume")}
              className={`px-4 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                activeSubTab === "resume"
                  ? "bg-[#2a2315] text-[#f5d77f] font-bold border border-[#c9a84c]/40 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              个人简历
            </button>
          </div>

          {/* 综合评分胶囊 */}
          <div className="text-xs text-slate-300 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/30 border border-white/10 shadow-sm">
            <span className="text-slate-400 text-xs">综合评分</span>
            <span className="font-mono font-bold text-amber-300 text-sm tracking-wide">{ovr}</span>
          </div>
        </div>
      </header>

      {/* ────────────────────────────────────────────────────────── */}
      {/* 2. TAB 1: 综合能力总览（比例精巧，信息高密） */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeSubTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-white/[.08]">
          {/* ─── 左栏 (Col 1-3): 个人概况、延毕风险与心态 ─── */}
          <aside className="lg:col-span-3 p-4 sm:p-5 flex flex-col gap-4 bg-[#080d1a]/50">
            {/* 个人简介卡片 */}
            <div className="rounded-xl border border-white/[.07] bg-white/[0.015] p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-[13px] font-bold text-white tracking-wide flex items-center gap-1.5">
                    <span>📋</span> 个人简介
                  </h3>
                  <p className="text-xs text-[#c9a84c] font-semibold mt-0.5">
                    {selectedTrack.name.split("/")[0]}方向
                  </p>
                </div>
                <div className="px-2 py-0.5 rounded-lg bg-amber-400/10 border border-amber-400/25 text-amber-300 font-mono font-bold text-xs shadow-[0_0_10px_rgba(251,191,36,0.1)]">
                  {ovr} OVR
                </div>
              </div>

              {/* 基础学籍信息 */}
              <div className="mt-3 space-y-1.5 text-xs text-slate-300 pb-3 border-b border-white/[.07]">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">🏛️</span>
                  <span className="text-slate-200">{playerSchool}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">🎓</span>
                  <span className="text-slate-200">建筑学硕士</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">📅</span>
                  <span className="text-slate-200">{semesterStr}阶段</span>
                </div>
              </div>

              {/* 细线属性列表 */}
              <div className="divide-y divide-white/[.05] text-[12px] pt-1">
                <div className="flex justify-between py-2">
                  <span className="text-slate-400">市场估值期望</span>
                  <span className="font-mono font-bold text-amber-300 text-[13px]">{marketSalary}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-slate-400">指导导师</span>
                  <button
                    type="button"
                    onClick={onViewResume}
                    disabled={!onViewResume}
                    className={`flex items-center gap-1 text-slate-200 font-medium text-[12.5px] transition rounded px-1 -mx-1 ${onViewResume ? "hover:text-amber-300 hover:bg-amber-400/[.06] cursor-pointer" : "cursor-default"}`}
                    title={onViewResume ? "查看导师简历" : undefined}
                  >
                    {mentorName}
                    {onViewResume && (
                      <svg className="text-amber-400/80 opacity-70 group-hover:opacity-100" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M7 7h10v10"/><path d="M7 17 17 7"/>
                      </svg>
                    )}
                  </button>
                </div>
                <div className="relative group flex items-center justify-between py-2 cursor-pointer transition-colors hover:bg-white/[0.02] rounded px-1 -mx-1">
                  <span className="text-slate-400 flex items-center gap-1 shrink-0">
                    <span>❤️</span> 恋爱关系
                  </span>
                  <span className={`font-semibold text-[12px] max-w-[170px] truncate text-right ${effectivePartners && effectivePartners.length > 0 ? "text-rose-300 font-bold" : "text-slate-400"}`} title={partnersDisplay}>
                    {effectivePartners && effectivePartners.length > 0 ? `${partnersDisplay} 💕` : "单身（暂无）"}
                  </span>

                  {/* 悬浮展示：伴侣羁绊常驻加成气泡 */}
                  {effectivePartners && effectivePartners.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 z-[100] hidden group-hover:block transition-all duration-200 p-3 rounded-xl border border-rose-500/40 bg-[#0d0a14]/98 shadow-2xl backdrop-blur-lg pointer-events-none">
                      <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-rose-500/20">
                        <span className="text-[11.5px] font-bold text-rose-300 flex items-center gap-1.5">
                          <span>💕</span> 伴侣常驻羁绊加成
                        </span>
                        <span className="text-[10px] text-rose-400 font-mono font-semibold px-2 py-0.5 rounded-full bg-rose-500/15 border border-rose-400/25">
                          {effectivePartners.length} 位对象生效中
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        {effectivePartners.map((pId) => {
                          const def = PARTNER_BUFF_DEFINITIONS[pId];
                          if (!def) return null;
                          return (
                            <div key={pId} className="rounded-lg bg-black/45 border border-white/5 p-2 text-xs">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-rose-200">{def.name}</span>
                                <span className="text-[10px] text-amber-300 font-medium">{def.tag}</span>
                              </div>
                              <p className="text-[11px] text-slate-300 mt-1 leading-snug">{def.buffSummary}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-400">流动储蓄</span>
                  <span className="font-mono text-emerald-400 font-bold text-[12.5px]">
                    {formatYuan(moneyToBalance(safeStats.money ?? 50))}
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-400">体能健康</span>
                  <span className="font-mono font-bold text-[13px]" style={{ color: getStatGradeColor(safeStats.health, true) }}>
                    {Math.round(safeStats.health)}%
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-400">心理抗压</span>
                  <div className="flex items-center gap-1">
                    <span className="font-mono font-bold text-[13px]" style={{ color: getStatGradeColor(safeStats.stress, true) }}>
                      {Math.round(safeStats.stress)}%
                    </span>
                    {safeStats.stress < 40 && <span className="text-rose-400 text-[10px]">▼</span>}
                  </div>
                </div>
              </div>


              {/* 延毕风险与毕业论文评估卡片 (核心保留属性) */}
              <div className="mt-3.5 p-3 rounded-xl border border-amber-500/25 bg-amber-500/[0.04]">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] tracking-wider font-mono uppercase font-bold text-amber-400 flex items-center gap-1">
                    <span>⚠️</span> 延毕风险评估
                  </span>
                  <span
                    className="text-[11px] font-bold font-mono px-2 py-0.5 rounded-full"
                    style={{
                      color: delayRisk.color,
                      backgroundColor: `${delayRisk.color}18`,
                      border: `1px solid ${delayRisk.color}35`,
                    }}
                  >
                    {delayRisk.label}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] mb-1.5">
                  <span className="text-slate-400">毕业论文估分</span>
                  <span className="font-mono font-bold" style={{ color: thesisGrade.color }}>
                    {safeStats.thesisScore ?? 0} / 100 ({thesisGrade.label})
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.max(0, Math.min(100, safeStats.thesisScore ?? 0))}%`,
                      background: thesisGrade.color,
                    }}
                  />
                </div>
                <p className="text-[10.5px] text-slate-400 mt-1.5 leading-relaxed">
                  {delayRisk.desc}
                </p>
              </div>
            </div>

            {/* 心态与诉求卡片 */}
            <div className="rounded-xl border border-white/[.07] bg-white/[0.015] p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-white text-xs flex items-center gap-1.5">
                  <span>💭</span> 心态与诉求
                </span>
                <span className="text-[11px] text-emerald-400 font-mono font-medium px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                  {safeStats.stress >= 50 && safeStats.selfDoubt <= 50 ? "状态积极" : "平稳进阶"}
                </span>
              </div>
              <div className="space-y-1.5 text-[12px] text-slate-400 leading-relaxed">
                <p>
                  • {safeStats.mentorFavorability >= 60
                    ? `近期与导师沟通进度良好，保持良好关系。`
                    : `近期需多与导师沟通进度，维护师生互信。`}
                </p>
                <p>
                  • {pastInternships.length > 0
                    ? `已有实战经历加持，正在针对目标赛道进一步补强技能。`
                    : `建议把握本学期机会投递实习，丰富简历项目。`}
                </p>
              </div>
            </div>
          </aside>

          {/* ─── 中栏 (Col 4-8): 24项能力属性矩阵 & 赛道匹配 ─── */}
          <main className="lg:col-span-6 p-4 sm:p-5 flex flex-col gap-4.5">
            {/* 能力属性矩阵 */}
            <div>
              <div className="flex items-center justify-between pb-2 mb-3 border-b border-white/[.07]">
                <h4 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <span className="text-amber-400">📊</span> 综合能力属性矩阵
                </h4>
                <span className="text-[11px] text-slate-400 font-mono">1-100 标尺</span>
              </div>

              {/* 3 列分栏 */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                {/* 第 1 列：专业硬实力 */}
                <div className="space-y-1">
                  <div className="text-[11.5px] uppercase font-bold tracking-wider text-sky-400 pb-1.5 border-b border-sky-500/20 mb-1.5 flex justify-between">
                    <span>硬技能 (Hard)</span>
                    <span>数值</span>
                  </div>
                  {hardSkillKeys.map((key) => {
                    const meta = META[key];
                    const val = safeStats[key] ?? 50;
                    const isKeyForSelectedTrack = selectedTrack.keyStats.includes(key);
                    const delta = displayDelta[key];
                    return (
                      <div
                        key={key}
                        className={`flex items-center justify-between px-2 py-1 rounded-lg transition-colors ${
                          isKeyForSelectedTrack
                            ? "bg-sky-500/15 text-sky-200 font-semibold"
                            : "hover:bg-white/[.03] text-slate-300"
                        }`}
                      >
                        <span className="text-[12.5px] truncate">{meta.label}</span>
                        <div className="flex items-center gap-1">
                          {delta && delta !== 0 && (
                            <DeltaBadge delta={delta} label={meta.label} />
                          )}
                          <span
                            className="font-mono font-bold text-[13px] tabular-nums"
                            style={{ color: getStatGradeColor(val, meta.positive) }}
                          >
                            {Math.round(val)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 第 2 列：综合软实力 */}
                <div className="space-y-1">
                  <div className="text-[11.5px] uppercase font-bold tracking-wider text-emerald-400 pb-1.5 border-b border-emerald-500/20 mb-1.5 flex justify-between">
                    <span>软实力 (Soft)</span>
                    <span>数值</span>
                  </div>
                  {softSkillKeys.map((key) => {
                    const meta = META[key];
                    const val = safeStats[key] ?? 50;
                    const isKeyForSelectedTrack = selectedTrack.keyStats.includes(key);
                    const delta = displayDelta[key];
                    return (
                      <div
                        key={key}
                        className={`flex items-center justify-between px-2 py-1 rounded-lg transition-colors ${
                          isKeyForSelectedTrack
                            ? "bg-emerald-500/15 text-emerald-200 font-semibold"
                            : "hover:bg-white/[.03] text-slate-300"
                        }`}
                      >
                        <span className="text-[12.5px] truncate">{meta.label}</span>
                        <div className="flex items-center gap-1">
                          {delta && delta !== 0 && (
                            <DeltaBadge delta={delta} label={meta.label} />
                          )}
                          <span
                            className="font-mono font-bold text-[13px] tabular-nums"
                            style={{ color: getStatGradeColor(val, meta.positive) }}
                          >
                            {Math.round(val)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 第 3 列：状态与资源 */}
                <div className="space-y-1">
                  <div className="text-[11.5px] uppercase font-bold tracking-wider text-amber-400 pb-1.5 border-b border-amber-500/20 mb-1.5 flex justify-between">
                    <span>状态/资源 (State)</span>
                    <span>数值</span>
                  </div>
                  {resourceKeys.map((key) => {
                    const meta = META[key];
                    const val = safeStats[key] ?? 50;
                    const isKeyForSelectedTrack = selectedTrack.keyStats.includes(key);
                    const delta = displayDelta[key];
                    return (
                      <div
                        key={key}
                        className={`flex items-center justify-between px-2 py-1 rounded-lg transition-colors ${
                          isKeyForSelectedTrack
                            ? "bg-amber-500/15 text-amber-200 font-semibold"
                            : "hover:bg-white/[.03] text-slate-300"
                        }`}
                      >
                        <span className="text-[12.5px] truncate">{meta.label}</span>
                        <div className="flex items-center gap-1">
                          {delta && delta !== 0 && (
                            <DeltaBadge delta={delta} label={meta.label} />
                          )}
                          <span
                            className="font-mono font-bold text-[13px] tabular-nums"
                            style={{ color: getStatGradeColor(val, meta.positive) }}
                          >
                            {Math.round(val)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ─── 目标赛道匹配 ─── */}
            <div className="pt-3.5 border-t border-white/[.07]">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/[.07]">
                <h4 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <span className="text-emerald-400">🎯</span> 转行与求职赛道匹配度
                </h4>
                <span className="text-[11px] text-slate-400">点击高亮关键技能</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {trackScores.map((track) => {
                  const isSelected = selectedTrackCode === track.code;
                  return (
                    <div
                      key={track.code}
                      onClick={() => setSelectedTrackCode(track.code)}
                      className={`cursor-pointer px-3 py-2 rounded-lg transition-all ${
                        isSelected
                          ? "bg-white/[.06] text-amber-300"
                          : "hover:bg-white/[.03] text-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`font-mono font-bold text-[11px] ${isSelected ? "text-amber-300" : "text-slate-400"}`}>
                            {track.code}
                          </span>
                          <span className="font-semibold text-[13px] truncate">{track.name}</span>
                        </div>
                        <span className="font-mono font-bold text-amber-300 text-[13px] shrink-0 ml-1">
                          {track.stars}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{track.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </main>

          {/* ─── 右栏 (Col 9-12): 六维能力雷达 + 诊断 ─── */}
          <aside className="lg:col-span-3 p-4 sm:p-5 flex flex-col gap-4">
            {/* 六维多边形雷达图 */}
            <div>
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/[.07]">
                <span className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <span>🕸️</span> 六维能力图谱
                </span>
                <span className="text-[11px] text-emerald-400 font-mono font-semibold">RADAR</span>
              </div>

              <div className="w-full aspect-square max-w-[185px] mx-auto py-1">
                <HexRadarChart stats={safeStats} />
              </div>
            </div>

            {/* 能力诊断报告 */}
            <div className="pt-3.5 border-t border-white/[.07] space-y-3">
              <div className="flex items-center justify-between pb-1.5 border-b border-white/[.07]">
                <h4 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <span>📋</span> 综合能力诊断
                </h4>
                <span className="text-[11px] text-amber-400 font-mono font-semibold">DIAGNOSIS</span>
              </div>

              <div>
                <p className="text-[12.5px] font-bold text-emerald-400 mb-1 flex items-center gap-1">
                  <span>🟢</span> 核心竞争优势
                </p>
                <div className="space-y-1 text-[12px] text-slate-300 pl-2">
                  {strengths.map((s, idx) => (
                    <div key={idx} className="flex items-start gap-1 leading-relaxed">
                      <span className="text-emerald-400 font-bold">•</span>
                      <p>{s}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[12.5px] font-bold text-amber-400 mb-1 flex items-center gap-1">
                  <span>🟡</span> 待补强短板
                </p>
                <div className="space-y-1 text-[12px] text-slate-300 pl-2">
                  {weaknesses.map((w, idx) => (
                    <div key={idx} className="flex items-start gap-1 leading-relaxed">
                      <span className="text-amber-400 font-bold">•</span>
                      <p>{w}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 已激活特质与天赋 */}
            <div className="pt-3.5 border-t border-white/[.07]">
              <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-white/[.07]">
                <span className="font-bold text-white text-xs flex items-center gap-1.5">
                  <span>✦</span> 解锁特质
                </span>
                <span className="text-[11px] text-slate-400 font-mono">{activePerks.length} 项</span>
              </div>

              {activePerks.length === 0 ? (
                <p className="text-xs text-slate-400 py-1">暂未解锁特殊特质，可在后续回合中触发成长。</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {activePerks.map((perk) => (
                    <span
                      key={perk.id}
                      title={perk.desc}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white/[.04] text-slate-200 text-[11.5px] font-medium"
                    >
                      <span>{perk.icon}</span>
                      <span>{perk.name}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* 3. TAB 2: 个人简历（左右双栏排版：左栏背景与能力，右栏专属实战经历流） */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeSubTab === "resume" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-white/[.07]">
          {/* ─── 左栏 (Col 1-5): 个人抬头 + 教育背景 + 核心优势 + 资金储备 ─── */}
          <div className="lg:col-span-5 p-5 sm:p-6 space-y-6">
            {/* 简历抬头 */}
            <div className="pb-5 border-b border-white/[.08]">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[11px] tracking-[0.25em] text-[#c9a84c] uppercase font-bold">
                    CURRICULUM VITAE
                  </p>
                  <h2 className="text-2xl sm:text-3xl font-bold text-white mt-1 font-serif tracking-tight">
                    {playerName}
                  </h2>
                </div>
                <span className="text-emerald-400 font-semibold text-xs mt-1">
                  ● 在读·随时入职
                </span>
              </div>
              <div className="mt-3 space-y-1 pl-4 text-[12.5px] text-slate-300">
                <p className="flex items-center gap-1.5">
                  <span className="text-slate-400">求职意向：</span>
                  <strong className="text-white font-medium">{selectedTrack.name}</strong>
                </p>
                <p className="flex items-center gap-1.5">
                  <span className="text-slate-400">期望薪资：</span>
                  <strong className="text-amber-300 font-mono font-bold text-[13.5px]">{marketSalary}</strong>
                </p>
                <p className="flex items-center gap-1.5">
                  <span className="text-slate-400">当前学期：</span>
                  <span className="text-slate-300 font-mono">{semesterStr}（第 {round}/{totalRound} 回合）</span>
                </p>
              </div>
            </div>

            {/* 教育背景 */}
            <div>
              <div className="flex items-center gap-2 pb-2 mb-3.5 border-b border-white/[.08]">
                <GraduationCap className="text-sky-400" size={16} />
                <h3 className="font-bold text-white text-sm tracking-wide">教育背景 (Education)</h3>
              </div>

              <div className="space-y-3.5 pl-4 text-[12.5px]">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-[14px] font-bold text-slate-100">{playerSchool}</h4>
                    <span
                      className="px-2 py-0.5 rounded text-[11px] font-bold"
                      style={{
                        background: character?.isOverseas ? "#4a9eff20" : `${TIER_COLORS[masterTier] || '#64b5f6'}20`,
                        color: character?.isOverseas ? "#4a9eff" : (TIER_COLORS[masterTier] || '#64b5f6')
                      }}
                    >
                      {character?.isOverseas ? "海外留学" : (TIER_LABELS[masterTier] || "985 / 建筑老八校")}
                    </span>
                  </div>
                  <p className="text-slate-400 mt-0.5">
                    全日制建筑学硕士 · 导师：{mentorName}（好感度 {safeStats.mentorFavorability}%）
                  </p>
                </div>

                <div className="pt-3 border-t border-white/[.04]">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-[14px] font-bold text-slate-100">{undergradSchool}</h4>
                    <span
                      className="px-2 py-0.5 rounded text-[11px] font-bold"
                      style={{ background: `${TIER_COLORS[undergradTier]}20`, color: TIER_COLORS[undergradTier] }}
                    >
                      {TIER_LABELS[undergradTier]}
                    </span>
                  </div>
                  <p className="text-slate-400 mt-0.5">建筑学五年制工学学士 · 本科已毕业</p>
                </div>
              </div>
            </div>

            {/* 核心专业优势 */}
            <div>
              <div className="flex items-center gap-2 pb-2 mb-2.5 border-b border-white/[.08]">
                <Sparkles className="text-emerald-400" size={16} />
                <h3 className="font-bold text-white text-sm tracking-wide">核心专业优势</h3>
              </div>
              <div className="space-y-1.5 pl-4 text-xs text-slate-300">
                {strengths.map((s, i) => (
                  <p key={i} className="flex items-start gap-1.5 leading-relaxed">
                    <span className="text-emerald-400 font-bold">•</span>
                    <span>{s}</span>
                  </p>
                ))}
              </div>
            </div>

            {/* 资金与资源储备 */}
            <div>
              <div className="flex items-center gap-2 pb-2 mb-2.5 border-b border-white/[.08]">
                <Wallet className="text-amber-400" size={16} />
                <h3 className="font-bold text-white text-sm tracking-wide">资金与资源储备</h3>
              </div>
              <div className="space-y-2 pl-4 text-xs">
                <div className="flex justify-between py-1 border-b border-white/[.04]">
                  <span className="text-slate-400">储蓄流动资金</span>
                  <span className="font-mono font-bold text-emerald-400 text-sm">
                    {formatYuan(moneyToBalance(safeStats.money ?? 50))}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/[.04]">
                  <span className="text-slate-400">行业声望 / 人脉指数</span>
                  <span className="font-mono font-bold text-amber-300 text-sm">
                    {safeStats.reputation ?? 50} <span className="text-slate-500 text-[10px]">/ 100</span>
                  </span>
                </div>
              </div>
            </div>

            {/* 已激活特质 */}
            {activePerks.length > 0 && (
              <div>
                <div className="flex items-center gap-2 pb-2 mb-2 border-b border-white/[.08]">
                  <span className="text-amber-400 text-xs">✦</span>
                  <h3 className="font-bold text-white text-sm tracking-wide">已解锁特质 ({activePerks.length})</h3>
                </div>
                <div className="flex flex-wrap gap-1.5 pl-4">
                  {activePerks.map((perk) => (
                    <span
                      key={perk.id}
                      title={perk.desc}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white/[.04] text-slate-200 text-[11.5px] font-medium"
                    >
                      <span>{perk.icon}</span>
                      <span>{perk.name}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ─── 右栏 (Col 6-12): 专属实习与实战经历流 ─── */}
          <div className="lg:col-span-7 p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-2.5 border-b border-white/[.08]">
              <div className="flex items-center gap-2">
                <Briefcase className="text-amber-400" size={16} />
                <h3 className="font-bold text-white text-sm tracking-wide">实习与实战经历 (Experience)</h3>
              </div>
              <span className="text-xs font-mono font-bold text-amber-300 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                已积累 {pastInternships.length} 段经历
              </span>
            </div>

            {pastInternships.length === 0 ? (
              <div className="py-16 text-center text-slate-500 space-y-2">
                <p className="text-sm font-medium text-slate-400">暂无正式实习项目记录</p>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                  可通过“地图行动”或“求职电脑”的招聘中心投递心仪岗位。面试通过后，经历将自动沉淀至此，并支持随时在线编辑项目成果与薪资。
                </p>
              </div>
            ) : (
              <div className="divide-y divide-white/[.06] pl-4">
                {[...pastInternships].reverse().map((internship, idx) => (
                  <ResumeInternshipRow
                    key={`${internship.id}-${idx}`}
                    internship={internship}
                    onSave={onUpdateInternshipDetails}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 纯净扁平化单条实习展示组件
// ============================================================================

function ResumeInternshipRow({
  internship,
  onSave,
}: {
  internship: InternshipItem;
  onSave?: (internshipId: string, updates: { stipend: string; description: string; detailedAchievements: string[] }) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [stipendDraft, setStipendDraft] = useState(internship.stipend || "");
  const [descriptionDraft, setDescriptionDraft] = useState(internship.description || "");
  const [achievementsDraft, setAchievementsDraft] = useState((internship.detailedAchievements ?? []).join("\n"));

  const resetDrafts = useCallback(() => {
    setStipendDraft(internship.stipend || "");
    setDescriptionDraft(internship.description || "");
    setAchievementsDraft((internship.detailedAchievements ?? []).join("\n"));
  }, [internship.stipend, internship.description, internship.detailedAchievements]);

  useEffect(() => {
    if (!isEditing) resetDrafts();
  }, [isEditing, resetDrafts]);

  const handleSave = () => {
    if (!stipendDraft.trim()) return;
    if (onSave) {
      onSave(internship.id, {
        stipend: stipendDraft.trim(),
        description: descriptionDraft.trim(),
        detailedAchievements: achievementsDraft
          .split(/\r?\n/)
          .map((a) => a.trim())
          .filter(Boolean),
      });
    }
    setIsEditing(false);
  };

  return (
    <div className="py-3.5 space-y-2 text-xs">
      <div className="flex justify-between items-start">
        <div>
          <h4 className="text-[14.5px] font-bold text-white">{internship.companyName}</h4>
          <p className="text-[12.5px] text-slate-300 mt-0.5">{internship.title}</p>
        </div>
        <div className="text-right">
          <span className="font-mono font-bold text-amber-300 text-[13px]">{internship.stipend?.split(" · ")[0]}</span>
          {internship.category && (
            <span className="block text-[10.5px] text-slate-400 mt-0.5">{internship.category}</span>
          )}
        </div>
      </div>

      {isEditing ? (
        <div className="space-y-3 pt-2">
          <label className="block">
            <span className="mb-1 block text-xs text-slate-400 font-medium">薪资 / 补贴</span>
            <input
              value={stipendDraft}
              onChange={(e) => setStipendDraft(e.target.value)}
              className="w-full rounded bg-white/[.04] border border-white/10 px-3 py-1.5 text-xs text-white outline-none focus:border-amber-400"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-slate-400 font-medium">经历描述</span>
            <textarea
              value={descriptionDraft}
              onChange={(e) => setDescriptionDraft(e.target.value)}
              rows={3}
              className="w-full rounded bg-white/[.04] border border-white/10 px-3 py-1.5 text-xs text-white outline-none focus:border-amber-400"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-slate-400 font-medium">项目成果（每行一条）</span>
            <textarea
              value={achievementsDraft}
              onChange={(e) => setAchievementsDraft(e.target.value)}
              rows={4}
              placeholder="例如：主导核心模块方案设计，成果获评审专家高度认可"
              className="w-full rounded bg-white/[.04] border border-white/10 px-3 py-1.5 text-xs text-white outline-none focus:border-amber-400"
            />
          </label>
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => { resetDrafts(); setIsEditing(false); }}
              className="px-3 py-1 rounded text-xs text-slate-400 hover:text-white"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-3.5 py-1 rounded bg-amber-500/20 text-xs font-semibold text-amber-300 hover:bg-amber-500/30"
            >
              保存修改
            </button>
          </div>
        </div>
      ) : (
        <div>
          <p className="text-[12.5px] text-slate-300 leading-relaxed">
            {internship.description || "暂无经历描述"}
          </p>
          {internship.detailedAchievements && internship.detailedAchievements.length > 0 && (
            <ul className="mt-1.5 space-y-1 text-slate-400 pl-3">
              {internship.detailedAchievements.map((item, idx) => (
                <li key={idx} className="list-disc leading-relaxed text-[12px]">{item}</li>
              ))}
            </ul>
          )}
          {onSave && (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="mt-2 inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-amber-300 transition-colors"
            >
              <Pencil size={11} /> 编辑经历与项目成果
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 六维能力多边形雷达组件
// ============================================================================

const RADAR_AXES: Array<{ label: string; key: StatusKey }> = [
  { label: "专业", key: "arch" },
  { label: "逻辑", key: "logic" },
  { label: "表达", key: "expression" },
  { label: "人脉", key: "network" },
  { label: "体能", key: "health" },
  { label: "商业", key: "commercial" },
];

function HexRadarChart({ stats }: { stats: StatusStats }) {
  const size = 200;
  const center = size / 2;
  const radius = 68;
  const numAxes = RADAR_AXES.length;

  const getCoordinates = (index: number, value: number) => {
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / numAxes;
    const r = (radius * Math.max(10, Math.min(100, value))) / 100;
    return {
      x: center + Math.cos(angle) * r,
      y: center + Math.sin(angle) * r,
    };
  };

  const polygonPoints = (factor: number) => {
    return Array.from({ length: numAxes })
      .map((_, i) => {
        const angle = -Math.PI / 2 + (i * 2 * Math.PI) / numAxes;
        const r = radius * factor;
        return `${center + Math.cos(angle) * r},${center + Math.sin(angle) * r}`;
      })
      .join(" ");
  };

  const statPoints = RADAR_AXES.map((axis, i) => {
    const val = stats[axis.key] ?? 50;
    const pt = getCoordinates(i, val);
    return `${pt.x},${pt.y}`;
  }).join(" ");

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full overflow-visible">
      {[0.25, 0.5, 0.75, 1.0].map((factor) => (
        <polygon
          key={factor}
          points={polygonPoints(factor)}
          fill={factor === 1.0 ? "rgba(16, 185, 129, 0.02)" : "none"}
          stroke="rgba(255, 255, 255, 0.08)"
          strokeWidth="1"
        />
      ))}

      {RADAR_AXES.map((_, i) => {
        const pt = getCoordinates(i, 100);
        return (
          <line
            key={i}
            x1={center}
            y1={center}
            x2={pt.x}
            y2={pt.y}
            stroke="rgba(255, 255, 255, 0.08)"
            strokeDasharray="2,2"
          />
        );
      })}

      <polygon
        points={statPoints}
        fill="rgba(16, 185, 129, 0.2)"
        stroke="#10b981"
        strokeWidth="1.5"
      />

      {RADAR_AXES.map((axis, i) => {
        const val = stats[axis.key] ?? 50;
        const pt = getCoordinates(i, val);
        const labelPt = getCoordinates(i, 122);

        return (
          <g key={axis.key}>
            <circle cx={pt.x} cy={pt.y} r="2.5" fill="#34d399" />
            <text
              x={labelPt.x}
              y={labelPt.y}
              textAnchor="middle"
              dominantBaseline="central"
              fill="#cbd5e1"
              fontSize="9.5"
              fontWeight="bold"
              className="font-mono"
            >
              {axis.label} {Math.round(val)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
