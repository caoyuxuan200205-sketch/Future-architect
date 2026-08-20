/**
 * 导师办公室会面剧情、心境与多维对话数据
 */
import type { ToneTier } from "./types";
import { moneyToBalance, formatYuan, balanceToMoney } from "../economy/finance";

export interface MentorOfficeProfile {
  mentorId: string;
  name: string;
  title: string;
  officeLocation: string;
  officeAtmosphere: string;
  sceneImage: string;
  avatarImage: string;
  /** 该导师是否拥有专属个人立绘（区别于通用场景图） */
  hasPortrait?: boolean;
  quote: string;
  personalityTag: string;
  currentMoods: string[];
}

export interface OfficeDialogueOption {
  id: string;
  label: string;
  emoji: string;
  category: "academic" | "chat" | "gift" | "romance" | "opportunity" | "leave";
  description: string;
  costText?: string;
  requireFavor?: number;
  disabled?: boolean;
  disabledReason?: string;
  statDeltas?: {
    arch?: number;
    logic?: number;
    stress?: number;
    money?: number;
    mentorFavorability?: number;
  };
  mentorReply: string;
  replyTone: ToneTier;
  resultNarrative: string;
  /** 送礼类选项专属：被导师拒收时的备选数据 */
  rejection?: {
    statDeltas: {
      money?: number;
      mentorFavorability?: number;
      stress?: number;
    };
    mentorReply: string;
    replyTone: ToneTier;
    resultNarrative: string;
    /** 拒收剧情对话序列 */
    dialogueSequence?: GiftDialogueLine[];
  };
  /** 送礼被收下时的剧情对话序列 */
  acceptanceDialogue?: GiftDialogueLine[];
}

/**
 * 送礼剧情对话序列中的一条消息
 * - speaker: "player" | "mentor" | "narration"
 * - 借鉴视觉小说/交互叙事游戏：每条横向长气泡推动剧情，明确呈现"递礼物→反应→结果"
 */
export interface GiftDialogueLine {
  speaker: "player" | "mentor" | "narration";
  /** 显示的说话人名（导师用导师名，玩家用"你"，旁白为空） */
  name?: string;
  /** 说话时的微表情/动作描述（例如"目光落在包装上"、"尴尬地收回手"） */
  action?: string;
  /** 台词正文 */
  content: string;
  /** 对话气泡的情绪色调（仅 mentor 需要指定） */
  tone?: ToneTier;
}

// ================================================================
// 送礼拒收概率机制（策划数据表）
// 行：导师类型；列：好感区间 [<15, 15-30, 30-45, 45-65, ≥65]
// ================================================================
export const GIFT_REJECTION_RATES: Record<string, number[]> = {
  practice:  [0.07, 0.08, 0.10, 0.12, 0.15], // 实践派
  hands_off: [0.09, 0.11, 0.13, 0.15, 0.19], // 放养派
  academic:  [0.08, 0.12, 0.20, 0.37, 0.60], // 学术派
  overseas:  [0.11, 0.17, 0.30, 0.53, 0.75], // 海归派（含 global_scholar）
};

/** 把任意 mentorId 规约到拒收概率表的四个类型之一 */
function normalizeMentorType(mentorId: string): keyof typeof GIFT_REJECTION_RATES {
  if (mentorId === "global_scholar") return "overseas";
  if (GIFT_REJECTION_RATES[mentorId]) return mentorId as keyof typeof GIFT_REJECTION_RATES;
  return "academic";
}

/** 按好感度取区间索引 */
function giftFavorBucket(favorability: number): number {
  if (favorability < 15) return 0;
  if (favorability < 30) return 1;
  if (favorability < 45) return 2;
  if (favorability < 65) return 3;
  return 4;
}

/** 判定本次送礼是否会被导师拒收 */
export function rollGiftRejection(mentorId: string, favorability: number): boolean {
  const type = normalizeMentorType(mentorId);
  const rate = GIFT_REJECTION_RATES[type][giftFavorBucket(favorability)];
  return Math.random() < rate;
}

// ================================================================
// 送钱（现金）机制
// 设计哲学：现金 = 高赌注路径。相比送礼，送钱是"越界"行为，
// 收下时好感加成可观，但拒收率显著更高，且逾矩金额会触发师德红线。
// ================================================================

/** 金额档位索引：0 试探 / 1 心意 / 2 进阶 / 3 重注 / 4 逾矩 */
export type CashGiftTier = 0 | 1 | 2 | 3 | 4;

/** 金额 → 档位索引 */
export function cashGiftTierIndex(amountYuan: number): CashGiftTier {
  if (amountYuan < 500) return 0;        // ¥200–¥499   试探档
  if (amountYuan < 2000) return 1;       // ¥500–¥1999  心意档
  if (amountYuan < 5000) return 2;       // ¥2000–¥4999 进阶档
  if (amountYuan <= 10000) return 3;     // ¥5000–¥10000 重注档
  return 4;                              // >¥10000 逾矩档（触发师德红线）
}

/** 档位中文标签 */
export const CASH_GIFT_TIER_LABELS: string[] = [
  "试探档", "心意档", "进阶档", "重注档", "逾矩档",
];

/** 送钱金额范围（元） */
export const CASH_GIFT_MIN = 200;
export const CASH_GIFT_MAX_NORMAL = 10000;
/** 滑块上限（覆盖逾矩档，便于玩家触碰红线剧情） */
export const CASH_GIFT_SLIDER_MAX = 20000;

/** 送钱拒收率：行=导师类型，列=金额档位（0–4） */
export const CASH_GIFT_REJECTION_RATES: Record<string, number[]> = {
  practice:  [0.35, 0.45, 0.58, 0.70, 0.80],
  hands_off: [0.50, 0.62, 0.72, 0.82, 0.90],
  academic:  [0.75, 0.85, 0.93, 0.97, 0.99],
  overseas:  [0.88, 0.94, 0.98, 0.99, 1.00],
};

/**
 * 送钱好感加成基础表（收下时）：行=导师类型，列=金额档位
 * - 不封顶：金额越大加成越显著，实践派逾矩档可达 +18
 * - 高风险高收益：金额越大拒收率也越高，逾矩档大概率重伤
 * - 后续由 repeat/favor 修正系数再次削减
 */
export const CASH_GIFT_FAVOR_BONUS: Record<string, number[]> = {
  practice:  [3, 6, 10, 14, 18],
  hands_off: [2, 5, 8, 11, 14],
  academic:  [1, 3, 5, 7, 9],
  overseas:  [1, 2, 3, 4, 5],
};

/** 压力下降值（收下时）：导师类型 × 档位 */
export const CASH_GIFT_STRESS_RELIEF: Record<string, number[]> = {
  practice:  [2, 4, 6, 8, 8],
  hands_off: [1, 3, 4, 5, 5],
  academic:  [1, 2, 2, 3, 3],
  overseas:  [1, 2, 2, 2, 2],
};

/** 连续送钱次数 → 边际效用系数（最多 5 次） */
export function cashGiftRepeatMultiplier(consecutiveCount: number): number {
  if (consecutiveCount <= 0) return 1.0;
  if (consecutiveCount === 1) return 0.85;
  if (consecutiveCount === 2) return 0.70;
  if (consecutiveCount === 3) return 0.55;
  return 0.4;
}

/** 好感区间边际递减：高好感度下加成衰减 */
export function favorRangeMultiplier(favor: number): number {
  if (favor < 30) return 1.0;
  if (favor < 60) return 0.7;
  return 0.4;
}

/** 高好感度特例：≥70 时导师会关心玩家是否困难，拒收率减半，加成也减半（钱会被悄悄塞回） */
export function isHighFavorSpecialCase(favor: number): boolean {
  return favor >= 70;
}

/** 是否触发师德红线（金额 > ¥10,000） */
export function isRedLineViolation(amountYuan: number): boolean {
  return amountYuan > CASH_GIFT_MAX_NORMAL;
}

/**
 * 判定送钱是否被拒收
 * 综合导师类型 × 金额档位 × 高好感特例
 */
export function rollCashGiftRejection(
  mentorId: string,
  favorability: number,
  amountYuan: number
): boolean {
  const type = normalizeMentorType(mentorId);
  const tier = cashGiftTierIndex(amountYuan);
  let rate = CASH_GIFT_REJECTION_RATES[type][tier];
  // 高好感特例：拒收率减半（导师相信你并非贿赂）
  if (isHighFavorSpecialCase(favorability)) rate *= 0.5;
  return Math.random() < Math.min(1, rate);
}

/**
 * 计算送钱被收下时的最终好感加成
 * base[tier] × repeatMult × favorRangeMult × highFavorHalf（如果≥70）
 */
export function calcCashGiftFavorBonus(
  mentorId: string,
  favorability: number,
  amountYuan: number,
  consecutiveCount: number
): number {
  const type = normalizeMentorType(mentorId);
  const tier = cashGiftTierIndex(amountYuan);
  const base = CASH_GIFT_FAVOR_BONUS[type][tier];
  const repeat = cashGiftRepeatMultiplier(consecutiveCount);
  const range = favorRangeMultiplier(favorability);
  let result = base * repeat * range;
  if (isHighFavorSpecialCase(favorability)) result *= 0.5;
  return Math.max(1, Math.round(result));
}

/**
 * 构造送钱被收下时的剧情对话序列
 * 按导师类型分支，文案区分档位（试探/心意/进阶/重注/逾矩）
 */
function buildCashGiftAcceptance(
  mentorId: string,
  mentorName: string,
  amountYuan: number,
  favorBonus: number
): GiftDialogueLine[] {
  const type = normalizeMentorType(mentorId);
  const tier = cashGiftTierIndex(amountYuan);
  const envelope = tier <= 1 ? "一个素白信封" : tier <= 3 ? "一个鼓鼓的信封" : "一个厚实的牛皮纸信封";
  const amountHint = tier === 0 ? "薄薄的一点点" : tier === 1 ? "中等厚度" : tier === 2 ? "相当有分量" : "厚得有些不寻常";

  switch (type) {
    case "practice":
      return [
        {
          speaker: "narration",
          content: `你从书包侧袋抽出${envelope}，没封口，边缘被手指捏得有点发皱。${mentorName} 正在和项目部通电话，比划着立面图的剖面位置。`,
        },
        {
          speaker: "player",
          name: "你",
          action: "把信封压在他桌角的节点洽商单上",
          content: `老师，上次您帮我盯下来的投标，我这边项目奖金刚发了……这点您别推辞，算我请老师吃饭。`,
        },
        {
          speaker: "mentor",
          name: mentorName,
          action: "扫了一眼信封厚度，笑了起来",
          tone: "warm",
          content: `你小子，工资发了多少？${tier >= 3 ? "这么多你拿出来，自己下半月吃什么？" : "这钱你留着，下次投标还要跑现场。"}`,
        },
        {
          speaker: "player",
          name: "你",
          action: "尽量让语气听起来随意",
          content: `老师，您再推我可真不好意思了……`,
        },
        {
          speaker: "mentor",
          name: mentorName,
          action: "干脆利落地把信封收进抽屉",
          tone: "warm",
          content: `行，这个情我领了。下次甲方又改需求，你别自己一个人扛，来找我。咱们做实务的，就是靠这种信任。`,
        },
        {
          speaker: "narration",
          content: `信封被放进抽屉的动作没有任何犹豫。你意识到，在实务派导师这里，现金是一种被默许的"江湖规矩"——它不优雅，但它有效。好感度 +${favorBonus}。`,
        },
      ];
    case "hands_off":
      return [
        {
          speaker: "narration",
          content: `${mentorName} 的办公室门半开着，他正戴着半边监听耳机调城市声景的波形。你把${envelope}压在他桌角的 Sketch 图纸上。`,
        },
        {
          speaker: "player",
          name: "你",
          action: "声音压得很低",
          content: `老师，这个……您收着，上次帮我看毕设到凌晨，我心里过意不去。`,
        },
        {
          speaker: "mentor",
          name: mentorName,
          action: "摘下半边耳机，愣了半秒",
          tone: "neutral",
          content: `哎你这孩子，我们组不兴这个吧？……你最近是不是经济上有什么困难？`,
        },
        {
          speaker: "player",
          name: "你",
          action: "有点慌",
          content: `不是不是！就是……一点心意。`,
        },
        {
          speaker: "mentor",
          name: mentorName,
          action: "犹豫片刻，把信封往回收了一点",
          tone: "warm",
          content: `那我就不推了——但我跟你说，咱们组靠的是你自己做出东西，不是这些。下次好好做项目，比什么都强。`,
        },
        {
          speaker: "narration",
          content: `他收下了，但收下的那一刻，你感觉某种东西在你们之间悄悄变了味道。放养派原本的"不设防"，被这个信封烫出了一道细细的边界。好感度 +${favorBonus}。`,
        },
      ];
    case "academic":
      return [
        {
          speaker: "narration",
          content: `${mentorName} 的办公室里挂着杨廷宝手稿复印件，《营造法式》英译本摊在桌心。你把${envelope}放在书上，心跳莫名其妙地快了起来——学术派收下现金的概率极低。`,
        },
        {
          speaker: "player",
          name: "你",
          action: "措辞谨慎",
          content: `老师，这是我这学期的一点心意，感谢您在课题上的指导……`,
        },
        {
          speaker: "mentor",
          name: mentorName,
          action: "沉默了大约 5 秒，目光锁定信封",
          tone: "neutral",
          content: `你这个东西……你是觉得我帮你指导课题，是为了这个？`,
        },
        {
          speaker: "player",
          name: "你",
          action: "手心开始出汗",
          content: `老师，我真没有别的意思……`,
        },
        {
          speaker: "mentor",
          name: mentorName,
          action: "深深叹了一口气，把信封推回来一点点，又停住",
          tone: "warm",
          content: `我跟你说实话——我教了三十年书，没收过学生的现金。但你这学期做的这个宋代柱础断代，确实让我看到了点东西。这个钱我收下，不是因为我需要它，是因为我不想让你难堪。但下一次，别再这样了。`,
        },
        {
          speaker: "narration",
          content: `信封被收进了抽屉的最里层，像是被刻意藏起来。学术派导师极少会收现金——这一次，是你的研究真正打动了他。好感度 +${favorBonus}。`,
        },
      ];
    case "overseas":
      return [
        {
          speaker: "narration",
          content: `${mentorName} 的办公室是开放式布局，玻璃桌上一台 MacBook、一杯喝了一半的 flat white。你把${envelope}放在 guest table 上——这是屋里唯一不带学术符号的家具。`,
        },
        {
          speaker: "player",
          name: "你",
          action: "尽量让自己的英语听起来自然",
          content: `Professor, I just wanted to thank you. 这是我们中国学生的一点心意。`,
        },
        {
          speaker: "mentor",
          name: mentorName,
          action: "看了一眼信封，眉毛轻轻挑了一下",
          tone: "neutral",
          content: `Hmm. I appreciate the thought, but this really isn't how we do things. You know that, right?`,
        },
        {
          speaker: "player",
          name: "你",
          action: "已经准备好被拒绝的台词",
          content: `……I'm sorry, I didn't mean to——`,
        },
        {
          speaker: "mentor",
          name: mentorName,
          action: "停顿了一下，似乎在权衡什么",
          tone: "warm",
          content: `Listen, in my group, we keep it professional. But… I can see you're not trying to buy anything. I'll take it this once. Next time, if you want to thank me, bring me a really good question, not an envelope. Deal?`,
        },
        {
          speaker: "narration",
          content: `他把信封放进抽屉的动作有一种近乎本能的克制。你知道，对海归派导师而言，收下现金几乎是一次破例——他不是在收钱，而是在接受你试图表达的某种笨拙的尊重。好感度 +${favorBonus}。`,
        },
      ];
  }
}

/**
 * 构造送钱被拒收时的剧情对话序列
 * 区分普通拒收与师德红线（逾矩档）
 */
function buildCashGiftRejection(
  mentorId: string,
  mentorName: string,
  amountYuan: number,
  isRedLine: boolean
): NonNullable<OfficeDialogueOption["rejection"]> {
  const type = normalizeMentorType(mentorId);
  const tier = cashGiftTierIndex(amountYuan);
  const envelope = tier <= 1 ? "一个素白信封" : tier <= 3 ? "一个鼓鼓的信封" : "一个厚实的牛皮纸信封";

  // 师德红线：好感度 -15、压力 +8；普通拒收：好感度 -2、压力 +4
  const basePenalty = isRedLine
    ? { mentorFavorability: -15, stress: 8 }
    : { mentorFavorability: -2, stress: 4 };

  switch (type) {
    case "practice":
      return {
        statDeltas: { money: 0, ...basePenalty },
        mentorReply: isRedLine
          ? `「你这是什么意思？把东西收起来——你这数字已经能让人多想了。我帮你盯项目是因为你做得出来，不是因为这种东西。你要再这样，下次别进我这个门。」`
          : `「你这是干什么？把这玩意儿收起来。我帮你看项目是因为你做得出来，不是因为这个。你要真想谢我，下次投标给我拿个一等奖回来。」`,
        replyTone: isRedLine ? "neutral" : "neutral",
        resultNarrative: isRedLine
          ? `${mentorName} 的语气罕见地冷了下来。你意识到这个金额已经触碰到了实务派导师的底线——他们的"江湖"是有边界的，越过了就不再是自己人。`
          : `拒收得很干脆，但你也没觉得难堪——实务派的边界是软的，他们的"不"不带刺。`,
        dialogueSequence: [
          {
            speaker: "narration",
            content: `你把${envelope}放在 ${mentorName} 桌上。他瞥了一眼厚度，眉头皱了起来。`,
          },
          {
            speaker: "player",
            name: "你",
            action: "把信封推近了一点",
            content: `老师，这点您别推辞……`,
          },
          {
            speaker: "mentor",
            name: mentorName,
            action: isRedLine ? "没去碰那个信封" : "把信封推回你面前",
            tone: "neutral",
            content: isRedLine
              ? `你这个数字……你知不知道这已经不是"心意"了？我跟甲方打了这么多年交道，收到这种金额是要写检讨的。把它拿走，下次别再这样。`
              : `你这是干什么？把这玩意儿收起来。我帮你看项目是因为你做得出来，不是因为这个。`,
          },
          {
            speaker: "player",
            name: "你",
            action: "把信封塞回包里",
            content: `……好的老师。`,
          },
          {
            speaker: "mentor",
            name: mentorName,
            action: isRedLine ? "转过身，不再看你" : "拍了拍你的肩",
            tone: "neutral",
            content: isRedLine
              ? `回去吧。这件事我希望就到这里。`
              : `行了，别扭扭捏捏的。回去改图吧。`,
          },
          {
            speaker: "narration",
            content: isRedLine
              ? `你抓起信封夺门而出。实务派导师的"江湖规矩"是有上限的，越过那条线，你就不再是"自己人"。好感度 -15。`
              : `拒收得很干脆，但你也没觉得难堪——实务派的边界是软的，他们的"不"不带刺。好感度小幅下降。`,
          },
        ],
      };
    case "hands_off":
      return {
        statDeltas: { money: 0, ...basePenalty },
        mentorReply: isRedLine
          ? `「哇哦等等——你这个数额已经超出我能理解的范围了。我们组不兴这个，你自己拿回去。我希望以后别再发生这种事。`
          : `哎呀你这孩子客气啥，自己留着用。咱们组不兴这些——赶紧回去忙吧。`,
        replyTone: "neutral",
        resultNarrative: isRedLine
          ? `${mentorName} 的语气里第一次出现了一种近乎疏离的严肃。放养派导师的"不设防"是有底线的，越过了就再也回不去。`
          : `他挥挥手把信封推回来，态度倒是不生硬，但你明显感觉到放养派导师对形式化的东西兴致缺缺。`,
        dialogueSequence: [
          {
            speaker: "narration",
            content: `${mentorName} 正在调一段城市声景。你把${envelope}放在波形图旁边。`,
          },
          {
            speaker: "player",
            name: "你",
            action: "尽量让自己的语气听起来随意",
            content: `老师，这个……您收着。`,
          },
          {
            speaker: "mentor",
            name: mentorName,
            action: isRedLine ? "猛地摘下耳机，盯着你看了好几秒" : "摘下半边耳机，摆摆手",
            tone: "neutral",
            content: isRedLine
              ? `等等等等——这个数字你认真的？这已经不是我能不能收的问题了，是我要不要提醒你"你在做什么"的问题。拿回去。`
              : `哎呀你这孩子客气啥，自己留着用。咱们组不兴这些。`,
          },
          {
            speaker: "player",
            name: "你",
            action: "尴尬地把信封收回",
            content: `……好的老师。`,
          },
          {
            speaker: "mentor",
            name: mentorName,
            action: isRedLine ? "重新戴上耳机，转身背对你" : "重新戴上耳机",
            tone: "neutral",
            content: isRedLine
              ? `这件事就当没发生。但你自己心里要有数。`
              : `行了行了，赶紧回去忙吧。`,
          },
          {
            speaker: "narration",
            content: isRedLine
              ? `放养派原本的松弛感在这一刻荡然无存。你意识到，这种数额已经触碰到了他的某种底线。好感度 -15。`
              : `他挥挥手把信封推回来，态度不生硬，但你明显感觉到放养派对形式化的东西兴致缺缺。`,
          },
        ],
      };
    case "academic":
      return {
        statDeltas: { money: 0, ...basePenalty },
        mentorReply: isRedLine
          ? `「你知不知道你现在的行为，在学校的师德规范里叫什么？把它拿走。下不为例。我不会记在档案里，但你自己心里要有数。」`
          : `这是什么？……你知不知道你现在的行为，在我们这一行意味着什么？把它拿回去。`,
        replyTone: "neutral",
        resultNarrative: isRedLine
          ? `${mentorName} 的声音压得很低，没有任何起伏，但那种平静本身就是一种愤怒。学术派的"清廉"不是表演，是他们立足的全部底气。`
          : `学术派导师对现金几乎是本能地排斥——他们要的是你的课题，不是你的钱。`,
        dialogueSequence: [
          {
            speaker: "narration",
            content: `${mentorName} 的办公室里只有巴赫的平均律在响。你把${envelope}放在《营造法式》英译本上，心跳莫名其妙地快了起来。`,
          },
          {
            speaker: "player",
            name: "你",
            action: "措辞谨慎",
            content: `老师，这是我……`,
          },
          {
            speaker: "mentor",
            name: mentorName,
            action: "没等你说完，目光已经锁定信封",
            tone: "neutral",
            content: `这是什么？`,
          },
          {
            speaker: "player",
            name: "你",
            action: "手开始发抖",
            content: `……一点心意。`,
          },
          {
            speaker: "mentor",
            name: mentorName,
            action: "沉默了大约 5 秒，声音压得很低",
            tone: "neutral",
            content: isRedLine
              ? `你知不知道你现在的行为，在学校的师德规范里叫什么？这个东西你拿回去。下不为例。我不会记在档案里，但你自己心里要有数。`
              : `我教了三十年书，没收过学生的现金。这个东西你拿回去。你要真想谢我，把你的宋代柱础断代做出像样的东西来。`,
          },
          {
            speaker: "narration",
            content: `你抓起信封夺门而出。学术派导师的"清廉"不是表演，是他们在这个圈子里立足的全部底气。你刚才差点踩到的那条线，名叫"师德"。好感度 ${isRedLine ? "-15" : "-2"}。`,
          },
        ],
      };
    case "overseas":
      return {
        statDeltas: { money: 0, ...basePenalty },
        mentorReply: isRedLine
          ? `「I'm going to pretend I didn't see this. Take it back. Now. And please—don't ever do this again.」`
          : `Hmm. I appreciate the thought, but this really isn't how we do things. Take it back.`,
        replyTone: "neutral",
        resultNarrative: isRedLine
          ? `${mentorName} 的表情第一次出现了一种近乎冰冷的距离感。海归派对"边界"的执念，在这一刻显现得淋漓尽致。`
          : `他用一种近乎礼貌却疏离的方式拒绝了。海归派导师对师生边界感格外敏感，现金在他们眼里几乎是一种越界。`,
        dialogueSequence: [
          {
            speaker: "narration",
            content: `${mentorName} 的办公室是极简黑白灰，MacBook 旁一杯喝了一半的 flat white。你把${envelope}放在 guest table 上。`,
          },
          {
            speaker: "player",
            name: "你",
            action: "尽量让自己的英语听起来自然",
            content: `Professor, I just wanted to……`,
          },
          {
            speaker: "mentor",
            name: mentorName,
            action: "看了一眼信封，表情微微一变",
            tone: "neutral",
            content: isRedLine
              ? `I'm going to pretend I didn't see this. Take it back. Now. And please—don't ever do this again.`
              : `Hmm. I appreciate the thought, but this really isn't how we do things. You know that, right?`,
          },
          {
            speaker: "player",
            name: "你",
            action: "已经准备好被拒绝",
            content: `……Yes. I'm sorry.`,
          },
          {
            speaker: "mentor",
            name: mentorName,
            action: "把信封轻轻推回你面前",
            tone: "neutral",
            content: isRedLine
              ? `Boundaries are not walls—they are how we respect each other. Please remember that.`
              : `If you're struggling financially, there are proper channels—TA positions, scholarships. But this? This I can't take.`,
          },
          {
            speaker: "narration",
            content: `他把信封轻轻推回你面前，动作里没有任何指责，只有一种近乎本能的边界感。好感度 ${isRedLine ? "-15" : "-2"}。`,
          },
        ],
      };
  }
}

/**
 * 生成一个送钱选项（运行时根据玩家输入的金额动态构造）
 * @param mentor 导师办公室资料
 * @param favorability 当前好感度
 * @param amountYuan 玩家输入的金额（元）
 * @param currentBalanceYuan 当前余额（元），用于 disabled 判定
 * @param consecutiveCount 本学期连续送钱次数（用于边际递减）
 */
export function generateCashGiftOption(
  mentor: MentorOfficeProfile,
  favorability: number,
  amountYuan: number,
  currentBalanceYuan: number,
  consecutiveCount: number
): OfficeDialogueOption {
  const tier = cashGiftTierIndex(amountYuan);
  const tierLabel = CASH_GIFT_TIER_LABELS[tier];
  const isRedLine = isRedLineViolation(amountYuan);
  const favorBonus = calcCashGiftFavorBonus(mentor.mentorId, favorability, amountYuan, consecutiveCount);
  const stressRelief =
    CASH_GIFT_STRESS_RELIEF[normalizeMentorType(mentor.mentorId)]?.[tier] ?? 3;
  const insufficient = amountYuan > currentBalanceYuan;
  const highFavor = isHighFavorSpecialCase(favorability);
  const finalFavor = highFavor ? Math.max(1, Math.round(favorBonus * 0.5)) : favorBonus;

  const acceptanceDialogue = buildCashGiftAcceptance(mentor.mentorId, mentor.name, amountYuan, finalFavor);
  const rejectionData = buildCashGiftRejection(mentor.mentorId, mentor.name, amountYuan, isRedLine);

  const description = isRedLine
    ? `金额超过 ¥10,000 红线，触碰师德底线——大概率被严厉拒收并大幅降低好感。`
    : `直接奉上 ¥${amountYuan} 现金（${tierLabel}）。金额越大，反应越敏感，收下加成也越可观。`;

  // 内部 money 数值（约 0-100 区间，1 ≈ ¥500）
  const moneyDelta = -balanceToMoney(amountYuan);

  return {
    id: "gift_cash",
    label: `敬献一份现金 ¥${amountYuan}`,
    emoji: "🧧",
    category: "gift",
    description,
    costText: `${tierLabel}${isRedLine ? " · 逾矩" : ""} · ${insufficient ? `余额不足（差 ¥${amountYuan - currentBalanceYuan}）` : `花费 ¥${amountYuan}`}`,
    disabled: insufficient,
    disabledReason: insufficient ? `当前余额 ¥${currentBalanceYuan}，不足以支付 ¥${amountYuan}` : undefined,
    statDeltas: {
      money: moneyDelta,
      mentorFavorability: finalFavor,
      stress: -stressRelief,
    },
    mentorReply: acceptanceDialogue[acceptanceDialogue.length - 1]?.content ?? "",
    replyTone: "warm",
    resultNarrative: `导师收下了你的信封。好感度 +${finalFavor}，压力 -${stressRelief}。`,
    rejection: rejectionData,
    acceptanceDialogue,
  };
}

/** 每学期送钱次数上限 */
export const CASH_GIFT_PER_SEMESTER_LIMIT = 2;

/** localStorage 键名（按学期区分） */
export function cashGiftRecordKey(semester: number): string {
  return `archGame_cashGiftRecord_s${semester}`;
}

/** 读取本学期送钱记录 */
export function readCashGiftRecord(semester: number): { count: number; lastRound: number | null } {
  if (typeof window === "undefined") return { count: 0, lastRound: null };
  try {
    const raw = window.localStorage.getItem(cashGiftRecordKey(semester));
    if (!raw) return { count: 0, lastRound: null };
    return JSON.parse(raw);
  } catch {
    return { count: 0, lastRound: null };
  }
}

/** 写入本学期送钱记录 */
export function writeCashGiftRecord(semester: number, round: number): void {
  if (typeof window === "undefined") return;
  const prev = readCashGiftRecord(semester);
  const next = { count: prev.count + 1, lastRound: round };
  try {
    window.localStorage.setItem(cashGiftRecordKey(semester), JSON.stringify(next));
  } catch {
    // ignore
  }
}

/** 当前学期是否还能送钱 */
export function canSendCashGiftThisSemester(semester: number): boolean {
  return readCashGiftRecord(semester).count < CASH_GIFT_PER_SEMESTER_LIMIT;
}

/** 按导师类型构造拒收事件的文案、数值影响与剧情对话序列 */
function buildGiftRejection(
  mentorId: string,
  mentorName: string
): NonNullable<OfficeDialogueOption["rejection"]> {
  const type = normalizeMentorType(mentorId);
  const base = {
    statDeltas: { money: 0, mentorFavorability: -1, stress: 3 },
  };

  switch (type) {
    case "practice":
      return {
        ...base,
        mentorReply: `「你这心意我领了，但这玩意儿真没必要。我跟甲方打了这么多年交道，送的东西比这贵重多了我都退回去——咱们之间，把活干漂亮比啥都强。」`,
        replyTone: "neutral",
        resultNarrative: `${mentorName} 婉拒了你的礼物，语气温和却坚定。你尴尬地把东西收回背包，意识到在实务派导师这里，作品和态度比礼物更有说服力。`,
        dialogueSequence: [
          {
            speaker: "narration",
            content: `你从包里取出一个素雅的礼盒，里面是家乡带来的明前龙井与一盒润喉糖。茶香在 ${mentorName} 办公室的通风口下隐隐飘散，与桌上摊开的总平面图、红蓝铅笔屑混在一起，显得格格不入。`,
          },
          {
            speaker: "player",
            name: "你",
            action: "双手递过礼盒，尽量让自己的语气听起来随意",
            content: `老师，这周回老家顺道带了点茶，不算什么值钱东西，您尝尝鲜——最近项目汇报这么密，润喉糖也放您桌上备用。`,
          },
          {
            speaker: "mentor",
            name: mentorName,
            action: "抬眼瞥了一下礼盒，又低头继续圈图",
            tone: "neutral",
            content: `嗯？放那儿吧。你这心意我领了，但这玩意儿真没必要。`,
          },
          {
            speaker: "mentor",
            name: mentorName,
            action: "搁下红铅笔，往椅背一靠",
            tone: "neutral",
            content: `跟你说句实在话——我跟甲方打了这么多年交道，甲方送的东西比这贵重十倍我都退回去。咱们师生之间，把活儿干漂亮、把节点盯紧，比啥都强。你这一盒茶，反倒让我觉得你最近是不是心虚？`,
          },
          {
            speaker: "player",
            name: "你",
            action: "愣了一下，下意识把礼盒往回收了半寸",
            content: `没、没有的事老师，就是顺路……那我拿回去？`,
          },
          {
            speaker: "mentor",
            name: mentorName,
            action: "摆摆手，重新拿起红铅笔",
            tone: "neutral",
            content: `拿回去吧。下次想把心思花在该花的地方——周三那个文化中心的中期汇报，你自己心里有数。行了，回去忙吧。`,
          },
          {
            speaker: "narration",
            content: `你把礼盒默默塞回背包，拉链声在安静的办公室里格外刺耳。${mentorName} 已经重新俯身在总图上，再没抬头。出门时你回头看了一眼——那盒润喉糖也被一并带走了。`,
          },
        ],
      };
    case "hands_off":
      return {
        ...base,
        mentorReply: `「哎呀你这孩子客气啥，自己留着用。咱们组不兴这些，你把项目做出来就是给我最好的礼物——行了行了，赶紧回去忙吧。」`,
        replyTone: "neutral",
        resultNarrative: `${mentorName} 挥挥手把礼物推了回来，态度倒是不生硬，但你明显感觉到放养派导师对形式化的东西兴致缺缺。`,
        dialogueSequence: [
          {
            speaker: "narration",
            content: `你敲了敲 ${mentorName} 办公室半开的门。屋里只开着一盏台灯，导师正戴着监听耳机调整一段城市声景的波形，桌上摊着半张没画完的剖面图。你把礼盒放在波形图旁边，茶香立刻被音箱散发的热量冲淡了。`,
          },
          {
            speaker: "player",
            name: "你",
            action: "摘下耳机那一侧的话筒，试探性地开口",
            content: `老师，打扰了——家里寄了点茶，给您留一份，不算什么。`,
          },
          {
            speaker: "mentor",
            name: mentorName,
            action: "摘下一只耳机，眯眼看了看礼盒",
            tone: "neutral",
            content: `哎呀，你这孩子客气啥。`,
          },
          {
            speaker: "mentor",
            name: mentorName,
            action: "直接把礼盒往你这边一推，动作意外地干脆",
            tone: "neutral",
            content: `自己留着喝。咱们组不兴这些虚的，你又不是不知道。你要真想孝敬我——把项目做出来，把毕业论文写明白，比啥都强。`,
          },
          {
            speaker: "player",
            name: "你",
            action: "站在原地有点尴尬，礼盒被推回面前",
            content: `……那好吧。`,
          },
          {
            speaker: "mentor",
            name: mentorName,
            action: "重新戴上那只耳机，眼神已经飘回屏幕",
            tone: "neutral",
            content: `行了行了，赶紧回去忙吧。下周那个跨界沙龙你要是有兴趣就来旁听，别带东西，带耳朵就行。`,
          },
          {
            speaker: "narration",
            content: `${mentorName} 已经重新沉浸回声波的世界里。你抱着礼盒退出办公室，门在身后轻轻合上，走廊里只剩下空调外机的低鸣。你想起放养派导师的规矩——他们要的不是你的"心意"，是你的独立。`,
          },
        ],
      };
    case "academic":
      return {
        ...base,
        mentorReply: `「我说多少次了，做学问的不搞这些虚的。你要真想感谢我，把下次的开题报告写扎实了，把那几篇罕见文献的出处一个个核对清楚——比送什么茶都强。东西拿回去。」`,
        replyTone: "neutral",
        resultNarrative: `${mentorName} 皱着眉头把礼物推了回来。空气里有几秒钟的尴尬沉默，你意识到学术派导师对学生的"心思"几乎天然排斥，他们要的是你的课题，不是你的伴手礼。`,
        dialogueSequence: [
          {
            speaker: "narration",
            content: `${mentorName} 的办公室堆满了德法原版理论书与一摞未批改的开题报告。黑胶唱机里巴赫的无伴奏大提琴正放 to 第三乐章。你把礼盒放在唯一一块还算空白的桌角，茶香立刻被旧书页的霉味吞没了。`,
          },
          {
            speaker: "player",
            name: "你",
            action: "屏住呼吸，尽量不打断那段巴赫",
            content: `老师，家乡带了点明前茶，放在您这里——润喉糖也在里面，您讲课多。`,
          },
          {
            speaker: "mentor",
            name: mentorName,
            action: "没有抬头，红笔在一份开题报告上划了一道长长的红线",
            tone: "neutral",
            content: `嗯。放那儿吧。`,
          },
          {
            speaker: "narration",
            content: `你以为这就收下了，正准备告辞——${mentorName} 却突然停下笔，把眼镜往鼻梁上一推，抬起头直视你。那种眼神让你想起开题答辩时被追问文献出处的瞬间。`,
          },
          {
            speaker: "mentor",
            name: mentorName,
            action: "把礼盒往你面前一推，动作不重，却很坚决",
            tone: "neutral",
            content: `我说多少次了，做学问的不搞这些虚的。你要真想感谢我——`,
          },
          {
            speaker: "mentor",
            name: mentorName,
            action: "用红笔点了点桌上那摞开题报告",
            tone: "neutral",
            content: `把下次的开题报告写扎实了。把那几篇罕见文献的出处一个个核对清楚。把你的论证逻辑捋顺，别让我在答辩现场替你圆场——比送什么茶都强。东西拿回去。`,
          },
          {
            speaker: "player",
            name: "你",
            action: "脸颊发烫，伸手把礼盒收回",
            content: `……好的老师，我记住了。`,
          },
          {
            speaker: "mentor",
            name: mentorName,
            action: "重新低下头，红笔已经落在下一份报告上",
            tone: "neutral",
            content: `去吧。下周三把第二章的修订稿发我，别再让我看到"据学者研究"这种糊弄人的表述。`,
          },
          {
            speaker: "narration",
            content: `巴赫的第三乐章恰好结束。你抱起礼盒退出办公室，门轻轻合上的瞬间，下一段萨拉班德舞曲开始流淌。空气里有几秒钟的尴尬沉默沉淀下来——你意识到，学术派导师对学生的"心意"几乎天然排斥，他们要的是你的课题，不是你的伴手礼。`,
          },
        ],
      };
    case "overseas":
      return {
        ...base,
        statDeltas: { money: 0, mentorFavorability: -2, stress: 4 },
        mentorReply: `「Hmm…thanks, but we don't really do this in my group. 我比较习惯就事论事，你把研究做好我就很欣慰了——这个你拿回去吧，别让我为难。」`,
        replyTone: "neutral",
        resultNarrative: `${mentorName} 用一种近乎礼貌却疏离的方式拒绝了你的礼物。你想起海归派导师对师生边界感格外敏感，这种"心意"在他们眼里反而是一种越界。`,
        dialogueSequence: [
          {
            speaker: "narration",
            content: `${mentorName} 的办公室是极简黑白灰，墙上挂着威尼斯双年展海报与一张包豪斯手稿复印件。MacBook 旁边放着一杯喝了一半的 flat white。你把礼盒放在_guest table_上——这是屋里唯一不带学术符号的家具。`,
          },
          {
            speaker: "player",
            name: "你",
            action: "尽量让自己的英语听起来自然",
            content: `Professor, 我家人从老家寄了点茶——这是中国传统的"一点心意"，希望您别介意。`,
          },
          {
            speaker: "mentor",
            name: mentorName,
            action: "从屏幕后抬起头，表情有一瞬间的不知所措",
            tone: "neutral",
            content: `Oh— wow, thanks. That's... very thoughtful of you.`,
          },
          {
            speaker: "narration",
            content: `${mentorName} 站起身，却没有去碰那个礼盒。他绕到 guest table 另一侧，双手插在口袋里，像在斟酌怎么开口。窗外是科研楼下沉式广场的傍晚，远处有学生在练萨克斯。`,
          },
          {
            speaker: "mentor",
            name: mentorName,
            action: "斟酌着用中文继续，语速比平时慢",
            tone: "neutral",
            content: `Look, 我真的 appreciate 你的心意——但在我们组，we don't really do this. 我比较习惯就事论事，你把研究做好，就是对我最大的尊重。`,
          },
          {
            speaker: "mentor",
            name: mentorName,
            action: "把礼盒轻轻推回你这一侧",
            tone: "neutral",
            content: `这个你拿回去吧，别让我为难。I mean it — 不是针对你，是我对所有人都是这样。我不想让组里的同学觉得，跟我相处需要走这些"关系"。你懂我意思吗？`,
          },
          {
            speaker: "player",
            name: "你",
            action: "点头，喉咙里像卡了什么",
            content: `I understand. 抱歉 professor，是我考虑不周。`,
          },
          {
            speaker: "mentor",
            name: mentorName,
            action: "温和地笑了一下，但眼神依然是疏离的",
            tone: "neutral",
            content: `No worries at all — 你不是第一个，也不会是最后一个。下周我们接着讨论那个 spatial topology 的章节，OK？ 把心思放那儿。`,
          },
          {
            speaker: "narration",
            content: `你抱起礼盒退出办公室。走廊里贴满了 visiting scholars 的合影与各国大学的交换海报。你想起海归派导师对师生边界感格外敏感——这种"心意"在他们眼里反而是一种越界。下楼梯时你把礼盒塞回包里，茶盒的边角硌着后背，一路陪你走到地铁站。`,
          },
        ],
      };
  }
}

/** 按导师类型构造"礼物被收下"的剧情对话序列 */
function buildGiftAcceptance(
  mentorId: string,
  mentorName: string
): GiftDialogueLine[] {
  const type = normalizeMentorType(mentorId);

  switch (type) {
    case "practice":
      return [
        {
          speaker: "narration",
          content: `你把礼盒放在 ${mentorName} 的画图桌上，紧挨着一摞刚从工地寄回的节点洽商单。茶香与墨水味、铝板样品的金属味混在一起，反倒让这间忙乱的办公室多了点人情味。`,
        },
        {
          speaker: "player",
          name: "你",
          action: "把礼盒往导师手边推了推",
          content: `老师，老家寄了点茶——您最近跑工地多，嗓子容易哑，润喉糖也放这儿了。`,
        },
        {
          speaker: "mentor",
          name: mentorName,
          action: "停下红铅笔，把礼盒拿起来掂了掂",
          tone: "warm",
          content: `哟，明前的？ 你这孩子倒是有心。`,
        },
        {
          speaker: "mentor",
          name: mentorName,
          action: "打开盒盖闻了闻，难得露出一点松弛的表情",
          tone: "warm",
          content: `行，这个我收着——正好这两天跟甲方扯皮扯得嗓子疼。我跟你说，做实务这一行，最缺的就是这种"有人想着你"的感觉。你懂吧？`,
        },
        {
          speaker: "player",
          name: "你",
          action: "松了口气",
          content: `那您留着喝，下次我从家再给您带点别的。`,
        },
        {
          speaker: "mentor",
          name: mentorName,
          action: "摆摆手，重新拿起红铅笔",
          tone: "warm",
          content: `别老带东西啊，又不是走亲戚——哎对，下周三那个文化中心中期汇报，你跟着我来，让你看看甲方是怎么"温柔地"撕方案的。`,
        },
        {
          speaker: "narration",
          content: `${mentorName} 把茶盒挪到桌角一个显然是"私人领地"的位置——那里还摆着一张他孩子的照片。你知道，在这位实务派导师这里，礼物从来不等于讨好，而是"这个人值得我信任"的信号。`,
        },
      ];
    case "hands_off":
      return [
        {
          speaker: "narration",
          content: `${mentorName} 的办公室门永远半开着。你进去时，导师正盘腿坐在椅子上看一本人类学田野笔记，桌上放着一杯手冲。你把礼盒放在那杯手冲旁边——这是屋里唯一能放下东西的空地。`,
        },
        {
          speaker: "player",
          name: "你",
          action: "把礼盒轻轻放下",
          content: `老师，家里寄了点茶，给您留一份。`,
        },
        {
          speaker: "mentor",
          name: mentorName,
          action: "合上书，把礼盒拿起来端详了一下",
          tone: "warm",
          content: `嚯，这包装挺讲究啊。你这孩子倒是会挑——行，我收了，正好今天这杯手冲冲砸了。`,
        },
        {
          speaker: "mentor",
          name: mentorName,
          action: "起身去角落的小茶水台，开始烧水",
          tone: "warm",
          content: `坐一会儿？ 我刚煮上水，咱俩一起喝一杯。你最近那个跨学科的方向想得怎么样了？别跟我客气，自己找地方坐——地上也行，我这儿本来就没什么规矩。`,
        },
        {
          speaker: "player",
          name: "你",
          action: "在书堆里找了块还算干净的地方坐下",
          content: `方向有点眉目了，但还在犹豫要不要加一个城市社会学的视角……`,
        },
        {
          speaker: "mentor",
          name: mentorName,
          action: "把茶汤倒进两个完全不配套的杯子里，递给你一杯",
          tone: "warm",
          content: `加。当然加。你以为我做放养型是因为懒？ 是因为我知道你们这一代人要做的建筑，不能再只靠类型学和功能流线了——你得自己去找交叉点。你今天的茶，换这杯 talk，值。`,
        },
        {
          speaker: "narration",
          content: `你和导师在落地窗边聊了将近一个小时，从田野方法聊到项飙的"附近"，从城市更新聊到 AI 生成空间的伦理。离开时天已经黑透了。你意识到，放养派导师的"收下礼物"，本质上是收下了一段不带绩效压力的真实对话。`,
        },
      ];
    case "academic":
      return [
        {
          speaker: "narration",
          content: `${mentorName} 的办公室飘着铁观音的茶气。你把礼盒放在那张堆满《营造法式》石印本的长桌上——这张桌子见证过无数开题与答辩，但很少接待过"礼物"。`,
        },
        {
          speaker: "player",
          name: "你",
          action: "双手递过礼盒",
          content: `老师，这周回老家带的茶，给您尝尝鲜。`,
        },
        {
          speaker: "mentor",
          name: mentorName,
          action: "停下手中正在校对的法式模数表，摘下老花镜",
          tone: "warm",
          content: `嗯？ 明前的？ 难为你想着。`,
        },
        {
          speaker: "mentor",
          name: mentorName,
          action: "打开盒盖看了看叶底，轻轻点头",
          tone: "warm",
          content: `叶底匀整，是正经东西。行，这个我收着——你知道我不轻易收学生的东西，但你这孩子做事向来踏实，这份心意我领了。`,
        },
        {
          speaker: "mentor",
          name: mentorName,
          action: "把礼盒小心地放在书架旁一个专门的格子里——那里显然是「学生心意」专区",
          tone: "warm",
          content: `我跟你说，做学问这条路上，真正能坚持下去的人不多。你近期那篇关于明代官式形制流变的稿子我看了——比半年前有长进，尤其是柱础雕饰那段的分析，开始有自己的判断了。继续保持。`,
        },
        {
          speaker: "player",
          name: "你",
          action: "没料到会被点名表扬，有点受宠若惊",
          content: `谢谢老师……那段我也是反复改了五六版。`,
        },
        {
          speaker: "mentor",
          name: mentorName,
          action: "重新戴上老花镜，准备回到法式模数表",
          tone: "warm",
          content: `改七八版才对。回去把参考文献再核一遍，下周给我看终稿——对了，下次别带东西了，把稿子带好就行。`,
        },
        {
          speaker: "narration",
          content: `${mentorName} 把茶盒放在了书架旁一个专门的格子里——那里已经有几盒往届学生送的茶，有的拆过，有的原封不动，但都被保留着。你意识到，学术派导师拒收的是"形式"，收下的永远是"心意背后的努力"。`,
        },
      ];
    case "overseas":
      return [
        {
          speaker: "narration",
          content: `${mentorName} 的办公室挂满威尼斯双年展海报。你把礼盒放在 guest table 上——这是屋里唯一不带学术符号的家具。导师正用 iPad 比对一组城市纹理地图，听见你进来，摘下一只 AirPods。`,
        },
        {
          speaker: "player",
          name: "你",
          action: "把礼盒往前推了推，有些忐忑",
          content: `Professor, 家里寄了点中国茶——这是中国传统的"一点心意"，希望您愿意收下。`,
        },
        {
          speaker: "mentor",
          name: mentorName,
          action: "放下 iPad，认真地看了看礼盒，又看了看你",
          tone: "warm",
          content: `Oh— 这个我得好好想想。`,
        },
        {
          speaker: "narration",
          content: `有那么几秒钟你心跳加速——你以为又要被拒。但 ${mentorName} 这次却没有推回来，而是伸手轻轻把礼盒拿到自己那侧。`,
        },
        {
          speaker: "mentor",
          name: mentorName,
          action: "认真地，但带着笑意",
          tone: "warm",
          content: `好。我收下。 不是因为这是一盒茶——是因为你愿意跨过那种"师生边界感"来跟我表达尊重。我知道这对你来说不容易，我也知道在中国语境里这意味着什么。`,
        },
        {
          speaker: "mentor",
          name: mentorName,
          action: "把礼盒放在 MacBook 旁边",
          tone: "warm",
          content: `下次我请组里同学一起喝茶——我来煮，你来讲讲你家乡的茶文化怎么样？I'm serious, 这可以是我们下次 studio 的一个 warm-up。`,
        },
        {
          speaker: "player",
          name: "你",
          action: "没想到会被这样接住",
          content: `那……那我下次准备一下，讲得不好您别嫌弃。`,
        },
        {
          speaker: "mentor",
          name: mentorName,
          action: "笑出声，重新戴上 AirPods",
          tone: "warm",
          content: `Welcome to my group — 我们这里最不缺的就是"讲得不好"的尝试。去吧，下周见。`,
        },
        {
          speaker: "narration",
          content: `你退出办公室时，导师已经开始在 iPad 上查找"中国茶礼仪"。你意识到，海归派导师的"收下"，不是对中国式人情世故的妥协，而是主动选择跨过那条边界，把你真正纳入了他的学术社区。`,
        },
      ];
  }
}

/** 获取导师的场景与办公室配置 */
export function getMentorOfficeProfile(mentor: { id: string; name: string; title?: string; image?: string } | null): MentorOfficeProfile {
  const mentorId = mentor?.id || "academic";
  const name = mentor?.name || "童敦桢";

  // 默认学术派
  let sceneImage = "/assets/visuals/mentors/academic.webp";
  let avatarImage = "/assets/visuals/npcs/professor_academic_tong.jpg";
  let hasPortrait = false;
  let officeLocation = "前工房 412";
  let officeAtmosphere = "阳光透过百叶窗照在《营造法式》石印本与满桌古建测绘草图上，空气中弥漫着清淡的墨香与铁观音茶气。";
  let personalityTag = "严谨博学 · 考据派学者";
  let quote = "你的脚踩过那根柱础，才有资格在纸上谈论它。";
  let moods = ["正在用红笔审阅同门的博士论文", "刚刚完成江浙古建测绘数据校对", "在泡一壶刚到的明前龙井"];

  if (mentorId === "academic") {
    sceneImage = "/assets/visuals/mentors/academic.webp";
    if (name === "葛慎康") {
      avatarImage = "/assets/visuals/npcs/professor_academic_ge.jpg";
      officeLocation = "建筑馆 503";
      officeAtmosphere = "四面书架堆满了德法原版理论著作，黑胶唱片放着巴赫，办公桌上摊开着《建筑批评学》手稿。";
      personalityTag = "犀利深刻 · 批判理论大师";
      quote = "批评不是否定——批评是认真对待。你若不批评，说明你根本不在乎。";
      moods = ["正在拟定下周理论讨论班的思辨书单", "刚驳回了一篇人云亦云的开题报告", "在窗边品尝现磨黑咖啡"];
      hasPortrait = true;
    } else if (name === "朱薇亚") {
      avatarImage = "/assets/visuals/npcs/professor_academic_zhu.jpg";
      officeLocation = "中大院 301";
      officeAtmosphere = "窗台爬满了常青藤，几张明代官式建筑拓片挂在白墙上，气氛宁静而典雅。";
      personalityTag = "细腻温和 · 空间礼制专家";
      quote = "建筑留存的，不只是形制，还有那个时代的人对世界的理解方式。";
      moods = ["正在为青年学者基金做评审准备", "细心批注着学生的田野考察记录", "在给窗台的兰花浇水"];
      hasPortrait = true;
    } else if (name === "齐廷宝") {
      avatarImage = "/assets/visuals/npcs/professor_academic_qi.jpg";
      officeLocation = "前工房 305";
      officeAtmosphere = "门上挂着「请勿打扰」木牌，屋内摆放着一整套宋式斗栱榫卯实体模型与高精度游标卡尺。";
      personalityTag = "严苛求精 · 课题组定海神针";
      quote = "做学问要耐得住寂寞——但更重要的是，你要配得上寂寞。";
      moods = ["正在对照一手古籍核验法式模数", "眉头微蹙审视着上一版的结构复原图", "桌上放着昨晚熬夜未合上的大部头"];
      hasPortrait = true;
    } else if (name === "童敦桢") {
      // 童敦桢沿用默认 academic_tong.jpg，但补 hasPortrait 标记
      hasPortrait = true;
      moods = ["正在为博士生的开题报告做最后一遍批注", "对照宋《营造法式》石印本核校复原图", "在桌前啜饮刚沏的铁观音"];
    }
  } else if (mentorId === "hands_off") {
    sceneImage = "/assets/visuals/mentors/hands-off.webp";
    avatarImage = "/assets/visuals/npcs/professor_hands_off.jpg";
    officeLocation = "中大院 212";
    officeAtmosphere = "门经常敞开着，窗台上摆着几盆多肉植物，桌上只有一台轻薄笔记本和几本跨学科前沿专著。";
    personalityTag = "崇尚自由 · 跨界探索者";
    quote = "学术是自己的事，想清楚你要什么，我只负责在关键时刻拉你一把。";
    moods = ["刚刚挂断一个跨学科创新项目的视频会议", "在阅读最新的AI生成建筑学术论文", "准备收拾东西去参加行业沙龙"];
    if (name === "沈剑葳") {
      avatarImage = "/assets/visuals/npcs/professor_hands_off_shen.jpg";
      hasPortrait = true;
      moods = ["戴着监听耳机在工位上调整一段声景装置的采样", "约了城市声学实验室的伙伴线上对谈", "桌上摊着半张还没画完的波形剖面图"];
    }
    if (name === "李诸葛") {
      avatarImage = "/assets/visuals/npcs/professor_hands_off_li.jpg";
      hasPortrait = true;
      moods = ["捧着刚泡好的老白茶翻阅城市设计手册", "在手账上写下一周要去看的三个项目", "和组里学生讨论地方营造的非标准做法"];
    }
    if (name === "旸葳") {
      avatarImage = "/assets/visuals/npcs/professor_hands_off_yang.jpg";
      hasPortrait = true;
      moods = ["手里捧着一本人类学田野笔记陷入沉思", "在白板上随手画着几个空间的隐喻草图", "和学生讨论一部艺术电影中的空间叙事"];
    }
    if (name === "钱晓茜") {
      avatarImage = "/assets/visuals/npcs/professor_hands_off_qian.jpg";
      hasPortrait = true;
      moods = ["手里端着一杯刚买的澳白，正对照平板上的文献索引勾画批注", "在工位上煮手冲，顺便跟来访的学生聊最近的项目节奏", "翻完一本跨学科的新书，准备写邮件约作者线上对谈"];
    }
  } else if (mentorId === "practice") {
    sceneImage = "/assets/visuals/mentors/practice.webp";
    avatarImage = "/assets/visuals/npcs/professor_practice.jpg";
    officeLocation = "院里 18 楼 / 产学研工作室";
    officeAtmosphere = "两张超大号画图桌上铺满了城市文化中心的总平面图与节点施工图，旁边堆放着几十个材料样板。";
    personalityTag = "实务领军 · 方案总建筑师";
    quote = "图纸上的每一条线，在工地上都是真金白银和工人的汗水。";
    moods = ["正在和甲方项目总监通电话协调方案节点", "手握红铅笔在大幅总图上圈画修改意见", "桌上摆着今晚汇报方案的PPT打印稿"];
    if (name === "崔泰宁") {
      avatarImage = "/assets/visuals/npcs/professor_practice_cui.jpg";
      hasPortrait = true;
      moods = ["在材料样板堆里翻找一块可替代的仿木铝板", "和结构工程师讨论大跨度桁架的节点优化", "桌上摊开明晚市长汇报的总平面终稿"];
    }
    if (name === "何建民") {
      avatarImage = "/assets/visuals/npcs/professor_practice_he.jpg";
      hasPortrait = true;
      moods = ["戴着黑框眼镜在数字平板上勾画总图节点", "和来访的甲方项目负责人讨论材料样板替换方案", "翻看昨天工地反馈的结构修改意见"];
    }
    if (name === "恺宁") {
      avatarImage = "/assets/visuals/npcs/professor_practice_kai.jpg";
      hasPortrait = true;
      moods = ["对着玻璃幕墙节点三维模型陷入冥想", "和 BIM 团队核对机电管线的碰撞点位", "桌上堆着几份刚从工地寄回的施工洽商"];
    }
    if (name === "程恺") {
      avatarImage = "/assets/visuals/npcs/professor_practice_cheng.jpg";
      hasPortrait = true;
      moods = ["在模型桌前对照实体节点剖面与刚打印的平面图", "正和院里几个青年建筑师讨论近期公建项目的策略", "桌上摊着今早送到的玻璃幕墙样品册"];
    }
  } else if (mentorId === "global_scholar" || mentorId === "overseas") {
    sceneImage = "/assets/visuals/mentors/global-scholar.webp";
    avatarImage = "/assets/visuals/npcs/professor_overseas.jpg";
    officeLocation = "建筑科研楼 1801";
    officeAtmosphere = "极简主义黑白灰空间，墙上挂着威尼斯双年展海报与包豪斯手稿复印件，阳光通透。";
    personalityTag = "国际先锋 · 批判与实验性设计";
    quote = "不要被形式束缚，要理解空间背后的社会逻辑与人的行为。";
    moods = ["正在准备全英文国际学术研讨会的主旨发言", "在平板电脑上绘制实验性空间草图", "刚收到国外访问学者的合作邮件"];
    if (name === "张青") {
      avatarImage = "/assets/visuals/npcs/professor_overseas_zhang.jpg";
      hasPortrait = true;
      moods = ["刚结束一场跨越八个时区的联合设计评图", "在白板上勾勒着下一个驻地名古屋的项目时间表", "翻阅来自康奈尔与米兰理工的交换生作品集"];
    }
    if (name === "庄惟") {
      avatarImage = "/assets/visuals/npcs/professor_overseas_zhuang.jpg";
      hasPortrait = true;
      moods = ["在模型室里排列着十几个 1:50 的参数化结构模型", "屏幕上并行开着 Grasshopper 与 Karamba3D 的实时演算", "和学生讨论下周赴巴塞罗那的学术考察路线"];
    }
    if (name === "彤青") {
      avatarImage = "/assets/visuals/npcs/professor_overseas_tong.jpg";
      hasPortrait = true;
      moods = ["在桌前的航站楼模型前对照刚打印的机场剖面图", "翻看新加坡樟宜机场改造项目的最新邮件反馈", "正在和来访的工程顾问讨论某高铁车站的概念草图"];
    }
    if (name === "常彤") {
      avatarImage = "/assets/visuals/npcs/professor_overseas_chang.jpg";
      hasPortrait = true;
      moods = ["正用 iPad 比对城市纹理地图与一组新采集的人流热力数据", "在书架前整理一份要发给海外合作者的研究备忘", "端着黑咖啡翻看刚被同行评议退回的论文草稿"];
    }
  }

  return {
    mentorId,
    name,
    title: mentor?.title || "教授 / 博士生导师",
    officeLocation,
    officeAtmosphere,
    sceneImage,
    avatarImage,
    hasPortrait,
    quote,
    personalityTag,
    currentMoods: moods,
  };
}

/**
 * 导师初次见面专属剧情（首次进入导师办公室时触发）
 */
export function getMentorFirstMeet(profile: MentorOfficeProfile): GiftDialogueLine[] {
  const mentorName = profile.name || "葛慎康";
  const officeLoc = profile.officeLocation || "建筑馆 503";

  // 学术大牛派导师初见剧情
  if (profile.mentorId === "academic") {
    if (profile.name?.includes("朱薇亚")) {
      return [
        {
          speaker: "narration",
          content: "中大院 301 的门虚掩着，窗台的常青藤爬到半墙，几幅明代官式建筑拓片在午后阳光里泛着旧纸的暖光。朱薇亚正给一盆兰花浇水，听见声音，放下水壶。",
        },
        {
          speaker: "player",
          name: "你",
          action: "轻声",
          content: "朱老师好，我是新来的学生，来向您报到。",
        },
        {
          speaker: "mentor",
          name: "朱薇亚",
          action: "温和一笑",
          tone: "sweet",
          content: "来了呀。坐。先别急着说\"报到\"两个字——我想先问你：你走进一座明代的殿宇，最先感受到的是什么？是那根柱子，还是柱子之间、被礼制划出来的那个\"空\"？",
        },
        {
          speaker: "mentor",
          name: "朱薇亚",
          action: "拿起一幅拓片递给你",
          tone: "warm",
          content: "可以说，礼制不是死板的规矩，而是一种分地的方法——它规定了谁站哪里，也就规定了空间如何被秩序化。这幅斗栱，看着是构件，其实是那个时代的人，对\"空\"的一次划分。",
        },
        {
          speaker: "mentor",
          name: "朱薇亚",
          action: "语气轻柔却认真",
          tone: "focus",
          content: "坦率地说，我教的不是考据，也不是风格。我希望你读每一份文献时都先问一句：当时的人，为什么要把空间分成这样？带着这个问题，再来找我。",
        },
        {
          speaker: "narration",
          content: "兰花叶上的水珠滚落，砸在青石盆沿，发出极轻的一声。",
        },
      ];
    }

    if (profile.name?.includes("齐廷宝")) {
      return [
        {
          speaker: "narration",
          content: "前工房 305 的门上挂着一块「请勿打扰」的木牌。你硬着头皮敲门，屋里传来一句低沉的\"进\"。门后，一整套宋式斗栱榫卯实体模型立在桌心，旁边是一把高精度游标卡尺。",
        },
        {
          speaker: "player",
          name: "你",
          action: "小心翼翼",
          content: "齐老师，我是新来的学生，想跟您报到。",
        },
        {
          speaker: "mentor",
          name: "齐廷宝",
          action: "头也不抬，仍在核验模数",
          tone: "neutral",
          content: "先考你一个问题——你说你懂斗栱，那我问你：一朵斗栱，是构件，还是空间？",
        },
        {
          speaker: "player",
          name: "你",
          action: "一时语塞",
          content: "(沉默)",
        },
        {
          speaker: "mentor",
          name: "齐廷宝",
          action: "放下卡尺，抬眼",
          tone: "focus",
          content: "答不上来不丢人。坦率地说，模数不是拿来背的数字，而是认识空间的一把尺——你连这把尺都不会用，谈什么做设计？做学问要耐得住寂寞，但更重要的是，你要配得上寂寞。",
        },
        {
          speaker: "mentor",
          name: "齐廷宝",
          action: "指着桌上的榫卯模型",
          tone: "focus",
          content: "回去把这套铺作拆开、再装回去，装三遍。三遍都装不严丝合缝，下周一别来见我。",
        },
        {
          speaker: "narration",
          content: "他重新埋进那一摞大部头里。你看着那套严丝合缝的榫卯，第一次理解了什么叫\"定海神针\"。",
        },
      ];
    }

    if (profile.name?.includes("童敦桢")) {
      return [
        {
          speaker: "narration",
          content: "前工房 412 里，阳光透过百叶窗，落在《营造法式》石印本与满桌古建测绘草图上。童敦桢正啜饮一盅铁观音，见你进来，放下茶盏。",
        },
        {
          speaker: "player",
          name: "你",
          action: "恭敬",
          content: "童老师好，我来向您报到。",
        },
        {
          speaker: "mentor",
          name: "童敦桢",
          action: "语气平缓",
          tone: "neutral",
          content: "坐。先回答我一个问题——文献里的\"材分\"，和你在浙西山里亲手摸到的那根柱础，是同一个东西吗？",
        },
        {
          speaker: "mentor",
          name: "童敦桢",
          action: "起身，指着一旁的田野测绘相册",
          tone: "warm",
          content: "可以说，考据不是查字典，而是用脚去认识一座建筑曾经如何分地。纸上的柱础，和你亲手量过的那根，是两种东西。你的脚踩过它，才有资格在纸上谈论它。",
        },
        {
          speaker: "mentor",
          name: "童敦桢",
          action: "语重心长",
          tone: "focus",
          content: "坦率地说，我不反对数字工具，但认识\"空\"的功夫，只能在一手材料和现场里磨出来。回去把宋《营造法式》\"材分\"读透，下周带着问题来。",
        },
        {
          speaker: "narration",
          content: "茶气在阳光里散开。你忽然觉得，这位老先生说的是真的——学问，得用脚走出来。",
        },
      ];
    }

    // 葛慎康（默认）
    return [
      {
        speaker: "narration",
        content: `你敲开${officeLoc}的门。屋里飘着巴赫无伴奏大提琴，四面书架被德法原版理论书压得吱吱作响，办公桌上摊着一份没写完的《建筑批评学》手稿。${mentorName}背对着门，正盯着窗外的梧桐。`,
      },
      {
        speaker: "player",
        name: "你",
        action: "有些拘谨地开口",
        content: "老师好，我是您这届新带的研究生，来跟您报到。",
      },
      {
        speaker: "mentor",
        name: mentorName,
        action: "没回头，语气平静",
        tone: "neutral",
        content: "你好，先回答我一个问题——你为什么要来读建筑？想清楚了再回答。",
      },
      {
        speaker: "player",
        name: "你",
        action: "愣了一下",
        content: "（剧本留白，等玩家在心里作答）",
      },
      {
        speaker: "mentor",
        name: mentorName,
        action: "转过身，语气冷峻却笃定",
        tone: "focus",
        content: `坦率地说，我不关心你的分数，也不关心你本科画过多少张图。我关心的只有一件事——你对"空间"有没有真正的好奇。可以说，我们是全国最好的建筑学院。如果连我们的学生都只是来混一个学位、混一个饭碗，那这个学科就真的完了。`,
      },
      {
        speaker: "mentor",
        name: mentorName,
        action: "走到书桌前，语气缓和",
        tone: "sweet",
        content: `我的导师刘先生当年跟我说：研究传统，不是为了复古，而是为了创造性地转化。这句话我送给你。接下来这三年，我不指望你做出什么漂亮的东西——漂亮是最不值钱的。我要你学会一件事：认识"空"，认识空间是怎么被分出来的。`,
      },
      {
        speaker: "mentor",
        name: mentorName,
        action: "坐下，翻动书页",
        tone: "focus",
        content: "记住，别学那些只做表皮文章的建筑师——像隈研吾那种，狗屁不通。方法才是你唯一能带走的东西。",
      },
      {
        speaker: "narration",
        content: "他抬起头，目光穿过镜片，落在一份未开的开题报告上。你忽然意识到，这间办公室里，漂亮从不是通行证。",
      },
    ];
  }

  // 自由放养派导师初见剧情
  if (profile.mentorId === "hands_off") {
    if (profile.name?.includes("钱晓茜")) {
      return [
        {
          speaker: "narration",
          content: "钱晓茜手里端着一杯澳白，正对着平板上的文献索引勾勾画画。见你进来，她笑着指了指对面的椅子。",
        },
        {
          speaker: "player",
          name: "你",
          action: "坐下",
          content: "钱老师好，我来报到。",
        },
        {
          speaker: "mentor",
          name: "钱晓茜",
          action: "语气轻快",
          tone: "sweet",
          content: "欢迎呀。先喝咖啡——我这儿没什么上下级，倒是常有跨学科的朋友过来聊天。",
        },
        {
          speaker: "mentor",
          name: "钱晓茜",
          action: "认真起来",
          tone: "focus",
          content: "我最近在想：建筑生的那套空间思维，能不能拿去跟数据、跟 AI、跟社会学的工具杂交？真正的创新，往往发生在学科的交叉点上。",
        },
        {
          speaker: "mentor",
          name: "钱晓茜",
          action: "笑着摊手",
          tone: "sweet",
          content: "所以我不会规定你做什么。你去处一个让你兴奋的交叉点，找到了来告诉我。找不到，就多来喝两杯咖啡。",
        },
        {
          speaker: "narration",
          content: "澳白的奶泡在杯口打着旋。你忽然觉得，读研这件事，或许可以不用那么紧绷。",
        },
      ];
    }

    if (profile.name?.includes("李诸葛")) {
      return [
        {
          speaker: "narration",
          content: "李诸葛正捧着刚泡好的老白茶，翻一本城市设计手册。见你进来，他起身又拿了个杯子。",
        },
        {
          speaker: "player",
          name: "你",
          action: "有点意外",
          content: "李老师，我来报到，没打扰您吧？",
        },
        {
          speaker: "mentor",
          name: "李诸葛",
          action: "笑着倒茶",
          tone: "sweet",
          content: "打扰什么，我这儿最欢迎学生来喝茶。来，边喝边说——你最近在看什么？不是论文，是那种让你舍不得放下的事。",
        },
        {
          speaker: "mentor",
          name: "李诸葛",
          action: "语气像聊天",
          tone: "warm",
          content: "我不喜欢\"标准做法\"。地方营造、非标准设计，都靠一个东西：你对这块地方、这群人有没有真感情。没有感情的方案，做出来也是死的。",
        },
        {
          speaker: "mentor",
          name: "李诸葛",
          action: "举了举茶杯",
          tone: "focus",
          content: "这样，这周你自己去逛一个你平时不会去的地方，回来跟我讲讲\"为什么是它\"。讲不出来也没关系，喝茶。",
        },
        {
          speaker: "narration",
          content: "茶汤澄澈，热气袅袅。你发现放养型导师的办公室，有时候更像一个客厅。",
        },
      ];
    }

    if (profile.name?.includes("沈剑葳")) {
      return [
        {
          speaker: "narration",
          content: "中大院 215 室里回荡着极轻微的水滴与白噪音采样。沈剑葳摘下一侧监听耳机，白板上画着一段中大院走廊与屋檐雨声的声波包络。",
        },
        {
          speaker: "player",
          name: "你",
          action: "轻声开口",
          content: "沈老师好，我是新来的学生，来找您报到。",
        },
        {
          speaker: "mentor",
          name: "沈剑葳",
          action: "示意你安静，指向窗外",
          tone: "neutral",
          content: "嘘……先闭上眼睛，听十秒钟。除了蝉鸣和风声，你还听到了什么？",
        },
        {
          speaker: "mentor",
          name: "沈剑葳",
          action: "眼神中透着艺术家的光芒",
          tone: "warm",
          content: "空间不仅是被\"看\"到的，更是被身体\"听\"到的。一堵砖墙和一扇木窗，对声波的漫反射截然不同。建筑学一直太视觉中心主义了。",
        },
        {
          speaker: "mentor",
          name: "沈剑葳",
          action: "递给你一支便携录音笔",
          tone: "focus",
          content: "拿去，去校园里采集三种最让你心动的空间声景，下周我们聊聊怎么把声音转化为平面。",
        },
        {
          speaker: "narration",
          content: "耳边细微的风声仿佛被放大，你第一次发现，原来空间本身一直在呼吸和歌唱。",
        },
      ];
    }

    // 冷冬青（默认）
    return [
      {
        speaker: "narration",
        content: `中大院 203 室有些幽静，投影仪在白墙上无声定格着《镜子》里的长镜头。${mentorName}合上手里的人类学笔记，静静看向你。`,
      },
      {
        speaker: "player",
        name: "你",
        action: "恭敬行礼",
        content: "冷老师好，我是您的新研究生。",
      },
      {
        speaker: "mentor",
        name: mentorName,
        action: "声音清冷而深邃",
        tone: "neutral",
        content: "坐。如果一栋建筑不能在人的记忆里留下一场梦，那它就只是一堆终将风化的钢筋混凝土，不是吗？",
      },
      {
        speaker: "mentor",
        name: mentorName,
        action: "语气平缓却带着哲思",
        tone: "warm",
        content: "形式会过时，功能会演变，唯有空间对时间的铭刻是永恒的。我希望你不要急着画出漂亮的图纸，先想清楚你想通过空间讲述什么故事。",
      },
      {
        speaker: "mentor",
        name: mentorName,
        action: "递给你一张泛黄的电影胶片卡",
        tone: "focus",
        content: "回去看完这部电影，写一篇关于'空间与记忆'的随笔，随时发我邮箱。",
      },
      {
        speaker: "narration",
        content: "斑驳的光影在墙面摇曳，你第一次体会到，建筑原来是写给时间的情诗。",
      },
    ];
  }

  // 国际海归派导师初见剧情
  if (profile.mentorId === "global_scholar" || profile.mentorId === "overseas") {
    if (profile.name?.includes("常彤")) {
      return [
        {
          speaker: "narration",
          content: "常彤正用 iPad 比对城市纹理地图与一组新采集的人流热力数据，手边是一杯黑咖啡。见你进来，她放下 iPad。",
        },
        {
          speaker: "player",
          name: "你",
          action: "轻声",
          content: "常老师，我来报到。",
        },
        {
          speaker: "mentor",
          name: "常彤",
          action: "语气冷静而清晰",
          tone: "neutral",
          content: "欢迎。先问你一个我常问自己的问题——你做的判断，是感受出来的，还是数据逼出来的？",
        },
        {
          speaker: "mentor",
          name: "常彤",
          action: "指着热力图",
          tone: "focus",
          content: "我做的方向，是把城市的\"感觉\"翻译成可以验证的数据。直觉很好，但如果没有数据支撑，直觉就只是运气。",
        },
        {
          speaker: "mentor",
          name: "常彤",
          action: "认真道",
          tone: "focus",
          content: "所以我希望我的学生，既要会看城市，也要会看数据。回去把 Python 和 GIS 的基础补上，我们下学期会做一组真实的城市研究。",
        },
        {
          speaker: "narration",
          content: "热力图上，红色的高密度区在城市地图上缓慢流动，像城市的脉搏。",
        },
      ];
    }

    if (profile.name?.includes("庄岩松")) {
      return [
        {
          speaker: "narration",
          content: "模型室里排着十几个 1:50 的参数化结构模型，庄岩松的屏幕上并行开着 Grasshopper 与 Karamba3D。你进去时，他正盯着一段实时演算。",
        },
        {
          speaker: "player",
          name: "你",
          action: "好奇地张望",
          content: "庄老师，我来报到。",
        },
        {
          speaker: "mentor",
          name: "庄岩松",
          action: "头也不回，兴致很高",
          tone: "focus",
          content: "看到没有——这个曲面，是 2000 根杆件自己\"算\"出来的。数字工具不是让你偷懒，是让你去做手工做不出的空间。",
        },
        {
          speaker: "mentor",
          name: "庄岩松",
          action: "转过身，语气热切",
          tone: "warm",
          content: "我下周带一组学生去巴塞罗那做学术考察，看高迪、看 Mies。但记住——工具再酷，最终考验的还是你对空间有没有判断。",
        },
        {
          speaker: "mentor",
          name: "庄岩松",
          action: "认真道",
          tone: "focus",
          content: "回去先把 Grasshopper 基础跑起来，下个月我要看到你的第一个\"会呼吸\"的模型。",
        },
        {
          speaker: "narration",
          content: "屏幕上的参数在实时跳动，像一片正在生长的森林。",
        },
      ];
    }

    if (profile.name?.includes("王永和")) {
      return [
        {
          speaker: "narration",
          content: "建筑科研楼 1801 的落地窗极通透。王永和正端着双倍 Espresso 看着窗外长江大桥的轮廓，白板上写满了海外名校联合 Studio 的日程。",
        },
        {
          speaker: "player",
          name: "你",
          action: "礼貌敲门",
          content: "王老师好，我是您新带的研究生，来向您报到。",
        },
        {
          speaker: "mentor",
          name: "王永和",
          action: "转身，带着温和而敏锐的微笑",
          tone: "warm",
          content: "Hi，请坐。别太拘谨——在进入课题前，我先问你一个 simple question：你觉得建筑学是一种技术，还是一种“世界语”（Universal Language）？",
        },
        {
          speaker: "mentor",
          name: "王永和",
          action: "语气睿智而开阔",
          tone: "sweet",
          content: "可以说，不同地域的建筑是不同的方言，但空间能唤起的情感和身体体验是相通的。我不希望你被某种狭隘的传统符号框住，也不要盲目崇拜参数化炫技。",
        },
        {
          speaker: "mentor",
          name: "王永和",
          action: "递给你一份全英文前沿书单",
          tone: "focus",
          content: "坦率地说，读研三年，我要你建立的是一套能与全球顶级学者无障碍对话的批判性思维。先把 Tschumi 的文本读透，下周 Studio 见。",
        },
        {
          speaker: "narration",
          content: "午后阳光穿过通透的落地玻璃，你第一次感受到，建筑的世界原来可以如此辽阔。",
        },
      ];
    }

    // 董永辉（默认）
    return [
      {
        speaker: "narration",
        content: `建筑科研楼 1805 室弥漫着大尺度项目的宏大气场。${mentorName}正核对一份跨国交通综合体的客流仿真报告，见你敲门，示意你进来。`,
      },
      {
        speaker: "player",
        name: "你",
        action: "恭敬开口",
        content: "董老师好，新学生前来报到！",
      },
      {
        speaker: "mentor",
        name: mentorName,
        action: "语气沉稳而宏观",
        tone: "neutral",
        content: "坐。你见过每天吞吐十万人的航站楼吧？你说，这种超级大空间的“建筑灵魂”，是藏在大跨度屋顶下，还是藏在人流与行李的精确重组里？",
      },
      {
        speaker: "mentor",
        name: mentorName,
        action: "起手指着墙上的巨幅人流矢量图",
        tone: "warm",
        content: "传统建筑学总爱沉溺在小品式的自我感动里。但真正的现代文明，是由机场、高铁站这些巨型机器驱动的。我们要研究的是复杂系统的秩序。",
      },
      {
        speaker: "mentor",
        name: mentorName,
        action: "语重心长",
        tone: "focus",
        content: "跟着我做研究，格局要放大。把这篇流动空间拓扑学论文读完，下周我们讨论课题切入点。",
      },
      {
        speaker: "narration",
        content: "墙上航站楼复杂的流线如同城市的血脉，让你对“空间尺度”有了颠覆性的认知。",
      },
    ];
  }

  // 产学研实务派导师初见剧情
  if (profile.mentorId === "practice") {
    if (profile.name?.includes("钟建国")) {
      return [
        {
          speaker: "narration",
          content: "院里 18 楼，两张超大画图桌铺满了城市文化中心的总平面图，旁边堆着几十个材料样板。钟建国正握着红铅笔，跟电话那头的甲方\"温柔地\"撕方案。",
        },
        {
          speaker: "mentor",
          name: "钟建国",
          action: "挂断电话，抬头",
          tone: "neutral",
          content: "来了？会画图吗——我问的不是 CAD，是会用红铅笔圈问题吗？",
        },
        {
          speaker: "player",
          name: "你",
          action: "点头",
          content: "会一点。",
        },
        {
          speaker: "mentor",
          name: "钟建国",
          action: "把一支红铅笔拍到你面前",
          tone: "focus",
          content: "会一点可不够。图纸上的每一根线，落到工地上都是真金白银和工人的汗。你画错一笔，别人要白干一天。",
        },
        {
          speaker: "mentor",
          name: "钟建国",
          action: "语气转热络",
          tone: "warm",
          content: "不过别怕，实务这行，都是跑工地跑出来的。下次我去项目现场盯节点，你跟着——让你看看甲方是怎么把方案一点点\"磨\"成现实的。",
        },
        {
          speaker: "narration",
          content: "那支红铅笔躺在一堆材料样板之间，像一句无声的邀请。",
        },
      ];
    }

    if (profile.name?.includes("程恺")) {
      return [
        {
          speaker: "narration",
          content: "产学研 1806 室如同一个小型的材料工坊。程恺正用手电筒细致观察一块自密实清水混凝土样块表面的气孔与木纹肌理。",
        },
        {
          speaker: "player",
          name: "你",
          action: "恭敬开口",
          content: "程老师好，新学生前来报到。",
        },
        {
          speaker: "mentor",
          name: "程恺",
          action: "抬头温和一笑，示意你摸摸样块",
          tone: "warm",
          content: "来了呀。伸手摸摸这块混凝土——感受到了吗？这种粗糙却有秩序的触感，是电脑屏幕渲染永远给不了的。",
        },
        {
          speaker: "mentor",
          name: "程恺",
          action: "语气坚定而充满匠心",
          tone: "focus",
          content: "做工程实务不是让你向商业妥协，而是教你如何在最严苛的造价和工期约束下，把高品质的空间和材质硬生生抠出来。",
        },
        {
          speaker: "mentor",
          name: "程恺",
          action: "递给你安全帽",
          tone: "sweet",
          content: "这顶帽子你收好。下周美术馆主体结构封顶，跟着我一起上脚手架验筋去！",
        },
        {
          speaker: "narration",
          content: "手心的混凝土试块冰凉而厚重，你对接下来的实战工地生涯充满了热血与期待。",
        },
      ];
    }

    if (profile.name?.includes("何建民")) {
      return [
        {
          speaker: "narration",
          content: "1803 室桌上堆满了各专业的协同蓝图。何建民正戴着黑框眼镜对照国家消防规范逐条核算超高层综合体的避难层指标。",
        },
        {
          speaker: "player",
          name: "你",
          action: "礼貌问候",
          content: "何老师好，我是新进组的研究生。",
        },
        {
          speaker: "mentor",
          name: "何建民",
          action: "头也不抬，手中红笔飞快圈画",
          tone: "neutral",
          content: "坐。我先问你：很多学生自诩‘大设计师’，但连最基本的剪刀梯疏散宽度和喷淋排烟管井都没概念。你觉得没有技术支撑的方案是什么？",
        },
        {
          speaker: "mentor",
          name: "何建民",
          action: "抬起头，眼神严谨而深刻",
          tone: "focus",
          content: "所有的诗意和流线，都必须长在严丝合缝的技术骨架上。做实务，安全和规范是第一道红线，碰了就要坐牢。",
        },
        {
          speaker: "mentor",
          name: "何建民",
          action: "递给你一份商场平面图",
          tone: "focus",
          content: "拿去，找出这版方案里隐藏的 3 处消防与柱网硬伤，明天上午交给我。",
        },
        {
          speaker: "narration",
          content: "红笔批注触目惊心，你瞬间收敛了所有轻浮，真正理解了“工程人”的严谨底线。",
        },
      ];
    }

    // 柳岩松（默认）
    return [
      {
        speaker: "narration",
        content: `三联大屏幕上正高速渲染着一座高铁枢纽全专业的 BIM 协同模型。${mentorName}正与结构、暖通工程师多方联调接口。`,
      },
      {
        speaker: "player",
        name: "你",
        action: "敲门报到",
        content: "柳老师好，新研究生前来报到！",
      },
      {
        speaker: "mentor",
        name: mentorName,
        action: "摘下耳机，眼神敏锐干练",
        tone: "warm",
        content: "欢迎！如今的大型公建早就不是一个人拿铅笔就能画完的时代了。现代大建筑师的核心壁垒是系统协同、数据逻辑与接口管控。",
      },
      {
        speaker: "mentor",
        name: mentorName,
        action: "旋转三维节点模型",
        tone: "focus",
        content: "我们的模型精确到每一根螺栓和角钢。只要一处管线打架，现场就要停工返工。",
      },
      {
        speaker: "mentor",
        name: mentorName,
        action: "给你开通项目服务器权限",
        tone: "sweet",
        content: "账号密码发你微信了。下周直接进项目组协助做管综消碰撞，用实战把你的数字化能力拉满！",
      },
      {
        speaker: "narration",
        content: "屏幕上密如蛛网的三维管线在有序运转，你踏入了现代建筑工程最前沿的数字协同世界。",
      },
    ];
  }

  // 其他导师流派初见占位回退
  return [
    {
      speaker: "narration",
      content: `你敲响了${officeLoc}的门，${mentorName}放下手头的工作，抬头微笑着看向你。`,
    },
    {
      speaker: "player",
      name: "你",
      action: "微笑着开口",
      content: "老师好，我是您这届新带的研究生，来跟您报到！",
    },
    {
      speaker: "mentor",
      name: mentorName,
      action: "温和颔首",
      tone: "warm",
      content: "欢迎加入我们课题组。读研三年是探索自我边界的关键时期，希望你珍惜这段时光，踏实做人，扎实做学问。",
    },
    {
      speaker: "narration",
      content: "阳光洒在办公桌上，开启了你充满无限可能的学术生涯新篇章。",
    },
  ];
}

/** 各导师类型在办公室的概率（0-1）。放养型导师经常不在办公室。 */
export const MENTOR_PRESENCE_RATE: Record<string, number> = {
  academic: 0.9,
  practice: 0.85,
  overseas: 0.8,
  global_scholar: 0.8,
  hands_off: 0.3,
};

/** 获取某导师在办公室的概率（未收录类型回退默认值） */
export function getMentorPresenceRate(mentorId: string): number {
  return MENTOR_PRESENCE_RATE[mentorId] ?? 0.85;
}

/** 判定本次拜访导师是否在办公室 */
export function rollMentorPresence(mentorId: string): boolean {
  return Math.random() < getMentorPresenceRate(mentorId);
}

/** 「导师不在办公室」的扑空剧情场景 */
export interface MentorAwayScene {
  title: string;
  detail: string;
  note: string;
}

/** 按导师类型返回对应的扑空文案 */
export function getMentorAwayScene(mentor: MentorOfficeProfile): MentorAwayScene {
  const location = mentor.officeLocation;
  switch (mentor.mentorId) {
    case "hands_off":
      return {
        title: "导师不在办公室",
        detail: `你敲了敲 ${location} 的门，半天无人应答。门缝里塞着一张便签：「外出调研，下周回，有事留言。」`,
        note: "放养型导师常年神龙见首不见尾，扑空是常态。你索性在走廊里透了透气，紧绷的神经反而松弛了下来。",
      };
    case "academic":
      return {
        title: "导师不在办公室",
        detail: `你来到 ${location}，门半掩着。隔壁师姐探出头说，导师去图书馆核对一批地方志了，估计晚些才回。`,
        note: "桌上摊着未合上的古籍，你知道他很快会回来，只是这次刚好错过。",
      };
    case "practice":
      return {
        title: "导师不在办公室",
        detail: `你来到 ${location}，电话那头传来工地的轰鸣声——导师正在项目现场盯着节点施工。`,
        note: "实务型导师常年跑工地、见甲方，办公室更像是中转站。",
      };
    case "overseas":
    case "global_scholar":
    default:
      return {
        title: "导师不在办公室",
        detail: `你来到 ${location}，门上贴着便条：「出国学术交流，两周后返。」`,
        note: "国际型导师的日程总是排到了海外，扑空也是难免。",
      };
  }
}

/** 生成当前会面选项池 */
export function generateOfficeDialogueOptions(
  mentor: MentorOfficeProfile,
  favorability: number,
  money: number,
  hasEnoughEnergy: boolean
): OfficeDialogueOption[] {
  const options: OfficeDialogueOption[] = [];

  // 1. 学术请教 / 课题答辩
  if (favorability < 40) {
    options.push({
      id: "academic_consult_basic",
      label: "汇报课题进度与文献综述",
      emoji: "📖",
      category: "academic",
      description: "拿出整理的一手建筑史料与测绘草图向导师汇报，寻求课题指导。",
      costText: "消耗行动 · 需静心推敲",
      statDeltas: { arch: 8, logic: 5, stress: 5, mentorFavorability: 2 },
      mentorReply: `「这份综述把核心脉络理出来了，比上周有长进。记住，文献考据不能只看二手转述，宋代官式形制必须核对一手地方志。回去把这几处注释补齐。」`,
      replyTone: "neutral",
      resultNarrative: `你在 ${mentor.name} 面前详细展开了研究草图。导师虽然言语克制，但随手为你指出了两篇极其关键的罕见文献，建筑底蕴与逻辑思维显著提升。`,
    });
  } else {
    options.push({
      id: "academic_consult_deep",
      label: "深入探讨论文核心理论难点",
      emoji: "🔍",
      category: "academic",
      description: "向导师请教空间形制流变与社会权力的深层耦合关系，进行深度答辩。",
      costText: "消耗行动 · 深度学术研讨",
      statDeltas: { arch: 12, logic: 8, stress: -3, mentorFavorability: 4 },
      mentorReply: `「你这个问题抓得很准。当年我做这个专题时，也在文献断代上卡了半年。你看这个柱础雕饰与斗栱出跳的比例，其实反映的是明初官营营造厂向民间匠作的过渡……」`,
      replyTone: "warm",
      resultNarrative: `${mentor.name} 摘下眼镜，与你促膝长谈了近一个小时。他不仅肯定了你的学术洞察力，还分享了许多未公开的独门田野考据心得。`,
    });
  }

  // 2. 日常闲聊 / 导师求学心声
  options.push({
    id: "chat_lore",
    label: "请教导师当年的治学求学历程",
    emoji: "☕",
    category: "chat",
    description: "倾听导师在学术探索路上的真实故事与行业感悟，拉近师生心理距离。",
    costText: "增进师生情谊",
    statDeltas: { stress: -8, mentorFavorability: 5 },
    mentorReply: `「当年我们在浙西大山里测绘古祠堂，连像样的测距仪都没有，全靠皮尺和爬梁。晚上就睡在老乡家的门板上……现在科研条件好了，但那股钻研的劲头千万不能丢。」`,
    replyTone: favorability >= 60 ? "vulnerable" : "warm",
    resultNarrative: `导师破天荒地和你聊起了年轻时的岁月。看着桌上泛黄的旧测绘相册，你深刻感受到了几代建筑史学者的薪火相传，心理压力得到了极大纾解。`,
  });

  // 3. 送礼关怀与心意（无论余额多少都展示，但若钱不够则标注 disabled）
  const canAffordGift = money >= 1;
  const giftRejection = buildGiftRejection(mentor.mentorId, mentor.name);
  const giftAcceptance = buildGiftAcceptance(mentor.mentorId, mentor.name);
  options.push({
    id: "gift_tea",
    label: "敬赠一盒家乡清茶与润喉伴手礼",
    emoji: "🍵",
    category: "gift",
    description: "感谢老师平时的悉心指导，送上一份约 ¥500 的得体、温暖心意。",
    costText: canAffordGift ? "花费约 ¥500" : "需 ¥500（当前余额不足）",
    disabled: !canAffordGift,
    disabledReason: "当前余额不足 ¥500，无法赠送礼品",
    statDeltas: { money: -1, mentorFavorability: 6, stress: -5 },
    mentorReply: `「你这孩子，心意我领了。平时做科研用脑多，自己也多注意身体。下次组会别空着肚子来，我办公室常备着点心。」`,
    replyTone: "warm",
    resultNarrative: `导师收下了清茶，眼神中流露出一丝欣慰的笑意。他特意嘱咐你在高强度的改图与文献攻坚中也要保重身体。`,
    rejection: giftRejection,
    acceptanceDialogue: giftAcceptance,
  });

  // 3.5 送钱入口（点击后弹金额输入框；本学期超过 2 次则禁用）
  const semesterForCash =
    (typeof window !== "undefined" && (window as any).__archGameSemester) || 1;
  const cashRecord = readCashGiftRecord(semesterForCash);
  const cashRemaining = CASH_GIFT_PER_SEMESTER_LIMIT - cashRecord.count;
  const cashDisabled = cashRemaining <= 0;
  const balanceYuan = moneyToBalance(money);
  options.push({
    id: "gift_cash_entry",
    label: "敬献一份现金以表谢意",
    emoji: "🧧",
    category: "gift",
    description:
      "直接奉上现金，金额自定（¥200–¥10,000；逾矩金额会触发师德红线剧情）。⚠️ 现金路径敏感度高：收下加成可观，拒收惩罚也重。每学期最多 2 次。",
    costText: cashDisabled
      ? `本学期已达上限（${CASH_GIFT_PER_SEMESTER_LIMIT} 次）`
      : `本学期剩余 ${cashRemaining} 次 · 当前余额 ${formatYuan(balanceYuan)}`,
    disabled: cashDisabled,
    disabledReason: cashDisabled ? "本学期送钱次数已用完，下学期再来" : undefined,
    statDeltas: undefined,
    mentorReply: "",
    replyTone: "neutral",
    resultNarrative: "",
  });

  // 4. 高好感度专属：打探资源与推荐信
  if (favorability >= 50) {
    options.push({
      id: "opportunity_inquire",
      label: "打探国家重点课题与行业推荐机会",
      emoji: "🌟",
      category: "opportunity",
      description: "向导师表达参与更高级别科研项目或争取大院内推推荐信的意愿。",
      requireFavor: 50,
      costText: "好感度 ≥ 50 专属",
      statDeltas: { arch: 10, mentorFavorability: 3, stress: -4 },
      mentorReply: `「下半年院里和国家文物局合作的重点修缮项目，我正打算带一两个得力学生进组。你近期的踏实表现我心里有数，把大纲准备好，到时候你做核心成员。」`,
      replyTone: "vulnerable",
      resultNarrative: `${mentor.name} 郑重地向你透露了重磅课题机会，并答应在关键时刻为你出具极具分量的学术推荐信！`,
    });
  }

  // 5. 禁忌心动 · 导师攻略分支（荒谬刺激的师生羁绊，精简 5 阶）
  options.push({
    id: "mentor_romance_coffee_art",
    label: "送拉花咖啡",
    emoji: "☕",
    category: "romance",
    requireFavor: 0,
    description: "送上特调咖啡，暗中试探古板导师的反应。",
    costText: "好感 ≥ 0 已解锁",
    statDeltas: { stress: -5, mentorFavorability: 3 },
    mentorReply: "「……奶沫张力不合流体力学规范。不过，下不为例。」",
    replyTone: "warm",
    resultNarrative: `你把拉花的咖啡递到桌前，${mentor.name} 扶了扶眼镜轻咳一声，嘴角掠过一丝不易察觉的弧度。`,
    acceptanceDialogue: [
      {
        speaker: "player",
        name: "你",
        content: "老师，给您泡了一杯手冲，顺便拉了个花。",
      },
      {
        speaker: "narration",
        content: `${mentor.name} 看着杯子里清晰的心形拉花，动作微微一顿。`,
      },
      {
        speaker: "mentor",
        name: mentor.name,
        action: "有些不自然地推了推镜框，端起咖啡抿了一口",
        content: "……奶沫张力不合流体力学规范。不过，下不为例。",
        tone: "warm",
      },
      {
        speaker: "narration",
        content: "导师放下杯子，眼神中闪过一丝难得的温和笑意。",
      },
    ],
  });

  options.push({
    id: "mentor_romance_touch_pen",
    label: "牵手",
    emoji: "🤝",
    category: "romance",
    requireFavor: 45,
    description: "在满屏标红的文档前，手背被他温热的大手覆住。",
    costText: favorability >= 45 ? "好感 ≥ 45 已解锁" : "好感需 ≥ 45",
    disabled: favorability < 45,
    disabledReason: "好感度需 ≥ 45",
    statDeltas: { stress: -8, logic: 6, mentorFavorability: 6 },
    mentorReply: "「行距调 1.5 倍，手别抖……看着屏幕，别看我。」",
    replyTone: "vulnerable",
    resultNarrative: `${mentor.name} 握着鼠标的手覆在你手背上，呼吸拂过发丝，严谨古板的博导耳尖微红。`,
    acceptanceDialogue: [
      {
        speaker: "player",
        name: "你",
        content: "老师，这里的空间形制分析总觉得层级不够。",
      },
      {
        speaker: "narration",
        content: `${mentor.name} 俯下身，温热的大手自然地覆在你的手背上移动鼠标。`,
      },
      {
        speaker: "mentor",
        name: mentor.name,
        action: "呼吸近在咫尺，微凉的镜框碰到你的发梢",
        content: "行距调 1.5 倍，手别抖……看着屏幕，别看我。",
        tone: "vulnerable",
      },
      {
        speaker: "narration",
        content: "两人的肩膀轻轻靠在一起，满屏学术文字中只剩彼此清晰的心跳声。",
      },
    ],
  });

  options.push({
    id: "mentor_romance_office_hug",
    label: "拥抱",
    emoji: "🫂",
    category: "romance",
    requireFavor: 65,
    description: "被开题虐哭，他拉下百叶窗反锁门将你揽入怀中。",
    costText: favorability >= 65 ? "好感 ≥ 65 已解锁" : "好感需 ≥ 65",
    disabled: favorability < 65,
    disabledReason: "好感度需 ≥ 65",
    statDeltas: { stress: -15, logic: 8, mentorFavorability: 8 },
    mentorReply: "「哭什么。有我给你撑腰，全院没人敢卡你。」",
    replyTone: "vulnerable",
    resultNarrative: `${mentor.name} 反锁办公室门将你拥入怀中，带着沉香书卷气的毛呢西装成了全院最安心的依靠。`,
    acceptanceDialogue: [
      {
        speaker: "player",
        name: "你",
        content: "老师……盲审意见太苛刻了，我真的好难受……",
      },
      {
        speaker: "narration",
        content: `${mentor.name} 叹了口气，起身拉下百叶窗反锁门，走到你面前张开双臂。`
      },
      {
        speaker: "mentor",
        name: mentor.name,
        action: "将你揽入怀中，宽厚的大手轻拍你的后背",
        content: "哭什么。有我给你撑腰，全院没人敢卡你。",
        tone: "vulnerable",
      },
      {
        speaker: "narration",
        content: "你紧紧靠在他坚实的胸膛前，听着他稳健的心跳，所有的委屈彻底消散。",
      },
    ],
  });

  options.push({
    id: "mentor_romance_corridor_kiss",
    label: "接吻",
    emoji: "💋",
    category: "romance",
    requireFavor: 80,
    description: "学术会议深夜，摘下眼镜的他将你圈在墙角。",
    costText: favorability >= 80 ? "好感 ≥ 80 已解锁" : "好感需 ≥ 80",
    disabled: favorability < 80,
    disabledReason: "好感度需 ≥ 80",
    statDeltas: { stress: -20, arch: 10, mentorFavorability: 12 },
    mentorReply: "「你不仅是得意门生，更是我唯一的非理性解。」",
    replyTone: "vulnerable",
    resultNarrative: `深夜走廊微光下，摘下眼镜的 ${mentor.name} 吻上你的唇，平日清冷的博导眼神炽热而深情。`,
    acceptanceDialogue: [
      {
        speaker: "player",
        name: "你",
        content: "老师，刚才晚宴的红酒好烈，您喝多了吗？",
      },
      {
        speaker: "narration",
        content: `走廊昏暗处，${mentor.name} 缓缓摘下眼镜，单手将你圈在墙角。`,
      },
      {
        speaker: "mentor",
        name: mentor.name,
        action: "目光深邃，修长的手指轻托起你的下巴",
        content: "你不仅是得意门生，更是我唯一的非理性解。",
        tone: "vulnerable",
      },
      {
        speaker: "narration",
        content: "话音未落，他低头深情吻上你的唇，呼吸缠绵而滚烫。",
      },
    ],
  });

  options.push({
    id: "mentor_romance_defense_proposal",
    label: "求婚",
    emoji: "💍",
    category: "romance",
    requireFavor: 95,
    description: "当着全院评委的面，他走下主席台为你戴上戒指。",
    costText: favorability >= 95 ? "好感 ≥ 95 已解锁" : "好感需 ≥ 95",
    disabled: favorability < 95,
    disabledReason: "好感度需 ≥ 95",
    statDeltas: { stress: -30, arch: 15, mentorFavorability: 20 },
    mentorReply: "「我的未来人生蓝图，你是唯一的终身架构师。」",
    replyTone: "vulnerable",
    resultNarrative: `全优答辩后，${mentor.name} 当众走下评委席紧握你的双手为你戴上银戒，许下一生相伴的承诺！`,
    acceptanceDialogue: [
      {
        speaker: "mentor",
        name: mentor.name,
        action: "站在主席台前，当着系主任和所有评委的面注视着你",
        content: "恭喜全票优秀答辩。这篇论文无可挑剔。",
        tone: "vulnerable",
      },
      {
        speaker: "narration",
        content: `${mentor.name} 走下台，当众牵起你的手，为你戴上一枚定制银戒。`,
      },
      {
        speaker: "mentor",
        name: mentor.name,
        action: "十指紧扣，眼底满是毫不遮掩的偏爱",
        content: "我的未来人生蓝图，你是唯一的终身架构师。",
        tone: "vulnerable",
      },
      {
        speaker: "narration",
        content: "在全场的惊呼与掌声中，他俯身深吻你的额头，定下一生的誓约。",
      },
    ],
  });

  return options;
}

// ================================================================
// 立绘点击互动台词池（点击导师立绘时的即兴回应）
// normal：普通师生关系；intimate：好感 ≥ 80（禁忌心动深入阶段）
// ================================================================

export const MENTOR_CLICK_LINES: Record<string, { normal: string[]; intimate: string[] }> = {
  academic: {
    normal: [
      "手放好。图纸不会因为你碰它就变好。",
      "你的精力若用在文献上，早就开题了。",
      "……这次，我当作没看见。",
      "有问题用嘴问，不是用手。",
    ],
    intimate: [
      "办公室里……注意影响。",
      "咳。门没锁，你别得寸进尺。",
      "下周一组会你最好准备充分。……还有，咖啡谢谢。",
      "我带过十几个学生，就你最不让人省心。",
    ],
  },
  hands_off: {
    normal: [
      "嗯？有事儿说事儿。",
      "年轻人精力是真旺盛啊。",
      "别戳了，我这外套挺贵的。",
      "怎么，又缺经费了？",
    ],
    intimate: [
      "行了行了，被人看见我这老脸往哪搁。",
      "你啊……比我当年胆子大多了。",
      "今晚有空的话……算了，先把你的图改完。",
      "我这人散漫，但你的事，我记着呢。",
    ],
  },
  practice: {
    normal: [
      "干嘛？工地上可没人惯着你。",
      "手闲就去画两个大样。",
      "行了，回去干活。",
      "这点小动作，甲方桌上见多了。",
    ],
    intimate: [
      "胆子不小，敢在办公室动手动脚。",
      "……就这一次，下不为例。",
      "等这个项目结了，再说你的事。",
      "我做事讲效率——你要说什么，直接点。",
    ],
  },
  overseas: {
    normal: [
      "Excuse me？注意一下 office etiquette。",
      "在国外的 lab，这样是要发邮件道歉的。",
      "哈哈，你们年轻人真是有意思。",
      "Sorry，我的 personal space 可是有红线的。",
    ],
    intimate: [
      "Shh……隔壁办公室的 colleague 还在。",
      "你让我想起我在剑桥带过最调皮的学生……也是我现在的偏心。",
      "Well……coffee break 时间，可以陪你十分钟。",
      "Keep this between us，好吗？",
    ],
  },
};

/** 按导师类型与好感度取点击台词池（好感 ≥ 80 视为禁忌心动深入阶段） */
export function getMentorClickLines(mentorId: string, favorability: number): string[] {
  const type = normalizeMentorType(mentorId);
  const entry = MENTOR_CLICK_LINES[type] ?? MENTOR_CLICK_LINES.academic;
  return favorability >= 80 ? entry.intimate : entry.normal;
}
