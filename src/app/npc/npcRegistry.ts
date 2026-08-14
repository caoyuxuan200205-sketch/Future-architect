/**
 * NPC 注册表 + 好感度→语气映射
 * MVP 版本：只实现「你的导师」一个 NPC，其余字段已预留扩展位
 */
import type { NPC, ToneTier, NPCDialogueNode } from "./types";

/** 注册表：NPC id → NPC 定义 */
export const NPC_REGISTRY: Record<string, NPC> = {
  professor: {
    id: "professor",
    name: "你的导师",       // 运行时会用真实选中的导师名替换展示
    role: "你的导师",
    emoji: "🏛️",
    personality: "INTJ · 完美主义 · 话少但每一句都压重量",
    catchphrases: ["你自己再想想。", "不够。", "这个方向有意思——但你做不出来。"],
    awayText: "（对方暂时没有回复。研究生和导师之间，沉默有时也是一种回复。）",
    unlockedByDefault: true,
    unlockHint: "游戏开始时默认解锁",
    greeting: "你来了。这一届新生里，你的履历我看了——不算差，但也谈不上惊艳。接下来这三年你想做什么，现在就可以说。我不喜欢绕弯子。",
    stageLabels: [
      { min: 0, label: "冷淡" },
      { min: 20, label: "公事公办" },
      { min: 40, label: "客气" },
      { min: 60, label: "热络" },
      { min: 80, label: "推心置腹" },
    ],
    playerGreetings: [
      { text: "老师好，我有几个问题想请教您。" },
      { text: "老师，最近论文有点卡住，能不能聊聊？" },
      { text: "老师您今天有空吗？" },
      { min: 40, text: "老师，上次您说的话我想了很久。" },
      { min: 60, text: "老师，请您喝杯咖啡？" },
      { min: 80, text: "老师，我最近状态不太好，想找您聊聊。" },
    ],
  },
  lab_senior: {
    id: "lab_senior",
    name: "王晓楠",
    role: "实验室学姐",
    emoji: "🎓",
    personality: "热情、八卦、消息灵通，实验室里的「民间情报站」",
    catchphrases: [
      "我跟你说个八卦，你别往外传。",
      "我们组那个谁……算了不说了。",
      "导师今天心情好像不太好。",
    ],
    awayText: "（王晓楠正在忙实验，晚点再回你。）",
    unlockedByDefault: false,
    unlockHint: "研一上第 3 回合后解锁",
    greeting: "终于有人愿意听我说话了。你想知道啥？",
    stageLabels: [
      { min: 0, label: "陌生" },
      { min: 31, label: "熟悉" },
      { min: 51, label: "信任" },
      { min: 81, label: "密友" },
    ],
    playerGreetings: [
      { text: "学姐好，我是新来的师弟。" },
      { text: "学姐，实验室最近有什么要注意的吗？" },
      { text: "学姐，导师人怎么样啊？" },
      { min: 31, text: "学姐，中午一起吃饭吗？" },
      { min: 51, text: "学姐，我跟你说个事……" },
    ],
  },
  peer: {
    id: "peer",
    name: "张一帆",
    role: "同门",
    emoji: "📐",
    personality: "和你同届入学，表面随和，暗中较劲；会做 PPT、会卷，但也愿意借你笔记",
    catchphrases: [
      "你论文写到哪了？",
      "这组会我一个字都没听懂。",
      "要不我们一起熬？",
    ],
    awayText: "（张一帆正在改 PPT，已读不回。）",
    unlockedByDefault: false,
    unlockHint: "研一上第 2 回合后解锁",
    greeting: "你也在这组？那以后一起混吧。",
    stageLabels: [
      { min: 0, label: "认识" },
      { min: 31, label: "混熟" },
      { min: 51, label: "战友" },
      { min: 81, label: "挚友" },
    ],
    playerGreetings: [
      { text: "哥们，最近忙啥呢？" },
      { text: "一帆，组会准备得怎么样了？" },
      { text: "晚上一起吃个饭？" },
      { min: 31, text: "兄弟，借我抄抄你的笔记呗。" },
      { min: 51, text: "我跟你讲，最近真是卷不动了。" },
    ],
  },
  college_friend: {
    id: "college_friend",
    name: "顾小北",
    role: "本科好友",
    emoji: "🌳",
    personality: "不读研、已工作，是你和「社会」之间的对照组",
    catchphrases: [
      "你还在学校里卷啊？",
      "周末出来喝一杯。",
      "你开心吗？",
    ],
    awayText: "（顾小北在加班，回了一句「活着」。）",
    unlockedByDefault: false,
    unlockHint: "研一上第 5 回合后解锁",
    greeting: "听说你读研了。忙吗？出来吃饭。",
    stageLabels: [
      { min: 0, label: "陌生" },
      { min: 31, label: "常联系" },
      { min: 51, label: "懂你的人" },
      { min: 81, label: "死党" },
    ],
    playerGreetings: [
      { text: "小北，最近咋样？" },
      { text: "还在加班吗？" },
      { text: "周末有空出来坐坐？" },
      { min: 51, text: "最近有点迷茫，想跟你聊聊。" },
      { min: 81, text: "兄弟，我有件事只跟你说。" },
    ],
  },
};

/** 给导师 NPC 设置运行时显示名（在 GamePage 接入时调用） */
export function setProfessorDisplayName(name: string | null) {
  if (name && name.trim()) {
    NPC_REGISTRY.professor.name = name.trim();
  }
}

/**
 * 好感度 → 语气标签
 * 对应策划文档 §4.2
 */
export function toneFromFavorability(favorability: number): ToneTier {
  if (favorability < 20) return "cold";
  if (favorability < 40) return "neutral";
  if (favorability < 60) return "polite";
  if (favorability < 80) return "warm";
  return "vulnerable";
}

/** 语气 → UI 显示文案 */
export const TONE_LABEL: Record<ToneTier, string> = {
  cold: "冷淡",
  neutral: "公事公办",
  polite: "客气",
  warm: "热络",
  vulnerable: "推心置腹",
};

/** 语气 → 气泡色（深色背景下用） */
export const TONE_BUBBLE_COLOR: Record<ToneTier, string> = {
  cold: "rgba(120, 144, 176, 0.16)",       // 冷蓝
  neutral: "rgba(148, 163, 184, 0.16)",    // 灰
  polite: "rgba(201, 168, 76, 0.14)",      // 金黄
  warm: "rgba(245, 158, 11, 0.18)",        // 暖橙
  vulnerable: "rgba(236, 72, 153, 0.18)",  // 粉
};

/**
 * MVP 第一条里程碑消息：研一开学导师的初次喊话
 * 好感 20 → neutral
 */
export const PROFESSOR_OPENING_DIALOGUE: NPCDialogueNode = {
  tone: "neutral",
  npcMessage:
    "你来了。这一届新生里，你的履历我看了——不算差，但也谈不上惊艳。接下来这三年你想做什么，现在就可以说。我不喜欢绕弯子。",
  options: [
    {
      id: "opt_humble",
      text: "老师好，我还差得很远，想跟您多学点东西。",
      favorDelta: 2,
      npcResponse:
        "嗯。知道自己差，比不知道强。论文方向我这周会发你一份清单，你先读起来。",
      responseTone: "neutral",
    },
    {
      id: "opt_clear",
      text: "我有想法了，想做数字化方向的课题。",
      favorDelta: 1,
      npcResponse:
        "数字化？说具体的——别用这种大词糊弄我。你回去写一页纸的提案再来找我。",
      responseTone: "neutral",
    },
    {
      id: "opt_bold",
      text: "说实话，我还没想好。",
      favorDelta: -1,
      npcResponse:
        "没想好就回去想。我的办公室不是用来发呆的——下周同一时间，我要听到你的答案。",
      responseTone: "cold",
    },
  ],
};

/**
 * 玩家回复后的"日常消息"模板池（好感度区间命中）
 * MVP 版本：每个区间提供 2 条，避免重复
 */
export const PROFESSOR_FOLLOWUP_POOL: Record<ToneTier, string[]> = {
  cold: [
    "（你发过去的消息石沉大海。下一次组会，他甚至没看你一眼。）",
    "不需要。把你该做的做完再来说。",
  ],
  neutral: [
    "知道了。论文进度这周五之前发我。",
    "可以。但别只停在嘴上。",
  ],
  polite: [
    "嗯，你这个想法比上次靠谱多了。继续做。",
    "行，我下周一有空，到时候你来办公室一趟，我们细聊。",
  ],
  warm: [
    "其实你最近的状态我看在眼里。有什么卡住的地方，别一个人扛。",
    "你这小子，比我当年聪明。但聪明人最容易毁在懒上——别让我失望。",
  ],
  vulnerable: [
    "我跟你说个事——我年轻的时候也想过放弃。后来发现，放弃比坚持更难。",
    "其实你比我当年强。有些话我不轻易说，但你值得。",
  ],
};
