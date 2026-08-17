/**
 * @file peerData.ts
 * @description 建筑学院同门 NPC（张一帆、陆予忱）档案、学业研讨与恋爱心动分支剧情
 */

export interface DialogueTurn {
  speaker: "player" | "peer" | "narration";
  name?: string;
  avatar?: string;
  content: string;
  tone?: "sweet" | "shy" | "excited" | "focus";
}

export interface PeerOption {
  id: string;
  category: "study" | "romance";
  label: string;
  tag: string;
  icon: string;
  description: string;
  unlockFavorability: number; // 好感度解锁阈值
  dialogueSequence: DialogueTurn[];
  statDeltas?: {
    arch?: number;
    logic?: number;
    expression?: number;
    network?: number;
    selfDoubt?: number;
    stress?: number;
    favorability?: number;
    commercial?: number;
    dataSense?: number;
    codeBasic?: number;
  };
}

export interface PeerProfile {
  id: string;
  name: string;
  title: string;
  grade: string;
  avatarImage: string;
  sceneImage: string;
  locationName: string;
  personalityTag: string;
  atmosphere: string;
  quote: string;
  currentMoods: string[];
  bio: {
    education: string;
    specialties: string[];
    interest: string;
    description: string;
  };
}

// ==========================================
// 1. 张一帆（阳光清爽 · 建模鬼才 · 甜系校草）
// ==========================================
export const ZHANG_YIFAN_PROFILE: PeerProfile = {
  id: "zhang_yifan",
  name: "张一帆",
  title: "建筑学院专硕研一 · 阳光校草",
  grade: "东南大学建筑学院 · 硕士一年级",
  avatarImage: "/characters/zhang_yifan.jpg",
  sceneImage: "/assets/visuals/maps/career-campus-map.png",
  locationName: "建筑学院 · 中大院 302 工位",
  personalityTag: "清爽阳光 · 建模鬼才 · 甜系同门",
  atmosphere: "工位上整齐立着三块高清显示器与带刻度的切割垫板，旁边常备两杯刚萃取的冰美式与润喉糖。阳光斜照在桌角，他一边敲着键盘一边哼着歌，笑起来格外温柔治愈。",
  quote: "“师兄，方案改累了就歇会儿！我刚点了两杯生椰拿铁，顺便帮你看看这版复杂的异形悬挑节点！”",
  currentMoods: [
    "正在戴着降噪耳机专心调整 Rhino 空间曲面",
    "刚撕开两根吸管，正准备递给你一杯冰美式",
    "在偷偷浏览互联网大厂最新一期的交互设计内推动态",
    "拿着红色草图笔和比例尺在硫酸纸上勾画轴网",
    "伸了个大大的懒腰，抬起头眉眼弯弯地朝你打招呼",
    "有些心不在焉地托着下巴，目光悄悄落在你身上",
  ],
  bio: {
    education: "东南大学建筑学院 建筑学专硕（研一在读）",
    specialties: ["Rhino & Grasshopper 参数化建模", "大厂交互体验设计", "深夜画图陪练", "情绪价值提供机"],
    interest: "城市探索、摄影修图、羽毛球、收集各类冷萃咖啡豆",
    description: "与你同组同级的专硕同门，院里公认的清爽阳光系校草。性格极度贴心温和，手握扎实的参数化手艺，同时对互联网大厂前沿产品与体验设计保持着敏锐嗅觉。在你通宵改图或自我怀疑时，他永远是你最坚实的后盾与深夜画图搭子。",
  },
};

export const PEER_STUDY_OPTIONS: PeerOption[] = [
  {
    id: "study_design",
    category: "study",
    label: "探讨方案",
    tag: "方案切磋",
    icon: "📐",
    description: "向一帆请教复杂异形立面参数化与传力路径，共同优化开题图纸。",
    unlockFavorability: 0,
    statDeltas: {
      arch: 8,
      logic: 6,
      selfDoubt: -6,
      favorability: 3,
    },
    dialogueSequence: [
      {
        speaker: "player",
        content: "一帆，帮我看看这套轴网。导师说中庭的力学传力路径不明确，我卡在这里两个小时了。",
      },
      {
        speaker: "peer",
        tone: "focus",
        content: "师兄你把椅子挪过来点！你看——如果把核心筒往右微调 500mm，整个采光中庭的动线瞬间通透了。我顺便用 GH 帮你跑个日照模拟！",
      },
      {
        speaker: "narration",
        content: "一帆拉过转椅紧紧挨在你身旁，握着鼠标的手熟练地在三维视图里拉拽曲线。两人的肩膀轻轻靠在一起，工位弥漫着他身上淡淡的白茶香气。",
      },
      {
        speaker: "peer",
        tone: "sweet",
        content: "搞定啦！渲染图也帮你跑好了。怎么样，我们俩的组合是不是天下第一？",
      },
    ],
  },
  {
    id: "study_complain_mentor",
    category: "study",
    label: "吐槽导师",
    tag: "解压狂欢",
    icon: "☕",
    description: "分享昨晚凌晨收到的夺命批注，喝冰咖啡互相解压吐槽。",
    unlockFavorability: 0,
    statDeltas: {
      stress: -10,
      selfDoubt: -6,
      network: 4,
      favorability: 4,
    },
    dialogueSequence: [
      {
        speaker: "player",
        content: "你昨晚睡了吗？老齐凌晨两点半在群里发了张‘甄嬛下毒’表情包，让我今早交三套沿街立面。",
      },
      {
        speaker: "peer",
        tone: "excited",
        content: "哈哈哈哈他也给你发了？！他昨晚还私聊催我交结构验算，我直接把手机反扣装死！来，快喝口冰美式消消火！",
      },
      {
        speaker: "narration",
        content: "一帆把一杯插好吸管的冷萃递到你手里，两人一边翻看聊天记录一边笑得前仰后合。连续熬夜的阴霾在他的爽朗笑声中彻底烟消云散。",
      },
      {
        speaker: "peer",
        tone: "sweet",
        content: "没事的师兄，天塌下来有我陪你一起挨训。有你在组里，熬夜画图都没那么难熬了。",
      },
    ],
  },
  {
    id: "study_interview_intel",
    category: "study",
    label: "大厂模面",
    tag: "大厂题库",
    icon: "💼",
    description: "拆解互联网大厂产品面试真题，互相模拟群面与结构化转译。",
    unlockFavorability: 0,
    statDeltas: {
      expression: 8,
      logic: 8,
      network: 6,
      favorability: 4,
    },
    dialogueSequence: [
      {
        speaker: "player",
        content: "一帆，我最近在看腾讯和小红书的产品岗，但总觉得建筑学的作品集不知道该怎么跟互联网黑话对齐。",
      },
      {
        speaker: "peer",
        tone: "excited",
        content: "问对人啦！我这周刚好整理了一份《建筑空间思维转译互联网产品模型白皮书》，我当面试官，咱们先来一轮 1v1 模拟！",
      },
      {
        speaker: "narration",
        content: "一帆神情专注地拿着平板向你提问，时不时用红笔圈出你回答中的亮点，并指导你如何用‘建筑动线’类比‘用户转化漏斗’。",
      },
      {
        speaker: "peer",
        tone: "sweet",
        content: "师兄你刚才那个‘空间体验即用户心智’的回答太绝了！这套真题原稿全发你网盘了，秋招我们一起上岸！",
      },
    ],
  },
  {
    id: "study_gh_script",
    category: "study",
    label: "调试电池",
    tag: "代码调优",
    icon: "💻",
    description: "为他的参数化幕墙脚本优化循环算法，共同攻克力学难点。",
    unlockFavorability: 0,
    statDeltas: {
      logic: 10,
      arch: 6,
      favorability: 5,
    },
    dialogueSequence: [
      {
        speaker: "player",
        content: "我看你的幕墙电池组又报红了，是不是法线方向求反了？我来帮你改写一段 Python 循环脚本。",
      },
      {
        speaker: "peer",
        tone: "shy",
        content: "哇真的吗！师兄你什么时候连 Python 代码都写得这么溜了……快坐过来教教我！",
      },
      {
        speaker: "narration",
        content: "你在键盘上快速敲入算法，一帆凑得很近，眼睛亮晶晶地注视着屏幕上实时生成的完美波浪曲面。",
      },
      {
        speaker: "peer",
        tone: "sweet",
        content: "跑通了！师兄你怎么什么都会啊……突然觉得有你在身边，心里特别有安全感。",
      },
    ],
  },
];

export const PEER_ROMANCE_OPTIONS: PeerOption[] = [
  {
    id: "romance_touch_hand",
    category: "romance",
    label: "牵手",
    tag: "初级心动",
    icon: "🤝",
    description: "在共同握住鼠标调整模型时，指尖不经意轻触，试探彼此的心意。",
    unlockFavorability: 45,
    statDeltas: {
      stress: -8,
      selfDoubt: -8,
      favorability: 6,
    },
    dialogueSequence: [
      {
        speaker: "narration",
        content: "你们在同一台电脑前调图。一帆伸手想要滑动滚轮，温热的指尖恰好覆在了你的手背上。",
      },
      {
        speaker: "peer",
        tone: "shy",
        content: "啊……不好意思师兄，我不是故意……",
      },
      {
        speaker: "player",
        content: "（你没有移开手，反而轻轻反握住了他的手指）",
      },
      {
        speaker: "narration",
        content: "一帆的呼吸微微一滞，耳朵瞬间泛起可爱的绯红。他没有抽回手，而是任由你握着，指尖悄悄收紧。",
      },
      {
        speaker: "peer",
        tone: "sweet",
        content: "师兄……你的手好暖和。那……就这么牵着改图，不准松开哦。",
      },
    ],
  },
  {
    id: "romance_hug",
    category: "romance",
    label: "拥抱",
    tag: "深情依偎",
    icon: "🫂",
    description: "在凌晨两点空无一人的教研室，给予彼此一个漫长而安心的充电拥抱。",
    unlockFavorability: 65,
    statDeltas: {
      stress: -15,
      selfDoubt: -10,
      favorability: 8,
    },
    dialogueSequence: [
      {
        speaker: "player",
        content: "终于把最后一版大图导出来了……感觉整个人快散架了。",
      },
      {
        speaker: "peer",
        tone: "sweet",
        content: "辛苦啦师兄。站起来伸展一下，借你一个‘无限续航能量抱抱’要不要？",
      },
      {
        speaker: "narration",
        content: "一帆张开双臂轻轻环抱住你的腰，将脸颊贴在你的肩窝上。他柔软的发丝蹭在你的颈侧，带着好闻的洗衣液清香。",
      },
      {
        speaker: "peer",
        tone: "sweet",
        content: "感受到了吗？我的心跳。不管未来做建筑还是去大厂，只要你需要，我随时都在这里给你靠着。",
      },
      {
        speaker: "player",
        content: "（你紧紧回抱住他，听着窗外的夜风，心里前所未有地安定）",
      },
    ],
  },
  {
    id: "romance_kiss_cheek",
    category: "romance",
    label: "亲脸颊",
    tag: "怦然心动",
    icon: "💋",
    description: "在光影斑驳的图纸阴影下，趁他不备轻吻在他泛红的脸颊上。",
    unlockFavorability: 80,
    statDeltas: {
      stress: -12,
      expression: 8,
      favorability: 10,
    },
    dialogueSequence: [
      {
        speaker: "peer",
        tone: "focus",
        content: "师兄你快看这个剖面透视！我加了一道漫反射天光，这里的阴影层次是不是特性感……唔？！",
      },
      {
        speaker: "narration",
        content: "在他转头的瞬间，你凑上前，轻轻吻在了他温热柔嫩的脸颊上。",
      },
      {
        speaker: "peer",
        tone: "shy",
        content: "师、师兄……！你怎么突然……教研室万一有人进来怎么办……",
      },
      {
        speaker: "player",
        content: "因为你刚才认真的样子，比所有的建筑渲染图都要好看。",
      },
      {
        speaker: "peer",
        tone: "sweet",
        content: "笨蛋……那、那下次要亲……至少提前告诉我一声，让我有个心理准备呀……（他羞涩地捂着脸偷笑）",
      },
    ],
  },
  {
    id: "romance_deep_kiss",
    category: "romance",
    label: "接吻",
    tag: "至死不渝",
    icon: "🫀",
    description: "在夜幕降临的工位深处，双手捧起少年的脸，交换炽热深情的吻。",
    unlockFavorability: 95,
    statDeltas: {
      stress: -20,
      selfDoubt: -15,
      favorability: 15,
    },
    dialogueSequence: [
      {
        speaker: "peer",
        tone: "sweet",
        content: "师兄，你知道吗？从开学第一天在导师门外见到你起，我就没想过只当你的普通同门。",
      },
      {
        speaker: "player",
        content: "一帆，我也是。往后所有的人生蓝图，我都想和你一起画。",
      },
      {
        speaker: "narration",
        content: "你抬手轻轻抚上少年的下颌，一帆顺从地闭上双眼，微微扬起头。两人的呼吸缠绕在一起，在静谧的教研室里交换了一个深情而漫长的吻。",
      },
      {
        speaker: "peer",
        tone: "sweet",
        content: "一言为定……不管是毕业设计还是大厂 Offer，我的未来里永远都有你的位置。",
      },
    ],
  },
];

// ==========================================
// 2. 陆予忱（禁欲高智 · 秋招战神 · 骨相 Hot Nerd）
// ==========================================
export const LU_YUCHEN_PROFILE: PeerProfile = {
  id: "lu_yuchen",
  name: "陆予忱",
  title: "建筑学院专硕研一 · 就业中心助理",
  grade: "东南大学建筑学院 · 硕士一年级",
  avatarImage: "/characters/lu_yuchen.jpg",
  sceneImage: "/assets/visuals/maps/career-campus-map.png",
  locationName: "就业中心 · 204 学术与职业指导室",
  personalityTag: "禁欲高智 · 秋招战神 · 骨相极品",
  atmosphere: "半框银丝眼镜后是一双深邃清冷的眼眸，黑色针织开衫内条纹衬衫微敞，露出精致锁骨与松垮的斜纹领带。手握 2B 铅笔在牛皮纸本上勾勒光影，身旁整齐码放着麦肯锡行业报告与大厂算法真题。",
  quote: "“投递简历不是概率游戏，而是参数化路径最优解。坐过来，我帮你把底层逻辑重构一遍。”",
  currentMoods: [
    "正在用铅笔在牛皮纸本上推演图书馆空间的光影截面",
    "修长手指推了推半框银丝眼镜，翻阅麦肯锡最新战略研报",
    "桌上放着刚手冲的深烘黑咖啡，正审阅一份大厂产品面试复盘",
    "衬衫袖口挽到手肘，露出线条冷冽的小臂与骨节分明的双手",
    "目光从高密度的行研数据移开，透过镜片安静地注视着你",
    "领带微松，靠在椅背上低头沉思，神情克制而带着一丝性张力",
  ],
  bio: {
    education: "东南大学建筑学院 建筑学专硕（研一）兼就业中心特聘助理",
    specialties: ["商业模式与结构化转译", "大厂求职降维打击", "空间光影手绘推演", "禁欲系智性陪伴"],
    interest: "战略咨询、光影素描、手冲单品咖啡、古典乐黑胶唱片",
    description: "与你同级的同门学霸，院里传说中‘手握顶流咨询与大厂提前批 Offer’的秋招战神。看似清冷禁欲、言辞犀利精准，实则极度护短且细致入微。当你陷入求职焦虑或方案死局时，他总能用最降维的逻辑为你理清迷局。",
  },
};

/** 陆予忱初次相遇剧情 */
export const LU_YUCHEN_FIRST_MEET: DialogueTurn[] = [
  {
    speaker: "player",
    content: "大厂战略岗和产品岗的投递要求密密麻麻，到底什么样的作品集能过第一轮筛查……",
  },
  {
    speaker: "narration",
    content: "你正对着就业中心的资料架发愁，身后忽然传来轻微的脚步声。一只修长、骨节分明且指间戴着极细银戒的手从你耳边越过，精准抽出了一本深蓝色的内部案例册递到你眼前。",
  },
  {
    speaker: "peer",
    tone: "focus",
    content: "看第三章的商业拆解模型就行。其他都是给非专业看的废话。",
  },
  {
    speaker: "narration",
    content: "你转过身，眼前是一位戴着半框银丝眼镜的清俊男生。黑色的针织开衫里，条纹衬衫微敞，松垮的领带垂在胸前。他手里拿着写满光影速写的牛皮纸草图本，眼神清冷而深邃。",
  },
  {
    speaker: "player",
    content: "你是……隔壁专硕组的陆予忱？听说你秋招提前批拿了顶级咨询和头部互联网的 Offer……",
  },
  {
    speaker: "peer",
    tone: "sweet",
    content: "嗯。以后来就业中心找资料或者改简历，可以直接来 204 工位找我。坐下来聊，效率更高。",
  },
];

export const LU_YUCHEN_STUDY_OPTIONS: PeerOption[] = [
  {
    id: "lu_study_case",
    category: "study",
    label: "拆解案例",
    tag: "高智破局",
    icon: "📊",
    description: "向予忱请教顶级咨询的 Case Study 框架，用结构化思维降维打击大厂业务。",
    unlockFavorability: 0,
    statDeltas: {
      commercial: 10,
      logic: 8,
      expression: 6,
      favorability: 4,
    },
    dialogueSequence: [
      {
        speaker: "player",
        content: "予忱，我看了几道大厂商业分析的真题，总觉得切入点太散，缺乏顶层架构。",
      },
      {
        speaker: "peer",
        tone: "focus",
        content: "把建筑的剖面思维拿出来——空间有竖向传力，商业也有价值链闭环。你看我画的这个 MECE 决策树。",
      },
      {
        speaker: "narration",
        content: "陆予忱用 2B 铅笔在草图纸上行云流水地勾勒出三层逻辑模型。他身体微微前倾，清洌的木质雪松香气萦绕在你们之间。",
      },
      {
        speaker: "peer",
        tone: "sweet",
        content: "你的悟性比我想象的还要高。这套分析框架你收好，面试遇到任何突发案例，照着这个骨架填肉就行。",
      },
    ],
  },
  {
    id: "lu_study_resume",
    category: "study",
    label: "修改简历",
    tag: "降维打击",
    icon: "🔍",
    description: "让他用挑剔精准的眼光批注你的作品集与简历，重构亮点与核心竞争力。",
    unlockFavorability: 0,
    statDeltas: {
      arch: 6,
      logic: 8,
      expression: 6,
      favorability: 4,
    },
    dialogueSequence: [
      {
        speaker: "player",
        content: "这是我刚改完的一版求职简历，帮我提提意见？不用留情面，尽管批。",
      },
      {
        speaker: "peer",
        tone: "focus",
        content: "好。那我直接说：第一页的空间叙事太冗长，HR 扫一眼只有 6 秒。把‘主导近代建筑空间复原’改成‘通过数字化建模降低 35% 空间冗余度’。",
      },
      {
        speaker: "narration",
        content: "他修长的手指握着红笔，在你的简历上利落地圈改，每一处批注都精准点中痛点。认真的侧脸在台灯下显得轮廓极深，禁欲感十足。",
      },
      {
        speaker: "peer",
        tone: "sweet",
        content: "改完之后质感完全不同了。有这份简历在，大厂第一轮简历筛查你不用担心了。",
      },
    ],
  },
  {
    id: "lu_study_mentor_flaw",
    category: "study",
    label: "剖析课题",
    tag: "逻辑对决",
    icon: "☕",
    description: "关上资料室门，与予忱一起用高维逻辑推演导师论文里自相矛盾的理论硬伤。",
    unlockFavorability: 0,
    statDeltas: {
      stress: -10,
      logic: 8,
      favorability: 4,
    },
    dialogueSequence: [
      {
        speaker: "player",
        content: "老齐非说近代建筑形制演变是纯形式主义驱动，但明明经济基础和租界地权才是核心诱因啊。",
      },
      {
        speaker: "peer",
        tone: "sweet",
        content: "（他轻笑了一声，摘下半框眼镜用绒布擦拭）他那是老一辈文人的唯美叙事。来，我电脑里有近代海关地契数据库，我们用数据打他的脸。",
      },
      {
        speaker: "narration",
        content: "两个人对着海量地籍数据逐一反推，找出了三处致命文献漏洞。看着向来清冷的学霸露出少年般的反叛笑意，你心里格外畅快。",
      },
      {
        speaker: "peer",
        tone: "sweet",
        content: "下次开题答辩，把这份数据图表甩出来。有我在后面给你兜底，不用怕他卡你。",
      },
    ],
  },
  {
    id: "lu_study_ai_architecture",
    category: "study",
    label: "探讨 AI",
    tag: "跨界前沿",
    icon: "💻",
    description: "结合 LLM 与空间生成算法，共同设计一款革命性空间交互产品架构。",
    unlockFavorability: 0,
    statDeltas: {
      dataSense: 8,
      codeBasic: 8,
      commercial: 6,
      favorability: 5,
    },
    dialogueSequence: [
      {
        speaker: "player",
        content: "如果把生成式 AI 接入空间动线推演，能不能直接生成符合规范的最优消防与采光布局？",
      },
      {
        speaker: "peer",
        tone: "focus",
        content: "完全可行。我上个月在 GitHub 上开源了一个 Spatial-Agent 库，底层就是基于多智能体博弈。",
      },
      {
        speaker: "narration",
        content: "陆予忱将笔记本电脑转向你，调出架构图和代码。他说话时声线低沉磁性，逻辑条理清晰得像一台精密的超级计算机。",
      },
      {
        speaker: "peer",
        tone: "sweet",
        content: "这个项目的二作署你的名字吧。未来如果你打算去大厂做 AI 空间算法，这会是你最重磅的背书。",
      },
    ],
  },
];

export const LU_YUCHEN_ROMANCE_OPTIONS: PeerOption[] = [
  {
    id: "lu_romance_touch_fingers",
    category: "romance",
    label: "牵手",
    tag: "微热试探",
    icon: "🤝",
    description: "在共同握住铅笔调整草图透视时，温热的指节交叠，试探冰冷镜片下的心意。",
    unlockFavorability: 45,
    statDeltas: {
      stress: -8,
      selfDoubt: -8,
      favorability: 6,
    },
    dialogueSequence: [
      {
        speaker: "narration",
        content: "你握着 2B 铅笔画透视线，总觉得消失点有点跑偏。陆予忱从身后倾身靠过来，微凉修长的大手直接覆在了你的手背上。",
      },
      {
        speaker: "peer",
        tone: "focus",
        content: "手腕放松。运笔要稳……像这样，顺着视平线压下去。",
      },
      {
        speaker: "player",
        content: "（他的胸膛贴得很近，呼吸掠过你的耳廓，带着雪松香气与克制的体温）",
      },
      {
        speaker: "narration",
        content: "画完线条，他的手却没有立刻移开，而是五指微微收紧，与你的指节紧密相扣。透过镜片，他的眼眸深邃得如同漩涡。",
      },
      {
        speaker: "peer",
        tone: "sweet",
        content: "学会了吗？……以后所有的草图，我都亲自手把手教你画。",
      },
    ],
  },
  {
    id: "lu_romance_hug_closet",
    category: "romance",
    label: "拥抱",
    tag: "暗流涌动",
    icon: "🫂",
    description: "在空无一人的资料柜深处，被他圈入怀中，感受禁欲外表下的剧烈心跳。",
    unlockFavorability: 65,
    statDeltas: {
      stress: -15,
      selfDoubt: -10,
      favorability: 8,
    },
    dialogueSequence: [
      {
        speaker: "player",
        content: "秋招提前批又挂了一家简历，感觉自己像是在黑暗里漫无目的地摸索……",
      },
      {
        speaker: "narration",
        content: "陆予忱没有说话，他反手轻轻合上资料室的门，转身一步将你圈在文件柜与他的胸膛之间。",
      },
      {
        speaker: "peer",
        tone: "sweet",
        content: "别自己一个人胡思乱想。过来。",
      },
      {
        speaker: "narration",
        content: "他抬臂将你紧紧拥入怀中，下巴抵在你的头顶。向来冷峻克制的学霸，此刻胸膛里的心跳却快得惊人。",
      },
      {
        speaker: "peer",
        tone: "sweet",
        content: "有我在，你绝不可能输。靠着我歇一会儿……就我们两个。",
      },
    ],
  },
  {
    id: "lu_romance_kiss_glasses",
    category: "romance",
    label: "接吻",
    tag: "防线崩塌",
    icon: "💋",
    description: "伸手轻轻摘下他的银丝眼镜，被他扣住手腕反客为主，吻上温软的唇。",
    unlockFavorability: 80,
    statDeltas: {
      stress: -12,
      expression: 8,
      favorability: 10,
    },
    dialogueSequence: [
      {
        speaker: "player",
        content: "（你看着他微敞的领口和认真的神情，忍不住伸手轻轻取下了他鼻梁上的半框眼镜）",
      },
      {
        speaker: "narration",
        content: "摘下眼镜的瞬间，陆予忱锐利清冷的五官彻底失去了遮挡，眼底翻涌着平日极力克制的情愫与侵略性。",
      },
      {
        speaker: "peer",
        tone: "shy",
        content: "……知不知道摘我眼镜是要付出代价的？",
      },
      {
        speaker: "narration",
        content: "话音未落，他忽然扣住你的手腕将你拉近，低头毫不犹豫地吻上了你的唇瓣。微凉的唇带着压抑许久的炽热，攻城略地。",
      },
      {
        speaker: "peer",
        tone: "sweet",
        content: "（良久，他松开唇，额头抵着你的额头低喘）……这是你主动招惹我的。",
      },
    ],
  },
  {
    id: "lu_romance_deep_promise",
    category: "romance",
    label: "求婚",
    tag: "终身绑定",
    icon: "🫀",
    description: "夜幕降临的工位前，领带散落，他在你耳边低语‘你是我唯一的确定解’。",
    unlockFavorability: 95,
    statDeltas: {
      stress: -20,
      selfDoubt: -15,
      favorability: 15,
    },
    dialogueSequence: [
      {
        speaker: "peer",
        tone: "sweet",
        content: "别人都在追求概率最大的通用解，但我用所有的数学模型推演过无数遍——",
      },
      {
        speaker: "player",
        content: "推演出了什么？",
      },
      {
        speaker: "narration",
        content: "陆予忱单手扯松领带，骨节分明的手掌扣进你的发丝，温柔而深情地将你带入一个绵长而窒息的深吻。窗外是繁华的城市天际线，室内只剩彼此炽热的呼吸。",
      },
      {
        speaker: "peer",
        tone: "sweet",
        content: "我人生的全局最优解，从始至终只有你一个。签下我吧，永不违约。",
      },
    ],
  },
];

// ==========================================
// 3. 白栩（软萌正太 · 情绪价值 · 粘人小狗学弟）
// ==========================================
export const BAI_XU_PROFILE: PeerProfile = {
  id: "bai_xu",
  name: "白栩",
  title: "建筑学院专硕研一学弟 · 治愈系年下",
  grade: "东南大学建筑学院 · 专硕研一（研二入学的新生）",
  avatarImage: "/characters/bai_xu.jpg",
  sceneImage: "/assets/visuals/maps/career-campus-map.png",
  locationName: "校园咖啡馆 · 阳光角落卡座",
  personalityTag: "软萌粘人 · 治愈小狗 · 手作狂魔",
  atmosphere: "蓬松柔软的微卷黑发，宽松温暖的米白色连帽卫衣。怀里紧紧抱着贴满萨伏伊与万神庙贴纸的笔记本电脑，帆布包上挂着摇晃的小狗毛绒玩偶。一见到你，眼眸就瞬间亮晶晶地弯成月牙，像只欢快摇尾巴的小奶狗。",
  quote: "“学长！你今天终于来咖啡馆自习啦！我特意给你占了窗边阳光最好的位置，快尝尝我帮你点的焦糖海盐热可可！”",
  currentMoods: [
    "正在小心翼翼地用美工刀拼接椴木手工建筑模型",
    "双手捧着冒热气的焦糖热可可，眼睛亮晶晶地四处张望等你",
    "在草图本上画满了可爱的小狗与现代主义建筑插画",
    "有些困倦地把脸埋在米白卫衣的袖口里打瞌睡",
    "一边嚼着草莓欧包，一边专心调整渲染图的暖色光影",
    "看到你走过来，立刻欢快地举起双手朝你用力招手",
  ],
  bio: {
    education: "东南大学建筑学院 建筑学专硕（研一学弟）",
    specialties: ["手工精细实体模型制作", "治愈系建筑插画与排版", "满分情绪价值与暖心陪伴", "全城甜品咖啡活地图"],
    interest: "手工制作、收集建筑贴纸、烘焙甜点、给流浪小狗拍照",
    description: "比你低一届的专硕新生学弟，开学初在评图展上看到你的作品集后就成了你的头号崇拜者。性格极度软萌热忱，说话软糯却对建筑手作抱有纯粹炽热的爱。在你疲惫焦虑时，他永远带着最甜的笑容和点心治愈你。",
  },
};

/** 白栩初次相遇剧情（研二之后第一次进入咖啡馆） */
export const BAI_XU_FIRST_MEET: DialogueTurn[] = [
  {
    speaker: "player",
    content: "研二刚开学，课题与开题初稿堆成山，趁着下午来咖啡馆换换脑子……",
  },
  {
    speaker: "narration",
    content: "咖啡馆里几乎坐满了自习的学生。你正端着咖啡寻找空位，一个穿着宽松米白色连帽卫衣、怀抱贴满建筑贴纸电脑的清秀少年突然从窗边小跑过来，有些腼腆又满含期待地看着你。",
  },
  {
    speaker: "peer",
    tone: "shy",
    content: "学、学长！你是近代建筑史组的师兄对不对？我在学院的评图展上反复看过你的快题和模型，特别特别崇拜你！",
  },
  {
    speaker: "narration",
    content: "少年的眼睛亮晶晶的，帆布包上的小狗玩偶随着他的动作轻轻晃动，脸颊上泛着一丝因为紧张而升起的可爱红晕。",
  },
  {
    speaker: "peer",
    tone: "sweet",
    content: "我这边刚好占了两个人的大卡座！学长如果不介意的话……可以坐我旁边吗？我刚刚帮你点了刚出炉的草莓巴斯克！",
  },
  {
    speaker: "player",
    content: "你是今年刚进组的新生学弟？谢谢你的蛋糕，刚好我也卡在方案上了。",
  },
  {
    speaker: "peer",
    tone: "excited",
    content: "嗯！我叫白栩！以后学长在咖啡馆改图累了，我随时帮你跑腿买甜品、借模型工具！请学长多多指教！",
  },
];

export const BAI_XU_STUDY_OPTIONS: PeerOption[] = [
  {
    id: "bai_study_design_guide",
    category: "study",
    label: "指导快题",
    tag: "年下崇拜",
    icon: "🎨",
    description: "辅导白栩梳理快题逻辑与方案立面，享受学弟满眼星星的崇拜目光。",
    unlockFavorability: 0,
    statDeltas: {
      expression: 8,
      arch: 6,
      selfDoubt: -8,
      favorability: 5,
    },
    dialogueSequence: [
      {
        speaker: "peer",
        tone: "shy",
        content: "学长……我这个社区图书馆的立面总觉得呆板，老师说没有韵律感，你能不能帮我指点一下？",
      },
      {
        speaker: "player",
        content: "把这里的实墙面打破，换成错落的竖向遮阳木格栅，光影斜切进来就像琴键一样。",
      },
      {
        speaker: "narration",
        content: "你握着红笔在草图纸上勾画，白栩双手托着下巴，近距离一眨不眨地凝视着你，眼底满是闪烁的崇拜与心动。",
      },
      {
        speaker: "peer",
        tone: "sweet",
        content: "哇……！学长你随手改两笔，整个立面一下子活过来了！学长你真的太厉害了，我什么时候才能像你一样棒啊！",
      },
    ],
  },
  {
    id: "bai_study_hand_model",
    category: "study",
    label: "拼装模型",
    tag: "解压手作",
    icon: "🍰",
    description: "在咖啡馆桌上用激光切板与白乳胶搭建精密实体模型，沉浸于手工的纯粹乐趣。",
    unlockFavorability: 0,
    statDeltas: {
      arch: 8,
      stress: -12,
      favorability: 4,
    },
    dialogueSequence: [
      {
        speaker: "peer",
        tone: "excited",
        content: "学长快看！我用 1:100 的椴木板切好了你那套方案的微缩构件，我们一起把它拼出来吧！",
      },
      {
        speaker: "narration",
        content: "白栩熟练地递给你镊子和专用胶水。两个人的手指偶尔在夹取微小梁柱时轻轻相碰，满桌都是木屑的清香与咖啡的醇厚。",
      },
      {
        speaker: "player",
        content: "你的手工精度也太高了，连柱头的凹槽都严丝合缝。",
      },
      {
        speaker: "peer",
        tone: "sweet",
        content: "因为是学长的方案呀！只要是学长的东西，我都想用全世界最好的手艺把它做成实物！",
      },
    ],
  },
  {
    id: "bai_study_complain_course",
    category: "study",
    label: "听他吐槽",
    tag: "欢乐倾听",
    icon: "☕",
    description: "听软萌学弟手舞足蹈地吐槽研一奇葩作业，在欢声笑语中满血复活。",
    unlockFavorability: 0,
    statDeltas: {
      stress: -15,
      selfDoubt: -6,
      favorability: 4,
    },
    dialogueSequence: [
      {
        speaker: "peer",
        tone: "shy",
        content: "学长你不知道！今天早八的构造老师让我们手画 50 个不同节点的防水大样，我画到手抽筋，感觉整个人都要融化了呜呜呜……",
      },
      {
        speaker: "narration",
        content: "白栩像只委屈的小猫一样把脑袋轻轻搁在桌上，两只眼睛眨巴眨巴地瞅着你，把手伸过来求安慰。",
      },
      {
        speaker: "player",
        content: "（你忍不住笑着揉了揉他蓬松微卷的头发）辛苦啦，学长给你剥一颗焦糖太妃糖。",
      },
      {
        speaker: "peer",
        tone: "sweet",
        content: "嘻嘻！吃到学长的糖，我瞬间又充满电啦！只要学长摸摸头，我再画 100 个大样都没问题！",
      },
    ],
  },
  {
    id: "bai_study_palette_assets",
    category: "study",
    label: "交换素材",
    tag: "审美进阶",
    icon: "📱",
    description: "互相拷贝独家收藏的北欧小众插画库与高阶渲染贴图，拓宽美学维度。",
    unlockFavorability: 0,
    statDeltas: {
      visualTaste: 8,
      dataSense: 6,
      favorability: 4,
    },
    dialogueSequence: [
      {
        speaker: "player",
        content: "白栩，你作品集里那些手绘人物配景和莫兰迪配色都是从哪里找的？质感特别高级。",
      },
      {
        speaker: "peer",
        tone: "excited",
        content: "是我自己一张一张勾画修图攒下的‘学弟私房素材库’！学长把 U 盘给我，我全拷给你！",
      },
      {
        speaker: "narration",
        content: "他把椅子往你身边挪了挪，手臂紧紧挨着你，热心地在平板上给你展示每一组色卡的搭配心法。",
      },
      {
        speaker: "peer",
        tone: "sweet",
        content: "只要学长喜欢，我以后画的所有新插画和新素材，都第一个打包发给学长！",
      },
    ],
  },
];

export const BAI_XU_ROMANCE_OPTIONS: PeerOption[] = [
  {
    id: "bai_romance_wipe_foam",
    category: "romance",
    label: "擦嘴角",
    tag: "软萌试探",
    icon: "🤝",
    description: "他嘴唇沾上了棉花糖奶沫，你伸手替他擦拭，少年耳尖泛红低下头。",
    unlockFavorability: 45,
    statDeltas: {
      stress: -8,
      selfDoubt: -8,
      favorability: 6,
    },
    dialogueSequence: [
      {
        speaker: "peer",
        tone: "sweet",
        content: "唔……这家热可可上的棉花糖好好吃！学长你也尝……啊？",
      },
      {
        speaker: "narration",
        content: "你看着他唇边沾上的一小团白色奶沫，自然地伸出手指，用温热的指腹轻轻帮他擦拭干净。",
      },
      {
        speaker: "peer",
        tone: "shy",
        content: "学、学长……（白栩的身体猛地僵住，整张白皙的脸颊以肉眼可见的速度红透到耳根）",
      },
      {
        speaker: "player",
        content: "小馋猫，吃得满嘴都是。怎么脸突然这么红？",
      },
      {
        speaker: "peer",
        tone: "sweet",
        content: "因、因为学长的手指好温柔……心跳突然变得好快……",
      },
    ],
  },
  {
    id: "bai_romance_rain_umbrella",
    category: "romance",
    label: "拥抱",
    tag: "依偎依恋",
    icon: "🫂",
    description: "咖啡馆外暴雨倾盆，他钻进你的伞下紧紧搂住你的手臂，脸颊贴在你的肩头。",
    unlockFavorability: 65,
    statDeltas: {
      stress: -15,
      selfDoubt: -10,
      favorability: 8,
    },
    dialogueSequence: [
      {
        speaker: "narration",
        content: "从咖啡馆出来时外面正下着暴雨，天色昏暗。你刚撑开伞，白栩就有些害怕地小跑过来，一把钻进了你的伞下。",
      },
      {
        speaker: "peer",
        tone: "shy",
        content: "学长，我忘带伞了……雨好大，我可以和你撑一把吗？",
      },
      {
        speaker: "player",
        content: "当然可以，往我这边靠紧一点，别淋湿了肩膀。",
      },
      {
        speaker: "narration",
        content: "白栩两只手紧紧抱住了你的胳膊，整个人软软地贴在你怀里。少年温热的体温与微甜的气息透过单薄的衣物传来，雨声在耳边变得格外安宁。",
      },
      {
        speaker: "peer",
        tone: "sweet",
        content: "学长身上的味道好安心……要是这条路永远走不完就好了。",
      },
    ],
  },
  {
    id: "bai_romance_sketch_kiss",
    category: "romance",
    label: "接吻",
    tag: "脸红心跳",
    icon: "💋",
    description: "借着立起大号草图本的掩护，少年红着脸踮起脚尖，轻轻啄吻在你的唇角。",
    unlockFavorability: 80,
    statDeltas: {
      stress: -12,
      expression: 8,
      favorability: 10,
    },
    dialogueSequence: [
      {
        speaker: "peer",
        tone: "shy",
        content: "学长……你把眼睛闭上三秒钟好不好？我有个特别的惊喜要送给你……",
      },
      {
        speaker: "player",
        content: "（你依言闭上双眼，听到他轻轻把大号草图本立在你们两人之间遮挡住咖啡馆的视线）",
      },
      {
        speaker: "narration",
        content: "下一秒，一个温软、微甜且带着草莓香气的吻，轻轻印在了你的唇角上。少年的呼吸急促而紊乱。",
      },
      {
        speaker: "peer",
        tone: "sweet",
        content: "学、学长！我喜欢你！从开学第一眼见到你起就超级超级喜欢你！",
      },
      {
        speaker: "player",
        content: "（你睁开眼，拉下草图本，将满脸通红想要逃跑的小学弟一把拉入怀中回吻）",
      },
    ],
  },
  {
    id: "bai_romance_sunset_confess",
    category: "romance",
    label: "求婚",
    tag: "专属小狗",
    icon: "🫀",
    description: "在咖啡馆外的黄昏枫树下，紧紧拥抱，倾听少年炽热真挚的一生托付。",
    unlockFavorability: 95,
    statDeltas: {
      stress: -20,
      selfDoubt: -15,
      favorability: 15,
    },
    dialogueSequence: [
      {
        speaker: "peer",
        tone: "sweet",
        content: "学长，别人都说读研很苦很累，可是只要每天能见到你，我的世界就像洒满了阳光一样甜。",
      },
      {
        speaker: "narration",
        content: "白栩两只手臂紧紧环住你的脖子，把头埋在你的肩窝处轻蹭，眼眶微微泛红却笑得无比幸福。",
      },
      {
        speaker: "player",
        content: "白栩，以后无论做建筑还是毕业去哪里，我都带着你。",
      },
      {
        speaker: "peer",
        tone: "sweet",
        content: "一言为定！学长是白栩一个人的大设计师，白栩是学长一辈子的粘人小狗，永远永远不分开！",
      },
    ],
  },
];

// ==========================================
// 4. 江淮（阳光健气 · 荷尔蒙爆棚 · 体育生舍友）
// ==========================================
export const JIANG_HUAI_PROFILE: PeerProfile = {
  id: "jiang_huai",
  name: "江淮",
  title: "土木与建筑专硕研一 · 健气舍友",
  grade: "东南大学 · 硕士一年级（502 寝室）",
  avatarImage: "/characters/jiang_huai.jpg",
  sceneImage: "/assets/visuals/maps/career-campus-map.png",
  locationName: "学生宿舍 · 研一 502 寝室",
  personalityTag: "阳光直率 · 荷尔蒙爆棚 · 护短犬系",
  atmosphere: "身上总是带着清爽的薄荷汗水香与洗衣液的味道。刚打完羽毛球或夜跑回来，额前碎发微湿，手臂肌肉线条流畅紧实。平时大大咧咧、嘴硬心软，但只要你熬夜通宵，他就会默默给你带夜宵、帮你扛图纸，并在你情绪低落时一把把你拉去操场暴汗排毒。",
  quote: "“天天对着电脑画图脖子不酸吗？走，换上球鞋，跟我去球场打一个小时羽毛球出身汗，我教你杀球！”",
  currentMoods: [
    "刚打完羽毛球回宿舍，用白毛巾擦拭脖颈上的细汗",
    "一边喝着冰镇电解质水，一边顺手帮你把凌乱的图纸收拾整齐",
    "穿着无袖运动背心在做俯卧撑，手臂肌肉线条紧绷有力",
    "晃了晃手里的羽毛球拍，冲你挑眉喊你一起去球馆打球",
    "把刚在食堂打包的烤鸡腿和冰可乐放在你桌上",
    "靠在宿舍阳台吹晚风，回头冲你露出阳光爽朗的大笑",
  ],
  bio: {
    education: "东南大学 土木工程与建筑力学复合专硕（研一在读）",
    specialties: ["羽毛球扣杀与体能训练", "空间结构力学验算与配筋", "深夜夜宵外卖雷达", "超强安全感与直球护短"],
    interest: "羽毛球、夜跑、健身撸铁、电竞联机、看 NBA",
    description: "与你住在同一间寝室的同门舍友，院里的羽毛球主力与阳光型男。性格直率爽朗、充满野性荷尔蒙，却把所有的细心与偏爱都留给了同寝室的你。无论你画图遇到力学瓶颈还是通宵力竭，他永远是你最强劲的体能后盾与安心避风港。",
  },
};

/** 江淮初次相遇剧情（第一次进入宿舍） */
export const JIANG_HUAI_FIRST_MEET: DialogueTurn[] = [
  {
    speaker: "player",
    content: "在教研室画了一整天图，整个人腰酸背痛，终于能回宿舍躺平歇会儿了……",
  },
  {
    speaker: "narration",
    content: "你推开寝室门，刚打完羽毛球回来的舍友正把球拍放在桌旁，手腕上戴着运动护腕，额前黑发微湿。他回过头，露出一抹爽朗自信的笑容。",
  },
  {
    speaker: "peer",
    tone: "excited",
    content: "哟，我们的大建筑师终于舍得从工位回来了？看你这脸色白得跟纸一样，八成又通宵改图没吃晚饭吧。",
  },
  {
    speaker: "narration",
    content: "江淮顺手从桌上递过来一份刚在食堂打包的现烤鸡腿和冰镇电解质水，手臂上流畅紧实的肌肉线条在运动服下若隐若现。",
  },
  {
    speaker: "player",
    content: "谢了江淮，还是你懂我，改图改得整个人快升天了。",
  },
  {
    speaker: "peer",
    tone: "sweet",
    content: "跟我客气什么。以后只要回宿舍，有我罩着你。不管是想吃夜宵还是压力大想去操场暴汗，随时叫我！",
  },
];

export const JIANG_HUAI_STUDY_OPTIONS: PeerOption[] = [
  {
    id: "jiang_study_badminton",
    category: "study",
    label: "打羽毛球",
    tag: "体能充能",
    icon: "🏸",
    description: "被他拉去风雨球馆打一场酣畅淋漓的羽毛球，用荷尔蒙驱散改图疲惫。",
    unlockFavorability: 0,
    statDeltas: {
      stress: -15,
      selfDoubt: -8,
      favorability: 4,
    },
    dialogueSequence: [
      {
        speaker: "peer",
        tone: "excited",
        content: "来！网前小球放得漂亮！看我这记反手后场高远球——接住了！",
      },
      {
        speaker: "narration",
        content: "球馆灯光下，江淮跃起扣杀，球衣被汗水微浸，勾勒出紧致结实的腹肌线条。两人在场上跑动挥拍，积攒了一整周的负能量随汗水彻底蒸发。",
      },
      {
        speaker: "player",
        content: "呼……跑得真过瘾，好久没有这么畅快地出过汗了。",
      },
      {
        speaker: "peer",
        tone: "sweet",
        content: "（他笑着扔给你一瓶冰镇运动饮料，用毛巾擦去你额头的汗水）爽吧！以后每周我都带你来打两次，包你身材和精神状态好到飞起！",
      },
    ],
  },
  {
    id: "jiang_study_structure_calc",
    category: "study",
    label: "请教力学",
    tag: "力学答疑",
    icon: "🏗️",
    description: "让他用扎实的土木力学功底，帮你核算异形大跨度悬挑的受力与配筋方案。",
    unlockFavorability: 0,
    statDeltas: {
      arch: 8,
      logic: 8,
      favorability: 4,
    },
    dialogueSequence: [
      {
        speaker: "player",
        content: "江淮，帮我看看这个 18 米无柱大悬挑，导师说结构计算书肯定过不了审。",
      },
      {
        speaker: "peer",
        tone: "focus",
        content: "多大点事。你这是纯剪切滞后效应没考虑进去，在根部加两道暗桁架，钢骨混凝土截面放大 100mm 就搞定了。我直接用 PKPM 帮你验算一遍弯矩图。",
      },
      {
        speaker: "narration",
        content: "江淮拉过凳子坐在你桌前，大咧咧地指着受力分析图飞速演算。平时大大咧咧的体育生，算起结构力学时眼神意外地锐利专注。",
      },
      {
        speaker: "peer",
        tone: "sweet",
        content: "搞定！安全系数拉满了。有我的力学验算给你背书，老齐挑不出半点毛病。",
      },
    ],
  },
  {
    id: "jiang_study_midnight_snack",
    category: "study",
    label: "吃烤冷面",
    tag: "宿舍烟火",
    icon: "🍢",
    description: "凌晨两点并肩坐在宿舍楼下的马路牙子上吃加辣烤冷面，倾诉求学焦虑。",
    unlockFavorability: 0,
    statDeltas: {
      stress: -12,
      selfDoubt: -10,
      favorability: 4,
    },
    dialogueSequence: [
      {
        speaker: "peer",
        tone: "sweet",
        content: "老板，两份烤冷面，都加里脊加蛋，微辣！再来两瓶冰可乐！",
      },
      {
        speaker: "narration",
        content: "夜风清凉，你们并肩坐在路灯下的长椅上。热气腾腾的烤冷面散发着酸甜的香气，江淮的大手自然地搭在你的肩头，沉稳有力。",
      },
      {
        speaker: "player",
        content: "有时候真觉得读研压力太大了，不知道毕业后能不能去想去的地方……",
      },
      {
        speaker: "peer",
        tone: "sweet",
        content: "瞎操心什么！你有多优秀我天天看在眼里。退一万步讲，天塌下来还有我这个舍友在前面替你顶着呢！吃肉！",
      },
    ],
  },
  {
    id: "jiang_study_jogging",
    category: "study",
    label: "晨跑拉伸",
    tag: "健康体魄",
    icon: "🏃",
    description: "早晨被他从床上拉起来环校慢跑，在林荫道下由他带着做专业运动拉伸。",
    unlockFavorability: 0,
    statDeltas: {
      stress: -10,
      logic: 6,
      favorability: 4,
    },
    dialogueSequence: [
      {
        speaker: "peer",
        tone: "excited",
        content: "大懒虫起床啦！今天早晨空气绝好，跟着我慢跑三公里，整天精神百倍！",
      },
      {
        speaker: "narration",
        content: "跑完步在绿茵场边，江淮站在你身后，双手握住你的手臂帮你做肩颈深度拉伸。温热强壮的胸膛随着呼吸起伏，贴在你的后背上。",
      },
      {
        speaker: "player",
        content: "平时画图僵硬的颈椎一下子舒展开了，好舒服。",
      },
      {
        speaker: "peer",
        tone: "sweet",
        content: "那当然，我可是专业私教水准。以后天天早上跟我打卡，把你的肩颈彻底调理好！",
      },
    ],
  },
];

export const JIANG_HUAI_ROMANCE_OPTIONS: PeerOption[] = [
  {
    id: "jiang_romance_towel_touch",
    category: "romance",
    label: "牵手",
    tag: "荷尔蒙微醺",
    icon: "🤝",
    description: "运动后他递过带着体温的毛巾，指尖相触，少年眼神微动心跳加速。",
    unlockFavorability: 45,
    statDeltas: {
      stress: -8,
      selfDoubt: -8,
      favorability: 6,
    },
    dialogueSequence: [
      {
        speaker: "peer",
        tone: "excited",
        content: "给，擦擦汗。刚才那记杀球救得真帅，我都差点没接住。",
      },
      {
        speaker: "narration",
        content: "他把刚擦过自己脖颈的白毛巾递到你手里。温热的触感混合着他身上好闻的清爽皂香，指尖相触时，江淮的目光突然定定地落在你脸上。",
      },
      {
        speaker: "player",
        content: "（你接过毛巾，指尖从他宽大温热的手掌上轻轻滑过）",
      },
      {
        speaker: "narration",
        content: "平时大大咧咧的男生喉结微微滑动了一下，有些不好意思地抓了抓头发，耳尖悄悄泛红。",
      },
      {
        speaker: "peer",
        tone: "shy",
        content: "咳……你、你脸红起来的样子……还挺好看的。",
      },
    ],
  },
  {
    id: "jiang_romance_back_to_back",
    category: "romance",
    label: "拥抱",
    tag: "亲密依偎",
    icon: "🫂",
    description: "熄灯后两人并排靠在床头打联机，宽阔温热的后背成为最安心的依靠。",
    unlockFavorability: 65,
    statDeltas: {
      stress: -15,
      selfDoubt: -10,
      favorability: 8,
    },
    dialogueSequence: [
      {
        speaker: "player",
        content: "今晚寝室好冷啊，暖气是不是又坏了……",
      },
      {
        speaker: "narration",
        content: "江淮直接坐到了你的床铺上，背靠着你的后背。男生炽热如小火炉般的体温透过薄薄的睡衣源源不断地传递过来。",
      },
      {
        speaker: "peer",
        tone: "sweet",
        content: "过来靠着我打。我体温高，给你当人体恒温靠垫。",
      },
      {
        speaker: "narration",
        content: "你安心地将全身重量倚靠在他宽厚结实的背脊上，听着他沉稳有力的心跳与呼吸声，宿舍的寒意彻底烟消云散。",
      },
      {
        speaker: "peer",
        tone: "sweet",
        content: "困了就直接睡吧，我就在这儿靠着你，哪儿也不去。",
      },
    ],
  },
  {
    id: "jiang_romance_locker_kiss",
    category: "romance",
    label: "接吻",
    tag: "荷尔蒙失控",
    icon: "💋",
    description: "运动后在空无一人的更衣室，被汗水未干的他单手撑在柜前低头索吻。",
    unlockFavorability: 80,
    statDeltas: {
      stress: -12,
      expression: 8,
      favorability: 10,
    },
    dialogueSequence: [
      {
        speaker: "narration",
        content: "球馆更衣室里空无一人，只剩淋浴间隐约的水声。你正站在储物柜前换衣服，刚洗完澡的江淮忽然一步上前，单手撑在你耳侧的柜门上。",
      },
      {
        speaker: "player",
        content: "江淮？怎么突然……唔？！",
      },
      {
        speaker: "narration",
        content: "还没等你说完，男生微湿的发丝垂落，低头霸道而炙热地封住了你的唇。带着薄荷香与纯粹男子气概的深吻瞬间攻陷了你的防线。",
      },
      {
        speaker: "peer",
        tone: "sweet",
        content: "（他微微喘息着松开你，粗粝的手指抚上你泛红的眼尾）知不知道你在球场上有多要命？我忍了一整场了。",
      },
      {
        speaker: "player",
        content: "（你抓紧了他的衣角，胸膛因为狂乱的心跳而剧烈起伏）",
      },
    ],
  },
  {
    id: "jiang_romance_bed_hug",
    category: "romance",
    label: "同床相拥",
    tag: "炽热定情",
    icon: "🫀",
    description: "在静谧的黑夜里将你整个人捞进怀里紧紧环抱，耳边低语“做我一辈子的专属球搭子”。",
    unlockFavorability: 95,
    statDeltas: {
      stress: -20,
      selfDoubt: -15,
      favorability: 15,
    },
    dialogueSequence: [
      {
        speaker: "peer",
        tone: "sweet",
        content: "喂，睡不着？过来我被窝里。",
      },
      {
        speaker: "narration",
        content: "江淮长臂一揽，把你整个人紧紧抱进他的被窝里。强健有力的手臂圈在你的腰间，他把脸深深埋在你的颈侧，深情而用力地吻着你的脖颈。",
      },
      {
        speaker: "peer",
        tone: "sweet",
        content: "不管是读研还是以后去哪个城市，你这辈子都别想甩开我。做我一个人的专属搭子，听到了没？",
      },
      {
        speaker: "player",
        content: "江淮……一辈子听你的，不准反悔。",
      },
      {
        speaker: "narration",
        content: "他在黑暗中满足地收紧了怀抱，吻上你的唇瓣，在宁静的夜色中许下了彼此永不褪色的承诺。",
      },
    ],
  },
];

// ================================================================
// 沈清淮（图书馆学长 · 儒雅手绘大师）
// ================================================================

export const SHEN_QINGHUAI_PROFILE: PeerProfile = {
  id: "shen_qinghuai",
  name: "沈清淮",
  title: "建筑历史与理论 专硕（研二在读）",
  grade: "同济大学 · 硕士二年级",
  avatarImage: "/characters/shen_qinghuai.jpg",
  avatar: "/characters/shen_qinghuai.jpg",
  sceneImage: "/assets/visuals/maps/career-campus-map.png",
  locationName: "校图书馆 · 古籍特藏与建筑速写区",
  personalityTag: "温润儒雅 · 手绘速写大师 · 治愈白月光",
  atmosphere: "身上带着淡淡的纸页墨香与杉木香气。戴着一副银丝半框眼镜，握着铅笔的骨节修长分明，在速写本上流畅勾勒古建筑的透视线条。性格谦逊温柔、极具耐性，无论你遇到多么棘手的历史文献断代或手绘大样，他都会放下手中的书，微笑着耐心地一步步为你拆解点拨。",
  quote: "“近代建筑的每一道砖石缝隙，都藏着时间的记忆。坐下吧，这本晚清洋行测绘孤本，我刚向特藏馆借出来，正好和你一起看。”",
  currentMoods: [
    "在图书馆靠窗的长桌前，握着铅笔在速写本上细致勾勒立面大样",
    "推了推银丝半框眼镜，轻声为你指出文献中的罕见地籍注释",
    "把刚泡好的温热白桃乌龙茶轻轻放在你手边",
    "低头看着图纸微微抿嘴思索，午后阳光透过树叶落在他柔软的发梢上",
    "微笑着从书架高层为你取下厚重的《中国近代建筑总览》",
    "用铅笔在草图边缘随手为你画了一幅传神可爱的侧脸小像",
  ],
  bio: {
    education: "同济大学 建筑历史与理论 专硕（研二在读，保研直升）",
    specialties: ["中国近代建筑史考据与文献断代", "高阶手绘透视与古建筑精细速写", "特藏文献高效检索与调卷", "情绪疗愈与温柔耐心辅导"],
    interest: "古建筑速写、收藏绝版测绘图册、手冲茶道、看纪录片、逛旧书市集",
    description: "常年在图书馆古籍特藏区自习的研二学长，院内公认的学术白月光与手绘速写天花板。性格温润如玉、待人极尽体贴与包容。当你被复杂的史料考据折磨得焦头烂额时，他永远是你最值得信赖的学术引路人与心灵港湾。",
  },
};

/** 沈清淮初次相遇剧情（第一次进入图书馆） */
export const SHEN_QINGHUAI_FIRST_MEET: DialogueTurn[] = [
  {
    speaker: "player",
    content: "听说图书馆三楼藏着一批珍贵的近代开埠建筑测绘手稿，特意过来查查资料……",
  },
  {
    speaker: "narration",
    content: "窗外午后阳光斑驳，靠窗的长桌前，一位身着灰色针织背心与浅蓝衬衫的学长正微微低头，用铅笔在活页速写本上极其熟练地勾勒着复杂的立面大样。他听到脚步声抬起头，银丝眼镜后的眼眸清亮而温和。",
  },
  {
    speaker: "peer",
    tone: "sweet",
    content: "同学也是来查近代营造厂档案的吗？我是研二的沈清淮。这几本特藏文献借阅手续比较繁琐，我已经办好了阅览权限，过来一起看吧。",
  },
  {
    speaker: "player",
    content: "太感谢沈学长了！我正愁不知道怎么申请特藏室的调卷手续呢。",
  },
  {
    speaker: "peer",
    tone: "shy",
    content: "别客气。近代建筑史的文献考据很花功夫，一个人翻容易枯燥。以后在图书馆如果遇到什么难点，随时来这个靠窗的位置找我。",
  },
];

export const SHEN_QINGHUAI_STUDY_OPTIONS: PeerOption[] = [
  {
    id: "shen_study_sketch",
    category: "study",
    label: "手绘速写",
    tag: "手绘切磋",
    icon: "✏️",
    description: "向他请教古建筑透视手绘技巧与精细线条表现。",
    unlockFavorability: 0,
    statDeltas: {
      arch: 10,
      logic: 5,
      favorability: 4,
    },
    dialogueSequence: [
      {
        speaker: "player",
        content: "学长，这处折衷主义柱头的透视比例，我总觉得阴影排线画得有点生硬。",
      },
      {
        speaker: "peer",
        tone: "sweet",
        content: "把铅笔稍微放平一点，用手腕带动手掌，像这样轻轻铺一道斜排线。你看，石材雕刻的立体感立刻就出来了。",
      },
      {
        speaker: "narration",
        content: "沈清淮修长的手指握着铅笔，在你的草图边示范。他的动作行云流水，寥寥数笔就勾勒出细腻的石材质感。",
      },
      {
        speaker: "peer",
        tone: "focus",
        content: "你的结构抓得很准，手感极佳。多画几次，线条会比我更有灵气。",
      },
    ],
  },
  {
    id: "shen_study_rare_books",
    category: "study",
    label: "借阅古籍",
    tag: "特藏调卷",
    icon: "📖",
    description: "由他代办特藏馆调卷手续，共同研读稀见建筑文献。",
    unlockFavorability: 0,
    statDeltas: {
      arch: 12,
      logic: 6,
      favorability: 4,
    },
    dialogueSequence: [
      {
        speaker: "player",
        content: "学长，这本 1920 年代的营造学社考察笔记，在普通借阅库里根本找不到。",
      },
      {
        speaker: "peer",
        tone: "sweet",
        content: "这是古籍部的非卖善本，我已经用课题权限调出来了。翻阅时戴上白手套，慢慢看，里面有几处手绘节点非常罕见。",
      },
      {
        speaker: "narration",
        content: "泛黄古旧的宣纸散发着墨香，沈清淮坐在你身边，轻声为你翻译批注中的法文与德文建筑专有名词。",
      },
      {
        speaker: "peer",
        tone: "sweet",
        content: "能和你一起研读这些沉睡的文献，感觉整个下午都变得格外充实。",
      },
    ],
  },
  {
    id: "shen_study_dating_docs",
    category: "study",
    label: "文献断代",
    tag: "史料考据",
    icon: "🔍",
    description: "针对晚清开埠洋行图纸，与他一同考证图纸年代与营造背景。",
    unlockFavorability: 0,
    statDeltas: {
      arch: 8,
      logic: 10,
      favorability: 4,
    },
    dialogueSequence: [
      {
        speaker: "player",
        content: "这几张老洋行图纸没有落款年份，只有英文水印和地税印章，很难确定具体年代。",
      },
      {
        speaker: "peer",
        tone: "focus",
        content: "你看图纸右下角的水印纸厂标号，这家造纸工坊只在 1902 至 1908 年间运营；再结合工部局的地税编码，断代范围可以精准锁定在 1905 年前后。",
      },
      {
        speaker: "narration",
        content: "沈清淮熟练地调出历史对照年表，逻辑严丝合缝，瞬间破解了困扰你数天的史料断代难题。",
      },
      {
        speaker: "peer",
        tone: "sweet",
        content: "做历史考据就像做侦探，每一次抽丝剥茧找到真相，都是对历史最好的致敬。",
      },
    ],
  },
  {
    id: "shen_study_quiet_time",
    category: "study",
    label: "自习陪伴",
    tag: "治愈自习",
    icon: "🍵",
    description: "在图书馆靠窗的安静座位并肩自习，享受宁静时光。",
    unlockFavorability: 0,
    statDeltas: {
      stress: -15,
      selfDoubt: -10,
      favorability: 4,
    },
    dialogueSequence: [
      {
        speaker: "narration",
        content: "图书馆里阳光柔和，翻书声细微轻缓。沈清淮将一杯温热的白桃乌龙茶轻轻放在你的桌角，附赠了一张写着鼓励话语的书签。",
      },
      {
        speaker: "peer",
        tone: "sweet",
        content: "看你揉了好几次太阳穴，别太紧绷。喝口茶歇一歇，累了就靠着椅子闭目养神，我帮你看包。",
      },
      {
        speaker: "player",
        content: "学长坐在旁边，感觉整个世界都安静下来了，心情特别平静。",
      },
      {
        speaker: "peer",
        tone: "shy",
        content: "只要你愿意，以后我身边的这个座位，一直都留给你。",
      },
    ],
  },
];

export const SHEN_QINGHUAI_ROMANCE_OPTIONS: PeerOption[] = [
  {
    id: "shen_romance_touch_hand",
    category: "romance",
    label: "牵手",
    tag: "初级心动",
    icon: "🤝",
    description: "翻阅古籍善本时，指尖在泛黄纸页边缘悄然触碰相扣。",
    unlockFavorability: 45,
    statDeltas: {
      stress: -8,
      selfDoubt: -8,
      favorability: 6,
    },
    dialogueSequence: [
      {
        speaker: "narration",
        content: "你们在同一本特藏图册前讨论平面布局。同时伸手翻页时，微凉的指尖在纸角边缘轻轻覆在了一起。",
      },
      {
        speaker: "peer",
        tone: "shy",
        content: "（他没有抽回手，修长的指尖微微收拢，轻轻包覆住你的手背）",
      },
      {
        speaker: "player",
        content: "学长……",
      },
      {
        speaker: "peer",
        tone: "sweet",
        content: "你的手很软……如果不介意的话，就这样看吧，我来替你翻页。",
      },
    ],
  },
  {
    id: "shen_romance_hug",
    category: "romance",
    label: "拥抱",
    tag: "深度依偎",
    icon: "🫂",
    description: "在图书馆静谧书架深处，被他轻轻揽入怀中安抚疲惫。",
    unlockFavorability: 65,
    statDeltas: {
      stress: -15,
      selfDoubt: -15,
      favorability: 8,
    },
    dialogueSequence: [
      {
        speaker: "player",
        content: "改图改到头晕，找了一下午的古籍还是缺关键佐证，我有点怀疑自己了……",
      },
      {
        speaker: "narration",
        content: "在无人经过的建筑文献书架深处，沈清淮合上手中的书，张开双臂将你轻轻带入怀中。他身上的针织衫带着阳光晒过的温热香气。",
      },
      {
        speaker: "peer",
        tone: "sweet",
        content: "傻瓜，做学术怎么可能一帆风顺。有我在，你不用一个人扛着所有压力。",
      },
      {
        speaker: "narration",
        content: "他温热的大手轻抚着你的头发，温沉的嗓音在耳边回荡，将所有的疲惫与焦虑彻底融化。",
      },
    ],
  },
  {
    id: "shen_romance_kiss",
    category: "romance",
    label: "接吻",
    tag: "心动定情",
    icon: "💋",
    description: "闭馆前夕的无人走道，他合上画本低头吻上你的唇。",
    unlockFavorability: 80,
    statDeltas: {
      stress: -20,
      selfDoubt: -20,
      favorability: 12,
    },
    dialogueSequence: [
      {
        speaker: "narration",
        content: "闭馆音乐轻柔响起，阅览室的灯光逐盏熄灭。在窗边昏暗的月光下，沈清淮缓缓摘下了银丝眼镜。",
      },
      {
        speaker: "peer",
        tone: "sweet",
        content: "今天在画本上画了一下午的建筑，但其实每一笔……心里想的都是你。",
      },
      {
        speaker: "player",
        content: "学长……",
      },
      {
        speaker: "narration",
        content: "话音未落，他俯身温柔而坚定地吻上了你的唇。平日里儒雅克制的学长，吻得格外深情缱绻，心跳急促而滚烫。",
      },
    ],
  },
  {
    id: "shen_romance_proposal",
    category: "romance",
    label: "求婚",
    tag: "终身誓约",
    icon: "💍",
    description: "在全院毕业展览上，他为你翻开画满你肖像的专属速写本。",
    unlockFavorability: 95,
    statDeltas: {
      stress: -30,
      selfDoubt: -30,
      favorability: 20,
    },
    dialogueSequence: [
      {
        speaker: "peer",
        tone: "sweet",
        content: "这本速写集是我这两年来所有的心血。前面的每一页是古建筑，而从遇见你的那一天起，后面的每一页全是你。",
      },
      {
        speaker: "narration",
        content: "在图书馆落日余晖的长桌前，沈清淮递上一枚精雕细琢的银制书签戒指，眼底泛着深情泪光。",
      },
      {
        speaker: "peer",
        tone: "sweet",
        content: "历史长河无尽漫长，但我想用余生所有的时间，陪伴你走遍世间每一座建筑。",
      },
      {
        speaker: "narration",
        content: "他轻柔地为你戴上戒指，在漫天霞光中将你紧紧拥入怀中，许下一生的浪漫承诺。",
      },
    ],
  },
];
