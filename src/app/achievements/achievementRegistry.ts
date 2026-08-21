/**
 * @file achievementRegistry.ts
 * @description 《我是一个“建”人》荣誉勋章与成就全景注册表
 * 包含 43 项具有黑色幽默、学术梗、修罗场恋爱与职场转行的成就定义与触发判定器。
 */

export type AchievementCategory = "career" | "romance" | "academic" | "meme" | "master";
export type AchievementTier = "bronze" | "silver" | "gold" | "diamond";

/** 全局统一的稀有度展示顺序：金色 > 紫色 > 红色 > 银色 */
export const ACHIEVEMENT_TIER_DISPLAY_ORDER = ["gold", "diamond", "bronze", "silver"] as const;
export const ACHIEVEMENT_TIER_SORT_INDEX = Object.fromEntries(
  ACHIEVEMENT_TIER_DISPLAY_ORDER.map((tier, index) => [tier, index]),
) as Record<AchievementTier, number>;

export interface AchievementCategoryMeta {
  id: AchievementCategory;
  label: string;
  shortLabel: string;
  icon: string;
  accentColor: string;
  description: string;
}

export const ACHIEVEMENT_CATEGORIES: Record<AchievementCategory, AchievementCategoryMeta> = {
  career: {
    id: "career",
    label: "转行破壁 · 职场狂飙",
    shortLabel: "职场狂飙",
    icon: "💼",
    accentColor: "#38bdf8",
    description: "从CAD图纸到大厂PRD、咨询金字塔与量化估值模型的升维打击",
  },
  romance: {
    id: "romance",
    label: "心动修罗场 · 校园骚操作",
    shortLabel: "校园心动",
    icon: "💖",
    accentColor: "#f472b6",
    description: "同门、高岭之花学长、年下学弟、生猛舍友、儒雅白月光与禁忌导师的爱恨情仇",
  },
  academic: {
    id: "academic",
    label: "师门风云 · 学术渡劫",
    shortLabel: "师门渡劫",
    icon: "🎓",
    accentColor: "#fbbf24",
    description: "与大老板斗智斗勇、知网查重暴击、盲审答辩与工位潜逃实录",
  },
  meme: {
    id: "meme",
    label: "精神状态 · 抽象发疯",
    shortLabel: "抽象发疯",
    icon: "💥",
    accentColor: "#a78bfa",
    description: "San值狂掉、彻底躺平、30平故宫与领先时代50年的发疯名场面",
  },
  master: {
    id: "master",
    label: "数值天花板 · 赛博修仙",
    shortLabel: "传奇神仙",
    icon: "🌟",
    accentColor: "#f59e0b",
    description: "六边形建圣、身价百万乙方、满级Perk挂身与全宇宙通关者",
  },
};

export const TIER_META: Record<AchievementTier, { label: string; enLabel: string; color: string; bg: string; border: string }> = {
  bronze: {
    label: "赤红桁架",
    enLabel: "RED",
    color: "#ef4444",
    bg: "rgba(239,68,68,0.12)",
    border: "rgba(239,68,68,0.38)",
  },
  silver: {
    label: "冷轧钢梁",
    enLabel: "SILVER",
    color: "#cbd5e1",
    bg: "rgba(203,213,225,0.12)",
    border: "rgba(203,213,225,0.35)",
  },
  gold: {
    label: "鎏金穹顶",
    enLabel: "GOLD",
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.14)",
    border: "rgba(245,158,11,0.45)",
  },
  diamond: {
    label: "紫晶天际线",
    enLabel: "PURPLE",
    color: "#c084fc",
    bg: "rgba(192,132,252,0.15)",
    border: "rgba(192,132,252,0.5)",
  },
};

/** 成就判定上下文（从 GamePage / 状态机提取所有维度数据） */
export interface AchievementCheckContext {
  stats: Record<string, number>;
  character?: {
    name: string;
    undergradSchool: string;
    undergradTier: number;
    masterSchool: string;
    masterTier: number;
    isOverseas: boolean;
  } | null;
  mentor?: { id: string; name: string; type?: string } | null;
  semester: number;
  round: number;
  partners: string[];
  confessedNpcIds: string[];
  pastInternships: Array<{ id: string; companyName: string; title: string }>;
  receivedOffers: Array<{ id: string; name: string; category: string }>;
  selectedOfferId: string | null;
  ending: { id: string; title: string } | null;
  activePerkIds: string[];
  seenEventIds: string[];
  chosenEventBranches?: Record<string, string>; // eventId -> branchId/tag
  actionMemory?: {
    totalActions?: Record<string, number>;
    streak?: Record<string, number>;
    totalInternships?: number;
    totalBurnout?: number;
    totalGifts?: number;
    totalSidejobs?: number;
    totalCampusApply?: number;
  };
  npcFavorabilities?: Record<string, number>;
  executedNpcOptionIds?: string[];
  totalSocialMessages?: number;
  usedFreeAction?: boolean;
  moneyBalance?: number;
}

export interface Achievement {
  id: string;
  title: string;
  category: AchievementCategory;
  tier: AchievementTier;
  iconEmoji: string;
  /**
   * 正式徽章资产规范：正方形透明 PNG，主体为居中的竖向圆角六边形；
   * 深海军蓝内底，外框颜色随稀有度变化，并保证在 64–128px 下清晰可辨。
   */
  imageSrc?: string;
  tag: string;
  description: string;
  hint: string;
  check: (ctx: AchievementCheckContext) => boolean;
}

// ============================================================================
// 全量 43 项成就定义
// ============================================================================

export const ACHIEVEMENTS: Achievement[] = [
  // ── 1. 转行破壁 · 职场狂飙线 ──
  {
    id: "career_toilet_funnel",
    title: "高铁公厕漏斗教皇",
    category: "career",
    tier: "silver",
    iconEmoji: "🚻",
    imageSrc: "/assets/badges/badge_career_toilet_funnel.webp",
    tag: "降维打击",
    description: "面试官本想刁难你，结果你用‘男蹲位如浅层曝光、女排队如深层流失’硬核拆解了拼多多砍一刀模型。总监当场起立鼓掌：‘这就是我们要的草根产品之神！’",
    hint: "线索：在某次大厂面试中被要求用‘公厕’拆解互联网漏斗时，做出最具统治力的回答。",
    check: (ctx) => {
      return (ctx.chosenEventBranches?.["e03"] === "A") || (ctx.seenEventIds.includes("e03") && (ctx.stats.logic ?? 0) >= 55);
    },
  },
  {
    id: "career_spatial_pm",
    title: "拿画CAD的手去大厂画大饼",
    category: "career",
    tier: "gold",
    iconEmoji: "🥞",
    imageSrc: "/assets/badges/badge_career_spatial_pm.webp",
    tag: "黑话大师",
    description: "‘建筑空间动线和用户消费旅程本质是一回事’——你连续多轮在图书馆撰写自研产品PRD，张口闭口用户心智与抓手赋能，总监直呼内行。",
    hint: "线索：在【图书馆】连续 3 轮执行「自研产品PRD」行动，或累计撰写 PRD 达到 4 次。",
    check: (ctx) => (ctx.actionMemory?.streak?.["product"] ?? 0) >= 3 || (ctx.actionMemory?.totalActions?.["product"] ?? 0) >= 4,
  },
  {
    id: "career_mbb_consulting",
    title: "PPT 裁缝与商业神棍",
    category: "career",
    tier: "gold",
    iconEmoji: "📊",
    imageSrc: "/assets/badges/badge_mbb_consulting_v2.webp",
    tag: "战略忽悠",
    description: "把十几页空间分析改成200页麦肯锡金字塔模型，TAM/SAM/SOM张口就来。制造业老板听完你的PPT感动得泪流满面，当场决定裁掉全厂转型做AI。",
    hint: "线索：凭借顶格的逻辑与结构化思维，使逻辑思维突破 65 或结构化思维达到 60。",
    check: (ctx) => (ctx.stats.logic ?? 0) >= 65 || (ctx.stats.structured ?? 0) >= 60,
  },
  {
    id: "career_ev_ux",
    title: "日结三千的野生富豪",
    category: "career",
    tier: "gold",
    iconEmoji: "🛋️",
    imageSrc: "/assets/badges/badge_career_ev_ux.webp",
    tag: "副业狂魔",
    description: "什么改图？你在咖啡馆做副业做成小老板，连续3轮疯狂接单做兼职，卡里进账的叮咚声比教研室的键盘声还悦耳。",
    hint: "线索：在【咖啡馆】连续 3 轮执行「做副业」搞钱行动，或累计做副业达到 4 次。",
    check: (ctx) => (ctx.actionMemory?.streak?.["sidejob"] ?? 0) >= 3 || (ctx.actionMemory?.totalSidejobs ?? 0) >= 4,
  },
  {
    id: "career_wall_street",
    title: "陆家嘴嗜血小野狼",
    category: "career",
    tier: "gold",
    iconEmoji: "🐺",
    imageSrc: "/assets/badges/badge_career_wall_street.webp",
    tag: "资本重构",
    description: "脱下沾满橡皮屑的格子衫，穿上高定小西装。靠着做副业与精明理财，你的储蓄流动资金突破两万元，资本原始积累初步完成。",
    hint: "线索：储蓄资金属性突破 50（折合两万元以上流动资产）。",
    check: (ctx) => (ctx.stats.money ?? 0) >= 50 || (ctx.moneyBalance ?? 0) >= 20000,
  },
  {
    id: "career_global_nomad",
    title: "在中英文夹杂界独孤求败",
    category: "career",
    tier: "gold",
    iconEmoji: "🍎",
    imageSrc: "/assets/badges/badge_career_global_nomad.webp",
    tag: "假洋鬼子",
    description: "‘Let's align一下这个space flow’，你连续多轮在图书馆猛刷雅思外语，凭借无懈可击的外语水平混成了最懂东方神秘空间学的国际精英。",
    hint: "线索：在【图书馆】连续 3 轮执行「准备雅思」行动，或外语能力突破 65。",
    check: (ctx) => (ctx.actionMemory?.streak?.["ielts"] ?? 0) >= 3 || (ctx.stats.english ?? 0) >= 65,
  },
  {
    id: "career_leetcode_wall",
    title: "在 LeetCode 里徒手砌墙",
    category: "career",
    tier: "silver",
    iconEmoji: "🧱",
    imageSrc: "/assets/badges/badge_career_leetcode_wall.webp",
    tag: "代码破壁",
    description: "把二叉树当成悬挑梁柱，把动态规划当成幕墙受力。你在黑底绿字的终端报错里，找到了比Rhino跑崩崩溃更变态的快感。",
    hint: "线索：在【图书馆】坚持执行「刷算法与代码」，使代码基础属性突破 50。",
    check: (ctx) => (ctx.stats.codeBasic ?? 0) >= 50 || (ctx.stats.logic ?? 0) >= 60,
  },
  {
    id: "career_offer_tsunami",
    title: "让 HR 连夜为你打群架",
    category: "career",
    tier: "diamond",
    iconEmoji: "🃏",
    imageSrc: "/assets/badges/badge_career_offer_tsunami.webp",
    tag: "Offer收割",
    description: "秋招季你把简历发满各大名企，海投连投，HR们为了争你连夜在脉脉上互黑。",
    hint: "线索：在【就业中心】累计执行「参加校招」达到 4 次，或连续 3 轮参加校招。",
    check: (ctx) => (ctx.actionMemory?.totalCampusApply ?? 0) >= 4 || (ctx.actionMemory?.streak?.["campus"] ?? 0) >= 3 || ctx.receivedOffers.length >= 3,
  },
  {
    id: "career_stay_architect",
    title: "本座誓死不当逃兵！",
    category: "career",
    tier: "silver",
    iconEmoji: "🛡️",
    imageSrc: "/assets/badges/badge_career_stay_architect.webp",
    tag: "初心不改",
    description: "面对外界的各种诱惑，你一巴掌拍在桌上：‘老子这辈子就要画图！’连续多轮在建筑学院闭关画图，在改图一线坚守到底。",
    hint: "线索：在【建筑学院】连续 3 轮执行「课题改图」行动，或累计改图达到 5 次。",
    check: (ctx) => (ctx.actionMemory?.streak?.["revise"] ?? 0) >= 3 || (ctx.actionMemory?.totalActions?.["revise"] ?? 0) >= 5,
  },

  // ── 2. 心动修罗场 · 校园骚操作线 ──
  {
    id: "romance_yifan_rhino",
    title: "Rhino 电池接吻法",
    category: "romance",
    tier: "gold",
    iconEmoji: "🔌",
    imageSrc: "/assets/badges/badge_romance_yifan_rhino.webp",
    tag: "工位私奔",
    description: "302工位两张转椅贴得严丝合缝，屏幕上Grasshopper电池在疯狂报错红，桌底下两只手已经十指紧扣。导师半夜推门问为什么教研室这么热，一帆面不改色喘着气说：‘老师，我们在做人体热舒适度极限模拟。’",
    hint: "线索：与同门张一帆好感度达标 (≥80)，并在中大院 302 展开深入心动互动。",
    check: (ctx) => {
      const favor = ctx.npcFavorabilities?.["zhang_yifan"] ?? ctx.npcFavorabilities?.["peer"] ?? ctx.stats.peerFavorability ?? 0;
      return ctx.partners.includes("zhang_yifan") || ctx.partners.includes("peer") || favor >= 80;
    },
  },
  {
    id: "romance_yuchen_hotnerd",
    title: "把禁欲学长按在简历上亲",
    category: "romance",
    tier: "gold",
    iconEmoji: "👓",
    imageSrc: "/assets/badges/badge_romance_yuchen_hotnerd.webp",
    tag: "高岭之花",
    description: "陆学长平时推着金丝眼镜冷酷讲宝洁八大问，结果被你堵在204就业指导室角落壁咚。他心跳过速推翻了三套逻辑模型，最后在你的结婚誓词下面郑重批注：‘该方案无任何逻辑漏洞，批准执行一辈子，不接受任何HR背调。’",
    hint: "线索：在就业中心与陆予忱学长完成全部心动阶段或达成浪漫誓约 (好感 ≥ 80)。",
    check: (ctx) => {
      const favor = ctx.npcFavorabilities?.["lu_yuchen"] ?? 0;
      return ctx.partners.includes("lu_yuchen") || favor >= 80;
    },
  },
  {
    id: "romance_baixu_puppy",
    title: "拐带大三小狗当童养夫",
    category: "romance",
    tier: "gold",
    iconEmoji: "🐶",
    imageSrc: "/assets/badges/badge_romance_baixu_puppy.webp",
    tag: "年下奶狗",
    description: "打着‘辅导大三快题’的幌子在阳光卡座天天吸年下小狗。白栩眼尾通红地把精心拼装的亚克力模型连同户口本一起塞进你怀里：‘师兄/师姐，我快题可以挂科，但我的户口本第一页必须写你的名字……’",
    hint: "线索：在咖啡馆阳光卡座指导白栩快题，并推进至高阶心动羁绊 (好感 ≥ 80)。",
    check: (ctx) => {
      const favor = ctx.npcFavorabilities?.["bai_xu"] ?? 0;
      return ctx.partners.includes("bai_xu") || favor >= 80;
    },
  },
  {
    id: "romance_jianghuai_gym",
    title: "在体育生舍友的胸肌上改图",
    category: "romance",
    tier: "gold",
    iconEmoji: "🎽",
    imageSrc: "/assets/badges/badge_romance_jianghuai_gym.webp",
    tag: "生猛舍友",
    description: "通宵改图到低血糖，江淮二话不说单手把你扛起来跑去西门买加了五个蛋六根肠的豪华烤冷面。晨跑拉伸时两人的肌肉紧紧贴在一起，舍友关系彻底变质为承重墙级别的生猛爱情。",
    hint: "线索：在宿舍 502 与江淮深入互动，晨跑拉伸并达成高阶心动 (好感 ≥ 80)。",
    check: (ctx) => {
      const favor = ctx.npcFavorabilities?.["jiang_huai"] ?? 0;
      return ctx.partners.includes("jiang_huai") || favor >= 80;
    },
  },
  {
    id: "romance_qinghuai_moon",
    title: "在古籍特藏区把白月光拉下神坛",
    category: "romance",
    tier: "gold",
    iconEmoji: "📜",
    imageSrc: "/assets/badges/badge_romance_qinghuai_moon.webp",
    tag: "儒雅月光",
    description: "在图书馆静谧无人的特藏区，沈学长手把手教你勾勒清代斗栱，结果硫酸纸上画的全是你的侧脸。他耳根通红地合上古籍，低声问：‘师弟/妹，愿不愿意做我笔下唯一的非物质文化遗产？’",
    hint: "线索：在图书馆古籍特藏区与沈清淮共读古建，达成高阶浪漫誓约 (好感 ≥ 80)。",
    check: (ctx) => {
      const favor = ctx.npcFavorabilities?.["shen_qinghuai"] ?? ctx.npcFavorabilities?.["lab_senior"] ?? 0;
      return ctx.partners.includes("shen_qinghuai") || ctx.partners.includes("lab_senior") || favor >= 80;
    },
  },
  {
    id: "romance_mentor_forbidden",
    title: "欺师灭祖！把学术大老板变成枕边人",
    category: "romance",
    tier: "diamond",
    iconEmoji: "☕",
    imageSrc: "/assets/badges/badge_romance_mentor_forbidden.webp",
    tag: "禁忌心动",
    description: "当你在办公室掏出钻戒求婚的那一刻，导师握着保温杯的手都在颤抖，眼镜滑到了鼻尖：‘荒谬！这违背学术伦理……但毕业答辩我给你打全院第一，今晚来家里吃饭。’组会从此变成了家庭例会，同门见了你都得尊称一声师娘/师爹。",
    hint: "线索：在导师办公室解锁全部【禁忌心动】选项，完成送拉花咖啡并推进至求婚！",
    check: (ctx) => {
      return ctx.partners.includes("mentor") || ctx.partners.includes("professor") || (ctx.executedNpcOptionIds?.includes("mentor_romance_propose") ?? false);
    },
  },
  {
    id: "romance_harem_master",
    title: "中大院头号海王之全员养鱼",
    category: "romance",
    tier: "diamond",
    iconEmoji: "🐟",
    imageSrc: "/assets/badges/badge_romance_harem_master.webp",
    tag: "时间管理",
    description: "左手一帆在工位喂你冰美式，右手予忱在改简历，微信里白栩在哭着要抱抱，宿舍江淮在热蛋白粉，特藏区清淮在画速写，办公室导师还在等你送拉花。你居然还没翻车，建议直接去联合国主持世界和平。",
    hint: "线索：在单局游戏中同时成为 3 位及以上 NPC 的伴侣。",
    check: (ctx) => ctx.partners.length >= 3,
  },
  {
    id: "romance_shura_survivor",
    title: "群面撞见三个前任依然从容带飞",
    category: "romance",
    tier: "silver",
    iconEmoji: "💣",
    imageSrc: "/assets/badges/badge_romance_shura_survivor.webp",
    tag: "极品端水",
    description: "大厂群面现场，一抬头主考官是陆予忱，同组Timer是一帆，对面撕逼的是江淮。你微微一笑用公厕漏斗模型把全场前任拉通对齐。群面全通，晚上四个人的微信同时被你发了‘今晚老地方见’。",
    hint: "线索：伴侣数 ≥ 2 且「跨职能拉通」属性达到 50 以上。",
    check: (ctx) => ctx.partners.length >= 2 && (ctx.stats.alignment ?? 0) >= 50,
  },
  {
    id: "romance_wechat_bomb",
    title: "绿色气泡轰炸机",
    category: "romance",
    tier: "bronze",
    iconEmoji: "💬",
    imageSrc: "/assets/badges/badge_romance_wechat_bomb.webp",
    tag: "社交狂魔",
    description: "从凌晨两点的方案发疯，到早晨八点的发图吐槽，你的微信好友列表被你处成了一座永不熄灯的情感发电厂。",
    hint: "线索：在电脑微信社交系统中与各位 NPC 累计畅聊超过 15 轮。",
    check: (ctx) => (ctx.totalSocialMessages ?? 0) >= 15,
  },
  {
    id: "romance_pure_love",
    title: "大内卷时代的濒危纯爱战神",
    category: "romance",
    tier: "gold",
    iconEmoji: "💍",
    imageSrc: "/assets/badges/badge_romance_pure_love.webp",
    tag: "一生一世",
    description: "在全院都在搞利益交换和海王抓马的时代，你眼里只有那一个人。导师问你三年学到了什么，你傲然昂头：‘学到了怎么至死不渝地爱 Ta。’",
    hint: "线索：从始至终只专一攻略 1 位伴侣，且好感度达到 85 以上。",
    check: (ctx) => {
      if (ctx.partners.length !== 1) return false;
      const solePartner = ctx.partners[0];
      const favor = ctx.npcFavorabilities?.[solePartner] ?? 0;
      return favor >= 85 || (solePartner === "zhang_yifan" && (ctx.stats.peerFavorability ?? 0) >= 85);
    },
  },

  // ── 3. 师门风云 · 学术渡劫线 ──
  {
    id: "acad_blackmail_medal",
    title: "教研室至高核威慑密码",
    category: "academic",
    tier: "gold",
    iconEmoji: "💾",
    imageSrc: "/assets/badges/badge_acad_blackmail_medal.webp",
    tag: "免死金牌",
    description: "‘宝贝真没去洗脚’的语音转文字截图被你设成了电脑壁纸。每次导师在组会上抓起保温杯要砸人，你只要默默敲一下空格点亮屏幕，导师立刻战术清嗓：‘大家……还是要注意劳逸结合。’",
    hint: "线索：在导师深夜发错暧昧微信事件中，选择《免死金牌.jpg》备份存入网盘。",
    check: (ctx) => {
      return (ctx.chosenEventBranches?.["e01"] === "C") || (ctx.seenEventIds.includes("e01") && (ctx.stats.logic ?? 0) >= 60);
    },
  },
  {
    id: "acad_huafie_thesis",
    title: "华妃娘娘赐知网一丈红",
    category: "academic",
    tier: "silver",
    iconEmoji: "🪭",
    imageSrc: "/assets/badges/badge_acad_huafie_thesis.webp",
    tag: "宫斗答辩",
    description: "知网标红98%全判定为甄嬛传宫斗台词。你面不改色在答辩席论证‘华妃的阶级困境与中国近代木构剪力墙失稳具有跨时代的同构性’，评委老教授听得起立鼓掌。",
    hint: "线索：在论文查重被判定为华妃台词事件中机智自辩化险为夷。",
    check: (ctx) => {
      return (ctx.chosenEventBranches?.["e04"] === "A") || (ctx.seenEventIds.includes("e04") && (ctx.stats.expression ?? 0) >= 55);
    },
  },
  {
    id: "acad_midnight_emoticon",
    title: "深夜发癫把老登当闺蜜",
    category: "academic",
    tier: "silver",
    iconEmoji: "📱",
    imageSrc: "/assets/badges/badge_acad_midnight_emoticon.webp",
    tag: "精神领先",
    description: "大脑烧糊涂甩出【华妃赐一丈红.jpg】怒喷‘老登真当本宫是永动机’，导师秒回【甄嬛下毒.jpg】‘朕看你精神挺足明早多画三套立面’。师徒二人精神状态双双领先时代五十年。",
    hint: "线索：经历凌晨两点半在群里手滑发错表情包与导师发癫对决事件。",
    check: (ctx) => ctx.seenEventIds.includes("e07"),
  },
  {
    id: "acad_fengshui_master",
    title: "科学尽头是风水，风水尽头是五鬼",
    category: "academic",
    tier: "bronze",
    iconEmoji: "☯️",
    imageSrc: "/assets/badges/badge_acad_fengshui_master.webp",
    tag: "玄学改图",
    description: "在甲方商场平面里暗搓搓布置了‘九曲黄河聚财阵’与‘五鬼运财扶梯’，甲方老板看完连夜加了五十万设计费，导师破天荒在微信给你转了两百块奶茶钱。",
    hint: "线索：帮导师搞定玄学私活，画出开运风水图。",
    check: (ctx) => ctx.seenEventIds.includes("e08"),
  },
  {
    id: "acad_thesis_godfather",
    title: "盲审专家的赛博义父",
    category: "academic",
    tier: "gold",
    iconEmoji: "📜",
    imageSrc: "/assets/badges/badge_acad_thesis_godfather.webp",
    tag: "优秀论文",
    description: "把空间句法、现代性批判与拓扑优化吹得天花乱坠，三位盲审老院士看完老泪纵横：‘中国建筑学有救了！’当场全票保送优秀毕业论文。",
    hint: "线索：毕业论文估分 (thesisScore) 达到 88 分以上，评级为「优秀」。",
    check: (ctx) => (ctx.stats.thesisScore ?? 0) >= 88,
  },
  {
    id: "acad_gift_connoisseur",
    title: "马屁拍在马蹄铁上的送礼宗师",
    category: "academic",
    tier: "bronze",
    iconEmoji: "🍵",
    imageSrc: "/assets/badges/badge_acad_gift_connoisseur.webp",
    tag: "人情世故",
    description: "深谙海归派爱手冲、学术派爱古籍、实践派爱茅台、放养派爱枸杞。你在办公室行贿行得宛如高雅的学术研讨，导师想挑刺都找不出借口。",
    hint: "线索：在【宿舍】或【办公室】累计执行「送礼献殷勤」达到 3 次以上。",
    check: (ctx) => (ctx.actionMemory?.totalGifts ?? 0) >= 3,
  },
  {
    id: "acad_earthbound_spirit",
    title: "研九地缚灵老仙尊的衣钵传人",
    category: "academic",
    tier: "silver",
    iconEmoji: "🌶️",
    imageSrc: "/assets/badges/badge_acad_earthbound_spirit.webp",
    tag: "修仙逃生",
    description: "从天花板倒挂下来的研九老学长递给你《防猝死修仙指南》，并教你如何在教研室地板下偷接高压电挖矿代跑能耗仿真维持生计。",
    hint: "线索：在教研室深夜改图时偶遇研九延毕地缚灵老仙尊。",
    check: (ctx) => ctx.seenEventIds.includes("e05"),
  },
  {
    id: "acad_stealth_intern",
    title: "大变活人：工位全息投影",
    category: "academic",
    tier: "silver",
    iconEmoji: "💨",
    imageSrc: "/assets/badges/badge_acad_stealth_intern.webp",
    tag: "带薪潜逃",
    description: "工位上摆着会呼吸的充气假人和循环播放改图视频的屏幕，导师以为你三年没挪过窝，其实你已经在大厂远程领了九个月实习工资。",
    hint: "线索：在三年内成功沉淀 2 段及以上的实战实习经历。",
    check: (ctx) => ctx.pastInternships.length >= 2,
  },
  {
    id: "acad_mentor_redemption",
    title: "从被退学到荣升嫡长子",
    category: "academic",
    tier: "diamond",
    iconEmoji: "🎭",
    imageSrc: "/assets/badges/badge_acad_mentor_redemption.webp",
    tag: "导师大圆满",
    description: "曾经导师指着鼻子骂‘你是我带过最差的一届’，三年后导师在毕业散伙饭上抱着你痛哭流涕：‘好徒儿，你走了这课题组谁来替为师顶包啊！’",
    hint: "线索：导师认可度达到 95 分以上的顶峰大圆满。",
    check: (ctx) => (ctx.stats.mentorFavorability ?? 0) >= 95,
  },

  // ── 4. 精神状态 · 抽象发疯线 ──
  {
    id: "meme_stress_collapse",
    title: "精神承重墙粉碎性骨折",
    category: "meme",
    tier: "bronze",
    iconEmoji: "💥",
    imageSrc: "/assets/badges/badge_meme_stress_collapse.webp",
    tag: "闭馆安详",
    description: "在连续的方案推翻与重压下，你的心理抗压跌破安全线，或者自我怀疑拉满，安详地进入了四维发疯空间。",
    hint: "线索：心理抗压跌破 15，或自我怀疑突破 85。",
    check: (ctx) => (ctx.stats.stress ?? 50) <= 15 || (ctx.stats.selfDoubt ?? 0) >= 85,
  },
  {
    id: "meme_born_in_rome",
    title: "行贿艺术天花板",
    category: "meme",
    tier: "silver",
    iconEmoji: "🏰",
    imageSrc: "/assets/badges/badge_meme_born_in_rome.webp",
    tag: "少爷还乡",
    description: "连续两轮向导师送礼，从大红袍送到枸杞茅台。导师见你一掏兜就战术清嗓想给你敬礼：‘好同学，真不用这么客气！’",
    hint: "线索：在【宿舍】或【办公室】连续 2 轮执行「送礼献殷勤」，或累计送礼达到 4 次。",
    check: (ctx) => (ctx.actionMemory?.streak?.["gifts"] ?? 0) >= 2 || (ctx.actionMemory?.totalGifts ?? 0) >= 4,
  },
  {
    id: "meme_penguin_feeder",
    title: "兼职与改图永动机",
    category: "meme",
    tier: "silver",
    iconEmoji: "🐧",
    imageSrc: "/assets/badges/badge_meme_penguin_feeder.webp",
    tag: "永动机",
    description: "白天在教研室肝方案，晚上在咖啡馆做兼职。你凭借惊人的精力在搞钱与改图间双向狂飙，堪称中大院永动机。",
    hint: "线索：累计执行 3 次「做副业」 + 3 次「课题改图」行动。",
    check: (ctx) => (ctx.actionMemory?.totalSidejobs ?? 0) >= 3 && (ctx.actionMemory?.totalActions?.["revise"] ?? 0) >= 3,
  },
  {
    id: "meme_expelled_hero",
    title: "夜战通宵人形猛犸",
    category: "meme",
    tier: "bronze",
    iconEmoji: "🚷",
    imageSrc: "/assets/badges/badge_meme_expelled_hero.webp",
    tag: "夜战猛犸",
    description: "在中大院教研室通宵改图到天亮，中大院大楼熄灯全靠你拔电源，直接熬成教研室人形夜行猛犸。",
    hint: "线索：在【建筑学院】累计执行「课题改图」行动达到 5 次以上。",
    check: (ctx) => (ctx.actionMemory?.totalActions?.["revise"] ?? 0) >= 5,
  },
  {
    id: "meme_slacker_supreme",
    title: "只要我死得够快，资本就剥削不到我",
    category: "meme",
    tier: "bronze",
    iconEmoji: "🛋️",
    imageSrc: "/assets/badges/badge_meme_slacker_supreme.webp",
    tag: "深度放空",
    description: "连续四学期躺在床上吃外卖刷剧，大脑放空到禅宗极境。同辈在卷大厂，导师在催开题，你翻了个身：‘今日无事，勾栏听曲。’",
    hint: "线索：在【宿舍】连续 3 轮执行「彻底摆烂」，或累计摆烂达到 3 次。",
    check: (ctx) => (ctx.actionMemory?.streak?.["slack"] ?? 0) >= 3 || (ctx.actionMemory?.totalBurnout ?? 0) >= 3,
  },
  {
    id: "meme_icu_ctrl_s",
    title: "在 ICU 抢救室里催渲染进度条",
    category: "meme",
    tier: "silver",
    iconEmoji: "🏥",
    imageSrc: "/assets/badges/badge_meme_icu_ctrl_s.webp",
    tag: "钢铁病友",
    description: "心电监护仪报警声此起彼伏，你一把摘下氧气面罩对护士虚弱地说：‘等一下……先别急着拔管……让我把模型先点一下……Ctrl+S……’",
    hint: "线索：身体健康度跌破 25 时依然在坚持肝学业或工作。",
    check: (ctx) => (ctx.stats.health ?? 100) <= 25,
  },
  {
    id: "meme_micro_forbidden_city",
    title: "在30平米老破小修筑赛博紫禁城",
    category: "meme",
    tier: "bronze",
    iconEmoji: "🏯",
    imageSrc: "/assets/badges/badge_meme_micro_forbidden_city.webp",
    tag: "微缩太和殿",
    description: "玄关做午门断流，洗手间做文华殿藏书，厨房做御膳房明火，阳台做神武门瞭望。甲方站在马桶上热泪盈眶，仿佛自己当场登基称帝。",
    hint: "线索：触发在极其奇葩的超小户型里做出故宫中轴线气势事件。",
    check: (ctx) => ctx.seenEventIds.includes("e13"),
  },
  {
    id: "meme_ai_card_smoking",
    title: "把 AI 军师的显卡 CPU 干冒烟",
    category: "meme",
    tier: "diamond",
    iconEmoji: "🤖",
    imageSrc: "/assets/badges/badge_meme_ai_card_smoking.webp",
    tag: "赛博飞升",
    description: "你在自由行动里输入了连大语言模型都未曾设想的离谱骚操作，AI 军师当场短路判定‘此子恐怖如斯，无法用常规人类物理法则推演’，直接送你满分通关。",
    hint: "线索：在随机事件中输入过 AI 自由行动并成功结算。",
    check: (ctx) => ctx.usedFreeAction ?? false,
  },

  // ── 5. 数值天花板 · 赛博修仙线 ──
  {
    id: "master_hexagonal_god",
    title: "中大院六边形灭世魔神",
    category: "master",
    tier: "gold",
    iconEmoji: "🌟",
    imageSrc: "/assets/badges/badge_master_hexagonal_god.webp",
    tag: "全维建圣",
    description: "左手建筑方案拿红点大奖，右手Python算法刷穿LeetCode，嘴上英语辩论舌战群儒，脑中商业闭环严丝合缝。全院师生见你都要恭敬作揖尊称一声‘建圣’。",
    hint: "线索：建筑专业力、逻辑推理、口头表达与结构化思维同时达到 70 以上。",
    check: (ctx) => {
      const { arch = 0, logic = 0, expression = 0, structured = 0 } = ctx.stats;
      return arch >= 70 && logic >= 70 && expression >= 70 && structured >= 70;
    },
  },
  {
    id: "master_freelance_tycoon",
    title: "兜里比导师账户还肥硕的乙方",
    category: "master",
    tier: "gold",
    iconEmoji: "💰",
    imageSrc: "/assets/badges/badge_master_freelance_tycoon.webp",
    tag: "提前暴富",
    description: "靠着画快题外包、行研洗稿、快闪店策划和接单，你卡里的余额让年薪三十万的博导在组会上默默流下了羡慕的泪水。",
    hint: "线索：靠做副业与理财，储蓄资金属性突破 80（折合约四万元以上流动资金）。",
    check: (ctx) => (ctx.stats.money ?? 0) >= 80 || (ctx.moneyBalance ?? 0) >= 40000,
  },
  {
    id: "master_perk_collector",
    title: "人形自走全职高手",
    category: "master",
    tier: "gold",
    iconEmoji: "🎴",
    imageSrc: "/assets/badges/badge_master_perk_collector.webp",
    tag: "满级天赋",
    description: "你身上挂满了【空间PM】【咨询脑】【设计复合体】【老油条】【创业苗子】等词条，走在校园里自带金色传说全彩发光特效。",
    hint: "线索：在单局游戏中同时点亮 4 个及以上的职业天赋 Perk。",
    check: (ctx) => ctx.activePerkIds.length >= 4,
  },
  {
    id: "master_iron_nerve",
    title: "赛博钛合金绝缘狗皮膏药",
    category: "master",
    tier: "silver",
    iconEmoji: "🛡️",
    imageSrc: "/assets/badges/badge_master_iron_nerve.webp",
    tag: "绝对防御",
    description: "HR的已读不回、导师的深夜狂怒、同辈的炫耀朋友圈在你眼里全如过眼云烟。你的情绪稳定得像一块泡在福尔马林里的花岗岩。",
    hint: "线索：自我怀疑 ≤ 20 且 心理抗压 ≥ 75，心如止水。",
    check: (ctx) => (ctx.stats.selfDoubt ?? 50) <= 20 && (ctx.stats.stress ?? 50) >= 75,
  },
  {
    id: "master_delayed_emperor",
    title: "端水大师极境",
    category: "master",
    tier: "silver",
    iconEmoji: "👑",
    imageSrc: "/assets/badges/badge_master_delayed_emperor.webp",
    tag: "全面平衡",
    description: "改图、学产品、刷外语、搞兼职样样不落，全方位平衡发展，中大院最强时间管理大师诞生。",
    hint: "线索：三年生涯中，「课题改图」「自研产品PRD」「准备雅思」「做副业」各至少执行过 1 次。",
    check: (ctx) => Boolean((ctx.actionMemory?.totalActions?.["revise"] ?? 0) >= 1 && (ctx.actionMemory?.totalActions?.["product"] ?? 0) >= 1 && (ctx.actionMemory?.totalActions?.["ielts"] ?? 0) >= 1 && (ctx.actionMemory?.totalActions?.["sidejob"] ?? 0) >= 1),
  },
  {
    id: "master_cupid_god",
    title: "中大院顶级芳心纵火犯",
    category: "master",
    tier: "diamond",
    iconEmoji: "💘",
    imageSrc: "/assets/badges/badge_master_cupid_god.webp",
    tag: "全城热恋",
    description: "从清纯同门、高岭之花学长、年下正太、肌肉体育生、儒雅白月光，到办公室大老板，无一幸免全被你戴上了戒指。中大院因你而民政局爆满！",
    hint: "线索：与至少 4 位及以上的角色建立过深层羁绊或伴侣誓约。",
    check: (ctx) => ctx.partners.length >= 4 || (ctx.confessedNpcIds?.length ?? 0) >= 4,
  },
  {
    id: "master_grand_completion",
    title: "殿堂级传奇建人（大圆满）",
    category: "master",
    tier: "diamond",
    iconEmoji: "🏆",
    imageSrc: "/assets/badges/badge_master_grand_completion.webp",
    tag: "多重宇宙神",
    description: "恭喜你！你已经彻底通关了建筑研究生的多重发疯宇宙！全世界的大厂、导师和帅哥/美女都为你起立鼓掌！",
    hint: "线索：累计解锁本游戏 25 项及以上的荣誉勋章。",
    check: (ctx) => false, // 专门在 Store 汇总层依据累计解锁总数判定
  },
];

/**
 * 实时扫描并返回当前新增解锁的成就列表
 */
export function evaluateNewAchievements(
  context: AchievementCheckContext,
  currentlyUnlockedIds: string[] = [],
): Achievement[] {
  if (!context || !context.stats) return [];

  const safeContext: AchievementCheckContext = {
    stats: context.stats || {},
    character: context.character || null,
    mentor: context.mentor || null,
    semester: context.semester || 1,
    round: context.round || 1,
    partners: Array.isArray(context.partners) ? context.partners : [],
    confessedNpcIds: Array.isArray(context.confessedNpcIds) ? context.confessedNpcIds : [],
    pastInternships: Array.isArray(context.pastInternships) ? context.pastInternships : [],
    receivedOffers: Array.isArray(context.receivedOffers) ? context.receivedOffers : [],
    selectedOfferId: context.selectedOfferId || null,
    ending: context.ending || null,
    activePerkIds: Array.isArray(context.activePerkIds) ? context.activePerkIds : [],
    seenEventIds: Array.isArray(context.seenEventIds) ? context.seenEventIds : [],
    chosenEventBranches: context.chosenEventBranches || {},
    actionMemory: context.actionMemory || {},
    npcFavorabilities: context.npcFavorabilities || {},
    executedNpcOptionIds: Array.isArray(context.executedNpcOptionIds) ? context.executedNpcOptionIds : [],
    totalSocialMessages: context.totalSocialMessages || 0,
    usedFreeAction: Boolean(context.usedFreeAction),
    moneyBalance: context.moneyBalance || 0,
  };

  const unlockedSet = new Set(Array.isArray(currentlyUnlockedIds) ? currentlyUnlockedIds : []);
  const newlyUnlocked: Achievement[] = [];

  for (const ach of ACHIEVEMENTS) {
    if (unlockedSet.has(ach.id)) continue;
    if (ach.id === "master_grand_completion") {
      if (unlockedSet.size + newlyUnlocked.length >= 25) {
        newlyUnlocked.push(ach);
      }
      continue;
    }
    try {
      if (ach.check(safeContext)) {
        newlyUnlocked.push(ach);
      }
    } catch (e) {
      console.warn(`[Achievement] Error checking ${ach.id}:`, e);
    }
  }

  return newlyUnlocked;
}
