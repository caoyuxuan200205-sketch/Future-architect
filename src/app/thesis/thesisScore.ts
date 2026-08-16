// ================================================================
// 毕业论文估分系统（Thesis Score）
// 设计依据：导师类型决定论文初始分；玩家行为可成长；结局判定挂钩
// ================================================================

/** 导师类型 → 初始论文分（策划案：大牛 35 / 海归 25 / 实践 15 / 放养 0） */
export const MENTOR_THESIS_INITIAL: Record<string, number> = {
  academic: 35, // 学术大牛：严苛但论文指导硬核
  overseas: 25, // 海归前沿：方法论新但磨合期长
  global_scholar: 25, // 全球学者：等同 overseas
  practice: 15, // 实践工程型：项目能力强但论文要求偏弱
  hands_off: 0, // 放养型：基本靠学生自己
};

/** 角色/玩家行为对论文分的加成（用于 effects 表参考，不强制使用） */
export const THESIS_ACTION_BONUS: Record<string, number> = {
  thesis: 8, // 撰写学位论文（主行动）
  revise: 3, // 课题改图积累的实证材料
  product: 2, // PRD 训练提升结构化写作
  industry_research: 2, // 行研提升数据论证
  portfolio: 0, // 作品集对论文帮助有限
};

/** 论文等级定义 */
export interface ThesisGrade {
  level: "excellent" | "good" | "medium" | "pass" | "risk";
  label: string;
  description: string;
  color: string;
  canGraduate: boolean;
}

/** 按分数返回论文等级（满分 100） */
export function calculateThesisGrade(score: number): ThesisGrade {
  if (score >= 85) {
    return {
      level: "excellent",
      label: "优秀",
      description: "盲审高分通过，可能被推荐参评校级优秀学位论文。",
      color: "#52c41a",
      canGraduate: true,
    };
  }
  if (score >= 70) {
    return {
      level: "good",
      label: "良好",
      description: "盲审顺利通过，答辩基本无风险。",
      color: "#1890ff",
      canGraduate: true,
    };
  }
  if (score >= 60) {
    return {
      level: "medium",
      label: "中等",
      description: "盲审可通过但会收到修改意见，需要认真准备答辩。",
      color: "#faad14",
      canGraduate: true,
    };
  }
  if (score >= 45) {
    return {
      level: "pass",
      label: "及格边缘",
      description: "盲审存在被卡风险，需要导师力保或大幅修改。",
      color: "#fa8c16",
      canGraduate: false,
    };
  }
  return {
    level: "risk",
    label: "延毕风险",
    description: "盲审大概率无法通过，当前论文状态难以毕业。",
    color: "#f5222d",
    canGraduate: false,
  };
}

/** 根据 mentorId 返回初始论文分（兜底 0） */
export function getInitialThesisScore(mentorId: string | undefined | null): number {
  if (!mentorId) return 0;
  return MENTOR_THESIS_INITIAL[mentorId] ?? 0;
}

/** UI 展示用：返回导师加成文案 */
export function getMentorThesisBoostLabel(mentorId: string | undefined | null): string {
  if (!mentorId) return "未选导师";
  const map: Record<string, string> = {
    academic: "学术大牛指导 +35",
    overseas: "海归导师指导 +25",
    global_scholar: "海归导师指导 +25",
    practice: "实践派导师指导 +15",
    hands_off: "放养型导师 +0",
  };
  return map[mentorId] ?? "无加成";
}

/** 格式化展示：78 → "78（良好）" */
export function formatThesisScore(score: number): string {
  const grade = calculateThesisGrade(score);
  return `${score}（${grade.label}）`;
}
