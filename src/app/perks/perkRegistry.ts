/**
 * 天赋 Perk 系统
 * 参考 Football Manager：当某些属性组合达到阈值时自动激活，
 * 给特定公司类别或结局分支增加 buff。
 *
 * 设计原则：
 * - Perk 只增加 buff，不改变结局触发条件
 * - 同一 Stats 可同时激活多个 Perk（叠加生效）
 * - 公司判定时累加 Perk 提供的 buff 到 winRate
 */

// 从 GamePage 导出的 Stats 形状（这里只取需要的字段避免循环依赖）
export interface PerkStats {
  arch: number; logic: number; expression: number; english: number; structured: number;
  stress: number; network: number; money: number;
  selfDoubt: number; ageAnxiety: number; mentorFavorability: number;
  dataSense: number; visualTaste: number; writingDepth: number;
  codeBasic: number; commercial: number; industryResearch: number;
  negotiation: number; leadership: number; empathy: number; execution: number;
  fastLearning: number; alignment: number;
  reputation: number; health: number; riskTolerance: number; aestheticTheory: number;
  infoChannels: number;
}

export interface PerkBuff {
  /** 加成目标：具体公司 id 或公司类别 */
  companyId?: string;
  category?: string;
  /** 录取率加成（百分点） */
  bonus: number;
}

export interface Perk {
  id: string;
  name: string;
  desc: string;
  icon: string;
  /** 激活条件：所有条件都满足才点亮 */
  condition: (s: PerkStats) => boolean;
  /** 激活后提供的加成 */
  buffs: PerkBuff[];
  /** 用于排序的优先级（数字越大越靠前） */
  priority?: number;
}

// ============================================================================
// 10 个 Perk 定义
// ============================================================================

export const PERKS: Perk[] = [
  {
    id: "spatial_pm",
    name: "空间型产品经理",
    desc: "建筑 × 逻辑 × 审美 三角共鸣——你能把空间感迁移到产品架构上",
    icon: "🏛️",
    priority: 95,
    condition: (s) => s.arch >= 60 && s.logic >= 60 && s.visualTaste >= 55,
    buffs: [
      { category: "互联网大厂", bonus: 5 },
      { companyId: "tencent", bonus: 3 },
      { companyId: "bytedance", bonus: 3 },
    ],
  },
  {
    id: "consulting_brain",
    name: "咨询型大脑",
    desc: "逻辑、结构化、数据、英语四项全能——拆解问题的天然好手",
    icon: "📊",
    priority: 90,
    condition: (s) => s.logic >= 70 && s.structured >= 70 && s.dataSense >= 55 && s.english >= 60,
    buffs: [
      { category: "咨询公司", bonus: 8 },
      { companyId: "mckinsey", bonus: 4 },
      { companyId: "bcg", bonus: 3 },
    ],
  },
  {
    id: "design_compound",
    name: "设计复合体",
    desc: "建筑底蕴 + 高审美 + 共情力——Apple/外企设计岗的理想画像",
    icon: "🎨",
    priority: 88,
    condition: (s) => s.arch >= 55 && s.visualTaste >= 65 && s.empathy >= 50,
    buffs: [
      { category: "外企科技", bonus: 5 },
      { companyId: "apple", bonus: 10 },
    ],
  },
  {
    id: "ai_pm_track",
    name: "AI 产品预备役",
    desc: "懂点代码 + 数据敏感 + 商业直觉——AI 浪潮里的复合型 PM",
    icon: "🤖",
    priority: 85,
    condition: (s) => s.logic >= 65 && s.codeBasic >= 40 && s.dataSense >= 55 && s.commercial >= 45,
    buffs: [
      { companyId: "baidu", bonus: 7 },
      { companyId: "bytedance", bonus: 5 },
      { companyId: "kuaishou", bonus: 5 },
    ],
  },
  {
    id: "academic_elite",
    name: "学院派",
    desc: "建筑功底扎实 + 导师青睐 + 写作有深度——读博/设计院的天选之人",
    icon: "📚",
    priority: 80,
    condition: (s) => s.arch >= 70 && s.mentorFavorability >= 55 && s.writingDepth >= 50,
    buffs: [
      { category: "传统路径", bonus: 10 },
      { companyId: "cadg", bonus: 5 },
      { companyId: "seu_design", bonus: 5 },
    ],
  },
  {
    id: "street_fighter",
    name: "老油条",
    desc: "谈判力 + 共情 + 人脉三连——商务、BD、销售岗的天然禀赋",
    icon: "🛡️",
    priority: 75,
    condition: (s) => s.negotiation >= 60 && s.empathy >= 55 && s.network >= 50,
    buffs: [
      { category: "中厂", bonus: 4 },
      { companyId: "pdd", bonus: 5 },
      { companyId: "meituan", bonus: 4 },
    ],
  },
  {
    id: "wall_builder",
    name: "砌墙工人",
    desc: "建筑 + 执行 + 抗压——能落地、能扛活的传统建筑中坚",
    icon: "🧱",
    priority: 70,
    condition: (s) => s.arch >= 55 && s.execution >= 65 && s.stress >= 55,
    buffs: [
      { category: "传统路径", bonus: 5 },
      { companyId: "vanke", bonus: 4 },
    ],
  },
  {
    id: "storyteller",
    name: "镜头感",
    desc: "表达 + 写作 + 谈判——公关、市场、内容方向的关键天赋",
    icon: "🗣️",
    priority: 72,
    condition: (s) => s.expression >= 65 && s.writingDepth >= 55 && s.negotiation >= 45,
    buffs: [
      { companyId: "xiaohongshu", bonus: 6 },
      { companyId: "bilibili", bonus: 5 },
    ],
  },
  {
    id: "entrepreneur_seed",
    name: "创业苗子",
    desc: "商业嗅觉 + 领导力 + 执行 + 风险偏好——骨子里想自己干",
    icon: "🦅",
    priority: 78,
    condition: (s) => s.commercial >= 60 && s.leadership >= 55 && s.execution >= 60 && s.riskTolerance >= 50,
    buffs: [
      { category: "小厂", bonus: 6 },
      { companyId: "keep", bonus: 4 },
      { companyId: "soul", bonus: 4 },
    ],
  },
  {
    id: "resilient_survivor",
    name: "转型兜底",
    desc: "心理三件套全绿（低怀疑、低焦虑、高抗压）——任何结局都更可能走好分支",
    icon: "⚓",
    priority: 60,
    condition: (s) => s.selfDoubt <= 25 && s.ageAnxiety <= 25 && s.stress >= 55,
    buffs: [
      { category: "互联网大厂", bonus: 3 },
      { category: "中厂", bonus: 3 },
      { category: "外企科技", bonus: 3 },
    ],
  },
];

// ============================================================================
// 工具函数
// ============================================================================

/** 根据当前 Stats 计算已激活的 Perk 列表 */
export function getActivePerks(stats: PerkStats): Perk[] {
  return PERKS
    .filter((p) => p.condition(stats))
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
}

/** 给定公司 id 和类别，返回所有激活 Perk 提供的总 buff（百分点） */
export function getTotalPerkBonus(stats: PerkStats, companyId: string, category: string): number {
  return getActivePerks(stats).reduce((sum, perk) => {
    return sum + perk.buffs.reduce((s, b) => {
      if (b.companyId === companyId) return s + b.bonus;
      if (b.category === category) return s + b.bonus;
      return s;
    }, 0);
  }, 0);
}
