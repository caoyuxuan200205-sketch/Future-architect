// ================================================================
// 因果驱动事件系统：行为追踪 + 权重模型 + 加权抽取
// 版本：v1.0 | 2026-08-14
// 架构说明：
//   - ActionMemory：跨回合持久化的玩家行为画像
//   - EVENT_META：每条事件的元数据（主题/情绪/基础权重/行为修饰/状态门槛/必触发）
//   - getCausalEvent()：核心抽取算法，替换原 pick()
// ================================================================

/** 游戏属性（与 GamePage 内 Stats 同构，独立声明以避免循环依赖） */
export interface CausalStats {
  arch: number;
  logic: number;
  expression: number;
  english: number;
  structured: number;
  stress: number;
  network: number;
  money: number;
  selfDoubt: number;
  ageAnxiety: number;
  mentorFavorability: number;
}

/** 行动 ID 类型（对应 GamePage ACTIONS 数组的 id 字段） */
export type ActionId =
  | "revise"
  | "product"
  | "internship"
  | "campus"
  | "ielts"
  | "sidejob"
  | "gifts"
  | "slack";

/** 行为记忆系统 —— 追踪玩家行为模式，作为事件触发权重的修饰因子 */
export interface ActionMemory {
  // 累计行为次数（从游戏开始算总账）
  totalActions: Record<string, number>;

  // 连续行为次数（执行不同行动时重置对应计数；用于检测"连续改图""连续投简历"）
  streak: Record<string, number>;

  // 学期内行为次数（学期末重置；用于检测"本学期狂投简历"）
  semesterActions: Record<string, number>;

  // 关键里程碑（标量字段，语义清晰）
  totalInternships: number;       // 累计投实习次数
  totalCampusApply: number;       // 累计参加校招次数
  totalBurnout: number;           // 摆烂总次数
  totalGifts: number;             // 送礼总次数
  totalSidejobs: number;          // 副业总次数
  mentorBetrayalCount: number;    // 导师好感跌破 20 的次数

  // 事件节奏控制（防止连珠炮式同主题轰炸）
  lastTheme: EventTheme | null;        // 上次触发的事件主题
  consecutiveNegative: number;         // 连续负面事件数
  consecutivePositive: number;         // 连续正面事件数

  // 已触发的里程碑标记（命中一次后锁定，避免重复保底）
  triggeredGuaranteed: Record<string, boolean>;
}

/** 创建初始 ActionMemory */
export function createActionMemory(): ActionMemory {
  return {
    totalActions: {},
    streak: {},
    semesterActions: {},
    totalInternships: 0,
    totalCampusApply: 0,
    totalBurnout: 0,
    totalGifts: 0,
    totalSidejobs: 0,
    mentorBetrayalCount: 0,
    lastTheme: null,
    consecutiveNegative: 0,
    consecutivePositive: 0,
    triggeredGuaranteed: {},
  };
}

/** 玩家执行行动后更新行为记忆 */
export function recordAction(memory: ActionMemory, actionId: ActionId): ActionMemory {
  const next: ActionMemory = {
    ...memory,
    totalActions: { ...memory.totalActions },
    streak: { ...memory.streak },
    semesterActions: { ...memory.semesterActions },
  };

  // 累计
  next.totalActions[actionId] = (next.totalActions[actionId] ?? 0) + 1;
  next.semesterActions[actionId] = (next.semesterActions[actionId] ?? 0) + 1;

  // 连续：执行当前行动时，重置其他行动的连续计数，本行动 +1
  const newStreak: Record<string, number> = {};
  for (const key of Object.keys(next.streak)) {
    if (key !== actionId) continue; // 丢弃其他行动的连续计数
    newStreak[key] = next.streak[key];
  }
  newStreak[actionId] = (next.streak[actionId] ?? 0) + 1;
  next.streak = newStreak;

  // 关键里程碑累加
  if (actionId === "internship") next.totalInternships += 1;
  if (actionId === "campus") next.totalCampusApply += 1;
  if (actionId === "slack") next.totalBurnout += 1;
  if (actionId === "gifts") next.totalGifts += 1;
  if (actionId === "sidejob") next.totalSidejobs += 1;

  return next;
}

/** 事件结算后更新节奏状态 */
export function recordEventOutcome(
  memory: ActionMemory,
  eventId: string,
  theme: EventTheme,
  mood: EventMood,
): ActionMemory {
  return {
    ...memory,
    lastTheme: theme,
    consecutiveNegative: mood === "negative" ? memory.consecutiveNegative + 1 : 0,
    consecutivePositive: mood === "positive" ? memory.consecutivePositive + 1 : 0,
    triggeredGuaranteed:
      mood === "positive" || mood === "negative"
        ? memory.triggeredGuaranteed
        : { ...memory.triggeredGuaranteed, [eventId]: true },
  };
}

/** 标记某事件为已触发里程碑（用于必触发池命中后锁定） */
export function markGuaranteedTriggered(memory: ActionMemory, eventId: string): ActionMemory {
  return {
    ...memory,
    triggeredGuaranteed: { ...memory.triggeredGuaranteed, [eventId]: true },
  };
}

/** 学期末重置：清空学期内行为计数 */
export function resetSemesterActions(memory: ActionMemory): ActionMemory {
  return {
    ...memory,
    semesterActions: {},
  };
}

/** 当导师好感跌破阈值时记录一次背叛标记 */
export function recordMentorBetrayal(memory: ActionMemory, prevFavor: number, nextFavor: number): ActionMemory {
  if (prevFavor >= 20 && nextFavor < 20) {
    return { ...memory, mentorBetrayalCount: memory.mentorBetrayalCount + 1 };
  }
  return memory;
}

// ================================================================
// 事件主题与情绪
// ================================================================

export type EventTheme = "mentor" | "job" | "psych" | "growth" | "arch" | "social";
export type EventMood = "positive" | "negative";

// ================================================================
// EVENT_META：每条事件的元数据
// ================================================================

export interface EventMeta {
  theme: EventTheme;
  mood: EventMood;
  baseWeight: number;
  /** 行为修饰因子：返回 >1 表示提升权重，<1 表示降低 */
  behaviorModifier?: (m: ActionMemory, s: CausalStats) => number;
  /** 状态门槛因子：返回权重倍率 */
  stateGate?: (s: CausalStats) => number;
  /** 必触发判定：若返回 true 且事件未被标记过，则直接选中 */
  guaranteed?: (m: ActionMemory, s: CausalStats, semester: number) => boolean;
}

const clampFactor = (v: number, min = 0.1, max = 8.0): number => Math.max(min, Math.min(max, v));

/** 便捷读取字段（兼容 undefined） */
const get = (obj: Record<string, number> | undefined, key: string, fallback = 0): number =>
  obj && typeof obj[key] === "number" ? obj[key] : fallback;

/**
 * 全量事件元数据表（覆盖 e01–e62 的 52 条主事件）
 * 行为修饰规则按设计文档第 4.3 节配置；状态门槛按 4.4 节配置。
 */
export const EVENT_META: Record<string, EventMeta> = {
  // ---------- 导师线 mentor ----------
  "e01": {
    theme: "mentor", mood: "negative", baseWeight: 1.0,
    behaviorModifier: (m) => clampFactor(1 + get(m.streak, "revise") * 0.8),
    stateGate: (s) => clampFactor(s.mentorFavorability < 35 ? 1.5 : 1.0),
  },
  "e07": {
    theme: "mentor", mood: "negative", baseWeight: 1.0,
    behaviorModifier: (m) => clampFactor(get(m.streak, "revise") >= 3 ? 3.0 : get(m.streak, "revise") >= 2 ? 2.0 : 1.0),
  },
  "e08": {
    theme: "mentor", mood: "negative", baseWeight: 1.0,
    behaviorModifier: (m, s) => clampFactor(s.mentorFavorability >= 55 ? 2.0 : 0.6),
  },
  "e13": {
    theme: "mentor", mood: "negative", baseWeight: 1.0,
    behaviorModifier: (m, s) => clampFactor(s.mentorFavorability <= 40 && get(m.totalActions, "internship") >= 2 ? 2.5 : 0.5),
  },
  "e21": {
    theme: "mentor", mood: "negative", baseWeight: 1.0,
    stateGate: (s) => clampFactor(s.mentorFavorability <= 35 ? 2.0 : 0.4),
  },
  "e22": { theme: "mentor", mood: "negative", baseWeight: 1.0 },
  "e36": {
    theme: "mentor", mood: "negative", baseWeight: 1.0,
    stateGate: (s) => clampFactor(s.mentorFavorability <= 25 ? 3.0 : s.mentorFavorability <= 40 ? 1.5 : 0.3),
  },
  "e40": { theme: "mentor", mood: "negative", baseWeight: 1.0 },
  "e53": {
    theme: "mentor", mood: "negative", baseWeight: 1.0,
    behaviorModifier: (m) => clampFactor(get(m.totalActions, "revise") >= 6 ? 2.0 : 0.7),
  },
  "e59": { theme: "mentor", mood: "negative", baseWeight: 1.0 },

  // ---------- 求职线 job ----------
  "e02": {
    theme: "job", mood: "negative", baseWeight: 1.0,
    stateGate: (s) => clampFactor(s.selfDoubt >= 60 ? 2.0 : 1.0),
  },
  "e03": { theme: "job", mood: "negative", baseWeight: 1.0 },
  "e06": {
    theme: "job", mood: "negative", baseWeight: 1.0,
    behaviorModifier: (m) => {
      const total = get(m.totalActions, "internship");
      if (total >= 5) return 5.0;
      if (total >= 3) return 3.0;
      if (total >= 1) return 1.5;
      return 0.5;
    },
  },
  "e09": {
    theme: "job", mood: "negative", baseWeight: 1.0,
    behaviorModifier: (m) => clampFactor(get(m.totalActions, "internship") + get(m.totalActions, "campus") >= 5 ? 2.0 : 0.8),
  },
  "e10": { theme: "job", mood: "negative", baseWeight: 1.0 },
  "e11": {
    theme: "job", mood: "negative", baseWeight: 1.0,
    behaviorModifier: (m) => clampFactor(get(m.totalActions, "campus") >= 2 ? 2.5 : 0.5),
  },
  "e12": {
    theme: "job", mood: "negative", baseWeight: 1.0,
    behaviorModifier: (m) => clampFactor(get(m.totalActions, "internship") >= 4 ? 2.0 : 0.7),
  },
  "e16": {
    theme: "job", mood: "negative", baseWeight: 1.0,
    behaviorModifier: (m) => clampFactor(get(m.totalActions, "ielts") >= 2 ? 2.0 : 0.6),
  },
  "e29": {
    theme: "job", mood: "negative", baseWeight: 1.0,
    behaviorModifier: (_m, _s) => 1.0,
    stateGate: (_s) => 1.0,
  },
  "e32": { theme: "job", mood: "negative", baseWeight: 1.0 },
  "e34": { theme: "job", mood: "negative", baseWeight: 1.0 },
  "e37": { theme: "job", mood: "negative", baseWeight: 1.0 },
  "e39": { theme: "job", mood: "negative", baseWeight: 1.0 },
  "e41": {
    theme: "job", mood: "positive", baseWeight: 1.5,
    behaviorModifier: (m) => clampFactor(get(m.totalActions, "internship") >= 3 ? 1.8 : 0.6),
    guaranteed: (m) => get(m.totalActions, "internship") >= 5 && !m.triggeredGuaranteed["e41"],
  },
  "e44": { theme: "job", mood: "negative", baseWeight: 1.0 },
  "e48": {
    theme: "job", mood: "negative", baseWeight: 1.0,
    behaviorModifier: (m) => clampFactor(get(m.totalActions, "campus") >= 1 ? 1.8 : 0.8),
  },

  // ---------- 心理线 psych ----------
  "e04": { theme: "psych", mood: "negative", baseWeight: 1.0 },
  "e05": {
    theme: "psych", mood: "negative", baseWeight: 1.0,
    stateGate: (s) => clampFactor(s.selfDoubt >= 50 ? 1.8 : 1.0),
  },
  "e14": {
    theme: "psych", mood: "negative", baseWeight: 1.0,
    behaviorModifier: (m) => clampFactor(get(m.totalActions, "slack") >= 2 ? 2.5 : get(m.totalActions, "slack") >= 1 ? 1.5 : 0.7),
  },
  "e19": {
    theme: "psych", mood: "negative", baseWeight: 1.0,
    behaviorModifier: (m) => clampFactor(get(m.streak, "slack") >= 1 ? 2.0 : 1.0),
    stateGate: (s) => clampFactor(s.selfDoubt >= 65 ? 2.5 : 1.0),
  },
  "e23": {
    theme: "psych", mood: "negative", baseWeight: 1.0,
    stateGate: (s) => clampFactor(s.stress <= 20 ? 3.0 : s.stress <= 35 ? 1.8 : 0.5),
  },
  "e25": {
    theme: "psych", mood: "negative", baseWeight: 1.0,
    guaranteed: (_m, _s, semester) => semester >= 5,
  },
  "e28": {
    theme: "psych", mood: "negative", baseWeight: 1.0,
    stateGate: (s) => clampFactor(s.selfDoubt >= 55 ? 2.0 : 0.7),
  },
  "e31": {
    theme: "psych", mood: "negative", baseWeight: 1.0,
    stateGate: (s) => clampFactor(s.stress <= 15 ? 3.0 : s.stress <= 25 ? 2.0 : s.stress <= 40 ? 1.0 : 0.3),
    guaranteed: (m, s) => s.stress <= 15 && !m.triggeredGuaranteed["e31"],
  },
  "e43": {
    theme: "psych", mood: "negative", baseWeight: 1.0,
    stateGate: (s) => clampFactor(s.logic >= 40 ? 1.5 : 0.8),
  },
  "e56": { theme: "psych", mood: "negative", baseWeight: 0.6 },
  "e62": {
    theme: "psych", mood: "positive", baseWeight: 0.7,
    stateGate: (s) => clampFactor(s.stress <= 25 ? 2.5 : 0.5),
    guaranteed: (m, s) => s.stress <= 15 && !m.triggeredGuaranteed["e62"],
  },

  // ---------- 成长正向线 growth ----------
  "e17": {
    theme: "growth", mood: "positive", baseWeight: 1.0,
    behaviorModifier: (m) => {
      const p = get(m.totalActions, "product");
      if (p >= 3) return 2.0;
      if (p >= 1) return 1.5;
      return 0.5;
    },
  },
  "e18": {
    theme: "growth", mood: "positive", baseWeight: 1.0,
    behaviorModifier: (m) => clampFactor(get(m.totalActions, "product") >= 2 ? 1.5 : 0.7),
  },
  "e20": {
    theme: "growth", mood: "positive", baseWeight: 1.0,
    behaviorModifier: (m) => clampFactor(get(m.totalActions, "product") >= 2 ? 1.8 : 0.8),
  },
  "e24": {
    theme: "growth", mood: "positive", baseWeight: 1.0,
    behaviorModifier: (_m, s) => clampFactor(s.network >= 45 ? 2.0 : 0.6),
  },
  "e27": { theme: "growth", mood: "positive", baseWeight: 1.0 },
  "e33": {
    theme: "growth", mood: "positive", baseWeight: 1.0,
    stateGate: (s) => clampFactor(s.logic >= 45 && s.structured >= 40 ? 2.0 : 0.5),
  },
  "e35": {
    theme: "growth", mood: "positive", baseWeight: 1.0,
    behaviorModifier: (m) => clampFactor(get(m.totalActions, "sidejob") >= 3 ? 2.0 : 0.8),
    stateGate: (s) => clampFactor(s.expression >= 50 ? 1.5 : 0.8),
  },
  "e38": {
    theme: "growth", mood: "positive", baseWeight: 1.0,
    stateGate: (s) => clampFactor(s.english >= 45 ? 1.5 : 0.5),
  },
  "e42": { theme: "growth", mood: "positive", baseWeight: 1.0 },
  "e45": { theme: "growth", mood: "positive", baseWeight: 1.0 },
  "e46": { theme: "growth", mood: "positive", baseWeight: 1.0 },
  "e47": { theme: "growth", mood: "positive", baseWeight: 1.0 },
  "e57": {
    theme: "growth", mood: "positive", baseWeight: 1.0,
    behaviorModifier: (m, s) => clampFactor(s.arch >= 60 && get(m.totalActions, "revise") >= 5 ? 2.0 : 0.6),
  },
  "e61": {
    theme: "growth", mood: "positive", baseWeight: 1.0,
    behaviorModifier: (m) => clampFactor(get(m.totalActions, "product") >= 5 && get(m.totalActions, "sidejob") >= 2 ? 1.5 : 0.6),
  },

  // ---------- 建筑专业线 arch ----------
  "e15": { theme: "arch", mood: "negative", baseWeight: 1.0 },
  "e26": {
    theme: "arch", mood: "positive", baseWeight: 1.0,
    behaviorModifier: (m) => clampFactor(get(m.totalActions, "internship") >= 2 ? 1.5 : 0.6),
  },
  "e54": {
    theme: "arch", mood: "negative", baseWeight: 1.0,
    behaviorModifier: (m, s) => clampFactor(get(m.totalActions, "internship") >= 3 && s.arch >= 55 ? 1.5 : 0.5),
  },
  "e55": {
    theme: "arch", mood: "negative", baseWeight: 1.0,
    stateGate: (s) => clampFactor(s.money <= 30 ? 2.0 : 1.0),
  },
  "e58": { theme: "arch", mood: "negative", baseWeight: 1.0 },
  "e60": { theme: "arch", mood: "positive", baseWeight: 0.5 },

  // ---------- 社交人脉线 social ----------
  "e30": {
    theme: "social", mood: "positive", baseWeight: 1.3,
    stateGate: (s) => clampFactor(s.selfDoubt >= 70 ? 2.0 : 1.0),
    guaranteed: (m, s) => s.selfDoubt >= 80 && !m.triggeredGuaranteed["e30"],
  },
  "e50": {
    theme: "social", mood: "positive", baseWeight: 1.0,
    behaviorModifier: (_m, s) => clampFactor(s.network >= 60 ? 2.5 : 1.0),
  },
  "e51": {
    theme: "social", mood: "positive", baseWeight: 1.0,
    behaviorModifier: (_m, s) => clampFactor(s.network >= 50 && s.expression >= 55 ? 2.0 : 0.8),
  },
  "e52": {
    theme: "social", mood: "positive", baseWeight: 1.0,
    behaviorModifier: (m) => clampFactor(get(m.totalActions, "sidejob") >= 2 ? 1.5 : 0.7),
  },

  // ---------- 校园宣讲事件（共享元数据，主要给节奏控制用） ----------
  "e44-campus": { theme: "job", mood: "negative", baseWeight: 1.0 },

  // ---------- 新增事件 e63–e68 ----------
  "e63": {
    theme: "mentor", mood: "positive", baseWeight: 1.0,
    behaviorModifier: (m, s) => clampFactor(get(m.totalActions, "gifts") >= 3 && s.mentorFavorability >= 60 ? 2.5 : 0.3),
  },
  "e64": {
    theme: "job", mood: "positive", baseWeight: 1.0,
    behaviorModifier: (m) => clampFactor(get(m.totalActions, "internship") >= 8 ? 2.0 : 0.2),
  },
  "e65": {
    theme: "growth", mood: "positive", baseWeight: 1.0,
    behaviorModifier: (m) => clampFactor(get(m.totalActions, "product") >= 5 && get(m.totalActions, "sidejob") >= 3 ? 2.0 : 0.2),
  },
  "e66": {
    theme: "psych", mood: "positive", baseWeight: 1.0,
    behaviorModifier: (m, s) => clampFactor(get(m.totalActions, "slack") >= 3 && s.selfDoubt >= 75 ? 2.0 : 0.2),
  },
  "e67": {
    theme: "arch", mood: "positive", baseWeight: 1.0,
    behaviorModifier: (m, s) => clampFactor(s.arch >= 70 && get(m.totalActions, "revise") >= 8 ? 2.0 : 0.2),
  },
  "e68": {
    theme: "social", mood: "positive", baseWeight: 1.0,
    behaviorModifier: (_m, s) => clampFactor(s.network >= 70 ? 2.0 : 0.2),
  },
};

// ================================================================
// 因子函数
// ================================================================

/** 主题节奏因子：抑制同主题/同情绪连发 */
function getThemeRhythm(theme: EventTheme, mood: EventMood, memory: ActionMemory): number {
  let factor = 1.0;

  // 1. 连续 2 次同主题事件，第 3 次权重砍至 0.3
  if (memory.lastTheme === theme) {
    factor *= 0.3;
  }

  // 2. 连续 3 次负面事件：下一个负面 ×0.3，正面 ×2.0（给苦战玩家一束光）
  if (memory.consecutiveNegative >= 3) {
    factor *= mood === "negative" ? 0.3 : 2.0;
  }

  // 3. 连续 2 次正面事件：下一个正面 ×0.5（防止太顺）
  if (memory.consecutivePositive >= 2 && mood === "positive") {
    factor *= 0.5;
  }

  return clampFactor(factor);
}

/** 取事件元数据；缺失时回退到中性默认值 */
function getMeta(eventId: string): EventMeta {
  return (
    EVENT_META[eventId] ?? {
      theme: "growth",
      mood: "positive",
      baseWeight: 1.0,
    }
  );
}

// ================================================================
// 核心抽取算法
// ================================================================

export interface CausalEventLike {
  id: string;
  type?: "positive" | "negative";
  condition?: (ctx: { stats: CausalStats; isOverseas: boolean; semester: number }) => boolean;
}

/**
 * 因果驱动事件抽取
 *
 * @param events      全量事件列表（由调用方传入，便于复用）
 * @param seenIds     已触发过的事件 ID（用于一次性事件过滤）
 * @param stats       当前属性
 * @param memory      行为记忆
 * @param ctx         上下文（isOverseas、semester）
 * @returns 命中的事件对象；若无可用事件返回 null
 */
export function getCausalEvent<T extends CausalEventLike>(
  events: T[],
  seenIds: Set<string>,
  stats: CausalStats,
  memory: ActionMemory,
  ctx: { isOverseas: boolean; semester: number },
): T | null {
  // 1. 过滤可见事件：保持原有 condition 检查 + 已见过滤
  const available = events.filter((e) => {
    if (seenIds.has(e.id)) return false;
    if (e.condition && !e.condition({ stats, isOverseas: ctx.isOverseas, semester: ctx.semester })) return false;
    return true;
  });
  if (available.length === 0) return null;

  // 2. 优先检查必触发池（保底事件）
  for (const e of available) {
    const meta = getMeta(e.id);
    if (meta.guaranteed && meta.guaranteed(memory, stats, ctx.semester)) {
      return e;
    }
  }

  // 3. 为每个事件计算最终权重
  const weighted = available.map((e) => {
    const meta = getMeta(e.id);
    const behaviorMod = meta.behaviorModifier ? meta.behaviorModifier(memory, stats) : 1.0;
    const stateGate = meta.stateGate ? meta.stateGate(stats) : 1.0;
    const rhythm = getThemeRhythm(meta.theme, meta.mood, memory);
    const weight = clampFactor(meta.baseWeight * behaviorMod * stateGate * rhythm);
    return { event: e, weight };
  });

  // 4. 加权随机抽取
  const totalWeight = weighted.reduce((sum, w) => sum + w.weight, 0);
  if (totalWeight <= 0) return available[Math.floor(Math.random() * available.length)];

  let roll = Math.random() * totalWeight;
  for (const w of weighted) {
    roll -= w.weight;
    if (roll <= 0) return w.event;
  }
  return weighted[weighted.length - 1].event;
}

/** 工具函数：判定事件是否为必触发（用于命中后打标记） */
export function isGuaranteedHit(
  eventId: string,
  memory: ActionMemory,
  stats: CausalStats,
  semester: number,
): boolean {
  const meta = getMeta(eventId);
  return Boolean(meta.guaranteed && meta.guaranteed(memory, stats, semester));
}
