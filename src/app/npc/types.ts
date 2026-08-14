/**
 * NPC 社交系统类型定义
 * 对应策划文档 §4.1 数据结构，MVP 版本只保留导师所需字段
 */

/** 好感度→语气标签映射 */
export type ToneTier = "cold" | "neutral" | "polite" | "warm" | "vulnerable";

/** NPC 基础定义 */
export interface NPC {
  id: string;                    // "professor" / "lab_senior" / "peer" / "college_friend"
  name: string;                  // 显示名（沿用已选中的导师名）
  role: string;                  // "你的导师" / "实验室学姐"
  emoji: string;
  /** 性格关键词，仅用于 UI 提示 */
  personality: string;
  /** 口头禅池（UI 提示用，MVP 不强制嵌入台词） */
  catchphrases: string[];
  /** NPC 不在线时返回的占位回复 */
  awayText: string;
  /** 是否默认解锁 */
  unlockedByDefault?: boolean;
  /** 解锁条件描述（UI 展示用） */
  unlockHint: string;
  /** 解锁后的首条问候语 */
  greeting: string;
  /** 关系阶段标签（按好感度区间，升序） */
  stageLabels: { min: number; label: string }[];
  /** 玩家可发送的快捷招呼语池（按好感度区间可选不同风格） */
  playerGreetings?: { min?: number; text: string }[];
}

/** 单条消息 */
export interface NPCMessage {
  id: string;
  npcId: string;
  /** 谁发的：npc 对应 NPC 气泡（左），player 对应玩家气泡（右） */
  from: "npc" | "player";
  text: string;
  /** 该条消息生成时所处的好感语气（仅 npc 消息有意义） */
  tone?: ToneTier;
  /** 绑定的回合（便于按回合过滤） */
  round: number;
  /** 时间戳展示文本，例如 "14:32" */
  timeLabel: string;
  /** 是否已被玩家阅读 */
  read: boolean;
}

/** 玩家可选择的回复选项 */
export interface NPCReplyOption {
  id: string;
  text: string;
  /** 好感度变化（正负皆可） */
  favorDelta: number;
  /** 该选项是否需要属性门槛才显示（MVP 不强制使用） */
  requireStatMin?: { key: string; min: number };
  /** 选中后 NPC 的回应文本（可空，表示该选项不触发 NPC 回复） */
  npcResponse?: string;
  /** 选中后 NPC 回应所采用的语气（默认沿用当前好感映射） */
  responseTone?: ToneTier;
  /** 是否设置关系锚点（MVP 仅做字段保留，不强制使用） */
  anchorFlag?: string;
}

/** 一段对话节点：NPC 发起 + 玩家可选回复 */
export interface NPCDialogueNode {
  /** NPC 的发言 */
  npcMessage: string;
  /** 该发言生成时的好感语气（用于 UI 标签） */
  tone: ToneTier;
  /** 玩家可选项 */
  options: NPCReplyOption[];
}

/** NPC 运行时状态（持久化到 GameState） */
export interface NPCBondStatus {
  npcId: string;
  favorability: number;          // 0-100
  /** 已发消息 ID 列表（顺序即时间顺序） */
  messageIds: string[];
  /** 已设置的锚点（字符串集合） */
  anchorFlags: string[];
  /** 最近一次互动的回合号 */
  lastInteractionRound: number;
  // —— P0 对话树引擎新增 ——
  /** 已完成的对话树 id（防止 oneShot 重复触发） */
  completedTreeIds?: string[];
  /** 当前挂载的对话树 id（null 表示空闲，可发起新对话） */
  activeTreeId?: string | null;
  /** 当前对话进度到的节点 id */
  activeNodeId?: string | null;
  /** 已满足触发条件但玩家还没点开的对话树（红点提示） */
  pendingTreeIds?: string[];
  /** 本回合已聊次数（限制刷好感） */
  chatsThisRound?: number;
  /** 已跨过的里程碑好感阈值（40/60/80），防止重复触发 */
  milestoneFlags?: number[];
  /** 最近一次重置 chatsThisRound 的总回合号 */
  lastChatsResetRound?: number;
  /** 本回合连续打招呼次数（用于触发狂发彩蛋，每回合重置） */
  greetingsThisRound?: number;
  /** 最近一次重置 greetingsThisRound 的总回合号 */
  lastGreetingsResetRound?: number;
  /** 是否处于"激怒冷却"状态（本回合不能再打招呼） */
  enragedLocked?: boolean;
}

/** —— P0 对话树类型 —— */

/** 对话树的触发条件 */
export interface DialogueTrigger {
  type: "unlock" | "milestone" | "round" | "manual";
  /** type=milestone 时：好感度首次达到该值触发 */
  milestoneFavor?: number;
  /** type=round 时：总回合数等于该值时触发 */
  round?: number;
}

/** 对话树中的一个选项（玩家可选的回复） */
export interface DialogueOption {
  id: string;
  text: string;
  /** 好感度变化（正负皆可，0 表示不变） */
  favorDelta?: number;
  /** 直接影响玩家属性（如 +selfDoubt、+logic） */
  statEffects?: Record<string, number>;
  /** 进入下一个节点；undefined / null 表示对话结束 */
  nextNodeId?: string | null;
  /** 设置剧情锚点（写入 bond.anchorFlags，影响结局判定） */
  setAnchorFlags?: string[];
  /** 该选项触发的 NPC 回应语气（用于气泡颜色） */
  responseTone?: ToneTier;
}

/** 对话树中的一个节点：NPC 发言 + 玩家可选项 */
export interface DialogueTreeNode {
  id: string;
  /** NPC 的发言文本 */
  npcMessage: string;
  /** 该发言的语气（用于气泡颜色，可选） */
  tone?: ToneTier;
  /** 玩家可选项；空数组表示对话结束节点 */
  options: DialogueOption[];
}

/** 一棵完整的对话树（一个微型剧本） */
export interface DialogueTree {
  id: string;                            // "prof_career_direction"
  npcId: string;                         // "professor"
  trigger: DialogueTrigger;
  startNodeId: string;                   // 入口节点 id
  nodes: Record<string, DialogueTreeNode>;  // 节点表
  /** 是否一次性剧情（默认 true，完成后不再触发） */
  oneShot?: boolean;
  /** 该对话树被触发的最小总回合（用于防止过早触发） */
  minTotalRound?: number;
}

/** 社交 Tab 标识 */
export type SocialTab = "career" | "messages" | "contacts";

/** 解锁检查上下文 */
export interface UnlockContext {
  semester: number;
  round: number;
  totalRound: number;
  // 未来扩展：stats、internshipApplications、actionMemory 等
}

/** 整个 NPC 引擎的运行时状态 */
export interface SocialState {
  /** NPC id → bond status */
  bonds: Record<string, NPCBondStatus>;
  /** 所有消息 id → 消息对象 */
  messages: Record<string, NPCMessage>;
  /** 消息时间顺序（id 列表） */
  messageOrder: string[];
  /** 是否已经触发过某些一次性事件（key 为事件 id） */
  firedOnce: Record<string, boolean>;
}
