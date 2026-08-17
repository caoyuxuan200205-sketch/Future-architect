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
    avatar: "/assets/visuals/npcs/professor.jpg",
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
    name: "沈清淮",
    role: "专硕学长",
    emoji: "📖",
    avatar: "/characters/shen_qinghuai.jpg",
    personality: "温润儒雅 · 手绘速写大师 · 治愈白月光",
    catchphrases: [
      "近代建筑的每一道砖石，都藏着时间的记忆。",
      "别急，坐下来，我慢慢讲给你听。",
      "今天有空一起去图书馆自习吗？",
    ],
    awayText: "（沈清淮正在特藏室翻阅古籍，稍后回复。）",
    unlockedByDefault: false,
    unlockHint: "在校园地图中首次点击进入图书馆后解锁",
    greeting: "你来了。这本刚从特藏馆调出来的近代建筑手稿，正好和你一起看。",
    stageLabels: [
      { min: 0, label: "初识" },
      { min: 31, label: "并肩研读" },
      { min: 51, label: "心有灵犀" },
      { min: 81, label: "白月光" },
    ],
    playerGreetings: [
      { text: "学长好，我有几个关于近代文献断代的问题想请教。" },
      { text: "沈学长，今天在图书馆靠窗的位置自习吗？" },
      { text: "学长，能帮我看看这幅手绘立面的排线吗？" },
      { min: 31, text: "学长，我买了两杯白桃乌龙茶，给你带了一杯！" },
      { min: 51, text: "清淮，今晚闭馆后有空一起去散步吗？" },
      { min: 81, text: "清淮，你今天速写本上画的人……是我吗？" },
    ],
  },
  peer: {
    id: "peer",
    name: "张一帆",
    role: "专硕同门",
    emoji: "📐",
    avatar: "/characters/zhang_yifan.jpg",
    personality: "和你同届入学，阳光开朗的建模鬼才，院里公认的清爽校草",
    catchphrases: [
      "师兄，方案改累了就歇会儿！",
      "天塌下来有我陪你一起挨训。",
      "要不我们一起熬？",
    ],
    awayText: "（张一帆正在改 Rhino 模型，顺便在喝冰美式。）",
    unlockedByDefault: false,
    unlockHint: "研一上第 2 回合后解锁，或在建筑学院拜访",
    greeting: "师兄你来啦！方案改累了就歇会儿，我刚点了两杯生椰拿铁！",
    stageLabels: [
      { min: 0, label: "认识" },
      { min: 31, label: "混熟" },
      { min: 51, label: "战友" },
      { min: 81, label: "挚友" },
    ],
    playerGreetings: [
      { text: "一帆，最近忙啥呢？" },
      { text: "一帆，帮我看看这套轴网方案？" },
      { text: "晚上一起喝杯冰美式？" },
      { min: 31, text: "一帆，借我抄抄你的 Grasshopper 电池呗。" },
      { min: 51, text: "我跟你讲，老齐昨晚又在群里发癫了。" },
    ],
  },
  lu_yuchen: {
    id: "lu_yuchen",
    name: "陆予忱",
    role: "专硕同门 · 就业助理",
    emoji: "💼",
    avatar: "/characters/lu_yuchen.jpg",
    personality: "禁欲高智 · 骨相极品 Hot Nerd，秋招战神与行走的 Offer 收割机",
    catchphrases: [
      "投递简历不是概率游戏，而是参数化路径最优解。",
      "坐过来，我帮你把底层逻辑重构一遍。",
      "逻辑闭环了吗？",
    ],
    awayText: "（陆予忱正在审阅大厂行业研报，稍后回复。）",
    unlockedByDefault: false,
    unlockHint: "在校园地图中首次点击进入就业中心后解锁",
    greeting: "以后有大厂笔试、战略案例或者简历问题，随时来就业中心 204 找我。",
    stageLabels: [
      { min: 0, label: "初识" },
      { min: 31, label: "常驻指导" },
      { min: 51, label: "亲密战友" },
      { min: 81, label: "唯一解" },
    ],
    playerGreetings: [
      { text: "予忱，今天在就业中心值班吗？" },
      { text: "这道大厂业务真题我有点卡壳，想请教一下。" },
      { min: 31, text: "晚上有空一起去资料室喝杯手冲吗？" },
      { min: 51, text: "感觉最近迷茫的时候，只想找你聊聊。" },
      { min: 81, text: "予忱，你今天……能摘下眼镜让我看看吗？" },
    ],
  },
  bai_xu: {
    id: "bai_xu",
    name: "白栩",
    role: "专硕学弟",
    emoji: "🍰",
    avatar: "/characters/bai_xu.jpg",
    personality: "软萌粘人 · 情绪价值拉满的年下小狗学弟，建筑手作狂魔",
    catchphrases: [
      "学长！快尝尝我帮你买的草莓巴斯克！",
      "只要学长摸摸头，我再画 100 个大样都没问题！",
      "学长你在哪里，我就跟到哪里！",
    ],
    awayText: "（白栩正在用椴木板拼装模型，双手沾满了胶水。）",
    unlockedByDefault: false,
    unlockHint: "研二后首次在校园地图点击进入咖啡馆解锁",
    greeting: "学长好！我特意给你占了窗边阳光最好的位置，快尝尝刚出炉的热可可！",
    stageLabels: [
      { min: 0, label: "崇拜" },
      { min: 31, label: "粘人学弟" },
      { min: 51, label: "暖心依赖" },
      { min: 81, label: "专属小狗" },
    ],
    playerGreetings: [
      { text: "白栩，今天在咖啡馆做手工模型吗？" },
      { text: "今天早八的课累不累？学长请你吃甜点。" },
      { min: 31, text: "白栩，帮我看看这个快题插画配色？" },
      { min: 51, text: "下雨了，在咖啡馆等我，我拿伞去接你。" },
      { min: 81, text: "白栩……今天怎么这么乖，过来给学长抱抱。" },
    ],
  },
  jiang_huai: {
    id: "jiang_huai",
    name: "江淮",
    role: "健气舍友",
    emoji: "🏸",
    avatar: "/characters/jiang_huai.jpg",
    personality: "阳光直率 · 荷尔蒙爆棚的体育生舍友，羽毛球主力与护短担当",
    catchphrases: [
      "天天对着电脑画图不累吗？走，去球场出身汗！",
      "有我罩着你，天塌下来我替你顶着！",
      "回来啦？给你带了刚烤好的鸡腿。",
    ],
    awayText: "（江淮正在羽毛球馆打对抗赛，稍后回复。）",
    unlockedByDefault: false,
    unlockHint: "在校园地图中首次点击进入宿舍后解锁",
    greeting: "哟，大建筑师回来啦？看你脸色白得跟纸一样，快吃个鸡腿补充能量！",
    stageLabels: [
      { min: 0, label: "室友" },
      { min: 31, label: "铁杆球友" },
      { min: 51, label: "并肩搭子" },
      { min: 81, label: "专属球搭" },
    ],
    playerGreetings: [
      { text: "江淮，晚上有空一起去打羽毛球吗？" },
      { text: "江淮，这道力学弯矩图帮我看看呗？" },
      { min: 31, text: "楼下烤冷面走起？我请客！" },
      { min: 51, text: "今晚寝室好冷，借我靠一下暖暖身子。" },
      { min: 81, text: "江淮……今晚熄灯后，来我床上睡？" },
    ],
  },
  college_friend: {
    id: "college_friend",
    name: "顾小北",
    role: "本科好友",
    emoji: "🌳",
    avatar: "/assets/visuals/npcs/college_friend.jpg",
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
