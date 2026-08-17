/**
 * NPC 社交引擎：消息收发、话题触发、好感度结算
 * 全部为纯函数，方便测试与回退
 */
import type {
  SocialState,
  NPCMessage,
  NPCReplyOption,
  NPCBondStatus,
  UnlockContext,
  DialogueTree,
  DialogueOption,
} from "./types";
import {
  NPC_REGISTRY,
  toneFromFavorability,
  PROFESSOR_FOLLOWUP_POOL,
} from "./npcRegistry";
import { DIALOGUE_TREES } from "./dialogueTrees";

/**
 * 打招呼彩蛋 · 冷却期文案（爆发后本回合再发 → 此回复）
 * 每个 NPC 专属，体现角色个性。professor 文案保留原版。
 */
const GREETING_COOLDOWN_TEXT: Record<string, string> = {
  professor:
    "（导师没有回复。办公室的门关着，里面没有开灯。）",
  lab_senior:
    "（学姐把你的对话框关掉了。她在忙，显然没有再聊的意思。）",
  peer:
    "（张一帆没有回复。他大概在图书馆，没工夫理你。）",
  college_friend:
    "（顾小北没有回复。她可能觉得你今天有点不对劲。）",
};

/**
 * 打招呼彩蛋 · 爆发前奏文案（第 5 次打招呼触发）
 * professor 触发爆发对话树；其他 NPC 走通用愤怒表现但不触发对话树。
 */
const GREETING_STORM_START: Record<string, string> = {
  professor:
    "（导师没有回复。一分钟后，你收到了一条短信：「来我办公室。」）",
  lab_senior:
    "（学姐终于回复了，但只有三个字：「别发了。」接着她就再没出现过。）",
  peer:
    "（张一帆回了一句：「我今天不想说话，你别再发了。」说完直接把对话框关了。）",
  college_friend:
    "（顾小北发来一条语音，声音有点冷：「你今天怎么了？有事就说事，没事让我安静会儿好不好。」）",
};

let _msgCounter = 0;
/** 生成全局唯一消息 id */
function nextMsgId(): string {
  _msgCounter += 1;
  return `m_${Date.now().toString(36)}_${_msgCounter}`;
}

/** 生成 hh:mm 时间标签 */
export function makeTimeLabel(date: Date = new Date()): string {
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

/** 创建一个空 SocialState */
export function createEmptySocialState(): SocialState {
  return {
    bonds: {},
    messages: {},
    messageOrder: [],
    firedOnce: {},
  };
}

/** 取或初始化某个 NPC 的 bond status（纯函数，不突变 state） */
export function getBond(
  state: SocialState,
  npcId: string,
  initialFavorability = 30,
  round = 0,
): NPCBondStatus {
  return state.bonds[npcId] ?? {
    npcId,
    favorability: initialFavorability,
    messageIds: [],
    anchorFlags: [],
    lastInteractionRound: round,
  };
}

/** 内部：插入一条消息并返回新 state（不可变更新） */
function pushMessage(
  state: SocialState,
  msg: Omit<NPCMessage, "id">,
): { state: SocialState; message: NPCMessage } {
  const id = nextMsgId();
  const message: NPCMessage = { ...msg, id };
  const messages = { ...state.messages, [id]: message };
  const messageOrder = [...state.messageOrder, id];
  return {
    state: { ...state, messages, messageOrder },
    message,
  };
}

/** 推一条 NPC 主动发起的消息（例如里程碑触发） */
export function pushNpcOpening(
  state: SocialState,
  npcId: string,
  text: string,
  tone: NPCMessage["tone"],
  round: number,
): SocialState {
  const bond = getBond(state, npcId);
  const { state: next } = pushMessage(state, {
    npcId,
    from: "npc",
    text,
    tone,
    round,
    timeLabel: makeTimeLabel(),
    read: false,
  });
  // 关联到 bond
  const bondMsgIds = [...bond.messageIds, next.messageOrder[next.messageOrder.length - 1]];
  return {
    ...next,
    bonds: {
      ...next.bonds,
      [npcId]: { ...bond, messageIds: bondMsgIds },
    },
  };
}

/**
 * 玩家选择某个回复选项后的结算：
 *   1. 推一条 player 消息
 *   2. 结算好感度
 *   3. （可选）推一条 NPC 回应消息
 *   4. 标记已读
 */
export function applyPlayerReply(
  state: SocialState,
  npcId: string,
  option: NPCReplyOption,
  round: number,
): SocialState {
  const bond = getBond(state, npcId);
  const newFavor = Math.max(0, Math.min(100, bond.favorability + option.favorDelta));

  // 1. 玩家消息
  const { state: s1, message: playerMsg } = pushMessage(state, {
    npcId,
    from: "player",
    text: option.text,
    round,
    timeLabel: makeTimeLabel(),
    read: true,
  });

  let next: SocialState = s1;

  // 2. NPC 回应（如果有）
  if (option.npcResponse) {
    const tone = option.responseTone ?? toneFromFavorability(newFavor);
    const { state: s2, message: npcMsg } = pushMessage(next, {
      npcId,
      from: "npc",
      text: option.npcResponse,
      tone,
      round,
      timeLabel: makeTimeLabel(),
      read: false,
    });
    next = s2;
  }

  // 3. 更新 bond
  const newMsgIds = [...bond.messageIds];
  newMsgIds.push(playerMsg.id);
  const lastMsgId = next.messageOrder[next.messageOrder.length - 1];
  if (lastMsgId && !newMsgIds.includes(lastMsgId)) newMsgIds.push(lastMsgId);

  return {
    ...next,
    bonds: {
      ...next.bonds,
      [npcId]: {
        ...bond,
        favorability: newFavor,
        messageIds: newMsgIds,
        lastInteractionRound: round,
        anchorFlags: option.anchorFlag
          ? [...new Set([...bond.anchorFlags, option.anchorFlag])]
          : bond.anchorFlags,
      },
    },
  };
}

/**
 * 玩家主动发一条自由消息（不在选项里的"问候"）
 * NPC 会根据当前好感返回一句日常消息
 */
export function pushFreeChat(
  state: SocialState,
  npcId: string,
  text: string,
  round: number,
): SocialState {
  const bond = getBond(state, npcId);
  const tone = toneFromFavorability(bond.favorability);

  // 玩家消息
  const { state: s1, message: playerMsg } = pushMessage(state, {
    npcId,
    from: "player",
    text,
    round,
    timeLabel: makeTimeLabel(),
    read: true,
  });

  // NPC 日常回复（教授专用池；其他 NPC 用 awayText）
  const pool = npcId === "professor" ? PROFESSOR_FOLLOWUP_POOL[tone] : undefined;
  const reply = pool && pool.length > 0
    ? pool[Math.floor(Math.random() * pool.length)]
    : (NPC_REGISTRY[npcId]?.awayText ?? "…");

  // 轻量好感扰动：±1（先算出实际变化，附在回复消息上供 UI 展示）
  const drift = Math.random() < 0.5 ? 0 : (Math.random() < 0.5 ? 1 : -1);
  const newFavor = Math.max(0, Math.min(100, bond.favorability + drift));
  const favorDelta = newFavor - bond.favorability;

  const { state: s2, message: npcMsg } = pushMessage(s1, {
    npcId,
    from: "npc",
    text: reply,
    tone,
    round,
    timeLabel: makeTimeLabel(),
    read: false,
    ...(favorDelta !== 0 ? { favorDelta } : {}),
  });

  return {
    ...s2,
    bonds: {
      ...s2.bonds,
      [npcId]: {
        ...bond,
        favorability: newFavor,
        messageIds: [...bond.messageIds, playerMsg.id, npcMsg.id],
        lastInteractionRound: round,
      },
    },
  };
}

/** 把某个 NPC 的所有消息标为已读 */
export function markAllRead(state: SocialState, npcId: string): SocialState {
  const bond = getBond(state, npcId);
  const messages = { ...state.messages };
  for (const id of bond.messageIds) {
    if (messages[id]) messages[id] = { ...messages[id], read: true };
  }
  return { ...state, messages };
}

/** 取某个 NPC 的所有消息（按时间顺序） */
export function getMessagesFor(state: SocialState, npcId: string): NPCMessage[] {
  const bond = state.bonds[npcId];
  if (!bond) return [];
  return bond.messageIds
    .map((id) => state.messages[id])
    .filter((m): m is NPCMessage => Boolean(m));
}

/** 统计某个 NPC 的未读消息数 */
export function unreadCountFor(state: SocialState, npcId: string): number {
  return getMessagesFor(state, npcId).filter((m) => !m.read && m.from === "npc").length;
}

/** 解锁条件注册表：npcId → 检查函数 */
const UNLOCK_RULES: Record<string, (ctx: UnlockContext) => boolean> = {
  peer: (ctx) => ctx.totalRound >= 2,
  lab_senior: (ctx) => ctx.totalRound >= 3,
  lu_yuchen: (ctx) => ctx.totalRound >= 4,
  college_friend: (ctx) => ctx.totalRound >= 5,
  bai_xu: (ctx) => ctx.semester >= 3,
  jiang_huai: (ctx) => ctx.totalRound >= 1,
};

/** 单个 NPC 是否已满足解锁条件（默认未配置的 NPC 视为不解锁） */
export function checkNpcUnlock(npcId: string, ctx: UnlockContext): boolean {
  const npc = NPC_REGISTRY[npcId];
  if (!npc) return false;
  if (npc.unlockedByDefault) return true;
  const rule = UNLOCK_RULES[npcId];
  return rule ? rule(ctx) : false;
}

/**
 * 检查所有 NPC，返回**本次新解锁**的 npcId 列表
 * 已存在于 socialState.bonds 中的 NPC 不会重复返回
 */
export function checkAllUnlocks(
  ctx: UnlockContext,
  state: SocialState,
): string[] {
  const newlyUnlocked: string[] = [];
  for (const npcId of Object.keys(NPC_REGISTRY)) {
    if (state.bonds[npcId]) continue; // 已经解锁过
    if (checkNpcUnlock(npcId, ctx)) {
      newlyUnlocked.push(npcId);
    }
  }
  return newlyUnlocked;
}

/** 初始化某个 NPC 的 bond（用于解锁时） */
export function initBond(
  state: SocialState,
  npcId: string,
  initialFavorability = 30,
  round = 0,
): SocialState {
  if (state.bonds[npcId]) return state;
  return {
    ...state,
    bonds: {
      ...state.bonds,
      [npcId]: {
        npcId,
        favorability: initialFavorability,
        messageIds: [],
        anchorFlags: [],
        lastInteractionRound: round,
      },
    },
  };
}

/** 解锁 + 推送问候消息 */
export function greetNpc(
  state: SocialState,
  npcId: string,
  round: number,
): SocialState {
  const npc = NPC_REGISTRY[npcId];
  if (!npc) return state;
  const withBond = initBond(state, npcId, 30, round);
  return pushNpcOpening(
    withBond,
    npcId,
    npc.greeting,
    toneFromFavorability(30),
    round,
  );
}

const FIRST_GREETING_REPLIES: Record<string, string> = {
  peer: "在呢！我刚把模型的 Grasshopper 电池调通，晚点要不要一起去二食堂吃烤冷面？",
  zhang_yifan: "在呢！我刚把模型的 Grasshopper 电池调通，晚点要不要一起去二食堂吃烤冷面？",
  lu_yuchen: "收到。刚看完你发来的行业报告框架，推演逻辑很严密，继续保持。",
  bai_xu: "哇学长找我！嘿嘿，我刚烤好了一盘香草曲奇，等会儿顺路给你送过去尝尝！",
  jiang_huai: "在呢！刚打完球冲完凉，晚上回寝室给你带份现炒河粉，别老饿着肚子改图。",
  lab_senior: "收到了。我正在图书馆三楼靠窗的位置，这本《营造学社汇刊》图注很精彩，随时过来一起看。",
  shen_qinghuai: "收到了。我正在图书馆三楼靠窗的位置，这本《营造学社汇刊》图注很精彩，随时过来一起看。",
  professor: "知道了。抓紧梳理近代建筑史的文献框架，周四组会按时汇报进展。",
  college_friend: "哈喽！最近忙不忙呀？改天有空一起去逛展喝奶茶！",
};

const SECOND_GREETING_BUSY_TEXT: Record<string, string> = {
  peer: "（张一帆正在电脑前渲染大样视图，可能在赶图，暂时没有回复你。）",
  zhang_yifan: "（张一帆正在电脑前渲染大样视图，可能在赶图，暂时没有回复你。）",
  lu_yuchen: "（陆予忱正在参加大厂校友闭门研讨会，暂时没有回复你。）",
  bai_xu: "（白栩正在做快题手绘排版，暂时没有回复你。）",
  jiang_huai: "（江淮正在田径场进行体能集训，暂时没有回复你。）",
  lab_senior: "（沈清淮正在特藏古籍阅览室查阅文献，暂时没有回复你。）",
  shen_qinghuai: "（沈清淮正在特藏古籍阅览室查阅文献，暂时没有回复你。）",
  professor: "（导师办公室门关着，老师正在修改国家社科基金申报书，暂时没有回复你。）",
  college_friend: "（顾小北正在上课，暂时没有回复你。）",
};

/** 单回合打招呼达到该次数触发"爆发"（厌恶惩罚 + 导师专属爆发剧情） */
const GREETING_STORM_THRESHOLD = 5;
/** 触发爆发时的好感度惩罚 */
const GREETING_STORM_FAVOR_PENALTY = 5;

/**
 * 玩家每回合可在电脑微信界面主动给每个 NPC 发消息：
 * - 首次发送：NPC 积极回复，好感 +2（上限 100）
 * - 第 2~4 条：NPC 忙碌不理会，不加好感
 * - 第 5 条：触发爆发——NPC 明确反感（好感 -5、进入激怒冷却），
 *   导师额外触发 professor_storm_out 办公室训话剧情
 * - 激怒冷却期内再发：返回专属冷却文案，不再产生任何好感变化
 */
export function sendGreeting(
  state: SocialState,
  npcId: string,
  round: number,
  customText?: string,
): SocialState {
  const npc = NPC_REGISTRY[npcId];
  if (!npc) return state;

  const playerText = customText?.trim() || "（打了个招呼）";
  const bond = getBond(state, npcId);
  const totalRound = round;

  // —— 激怒冷却期：本回合已爆发过，再发只回冷却文案 ——
  if (bond.enragedLocked && bond.lastGreetingsResetRound === totalRound) {
    const cooldownText =
      GREETING_COOLDOWN_TEXT[npcId] ||
      "（对方没有回复你。）";

    const { state: s1, message: playerMsg } = pushMessage(state, {
      npcId,
      from: "player",
      text: playerText,
      round,
      timeLabel: makeTimeLabel(),
      read: true,
    });
    const { state: s2, message: npcMsg } = pushMessage(s1, {
      npcId,
      from: "npc",
      text: cooldownText,
      tone: "cold",
      round,
      timeLabel: makeTimeLabel(),
      read: false,
    });
    return {
      ...s2,
      bonds: {
        ...s2.bonds,
        [npcId]: {
          ...bond,
          messageIds: [...bond.messageIds, playerMsg.id, npcMsg.id],
          lastInteractionRound: round,
        },
      },
    };
  }

  // —— 本回合已发送消息计数（每回合重置） ——
  const greetingsThisRound =
    bond.lastGreetingsResetRound === totalRound
      ? (bond.greetingsThisRound ?? 0)
      : 0;

  const nextCount = greetingsThisRound + 1;

  // 1. 推送玩家发送的消息
  const { state: s1, message: playerMsg } = pushMessage(state, {
    npcId,
    from: "player",
    text: playerText,
    round,
    timeLabel: makeTimeLabel(),
    read: true,
  });

  // 2. 判定是本回合第 1 条 / 爆发条 / 后续忙碌消息
  if (greetingsThisRound === 0) {
    // 首次发送：NPC 积极回复并主动增加好感度 +2（上限 100）
    const replyText =
      FIRST_GREETING_REPLIES[npcId] ||
      npc.greeting ||
      "收到了，随时保持联系！";

    const newFavor = Math.min(100, (bond.favorability ?? 30) + 2);
    const favorDelta = newFavor - (bond.favorability ?? 30);

    const { state: s2, message: npcMsg } = pushMessage(s1, {
      npcId,
      from: "npc",
      text: replyText,
      tone: toneFromFavorability(bond.favorability + 2),
      round,
      timeLabel: makeTimeLabel(),
      read: false,
      ...(favorDelta !== 0 ? { favorDelta } : {}),
    });

    return {
      ...s2,
      bonds: {
        ...s2.bonds,
        [npcId]: {
          ...bond,
          favorability: newFavor,
          greetingsThisRound: nextCount,
          lastGreetingsResetRound: totalRound,
          messageIds: [...bond.messageIds, playerMsg.id, npcMsg.id],
          lastInteractionRound: round,
        },
      },
    };
  } else if (nextCount >= GREETING_STORM_THRESHOLD) {
    // 第 5 条：爆发——NPC 明确反感，好感 -5，进入激怒冷却
    const stormText =
      GREETING_STORM_START[npcId] ||
      "（对方终于忍无可忍：「别再发了。」）";

    const newFavor = Math.max(0, (bond.favorability ?? 30) - GREETING_STORM_FAVOR_PENALTY);
    const favorDelta = newFavor - (bond.favorability ?? 30);

    const { state: s2, message: npcMsg } = pushMessage(s1, {
      npcId,
      from: "npc",
      text: stormText,
      tone: "cold",
      round,
      timeLabel: makeTimeLabel(),
      read: false,
      ...(favorDelta !== 0 ? { favorDelta } : {}),
    });

    let s3: SocialState = {
      ...s2,
      bonds: {
        ...s2.bonds,
        [npcId]: {
          ...bond,
          favorability: newFavor,
          greetingsThisRound: nextCount,
          lastGreetingsResetRound: totalRound,
          enragedLocked: true,
          messageIds: [...bond.messageIds, playerMsg.id, npcMsg.id],
          lastInteractionRound: round,
        },
      },
    };

    // 导师专属：挂载办公室训话剧情树（手动触发器）
    if (npcId === "professor") {
      s3 = triggerDialogueTree(s3, "professor_storm_out", totalRound);
    }

    return s3;
  } else {
    // 第 2~4 条消息：对方在忙碌，不理会，不增加好感度
    const busyText =
      SECOND_GREETING_BUSY_TEXT[npcId] ||
      "（对方正在忙碌，暂时没有回复你。）";

    const { state: s2, message: npcMsg } = pushMessage(s1, {
      npcId,
      from: "npc",
      text: busyText,
      tone: "cold",
      round,
      timeLabel: makeTimeLabel(),
      read: false,
    });

    return {
      ...s2,
      bonds: {
        ...s2.bonds,
        [npcId]: {
          ...bond,
          greetingsThisRound: nextCount,
          lastGreetingsResetRound: totalRound,
          messageIds: [...bond.messageIds, playerMsg.id, npcMsg.id],
          lastInteractionRound: round,
        },
      },
    };
  }
}

/** 根据好感度取关系阶段标签 */
export function stageLabelFor(npcId: string, favorability: number): string {
  const npc = NPC_REGISTRY[npcId];
  if (!npc) return "陌生";
  let label = npc.stageLabels[0]?.label ?? "陌生";
  for (const stage of npc.stageLabels) {
    if (favorability >= stage.min) label = stage.label;
  }
  return label;
}

// ================================================================
// P0 对话树引擎（DialogueTree Engine）
// ================================================================

/** 取某 NPC 当前已挂载的对话树（可能在某个节点上等待玩家回复） */
export function getActiveDialogue(state: SocialState, npcId: string): {
  tree: DialogueTree | null;
  node: DialogueTree["nodes"][string] | null;
} {
  const bond = state.bonds[npcId];
  if (!bond || !bond.activeTreeId || !bond.activeNodeId) {
    return { tree: null, node: null };
  }
  const tree = DIALOGUE_TREES[bond.activeTreeId];
  if (!tree) return { tree: null, node: null };
  const node = tree.nodes[bond.activeNodeId];
  return { tree, node: node ?? null };
}

/** 取某 NPC 当前应该显示的回复选项（动态生成，不死循环） */
export function getActiveReplyOptions(state: SocialState, npcId: string): NPCReplyOption[] {
  const { node } = getActiveDialogue(state, npcId);
  if (!node) return [];
  // 将 DialogueOption 转换为兼容现有 UI 的 NPCReplyOption
  return node.options.map((opt) => ({
    id: opt.id,
    text: opt.text,
    favorDelta: opt.favorDelta ?? 0,
    npcResponse: undefined, // 回应由 advanceDialogue 单独推一条消息
    responseTone: opt.responseTone,
    anchorFlag: opt.setAnchorFlags?.[0],
  }));
}

/**
 * 触发一棵对话树：推首节点 NPC 消息，设置 activeTreeId/activeNodeId
 * 如果该 NPC 已有 activeTreeId，则挂入 pendingTreeIds（不覆盖进行中的对话）
 */
export function triggerDialogueTree(
  state: SocialState,
  treeId: string,
  round: number,
): SocialState {
  const tree = DIALOGUE_TREES[treeId];
  if (!tree) return state;

  const npcId = tree.npcId;
  let bond = getBond(state, npcId);

  // oneShot 已完成则跳过
  if (tree.oneShot !== false && (bond.completedTreeIds ?? []).includes(treeId)) {
    return state;
  }

  // 已经是 active 树则跳过
  if (bond.activeTreeId === treeId) return state;

  // 如果当前 NPC 正在别的对话中，则放入 pending
  if (bond.activeTreeId) {
    const pending = bond.pendingTreeIds ?? [];
    if (pending.includes(treeId)) return state;
    return {
      ...state,
      bonds: {
        ...state.bonds,
        [npcId]: { ...bond, pendingTreeIds: [...pending, treeId] },
      },
    };
  }

  // 推首节点 NPC 消息
  const startNode = tree.nodes[tree.startNodeId];
  if (!startNode) return state;

  const withBond = initBond(state, npcId, 30, round);
  bond = getBond(withBond, npcId);

  const { state: next, message } = pushMessage(withBond, {
    npcId,
    from: "npc",
    text: startNode.npcMessage,
    tone: startNode.tone,
    round,
    timeLabel: makeTimeLabel(),
    read: false,
  });

  return {
    ...next,
    bonds: {
      ...next.bonds,
      [npcId]: {
        ...bond,
        activeTreeId: treeId,
        activeNodeId: tree.startNodeId,
        messageIds: [...bond.messageIds, message.id],
        lastInteractionRound: round,
      },
    },
  };
}

/**
 * 玩家选择某个选项后推进对话：
 *   1. 推玩家消息
 *   2. 结算好感、设置 anchorFlags、应用 statEffects
 *   3. 若有 nextNodeId → 推下一个节点的 NPC 发言，更新 activeNodeId
 *   4. 若无 nextNodeId → 结束对话（清空 activeTreeId，加入 completedTreeIds）
 *   5. 若对话结束且有 pendingTreeIds，自动挂载下一个
 */
export function advanceDialogue(
  state: SocialState,
  npcId: string,
  optionId: string,
  applyStatEffects: (effects: Record<string, number>) => void,
  round: number,
): SocialState {
  const bond = getBond(state, npcId);
  if (!bond.activeTreeId || !bond.activeNodeId) return state;

  const tree = DIALOGUE_TREES[bond.activeTreeId];
  if (!tree) return state;
  const currentNode = tree.nodes[bond.activeNodeId];
  if (!currentNode) return state;
  const option = currentNode.options.find((o) => o.id === optionId);
  if (!option) return state;

  // 1. 推玩家消息
  const { state: s1, message: playerMsg } = pushMessage(state, {
    npcId,
    from: "player",
    text: option.text,
    round,
    timeLabel: makeTimeLabel(),
    read: true,
  });

  // 2. 应用 statEffects
  if (option.statEffects && Object.keys(option.statEffects).length > 0) {
    applyStatEffects(option.statEffects);
  }

  // 3. 更新好感度
  const newFavor = Math.max(
    0,
    Math.min(100, bond.favorability + (option.favorDelta ?? 0)),
  );

  // 4. 合并 anchorFlags
  const newAnchors = option.setAnchorFlags
    ? Array.from(new Set([...(bond.anchorFlags ?? []), ...option.setAnchorFlags]))
    : (bond.anchorFlags ?? []);

  // 5. 判断是否结束对话
  let next: SocialState = s1;
  let newActiveTreeId = bond.activeTreeId;
  let newActiveNodeId: string | null = bond.activeNodeId;
  let newCompleted = bond.completedTreeIds ?? [];

  if (!option.nextNodeId) {
    // 对话结束
    newActiveTreeId = null;
    newActiveNodeId = null;
    if (tree.oneShot !== false) {
      newCompleted = Array.from(new Set([...newCompleted, bond.activeTreeId!]));
    }
  } else {
    // 推下一节点 NPC 消息（附上本选项产生的实际好感变化，供 UI 展示）
    const nextNode = tree.nodes[option.nextNodeId];
    if (nextNode) {
      const favorDeltaActual = newFavor - bond.favorability;
      const { state: s2, message: npcMsg } = pushMessage(next, {
        npcId,
        from: "npc",
        text: nextNode.npcMessage,
        tone: nextNode.tone ?? option.responseTone,
        round,
        timeLabel: makeTimeLabel(),
        read: false,
        ...(favorDeltaActual !== 0 ? { favorDelta: favorDeltaActual } : {}),
      });
      next = s2;
      newActiveNodeId = option.nextNodeId;
    } else {
      // 配置错误：nextNodeId 指向不存在的节点，按结束处理
      newActiveTreeId = null;
      newActiveNodeId = null;
    }
  }

  // 6. 更新 bond
  const chatsThisRound = (bond.chatsThisRound ?? 0) + 1;
  // 收集本轮新增的消息 id（玩家消息 + 可能的 NPC 下节点消息），按推送顺序
  const existingIds = next.bonds[npcId]?.messageIds ?? [];
  const appendedIds: string[] = [];
  if (!existingIds.includes(playerMsg.id)) appendedIds.push(playerMsg.id);
  // 若上面推过 NPC 下节点消息，那条消息 id 是 messageOrder 最后一条
  const lastOrder = next.messageOrder[next.messageOrder.length - 1];
  if (
    option.nextNodeId &&
    lastOrder &&
    lastOrder !== playerMsg.id &&
    !existingIds.includes(lastOrder) &&
    !appendedIds.includes(lastOrder)
  ) {
    appendedIds.push(lastOrder);
  }

  next = {
    ...next,
    bonds: {
      ...next.bonds,
      [npcId]: {
        ...next.bonds[npcId],
        favorability: newFavor,
        anchorFlags: newAnchors,
        messageIds: [...existingIds, ...appendedIds],
        activeTreeId: newActiveTreeId,
        activeNodeId: newActiveNodeId,
        completedTreeIds: newCompleted,
        chatsThisRound,
        lastInteractionRound: round,
      },
    },
  };

  // 7. 若对话结束且有 pending，自动触发第一个 pending
  if (!newActiveTreeId && (next.bonds[npcId]?.pendingTreeIds ?? []).length > 0) {
    const pending = [...(next.bonds[npcId]!.pendingTreeIds ?? [])];
    const nextTreeId = pending.shift()!;
    // 清掉 pending 的第一个
    next = {
      ...next,
      bonds: {
        ...next.bonds,
        [npcId]: { ...next.bonds[npcId]!, pendingTreeIds: pending },
      },
    };
    next = triggerDialogueTree(next, nextTreeId, round);
  }

  return next;
}

/** 检查好感度是否刚刚跨过某个里程碑（一次性触发） */
export function checkMilestone(
  bond: NPCBondStatus,
  thresholds: number[] = [40, 60, 80],
): number | null {
  const flags = bond.milestoneFlags ?? [];
  for (const t of thresholds) {
    if (bond.favorability >= t && !flags.includes(t)) {
      return t;
    }
  }
  return null;
}

/** 取一棵对话树触发条件是否满足（不含 oneShot 判定） */
export function isTreeTriggered(
  tree: DialogueTree,
  ctx: UnlockContext,
  bond: NPCBondStatus | undefined,
): boolean {
  const t = tree.trigger;
  if (t.type === "round") {
    return ctx.totalRound === (t.round ?? -1);
  }
  if (t.type === "milestone" && bond) {
    return (
      bond.favorability >= (t.milestoneFavor ?? Number.MAX_SAFE_INTEGER) &&
      !(bond.milestoneFlags ?? []).includes(t.milestoneFavor!)
    );
  }
  if (t.type === "unlock") {
    return Boolean(bond); // 只要解锁过就触发
  }
  return false;
}

/**
 * 批量检查所有对话树，触发满足条件的（通常在 nextRound 里调用）
 * 返回新 state 和被触发的 tree id 列表
 */
export function checkTreeTriggers(
  state: SocialState,
  ctx: UnlockContext,
): { state: SocialState; triggeredTreeIds: string[] } {
  const triggered: string[] = [];
  let next = state;

  for (const tree of Object.values(DIALOGUE_TREES)) {
    // 解锁检查：NPC 未解锁（无 bond）则跳过
    const bond = next.bonds[tree.npcId];
    if (tree.trigger.type !== "unlock" && !bond) continue;

    // oneShot 已完成则跳过
    if (tree.oneShot !== false && (bond?.completedTreeIds ?? []).includes(tree.id)) {
      continue;
    }

    // minTotalRound 检查
    if (tree.minTotalRound !== undefined && ctx.totalRound < tree.minTotalRound) {
      continue;
    }

    if (isTreeTriggered(tree, ctx, bond)) {
      next = triggerDialogueTree(next, tree.id, ctx.totalRound);
      triggered.push(tree.id);

      // 标记里程碑已触发（防止下次又触发）
      if (tree.trigger.type === "milestone" && tree.trigger.milestoneFavor !== undefined) {
        const b = next.bonds[tree.npcId];
        if (b) {
          next = {
            ...next,
            bonds: {
              ...next.bonds,
              [tree.npcId]: {
                ...b,
                milestoneFlags: [
                  ...(b.milestoneFlags ?? []),
                  tree.trigger.milestoneFavor,
                ],
              },
            },
          };
        }
      }
    }
  }

  return { state: next, triggeredTreeIds: triggered };
}

/** 重置所有 NPC 的本回合聊天计数（每回合开始时调用） */
export function resetChatsThisRound(state: SocialState, totalRound: number): SocialState {
  const bonds = { ...state.bonds };
  for (const npcId of Object.keys(bonds)) {
    const b = bonds[npcId];
    let updated = b;
    if (b.lastChatsResetRound !== totalRound) {
      updated = {
        ...updated,
        chatsThisRound: 0,
        lastChatsResetRound: totalRound,
      };
    }
    // 解锁激怒冷却（新回合允许再次打招呼）
    if (b.enragedLocked && b.lastGreetingsResetRound !== totalRound) {
      updated = { ...updated, enragedLocked: false };
    }
    bonds[npcId] = updated;
  }
  return { ...state, bonds };
}
