import { useState, useCallback, useEffect, useRef, type CSSProperties } from "react";
import { RefreshCw, ChevronRight, ChevronDown, Zap, TrendingUp, TrendingDown, BookOpen, TriangleAlert, BriefcaseBusiness, CheckCircle2, Pencil, Check, X, Share2, Save, FolderOpen, Trash2, Settings, CircleHelp } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { evaluateCustomEventAction } from "../../lib/llm";
import { AIAssistant } from "./AIAssistant";
import { tracker } from "../services/tracker";
import { StatusAnalysisPanel } from "./StatusAnalysisPanel";
import { MobileGameShell, MobileMapView } from "./mobile/MobileGameShell";
import { ENABLE_DESKTOP_GAME_SIDEBAR } from "../gameUiFlags";
import { EVENT_BRANCHES, type EventBranchOption } from "../eventBranches";
import {
  createActionMemory,
  recordAction,
  recordEventOutcome,
  markGuaranteedTriggered,
  resetSemesterActions,
  recordMentorBetrayal,
  getCausalEvent,
  isGuaranteedHit,
  EVENT_META,
  type ActionMemory,
  type ActionId,
  type CausalStats,
} from "../eventMeta";
import {
  DesktopGameSidebar,
  DesktopMapPreview,
  DesktopComputerPreview,
  type DesktopGameSection,
  type ComputerInterviewItem,
  type ComputerInterviewQuestion,
  type ComputerInterviewPreparation,
  type ComputerInterviewAnswer,
} from "./DesktopGameSidebar";
import type { SocialState, NPCReplyOption } from "../npc/types";
import {
  createEmptySocialState,
  getBond,
  pushNpcOpening,
  applyPlayerReply,
  markAllRead,
  getMessagesFor,
  unreadCountFor,
  checkAllUnlocks,
  greetNpc,
  sendGreeting,
  stageLabelFor,
  // —— P0 对话树引擎 ——
  getActiveReplyOptions,
  advanceDialogue,
  checkTreeTriggers,
  resetChatsThisRound,
} from "../npc/socialStore";
import {
  setProfessorDisplayName,
  toneFromFavorability,
} from "../npc/npcRegistry";

// ================================================================
// SECTION 1: 数据层（所有数组，方便后续扩展）
// ================================================================

const SCHOOLS_BY_TIER: Record<number, string[]> = {
  4: ["清华大学", "北京大学"],
  3: ["同济大学", "东南大学", "湖南大学", "华中科技大学", "天津大学", "华南理工大学", "哈尔滨工业大学", "大连理工大学", "重庆大学", "西安建筑科技大学", "浙江大学"],
  2: ["北京建筑大学", "北京工业大学", "中央美术学院", "郑州大学", "苏州大学", "合肥工业大学", "西南交通大学", "河北工业大学"],
  1: ["安徽建筑大学", "深圳大学", "青岛理工大学", "沈阳建筑大学", "昆明理工大学", "南京工业大学", "烟台大学", "华侨大学"],
};

const OVERSEAS_SCHOOLS = [
  "哈佛大学", "麻省理工大学", "AA 建筑联盟学院",
  "代尔夫特理工大学", "苏黎世联邦理工", "哥伦比亚大学",
  "UCL Bartlett", "墨尔本大学", "新加坡国立大学",
  // 新增
  "剑桥大学", "牛津大学", "东京大学",
  "新加坡国立大学", "香港大学", "香港中文大学",
  "米兰理工大学", "瑞典皇家理工学院", "加泰罗尼亚理工大学"
];

const TIER_LABELS: Record<number, string> = {
  4: "TOP2",
  3: "985/老八校",
  2: "211 院校",
  1: "双非院校",
};

const TIER_COLORS: Record<number, string> = {
  4: "#f0c040",
  3: "#64b5f6",
  2: "#81c784",
  1: "#9e9e9e",
};

const SEMESTER_LABELS: Record<number, string> = {
  1: "研一·上学期", 2: "研一·下学期",
  3: "研二·上学期", 4: "研二·下学期",
  5: "研三·上学期", 6: "研三·下学期",
};

// ================================================================
// SECTION 2: 类型定义
// ================================================================

interface Stats {
  arch: number;        // 建筑专业力
  logic: number;       // 逻辑力
  expression: number;  // 表达力
  english: number;     // 英语能力
  structured: number;  // 结构化思维
  stress: number;      // 抗压值（越高越好）
  network: number;     // 人脉值
  money: number;       // 金钱
  selfDoubt: number;   // 自我怀疑（越低越好）
  ageAnxiety: number;  // 年龄焦虑（越低越好）
  mentorFavorability: number; // 导师好感度
}

type StatKey = keyof Stats;

const STAT_META: Record<StatKey, { label: string; positive: boolean; color: string }> = {
  arch: { label: "建筑专业力", positive: true, color: "#64b5f6" },
  logic: { label: "逻辑力", positive: true, color: "#4a9eff" },
  expression: { label: "表达力", positive: true, color: "#81c784" },
  english: { label: "英语能力", positive: true, color: "#4dd0e1" },
  structured: { label: "结构化思维", positive: true, color: "#7986cb" },
  stress: { label: "抗压值", positive: true, color: "#4caf50" },
  network: { label: "人脉值", positive: true, color: "#ffb74d" },
  money: { label: "金钱", positive: true, color: "#ffd54f" },
  selfDoubt: { label: "自我怀疑", positive: false, color: "#ef5350" },
  ageAnxiety: { label: "年龄焦虑", positive: false, color: "#e53935" },
  mentorFavorability: { label: "导师好感度", positive: true, color: "#f0c040" },
};

interface CharacterInfo {
  name: string;
  undergradTier: number;
  undergradSchool: string;
  masterTier: number;
  masterSchool: string;
  isOverseas: boolean;
}

type EffectValue = number | [number, number];

interface Action {
  id: string;
  label: string;
  emoji: string;
  description: string;
  effects: Partial<Record<StatKey, EffectValue>>;
  narratives: string[];
}

interface GameEvent {
  id: string;
  title: string;
  description: string;
  effects: Partial<Record<StatKey, EffectValue>>;
  condition?: (ctx: { stats: Stats; isOverseas: boolean; semester: number }) => boolean;
  repeatable?: boolean;
  type?: "positive" | "negative";
}

interface CampusEvent {
  id: string;
  companyName: string;
  title: string;
  description: string;
  condition?: (stats: Stats) => boolean;
  successCondition: (stats: Stats) => boolean;
  successBuff: Record<string, number>;
  successNarrative: string;
  failNarrative: string;
}

interface Company {
  id: string;
  name: string;
  category: string;
  thresholds: Partial<Stats>;
  description: string;
}

interface Ending {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  color: string;
  condition: (stats: Stats) => boolean;
}

interface GameResultDistribution {
  total: number;
  endings: Array<{ title: string; count: number }>;
  offers: Array<{ name: string; count: number }>;
}

interface GameResultDistributionRow {
  ending_title: string | null;
  offer_name: string | null;
}

// ================================================================
// SECTION 3: 行动数据
// ================================================================

const ACTIONS: Action[] = [
  {
    id: "revise",
    label: "改图",
    emoji: "📐",
    description: "死磕图纸，建筑专业力大幅提升，但消耗精力",
    effects: { arch: 8, stress: -6, selfDoubt: 3, ageAnxiety: 2, mentorFavorability: [2, 5] },
    narratives: [
      "你又开了一夜的图。天亮前保存文件的那一刻，有一种说不清是成就感还是麻木的东西。",
      "导师说线条不够干净，你删掉重画了三遍。最后一遍完成时，窗外已经开始堵车了。",
      "你盯着屏幕上的平面图，想到这张图可能最终会变成一栋真实的建筑，又想到自己可能永远不会住在里面。",
    ],
  },
  {
    id: "product",
    label: "学产品",
    emoji: "💡",
    description: "系统学习产品思维，逻辑力与结构化思维显著提升",
    effects: { logic: 7, structured: 7, expression: 2, arch: -2, mentorFavorability: -1 },
    narratives: [
      "你读完了《用户体验要素》，开始觉得PRD和建筑图纸其实有点像——都是在帮别人建造一个他们说不清楚想要的东西。",
      "你把产品课和建筑课放在一起比较，发现空间动线分析和用户流程图可以用同一套语言描述。这让你安心了一些。",
      "你在图书馆看了四十个产品案例分析，第一次感觉脑子里的齿轮开始咬合。",
    ],
  },
  {
    id: "internship",
    label: "投实习",
    emoji: "📮",
    description: "筛选岗位、选择渠道并投出简历，结果将在下一回合更新",
    effects: { expression: 2, network: 1, stress: -2, selfDoubt: 2, mentorFavorability: [-4, -2] },
    narratives: [
      "你在Boss直聘上刷新了二十七次，最终投出了八份简历，然后等待。等待的感觉像是把自己折叠成纸飞机，扔进黑暗里。",
      "你修改了第十七版简历，把建筑项目经历改得更像互联网的语言，心里有一种说不清是进化还是失去的感觉。",
      "你参加了一轮视频面试，面试官盯着你的教育背景问了好几次为什么转行。你挂掉电话后不知道自己说了什么。",
    ],
  },
  {
    id: "campus",
    label: "参加校招",
    emoji: "🏢",
    description: "踏入秋招的战场，表达力在每一次群面中锤炼，但年龄焦虑像背景噪音，随着每一次失败逐渐放大。",
    effects: { expression: 6, network: 3, selfDoubt: -5, ageAnxiety: 4 },
    narratives: [
      "你排在面试队伍里，发现周围的CS同学都比你年轻三岁，他们说话时提到的技术栈像外星语一样在你耳边嗡嗡作响。你低头看了看自己的简历，上面'建筑学硕士'五个字像一道无形的墙，把你和他们隔开。你突然想起三年前，你还在为了一张图纸的细节和同学争论到深夜，而现在，你在这里，像一个走错片场的演员，连台词都背不熟。",
      "你穿着正装站在宣讲会的角落，布料摩擦皮肤的感觉像一种温柔的刑罚。听着HR介绍公司文化，那些'扁平化管理'、'快速迭代'的词汇像雨点一样打在你身上，你却感觉不到任何湿润。你想到自己的建筑图纸，那些精心绘制的线条和阴影，和这个场景毫无关联。你开始怀疑，自己是不是在用一个错误的坐标系，测量一个不属于你的世界。",
      "群面结束，小组里有个本科就开始做产品的同学全程侃侃而谈，他的每一个观点都像一把精准的手术刀，切开问题的核心。你努力在他说话的间隙插进自己的观点，声音却像被吸进了黑洞，连回音都没有。散场时，你看着他被HR留下单独交谈的背影，突然明白了一件事：在这个赛道上，你不仅起跑晚了，连跑道都是自己临时画的。",
    ],
  },
  {
    id: "ielts",
    label: "准备雅思",
    emoji: "📚",
    description: "投入英语备考，英语能力大幅提升，消耗金钱和抗压值",
    effects: { english: 9, money: -6, stress: -3, mentorFavorability: -4 },
    narratives: [
      "你在图书馆背完了一整本单词书，耳机里循环着BBC新闻，那些标准的英音像一条冰冷的河流，冲刷着你的耳膜。背到'desolate'的时候突然停住了，这个单词的发音让你想到了某种心情——那种荒芜的、被遗弃的感觉，像极了你看待自己建筑梦想时的眼神。你盯着书页上那个单词，它的释义是'荒凉的，无人烟的'，你突然想，是不是你的未来也会这样，被某种看不见的力量遗弃在时间的荒野里。",
      "你报了雅思培训班，每周六早八点上课。教室里的空气混合着咖啡和青春的气息，周围大多是准备出国的大三学生，他们谈论着GPA和推荐信，眼神里闪烁着你对未来已经失去的那种光芒。你感觉自己像一个时间线错乱的人，明明应该在这个年纪规划职业，却在这里重新学习一门语言，为了一个可能根本不存在的海外岗位。课间休息时，你看着窗外飞过的鸽子，突然想知道，它们是不是也觉得自己飞错了方向。",
      "模拟考成绩出来，比上次高了0.5分。你盯着那个数字，它像一个小小的嘲讽，悬在屏幕上。你不确定它是进展还是讽刺——花了整整一个月，每天六点起床背单词，换来的只是这0.5分的进步。你想起建筑系馆门口那句'安得广厦千万间'，现在你连一个雅思6.5都'安得'如此艰难。这种对比像一根细小的刺，扎进你心里最柔软的地方，让你连呼吸都带着痛感。",
    ],
  },
  {
    id: "sidejob",
    label: "做副业",
    emoji: "💰",
    description: "接外包赚生活费，金钱+10，顺带积累人脉和逻辑力",
    effects: { money: 10, network: 3, logic: 2, mentorFavorability: [-5, -2] },
    narratives: [
      "你接了几个CAD图纸的外包，钱不多，但够下个月的房租。在接单平台上你的头像是一张没有人脸的建筑剖面图，那些复杂的线条和标注像一座迷宫，把你和真实的自己隔开。你画着别人的梦想之家，手指在鼠标上滑动，心里却想着，什么时候能画一张属于自己的平面图，哪怕只是一间十平米的出租屋。夜深了，你保存文件，收到平台打款的提示音，那声音清脆得像一个耳光，提醒你这是你用建筑技能换来的生存，而不是生活。",
      "你帮一个小公司做了竞品分析报告，他们说你'思路很清晰'。你不知道这算不算夸你，还是夸你脱离了建筑。你盯着那封邮件，感觉每一个字都在轻轻摇晃你的身份认同——你曾经是那个为了一个窗洞比例纠结三天的人，现在却因为'思路清晰'被称赞。这种转变像一场安静的叛变，你背叛了过去的自己，却不知道新的自己到底是谁。",
      "你开了一个建筑转行经验分享的公众号，断断续续写了几篇，有个留言说：'终于看到有人写出了我的感受。'你盯着那条留言看了很久，屏幕的光映在你脸上，像在举行某种秘密的仪式。你突然意识到，你的痛苦不是孤独的，它像一种传染病，在无数建筑生之间无声蔓延。你回复了一个'抱抱'的表情，然后关掉页面，因为你不知道除了抱抱，你还能给他们什么——你连自己的出路都还没找到。",
    ],
  },
  {
    id: "gifts",
    label: "送礼献殷勤",
    emoji: "🎁",
    description: "给导师送点特产或小礼物，试图缓和关系，但钱包会痛。",
    effects: { money: -10, ageAnxiety: [-8, -5], selfDoubt: [-5, -2], mentorFavorability: 5 },
    narratives: [
      "你给导师带了一盒家乡的茶叶，包装纸沙沙作响，像你此刻的心跳。他笑着收下了，说了句'有心了'，那三个字轻飘飘的，却在你心里砸出一个坑。你感觉他看你的眼神温和了一些，那种温和像冬日的阳光，看起来温暖，实则隔着厚厚的玻璃。你走出办公室，手里攥着空了的茶叶盒，突然想起这盒茶叶是你妈特意寄来的，她说'给导师带点心意'，你没告诉她，这盒茶叶花了你一周的饭钱。",
      "你趁着教师节给导师发了个红包，金额不大，但足够让你心疼。他没收，那个红色的'已拒绝'像一个小小的羞辱，烙在聊天界面上。但第二天组会上，他对你的论文提了几条中肯的建议，每一条都像一把钥匙，打开了你卡住很久的锁。你一边记录一边想，这算不算一种交易——用尊严换指导，用焦虑换进步。",
      "你送了一本导师最近在研究的领域的原版书，书很厚，价格也很厚。他翻了翻说'这书不错'，手指在封面上停留了几秒，那几秒里你感觉时间被拉长了，像一根橡皮筋。你感觉到他对你的好感似乎增加了，那种增加像温度计上上升的水银柱，缓慢但可见。你走出书店，看着银行卡余额，突然想，原来好感度是可以量化的，就像建筑图纸上的尺寸，多一毫米少一毫米，结果完全不同。",
      "你请导师在学校附近的咖啡馆喝了一杯，聊了一个小时的人生。他谈到他年轻时的学术理想，你谈到你对未来的迷茫，两种话题像两条平行线，永远无法相交。结账时你抢着付了钱，虽然有点心疼，但焦虑似乎减轻了。走出咖啡馆，你看着他的背影消失在夜色里，突然明白，这场对话就像这杯咖啡——昂贵，提神，但终究会凉。",
    ],
  },
  {
    id: "slack",
    label: "摆烂",
    emoji: "🛋️",
    description: "彻底躺平一学期，短期抗压回复，但自我怀疑和焦虑激增",
    effects: { stress: 8, selfDoubt: -4, ageAnxiety: -10, arch: -2, logic: -2, expression: -2, structured: -2, mentorFavorability: [-5, -2] },
    narratives: [
      "你关上电脑，躺平了整整一个学期，刷短视频，睡到自然醒，什么都不想。你像一株被连根拔起的植物，暂时搁置在水泥地上，假装自己还能活。到了期末，你发现什么都没变，除了你的焦虑变得更具体了——它不再是一种模糊的恐惧，而是一张张待付的账单、一封封未回的邮件、一条条越来越近的截止日期。你看着镜子里那个眼神涣散的人，突然想，这算不算一种慢性自杀，用懒惰当刀，用时间当砧板。",
      "你告诉自己这叫'战略性休整'。你刷完了三部剧，无数条关于'转行'的知乎回答。屏幕的光像毒品一样喂进你的眼睛，你贪婪地吸收那些别人的故事，试图在里面找到自己的影子。你没有找到答案，只找到更多的问题——为什么他们都看起来那么坚定，为什么只有你在原地打转？你关掉页面，房间里一片漆黑，只有路由器上的小红灯像一只眼睛，冷冷地看着你。",
      "你发了一条朋友圈说'顺其自然'，配图是一张窗外的云。然后你在凌晨两点盯着天花板思考人生，那些石膏线条像一道道数学题，你解不开。你想起本科时，你曾经为了一个设计概念熬夜查资料，那时候的你相信'努力就有回报'。现在你连努力的方向都找不到，只能'顺其自然'，而这四个字像一块遮羞布，盖住你所有的无力感。你拿起手机，删掉了那条朋友圈，因为你知道，有些伤口不适合展览。",
    ],
  },
];

// ================================================================
// SECTION 4: 随机事件（44条）
// ================================================================

const EVENTS: GameEvent[] = [
  {
    id: "e01", title: "导师催稿",
    description: "凌晨一点十七分，手机在枕头边震动。你眯着眼睛划开，导师的微信只有八个字：‘明天早上九点，初稿发我。’你盯着天花板看了五分钟，然后爬起来打开电脑。屏幕亮起的瞬间，你发现窗外对面那栋宿舍楼，还有三扇窗户也亮着同样的CAD暖光。你们隔着黑暗遥遥相望，像一群守夜的灯塔管理员。",
    effects: { arch: 5, stress: -8, selfDoubt: 5 },
    type: "negative",
  },
  {
    id: "e02", title: "同门拿到字节实习",
    description: "同门在群里发了一张字节跳动产品实习的offer截图，配文‘终于上岸了’，后面跟着二十个‘牛啊’。你盯着那张图看了很久，放大、缩小、再放大，试图从那些像素里找到一点自己未来的形状。你点了一个赞，然后关掉微信，继续改那张改了八遍的平面图。CAD里那个房间的尺寸是3.6米×4.2米，你不知道谁会在里面生活，就像你不知道三个月后的自己在哪个工位里生活。",
    effects: { selfDoubt: 8, ageAnxiety: 5 },
    type: "negative",
  },
  {
    id: "e03", title: "面试官质疑转行背景",
    description: "视频面试进行到第十五分钟，面试官把眼镜往上推了推，看着你的简历说：‘你学建筑的，做产品能行吗？’你开始解释空间思维如何迁移到信息架构，剖面图如何对应层级逻辑，他说‘嗯嗯’的时候眼睛在看屏幕的另一个角落。挂掉电话后你发现手心里全是汗，窗外的阳光刺眼得有点不真实。你想起本科第一次交大作业时，老师也问过类似的问题：‘你觉得自己真的适合学建筑吗？",
    effects: { expression: -3, selfDoubt: 7 },
    type: "negative",
  },
  {
    id: "e04", title: "论文AIGC查重超标",
    description: "新版知网查重报告弹出来的时候你正在吃泡面。28%，红色的数字像医院化验单上的异常指标。导师的邮件紧随其后，加粗的四个字：‘全部重写。’你把泡面推到一边，盯着那篇写了两个月的论文，发现里面的每一句话都像是从某个你崇拜的学者那里偷来的，包括那些你以为自己原创的思考。窗外的天黑得很慢，你知道这又是一个睡不着的夜晚。",
    effects: { arch: -3, stress: -10, ageAnxiety: 5 },
    type: "negative",
  },
  {
    id: "e05", title: "学长延毕",
    description: "刷朋友圈时看到学长发了一条：‘多留一年，也许是礼物。’配图是他工位上的模型残骸和一盆快死的绿萝。评论区全是表情包，没有人说话。你盯着那条动态看了很久，想起去年他还在组会上分享自己的论文进度，意气风发地说‘明年这时候就毕业了’。你关掉手机，打开论文，光标在第一章标题后面一闪一闪，像一个倒计时的钟。",
    effects: { ageAnxiety: 8, selfDoubt: 6 },
    type: "negative",
  },
  {
    id: "e06", title: "第十八封拒信",
    description: "邮箱提示音响起的时候你正在改图。点开一看：‘感谢您的投递，经综合评估，您的情况与我们的需求暂不匹配。’这是你今天的第二封，也是这个月的第十八封。你把邮件截图，发到只有三个人的小群里，群里沉默了三分钟，然后有人发了一个‘抱抱’的表情包。你关掉邮箱，继续画那条被导师说‘不够干净’的轴线。CAD里那条线是直的，你不知道自己还能不能走出一条直的路。",
    effects: { selfDoubt: 7, expression: -2 },
    type: "negative",
  },
  {
    id: "e07", title: "凌晨三点改图",
    description: "凌晨三点十七分，你终于把图纸调整到自己满意的状态，正准备保存然后睡觉。群里突然弹出一条消息，是导师：‘这个轴线比例不对，明天早上九点我要看新版本。’你盯着那行字看了十秒，然后默默把刚闭合的CAD文件重新打开。屏幕的光映在脸上，你发现镜子里的人眼眶有点红。你想发一条朋友圈，打了几个字又删掉，最后什么都没发。",
    effects: { stress: -12, arch: 4 },
    type: "negative",
  },
  {
    id: "e08", title: "导师让做私活",
    description: "导师把你叫到办公室，说手上有个地产项目的方案，让你帮忙做一下，‘算是练练手，当实践机会’。稿费两个字他提都没提。你点头说好，回到工位打开CAD，心想这大概就是行业里说的‘用作品换作品’。做到一半你发现自己比做自己的课题还认真，因为你知道这个方案可能会真的建成，而你自己的论文可能永远只停留在PDF里。",
    effects: { arch: 5, stress: -6, money: 6 },
    type: "negative",
  },
  {
    id: "e09", title: "JD写着'优先985'",
    description: "秋招季的第一天，你满怀希望地打开招聘网站，却发现所有心仪的岗位JD上都刺眼地标注着'985优先'。你的手指在鼠标上停顿了足足十秒，仿佛那四个字符是某种无法逾越的审判。你想起七年前高考放榜的那个下午，父母眼中一闪而过的失望，如今化作屏幕上一行冰冷的文字。你关掉页面，房间里只剩下显示器微弱的光映在你脸上，像一场无声的葬礼。",
    effects: { selfDoubt: 6, ageAnxiety: 4 },
    type: "negative",
  },
  {
    id: "e10", title: "海归抢同一岗位",
    description: "LinkedIn上突然弹出一个新动态：一个在硅谷工作两年的海归回国了，开始和你投同一批岗位。你点开他的简历，全英文的履历像一面镜子，照出你所有的不安——他有Google实习，你有熬夜改图；他有顶会论文，你有课程作业；他24岁，你25岁。最扎心的是，他的个人简介里写着'热爱探索跨领域创新'，而你的简历上还挂着'建筑专业力85'。你默默关掉页面，感觉自己的青春像被压缩成了一行行苍白的对比项。",
    effects: { selfDoubt: 8, ageAnxiety: 5 },
    condition: ({ isOverseas }) => !isOverseas,
    type: "negative",
  },
  {
    id: "e11", title: "HC冻结",
    description: "你通过了五轮面试，最后一轮面试官微笑着对你说'期待共事'。你等了整整三周，每天刷新邮箱一百次。终于，HR的邮件来了，内容却让你心脏骤停：'由于业务调整，该岗位的HC暂时冻结，后续有进展会再联系您。'你盯着'冻结'两个字，感觉自己的职业生涯也被一同冻在了这个冰冷的春天。你回复'好的，谢谢'，然后盯着屏幕发呆，直到夜幕降临，房间里只剩下电脑散热器发出的微弱嗡鸣，像是某种哀鸣。",
    effects: { selfDoubt: 10, ageAnxiety: 8 },
    type: "negative",
  },
  {
    id: "e12", title: "实习工资不够房租",
    description: "终于拿到实习offer，你兴奋地打开邮件，却看到月薪比你预期低了40%。你不死心，在地图上搜索公司附近的合租房，发现最便宜的单间也要押二付一。计算器敲下来，扣完房租每月只剩不到800块——刚好够吃饭，但不够买任何希望。你想起父母说'实习不要太计较工资，重要的是学习'，但你不知道该怎么告诉他们，在这个城市，连生存都成了需要精密计算的建筑学问题。",
    effects: { money: -6, selfDoubt: 5 },
    type: "negative",
  },
  {
    id: "e13", title: "导师不让去实习",
    description: "组会上，你鼓起勇气提出想去实习，导师放下手中的论文，目光扫过会议室里每一个人的脸，最后定格在你身上：'你们还是以科研为主，不要总想着出去实习。你们来读研究生是为了做学问的。'他的声音不大，却像一堵墙压下来。会议室里死一般寂静，你能听到自己心跳的声音。你低下头，看着笔记本上画了一半的产品流程图，感觉那些线条正在一点点褪色，变回CAD里冰冷的轴线。",
    effects: { stress: -8, selfDoubt: 6 },
    type: "negative",
  },
  {
    id: "e14", title: "家里催问出路",
    description: "电话那头，母亲的声音带着小心翼翼的试探：'你同学都找到工作了，你到底有什么打算？学建筑的不是很好找工作吗？'你看着窗外，夕阳把天空染成了一种温暖的橘红色，但你只觉得冷。你想起八年前高考填志愿的那个下午，你指着建筑学专业说'我想设计让人幸福的空间'。如今，你连自己的空间都设计不了。你轻声说'再给我一点时间'，挂掉电话后，你在窗前站了很久，直到夜色吞没最后一丝光亮。",
    effects: { ageAnxiety: 10, selfDoubt: 7 },
    type: "negative",
  },
  {
    id: "e15", title: "设计院朋友圈",
    description: "深夜刷朋友圈，看到前辈晒了一张凌晨三点在设计院工位的照片——屏幕上是密密麻麻的施工图，旁边摆着一杯冷掉的咖啡。配文：'用青春换作品。'点赞列表里全是设计院的同事，一个个熟悉的头像像是一场无声的集体献祭。你盯着那张照片看了很久，突然想起本科时老师说的'建筑是凝固的音乐'，现在你只觉得，那音乐听起来像是熬夜后心脏不规律的跳动声。你点了赞，然后关掉手机，继续改你的产品原型图。",
    effects: { selfDoubt: 5, arch: 3 },
    type: "negative",
  },
  {
    id: "e16", title: "雅思5.5",
    description: "雅思成绩出来了，5.5。你需要至少6.5才能申请那些海外岗位。你盯着屏幕上那个数字，感觉它像一个巨大的嘲讽——你花了三个月，每天早起背单词，晚上练听力，结果只进步了0.5。你在退考政策页面停留了很久，鼠标在'申请退考'按钮上悬停，最终却点击了'重新报名'。支付成功的提示音响起时，你感觉那不是一笔考试费，而是为自己迟迟无法突破的瓶颈缴纳的赎金。",
    effects: { english: -5, selfDoubt: 8, ageAnxiety: 5 },
    condition: ({ stats }) => stats.english < 65,
    type: "negative",
  },
  {
    id: "e17", title: "认识转行学长",
    description: "在转行交流群里，你鼓起勇气加了一个已经成功转产品的学长。他毕业于同济，现在在网易做PM。通过好友验证后，他第一句话是：'建筑转产品？我懂。'然后发来一份整理好的备考资料，足足有3个G。你点开文件夹，看到里面分门别类地写着'产品方法论''面试真题''建筑思维迁移案例'。你盯着屏幕，突然鼻子一酸——这是你转行以来第一次，感觉有人真正理解你走过的每一步荆棘。",
    effects: { network: 8, logic: 3, selfDoubt: -6 },
    type: "positive",
  },
  {
    id: "e18", title: "线下产品沙龙",
    description: "你参加了一个线下产品沙龙，场地不大，但挤满了人。你鼓起勇气和三个互联网从业者聊天，其中一个居然是你上次面试官的前同事。你们交换了五张名片，你的手指有些颤抖——那些小小的卡片握在手里，沉甸甸的，像是握住了某种可能性。散场时，你站在地铁口，看着城市的霓虹灯，第一次感觉自己像一个可以有选择的人，而不是被选择的对象。",
    effects: { network: 10, expression: 4, selfDoubt: -4 },
    type: "positive",
  },
  {
    id: "e19", title: "知乎热帖",
    description: "深夜，知乎推送了一条热帖：'建筑生转行失败，现在35岁失业在家'。你鬼使神差地点进去，把楼主三千字的自述看了三遍，又把所有高赞评论都读了一遍。评论区像一面照妖镜，映出无数个可能的你——有人转行产品三年被裁，有人考公失败，有人创业负债。最扎心的一条评论是：'这不是个例，这是我们这代建筑生的集体命运。'你关掉页面，房间里一片漆黑，只有手机屏幕的光映在你脸上，像在审判一个还未发生的未来。",
    effects: { ageAnxiety: 12, selfDoubt: 8 },
    type: "negative",
  },
  {
    id: "e20", title: "竞品分析全组分享",
    description: "你做的竞品分析PPT被实习导师拿去在全组分享。三十多人的会议室里，他指着你的逻辑框架说：'这个结构很清晰，大家可以学习一下。'你坐在后排，手指紧紧攥着衣角，感受到一种陌生的、安静的骄傲——这是你转行以来第一次，不是因为'建筑背景'被特殊看待，而是单纯因为'做得好'被认可。散会后，有同事过来问你：'你是学建筑的？这思维太产品了。'你笑了笑，心里某个紧绷了很久的弦，突然松了一点点。",
    effects: { logic: 5, expression: 6, selfDoubt: -8, network: 3 },
    type: "positive",
  },
  {
    id: "e21", title: "导师消失两周",
    description: "导师已经两周没回消息了。论文进度完全停滞，你发了四条微信，每条都显示'已读'，但石沉大海。你盯着聊天界面，那四个绿色的'已读'标记像四只冷漠的眼睛，看着你在焦虑中一点点沉没。你不确定应该继续等，还是假装这段时间根本不存在——就像建筑图纸上那些被擦掉的辅助线，从未存在过，却留下无法忽视的痕迹。",
    effects: { arch: -5, stress: -10, ageAnxiety: 7 },
    type: "negative",
  },
  {
    id: "e22", title: "开题被毙",
    description: "开题报告被导师当场毙掉，会议室里空气凝固。他说：'方向不对，重新想。'五个字，像五颗钉子把你钉在椅子上。你在宿舍里坐了两个小时，窗外有人在踢球，欢呼声一阵阵传来，你听着球鞋踩地的声音，什么都没有想，或者说，想了太多以至于大脑一片空白。你突然想起本科设计课第一次被老师否定方案时，你还能倔强地重来，现在你只觉得累，累到连失望都显得奢侈。",
    effects: { arch: -3, selfDoubt: 9, ageAnxiety: 5 },
    type: "negative",
  },
  {
    id: "e23", title: "身体亮红灯",
    description: "连续熬夜两个月后，身体终于亮起红灯。校医院医生看着化验单，眉头微皱：'要注意休息，你的肝功能指标有几项偏高。'你付了128块检查费，走出医院，看着天空，觉得那片蓝色遥远得不像真的。你想起上周还在熬夜改图，为了一个转角细节纠结了三小时，现在突然觉得可笑——你连自己的身体健康都设计不好，却在为一个虚拟空间的完美而拼命。",
    effects: { stress: -15, money: -4 },
    type: "negative",
  },
  {
    id: "e24", title: "大厂学长指导",
    description: "一个大厂PM学长主动联系你，给你做了整整一小时的简历修改，还模拟了一轮面试。结束时他说：'你有一种建筑生特有的结构感，这是真正稀缺的东西，不要把它当作包袱。'你盯着屏幕，突然眼眶发热——这是你转行以来第一次，有人告诉你那六年建筑学习不是浪费，而是一种独特的资产。你第一次觉得，也许那些熬夜画的图、那些被否定的方案、那些自我怀疑的夜晚，都没有白费。",
    effects: { expression: 8, logic: 5, network: 6, selfDoubt: -10 },
    type: "positive",
  },
  {
    id: "e25", title: "毕业晚会",
    description: "建筑学院毕业晚会，你看着同学们情绪各不相同，有人说'终于出去了，老娘等这一天等得好苦啊！！！'，有人说'还会再见吗?燕子，再见的时候你要幸福，好不好，燕子，你要开心，你要幸福，好不好，开心啊，幸福。你的世界没有我了，没关系，你要自己幸福。燕子、燕子、燕子，没有你我怎么活呀……'。你站在人群边缘，不确定自己属于哪一种人。",
    effects: { selfDoubt: 5, arch: 3 },
    condition: ({ semester }) => semester >= 5,
    type: "negative",
  },
  {
    id: "e26", title: "拿到事务所实习",
    description: "你同时拿到了OMA和Zaha Hadid建筑事务所的暑期实习，虽然不是目标方向，但能够走进那个你未来无数次向往的办公室，你还是有点激动。阳光从高窗洒下来，照在那些模型和图纸上，你觉得这才是你想象中的建筑。带你的建筑师说：‘你的空间感很好。’你笑了，心想：终于有人说我好了。",
    effects: { arch: 8, money: 6, network: 4 },
    type: "positive",
  },
  {
    id: "e27", title: "改版方案全场最高分",
    description: "你做的APP改版方案在实习汇报上拿了全场最高分。大家鼓掌的时候，你突然想到，这大概是你第一次因为一个屏幕里的东西被肯定。散会后有人问你：‘你之前学建筑的？怎么想到做这个？’你说：‘可能因为建筑太慢了，我想做点快的东西。’",
    effects: { logic: 6, expression: 8, selfDoubt: -12 },
    type: "positive",
  },
  {
    id: "e28", title: "战友回归建筑",
    description: "转行群里一个认识半年的战友突然宣布：‘想清楚了，还是回建筑吧。’他说自己不适合互联网的节奏，还是喜欢画图的感觉。你盯着他的消息，感觉一种不明来源的恐惧悄悄放大。你想起他之前和你一样，每天在群里打卡学产品。现在他退出了，你还在群里。",
    effects: { selfDoubt: 10, ageAnxiety: 6 },
    type: "negative",
  },
  {
    id: "e29", title: "互联网裁员新闻",
    description: "看到新闻：某大厂宣布校招缩减40%，优化部分业务线。评论区里有应届生问：'那我们怎么办？'置顶的回复说：'先活着再说。'",
    effects: { ageAnxiety: 10, selfDoubt: 6 },
    type: "negative",
  },
  {
    id: "e30", title: "家里表示支持",
    description: "爸妈说：'不管你去哪，我们支持你，别给自己太大压力。'你挂掉电话，在门口站了一会儿，感觉有什么东西松动了，但不知道是好是坏。",
    effects: { selfDoubt: -10, ageAnxiety: -5, stress: 8 },
    type: "positive",
  },
  {
    id: "e31", title: "失眠连续一周",
    description: "连续一周，你每天睡眠不足五小时。闭上眼睛，不是梦见在改图，就是在一个没有尽头的走廊里找一扇永远打不开的门。早上醒来，镜子里的人眼眶深陷，眼睛里布满了红血丝，像一张被过度渲染的效果图。你想起本科时老师说'建筑是时间的艺术'，现在你觉得，时间正在用最残酷的方式雕刻你——不是用灵感，而是用失眠、焦虑和一个个熬不到头的深夜。",
    effects: { stress: -10, selfDoubt: 5, ageAnxiety: 3 },
    type: "negative",
  },
  {
    id: "e32", title: "GPA不达标",
    description: "你偶然发现自己的均绩只有3.2，而心仪的大厂要求3.5以上。你重新看了一遍成绩单，把每一门课的分数都记在纸上，像是在进行某种考古挖掘——试图从这些数字里找到自己为何沦落至此的证据。你发现，那些得了A的建筑设计课，现在对你转行毫无帮助；而那些勉强及格的编程课，却是你此刻最需要的。你盯着那张纸，感觉它像一份判决书，宣告你过去六年的努力方向全是错的。",
    effects: { selfDoubt: 8, ageAnxiety: 4 },
    type: "negative",
  },
  {
    id: "e33", title: "Hackathon二等奖",
    description: "连续48小时的Hackathon结束后，你和两个CS同学一起站在领奖台上，聚光灯刺得你睁不开眼。当主持人宣布你们获得二等奖时，你身边的同学兴奋地撞了撞你的肩膀，低声说：'你那用户旅程图画得比我们所有人都好太多了，简直像在解构一座建筑。'你看着屏幕上自己画的那些线条，突然意识到这可能是你六年来第一次，不是因为'建筑'被质疑，而是因为'建筑'被赞美。掌声中，你感觉眼眶有点发热，不知道是因为熬夜，还是因为某种迟来的肯定。",
    effects: { logic: 8, network: 7, expression: 5, selfDoubt: -7 },
    type: "positive",
  },
  {
    id: "e34", title: "HR嫌缺乏互联网经验",
    description: "面试间里，HR翻看着你的简历，手指在'建筑学硕士'那一行停留了足足五秒。她抬起头，露出职业化的微笑：'你的背景挺有意思，但我们这个岗位更需要有互联网实操经验的。'你鼓起勇气追问：'您觉得什么样算互联网经验？'她愣了一下，眼神飘向窗外，仿佛在寻找一个不存在的定义，最后轻声说：'就是比较实际的那种。'那一刻你明白了，'实际'两个字像一道无形的墙，把你和那个世界隔开。你点点头，说了声谢谢，走出会议室时，感觉自己的六年青春像一张被揉皱的草图纸，上面写满了'不实际'。",
    effects: { selfDoubt: 8, expression: -2 },
    type: "negative",
  },
  {
    id: "e35", title: "转行分析文章爆了",
    description: "深夜，你将自己对建筑行业转型困境的思考写成文章，点击了发布。三天后，你打开平台，发现那篇文章被转发了上千次，评论区挤满了建筑生的留言：'终于有人把这件事说清楚了'、'每一个字都在写我'、'这是我们这代人的集体困境'。私信框里闪烁着二十几条未读消息，有人向你倾诉自己的迷茫，有人问你该怎么办。你看着那些陌生的头像，突然感到一种沉重的责任——你不仅写出了他们的痛苦，也点燃了他们微弱的希望。你关掉页面，坐在黑暗里，第一次意识到，你的文字可以成为别人的光，但你自己，却还在黑暗中摸索出路。",
    effects: { expression: 8, network: 8, selfDoubt: -8 },
    type: "positive",
  },
  {
    id: "e36", title: "与导师关系恶化",
    description: "组会上，你对导师的方案提出了一个谨慎的质疑。会议室里的空气瞬间凝固，导师脸上的笑容像石膏一样僵住。他没有反驳你，只是点了点头，说'我们再研究研究'。但从那天起，他不再在微信上回复你的消息，组会上的眼神也总是跳过你。你发现，那些原本属于你的任务，开始悄悄流向同门的工位。你坐在实验室的角落，看着他们忙碌的背影，感觉自己像一个被遗忘的构件，从精心设计的结构中脱落，无声地滚落到黑暗的角落。",
    effects: { stress: -8, selfDoubt: 7, network: -4 },
    type: "negative",
  },
  {
    id: "e37", title: "HR环节被卡学历背景",
    description: "你熬过了五轮笔试和业务面，最后一轮面试官甚至和你聊了半小时建筑与产品的哲学。当你以为终于要上岸时，HR的邮件像一盆冰水浇下来：'综合评估后，认为您的学术背景与该岗位目前的需求存在差距。'你盯着那行字，反复咀嚼每一个词——'学术背景'、'需求'、'差距'。你突然笑了，笑得有些凄凉，原来'建筑'两个字，在这句话里连出现的资格都没有，它被优雅地包裹在'学术背景'这个温柔的棺木里，埋葬了你所有的努力。你关掉邮箱，窗外的城市灯火辉煌，却没有一盏灯为你而亮。",
    effects: { selfDoubt: 12, ageAnxiety: 6 },
    type: "negative",
  },
  {
    id: "e38", title: "外企学姐复盘",
    description: "咖啡厅里，学姐轻轻搅动着拿铁，目光锐利地看着你：'我知道你在想什么——你觉得那六年建筑学是浪费，是包袱。但你知道吗？在我眼里，那是你最锋利的武器。'她顿了顿，'问题是你还没学会怎么讲这个故事。'她的话像一把钥匙，突然打开了你心里某个锈死的锁。你看着窗外行色匆匆的人群，第一次意识到，也许你需要的不是抛弃过去，而是重新定义它。咖啡凉了，但你的手心却开始发热。",
    effects: { expression: 6, logic: 5, english: 4, network: 7, selfDoubt: -12 },
    condition: ({ stats }) => stats.english >= 45,
    type: "positive",
  },
  {
    id: "e39", title: "错过暑期实习窗口",
    description: "你在实验室熬了整整一个暑假，改完了导师要的最后一版图纸。当你终于保存文件，揉着酸痛的脖子看向日历时，才发现已经错过了所有头部公司的暑期实习申请截止日期。你不死心，刷新招聘网站，却发现连最后的补录名额也变成了灰色。你重新打开那些曾经收藏的岗位链接，一个个'已结束'的标签像墓碑一样排列在屏幕上。你靠在椅背上，实验室的空调嗡嗡作响，你突然感觉这个夏天就像你的人生——你在埋头画图的时候，世界已经悄悄关上了所有的门。",
    effects: { arch: 8, logic: -5, selfDoubt: 8, ageAnxiety: 7 },
    type: "negative",
  },
  {
    id: "e40", title: "课题组方向变更",
    description: "组会上，导师轻描淡写地宣布：'课题组的研究方向要调整，之前的工作暂时搁置。'你花了两个月时间收集的数据、写的代码、画的图表，在他一句话里变成了废纸。你抬起头，想说什么，却看见他平静的目光：'学术研究就是这样，要有归零的勇气。'你张了张嘴，最终只是点了一下头。散会后，你坐在空荡荡的实验室里，看着屏幕上那些再也用不上的文件，突然想起本科时老师说'建筑是百年大计'，现在你明白了，学术研究不是百年大计，而是一场随时可能被推倒重来的沙盘游戏，而你的青春，是其中最容易被抹去的沙粒。",
    effects: { arch: -5, stress: -15, selfDoubt: 10, ageAnxiety: 8 },
    type: "negative",
  },
  {
    id: "e41", title: "收到第一个面试通知",
    description: "邮箱里终于弹出了一封面试通知，虽然只是一家名不见经传的小公司，但你的心跳还是漏了一拍。那天晚上，你久违地睡了一个好觉，没有梦见改图，没有梦见面试官质疑的脸。你梦见自己走进了一个明亮的办公室，里面的人都微笑着朝你点头，仿佛你本就属于那里。醒来时，天还没亮，你盯着天花板，第一次允许自己相信，也许这条漫长的隧道，终于能看到一点点光了，哪怕那光还很微弱，还很遥远。",
    effects: { selfDoubt: -8, expression: 4 },
    type: "positive",
  },
  {
    id: "e42", title: "非CS转行分享会",
    description: "你走进那间拥挤的教室，看到座位上坐满了和你一样神情紧绷的脸——建筑系的、艺术系的、中文系的，你们像一群误入科技丛林的书生。当第一个分享者说'我也曾以为自己是异类'时，你听到周围有人轻轻吸气。那一刻，你突然意识到，原来孤独从来不是一个人的专利，它可以是一场集体的沉默。散会时，你们交换了联系方式，没有人说'加油'，但你们都知道，彼此的存在本身就是一种无声的支撑。走出教学楼，晚风很凉，但你感觉心里某个角落，悄悄升起了一丝温度。",
    effects: { network: 5, selfDoubt: -7, expression: 3 },
    type: "positive",
  },
  {
    id: "e43", title: "宿舍同学轻描淡写",
    description: "室友推门进来，把腾讯的工牌随手扔在桌上，瘫在椅子上说：'产品其实挺好上手的，主要就是多想用户是谁。'说完他就戴上耳机，沉浸在了游戏的世界里。你盯着他的背影，那个曾经和你一起熬夜画图的少年，现在谈论'用户画像'就像谈论今天的天气一样自然。你突然想起，三年前你们还在一起争论柯布西耶和赖特谁更伟大，现在他已经在思考如何让十亿人更高效地刷短视频。你低下头，继续改你的简历，屏幕的光映在你脸上，像一场无声的告别——告别那个曾经以为建筑可以改变世界的自己。",
    effects: { selfDoubt: 5, logic: 3 },
    type: "negative",
  },
  {
    id: "e44", title: "海归竞争加剧",
    description: "秋招季，你发现竞争者的名单里突然多了许多陌生的名字——他们毕业于常春藤，在硅谷实习过，LinkedIn主页上是流利的英文和光鲜的项目。更扎心的是，你收藏的岗位JD上，'海外背景优先'像一条无形的分界线，把你和他们隔开。你刷新着招聘网站，看着那些你连发音都读不准的学校名字，突然感到一种全球化的残酷：当你在熬夜改图的时候，他们正在加州阳光下讨论算法；当你终于鼓起勇气投简历的时候，他们已经成为HR眼中的'国际人才'。你关掉页面，窗外的城市依旧喧嚣，但你感觉自己的战场，正在被看不见的对手无限扩大。",
    effects: { selfDoubt: 6, ageAnxiety: 5 },
    condition: ({ isOverseas }) => isOverseas,
    type: "negative",
  },
  {
    id: "e53", title: "改图改到第 18 版被打回",
    description: "你抱着咖啡罐在 CAD 前熬了七个通宵，从轴线到材质改了 18 版，连快捷键都快磨秃了键盘。把文件发给导师后，等了三个小时收到回复：“还是第一版有感觉，你这几天有点画歪了。” 你点开第一版文件，发现和最终版的区别不过是窗洞偏移了 50mm—— 那是你为了 “优化” 熬夜改掉的第一个细节。窗外天又亮了，你突然觉得，这几天的睡眠和咖啡，都像 CAD 里被删掉的辅助线，毫无意义。",
    effects: { stress: -10, selfDoubt: 8, arch: 2 },
    type: "negative",
  },
  {
    id: "e54", title: "设计院实习月薪 800并要求通宵",
    description: "入职前 HR 说 “建筑行业看重积累”，你没多想就签了实习协议，直到发薪日看到银行卡里 800 块才懵了 —— 连合租的房租都不够。更离谱的是，总工下班前甩来一套施工图：“今晚必须画完，明早甲方要审图。” 你在空无一人的办公室泡了三桶泡面，凌晨五点提交文件时，发现打卡记录显示你已经连续工作 16 小时。同事路过你的工位，扔给你一瓶功能饮料：“习惯就好，我们都是这么过来的。” 你握着那瓶饮料，突然明白 “积累” 原来是用廉价劳动力换经验。",
    effects: { money: -5, stress: -10, ageAnxiety: 5 },
    type: "negative",
  },
  {
    id: "e55", title: "租房被中介坑",
    description: "为了离设计院近，你通过中介租了个老破小，签合同时中介拍着胸脯说 “退房当天退押金”。三个月后你要搬走，中介上门检查时突然指着墙面：“这有两处污渍，得扣 500；地板有划痕，扣 300；窗帘有点脏，扣 200。” 你争辩说污渍是原有的、划痕是家具摩擦的，他却掏出合同：“你自己看条款，‘房屋损耗均由租客承担’。” 最后 1000 块押金一分没拿回来，你站在路边看着中介的车消失，想起搬进来时他热情帮你提行李的样子，只觉得讽刺 —— 原来那些殷勤，都是为了最后一次 “收割”。",
    effects: { money: -10, stress: -5, selfDoubt: 3 },
    type: "negative",
  },
  {
    id: "e56", title: "吃到了学妹保研的瓜",
    description: "深夜，本科的建筑系群里炸开了锅，有人匿名爆料：某同学为了保研，私下跟老师发生了不正当关系，还让院长修改了当年的保研加分细则，将另一位高分同学的竞赛获奖全部剔除在列。聊天记录里的截图、录音，把 “学术公平” 撕得稀碎。你看着屏幕，突然想起自己当年保研时，花尽心思算别人的成绩和加分，为了一篇论文熬了无数个夜，而有人却用捷径轻松拿到了入场券。群里的讨论越来越激烈，有人愤怒，有人沉默，你关掉手机，躺在床上翻来覆去 —— 原来从升学开始，建筑行业的 “卷” 就带着不为人知的勾心斗角，而你，也是这场博弈里幸存的普通人。",
    effects: { selfDoubt: 5, ageAnxiety: 3, stress: -3 },
    type: "negative",
  },
  {
    id: "e57", title: "论文被《建筑学报》录用",
    description: "你随手投给《建筑学报》的课程论文，在你已经背完半本产品经理面试题库时，收到了录用通知。邮件里编辑的评语写着 “研究视角新颖，兼具理论与实践价值”，导师也特意找你：“这篇论文能帮你申请博士，或者进设计院核心研发岗。” 你翻开那篇论文，里面的每一个公式、每一张分析图，都是你当年在图书馆泡了两个月的成果。转行的焦虑还在，但手里的录用通知像一块磁石 —— 你突然犹豫了，那些改图的深夜、查资料的清晨，难道真的要因为 “行业下行” 就放弃？建筑生的执念，在这一刻突然翻涌上来。",
    effects: { arch: 10, selfDoubt: -5, stress: 5, ageAnxiety: -3 },
    type: "positive",
  },
  {
    id: "e58", title: "设计院Mentor 让转回工资",
    description: "你的月薪只有1000，但发薪日你收到银行到账提醒，3000 块的金额让你以为财务发错了。刚想询问，mentor 私下找你：“这是给你的补贴，你转 1000 回我微信。” 见你愣住，他补充道：“公司账上只能按 1000 发，多的 2000 走私下，你我都划算 —— 不然扣完税，你到手也没多少。” 你看着聊天记录里的 “划算”，突然明白这是行业里默认的 “避税操作”。转完钱后，你看着银行卡里的 2000 块，心里五味杂陈：既庆幸多了一笔收入，又觉得这种 “暗箱操作”，像一根细小的刺，扎在 “职场正规” 的认知里。",
    effects: { money: 10, stress: -3, selfDoubt: 3 },
    type: "negative",
  },
  {
    id: "e59", title: "设计课老师离谱安排",
    description: "选课的时候你以为研究生“建筑设计” 是门轻松的课，没想到老师的时间安排离谱到让人崩溃：整个学期 16 周，老师除了第一节课讲了下课题，其余时间便不见了踪影，你和同学天天摸鱼，以为这门课就这么混过去了。寒假回家的前一天，老师突然发通知：“课题需要深化，所有人留在学校加班，正月十五前提交最终方案。” 你看着车票退改界面的手续费，想起父母已经备好的年夜饭，委屈又无奈。更气的是，留校期间老师全程不在校，只偶尔在群里发一句 “进度加快”—— 原来所谓的 “课程任务”，不过是他用来完成自己项目的免费劳动力。",
    effects: { stress: -12, arch: -2, money: -3 },
    type: "negative",
  },
  {
    id: "e60", title: "OR 系统抄往届图",
    description: "设计课 deadline 只剩两天，你实在没灵感，抱着侥幸心理登上学校的 OR 系统，下载了一套五年前的往届优秀图纸，改了改方案名称和局部细节就提交了。答辩时你紧张得手心冒汗，生怕被老师发现。没想到评委老师频频点头，主评老师说：“这个方案的空间逻辑和节点设计很成熟，比同期同学的作品更有落地性。” 最终你拿到了课程最高分，同学还来问你 “灵感来源”。你握着成绩单，又惊又喜 —— 原来往届前辈的智慧，居然成了你的 “救命稻草”，而这场 “意外的成功”，也让你对 “设计创新” 有了更复杂的理解。",
    effects: { arch: 5, logic: 3, stress: 5, selfDoubt: -3 },
    type: "positive",
  },
  {
    id: "e61", title: "研究建筑师转行的论文被《建筑师》录用，风向变了",
    description: "你花了半年时间调研 200 位建筑师转行案例，熬夜整理数据、分析转行路径，写下的《行业转型背景下建筑师跨领域就业现状与发展研究》，本是课程论文的延伸，没想到真的收到了《建筑学报》的录用通知。邮件里编辑特意备注：“你的研究填补了行业空白，现在转行不再是‘异类选择’，而是值得关注的行业趋势。” 导师看到通知后，一改之前 “转行就是浪费专业” 的态度，主动说：“这个方向有价值，我帮你联系行业论坛分享。” 你翻着论文里那些转行前辈的故事，突然觉得自己的坚持有了意义 —— 曾经被质疑 “不务正业” 的研究，如今成了被核心期刊认可的议题，建筑生转行的风，终于吹向了被理解、被正视的方向，所有的熬夜和调研，都成了最值得的铺垫。",
    effects: { arch: 8, selfDoubt: -10, network: 5 },
    type: "positive",
  },
  {
    id: "e62", title: "那艺娜演唱会，我是个坚强的笨女人",
    description: "抢了半个月的票，终于站在那艺娜演唱会的现场。当熟悉的旋律响起，她唱到 “我是个坚强的笨女人，我是个勇敢的笨女人” 时，舞台灯光照亮全场，你突然红了眼眶。这阵子改图改到崩溃、投简历石沉大海、转行被质疑 “不切实际” 的委屈，在歌词里找到了共鸣。你跟着全场一起合唱，声音哽咽却越来越响亮，那些自我怀疑、年龄焦虑，仿佛都被歌声吹散。散场时，你握着荧光棒走在人群里，晚风拂过脸颊，突然觉得 “笨一点也没关系”—— 就像歌词里唱的，只要够坚强，哪怕走得慢，也能走到想去的地方。回到宿舍，你打开电脑重新修改简历，这一次，指尖没有犹豫，眼里全是笃定。",
    effects: { stress: -10, selfDoubt: -8, ageAnxiety: -5 },
    type: "positive",
  },
  // 以下为新增宣讲会/校招专属事件
  {
    id: "e45", title: "大厂提前批宣讲会",
    description: "宣讲会现场座无虚席，你挤在最后一排，听着HR讲述着数字化转型的宏大叙事。当提问环节开始时，你深吸一口气，举起了手：'请问，空间体验的数字化与建筑中的场所精神如何结合？'全场安静了一秒，HR的目光锁定在你身上，然后她笑了，从台上走下来，递给你一张内推卡：'你的角度很有意思，我们正需要这种跨界思维。'你接过那张薄薄的卡片，感觉它重如千斤——这是你第一次，在公开场合用建筑的语言，赢得了互联网世界的入场券。",
    effects: { expression: 6, selfDoubt: -5, network: 5 },
    condition: ({ semester }) => semester >= 3,
    type: "positive",
  },
  {
    id: "e46", title: "校友企业交流日",
    description: "校友交流日上，你认出那位正在演讲的高管正是三年前毕业的直系学长。你鼓起勇气上前，递上你的电子简历。他快速浏览了一遍，突然抬起头，目光里带着惊讶：'你是建筑学院的？'你点点头，准备迎接那句熟悉的质疑。但他却笑了：'你的产品sense比很多CS学生还好，尤其是这种结构化思维——这很建筑。'那一刻，你感觉心里某个紧绷的弦突然松了。原来，那些你以为需要隐藏的过去，在懂行的人眼里，恰恰是你最独特的签名。",
    effects: { logic: 5, network: 8, selfDoubt: -10 },
    condition: ({ semester }) => semester >= 2,
    type: "positive",
  },
  {
    id: "e47", title: "顶级外企Campus Day",
    description: "Campus Day的圆桌讨论上，周围是流利的英文和自信的发言。轮到你时，你深吸一口气，用英语讲述了建筑中的'形式追随功能'如何映射到系统设计中的'架构决定性能'。你看到面试官的眼神从审视变为专注，最后露出了赞赏的微笑。那一刻，你突然意识到，语言不是障碍，思维才是桥梁——你用了六年时间搭建的建筑思维，现在正帮你跨越文化的鸿沟。散会后，面试官主动递来名片：'你的视角很独特，希望以后能合作。'你握着那张名片，感觉它像一张通往新世界的船票。",
    effects: { english: 5, expression: 7, network: 6 },
    condition: ({ stats }) => stats.english >= 65,
    type: "positive",
  },
  {
    id: "e48", title: "宣讲会群面踩坑",
    description: "宣讲会后的群面环节，你被随机分进了一个小组。讨论一开始，同组的人就像按下加速键一样疯狂抢话，抛出各种专业术语和模型名称。你张了张嘴，想分享建筑项目中的协作经验，但话到嘴边又咽了回去。四十分钟的群面，你只说了句'我同意'。回去的地铁上，你靠在冰冷的车厢壁上，感觉疲惫从骨头里渗出来。那不是身体的累，而是一种更深的无力——你花了六年学习如何设计空间，却在这一刻发现，你连设计自己的发言时机都不会。",
    effects: { selfDoubt: 8, stress: -5, ageAnxiety: 4 },
    condition: ({ semester }) => semester >= 4,
    type: "negative",
  },
  {
    id: "e50", title: "校友内推",
    description: "微信突然弹出一条好友验证，是那位你在校友录上见过名字的师兄——他现在是某大厂的高管。通过验证后，他的第一句话是：'看到你在转行，需要内推吗？我可以直接帮你跳过筛选。'你盯着那行字，手指在键盘上悬停了很久。这原本是你梦寐以求的机会，但此刻涌上心头的，却是一种复杂的情绪——感激、压力、还有一丝不甘。你最终回复了'谢谢师兄'，然后看着聊天界面，突然意识到，人脉可以帮你打开一扇门，但走进那扇门后，你依然要靠自己站立。",
    effects: { network: 5, selfDoubt: -8, stress: 5 },
    condition: ({ stats }) => stats.network >= 60,
    type: "positive",
  },
  {
    id: "e51", title: "行业交流会遇贵人",
    description: "沙龙休息间隙，你无意中与一位产品总监聊起了建筑中的'用户体验'——从动线设计到空间情绪。他越听越专注，最后干脆拉着你到角落，拿出手机：'你介意我现在就给你做一场模拟面试吗？你的思维太特别了，我想看看它在压力下如何发挥。'那一刻，你感觉整个会场的嘈杂都褪去了，只剩下你们两个人，和一个关于可能的对话。你点头说好，心里却想，这大概是你转行以来，第一次不是因为'建筑背景'被特殊对待，而是因为'建筑思维'被真正看见。",
    effects: { expression: 6, network: 8, selfDoubt: -5 },
    condition: ({ stats }) => stats.network >= 50 && stats.expression >= 55,
    type: "positive",
  },
  {
    id: "e52", title: "人脉带来的兼职",
    description: "朋友把你推荐给一家初创公司做产品顾问，报酬微薄，但承诺'可以写在简历上'。第一次会议，你看着那些年轻的面孔，听着他们充满激情的产品构想，突然想起本科时和同学一起通宵做方案的日子。你提出的几个建议——关于用户动线、关于信息层次——让他们眼睛发亮。结束后，创始人握着你的手说：'你这种结构化的思维，是我们最需要的。'你走在回家的路上，晚风很凉，但心里却有一种久违的暖意。这份工作可能不会让你致富，但它让你相信，那些你以为已经死去的建筑技能，正在以另一种方式重生。",
    effects: { money: 8, network: 3, structured: 2 },
    condition: ({ stats }) => stats.network >= 4,
    type: "positive",
  },
  {
    id: "e63", title: "导师组会公开表扬",
    description: "组会上，导师破天荒地停下 PPT，指着你的方案说：'这位同学的场地分析做得非常扎实，大家看一下这个等高线的处理方式。'会议室里安静了两秒，然后是翻页的声音。你低头记笔记，笔尖在纸上颤抖了一下。这是你进组三年第一次被公开肯定，那种感觉像在一片长期阴天的天空里，突然裂开一道缝，阳光直直地照在你身上。你知道它不会持续，但此刻，你愿意站在光里多待一会儿。",
    effects: { mentorFavorability: 8, selfDoubt: -6, expression: 3, arch: 3 },
    condition: ({ stats }) => stats.mentorFavorability >= 60,
    type: "positive",
  },
  {
    id: "e64", title: "招聘软件的推送变了",
    description: "你打开 Boss 直聘，发现首页推荐不再是'985 优先'的算法岗。一行小字写着：'根据你的画像，为你推荐适合建筑学背景的互联网岗位。'产品策划、设计协同、BIM 平台运营……岗位不多，但每一个都让你觉得'这个我可以试'。你盯着屏幕，突然有种被算法原谅的感觉——原来系统也在学习，原来连它都开始承认，跨学科不该被一刀切。你投了三个岗位，关掉 App，心里有一丝奇怪的轻松。",
    effects: { network: 4, selfDoubt: -5, logic: 2, expression: 2 },
    condition: ({ stats, semester }) => semester >= 3,
    type: "positive",
  },
  {
    id: "e65", title: "副业作品被初创团队看中",
    description: "你那套'建筑转产品'的可视化笔记被一个做设计协同工具的初创团队发现了。创始人约你喝咖啡，说：'我们的产品正缺一个懂空间逻辑又懂用户的人，要不要一起搞？'你看着他的眼睛，那里面有那种年轻人特有的、未经市场毒打的光。你犹豫了三秒，想起自己在出租屋改图到凌晨的那些夜晚，突然意识到——也许从来不是'建筑'抛弃了你，而是你一直在等一个能把建筑用起来的人。",
    effects: { network: 8, money: 6, logic: 4, structured: 4, mentorFavorability: -3 },
    condition: ({ stats }) => stats.network >= 45 && stats.structured >= 50,
    type: "positive",
  },
  {
    id: "e66", title: "深夜翻到三个月前的日记",
    description: "你在搬家整理时翻出一个本子，是三个月前写的。那一页写着：'今天又被拒了，觉得自己什么都不是。'笔迹很重，纸都被压出了痕。你盯着那行字看了很久，想起写它的那个夜晚——窗外下着雨，你没开灯，把所有焦虑都倒进了这张纸。现在你站在新房间里，阳光从窗户斜照进来，你突然明白了一件事：那个写下这句话的你，没有放弃，才有了现在的你。你把本子合上，放进抽屉最深处，像收藏一件出土文物。",
    effects: { selfDoubt: -10, stress: 6, expression: 3 },
    type: "positive",
  },
  {
    id: "e67", title: "课程作业入选学院年展",
    description: "系办走廊的布告栏贴出年展入选名单，你的名字在第三排。那一刻你正在路过，差点没敢抬头确认。入选的是你改到第八版的城市更新方案——那个曾被导师批'太理想主义'的方案。你站在布告栏前，身边走过一群大一新生，他们指着名单讨论'这位学长是谁'。你没有说话，只是把照片拍下来发给了妈，配文：'入选了。'她回了一个拥抱的表情，然后是一句：'什么时候回家吃饭？'",
    effects: { arch: 8, expression: 5, selfDoubt: -7, network: 4 },
    condition: ({ stats }) => stats.arch >= 70,
    type: "positive",
  },
  {
    id: "e68", title: "你组织的分享会来了 100 人",
    description: "你在朋友圈发了一条'建筑转产品经验线下分享'，本以为最多来十几个人。结果报名链接第二天就破了 100。那天晚上，阶梯教室坐满了人，后排还有站着的。你站在台上，PPT 第一页是那张你改了十八版的城市设计图。你说：'我今天不是来教大家转行的，我是来告诉你们——那些你以为没用的过去，会在某一天突然变成你的武器。'台下响起掌声，你看到第三排有个女生在低头擦眼泪。你突然意识到，你已经走出了那个在出租屋崩溃的自己，而此刻，你正在成为别人的灯塔。",
    effects: { network: 12, expression: 8, selfDoubt: -10, logic: 3 },
    condition: ({ stats, semester }) => stats.network >= 70 && semester >= 5,
    type: "positive",
  },
];

// ================================================================
// SECTION 4.5: 校园宣讲/特招弹窗事件 (独立于主回合事件外)
// ================================================================

const CAMPUS_EVENTS: CampusEvent[] = [
  {
    id: "ce01",
    companyId: "bytedance",
    companyName: "字节跳动",
    title: "10X 增长产品专场特招",
    description: "校园里贴满了字节跳动的海报。他们正在寻找对数据敏感、成长极快的年轻人，直通终面。你要去投递那张简历吗？",
    condition: (stats) => stats.logic >= 50,
    successCondition: (stats) => stats.logic >= 75 && stats.expression >= 65,
    successBuff: { bytedance: 50 },
    successNarrative: "你在宣讲会上指出了一项短视频日活数据的潜在增长点，HR 记下了你的名字。你拿到了内推直通卡！",
    failNarrative: "你坐在后排，听不懂他们说的 AB test 显著性差异。简历投出去便石沉大海。",
  },
  {
    id: "ce02",
    companyId: "tencent",
    companyName: "腾讯",
    title: "微信事业群秋招提前批",
    description: "微信事业群的高管来学校做闭门分享。听说如果被看中，基本就稳了。去试试吗？",
    condition: (stats) => stats.expression >= 50,
    successCondition: (stats) => stats.expression >= 75 && stats.structured >= 65,
    successBuff: { tencent: 50 },
    successNarrative: "你用建筑里的'空间流动'比喻'社交关系链'的构建，主讲人非常感兴趣，当场加了你的微信。",
    failNarrative: "你试图在提问环节发言，但被前面四个清华CS的同学抢了风头。你什么都没说就回去了。",
  },
  {
    id: "ce03",
    companyId: "google",
    companyName: "Google",
    title: "Google APAC 宣讲会",
    description: "一场全程使用英文交流的科技沙龙，现场提供免费的美式咖啡。你在人群外围徘徊。",
    condition: (stats) => stats.english >= 60,
    successCondition: (stats) => stats.english >= 80 && stats.logic >= 70,
    successBuff: { google: 50 },
    successNarrative: "你与工程师用流利的英文畅谈了 15 分钟技术伦理与产品设计界限。他给了你一张名片。",
    failNarrative: "你想开口，但发现周围人的口音都像是在加州长大的。你拿了一杯咖啡默默离开了。",
  },
  {
    id: "ce04",
    companyId: "xiaohongshu",
    companyName: "小红书",
    title: "社区生态建设专场研讨",
    description: "小红书在学校咖啡馆办了一场小型的线下研讨，讨论年轻人的生活方式。",
    successCondition: (stats) => stats.expression >= 65 && stats.network >= 40,
    successBuff: { xiaohongshu: 35 },
    successNarrative: "作为“跨界”的建筑生，你对空间审美的理解让他们眼前一亮，现场收到了面试直通意向金卡。",
    failNarrative: "你去了，但只觉得吵闹。你发现自己和那里的 KOL 气场格格不入。",
  },
];

// ================================================================
// SECTION 5: 公司数据
// ================================================================

const COMPANIES: Company[] = [
  // 互联网大厂
  { id: "tencent", name: "腾讯", category: "互联网大厂", thresholds: { logic: 75, expression: 70, structured: 70 }, description: "微信与王者荣耀背后的帝国" },
  { id: "bytedance", name: "字节跳动", category: "互联网大厂", thresholds: { logic: 77, expression: 73, structured: 70 }, description: "All in，大力出奇迹" },
  { id: "alibaba", name: "阿里巴巴", category: "互联网大厂", thresholds: { logic: 75, expression: 70, structured: 73 }, description: "让天下没有难做的生意" },
  { id: "jd", name: "京东", category: "互联网大厂", thresholds: { logic: 73, expression: 67, structured: 67 }, description: "正品低价，用户至上" },
  { id: "baidu", name: "百度", category: "互联网大厂", thresholds: { logic: 73, expression: 67, structured: 65 }, description: "AI时代的搜索引擎" },
  { id: "kuaishou", name: "快手", category: "互联网大厂", thresholds: { logic: 70, expression: 65, structured: 65 }, description: "记录世界，记录你" },
  { id: "meituan", name: "美团", category: "互联网大厂", thresholds: { logic: 75, expression: 68, structured: 72 }, description: "帮大家吃得更好，生活更好" },
  { id: "pdd", name: "拼多多", category: "互联网大厂", thresholds: { logic: 76, expression: 68, structured: 73 }, description: "多实惠，多乐趣" },
  { id: "antgroup", name: "蚂蚁集团", category: "互联网大厂", thresholds: { logic: 78, expression: 72, structured: 75 }, description: "让信用等于财富" },
  // 外企科技
  { id: "google", name: "Google", category: "外企科技", thresholds: { english: 83, logic: 80, structured: 75, expression: 73 }, description: "Don't be evil" },
  { id: "microsoft", name: "Microsoft", category: "外企科技", thresholds: { english: 80, logic: 77, structured: 75, expression: 70 }, description: "Empowering every person" },
  { id: "amazon", name: "Amazon", category: "外企科技", thresholds: { english: 80, logic: 75, structured: 73, expression: 70 }, description: "Day 1永远是第一天" },
  { id: "meta", name: "Meta", category: "外企科技", thresholds: { english: 81, logic: 77, structured: 73, expression: 73 }, description: "连接全世界" },
  { id: "apple", name: "Apple", category: "外企科技", thresholds: { english: 83, logic: 77, structured: 75, expression: 75 }, description: "Think different" },
  // 咨询公司
  { id: "mckinsey", name: "McKinsey", category: "咨询公司", thresholds: { logic: 83, structured: 83, expression: 77, english: 73 }, description: "顶级战略咨询，建筑生的另一条路" },
  { id: "bcg", name: "BCG", category: "咨询公司", thresholds: { logic: 81, structured: 81, expression: 77, english: 70 }, description: "波士顿矩阵的发明者" },
  { id: "bain", name: "Bain", category: "咨询公司", thresholds: { logic: 80, structured: 80, expression: 75, english: 67 }, description: "Results, not reports" },
  { id: "deloitte", name: "Deloitte", category: "咨询公司", thresholds: { logic: 78, structured: 77, expression: 72, english: 68 }, description: "以卓越成就不凡" },
  // 车企
  { id: "tesla", name: "Tesla", category: "车企", thresholds: { logic: 78, english: 75, structured: 70 }, description: "加速世界向可持续能源的转变" },
  { id: "nio", name: "蔚来", category: "车企", thresholds: { logic: 75, expression: 70, structured: 70 }, description: "Blue Sky Coming" },
  { id: "li", name: "理想", category: "车企", thresholds: { logic: 78, structured: 75, expression: 65 }, description: "创造移动的家" },
  { id: "xpeng", name: "小鹏", category: "车企", thresholds: { logic: 75, structured: 75 }, description: "未来出行探索者" },
  { id: "byd", name: "比亚迪", category: "车企", thresholds: { logic: 70, structured: 75 }, description: "Build Your Dreams" },
  // 投行
  { id: "cicc", name: "中金公司", category: "投行", thresholds: { logic: 85, structured: 80, english: 75 }, description: "植根中国，融通世界" },
  { id: "citic", name: "中信证券", category: "投行", thresholds: { logic: 82, structured: 78, english: 70 }, description: "中国领先的投资银行" },
  { id: "goldman", name: "Goldman Sachs", category: "投行", thresholds: { logic: 88, structured: 85, english: 85 }, description: "The gold standard" },
  { id: "morgan", name: "Morgan Stanley", category: "投行", thresholds: { logic: 86, structured: 83, english: 82 }, description: "Doing first-class business" },
  // 中厂
  { id: "netease", name: "网易", category: "中厂", thresholds: { logic: 63, expression: 57, structured: 57 }, description: "有态度的互联网公司" },
  { id: "beike", name: "贝壳找房", category: "中厂", thresholds: { logic: 62, expression: 58, structured: 60 }, description: "有尊严的服务者，更美好的居住" },
  { id: "iflytek", name: "科大讯飞", category: "中厂", thresholds: { logic: 66, expression: 60, structured: 63 }, description: "让机器能听会说，能理解会思考" },
  { id: "xiaohongshu", name: "小红书", category: "中厂", thresholds: { logic: 65, expression: 63, structured: 60 }, description: "你的生活指南" },
  { id: "bilibili", name: "哔哩哔哩", category: "中厂", thresholds: { logic: 63, expression: 60, structured: 57 }, description: "你感兴趣的视频都在B站" },
  { id: "dewu", name: "得物", category: "中厂", thresholds: { logic: 60, expression: 57, structured: 55 }, description: "年轻人的潮流社区" },
  { id: "ctrip", name: "携程", category: "中厂", thresholds: { logic: 61, expression: 55, structured: 57 }, description: "说走就走的旅行" },
  { id: "didi", name: "滴滴", category: "中厂", thresholds: { logic: 63, expression: 55, structured: 60 }, description: "美好出行" },
  { id: "iqiyi", name: "爱奇艺", category: "中厂", thresholds: { logic: 60, expression: 60, structured: 55 }, description: "悦享品质" },
  // 小厂
  { id: "keep", name: "Keep", category: "小厂", thresholds: { logic: 47, expression: 45, structured: 43 }, description: "自律给我自由" },
  { id: "soul", name: "Soul", category: "小厂", thresholds: { logic: 45, expression: 47, structured: 43 }, description: "灵魂社交" },
  { id: "boss", name: "Boss直聘", category: "小厂", thresholds: { logic: 47, expression: 45, structured: 43 }, description: "求职招聘的求职招聘平台" },
  { id: "moji", name: "墨迹天气", category: "小厂", thresholds: { logic: 43, expression: 43, structured: 40 }, description: "最懂你的天气应用" },
  { id: "fanka", name: "翻咔", category: "小厂", thresholds: { logic: 43, expression: 47, structured: 40 }, description: "高颜值社交" },
  { id: "mixue", name: "蜜雪冰城", category: "小厂", thresholds: { logic: 45, expression: 50, structured: 43 }, description: "你爱我，我爱你" },
  { id: "chayan", name: "茶颜悦色", category: "小厂", thresholds: { logic: 43, expression: 50, structured: 40 }, description: "中式茶饮" },
  { id: "zuoyebang", name: "作业帮", category: "小厂", thresholds: { logic: 47, expression: 43, structured: 45 }, description: "让学习更简单" },
  { id: "yuanfudao", name: "猿辅导", category: "小厂", thresholds: { logic: 47, expression: 43, structured: 45 }, description: "在线教育科技领先者" },
  // 传统路径
  { id: "cadg", name: "中国建筑设计研究院", category: "传统路径", thresholds: { arch: 70 }, description: "建筑行业的国家队" },
  { id: "ecadi", name: "华东建筑设计研究院", category: "传统路径", thresholds: { arch: 67 }, description: "上海的建筑设计名片" },
  { id: "vanke", name: "万科", category: "传统路径", thresholds: { arch: 63, network: 50 }, description: "住宅开发商的白月光" },
  { id: "longfor", name: "龙湖", category: "传统路径", thresholds: { arch: 60, network: 47 }, description: "空间即服务" },
  { id: "seu_design", name: "东南大学建筑设计研究院", category: "传统路径", thresholds: { arch: 65 }, description: "学院派建筑高地" },
  { id: "gad", name: "gad", category: "传统路径", thresholds: { arch: 63 }, description: "高品质商业建筑设计" },
  { id: "cushman", name: "戴德梁行", category: "传统路径", thresholds: { arch: 55, english: 60, network: 45 }, description: "全球领先的房地产服务商" },
  { id: "cbre", name: "世邦魏理仕", category: "传统路径", thresholds: { arch: 57, english: 62, network: 47 }, description: "全球商业地产服务与投资管理平台" },
  { id: "jll", name: "仲量联行", category: "传统路径", thresholds: { arch: 56, english: 63, network: 47 }, description: "塑造房地产的美好未来" },
];

// ================================================================
// SECTION 6: 结局数据（按优先级从高到低排列）
// ================================================================

const ENDINGS: Ending[] = [
  {
    id: "expelled",
    title: "被退学",
    subtitle: "导师不想再带你了",
    description: "组会上，导师推了推眼镜，深吸一口气，语气冰冷地说：'你在这几学期的表现，让我看不到任何对学术的起码尊重。从今天起，我不再担任你的导师，我会向学院申请取消你的学籍。'\n\n你走出那间曾经彻夜改图的办公室，发现外面的阳光刺眼得有些陌生。由于导师的坚决态度，学院最终批准了劝退处理。在建筑行业的圈子里，这成了一个无法解释的污点。\n\n也许在这个模拟的世界里，有些底线是不能被反复试探的。",
    color: "#ff4d4f",
    condition: (s) => s.mentorFavorability <= 0,
  },
  {
    id: "self_doubt_quit",
    title: "不装了，摊牌了",
    subtitle: "既然当不了大师，那就回去继承家族企业吧",
    description: "就在你盯着屏幕上的渲染进度条，第100次怀疑人生时，家里的电话响了。'儿啊/闺女，在外面受这份罪干啥？回来吧，厂里缺个管事的。'\n\n那一刻，所有的建筑理想和转行互联网的动力瞬间土崩瓦解。你突然意识到，比起在格子间里纠结梁柱位置，回去继承那几家实业工厂似乎也没什么不好的。你收起比例尺，换上西装，在校招群里留下一句'哥/姐退圈了'的传说，深藏功与名。\n\n有的建筑师在盖楼，而有的建筑师，出生就在罗马的楼里。",
    color: "#ff85c0",
    condition: (s) => s.selfDoubt >= 100,
  },
  {
    id: "age_anxiety_pivot",
    title: "被遗忘在时光深处",
    subtitle: "当建筑的速度赶不上发际线后退的速度",
    description: "如果你在三十岁还没有拿过一个普利兹克奖，那你可能真的该考虑转行了。看着镜子里提前到来的中年危机，你突然感到一种透彻的荒诞。\n\n与其在建筑圈做一颗卑微的螺丝钉，不如在最灿烂的时候戛然而止。你卖掉了所有的专业书，去南极当了一名企鹅饲养员。你说你要去追寻最纯粹的黑白比例，而不是在甲方反复无常的修改意见里虚度光阴。在这个内卷的时代，你用最决绝的方式，和你的青春以及建筑梦，完成了一次‘华丽’的脱钩。",
    color: "#faad14",
    condition: (s) => s.ageAnxiety >= 100,
  },
  {
    id: "stress_breakdown",
    title: "灰度空间的休止符",
    subtitle: "精神世界的承重墙坍塌了",
    description: "在第101次被甲方推翻方案后的那个凌晨，你发现自己再也拿不起那支沉重的绘图笔。所有的色彩从你的视野中剥离，世界变成了一个只有灰度的巨大模型。你试图在草图纸上寻找出路，却发现每一根线条都在嘲笑你的无能。\n\n你决定提前‘闭馆’。你关掉了所有的灯，把自己锁进了一个没有梁柱、没有尺度、只有绝对静默的思维黑洞。在那里，你举办了一场属于自己的‘线条葬礼’，埋葬了所有的野心、焦虑以及对建筑的最后一丝温存。你并不打算离开，只是想在这里一直坐下去，直到时间的刻度也失去意义。",
    color: "#434343",
    condition: (s) => s.stress <= 0,
  },
  {
    id: "foreign_pm",
    title: "外企产品经理",
    subtitle: "你的建筑空间感，在这里成了稀缺品",
    description: "你拿到了外企的offer，并不是因为你的专业背景被忽视，而是因为它终于被看见了。入职第一天，你走进那个开放的办公室，里面有人来自十二个不同国家，说着你花了很多年准备的那种语言。\n\n你打开电脑，看着桌面上空白的文档，想到那些改图的深夜、那些被HR已读不回的下午，感觉它们都有了某种理由。你不知道这就是你要的生活，但你知道，你是靠自己走到这里的。",
    color: "#4a9eff",
    condition: (s) => s.english >= 75 && s.logic >= 70 && s.structured >= 65 && s.expression >= 65,
  },
  {
    id: "consulting",
    title: "咨询跳板成功",
    subtitle: "逻辑和框架，是建筑之外更通用的语言",
    description: "你进入了一家顶级咨询公司。不是因为你懂建筑，而是因为你懂如何分解一个复杂的问题，懂如何把混乱的信息整理成一张可以被决策者理解的图。第一个项目是帮一家制造业客户做战略转型，你看着那张流程图，突然想到了建筑里的空间动线分析。\n\n你没有离开那个学建筑的自己，你只是找到了它更大的用法。",
    color: "#9c27b0",
    condition: (s) => s.logic >= 75 && s.structured >= 75 && s.expression >= 70,
  },
  {
    id: "automotive_pm",
    title: "造车新势力",
    subtitle: "从建筑空间到移动第三空间",
    description: "你最终加入了造车新势力。在这里，你不再设计静止的建筑，而是定义移动的智能空间。面试官说：'我们需要懂空间、懂用户、更懂体验的人，而你正好就是。'\n\n坐在试驾车里，看着中控屏上你参与定义的交互逻辑，你突然觉得，这不就是一个微缩的、高密度的、会跑的'建筑'吗？你并没有离开设计，你只是换了一个更快的载体。",
    color: "#00b8d4",
    condition: (s) => s.logic >= 75 && s.structured >= 70 && (s.expression >= 65 || s.english >= 70),
  },
  {
    id: "investment_banker",
    title: "金融新贵",
    subtitle: "用资本的逻辑重构世界",
    description: "你穿上定制西装，走进了陆家嘴或中环的高楼。这里没有图纸和模型，只有K线和估值模型。你发现，曾经用来推敲平面布局的逻辑思维，用来分析商业模式竟然也无比顺手。\n\n虽然偶尔深夜加班时，你会想起那个画图的自己，但看着账户里的数字和参与的百亿级项目，你知道，你已经换了一条赛道，而且跑得很快。",
    color: "#ffd700",
    condition: (s) => s.logic >= 82 && s.structured >= 78 && s.english >= 75,
  },
  {
    id: "bigtech_pm",
    title: "大厂产品经理",
    subtitle: "你证明了，建筑生也可以做好产品",
    description: "你拿到了大厂的校招offer。入职培训的自我介绍环节，你说自己是建筑背景转行，旁边有人小声问：'建筑专业怎么来做产品？'你笑了笑，说：'你以后就知道了。'\n\n第一个季度的绩效出来，你的用户路径分析被当成组内标杆分享。你没有提那是一种你在建筑里用了六年的思维方式。有些东西，不需要解释。",
    color: "#2196f3",
    condition: (s) => s.logic >= 68 && s.structured >= 63 && s.expression >= 63 && s.selfDoubt <= 58,
  },
  {
    id: "midtech_pm",
    title: "中厂产品经理",
    subtitle: "稳定的开始，不是终点",
    description: "你进入了一家中型互联网公司，不是你最初设想的那个名字，但办公室的天花板很高，下午四点有阳光斜进来。你做的是你感兴趣的方向，和你的建筑背景没有太大关系，但也没有冲突。\n\n你慢慢发现，有时候比公司名字更重要的，是你每天早上愿不愿意打开电脑。大多数时候，你愿意。",
    color: "#00bcd4",
    condition: (s) => s.logic >= 55 && s.structured >= 53 && s.expression >= 50,
  },
  {
    id: "smalltech",
    title: "小厂核心员工",
    subtitle: "在一个小地方，你真实地发生了影响",
    description: "你在一家小公司找到了一个位置。没有光鲜的logo，没有豪华的餐补，但你的意见会被认真讨论，你的方案会直接上线，你能看见它们是怎么影响到真实用户的。\n\n你的同事说你是他们见过的最有空间感的产品人。你没有纠正他，因为你已经不再觉得'建筑背景'是一个需要被解释的���签了。",
    color: "#26a69a",
    condition: (s) => s.logic >= 40 && s.expression >= 40 && s.selfDoubt <= 72,
  },
  {
    id: "design_institute",
    title: "设计院项目经理",
    subtitle: "也许最初的方向，并不是妥协",
    description: "最终你还是走进了设计院。不是因为放弃了，而是因为你在三年里慢慢明白，自己真正热爱的不是互联网，而是那些图纸变成空间的那一刻。\n\n你做了项目经理，管项目、管人、管进度，也偶尔管那些凌晨还坐在工位上的年轻建筑师，对他们说：'先回去睡觉，图纸明天还会在的。'",
    color: "#ff9800",
    condition: (s) => s.arch >= 65 && s.selfDoubt <= 78,
  },
  {
    id: "delayed_graduation",
    title: "延毕",
    subtitle: "时间可以是礼物，前提是你知道用它来做什么",
    description: "毕业的那一年，你没有毕业。导师说论文还需要修改，学校说学分还有缺口，HR说'您的情况我们再研究一下'。你办了延毕手续，看着同学们一个个离开，宿舍楼里的人越来越少。\n\n但是你多了一年时间。用它来做什么，还没有决定。也许这就是你真正的开始。",
    color: "#9e9e9e",
    condition: (s) => s.selfDoubt >= 78 || s.ageAnxiety >= 82 || (s.arch < 42 && s.logic < 42),
  },
  {
    id: "failed",
    title: "转行未果",
    subtitle: "这不是结局，只是一个需要重新理解的节点",
    description: "校招季结束了，你没有拿到一个你想要的offer。设计院你也没有去，因为你花了三年时间让自己相信那条路不适合你。现在你坐在毕业生公寓里，面前是一台贴满了便签的电脑，上面写着各种你曾经想要的公司名字。\n\n你意识到，问题也许不是建筑或者互联网，而是你还没有搞清楚自己想要什么。这件事，比找工作更难，也更值得花时间。",
    color: "#607d8b",
    condition: () => true,
  },
];

// ================================================================
// SECTION 7: 工具函数
// ================================================================

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function clamp(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)));
}

function applyEffects(stats: Stats, effects: Record<string, number | [number, number]>): { newStats: Stats; delta: Partial<Stats> } {
  const delta: Partial<Stats> = {};
  const newStats = { ...stats };
  Object.keys(effects).forEach((k) => {
    const key = k as StatKey;
    const effect = effects[k];
    const old = newStats[key];

    let change = 0;
    if (Array.isArray(effect)) {
      const [min, max] = effect;
      // 保证能够处理增量和减量
      const realMin = Math.min(min, max);
      const realMax = Math.max(min, max);
      change = Math.floor(Math.random() * (realMax - realMin + 1)) + realMin;
    } else {
      change = effect as number;
    }

    newStats[key] = clamp(old + change);
    const d = newStats[key] - old;
    if (d !== 0) delta[key] = d;
  });
  return { newStats, delta };
}

function generateCharacter(name: string): { character: CharacterInfo; stats: Stats } {
  // 本科院校层次
  const r1 = Math.random();
  const undergradTier = r1 < 0.05 ? 4 : r1 < 0.25 ? 3 : r1 < 0.60 ? 2 : 1;

  // 硕士院校层次（不低于本科）
  const r2 = Math.random();
  let masterTierRaw: number;
  if (r2 < 0.40) masterTierRaw = undergradTier + 1;
  else if (r2 < 0.60) masterTierRaw = undergradTier + 2;
  else masterTierRaw = undergradTier;
  const masterTier = Math.min(4, Math.max(undergradTier, masterTierRaw));

  // 是否留学（20%概率）
  const isOverseas = Math.random() < 0.20;

  const undergradSchool = pick(SCHOOLS_BY_TIER[undergradTier]);
  const masterSchool = isOverseas ? pick(OVERSEAS_SCHOOLS) : pick(SCHOOLS_BY_TIER[masterTier]);

  // 按层次生成初始属性
  const tb = (undergradTier - 1) * 10;   // 0/10/20/30
  const mb = (masterTier - 1) * 5;      // 0/5/10/15
  const rng = () => Math.random() * 8 - 4;

  const stats: Stats = {
    arch: clamp(50 + tb * 0.6 + mb * 0.4 + rng()),
    logic: clamp(28 + tb * 0.9 + mb * 0.4 + rng()),
    expression: clamp(22 + tb * 0.8 + mb * 0.3 + rng()),
    english: clamp(18 + tb * 1.0 + mb * 0.5 + (isOverseas ? 20 : 0) + rng()),
    structured: clamp(22 + tb * 0.8 + mb * 0.3 + rng()),
    stress: clamp(55 + rng() * 1.5),
    network: clamp(18 + tb * 0.4 + (isOverseas ? 8 : 0) + rng()),
    money: clamp(38 + tb * 0.3 + rng()),
    selfDoubt: clamp(32 - tb * 0.4 + (isOverseas ? 5 : 0) + rng()),
    ageAnxiety: clamp(18 - tb * 0.3 + rng()),
    mentorFavorability: Math.floor(Math.random() * (60 - 10 + 1)) + 10,
  };

  return { character: { name, undergradTier, undergradSchool, masterTier, masterSchool, isOverseas }, stats };
}

function calculateEnding(stats: Stats): Ending {
  // 1. 如果没有拿到任何 offer，先检查是否触发了“差结局”
  // 这里需要一个 fallback 逻辑：如果 calculateEndingWithOffer 传了 null 进来，说明玩家没选 offer，或者压根没 offer
  // 此时只能触发那些不需要 offer 的结局（通常是比较惨的）
  
  // 过滤掉那些明确需要 Offer 才能触发的结局（通常是大厂/外企/咨询/中厂/小厂/传统）
  // 我们可以通过 ending.id 来判断，或者加一个 explicitOfferRequired 字段。
  // 简单起见，我们假设前几个好结局都需要 offer。

  const fallbackEndings = ENDINGS.filter(e => 
    e.id === "quit_architecture" || 
    e.id === "dropout" || 
    e.id === "gap_year" ||
    e.id === "civil_servant" || // 考公可能不需要企业 offer
    e.id === "phd" // 读博也不需要企业 offer
  );

  for (const ending of fallbackEndings) {
    if (ending.condition(stats)) return ending;
  }
  
  // 如果连考公/读博都没触发，那就是最惨的“提桶跑路”或者默认结局
  return ENDINGS.find(e => e.id === "quit_architecture") || ENDINGS[ENDINGS.length - 1];
}

function calculateEndingWithOffer(stats: Stats, selectedOfferId: string | null): Ending {
  if (!selectedOfferId) {
    // 没 offer，进入无 offer 结局判定
    return calculateEnding(stats);
  }

  const company = COMPANIES.find((c) => c.id === selectedOfferId);
  if (!company) {
    return calculateEnding(stats);
  }

  const meta = COMPANY_OFFER_META[selectedOfferId];
  const level = meta?.level;

  // 根据玩家选择的公司类型，优先匹配对应的结局。既然已经拿到 offer，就无视 condition 门槛直接给结局。
  if (level === "外企") {
    const e = ENDINGS.find((x) => x.id === "foreign_pm");
    if (e) return e;
  } else if (level === "咨询") {
    const e = ENDINGS.find((x) => x.id === "consulting");
    if (e) return e;
  } else if (level === "投行") {
    const e = ENDINGS.find((x) => x.id === "investment_banker");
    if (e) return e;
  } else if (level === "车企") {
    const e = ENDINGS.find((x) => x.id === "automotive_pm");
    if (e) return e;
  } else if (level === "大厂") {
    const e = ENDINGS.find((x) => x.id === "bigtech_pm");
    if (e) return e;
  } else if (level === "中厂") {
    const e = ENDINGS.find((x) => x.id === "midtech_pm");
    if (e) return e;
  } else if (level === "小厂") {
    const e = ENDINGS.find((x) => x.id === "smalltech");
    if (e) return e;
  } else if (level === "传统") {
    const e = ENDINGS.find((x) => x.id === "design_institute");
    if (e) return e;
  }

  // 如果按意向公司无法找到对应结局，则退回到数值优先的默认计算
  return calculateEnding(stats);
}

function checkQualifiedCompanies(
  stats: Stats,
  offerBuffs: Record<string, number>,
  pastInternships: InternshipOption[]
): Company[] {
  // 实习经历带来的额外声望加成
  const internshipBonus = pastInternships.length > 0 ? Object.keys(pastInternships).length * 5 : 0;

  const qualified = COMPANIES.filter((c) => {
    // 1. 基础条件：所有门槛都不能差太多（允许稍微差一点点，靠随机性或buff弥补）
    const meetsBasicThreshold = (Object.keys(c.thresholds) as StatKey[]).every(
      (k) => stats[k] >= ((c.thresholds[k] ?? 0) - 10)
    );
    if (!meetsBasicThreshold) return false;

    // 2. 计算综合得分 (门槛达成度)
    let totalScore = 0;
    let maxPossibleScore = 0;
    (Object.keys(c.thresholds) as StatKey[]).forEach((k) => {
      const threshold = c.thresholds[k] ?? 0;
      totalScore += stats[k];
      maxPossibleScore += threshold;
    });

    const buff = offerBuffs[c.id] || 0;
    // 基础录取率 (受能力溢出/不足、buff、实习经历影响)
    let winRate = (totalScore - maxPossibleScore) * 1.5 + buff + internshipBonus + 30; // 基础30%胜率如果有竞争力

    // 大厂/外企本来竞争就激烈，录取率适当压缩
    if (c.category === "互联网大厂" || c.category === "外企科技" || c.category === "咨询公司") {
      winRate -= 15;
    }

    // 随机开奖 (0-100)
    // 如果胜率超过80%，则加入保底标记（虽然这里只返回 boolean，但在后续流程中可以感知到这是一个高胜率选手）
    const isWin = Math.random() * 100 < winRate;
    // 临时挂载一个属性用于后续保底判断（虽然 TS 会报错，但 JS 运行时可行，或者我们可以改写逻辑）
    // 为了更安全的写法，我们这里只负责筛选。保底逻辑放到下面 qualified 处理。
    return isWin || (winRate >= 80 && Math.random() < 0.5); // 80%以上胜率即使输了也有50%概率复活
  });

  // 保底机制：如果没有任何 offer，但存在胜率极高（>80%）的公司被刷掉了，这里需要捞回来。
  // 由于上面 filter 已经过滤了，我们换一种策略：
  // 重新遍历一遍，找到胜率 > 80% 的公司。如果 qualified 为空，则强制塞入一个胜率最高的。

  if (qualified.length === 0) {
    // 寻找“意难平”公司（胜率>80但没中的）
    const highPotential = COMPANIES.filter(c => {
       const meetsBasicThreshold = (Object.keys(c.thresholds) as StatKey[]).every(
        (k) => stats[k] >= ((c.thresholds[k] ?? 0) - 10)
      );
      if (!meetsBasicThreshold) return false;

      let totalScore = 0;
      let maxPossibleScore = 0;
      (Object.keys(c.thresholds) as StatKey[]).forEach((k) => {
        totalScore += stats[k];
        maxPossibleScore += (c.thresholds[k] ?? 0);
      });
      const buff = offerBuffs[c.id] || 0;
      let winRate = (totalScore - maxPossibleScore) * 1.5 + buff + internshipBonus + 30;
      if (c.category === "互联网大厂" || c.category === "外企科技" || c.category === "咨询公司") {
        winRate -= 15;
      }
      return winRate >= 80;
    });

    if (highPotential.length > 0) {
      // 随机给一个保底
      const luckyOne = pick(highPotential);
      qualified.push(luckyOne);
    }
  }

  // 数值不够的玩家，qualified 本身为空，直接返回空数组（不保底）
  if (qualified.length === 0) {
    return [];
  }

  // 随机打乱
  for (let i = qualified.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [qualified[i], qualified[j]] = [qualified[j], qualified[i]];
  }

  // 发放 offer 数量：1~4 随机（均值 2.5，比原来的 0~3 均值 1.5 多一个选择）
  // 数值低的玩家 qualified 已在上方提前返回空，这里的玩家至少有资格拿 1 个
  const offerCount = Math.floor(Math.random() * 4) + 1; // 1~4

  return qualified.slice(0, offerCount);
}

// 公司 offer 元信息（薪资与福利，仅用于展示）
const COMPANY_OFFER_META: Record<
  string,
  { salary: string; perks: string; level: "大厂" | "中厂" | "小厂" | "外企" | "咨询" | "传统" | "车企" | "投行" }
> = {
  tencent: { salary: "25k·14（月）", perks: "六险一金 · 年终奖金 · 导师制", level: "大厂" },
  bytedance: { salary: "28k·15（月）", perks: "三餐免费 · 股票激励 · 弹性办公", level: "大厂" },
  alibaba: { salary: "26k·15（月）", perks: "补充医疗 · 内部学习平台 · 公租房", level: "大厂" },
  jd: { salary: "23k·14（月）", perks: "住房补贴 · 专项奖金 · 年度旅游", level: "大厂" },
  baidu: { salary: "22k·14（月）", perks: "技术氛围浓 · 研究项目 · 午餐补贴", level: "大厂" },
  kuaishou: { salary: "24k·15（月）", perks: "绩效奖金 · 下午茶 · 团建活动", level: "大厂" },
  meituan: { salary: "25k·15（月）", perks: "餐补福利 · 业务复杂度高 · 晋升通道清晰", level: "大厂" },
  pdd: { salary: "30k·16（月）", perks: "高绩效奖金 · 快速晋升 · 高强度成长", level: "大厂" },
  antgroup: { salary: "28k·16（月）", perks: "技术金融场景 · 股票激励 · 专业成长", level: "大厂" },

  google: { salary: "50k+·14（月）", perks: "全球团队 · 丰厚股票 · 无限零食", level: "外企" },
  microsoft: { salary: "45k·14（月）", perks: "混合办公 · 学习预算 · 购股计划", level: "外企" },
  amazon: { salary: "42k·14（月）", perks: "签字奖金 · 股票奖励 · 国际轮岗", level: "外企" },
  meta: { salary: "48k·14（月）", perks: "远程优先 · 顶级设备 · 丰富假期", level: "外企" },
  apple: { salary: "55k·14（月）", perks: "硬件内购 · 设计文化 · 全球项目", level: "外企" },

  mckinsey: { salary: "45k·16（月）", perks: "全球项目 · 海外出差 · 高强度培养", level: "咨询" },
  bcg: { salary: "43k·16（月）", perks: "快速晋升 · 行业视野 · 项目奖金", level: "咨询" },
  bain: { salary: "42k·16（月）", perks: "导师一对一 · 体系化培训 · 团队文化", level: "咨询" },
  deloitte: { salary: "24k·14（月）", perks: "专业培训 · 多行业项目 · 国际化平台", level: "咨询" },

  netease: { salary: "21k·14（月）", perks: "下午茶 · 音乐氛围 · 相对稳定", level: "中厂" },
  beike: { salary: "20k·14（月）", perks: "居住产业数字化 · 业务培训 · 成长通道", level: "中厂" },
  iflytek: { salary: "21k·14（月）", perks: "人工智能场景 · 技术培训 · 研发氛围", level: "中厂" },
  xiaohongshu: { salary: "22k·15（月）", perks: "内容氛围好 · 产品节奏快", level: "中厂" },
  bilibili: { salary: "20k·14（月）", perks: "兴趣社区 · 弹性上下班", level: "中厂" },
  dewu: { salary: "19k·14（月）", perks: "年轻团队 · 潮流福利", level: "中厂" },

  keep: { salary: "16k·14（月）", perks: "运动福利 · 会员权益", level: "小厂" },
  soul: { salary: "16k·14（月）", perks: "年轻团队 · 扁平管理", level: "小厂" },
  boss: { salary: "17k·14（月）", perks: "业务增长快 · 晋升空间大", level: "小厂" },
  moji: { salary: "15k·14（月）", perks: "老牌团队 · 节奏平衡", level: "小厂" },

  cadg: { salary: "18k·14（月）", perks: "编制机会 · 国家项目 · 加班较多", level: "传统" },
  ecadi: { salary: "17k·14（月）", perks: "一线城市 · 地标项目 · 专业氛围浓", level: "传统" },
  vanke: { salary: "19k·14（月）", perks: "地产资源 · 稳定现金流 · 福利完善", level: "传统" },
  longfor: { salary: "18k·14（月）", perks: "项目多 · 城市轮岗 · 发展路径清晰", level: "传统" },
  seu_design: { salary: "16k·14（月）", perks: "学院氛围 · 科研项目 · 校园环境", level: "传统" },
  gad: { salary: "17k·14（月）", perks: "商业项目 · 设计氛围浓 · 成长快", level: "传统" },
  cushman: { salary: "20k·14（月）", perks: "全球资源 · 英文环境 · 地产人脉", level: "传统" },
  cbre: { salary: "21k·14（月）", perks: "全球项目 · 商业地产资源 · 专业培训", level: "传统" },
  jll: { salary: "21k·14（月）", perks: "国际平台 · 多元业务线 · 地产咨询经验", level: "传统" },

  // 车企
  tesla: { salary: "35k·14（月）", perks: "马斯克文化 · 股票期权 · 国际团队", level: "车企" },
  nio: { salary: "30k·15（月）", perks: "用车福利 · 快速成长 · 社区文化", level: "车企" },
  li: { salary: "32k·15（月）", perks: "家庭用车 · 扁平管理 · 绩效奖金", level: "车企" },
  xpeng: { salary: "28k·14（月）", perks: "技术导向 · 自动驾驶前沿 · 期权", level: "车企" },
  byd: { salary: "25k·13（月）", perks: "新能源龙头 · 稳定 · 全国布局", level: "车企" },

  // 投行
  cicc: { salary: "50k·16（月）", perks: "国内顶级 · 央企背景 · 高端人脉", level: "投行" },
  citic: { salary: "45k·16（月）", perks: "综合金融 · 资源广 · 晋升体系完善", level: "投行" },
  goldman: { salary: "80k+·16（月）", perks: "全球顶级 · 股票 · 华尔街精英圈", level: "投行" },
  morgan: { salary: "75k·16（月）", perks: "国际平台 · 高强度培养 · 顶级履历", level: "投行" },

  // 补充中厂
  ctrip: { salary: "20k·14（月）", perks: "旅游福利 · 弹性假期 · 稳定", level: "中厂" },
  didi: { salary: "22k·14（月）", perks: "出行补贴 · 年终奖 · 成长快", level: "中厂" },
  iqiyi: { salary: "19k·14（月）", perks: "内容文化 · 会员权益 · 创意氛围", level: "中厂" },

  // 补充小厂
  fanka: { salary: "15k·13（月）", perks: "年轻团队 · 高颜值文化", level: "小厂" },
  mixue: { salary: "16k·13（月）", perks: "下沉市场 · 快速扩张 · 活力氛围", level: "小厂" },
  chayan: { salary: "15k·13（月）", perks: "中式文化 · 创意设计 · 品牌感强", level: "小厂" },
  zuoyebang: { salary: "17k·14（月）", perks: "教育赛道 · 技术成长 · 远程灵活", level: "小厂" },
  yuanfudao: { salary: "17k·14（月）", perks: "在线教育 · 学习氛围 · 成长空间", level: "小厂" },
};

const COMPANY_LOGOS: Record<string, string> = {
  tencent: "/assets/visuals/companies/tencent.png",
  bytedance: "/assets/visuals/companies/bytedance.jpeg",
  alibaba: "/assets/visuals/companies/alibaba.webp",
  jd: "/assets/visuals/companies/jd.png",
  baidu: "/assets/visuals/companies/baidu.jpg",
  kuaishou: "/assets/visuals/companies/kuaishou.webp",
  google: "/assets/visuals/companies/google.webp",
  microsoft: "/assets/visuals/companies/microsoft.webp",
  meta: "/assets/visuals/companies/meta.png",
  mckinsey: "/assets/visuals/companies/mckinsey.webp",
  bcg: "/assets/visuals/companies/bcg.webp",
  bain: "/assets/visuals/companies/bain.png",
  deloitte: "/assets/visuals/companies/deloitte.jpg",
  tesla: "/assets/visuals/companies/tesla.webp",
  li: "/assets/visuals/companies/li.webp",
  xpeng: "/assets/visuals/companies/xpeng.png",
  byd: "/assets/visuals/companies/byd.jpg",
  netease: "/assets/visuals/companies/netease.jpg",
  beike: "/assets/visuals/companies/beike.png",
  iflytek: "/assets/visuals/companies/iflytek.jpg",
  xiaohongshu: "/assets/visuals/companies/xiaohongshu.webp",
  bilibili: "/assets/visuals/companies/bilibili.jpg",
  dewu: "/assets/visuals/companies/dewu.webp",
  ctrip: "/assets/visuals/companies/ctrip.jpg",
  didi: "/assets/visuals/companies/didi.jpg",
  iqiyi: "/assets/visuals/companies/iqiyi.jpg",
  keep: "/assets/visuals/companies/keep.jpg",
  soul: "/assets/visuals/companies/soul.webp",
  boss: "/assets/visuals/companies/boss.webp",
  fanka: "/assets/visuals/companies/fanka.jpg",
  mixue: "/assets/visuals/companies/mixue.jpeg",
  chayan: "/assets/visuals/companies/chayan.png",
  zuoyebang: "/assets/visuals/companies/zuoyebang.jpg",
  yuanfudao: "/assets/visuals/companies/yuanfudao.png",
  cadg: "/assets/visuals/companies/cadg.jpg",
  vanke: "/assets/visuals/companies/vanke.jpg",
  longfor: "/assets/visuals/companies/longfor.jpg",
  cushman: "/assets/visuals/companies/cushman.jpg",
  cbre: "/assets/visuals/companies/cbre.jpeg",
  jll: "/assets/visuals/companies/jll.jpg",
  amazon: "/assets/visuals/companies/amazon.webp",
  apple: "/assets/visuals/companies/apple.png",
  nio: "/assets/visuals/companies/nio.png",
  cicc: "/assets/visuals/companies/cicc.jpg",
  citic: "/assets/visuals/companies/citic.png",
  goldman: "/assets/visuals/companies/goldman-sachs.png",
  morgan: "/assets/visuals/companies/morgan-stanley.webp",
  moji: "/assets/visuals/companies/moji.webp",
  ecadi: "/assets/visuals/companies/ecadi.png",
  seu_design: "/assets/visuals/companies/seu-design.png",
  gad: "/assets/visuals/companies/gad.png",
  meituan: "/assets/visuals/companies/meituan.png",
  pdd: "/assets/visuals/companies/pdd.jpg",
  antgroup: "/assets/visuals/companies/antgroup.png",
};
const COMPANY_ENDING_BACKGROUNDS: Record<string, string> = {
  tencent: "/assets/visuals/endings/tencent.png",
  bytedance: "/assets/visuals/endings/bytedance.png",
  alibaba: "/assets/visuals/endings/alibaba.png",
  jd: "/assets/visuals/endings/jd.png",
  baidu: "/assets/visuals/endings/baidu.png",
  kuaishou: "/assets/visuals/endings/kuaishou.png",
  google: "/assets/visuals/endings/google.png",
  microsoft: "/assets/visuals/endings/microsoft.png",
  amazon: "/assets/visuals/endings/amazon.png",
  meta: "/assets/visuals/endings/meta.png",
  apple: "/assets/visuals/endings/apple.png",
  mckinsey: "/assets/visuals/endings/mckinsey.png",
  bcg: "/assets/visuals/endings/bcg.png",
  bain: "/assets/visuals/endings/bain.png",
  deloitte: "/assets/visuals/endings/deloitte.png",
  tesla: "/assets/visuals/endings/tesla.png",
  nio: "/assets/visuals/endings/nio.png",
  li: "/assets/visuals/endings/li.png",
  xpeng: "/assets/visuals/endings/xpeng.png",
  byd: "/assets/visuals/endings/byd.png",
  citic: "/assets/visuals/endings/citic.png",
  cicc: "/assets/visuals/endings/cicc.png",
  goldman: "/assets/visuals/endings/goldman.png",
  morgan: "/assets/visuals/endings/morgan.png",
  netease: "/assets/visuals/endings/netease.png",
  beike: "/assets/visuals/endings/beike.png",
  iflytek: "/assets/visuals/endings/iflytek.png",
  xiaohongshu: "/assets/visuals/endings/xiaohongshu.png",
  bilibili: "/assets/visuals/endings/bilibili.png",
  dewu: "/assets/visuals/endings/dewu.png",
  ctrip: "/assets/visuals/endings/ctrip.png",
  didi: "/assets/visuals/endings/didi.png",
  iqiyi: "/assets/visuals/endings/iqiyi.png",
  keep: "/assets/visuals/endings/keep.png",
  soul: "/assets/visuals/endings/soul.png",
  boss: "/assets/visuals/endings/boss.png",
  moji: "/assets/visuals/endings/moji.png",
  fanka: "/assets/visuals/endings/fanka.png",
  mixue: "/assets/visuals/endings/mixue.png",
  chayan: "/assets/visuals/endings/chayan.png",
  zuoyebang: "/assets/visuals/endings/zuoyebang.png",
  yuanfudao: "/assets/visuals/endings/yuanfudao.png",
  cadg: "/assets/visuals/endings/cadg.png",
  ecadi: "/assets/visuals/endings/ecadi.png",
  vanke: "/assets/visuals/endings/vanke.png",
  longfor: "/assets/visuals/endings/longfor.png",
  seu_design: "/assets/visuals/endings/seu-design.png",
  gad: "/assets/visuals/endings/gad.png",
  cushman: "/assets/visuals/endings/cushman.png",
  cbre: "/assets/visuals/endings/cbre.png",
  jll: "/assets/visuals/endings/jll.png",
  meituan: "/assets/visuals/endings/meituan.png",
  pdd: "/assets/visuals/endings/pdd.png",
  antgroup: "/assets/visuals/endings/antgroup.png",
};
const ENDING_BACKGROUNDS: Record<string, string> = {
  expelled: "/assets/visuals/endings/expelled.png",
  self_doubt_quit: "/assets/visuals/endings/self-doubt-quit.png",
  age_anxiety_pivot: "/assets/visuals/endings/age-anxiety-pivot.png",
  stress_breakdown: "/assets/visuals/endings/stress-breakdown.png",
  delayed_graduation: "/assets/visuals/endings/delayed-graduation.png",
  failed: "/assets/visuals/endings/failed.png",
};
const OFFER_CATEGORY_ACCENTS: Record<string, string> = {
  "互联网大厂": "#5b8cff",
  "外企科技": "#72c7d8",
  "咨询公司": "#c9a84c",
  "车企": "#70c998",
  "投行": "#d8bd69",
  "中厂": "#a78bfa",
  "小厂": "#f59e5b",
  "传统路径": "#94a3b8",
};

function getOfferRole(category: string): string {
  if (category === "咨询公司") return "战略咨询顾问";
  if (category === "投行") return "投资银行分析师";
  if (category === "传统路径") return "建筑与项目管理岗";
  if (category === "车企") return "智能产品经理";
  return "产品经理（校招）";
}

function normalizeDistributionCount(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function normalizeGameResultDistribution(value: unknown): GameResultDistribution {
  const raw = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const endings = Array.isArray(raw.endings) ? raw.endings : [];
  const offers = Array.isArray(raw.offers) ? raw.offers : [];
  return {
    total: normalizeDistributionCount(raw.total),
    endings: endings.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const row = item as Record<string, unknown>;
      return typeof row.title === "string" ? [{ title: row.title, count: normalizeDistributionCount(row.count) }] : [];
    }),
    offers: offers.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const row = item as Record<string, unknown>;
      return typeof row.name === "string" ? [{ name: row.name, count: normalizeDistributionCount(row.count) }] : [];
    }),
  };
}

function aggregateGameResultRows(rows: GameResultDistributionRow[]): GameResultDistribution {
  const endingCounts = new Map<string, number>();
  const offerCounts = new Map<string, number>();
  rows.forEach((row) => {
    if (row.ending_title) endingCounts.set(row.ending_title, (endingCounts.get(row.ending_title) ?? 0) + 1);
    if (row.offer_name) offerCounts.set(row.offer_name, (offerCounts.get(row.offer_name) ?? 0) + 1);
  });
  return {
    total: rows.length,
    endings: Array.from(endingCounts, ([title, count]) => ({ title, count })).sort((a, b) => b.count - a.count),
    offers: Array.from(offerCounts, ([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
  };
}

// 简化的实习机会（根据当前能力值筛选）
interface InternshipOption {
  id: string;
  companyId?: string;
  title: string;
  companyName: string;
  stipend: string;
  description: string;
  minLogic: number;
  minExpression: number;
  minEnglish?: number;
  minStructured?: number;
  detailedAchievements?: string[]; // 新增：用于结局页展示的具体工作成就
}

type InternshipChannel = "official" | "direct" | "referral";
type InternshipApplicationStatus = "submitted" | "interview" | "interview_pending" | "offered" | "rejected" | "silent" | "accepted" | "declined";

interface InternshipApplication {
  id: string;
  internshipId: string;
  channel: InternshipChannel;
  submittedRound: number;
  status: InternshipApplicationStatus;
  message: string;
  interviewStage?: "invited" | "preparing" | "in_progress" | "waiting_result";
  interviewPreparation?: ComputerInterviewPreparation;
  interviewQuestionIndex?: number;
  interviewAnswers?: ComputerInterviewAnswer[];
  interviewScore?: number;
  interviewPassed?: boolean;
  interviewCompletedRound?: number;
  fitAtSubmission?: "matched" | "stretch";
  screeningMindsetSettled?: boolean;
  interviewResultMindsetSettled?: boolean;
  mindsetFeedback?: string;
}

const INTERNSHIP_CHANNELS: Array<{
  id: InternshipChannel;
  label: string;
  description: string;
  bonus: number;
}> = [
  { id: "official", label: "官网海投", description: "不消耗人脉，反馈较慢，胜在稳定。", bonus: 0 },
  { id: "direct", label: "招聘平台直聊", description: "主动联系招聘者，更看重表达能力。", bonus: 6 },
  { id: "referral", label: "校友内推", description: "让简历更容易被看到，人脉越高越有效。", bonus: 10 },
];

const INTERNSHIP_OPTIONS: InternshipOption[] = [
  {
    id: "intern_tencent",
    title: "产品策划实习生",
    companyId: "tencent",
    companyName: "腾讯",
    stipend: "400 元/天 · 住房补贴",
    description: "参与微信或互娱业务线的日常需求评审，负责功能模块的产品设计与竞品分析。",
    minLogic: 68,
    minExpression: 65,
    detailedAchievements: [
      "负责微信搜一搜功能模块的竞品分析，输出20页分析报告，获部门内部好评。",
      "参与设计新版朋友圈广告投放逻辑，协助提升点击率 0.5%。",
    ],
  },
  {
    id: "intern_tencent_pm",
    title: "产品经理实习生",
    companyId: "tencent",
    companyName: "腾讯",
    stipend: "450 元/天 · 住房补贴",
    description: "负责核心业务线的产品规划与迭代，需具备极强的逻辑思维与跨部门沟通能力。",
    minLogic: 72,
    minExpression: 68,
    detailedAchievements: [
      "独立负责某社交功能灰度测试，协调开发与测试团队，按时上线并回收万份用户反馈。",
      "主导产品需求评审会（PRD），推动跨部门协作，解决历史遗留的交互体验问题。",
    ],
  },
  {
    id: "intern_tencent_ops",
    title: "产品运营实习生",
    companyId: "tencent",
    companyName: "腾讯",
    stipend: "350 元/天 · 班车接送",
    description: "协助策划线上活动方案，监控运营数据指标，优化用户活跃度。",
    minLogic: 62,
    minExpression: 65,
    detailedAchievements: [
      "策划并执行春节红包活动，累计触达用户超百万，日活提升显著。",
      "每日监控核心运营数据，输出日报周报，及时发现并反馈业务异常。",
    ],
  },
  {
    id: "intern_bytedance",
    title: "产品运营实习生",
    companyId: "bytedance",
    companyName: "字节跳动",
    stipend: "400 元/天 · 三餐全包",
    description: "参与拉新活动的策略制定与落地执行，分析用户数据并输出优化方案。",
    minLogic: 65,
    minExpression: 62,
    detailedAchievements: [
      "参与抖音春节集卡活动运营，负责社群答疑与用户反馈收集，优化活动FAQ。",
      "通过A/B Test分析不同推送文案效果，优化Push点击率提升 10%。",
    ],
  },
  {
    id: "intern_bytedance_aipm",
    title: "AI产品经理实习生",
    companyId: "bytedance",
    companyName: "字节跳动",
    stipend: "500 元/天 · 就近租房补贴",
    description: "参与大模型应用场景落地，需对AIGC技术有深入理解并能转化为产品需求。",
    minLogic: 75,
    minExpression: 70,
    detailedAchievements: [
      "参与豆包APP对话模型微调数据标注标准制定，提升模型回复准确率。",
      "调研海外AIGC应用场景，输出竞品分析报告，为内部产品迭代提供策略支持。",
    ],
  },
  {
    id: "intern_bytedance_content",
    title: "内容运营实习生",
    companyId: "bytedance",
    companyName: "字节跳动",
    stipend: "350 元/天 · 下午茶",
    description: "负责抖音/头条内容生态的治理与推荐策略优化，挖掘优质创作者。",
    minLogic: 60,
    minExpression: 65,
    detailedAchievements: [
      "审核并挖掘优质知识类创作者，建立核心作者库，累计签约入驻达人50+。",
      "优化内容审核SOP，提升低质内容拦截效率，净化平台内容生态。",
    ],
  },
  {
    id: "intern_ali_product",
    title: "产品经理实习生",
    companyId: "alibaba",
    companyName: "阿里巴巴",
    stipend: "400 元/天 · 园区食堂",
    description: "参与淘宝/天猫核心交易链路的产品设计，需具备极强的商业敏感度。",
    minLogic: 70,
    minExpression: 65,
    detailedAchievements: [
      "参与淘宝大促期间购物车功能优化，协助提升凑单转化率。",
      "负责商家后台订单管理模块重构，简化操作流程，商家满意度提升。",
    ],
  },
  {
    id: "intern_ali_operation",
    title: "行业运营实习生",
    companyId: "alibaba",
    companyName: "阿里巴巴",
    stipend: "300 元/天 · 餐补",
    description: "负责特定行业商家的拓展与维护，策划大促营销活动。",
    minLogic: 62,
    minExpression: 68,
    detailedAchievements: [
      "负责服饰行业商家入驻审核与培训，累计服务商家超200家。",
      "策划双11行业会场楼层布局，协调设计资源，保障页面按时上线。",
    ],
  },
  {
    id: "intern_meituan_strategy",
    title: "商业分析实习生",
    companyId: "meituan",
    companyName: "美团",
    stipend: "350 元/天 · 免费开水",
    description: "协助进行外卖业务的经营分析与竞对调研，产出高质量分析报告。",
    minLogic: 75,
    minExpression: 60,
    detailedAchievements: [
      "搭建城市外卖业务监控报表，每日追踪单量、客单价等核心指标。",
      "深入调研下沉市场外卖竞争格局，输出30页深度分析报告，供管理层决策参考。",
    ],
  },
  {
    id: "intern_meituan_pm",
    title: "产品实习生",
    companyId: "meituan",
    companyName: "美团",
    stipend: "300 元/天 · 团建多",
    description: "负责到店业务B端商户后台的功能优化，注重逻辑闭环。",
    minLogic: 68,
    minExpression: 55,
    detailedAchievements: [
      "优化商家端评价管理功能，提升商家回复效率及用户满意度。",
      "参与收银系统硬件对接流程梳理，输出标准化接入文档，降低沟通成本。",
    ],
  },
  {
    id: "intern_pdd_strategy",
    title: "策略产品实习生",
    companyId: "pdd",
    companyName: "拼多多",
    stipend: "500 元/天 · 包三餐",
    description: "参与百亿补贴等核心业务的增长策略制定，抗压能力要求极高。",
    minLogic: 78,
    minExpression: 50,
    detailedAchievements: [
      "分析百亿补贴用户复购数据，制定精准发券策略，ROI提升显著。",
      "监控竞品价格变动，动态调整商品补贴力度，确保价格优势。",
    ],
  },
  {
    id: "intern_netease_game_pm",
    title: "游戏策划实习生",
    companyId: "netease",
    companyName: "网易游戏",
    stipend: "400 元/天 · 猪厂食堂",
    description: "参与新项目的数值或文案策划，需要丰富的游戏阅历与创意。",
    minLogic: 65,
    minExpression: 75,
    detailedAchievements: [
      "负责某MMORPG游戏支线任务文案撰写，设计沉浸式剧情体验。",
      "配置游戏道具数值表，参与经济系统平衡性测试与调优。",
    ],
  },
  {
    id: "intern_netease_pm",
    title: "产品策划实习生",
    companyId: "netease",
    companyName: "网易云音乐",
    stipend: "350 元/天 · 严选折扣",
    description: "负责社区互动氛围的营造与功能迭代，关注年轻用户心理。",
    minLogic: 60,
    minExpression: 70,
    detailedAchievements: [
      "策划云村评论区互动活动，引导用户生产优质乐评，提升社区活跃度。",
      "参与播客功能改版调研，访谈核心用户，输出体验优化建议。",
    ],
  },
  {
    id: "intern_kuaishou_pm",
    title: "产品经理实习生",
    companyId: "kuaishou",
    companyName: "快手",
    stipend: "450 元/天 · 房补",
    description: "负责直播业务的变现产品设计，需对下沉市场用户有深刻理解。",
    minLogic: 68,
    minExpression: 62,
    detailedAchievements: [
      "设计直播间互动礼物特效，提升用户打赏意愿与互动氛围。",
      "优化主播后台数据看板，帮助主播更好地进行直播复盘。",
    ],
  },
  {
    id: "intern_kuaishou_ops",
    title: "社区运营实习生",
    companyId: "kuaishou",
    companyName: "快手",
    stipend: "300 元/天 · 冰激凌",
    description: "挖掘站内优质短视频内容，维护核心创作者关系。",
    minLogic: 55,
    minExpression: 65,
    detailedAchievements: [
      "挖掘三农领域优质创作者，提供内容指导与流量扶持，孵化百万粉账号。",
      "策划短视频挑战赛活动，吸引数十万用户参与拍摄，播放量破亿。",
    ],
  },
  {
    id: "intern_jd_pm",
    title: "产品经理实习生",
    companyId: "jd",
    companyName: "京东",
    stipend: "350 元/天 · 餐补",
    description: "参与物流供应链系统的产品优化，注重流程效率与逻辑严密性。",
    minLogic: 72,
    minExpression: 55,
    detailedAchievements: [
      "参与仓储管理系统（WMS）功能优化，提升分拣出库效率。",
      "设计配送员APP端路线规划功能，辅助提升最后一公里配送时效。",
    ],
  },
  {
    id: "intern_microsoft_pm",
    title: "Program Manager Intern",
    companyId: "microsoft",
    companyName: "微软",
    stipend: "500 元/天 · 弹性不打卡",
    description: "参与Azure云服务或Office套件的产品规划，全英文工作环境，极度重视逻辑与沟通。",
    minLogic: 85,
    minExpression: 80,
    detailedAchievements: [
      "Collaborated with engineering team to define specs for new Azure features.",
      "Conducted user research across global markets to identify pain points in Office suite.",
    ],
  },
  {
    id: "intern_google_pm",
    title: "Associate Product Manager Intern",
    companyId: "google",
    companyName: "Google",
    stipend: "600 元/天 · 顶级食堂",
    description: "负责Search或Ads产品的创新功能探索，需要极客精神与全球化视野。",
    minLogic: 88,
    minExpression: 75,
    detailedAchievements: [
      "Analyzed search query data to identify emerging user trends and propose new features.",
      "Worked on Google Ads UI improvements, increasing advertiser retention rate.",
    ],
  },
  {
    id: "intern_amazon_ops",
    title: "Operations Intern",
    companyId: "amazon",
    companyName: "Amazon",
    stipend: "400 元/天 · 领导力准则",
    description: "负责跨境电商业务的数据监控与流程优化，强调数据驱动决策。",
    minLogic: 78,
    minExpression: 70,
    detailedAchievements: [
      "Optimized cross-border logistics processes, reducing delivery time by 15%.",
      "Built dashboards to monitor inventory levels and predict stock shortages.",
    ],
  },
  {
    id: "intern_mckinsey_pta",
    title: "Part-time Assistant",
    companyId: "mckinsey",
    companyName: "麦肯锡",
    stipend: "350 元/天 · 顶级圈层",
    description: "协助顾问团队进行行业研究与专家访谈，需要极强的案头研究能力与PPT制作技巧。",
    minLogic: 90,
    minExpression: 85,
    detailedAchievements: [
      "Conducting extensive desk research on the EV market in China.",
      "Assisting in preparing client presentation decks and expert interview notes.",
    ],
  },
  {
    id: "intern_bcg_pta",
    title: "Project Assistant",
    companyId: "bcg",
    companyName: "BCG",
    stipend: "300 元/天 · 每日水果",
    description: "参与数字化转型项目的战略咨询，高强度脑力激荡，逻辑思维要求极高。",
    minLogic: 88,
    minExpression: 82,
    detailedAchievements: [
      "Supported digital transformation strategy for a Fortune 500 client.",
      "Analyzed financial data to build market sizing models.",
    ],
  },
  {
    id: "intern_goldman_ibd",
    title: "Investment Banking Intern",
    companyId: "goldman",
    companyName: "高盛",
    stipend: "1000 元/天 · 华尔街精英",
    description: "参与IPO或并购项目的估值建模，工作强度极大但回报丰厚，精英文化浓厚。",
    minLogic: 92,
    minExpression: 78,
    detailedAchievements: [
      "Built DCF models for potential M&A targets in the TMT sector.",
      "Prepared pitch books and industry landscape analysis for senior bankers.",
    ],
  },
  {
    id: "intern_loreal_mkt",
    title: "Marketing Intern",
    companyName: "欧莱雅",
    stipend: "200 元/天 · 免费化妆品",
    description: "负责高端护肤品牌的新品上市策划，需要敏锐的时尚触觉与流利的英语表达。",
    minLogic: 65,
    minExpression: 85,
    detailedAchievements: [
      "Assisted in launching a new skincare product line, coordinating with KOLs.",
      "Analyzed social media campaign performance and provided optimization suggestions.",
    ],
  },
  {
    id: "intern_tesla_pm",
    title: "Product Management Intern",
    companyId: "tesla",
    companyName: "Tesla",
    stipend: "450 元/天 · 马斯克文化",
    description: "参与自动驾驶或能源产品的用户体验优化，First Principles思维至上。",
    minLogic: 82,
    minExpression: 70,
    detailedAchievements: [
      "Applied First Principles thinking to redesign the charging station user journey.",
      "Analyzed vehicle data to improve Autopilot safety features.",
    ],
  },
  {
    id: "intern_apple_marcom",
    title: "Marcom Intern",
    companyId: "apple",
    companyName: "Apple",
    stipend: "500 元/天 · 保密文化",
    description: "协助大中华区市场营销活动的落地，对细节要求近乎苛刻。",
    minLogic: 75,
    minExpression: 88,
    detailedAchievements: [
      "Supported localization of global marketing campaigns for the Greater China region.",
      "Ensured strict adherence to brand guidelines in all creative assets.",
    ],
  },
  {
    id: "intern_xiaohongshu",
    title: "社区商业化实习生",
    companyId: "xiaohongshu",
    companyName: "小红书",
    stipend: "300 元/天 · 下午茶",
    description: "负责内容互动相关的体验优化，协助推进社区变现的专项调研。",
    minLogic: 60,
    minExpression: 58,
    detailedAchievements: [
      "负责种草笔记的互动数据分析，优化笔记分发权重逻辑，提升互动率。",
      "参与社区电商大促活动运营，对接品牌方与博主，保障活动顺利落地。",
    ],
  },
  {
    id: "intern_bilibili",
    title: "用户体验实习生",
    companyId: "bilibili",
    companyName: "哔哩哔哩",
    stipend: "300 元/天 · 弹性打卡",
    description: "设计B站新功能的原型线框图，从0到1收集用户反馈完成灰度测试。",
    minLogic: 55,
    minExpression: 55,
    detailedAchievements: [
      "参与B站移动端投稿工具改版，输出低保真原型图，协助设计师完成UI设计。",
      "收集用户关于弹幕功能的反馈意见，整理成需求文档，推动产品优化迭代。",
    ],
  },
  {
    id: "intern_keep",
    title: "初级产品实习生",
    companyId: "keep",
    companyName: "Keep",
    stipend: "200 元/天 · 免费健身",
    description: "从用户访谈到上线跟踪都需要你参与，是快速了解产品全流程的好机会。",
    minLogic: 45,
    minExpression: 45,
    detailedAchievements: [
      "负责Keep跑步功能的用户调研，访谈30+核心用户，挖掘用户痛点。",
      "跟进新版本功能埋点数据验证，确保数据上报准确性。",
    ],
  },
  {
    id: "intern_local_media",
    title: "新媒体小编",
    companyName: "某本地MCN",
    stipend: "120 元/天 · 零食管饱",
    description: "负责公众号排版和简单的短视频剪辑，只要细心就能胜任。",
    minLogic: 30,
    minExpression: 35,
    detailedAchievements: [
      "独立负责公众号每日推文排版，累计阅读量超10万。",
      "剪辑制作本地探店短视频，单条视频最高播放量达5万。",
    ],
  },
  {
    id: "intern_startup_ops",
    title: "用户运营实习生",
    companyName: "初创社交App",
    stipend: "150 元/天 · 弹性工作",
    description: "在社群里陪用户聊天，收集反馈，偶尔帮忙写写文案。",
    minLogic: 35,
    minExpression: 40,
    detailedAchievements: [
      "维护核心用户社群，每日活跃度维持在20%以上。",
      "撰写APP版本更新日志与活动预热文案，提升用户更新率。",
    ],
  },
  {
    id: "intern_design_firm",
    title: "设计助理实习生",
    companyName: "直向建筑",
    stipend: "100 元/天 · 老板nice",
    description: "帮忙整理素材库，做一些简单的PS修图工作，能学到基础技能。",
    minLogic: 30,
    minExpression: 30,
    detailedAchievements: [
      "整理公司过往项目素材库，建立规范的分类索引体系。",
      "协助完成某公建项目文本排版与PS效果图后期处理。",
    ],
  },
  {
    id: "intern_ecom_cs",
    title: "电商客服实习生",
    companyName: "建筑学代画淘宝店",
    stipend: "120 元/天 · 提成",
    description: "回复买家咨询，处理售后订单，需要极好的耐心。",
    minLogic: 25,
    minExpression: 45,
    detailedAchievements: [
      "每日接待超200位买家咨询，保持旺旺回复率100%。",
      "妥善处理售后纠纷，店铺DSR评分维持在4.9分以上。",
    ],
  },
  {
    id: "intern_local_soe",
    title: "行政助理实习生",
    companyId: "cadg",
    companyName: "中国建筑设计研究院",
    stipend: "100 元/天 · 食堂超好",
    description: "协助整理档案，收发文件，工作节奏慢，适合考公备考。",
    minLogic: 35,
    minExpression: 35,
    detailedAchievements: [
      "负责部门会议纪要整理与档案归档工作，确保文档零丢失。",
      "协助组织部门团建活动与日常行政物资采购。",
    ],
  },
  {
    id: "intern_data_entry",
    title: "建筑设计实习生",
    companyId: "seu_design",
    companyName: "东南大学建筑设计研究院",
    stipend: "150 元/天 · 校园环境",
    description: "负责将别人的方案拼凑成自己的方案，工作枯燥但繁杂，不需要动脑。",
    minLogic: 20,
    minExpression: 20,
    detailedAchievements: [
      "协助绘制项目扩初图纸，完成楼梯间、卫生间详图绘制。",
      "根据主创设计师草图，快速搭建SU模型推敲体块方案。",
    ],
  },
  {
    id: "intern_event_assist",
    title: "活动执行助理",
    companyId: "mixue",
    companyName: "蜜雪冰城",
    stipend: "140 元/天 · 包盒饭",
    description: "帮忙布置会场，搬运物料，现场维持秩序，体力活较多。",
    minLogic: 30,
    minExpression: 40,
    detailedAchievements: [
      "参与蜜雪冰城音乐节现场执行，负责物料搬运与现场秩序维护。",
      "协助搭建活动展台，确保现场活动流程顺畅进行。",
    ],
  },
  {
    id: "intern_edu_tutor",
    title: "游戏产品与开发实习生",
    companyName: "大轩科技有限公司",
    stipend: "200 元/天 · 弹性远程",
    description: "参与《我是一个“建”人》建筑转行模拟器的产品设计与开发，把建筑生的真实经历做成可玩的分支叙事。",
    minLogic: 40,
    minExpression: 45,
    detailedAchievements: [
      "参与随机事件、属性系统与分支叙事设计，将建筑生转行经历转化为可交互玩法。",
      "协助迭代 React + TypeScript 游戏界面，并根据玩家反馈优化选择与结局体验。",
    ],
  },
  {
    id: "intern_boss",
    title: "产品助理",
    companyId: "boss",
    companyName: "Boss直聘",
    stipend: "250 元/天 · 导师带教",
    description: "协助产品经理进行需求调研和数据整理，参与日常的立项会议。",
    minLogic: 40,
    minExpression: 40,
  },
  {
    id: "intern_fanka",
    title: "内容审核实习生",
    companyId: "fanka",
    companyName: "翻咔",
    stipend: "150 元/天 · 弹性工作",
    description: "负责LGBT社群内容审核与话题引导，及时处理违规内容。",
    minLogic: 35,
    minExpression: 40,
    detailedAchievements: [
      "负责社区每日内容巡查，处理违规内容，维护社区健康生态。",
      "策划周末话题活动，引导用户分享生活动态，提升社区活跃度。",
    ],
  },
  {
    id: "intern_chayan",
    title: "新媒体运营实习生",
    companyId: "chayan",
    companyName: "茶颜悦色",
    stipend: "140 元/天 · 奶茶自由",
    description: "参与公众号与小红书的内容策划，撰写推文。",
    minLogic: 35,
    minExpression: 45,
    detailedAchievements: [
      "撰写品牌联名活动推文，阅读量突破 5w+。",
      "负责小红书账号日常运营，拍摄产品图并撰写种草文案。",
    ],
  },
  {
    id: "intern_ctrip",
    title: "产品运营实习生",
    companyId: "ctrip",
    companyName: "携程",
    stipend: "200 元/天 · 旅游津贴",
    description: "协助跟进机票/酒店业务线的活动配置与数据复盘。",
    minLogic: 50,
    minExpression: 45,
    detailedAchievements: [
      "配置大促期间的机票优惠券活动，监控领取率与核销率。",
      "分析用户退改签数据，输出优化建议报告。",
    ],
  },
  {
    id: "intern_didi",
    title: "用户增长实习生",
    companyId: "didi",
    companyName: "滴滴",
    stipend: "250 元/天 · 晚餐",
    description: "参与司机端或乘客端的拉新活动策划与执行。",
    minLogic: 55,
    minExpression: 45,
    detailedAchievements: [
      "协助策划司机端拉新奖励活动，通过数据分析优化奖励梯度。",
      "负责地推渠道的数据回收与作弊排查。",
    ],
  },
  {
    id: "intern_iqiyi",
    title: "内容策略实习生",
    companyId: "iqiyi",
    companyName: "爱奇艺",
    stipend: "180 元/天 · 追剧自由",
    description: "分析剧集播放数据，协助制定剧集推广策略。",
    minLogic: 50,
    minExpression: 50,
    detailedAchievements: [
      "分析站内热播剧集的用户画像，为宣发团队提供数据支持。",
      "参与自制综艺的选题策划会，提供年轻用户视角的创意。",
    ],
  },
  {
    id: "intern_zuoyebang",
    title: "用户研究实习生",
    companyId: "zuoyebang",
    companyName: "作业帮",
    stipend: "200 元/天 · 免费晚餐",
    description: "协助进行K12用户访谈，整理用户反馈。",
    minLogic: 45,
    minExpression: 45,
    detailedAchievements: [
      "招募并访谈 20 位初中生家长，挖掘在线辅导痛点。",
      "整理用户反馈录音，输出用户体验地图。",
    ],
  },
  {
    id: "intern_yuanfudao",
    title: "课程产品实习生",
    companyId: "yuanfudao",
    companyName: "猿辅导",
    stipend: "220 元/天 · 零食",
    description: "参与在线课程的标准化课件制作与验收。",
    minLogic: 45,
    minExpression: 40,
    detailedAchievements: [
      "审核并优化小学数学课程的互动课件，提升学生完课率。",
      "跟进直播课现场，收集主讲老师与学生的互动反馈。",
    ],
  },
  {
    id: "intern_gad",
    title: "建筑设计实习生",
    companyId: "gad",
    companyName: "gad",
    stipend: "120 元/天 · 豪宅项目",
    description: "参与高端住宅项目的立面深化与文本制作。",
    minLogic: 40,
    minExpression: 30,
    detailedAchievements: [
      "协助绘制某高端住宅项目的立面大样图。",
      "参与项目汇报文本的排版与分析图绘制。",
    ],
  },
  {
    id: "intern_cushman",
    title: "房地产分析实习生",
    companyId: "cushman",
    companyName: "戴德梁行",
    stipend: "150 元/天 · CBD办公",
    description: "协助撰写写字楼/商业地产市场季度报告。",
    minLogic: 50,
    minExpression: 55,
    detailedAchievements: [
      "收集并整理主要城市的甲级写字楼租金与空置率数据。",
      "协助分析师撰写季度市场报告，翻译部分英文摘要。",
    ],
  },
  {
    id: "intern_tesla",
    title: "产品体验实习生",
    companyId: "tesla",
    companyName: "Tesla",
    stipend: "200 元/天 · 期权梦想",
    description: "参与车辆交付环节的用户教育与体验优化。",
    minLogic: 50,
    minExpression: 50,
    detailedAchievements: [
      "协助交付中心优化车主提车流程，提车满意度提升。",
      "收集用户对车机系统的反馈，翻译并反馈给总部产品团队。",
    ],
  },
  {
    id: "intern_cicc",
    title: "行研分析实习生",
    companyId: "cicc",
    companyName: "中金公司",
    stipend: "300 元/天 · 顶级光环",
    description: "协助分析师进行行业数据搜集与底稿搭建。",
    minLogic: 60,
    minExpression: 45,
    detailedAchievements: [
      "负责新能源汽车行业的数据日报更新，熟练使用Wind终端。",
      "协助撰写深度行业报告的图表绘制与数据核对。",
    ],
  },
  {
    id: "intern_baidu_ai_pm",
    companyId: "baidu",
    title: "AI 产品经理实习生",
    companyName: "百度",
    stipend: "350 元/天 · AI 业务",
    description: "参与搜索或大模型产品的需求分析、用户反馈整理与功能迭代。",
    minLogic: 68,
    minExpression: 62,
    minStructured: 65,
    detailedAchievements: ["整理大模型产品用户反馈并完成需求分级。", "参与搜索功能竞品分析，输出产品优化建议。"],
  },
  {
    id: "intern_ant_business",
    companyId: "antgroup",
    title: "商业分析实习生",
    companyName: "蚂蚁集团",
    stipend: "400 元/天 · 园区餐补",
    description: "围绕支付与数字金融业务搭建分析框架，协助完成经营复盘。",
    minLogic: 75,
    minExpression: 65,
    minStructured: 72,
    detailedAchievements: ["搭建业务指标看板并定位转化漏斗异常。", "协助完成行业研究与季度经营复盘。"],
  },
  {
    id: "intern_meta_uxr",
    companyId: "meta",
    title: "UX Research Intern",
    companyName: "Meta",
    stipend: "600 元/天 · Remote Collaboration",
    description: "参与国际化产品用户研究，从访谈与行为数据中提炼体验洞察。",
    minLogic: 76,
    minExpression: 75,
    minEnglish: 82,
    minStructured: 72,
    detailedAchievements: ["Designed and conducted interviews with cross-market users.", "Synthesized research findings into product recommendations."],
  },
  {
    id: "intern_bain_aci",
    companyId: "bain",
    title: "Associate Consultant Intern",
    companyName: "Bain",
    stipend: "500 元/天 · 项目制",
    description: "协助咨询项目完成市场研究、访谈纪要与问题拆解。",
    minLogic: 80,
    minExpression: 74,
    minEnglish: 68,
    minStructured: 80,
    detailedAchievements: ["完成消费行业市场规模测算与竞品分析。", "将专家访谈整理为结构化项目洞察。"],
  },
  {
    id: "intern_deloitte_consulting",
    companyId: "deloitte",
    title: "Consulting Analyst Intern",
    companyName: "Deloitte",
    stipend: "300 元/天 · 客户项目",
    description: "参与数字化转型项目，协助整理业务流程并制作客户汇报材料。",
    minLogic: 72,
    minExpression: 68,
    minEnglish: 65,
    minStructured: 72,
    detailedAchievements: ["梳理客户现有业务流程并识别关键痛点。", "参与制作数字化转型方案与管理层汇报。"],
  },
  {
    id: "intern_nio_ux_ops",
    companyId: "nio",
    title: "用户体验运营实习生",
    companyName: "蔚来",
    stipend: "300 元/天 · 用户活动",
    description: "参与用户社区与线下空间体验运营，连接产品、服务和用户反馈。",
    minLogic: 62,
    minExpression: 68,
    detailedAchievements: ["协助策划用户中心活动并复盘到场与满意度数据。", "整理车主反馈，推动服务流程体验优化。"],
  },
  {
    id: "intern_li_strategy",
    companyId: "li",
    title: "产品策略实习生",
    companyName: "理想",
    stipend: "350 元/天 · 晚餐班车",
    description: "研究家庭用户出行场景，支持车型功能与产品策略判断。",
    minLogic: 72,
    minExpression: 62,
    minStructured: 70,
    detailedAchievements: ["分析家庭用户出行需求并形成场景地图。", "参与竞品车型功能拆解和策略汇报。"],
  },
  {
    id: "intern_xpeng_cockpit",
    companyId: "xpeng",
    title: "智能座舱产品实习生",
    companyName: "小鹏",
    stipend: "320 元/天 · 通勤班车",
    description: "参与车机交互与智能座舱功能设计，跟踪需求到测试闭环。",
    minLogic: 70,
    minExpression: 58,
    minStructured: 68,
    detailedAchievements: ["绘制车机功能用户旅程并提出交互优化建议。", "跟踪需求评审、测试反馈与版本上线。"],
  },
  {
    id: "intern_byd_planning",
    companyId: "byd",
    title: "产品规划实习生",
    companyName: "比亚迪",
    stipend: "250 元/天 · 食宿补贴",
    description: "协助新能源车型市场研究、用户需求分析与配置规划。",
    minLogic: 65,
    minExpression: 56,
    minStructured: 64,
    detailedAchievements: ["整理新能源细分市场销量与配置数据。", "协助输出目标用户画像和车型配置建议。"],
  },
  {
    id: "intern_citic_ibd",
    companyId: "citic",
    title: "投资银行部实习生",
    companyName: "中信证券",
    stipend: "300 元/天 · 项目补贴",
    description: "协助完成行业研究、申报材料核查与项目底稿整理。",
    minLogic: 78,
    minExpression: 64,
    minEnglish: 68,
    minStructured: 76,
    detailedAchievements: ["核对项目申报材料并维护尽调底稿。", "完成行业数据搜集与可比公司分析。"],
  },
  {
    id: "intern_morgan_ibd",
    companyId: "morgan",
    title: "IBD Summer Analyst",
    companyName: "Morgan Stanley",
    stipend: "650 元/天 · Summer Program",
    description: "参与跨境投融资项目的行业研究、估值分析与材料制作。",
    minLogic: 84,
    minExpression: 75,
    minEnglish: 82,
    minStructured: 82,
    detailedAchievements: ["Built comparable-company analysis for a cross-border transaction.", "Supported pitchbook preparation and financial data verification."],
  },
  {
    id: "intern_beike_product",
    companyId: "beike",
    title: "居住产品实习生",
    companyName: "贝壳找房",
    stipend: "250 元/天 · 居住研究",
    description: "把建筑空间理解转化为线上找房与居住服务产品体验。",
    minLogic: 58,
    minExpression: 55,
    minStructured: 56,
    detailedAchievements: ["梳理用户从搜索房源到线下带看的完整旅程。", "参与户型标签与房源信息展示优化。"],
  },
  {
    id: "intern_iflytek_ai_pm",
    companyId: "iflytek",
    title: "AI 产品实习生",
    companyName: "科大讯飞",
    stipend: "240 元/天 · AI 场景",
    description: "参与语音与大模型产品的场景调研、数据验收和需求设计。",
    minLogic: 62,
    minExpression: 56,
    minStructured: 60,
    detailedAchievements: ["整理教育场景语音交互需求与异常样本。", "协助完成 AI 功能验收标准和需求文档。"],
  },
  {
    id: "intern_dewu_growth",
    companyId: "dewu",
    title: "用户增长实习生",
    companyName: "得物",
    stipend: "260 元/天 · 潮流业务",
    description: "围绕年轻用户完成增长活动配置、数据监测与策略复盘。",
    minLogic: 57,
    minExpression: 55,
    detailedAchievements: ["监测拉新活动漏斗并定位关键流失环节。", "协助设计用户召回实验与活动复盘。"],
  },
  {
    id: "intern_soul_community",
    companyId: "soul",
    title: "社区产品实习生",
    companyName: "Soul",
    stipend: "220 元/天 · 弹性工作",
    description: "参与社交社区互动功能和内容生态治理的产品迭代。",
    minLogic: 48,
    minExpression: 52,
    detailedAchievements: ["分析新用户破冰路径并提出功能优化方案。", "整理社区内容反馈，协助更新治理规则。"],
  },
  {
    id: "intern_moji_ops",
    companyId: "moji",
    title: "产品运营实习生",
    companyName: "墨迹天气",
    stipend: "180 元/天 · 弹性打卡",
    description: "参与天气场景内容运营、用户反馈和功能数据复盘。",
    minLogic: 42,
    minExpression: 44,
    detailedAchievements: ["策划极端天气专题并跟踪用户触达数据。", "整理天气预警功能反馈并推动体验优化。"],
  },
  {
    id: "intern_ecadi_arch",
    companyId: "ecadi",
    title: "建筑设计实习生",
    companyName: "华东建筑设计研究院",
    stipend: "180 元/天 · 项目餐补",
    description: "参与大型公共建筑方案深化、模型推敲与汇报文本制作。",
    minLogic: 45,
    minExpression: 35,
    detailedAchievements: ["参与公共建筑方案模型与分析图绘制。", "协助完成设计竞标文本和汇报材料。"],
  },
  {
    id: "intern_vanke_design_mgmt",
    companyId: "vanke",
    title: "产品设计管理实习生",
    companyName: "万科",
    stipend: "220 元/天 · 地产项目",
    description: "从开发商视角参与住宅产品定位、设计协调与现场巡检。",
    minLogic: 55,
    minExpression: 52,
    minStructured: 52,
    detailedAchievements: ["整理住宅产品竞品调研与户型对标。", "参与设计单位协调会并跟踪问题闭环。"],
  },
  {
    id: "intern_longfor_commercial",
    companyId: "longfor",
    title: "商业空间运营实习生",
    companyName: "龙湖",
    stipend: "210 元/天 · 商场餐补",
    description: "参与商业空间客流分析、活动运营与商户体验优化。",
    minLogic: 52,
    minExpression: 55,
    detailedAchievements: ["分析商场分时客流并提出空间导视优化建议。", "协助执行商业活动并复盘商户与顾客反馈。"],
  },
  {
    id: "intern_cbre_research",
    companyId: "cbre",
    title: "市场研究实习生",
    companyName: "世邦魏理仕",
    stipend: "220 元/天 · CBD办公",
    description: "参与办公、商业与产业地产市场数据研究和报告撰写。",
    minLogic: 57,
    minExpression: 55,
    minEnglish: 60,
    detailedAchievements: ["维护重点城市办公市场租金与空置率数据库。", "协助撰写季度房地产市场研究报告。"],
  },
  {
    id: "intern_jll_consulting",
    companyId: "jll",
    title: "城市与地产咨询实习生",
    companyName: "仲量联行",
    stipend: "230 元/天 · 咨询项目",
    description: "参与城市更新、产业园区与商业地产咨询项目。",
    minLogic: 60,
    minExpression: 58,
    minEnglish: 62,
    minStructured: 58,
    detailedAchievements: ["完成城市更新案例研究与政策信息梳理。", "协助搭建产业园区定位和业态分析框架。"],
  },
];

function getInternshipRequirementGaps(option: InternshipOption, stats: Stats) {
  const gaps = [
    { key: "logic", label: "逻辑能力", value: stats.logic - option.minLogic },
    { key: "expression", label: "表达能力", value: stats.expression - option.minExpression },
  ];
  if (option.minEnglish !== undefined) gaps.push({ key: "english", label: "英语能力", value: stats.english - option.minEnglish });
  if (option.minStructured !== undefined) gaps.push({ key: "structured", label: "结构化思维", value: stats.structured - option.minStructured });
  return gaps;
}

function getInternshipFitInfo(option: InternshipOption, stats: Stats): { label: string; reason: string; color: string } {
  const gaps = getInternshipRequirementGaps(option, stats);
  const weakest = [...gaps].sort((a, b) => a.value - b.value)[0];

  if (weakest.value >= 6) {
    return { label: "匹配", reason: "核心能力达到岗位要求", color: "#81c784" };
  }
  if (weakest.value >= -5) {
    return { label: "可以尝试", reason: weakest.value >= 0 ? "能力基本符合，仍需看经历" : `${weakest.label}略有不足`, color: "#64b5f6" };
  }
  return { label: "冲刺", reason: `${weakest.label}与岗位要求存在差距`, color: "#ef9a9a" };
}

function getInternshipListings(stats: Stats): InternshipOption[] {
  const shuffled = [...INTERNSHIP_OPTIONS];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const matched = shuffled.filter((option) => getInternshipRequirementGaps(option, stats).every((gap) => gap.value >= -5));
  const stretch = shuffled.filter((option) => !matched.includes(option));
  return [...matched.slice(0, 4), ...stretch.slice(0, 2)].slice(0, 6);
}
function resolveInternshipScreening(
  applications: InternshipApplication[],
  stats: Stats
): InternshipApplication[] {
  return applications.map((application) => {
    if (application.status !== "submitted") return application;
    const option = INTERNSHIP_OPTIONS.find((item) => item.id === application.internshipId);
    if (!option) return { ...application, status: "rejected", message: "岗位已经停止招聘。" };

    const channel = INTERNSHIP_CHANNELS.find((item) => item.id === application.channel);
    const requirementGaps = getInternshipRequirementGaps(option, stats);
    const fitMargin = requirementGaps.reduce((total, gap) => total + gap.value, 0) / requirementGaps.length;
    const directBonus = application.channel === "direct" ? Math.max(0, (stats.expression - 45) / 5) : 0;
    const referralBonus = application.channel === "referral" ? Math.max(0, (stats.network - 40) / 6) : 0;
    const passChance = Math.max(8, Math.min(88, 38 + fitMargin * 1.7 + (channel?.bonus ?? 0) + directBonus + referralBonus));

    if (Math.random() * 100 < passChance) {
      return { ...application, status: "interview", interviewStage: "invited", interviewQuestionIndex: 0, interviewAnswers: [], interviewScore: 0, message: "简历通过筛选。HR 已将视频面试邀请发送到你的电脑，请在本回合内处理。" };
    }
    if (Math.random() < 0.3) {
      return { ...application, status: "silent", message: "状态停在“已投递”，没有拒信，也没有下一步。" };
    }

    const weakestRequirement = [...requirementGaps].sort((a, b) => a.value - b.value)[0];
    const reason = weakestRequirement.value < 0
      ? `岗位筛选认为你的${weakestRequirement.label}还没有达到当前要求。`
      : "你的经历并不差，但另一位候选人与岗位更直接相关。";
    return { ...application, status: "rejected", message: `简历筛选未通过。${reason}` };
  });
}
const STANDARD_INTERVIEW_OPTIONS: ComputerInterviewQuestion["options"] = [
  { id: "structured", label: "先给结论，再分点说明判断", hint: "强调逻辑和结构" },
  { id: "honest", label: "坦白未知，并说明学习路径", hint: "强调真实和成长性" },
  { id: "evidence", label: "从具体项目、行动和结果讲起", hint: "强调经历与证据" },
];

function getInternshipInterviewQuestions(option: InternshipOption): ComputerInterviewQuestion[] {
  const title = option.title;
  const roleQuestion = title.includes("产品")
    ? "如果让你改进一款每天使用的产品，你会怎样找到最值得解决的问题？"
    : title.includes("运营") || title.includes("内容") || title.includes("市场") || title.includes("Marcom")
      ? "一次活动数据低于预期，你会如何定位问题并提出下一步动作？"
      : title.includes("研究") || title.includes("分析") || title.includes("咨询") || title.includes("行研")
        ? "面对信息不完整的问题，你会如何拆解并形成一个可信的结论？"
        : title.includes("设计") || title.includes("体验")
          ? "请挑一个作品，说明你如何从模糊需求推进到最终方案。"
          : "遇到一项自己从未做过的任务时，你会如何快速上手并交付？";

  return [
    {
      prompt: "请先简单介绍一下自己，并说说为什么申请这个岗位。",
      context: `面试官想判断你的转行动机是否清楚，以及你对 ${option.title} 的理解。`,
      options: STANDARD_INTERVIEW_OPTIONS,
    },
    {
      prompt: "讲一次你在团队中遇到分歧或压力，并最终推动事情向前的经历。",
      context: "请尽量说清当时的目标、你采取的行动和实际结果。",
      options: STANDARD_INTERVIEW_OPTIONS,
    },
    {
      prompt: roleQuestion,
      context: `这是一道与 ${option.companyName} · ${option.title} 更相关的岗位问题。`,
      options: STANDARD_INTERVIEW_OPTIONS,
    },
  ];
}
// ================================================================
// SECTION 8: 子组件
// ================================================================

function StatBar({ statKey, value, delta }: { statKey: StatKey; value: number; delta?: number }) {
  const meta = STAT_META[statKey];
  const showDelta = delta !== undefined && delta !== 0;

  let warning = "";
  if (statKey === 'stress' && value < 15) warning = "警告：精神防线即将崩溃！";
  if (statKey === 'selfDoubt' && value > 85) warning = "警告：自我怀疑濒临极限！";
  if (statKey === 'ageAnxiety' && value > 85) warning = "警告：年龄焦虑已达红线！";

  return (
    <div className="mb-2">
      <div className="flex justify-between items-center mb-0.5">
        <span className="text-[13px]" style={{ color: "rgba(200,220,255,0.55)", fontFamily: "'Noto Sans SC', sans-serif" }}>
          {meta.label}
        </span>
        <div className="flex items-center gap-1.5">
          {showDelta && (
            <span
              className="text-[12px]"
              style={{ color: delta! > 0 ? (meta.positive ? "#4ade80" : "#f87171") : (meta.positive ? "#f87171" : "#4ade80") }}
            >
              {delta! > 0 ? `+${delta}` : delta}
            </span>
          )}
          <span className="text-[13px] tabular-nums" style={{ color: "rgba(200,220,255,0.8)" }}>
            {value}
          </span>
        </div>
      </div>
      <div className="h-1 rounded-full" style={{ background: "rgba(255,255,255,0.07)" }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${value}%`, background: meta.color, opacity: meta.positive ? 1 : 0.85 }}
        />
      </div>
      {warning && (
        <div className="flex items-start gap-1 mt-1 text-[10px] leading-tight text-red-400 animate-pulse">
          <TriangleAlert size={10} className="shrink-0 mt-0.5" />
          <span>{warning}</span>
        </div>
      )}
    </div>
  );
}

function DeltaBadge({ statKey, value }: { statKey: StatKey; value: EffectValue }) {
  const meta = STAT_META[statKey];

  let numericValue = 0;
  let displayValue = "";

  if (Array.isArray(value)) {
    const [min, max] = value;
    numericValue = (min + max) / 2;
    displayValue = min > 0 ? `+${min}~${max}` : `${min}~${max}`;
  } else {
    numericValue = value as number;
    displayValue = numericValue > 0 ? `+${numericValue}` : `${numericValue}`;
  }

  const positive = meta.positive ? numericValue > 0 : numericValue < 0;

  return (
    <span
      className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[13px]"
      style={{
        background: positive ? "rgba(74,222,128,0.12)" : "rgba(248,113,113,0.12)",
        color: positive ? "#4ade80" : "#f87171",
        border: `1px solid ${positive ? "rgba(74,222,128,0.2)" : "rgba(248,113,113,0.2)"}`,
      }}
    >
      {numericValue > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
      {displayValue} {meta.label}
    </span>
  );
}

// ================================================================
// SECTION 9: 个人简历组件 (ResumeView)
// ================================================================

type InternshipEditableDetails = Pick<InternshipOption, "stipend" | "description" | "detailedAchievements">;

function EditableInternshipDetails({
  internship,
  onSave,
}: {
  internship: InternshipOption;
  onSave: (internshipId: string, updates: InternshipEditableDetails) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [stipendDraft, setStipendDraft] = useState(internship.stipend);
  const [descriptionDraft, setDescriptionDraft] = useState(internship.description);
  const [achievementsDraft, setAchievementsDraft] = useState((internship.detailedAchievements ?? []).join("\n"));

  const resetDrafts = useCallback(() => {
    setStipendDraft(internship.stipend);
    setDescriptionDraft(internship.description);
    setAchievementsDraft((internship.detailedAchievements ?? []).join("\n"));
  }, [internship.stipend, internship.description, internship.detailedAchievements]);

  useEffect(() => {
    if (!isEditing) resetDrafts();
  }, [isEditing, resetDrafts]);

  const saveDetails = () => {
    if (!stipendDraft.trim()) return;
    onSave(internship.id, {
      stipend: stipendDraft.trim(),
      description: descriptionDraft.trim(),
      detailedAchievements: achievementsDraft
        .split(/\r?\n/)
        .map((achievement) => achievement.trim())
        .filter(Boolean),
    });
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="mt-2 space-y-3 rounded-xl p-4" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(201,168,76,0.35)" }}>
        <label className="block">
          <span className="mb-1.5 block text-[11px] tracking-wider" style={{ color: "rgba(198,207,234,0.62)" }}>薪资 / 补贴</span>
          <input
            value={stipendDraft}
            onChange={(event) => setStipendDraft(event.target.value)}
            maxLength={80}
            autoFocus
            className="w-full rounded-lg px-3 py-2 text-[13px] outline-none transition-colors focus:border-[#c9a84c]"
            style={{ background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.09)", color: "#f1f3fb" }}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[11px] tracking-wider" style={{ color: "rgba(198,207,234,0.62)" }}>经历描述</span>
          <textarea
            value={descriptionDraft}
            onChange={(event) => setDescriptionDraft(event.target.value)}
            maxLength={400}
            rows={4}
            className="w-full resize-y rounded-lg px-3 py-2.5 text-[13px] leading-relaxed outline-none transition-colors focus:border-[#c9a84c]"
            style={{ background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.09)", color: "#f1f3fb" }}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[11px] tracking-wider" style={{ color: "rgba(198,207,234,0.62)" }}>项目成果（每行一条）</span>
          <textarea
            value={achievementsDraft}
            onChange={(event) => setAchievementsDraft(event.target.value)}
            maxLength={800}
            rows={5}
            placeholder="例如：优化关键流程，核心指标提升 20%"
            className="w-full resize-y rounded-lg px-3 py-2.5 text-[13px] leading-relaxed outline-none transition-colors focus:border-[#c9a84c]"
            style={{ background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.09)", color: "#f1f3fb" }}
          />
        </label>
        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            data-cancel-internship-edit="true"
            onClick={() => { resetDrafts(); setIsEditing(false); }}
            className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-[11px] transition-colors hover:bg-white/5"
            style={{ color: "rgba(198,207,234,0.75)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <X size={12} /> 取消
          </button>
          <button
            type="button"
            onClick={saveDetails}
            disabled={!stipendDraft.trim()}
            className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-[11px] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            style={{ background: "#c9a84c", color: "#07101d" }}
          >
            <Check size={12} /> 保存全部修改
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-2 rounded-lg px-3 py-2.5" style={{ background: "rgba(255,255,255,0.018)", border: "1px solid rgba(255,255,255,0.045)" }}>
      <p className="text-[13px] leading-relaxed" style={{ color: "rgba(198,207,234,0.68)" }}>
        {internship.description || "暂无经历描述"}
      </p>
      {internship.detailedAchievements && internship.detailedAchievements.length > 0 && (
        <ul className="mt-3 list-disc space-y-1 pl-5 text-[13px]" style={{ color: "rgba(200,220,255,0.6)" }}>
          {internship.detailedAchievements.map((achievement, index) => <li key={index}>{achievement}</li>)}
        </ul>
      )}
      <button
        type="button"
        data-export-hidden="true"
        onClick={() => setIsEditing(true)}
        className="mt-3 inline-flex items-center gap-1 text-[11px] opacity-70 transition-opacity hover:opacity-100"
        style={{ color: "#c9a84c" }}
      >
        <Pencil size={11} /> 编辑薪资、描述与项目成果
      </button>
    </div>
  );
}
function ResumeView({
  character,
  stats,
  pastInternships,
  onUpdateInternshipDetails,
  onClose,
}: {
  character: CharacterInfo;
  stats: Stats;
  pastInternships: InternshipOption[];
  onUpdateInternshipDetails: (internshipId: string, updates: InternshipEditableDetails) => void;
  onClose: () => void;
}) {
  const bg = "#050814";
  const card = "rgba(7, 12, 28, 0.9)";
  const border = "rgba(201,168,76,0.24)";
  const textPrimary = "#f1f3fb";
  const textSecondary = "rgba(198,207,234,0.68)";
  const accent = "#c9a84c";

  return (
    <div
      className="flex flex-col h-full overflow-y-auto"
      style={{ color: textPrimary, fontFamily: "'Noto Sans SC', sans-serif" }}
    >
      <div className="w-full relative">
        <p className="text-[13px] tracking-[0.3em] uppercase mb-6 text-center" style={{ color: accent }}>
          个人简历 · CONFIDENTIAL
        </p>

        <div className="rounded-2xl p-6 mb-4" style={{ background: card, border: "1px solid " + border }}>
          <p className="text-[11px] tracking-[0.22em] uppercase mb-2" style={{ color: textSecondary }}>姓名 / NAME</p>
          <p className="text-[28px] leading-tight" style={{ color: textPrimary, fontFamily: "'Noto Serif SC', serif" }}>
            {character.name || "未命名同学"}
          </p>
        </div>

        {/* 基础信息 */}
        <div className="rounded-2xl p-6 mb-6" style={{ background: card, border: `1px solid ${border}` }}>
          <p className="text-[12px] tracking-widest uppercase mb-4" style={{ color: textSecondary }}>
            教育背景
          </p>
          <div className="flex flex-col gap-5">
            <div>
              <p className="text-[13px] mb-1.5" style={{ color: textSecondary }}>本科</p>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[16px] leading-tight">{character.undergradSchool}</span>
                <span className="text-[11px] px-1.5 py-0.5 rounded leading-none shrink-0" style={{ background: `${TIER_COLORS[character.undergradTier]}20`, color: TIER_COLORS[character.undergradTier] }}>
                  {TIER_LABELS[character.undergradTier]}
                </span>
              </div>
            </div>
            <div>
              <p className="text-[13px] mb-1.5" style={{ color: textSecondary }}>硕士</p>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[16px] leading-tight">{character.masterSchool}</span>
                {character.isOverseas ? (
                  <span className="text-[11px] px-1.5 py-0.5 rounded leading-none shrink-0" style={{ background: "#4a9eff20", color: "#4a9eff" }}>海外留学</span>
                ) : (
                  <span className="text-[11px] px-1.5 py-0.5 rounded leading-none shrink-0" style={{ background: `${TIER_COLORS[character.masterTier]}20`, color: TIER_COLORS[character.masterTier] }}>
                    {TIER_LABELS[character.masterTier]}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 实习与项目经历 */}
        <div className="rounded-2xl p-6 mb-6" style={{ background: card, border: `1px solid ${border}` }}>
          <p className="text-[12px] tracking-widest uppercase mb-4" style={{ color: textSecondary }}>
            实习与项目经历
          </p>
          {pastInternships.length === 0 ? (
            <div className="py-6 text-center rounded-lg" style={{ background: "rgba(255,255,255,0.02)" }}>
              <p className="text-[14px] opacity-50">暂无实习经历，简历略显苍白。</p>
            </div>
          ) : (
            <div className="space-y-4">
              {[...pastInternships].reverse().map((internship, idx) => (
                <div key={`${internship.id}-${idx}`} className="pb-4 border-b last:border-0 last:pb-0" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="text-[18px] text-white" style={{ fontFamily: "'Noto Serif SC', serif" }}>{internship.companyName}</h4>
                    <span className="text-[13px]" style={{ color: accent }}>{internship.stipend.split(' · ')[0]}</span>
                  </div>
                  <p className="text-[14px] mb-2" style={{ color: "rgba(180,200,240,0.85)" }}>
                    {internship.title}
                  </p>
                  <EditableInternshipDetails internship={internship} onSave={onUpdateInternshipDetails} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ================================================================
// SECTION 10: 主游戏组件
// ================================================================

interface MentorProfileEntry {
  label: string;
  value: string;
}
interface MentorProfileSection {
  title: string;
  entries: MentorProfileEntry[];
}
interface MentorProfile {
  personalInfo: MentorProfileEntry[];        // 个人信息
  education: { period: string; desc: string }[];   // 教育背景
  experience: { period: string; desc: string }[];  // 工作经历
  research: string[];                        // 研究方向
  works: string[];                           // 代表作品/课题
  awards: string[];                          // 获奖
  studentReviews: { stars: number; text: string }[]; // 学生评价
  quote: string;                             // 一句名言
  personality: string;                       // 性格标签描述
}

interface Mentor {
  id: string;
  name: string;          // 默认重组名（真实学者名重组，如"齐廷宝"=齐康×杨廷宝）
  namePool: string[];    // 候选重组名池，每局随机命中其一
  customName?: string;   // 玩家自定义名（可选，填了就用这个）
  title: string;
  description: string;
  bonuses: Partial<Record<StatKey, EffectValue>>;
  emoji: string;
  image: string;
  profile: MentorProfile;
}

/** 显示用名字：优先 customName，否则默认 name */
function mentorDisplayName(m: Mentor | null): string | null {
  if (!m) return null;
  return (m.customName && m.customName.trim()) ? m.customName.trim() : m.name;
}

const MENTORS: Mentor[] = [
  {
    id: "academic",
    image: "./assets/visuals/mentors/academic.webp",
    // 名字池全部重组自东大/建筑学界院士级学者：
    //   齐廷宝 = 齐康×杨廷宝 / 童敦桢 = 童寯×刘敦桢 / 葛慎康 = 葛明×齐康 / 朱薇亚 = 朱光亚×陈薇
    name: "齐廷宝",
    namePool: ["齐廷宝", "童敦桢", "葛慎康", "朱薇亚"],
    title: "国家级重点课题负责人",
    description: "专注学术深度与专业度，对图纸质量要求极高。能显著提升你的建筑底蕴，但由于其严苛性格，初始好感度较低且学术压力巨大。",
    emoji: "🏛️",
    bonuses: { arch: 15, logic: 5, stress: -10, mentorFavorability: -10 },
    profile: {
      personalInfo: [
        { label: "出生年份", value: "1962" },
        { label: "籍贯", value: "江苏南京" },
        { label: "职称", value: "教授 / 博士生导师" },
        { label: "所在单位", value: "东南大学建筑学院" },
        { label: "办公室", value: "前工房 305（挂牌「请勿打扰」）" },
        { label: "联系方式", value: "qi.tb@seu.arch.edu.cn" },
      ],
      education: [
        { period: "1979 — 1983", desc: "南京工学院（现东南大学）建筑学本科" },
        { period: "1983 — 1986", desc: "南京工学院 建筑历史与理论 硕士" },
        { period: "1986 — 1990", desc: "南京工学院 建筑历史与理论 博士（导师：杨廷宝）" },
        { period: "1991 — 1993", desc: "意大利罗马大学 访问学者" },
      ],
      experience: [
        { period: "1993 — 2001", desc: "东南大学建筑系 讲师 → 副教授" },
        { period: "2001 — 2010", desc: "东南大学建筑学院 教授、博士生导师" },
        { period: "2010 — 至今", desc: "国家级重点课题《中国传统建筑形制流变研究》首席专家" },
      ],
      research: [
        "中国传统建筑形制与法式制度",
        "唐宋木构建筑营造体系",
        "建筑遗产保护的理论与方法",
        "东方建筑史比较研究",
      ],
      works: [
        "《营造法式解读（修订版）》——商务印书馆，2018",
        "《唐宋木构建筑形制流变研究》——中国建筑工业出版社，2015",
        "国家级课题：中国传统建筑形制数据库建设（2010-2020）",
        "南京某历史街区保护更新工程（主持设计）",
      ],
      awards: [
        "全国优秀博士学位论文指导教师（2012、2015、2019）",
        "中国建筑学会建筑教育奖（2016）",
        "国家科技进步二等奖（2014，排名 3/10）",
        "国务院政府特殊津贴专家",
      ],
      studentReviews: [
        { stars: 1, text: "组会从下午两点开到晚上十一点。他说这是'思维的密度'。" },
        { stars: 2, text: "画了三个月的图，他只说了两个字：'重画'。" },
        { stars: 5, text: "真的跟他学到东西了，但代价是头发。我现在发际线和唐宋斗栱一样后退。" },
        { stars: 4, text: "看似冷酷，其实半夜会给你发修改建议。只是语气依然像判决书。" },
      ],
      quote: "做学问要耐得住寂寞——但更重要的是，你要配得上寂寞。",
      personality: "完美主义 / 严苛 / 慢热 / 极度护短 / 表面冷面实则深夜给学生发修改建议",
    },
  },
  {
    id: "hands_off",
    image: "./assets/visuals/mentors/hands-off.webp",
    // 名字池重组自东大建筑学院相关学者：
    //   钱晓茜 = 钱锋×汪晓茜 / 沈剑葳 = 沈旸×张剑葳 / 李诸葛 = 李海清×诸葛净 / 旸葳 = 沈旸×张剑葳
    name: "钱晓茜",
    namePool: ["钱晓茜", "沈剑葳", "李诸葛", "旸葳"],
    title: "自由主义学术推崇者",
    description: "很少管学生，给了你极大的自我探索空间。适合发展人脉与逻辑思维，环境宽松，压力极小，但也需要你更自律地维持专业输出。",
    emoji: "🪁",
    bonuses: { network: 10, logic: 10, stress: 10, arch: -5 },
    profile: {
      personalInfo: [
        { label: "出生年份", value: "1978" },
        { label: "籍贯", value: "浙江杭州" },
        { label: "职称", value: "副教授 / 硕士生导师" },
        { label: "所在单位", value: "东南大学建筑学院" },
        { label: "办公室", value: "中大院 212（门常年开着，里面没人）" },
        { label: "联系方式", value: "q.xx@seu.arch.edu.cn（回复周期：3-14 个工作日）" },
      ],
      education: [
        { period: "1996 — 2000", desc: "东南大学建筑学本科" },
        { period: "2000 — 2003", desc: "东南大学 建筑历史与理论 硕士" },
        { period: "2004 — 2007", desc: "瑞典皇家理工（KTH）建筑史 博士" },
        { period: "2007 — 2009", desc: "瑞士苏黎世联邦理工（ETH）博士后" },
      ],
      experience: [
        { period: "2009 — 2015", desc: "东南大学建筑学院 讲师 → 副教授" },
        { period: "2015 — 至今", desc: "近代建筑史研究方向带头人之一（但很少开会）" },
      ],
      research: [
        "中国近代建筑史与中西建筑交流",
        "近代建筑师群体研究",
        "江南近代城市形态演变",
        "建筑史的叙事学与图像学方法",
      ],
      works: [
        "《近代中国建筑师的海外经历研究》——中国建筑工业出版社，2019",
        "《江南近代城市建筑形态（1840-1949）》——东南大学出版社，2017",
        "策划：近代建筑师群体口述史展（2021，上海）",
        "专栏「建筑史的边角料」（某建筑类公众号，月更，有时季更）",
      ],
      awards: [
        "中国建筑学会青年学者奖（2014）",
        "近代建筑史专业委员会理事",
        "学生票选「最想请他喝茶」导师 Top 3（2018-2023 连续六年）",
      ],
      studentReviews: [
        { stars: 5, text: "一个学期见三次面。每次见面他都说'你自己看着办'。但毕业论文他真的逐字看。" },
        { stars: 4, text: "存在感约等于图书馆的猫——你知道他在，但你很少见到。" },
        { stars: 3, text: "自由是真自由，但没人管的时候，你需要惊人的自律。我差点废了。" },
        { stars: 5, text: "他不催你，但你会在某个深夜突然意识到：再不做就来不及了。这是一种高级的负罪感教育。" },
      ],
      quote: "我不需要管你——但你需要对你自己负责。做不到的话，门在那边。",
      personality: "散漫 / 随性 / 表面不在乎实则暗中观察 / 学术品味极高 / 社交达人",
    },
  },
  {
    id: "practice",
    image: "./assets/visuals/mentors/practice.webp",
    // 名字池重组自院士级实践建筑师：
    //   程恺 = 程泰宁×崔恺 / 何建民 = 何镜堂×孟建民 / 崔泰宁 = 崔恺×程泰宁 / 恺宁 = 崔恺×程泰宁
    name: "程恺",
    namePool: ["程恺", "何建民", "崔泰宁", "恺宁"],
    title: "大型院总建筑师/合伙人",
    description: "手头有大量落地的公建项目，极其关注就业与实务能力。能帮你积累丰厚的行业资源与执行力，有效缓解转行的不确定感。",
    emoji: "🏗️",
    bonuses: { structured: 12, money: 15, arch: 5, selfDoubt: -10 },
    profile: {
      personalInfo: [
        { label: "出生年份", value: "1968" },
        { label: "籍贯", value: "山东济南" },
        { label: "职称", value: "教授级高级建筑师 / 院总建筑师" },
        { label: "所在单位", value: "某大型建筑设计研究院（兼东大客座教授）" },
        { label: "办公室", value: "院里 18 楼（桌上永远摊着七八个项目的图纸）" },
        { label: "联系方式", value: "通过院办预约，或工地现场偶遇" },
      ],
      education: [
        { period: "1986 — 1990", desc: "清华大学建筑学本科" },
        { period: "1990 — 1993", desc: "清华大学 建筑设计及其理论 硕士" },
        { period: "2002 — 2005", desc: "在职攻读工学博士" },
      ],
      experience: [
        { period: "1993 — 2000", desc: "某大型院 建筑师 → 主任建筑师" },
        { period: "2000 — 2010", desc: "某大型院 副总建筑师 / 设计所所长" },
        { period: "2010 — 至今", desc: "某大型院 总建筑师 / 合伙人，东大客座教授" },
      ],
      research: [
        "公共建筑的落地性与经济性",
        "大型复杂项目的协同设计方法",
        "建筑师的职业发展与行业生态",
      ],
      works: [
        "某省美术馆（主持设计，建成 2012，获部优一等奖）",
        "某市文化中心（主持设计，建成 2016）",
        "某高铁站房（技术负责人，建成 2019）",
        "《一个建筑师的工程笔记》——中国建筑工业出版社，2020",
      ],
      awards: [
        "全国工程勘察设计大师（2018）",
        "中国建筑学会青年建筑师奖（2005）",
        "省科技进步一等奖（2013）",
        "主持项目获国家级奖项 6 项、省部级 12 项",
      ],
      studentReviews: [
        { stars: 5, text: "他直接把我推荐进了大院实习。简历上挂他名字，比什么都管用。" },
        { stars: 4, text: "不会讲花哨的理论，但会告诉你'这根梁为什么不能这么做'。很实在。" },
        { stars: 3, text: "常年不在学校，在工地。想见他得去现场，顺便被塞一顶安全帽。" },
        { stars: 5, text: "他说：'学术是少数人的事，但吃饭是所有人的事。先把饭碗端稳。'" },
      ],
      quote: "推荐信没用——我直接给你介绍个人。你让他看看你的图。",
      personality: "务实 / 直接 / 师傅做派 / 行业资源雄厚 / 不搞虚的 / 极其护学生就业",
    },
  },
  {
    id: "overseas",
    image: "./assets/visuals/mentors/global-scholar.webp",
    // 名字池重组自有海外背景的学者：
    //   常彤 = 常青×张彤 / 张青 = 张彤×常青 / 庄惟 = 庄惟敏×常青 / 彤青 = 张彤×常青
    name: "常彤",
    namePool: ["常彤", "张青", "庄惟", "彤青"],
    title: "普林斯顿/AA 优秀归国博士",
    description: "带有鲜明的国际视野，关注叙事表达与跨学科研究。能极大提升你的英语水平与表达逻辑，并利用其海外背景缓解你的年龄焦虑。",
    emoji: "✈️",
    bonuses: { english: 15, expression: 12, network: 5, ageAnxiety: -5 },
    profile: {
      personalInfo: [
        { label: "出生年份", value: "1985" },
        { label: "籍贯", value: "上海" },
        { label: "职称", value: "副教授 / 博士生导师" },
        { label: "所在单位", value: "东南大学建筑学院（海归引进人才）" },
        { label: "办公室", value: "建筑科研楼 1801（极简风，墙上挂一张威尼斯双年展海报）" },
        { label: "联系方式", value: "c.t@seu.arch.edu.cn（中英文均可）" },
      ],
      education: [
        { period: "2003 — 2007", desc: "同济大学建筑学本科（实验班）" },
        { period: "2007 — 2009", desc: "英国 AA 建筑联盟学院 硕士" },
        { period: "2009 — 2014", desc: "美国普林斯顿大学 建筑学博士" },
        { period: "2014 — 2016", desc: "美国哈佛大学 GSD 访问学者" },
      ],
      experience: [
        { period: "2016 — 2020", desc: "东南大学建筑学院 副教授（海归引进）" },
        { period: "2020 — 至今", desc: "博导；主持跨学科研究组「Narrative × Space」" },
      ],
      research: [
        "建筑叙事学与空间认知",
        "跨学科设计方法论（建筑 × 电影 × 哲学）",
        "当代中国建筑的国际化表达",
        "数字人文与建筑批评",
      ],
      works: [
        "Narrative Architecture: A Cross-Disciplinary Approach —— Routledge, 2021",
        "《空间的叙事：当代中国建筑的国际化表达》——同济大学出版社，2020",
        "策展：中国新生代建筑师巡展（2022，威尼斯、上海、北京）",
        "TEDx 演讲：What Buildings Don't Say（2021，播放量 80 万+）",
      ],
      awards: [
        "普林斯顿大学优秀博士论文奖（2014）",
        "中国建筑学会青年建筑师学者奖（2019）",
        "AD 100 中国新生代思想者榜单（2022）",
        "入选国家级青年人才计划（2023）",
      ],
      studentReviews: [
        { stars: 5, text: "英文组会，英文改论文，英文答辩。跟他三年，我雅思裸考 7.5。" },
        { stars: 4, text: "说话像写论文，每句都带定语从句。习惯了之后发现自己也会这么说话。" },
        { stars: 5, text: "他从不说'你应该'，只说'你可以尝试'。这种尊重让人很舒服。" },
        { stars: 3, text: "太年轻了，走在校园里常被误认为博士生。学术品味偏先锋，传统方向慎选。" },
      ],
      quote: "建筑是一种语言——问题在于，你想说哪种方言？还是想学会世界语？",
      personality: "温和 / 知性 / 国际视野 / 年轻有为 / 尊重学生 / 学术品味先锋",
    },
  },
];

function DecisionStatusRail({
  stats,
  mentor,
  semester,
  round,
  totalRound,
  progressPct,
  phase,
  actionDelta,
  eventDelta,
  tutorialActive = false,
}: {
  stats: Stats;
  mentor: Mentor | null;
  semester: number;
  round: number;
  totalRound: number;
  progressPct: number;
  phase: GamePhase;
  actionDelta: Partial<Stats>;
  eventDelta: Partial<Stats>;
  tutorialActive?: boolean;
}) {
  const [skillsExpanded, setSkillsExpanded] = useState(true);
  const [mentalStateExpanded, setMentalStateExpanded] = useState(true);
  const border = "rgba(201,168,76,0.2)";
  const textPrimary = "#f1f3fb";
  const textSecondary = "rgba(198,207,234,0.68)";
  const accent = "#c9a84c";
  const deltaFor = (key: StatKey) =>
    phase === "action_result" ? (actionDelta[key] ?? eventDelta[key]) : eventDelta[key];

  return (
    <aside
      className={`sticky top-0 hidden h-screen w-64 shrink-0 flex-col overflow-y-auto border-l p-5 lg:flex xl:w-72 ${tutorialActive ? "z-[221] ring-2 ring-inset ring-[#dec678]/80" : ""}`}
      style={{ borderColor: border, background: "rgba(4,8,18,0.72)", backdropFilter: "blur(12px)" }}
    >
      {mentor && (
        <div className="mb-5 border-b pb-5" style={{ borderColor: border }}>
          <p className="mb-3 text-[10px] tracking-[0.22em]" style={{ color: textSecondary }}>CURRENT MENTOR</p>
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full border text-xl" style={{ borderColor: border, background: "rgba(255,255,255,0.04)" }}>{mentor.emoji}</div>
            <div className="min-w-0"><p className="text-[11px]" style={{ color: textSecondary }}>当前导师</p><p className="truncate text-[15px] font-semibold" style={{ color: textPrimary }}>{mentorDisplayName(mentor)}</p></div>
          </div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs" style={{ color: textSecondary }}>好感度</span>
            <div className="flex items-center gap-1.5"><span className="font-mono text-sm font-bold" style={{ color: stats.mentorFavorability < 15 ? "#f87171" : accent }}>{stats.mentorFavorability}</span><DeltaBadge statKey="mentorFavorability" value={deltaFor("mentorFavorability") ?? 0} /></div>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.07]"><div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.max(0, Math.min(100, stats.mentorFavorability))}%`, background: stats.mentorFavorability < 20 ? "#ef5350" : accent }} /></div>
        </div>
      )}

      <div className="mb-5 border-b pb-5" style={{ borderColor: border }}>
        <div className="mb-2 flex items-center justify-between"><span className="text-[10px] tracking-[0.2em]" style={{ color: textSecondary }}>PROGRESS</span><span className="font-mono text-xs" style={{ color: textSecondary }}>{totalRound}/24</span></div>
        <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-white/[0.07]"><div className="h-full rounded-full" style={{ width: `${progressPct}%`, background: accent }} /></div>
        <p className="text-sm font-medium" style={{ color: textPrimary }}>{SEMESTER_LABELS[semester]}</p><p className="mt-0.5 text-xs" style={{ color: textSecondary }}>第 {round} 回合</p>
      </div>

      <div className="mb-4">
        <button
          type="button"
          onClick={() => setSkillsExpanded((expanded) => !expanded)}
          aria-expanded={skillsExpanded}
          aria-controls="decision-rail-skills"
          className="group mb-3 flex w-full items-center justify-between rounded-md py-1 text-left outline-none transition-colors hover:bg-white/[0.035] focus-visible:ring-1 focus-visible:ring-[#c9a84c]/60"
        >
          <span className="text-[10px] tracking-[0.2em]" style={{ color: textSecondary }}>SKILLS</span>
          <ChevronDown
            size={15}
            strokeWidth={1.7}
            aria-hidden="true"
            className={`text-slate-500 transition-transform duration-200 group-hover:text-slate-300 ${skillsExpanded ? "rotate-0" : "-rotate-90"}`}
          />
        </button>
        {skillsExpanded && (
          <div id="decision-rail-skills">
            {(["arch", "logic", "expression", "english", "structured", "stress", "network", "money"] as StatKey[]).map((key) => (
              <StatBar key={key} statKey={key} value={stats[key]} delta={deltaFor(key)} />
            ))}
          </div>
        )}
      </div>

      <div className="border-t pt-4" style={{ borderColor: border }}>
        <button
          type="button"
          onClick={() => setMentalStateExpanded((expanded) => !expanded)}
          aria-expanded={mentalStateExpanded}
          aria-controls="decision-rail-mental-state"
          className="group mb-3 flex w-full items-center justify-between rounded-md py-1 text-left outline-none transition-colors hover:bg-white/[0.035] focus-visible:ring-1 focus-visible:ring-red-400/50"
        >
          <span className="text-[10px] tracking-[0.2em] text-red-400/70">MENTAL STATE</span>
          <ChevronDown
            size={15}
            strokeWidth={1.7}
            aria-hidden="true"
            className={`text-red-400/40 transition-transform duration-200 group-hover:text-red-300/70 ${mentalStateExpanded ? "rotate-0" : "-rotate-90"}`}
          />
        </button>
        {mentalStateExpanded && (
          <div id="decision-rail-mental-state">
            {(["selfDoubt", "ageAnxiety"] as StatKey[]).map((key) => (
              <StatBar key={key} statKey={key} value={stats[key]} delta={deltaFor(key)} />
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
type GamePhase =
  | "intro"
  | "chargen"
  | "mentor_choice"
  | "event_view"
  | "action_choice"
  | "action_result"
  | "offer_choice"
  | "ending";

type LocalSaveSlotSummary = {
  slotIndex: number;
  savedAt: string;
  playerName: string;
  schoolName: string;
  semester: number;
  round: number;
  phase: GamePhase;
};

const LOCAL_SAVE_SLOT_KEYS = [
  "archGameSave_slot_1",
  "archGameSave_slot_2",
  "archGameSave_slot_3",
] as const;

function readLocalSaveSlotSummaries(): Array<LocalSaveSlotSummary | null> {
  if (typeof window === "undefined") return [null, null, null];
  return LOCAL_SAVE_SLOT_KEYS.map((storageKey, slotIndex) => {
    const saved = localStorage.getItem(storageKey);
    if (!saved) return null;
    try {
      const data = JSON.parse(saved) as Record<string, any>;
      if (!data.phase || data.phase === "intro") return null;
      return {
        slotIndex,
        savedAt: typeof data.savedAt === "string" ? data.savedAt : new Date(0).toISOString(),
        playerName: typeof data.character?.name === "string" ? data.character.name : "未命名同学",
        schoolName: typeof data.character?.masterSchool === "string" ? data.character.masterSchool : "未知学校",
        semester: typeof data.semester === "number" ? data.semester : 1,
        round: typeof data.round === "number" ? data.round : 1,
        phase: data.phase as GamePhase,
      };
    } catch (error) {
      console.error(`Failed to read save slot ${slotIndex + 1}`, error);
      localStorage.removeItem(storageKey);
      return null;
    }
  });
}

function LocalSaveSettings({
  isOpen,
  onClose,
  slots,
  feedback,
  canSave,
  onSave,
  onLoad,
  onDelete,
  onRestart,
}: {
  isOpen: boolean;
  onClose: () => void;
  slots: Array<LocalSaveSlotSummary | null>;
  feedback: string;
  canSave: boolean;
  onSave: (slotIndex: number) => void;
  onLoad: (slotIndex: number) => void;
  onDelete: (slotIndex: number) => void;
  onRestart: () => void;
}) {
  const [confirmAction, setConfirmAction] = useState<
    { type: "overwrite" | "delete"; slotIndex: number } | { type: "restart" } | null
  >(null);

  useEffect(() => {
    if (!isOpen) setConfirmAction(null);
  }, [isOpen]);

  if (!isOpen) return null;

  const confirmCopy = confirmAction?.type === "overwrite"
    ? `覆盖存档 ${confirmAction.slotIndex + 1}？原进度将被替换。`
    : confirmAction?.type === "delete"
      ? `删除存档 ${confirmAction.slotIndex + 1}？此操作无法撤销。`
      : confirmAction?.type === "restart"
        ? "重新开始会清除当前自动进度，三个手动存档会保留。"
        : "";

  const runConfirmedAction = () => {
    if (!confirmAction) return;
    if (confirmAction.type === "overwrite") onSave(confirmAction.slotIndex);
    if (confirmAction.type === "delete") onDelete(confirmAction.slotIndex);
    if (confirmAction.type === "restart") onRestart();
    setConfirmAction(null);
  };

  return (
    <div
      className="fixed inset-0 z-[260] flex items-center justify-center px-4 py-6"
      style={{ background: "rgba(1,5,14,0.84)", backdropFilter: "blur(12px)" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="local-save-settings-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-3xl overflow-hidden rounded-2xl border border-[#c9a84c]/25 bg-[#080e1b] shadow-[0_28px_90px_rgba(0,0,0,0.65)]">
        <header className="flex items-center gap-3 border-b border-white/10 px-5 py-4 sm:px-6">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#c9a84c]/10 text-[#dec678]">
            <Settings size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="local-save-settings-title" className="text-[17px] font-semibold text-slate-100">设置与存档</h2>
            <p className="mt-0.5 text-[10px] text-slate-500">存档仅保存在当前浏览器，换设备或清理数据后不会同步。</p>
          </div>
          <button type="button" onClick={onClose} aria-label="关闭设置" className="rounded-lg p-2 text-slate-500 transition hover:bg-white/5 hover:text-white">
            <X size={17} />
          </button>
        </header>

        <div className="p-4 sm:p-6">
          <div className="grid gap-3 sm:grid-cols-3">
            {[0, 1, 2].map((slotIndex) => {
              const slot = slots[slotIndex] ?? null;
              const progressLabel = slot?.phase === "ending"
                ? "已达成结局"
                : slot
                  ? `第 ${slot.semester} 学期 · 第 ${slot.round} 回合`
                  : "";
              return (
                <section
                  key={slotIndex}
                  className={`relative min-h-52 overflow-hidden rounded-xl border p-4 transition ${slot ? "border-white/10 bg-white/[0.025]" : "border-dashed border-white/10 bg-black/10"}`}
                >
                  <div className="mb-4 flex items-center justify-between">
                    <span className="text-[10px] font-medium tracking-[0.2em] text-[#c9a84c]">SAVE {String(slotIndex + 1).padStart(2, "0")}</span>
                    <span className={`h-1.5 w-1.5 rounded-full ${slot ? "bg-emerald-400" : "bg-slate-700"}`} />
                  </div>

                  {slot ? (
                    <>
                      <div className="min-h-24">
                        <h3 className="truncate text-[16px] font-semibold text-slate-100" title={slot.playerName}>{slot.playerName}</h3>
                        <p className="mt-1 truncate text-[11px] text-slate-400" title={slot.schoolName}>{slot.schoolName}</p>
                        <p className="mt-3 text-[11px] text-[#dec678]">{progressLabel}</p>
                        <p className="mt-1 text-[9px] tabular-nums text-slate-600">{new Date(slot.savedAt).toLocaleString("zh-CN", { hour12: false })}</p>
                      </div>
                      <div className="mt-4 grid grid-cols-[1fr_1fr_auto] gap-1.5">
                        <button type="button" onClick={() => onLoad(slotIndex)} className="flex items-center justify-center gap-1 rounded-lg bg-blue-400/10 px-2 py-2 text-[10px] text-blue-200 transition hover:bg-blue-400/15">
                          <FolderOpen size={12} />读取
                        </button>
                        <button type="button" disabled={!canSave} onClick={() => setConfirmAction({ type: "overwrite", slotIndex })} className="flex items-center justify-center gap-1 rounded-lg bg-[#c9a84c]/10 px-2 py-2 text-[10px] text-[#dec678] transition hover:bg-[#c9a84c]/15 disabled:cursor-not-allowed disabled:opacity-35">
                          <Save size={12} />覆盖
                        </button>
                        <button type="button" onClick={() => setConfirmAction({ type: "delete", slotIndex })} aria-label={`删除存档 ${slotIndex + 1}`} className="rounded-lg px-2.5 py-2 text-slate-600 transition hover:bg-red-400/[0.08] hover:text-red-300">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="flex min-h-36 flex-col items-center justify-center text-center">
                      <span className="flex h-10 w-10 items-center justify-center rounded-full border border-dashed border-white/10 text-slate-700">
                        <Save size={16} />
                      </span>
                      <p className="mt-3 text-[11px] text-slate-600">空存档</p>
                      <button type="button" disabled={!canSave} onClick={() => onSave(slotIndex)} className="mt-4 rounded-lg border border-[#c9a84c]/20 bg-[#c9a84c]/8 px-4 py-2 text-[11px] text-[#dec678] transition hover:bg-[#c9a84c]/14 disabled:cursor-not-allowed disabled:opacity-35">
                        保存到此格
                      </button>
                    </div>
                  )}
                </section>
              );
            })}
          </div>

          {feedback && <p className="mt-4 text-center text-[11px] text-emerald-300" aria-live="polite">{feedback}</p>}

          {confirmAction && (
            <div className="mt-4 flex flex-col gap-3 rounded-xl border border-red-400/15 bg-red-400/[0.055] p-3 sm:flex-row sm:items-center">
              <p className="min-w-0 flex-1 text-[11px] text-red-100">{confirmCopy}</p>
              <div className="flex shrink-0 gap-2">
                <button type="button" onClick={runConfirmedAction} className="rounded-lg bg-red-500 px-3 py-2 text-[10px] font-medium text-white">确认</button>
                <button type="button" onClick={() => setConfirmAction(null)} className="rounded-lg px-3 py-2 text-[10px] text-slate-400 hover:bg-white/5">取消</button>
              </div>
            </div>
          )}

          <footer className="mt-5 flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center">
            <p className="flex min-w-0 flex-1 items-center gap-2 text-[10px] text-slate-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />游戏过程会自动保存，三个存档格用于保留不同人生路线。
            </p>
            <button type="button" disabled={!canSave} onClick={() => setConfirmAction({ type: "restart" })} className="flex items-center justify-center gap-2 rounded-lg border border-red-400/15 px-4 py-2.5 text-[11px] text-red-200 transition hover:bg-red-400/[0.06] disabled:cursor-not-allowed disabled:opacity-35">
              <RefreshCw size={13} />重新开始
            </button>
          </footer>
        </div>
      </div>
    </div>
  );
}
const GAME_GUIDE_STEPS = [
  {
    eyebrow: "游戏目录",
    title: "先认识左侧的每一个入口",
    description: "左侧负责切换游戏场景，入口不会消耗回合。",
    items: [
      { label: "地图", copy: "默认首页。选择地点并发起学习、求职或生活行动。" },
      { label: "本回合", copy: "用于快速选择行动、处理随机事件并确认本轮结果。" },
      { label: "电脑", copy: "查看求职邮件、准备面试，并在视频会议中完成岗位问答。", status: "可用" },
      { label: "状态", copy: "查看能力诊断、薄弱项和最接近的职业路线。" },
      { label: "简历", copy: "整理教育经历与实习成果，观察履历成长。" },
      { label: "机会", copy: "未来用于管理更多生涯机会，当前仍在规划中。", status: "规划中" },
      { label: "设置与存档", copy: "管理三个手动存档，也可在这里重新开始。" },
    ],
  },
  {
    eyebrow: "回合选择",
    title: "先读事件，再决定这一回合",
    description: "每个选项会改变能力、资源或心理状态。选择前不会剧透数值，选择后会显示具体影响。",
  },
  {
    eyebrow: "生涯仪表盘",
    title: "随时留意右侧关键数值",
    description: "导师好感度、核心能力和心理状态都会影响 Offer 与最终结局。危险数值出现时，及时调整行动。",
  },
  {
    eyebrow: "AI 转行军师",
    title: "遇到问题，随时问建哥 AI",
    description: "右下角绿色在线头像就是建哥。游戏机制、属性培养、结局路线，以及现实中的转行方向、岗位选择和准备方法，都可以直接问他。",
    items: [
      { label: "游戏攻略", copy: "询问玩法机制、加点思路、Offer 与结局条件。" },
      { label: "现实转行", copy: "讨论真实岗位、能力准备、求职与转型选择。" },
    ],
  },
] as const;

function GameOnboardingGuide({
  step,
  phase,
  onStepChange,
  onFinish,
}: {
  step: number;
  phase: GamePhase;
  onStepChange: (step: number) => void;
  onFinish: () => void;
}) {
  const currentStep = GAME_GUIDE_STEPS[step] ?? GAME_GUIDE_STEPS[0];
  const actionChoiceGuide = step === 1 && phase === "action_choice";
  const actionResultGuide = step === 1 && phase === "action_result";
  const guideTitle = actionChoiceGuide
    ? "从框选区域选择本回合行动"
    : actionResultGuide
      ? "在框选区域查看行动结果"
      : currentStep.title;
  const guideDescription = actionChoiceGuide
    ? "事件已经结算。现在从框选区域选择本回合行动；每项行动都会影响能力、资源或心理状态。"
    : actionResultGuide
      ? "这里会展示本回合行动带来的具体数值变化；确认后即可进入下一回合。"
      : currentStep.description;
  const positionClass = step === 0
    ? "lg:bottom-auto lg:right-auto lg:left-[92px] lg:top-1/2 lg:-translate-y-1/2 xl:left-[228px]"
    : step === 1
      ? (phase === "event_view" ? "lg:right-auto lg:top-auto lg:bottom-8 lg:left-1/2 lg:-translate-x-1/2" : "lg:right-auto lg:bottom-auto lg:top-5 lg:left-1/2 lg:-translate-x-1/2")
      : step === 2
        ? "lg:bottom-auto lg:left-auto lg:right-[272px] lg:top-1/2 lg:-translate-y-1/2 xl:right-[304px]"
        : "lg:left-auto lg:top-auto lg:bottom-6 lg:right-[96px]";

  return (
    <>
      <div className="pointer-events-none fixed inset-0 z-[210] bg-black/55" aria-hidden="true" />
      <section
        aria-label={`新手指引，第 ${step + 1} 步，共 ${GAME_GUIDE_STEPS.length} 步`}
        aria-live="polite"
        className={`fixed bottom-4 left-4 right-4 z-[230] rounded-2xl border border-[#c9a84c]/35 bg-[#080e1b]/98 p-5 shadow-[0_22px_70px_rgba(0,0,0,0.62)] backdrop-blur-xl sm:left-auto sm:right-4 sm:w-[370px] ${positionClass}`}
      >
        <span
          className={`absolute hidden h-3 w-3 rotate-45 border-[#c9a84c]/35 bg-[#080e1b] lg:block ${step === 0 ? "-left-1.5 top-1/2 -translate-y-1/2 border-b border-l" : step === 1 ? "bottom-[-7px] left-1/2 -translate-x-1/2 border-b border-r" : step === 2 ? "-right-1.5 top-1/2 -translate-y-1/2 border-r border-t" : "-right-1.5 bottom-7 border-r border-t"}`}
          aria-hidden="true"
        />
        <div className="flex items-start gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#c9a84c]/12 text-[12px] font-semibold text-[#dec678]">
            {step + 1}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-medium uppercase tracking-[0.22em] text-[#c9a84c]">{currentStep.eyebrow}</p>
            <h3 className="mt-1 text-[16px] font-semibold text-slate-100">{guideTitle}</h3>
          </div>
          <button type="button" onClick={onFinish} aria-label="跳过新手指引" className="rounded-lg p-1.5 text-slate-600 transition hover:bg-white/5 hover:text-white">
            <X size={15} />
          </button>
        </div>
        <p className="mt-4 text-[12px] leading-6 text-slate-400">{guideDescription}</p>
        {"items" in currentStep && currentStep.items && (
          <div className="mt-3 space-y-1.5 rounded-xl border border-white/[0.07] bg-white/[0.025] p-2.5">
            {currentStep.items.map((item) => (
              <div key={item.label} className="flex items-start gap-2.5 rounded-lg px-2 py-1.5">
                <span className="w-[88px] shrink-0 text-[10px] font-medium text-slate-200">{item.label}</span>
                <span className="min-w-0 flex-1 text-[10px] leading-4 text-slate-500">{item.copy}</span>
                {"status" in item && item.status && <span className="shrink-0 rounded bg-[#c9a84c]/10 px-1.5 py-0.5 text-[8px] text-[#d8bd69]">{item.status}</span>}
              </div>
            ))}
          </div>
        )}
        <div className="mt-5 flex items-center gap-3">
          <div className="flex items-center gap-1.5" aria-hidden="true">
            {GAME_GUIDE_STEPS.map((_, index) => (
              <span key={index} className={`h-1.5 rounded-full transition-all ${index === step ? "w-5 bg-[#c9a84c]" : "w-1.5 bg-white/15"}`} />
            ))}
          </div>
          <span className="text-[10px] tabular-nums text-slate-600">{step + 1} / {GAME_GUIDE_STEPS.length}</span>
          <div className="ml-auto flex gap-2">
            {step > 0 && (
              <button type="button" onClick={() => onStepChange(step - 1)} className="rounded-lg px-3 py-2 text-[11px] text-slate-400 transition hover:bg-white/5 hover:text-white">
                上一步
              </button>
            )}
            <button type="button" onClick={() => step < GAME_GUIDE_STEPS.length - 1 ? onStepChange(step + 1) : onFinish()} className="flex items-center gap-1 rounded-lg bg-[#c9a84c] px-4 py-2 text-[11px] font-semibold text-[#07101d] transition hover:bg-[#ddc46c]">
              {step < GAME_GUIDE_STEPS.length - 1 ? "下一步" : "开始游戏"}<ChevronRight size={13} />
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
export function GamePage() {
  const [phase, setPhase] = useState<GamePhase>("intro");
  const [character, setCharacter] = useState<CharacterInfo | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [mentor, setMentor] = useState<Mentor | null>(null);
  const [semester, setSemester] = useState(1);
  const [round, setRound] = useState(1);
  const [currentEvent, setCurrentEvent] = useState<GameEvent | null>(null);
  const [activeCampusEvent, setActiveCampusEvent] = useState<CampusEvent | null>(null);
  const [campusEventResult, setCampusEventResult] = useState<{ success: boolean; narrative: string } | null>(null);
  const [seenEventIds, setSeenEventIds] = useState<Set<string>>(new Set());
  const [actionMemory, setActionMemory] = useState<ActionMemory>(createActionMemory);
  /** NPC 社交系统状态（本期新增，可独立清除而不影响其它存档） */
  const [socialState, setSocialState] = useState<SocialState>(createEmptySocialState);
  const [activeSocialNpcId, setActiveSocialNpcId] = useState<string>("professor");
  const socialUnreadCount = unreadCountFor(socialState, activeSocialNpcId);
  const socialMessages = getMessagesFor(socialState, activeSocialNpcId);
  const [seenCampusIds, setSeenCampusIds] = useState<Set<string>>(new Set());
  const [chosenAction, setChosenAction] = useState<Action | null>(null);
  const [actionDelta, setActionDelta] = useState<Partial<Stats>>({});
  const [eventDelta, setEventDelta] = useState<Partial<Stats>>({});
  const [ending, setEnding] = useState<Ending | null>(null);
  const [actionNarrative, setActionNarrative] = useState("");
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
  const [selectedInternshipId, setSelectedInternshipId] = useState<string | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [desktopGameSection, setDesktopGameSection] = useState<DesktopGameSection>("map");
  const [playerNameInput, setPlayerNameInput] = useState("");
  const [playerNameError, setPlayerNameError] = useState("");
  // 导师选择流程：选中后先确认名字，再正式进入游戏
  const [pendingMentor, setPendingMentor] = useState<Mentor | null>(null);
  const [mentorNameInput, setMentorNameInput] = useState("");
  // 每次进入导师选择页时，为 4 个导师各随机抽一个名字（稳定到离开该页为止）
  const [rolledMentorNames, setRolledMentorNames] = useState<Record<string, string>>({});
  // 简历查看：存当前展开简历的 mentorId
  const [resumeMentorId, setResumeMentorId] = useState<string | null>(null);
  const [selectedEventBranch, setSelectedEventBranch] = useState<EventBranchOption | null>(null);
  const [isCustomEventActionOpen, setIsCustomEventActionOpen] = useState(false);
  const [customEventAction, setCustomEventAction] = useState("");
  const [customEventActionFeedback, setCustomEventActionFeedback] = useState("");
  const [isEvaluatingCustomEventAction, setIsEvaluatingCustomEventAction] = useState(false);
  const [customEventEvaluationStage, setCustomEventEvaluationStage] = useState(0);
  const customEventEvaluationAbortRef = useRef<AbortController | null>(null);

  // 新增状态
  const [pastInternships, setPastInternships] = useState<InternshipOption[]>([]);
  const [currentOfferedInternships, setCurrentOfferedInternships] = useState<InternshipOption[]>([]);
  const [selectedInternshipIds, setSelectedInternshipIds] = useState<string[]>([]);
  const [internshipChannel, setInternshipChannel] = useState<InternshipChannel>("official");
  const [internshipApplications, setInternshipApplications] = useState<InternshipApplication[]>([]);
  const [currentInternshipUpdates, setCurrentInternshipUpdates] = useState<InternshipApplication[]>([]);
  const [internshipApplicationFeedback, setInternshipApplicationFeedback] = useState("");
  const [activeInterviewApplicationId, setActiveInterviewApplicationId] = useState<string | null>(null);
  const [careerInboxNotificationCount, setCareerInboxNotificationCount] = useState(0);
  const [offerBuffs, setOfferBuffs] = useState<Record<string, number>>({});
  const [isResumeOpen, setIsResumeOpen] = useState(false);
  const [receivedOffers, setReceivedOffers] = useState<Company[] | null>(null);
  const [shareFeedback, setShareFeedback] = useState("");
  const [isExportingEnding, setIsExportingEnding] = useState(false);
  const endingExportRef = useRef<HTMLDivElement>(null);

  // Supabase 统计状态
  const [globalEndingStats, setGlobalEndingStats] = useState<{ total: number; sameEndingCount: number } | null>(null);
  const [globalDistribution, setGlobalDistribution] = useState<GameResultDistribution | null>(null);
  const [isDistributionOpen, setIsDistributionOpen] = useState(false);
  const [distributionLoading, setDistributionLoading] = useState(false);
  const [distributionError, setDistributionError] = useState("");
  const [expandedOfferLevels, setExpandedOfferLevels] = useState<Set<string>>(new Set(["大厂"]));
  const [hasSubmittedResult, setHasSubmittedResult] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [localSaveUpdatedAt, setLocalSaveUpdatedAt] = useState<string | null>(null);
  const [localSaveFeedback, setLocalSaveFeedback] = useState("");
  const [localSaveSlots, setLocalSaveSlots] = useState<Array<LocalSaveSlotSummary | null>>(() => readLocalSaveSlotSummaries());

  useEffect(() => {
    if (!isEvaluatingCustomEventAction) {
      setCustomEventEvaluationStage(0);
      return;
    }

    setCustomEventEvaluationStage(0);
    const timers = [
      window.setTimeout(() => setCustomEventEvaluationStage(1), 6000),
      window.setTimeout(() => setCustomEventEvaluationStage(2), 15000),
      window.setTimeout(() => setCustomEventEvaluationStage(3), 26000),
    ];
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [isEvaluatingCustomEventAction]);

  useEffect(() => () => customEventEvaluationAbortRef.current?.abort(), []);

  // 进入导师选择页时，为每个导师从 namePool 随机命中一个名字
  useEffect(() => {
    if (phase !== "mentor_choice") return;
    const rolled: Record<string, string> = {};
    for (const m of MENTORS) {
      const pool = m.namePool.length > 0 ? m.namePool : [m.name];
      rolled[m.id] = pool[Math.floor(Math.random() * pool.length)];
    }
    setRolledMentorNames(rolled);
    // 清空上次的 pending
    setPendingMentor(null);
    setMentorNameInput("");
  }, [phase]);

  // 兼容旧存档：同一轮投递只能接受一份实习 Offer。
  useEffect(() => {
    const accepted = currentInternshipUpdates.filter((item) => item.status === "accepted");
    if (accepted.length === 0) return;

    const kept = accepted[0];
    const keptOption = INTERNSHIP_OPTIONS.find((item) => item.id === kept.internshipId);
    // 只与「同一轮投递」的流程竞争，避免误伤其他学期/轮次已留痕的实习
    const competing = currentInternshipUpdates.filter((item) => (
      item.id !== kept.id
      && item.submittedRound === kept.submittedRound
      && (item.status === "accepted" || item.status === "offered" || item.status === "interview" || item.status === "interview_pending")
    ));
    if (competing.length === 0) return;

    const competingApplicationIds = new Set(competing.map((item) => item.id));
    const duplicateAcceptedInternshipIds = new Set(
      competing.filter((item) => item.status === "accepted").map((item) => item.internshipId)
    );
    const normalize = (items: InternshipApplication[]) => items.map((item): InternshipApplication => (
      competingApplicationIds.has(item.id)
        ? {
            ...item,
            status: "declined",
            message: `你已经接受了 ${keptOption?.companyName ?? "另一家公司"} 的 Offer，因此放弃了这条流程。`,
          }
        : item
    ));

    setCurrentInternshipUpdates((previous) => normalize(previous));
    setInternshipApplications((previous) => normalize(previous));
    if (duplicateAcceptedInternshipIds.size > 0) {
      setPastInternships((previous) => previous.filter((item) => !duplicateAcceptedInternshipIds.has(item.id)));
    }
  }, [currentInternshipUpdates]);
  // ── 存档/读档逻辑 ──
  const STORAGE_KEY = "archGameSave_v1";

  const buildGameState = useCallback(() => ({
    version: 2,
    savedAt: new Date().toISOString(),
    phase, character, stats, mentor, semester, round,
    currentEvent, activeCampusEvent, campusEventResult,
    seenEventIds: Array.from(seenEventIds),
    seenCampusIds: Array.from(seenCampusIds),
    chosenAction, actionDelta, eventDelta, selectedEventBranch, ending,
    actionNarrative, selectedOfferId, selectedInternshipId,
    showTutorial, tutorialStep,
    pastInternships, currentOfferedInternships, selectedInternshipIds, internshipChannel,
    internshipApplications, currentInternshipUpdates, internshipApplicationFeedback, offerBuffs,
    isResumeOpen, receivedOffers,
    actionMemory,
  }), [
    phase, character, stats, mentor, semester, round,
    currentEvent, activeCampusEvent, campusEventResult,
    seenEventIds, seenCampusIds,
    chosenAction, actionDelta, eventDelta, selectedEventBranch, ending,
    actionNarrative, selectedOfferId, selectedInternshipId,
    showTutorial, tutorialStep,
    pastInternships, currentOfferedInternships, selectedInternshipIds, internshipChannel,
    internshipApplications, currentInternshipUpdates, internshipApplicationFeedback, offerBuffs,
    isResumeOpen, receivedOffers,
    actionMemory,
  ]);

  const restoreGameState = useCallback((data: Record<string, any>) => {
    if (!data.phase || data.phase === "intro") return false;

    setPhase(data.phase as GamePhase);
    if (data.character) {
      const savedCharacter = {
        ...data.character,
        name: typeof data.character.name === "string" && data.character.name.trim()
          ? data.character.name.trim()
          : "未命名同学",
      };
      setCharacter(savedCharacter);
      setPlayerNameInput(savedCharacter.name);
    }
    setStats(data.stats ?? null);
    setMentor(MENTORS.find((item) => item.id === data.mentor?.id) ?? data.mentor ?? null);
    setSemester(data.semester ?? 1);
    setRound(data.round ?? 1);
    setCurrentEvent(EVENTS.find((item) => item.id === data.currentEvent?.id) ?? data.currentEvent ?? null);
    setActiveCampusEvent(CAMPUS_EVENTS.find((item) => item.id === data.activeCampusEvent?.id) ?? data.activeCampusEvent ?? null);
    setCampusEventResult(data.campusEventResult ?? null);
    setSeenEventIds(new Set(Array.isArray(data.seenEventIds) ? data.seenEventIds : []));
    setActionMemory(data.actionMemory && typeof data.actionMemory === "object" ? data.actionMemory : createActionMemory());
    setSeenCampusIds(new Set(Array.isArray(data.seenCampusIds) ? data.seenCampusIds : []));
    setChosenAction(ACTIONS.find((item) => item.id === data.chosenAction?.id) ?? data.chosenAction ?? null);
    setActionDelta(data.actionDelta ?? {});
    setEventDelta(data.eventDelta ?? {});
    setSelectedEventBranch(data.selectedEventBranch ?? null);
    setEnding(ENDINGS.find((item) => item.id === data.ending?.id) ?? data.ending ?? null);
    setActionNarrative(data.actionNarrative ?? "");
    setSelectedOfferId(data.selectedOfferId ?? null);
    setSelectedInternshipId(data.selectedInternshipId ?? null);
    setShowTutorial(Boolean(data.showTutorial));
    setTutorialStep(data.tutorialStep ?? 0);
    setPastInternships(Array.isArray(data.pastInternships) ? data.pastInternships : []);
    setCurrentOfferedInternships(Array.isArray(data.currentOfferedInternships) ? data.currentOfferedInternships : []);
    setSelectedInternshipIds(Array.isArray(data.selectedInternshipIds) ? data.selectedInternshipIds : []);
    setInternshipChannel(data.internshipChannel === "direct" || data.internshipChannel === "referral" ? data.internshipChannel : "official");
    setInternshipApplications(Array.isArray(data.internshipApplications) ? data.internshipApplications : []);
    setCurrentInternshipUpdates(Array.isArray(data.currentInternshipUpdates) ? data.currentInternshipUpdates : []);
    setInternshipApplicationFeedback(typeof data.internshipApplicationFeedback === "string" ? data.internshipApplicationFeedback : "");
    setOfferBuffs(data.offerBuffs ?? {});
    setIsResumeOpen(Boolean(data.isResumeOpen));
    setReceivedOffers(Array.isArray(data.receivedOffers)
      ? data.receivedOffers.map((savedCompany: Company) => COMPANIES.find((company) => company.id === savedCompany.id) ?? savedCompany)
      : null);
    setHasSubmittedResult(data.phase === "ending");
    setDesktopGameSection("map");
    return true;
  }, []);

  const writeLocalSave = useCallback((showFeedback = false) => {
    if (phase === "intro") return;
    try {
      const gameState = buildGameState();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(gameState));
      setLocalSaveUpdatedAt(gameState.savedAt);
      if (showFeedback) setLocalSaveFeedback("进度已保存到当前浏览器");
    } catch (error) {
      console.error("Failed to save game", error);
      setLocalSaveFeedback("保存失败，请检查浏览器存储权限");
    }
  }, [phase, buildGameState]);

  // 游戏状态变化后自动保存，短暂延迟用于合并同一次结算产生的多项更新。
  useEffect(() => {
    if (phase === "intro") return;
    const timer = window.setTimeout(() => writeLocalSave(false), 250);
    return () => window.clearTimeout(timer);
  }, [phase, writeLocalSave]);

  // 首次进入时自动读取上一次本地进度。
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    try {
      const data = JSON.parse(saved) as Record<string, any>;
      if (restoreGameState(data)) {
        setLocalSaveUpdatedAt(typeof data.savedAt === "string" ? data.savedAt : null);
      }
    } catch (error) {
      console.error("Failed to load save game", error);
      localStorage.removeItem(STORAGE_KEY);
      setLocalSaveUpdatedAt(null);
    }
  }, [restoreGameState]);

  const saveLocalGame = useCallback((slotIndex: number) => {
    setLocalSaveFeedback("");
    if (phase === "intro") return;
    try {
      const gameState = buildGameState();
      localStorage.setItem(LOCAL_SAVE_SLOT_KEYS[slotIndex], JSON.stringify(gameState));
      setLocalSaveSlots(readLocalSaveSlotSummaries());
      setLocalSaveFeedback(`已保存到存档 ${slotIndex + 1}`);
    } catch (error) {
      console.error("Failed to save slot", error);
      setLocalSaveFeedback("保存失败，请检查浏览器存储权限");
    }
  }, [phase, buildGameState]);

  const loadLocalGame = useCallback((slotIndex: number) => {
    setLocalSaveFeedback("");
    const saved = localStorage.getItem(LOCAL_SAVE_SLOT_KEYS[slotIndex]);
    if (!saved) {
      setLocalSaveSlots(readLocalSaveSlotSummaries());
      setLocalSaveFeedback(`存档 ${slotIndex + 1} 不存在`);
      return;
    }
    try {
      const data = JSON.parse(saved) as Record<string, any>;
      if (!restoreGameState(data)) throw new Error("Invalid local save");
      setLocalSaveUpdatedAt(typeof data.savedAt === "string" ? data.savedAt : null);
      setLocalSaveFeedback(`已读取存档 ${slotIndex + 1}`);
      setIsSettingsOpen(false);
    } catch (error) {
      console.error("Failed to restore save slot", error);
      setLocalSaveFeedback(`存档 ${slotIndex + 1} 已损坏，无法读取`);
    }
  }, [restoreGameState]);

  const deleteLocalSave = useCallback((slotIndex: number) => {
    localStorage.removeItem(LOCAL_SAVE_SLOT_KEYS[slotIndex]);
    setLocalSaveSlots(readLocalSaveSlotSummaries());
    setLocalSaveFeedback(`存档 ${slotIndex + 1} 已删除`);
  }, []);

  // === 埋点 game_quit：监听页面隐藏/关闭，记录退出点 ===
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        // 只在未到达结局时记录"中途退出"
        if (phase !== "ending") {
          const turnIndex = stats ? (semester - 1) * 4 + (round - 1) : null;
          tracker.track("game_quit", {
            last_phase: phase,
            last_turn_index: turnIndex,
            quit_reason: "tab_hidden",
            stats_at_quit: stats,
          }, {
            turnIndex,
            semester,
            round,
            phase,
            statsSnapshot: stats,
          });
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("pagehide", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("pagehide", handleVisibility);
    };
  }, [phase, semester, round, stats]);

  // 监听结局状态，提交数据并获取统计
  useEffect(() => {
    if (phase === "ending" && ending && !hasSubmittedResult) {
      setHasSubmittedResult(true);
      const submitAndFetch = async () => {
        try {
          console.log("Supabase: 开始提交数据...", { endingTitle: ending.title });
          
          // 0. 尝试获取用户地理位置 (不弹窗，基于IP)
          let locationData = { city: null, region: null, country: null };
          try {
            // 使用 ipapi.co 获取城市级定位
            const res = await fetch('https://ipapi.co/json/');
            if (res.ok) {
              const data = await res.json();
              locationData = {
                city: data.city || null,
                region: data.region || null,
                country: data.country_name || null
              };
              console.log("位置获取成功:", locationData);
            }
          } catch (e) {
            console.warn('获取地理位置失败 (可能是网络拦截):', e);
          }

          // 1. 提交当前结果 (包含详细的玩家画像和游戏数据)
          const payload = {
             ending_title: ending.title,
             offer_name: selectedOfferId ? (receivedOffers?.find(c => c.id === selectedOfferId)?.name || null) : null,
             
             // 玩家画像 - 详细学历
             character_tier: character ? TIER_LABELS[character.undergradTier] : null,
             undergrad_school: character?.undergradSchool || null, // 本科具体学校
             master_school: character?.masterSchool || null,       // 研究生具体学校 (新增)
             is_overseas: character?.isOverseas || false,
             mentor_name: mentor?.name || null,

             // 玩家画像 - 地理位置 (新增)
             city: locationData.city,
             region: locationData.region,
             country: locationData.country,

             // 游戏数据
             final_stats: stats,
             internship_count: pastInternships.length
          };

          const { data: insertData, error: insertError } = await supabase.from('game_results').insert(payload).select();
          
          if (insertError) {
             console.error('Supabase: 提交失败', insertError);
          } else {
             console.log('Supabase: 提交成功', insertData);
          }

          // 2. 获取统计数据
          console.log("Supabase: 开始获取统计...");
          
          // 获取总游玩次数
          const { count: totalCount, error: countError } = await supabase
            .from('game_results')
            .select('*', { count: 'exact', head: true });

          if (countError) console.error("Supabase: 获取总数失败", countError);

          // 获取达成同结局的次数
          const { count: sameEndingCount, error: sameEndingError } = await supabase
            .from('game_results')
            .select('*', { count: 'exact', head: true })
            .eq('ending_title', ending.title);

          if (sameEndingError) console.error("Supabase: 获取同结局失败", sameEndingError);

          if (!countError && !sameEndingError) {
            console.log("Supabase: 统计获取成功", { total: totalCount, same: sameEndingCount });
            setGlobalEndingStats({
              total: totalCount || 0,
              sameEndingCount: sameEndingCount || 0
            });
          }

        } catch (err) {
          console.error('Supabase: 未知错误', err);
        }
      };
      submitAndFetch();
    }
  }, [phase, ending, hasSubmittedResult, selectedOfferId, receivedOffers, character, mentor, stats, pastInternships]);

  const loadGlobalDistribution = useCallback(async () => {
    if (distributionLoading || globalDistribution) return;
    setDistributionLoading(true);
    setDistributionError("");

    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc("get_game_result_distribution");
      let distribution: GameResultDistribution | null = null;

      if (!rpcError && rpcData) {
        distribution = normalizeGameResultDistribution(rpcData);
      } else {
        // Compatibility fallback for projects that have not installed the aggregate RPC yet.
        const pageSize = 1000;
        const rows: GameResultDistributionRow[] = [];
        for (let from = 0; from < 100000; from += pageSize) {
          const { data, error } = await supabase
            .from("game_results")
            .select("ending_title, offer_name")
            .range(from, from + pageSize - 1);
          if (error) throw rpcError ?? error;
          const page = (data ?? []) as GameResultDistributionRow[];
          rows.push(...page);
          if (page.length < pageSize) break;
        }
        distribution = aggregateGameResultRows(rows);
      }

      setGlobalDistribution(distribution);
    } catch (error) {
      console.error("Supabase: 全服分布获取失败", error);
      setDistributionError("暂时无法读取全服分布，请稍后重试");
    } finally {
      setDistributionLoading(false);
    }
  }, [distributionLoading, globalDistribution]);

  // 开始游戏：姓名固定，学校与属性仍可重新生成
  const startGame = useCallback(() => {
    const normalizedName = playerNameInput.trim().replace(/\s+/g, " ");
    if (!normalizedName) {
      setPlayerNameError("请先输入你的名字");
      return;
    }
    const { character: c, stats: s } = generateCharacter(normalizedName);
    // === 埋点 game_start ===
    tracker.startNewGame();
    tracker.track("game_start", {
      entry_source: document.referrer ? "external" : "direct",
      is_returning_player: localStorage.getItem("tracker_anonymous_id") !== null,
      name_length: normalizedName.length,
    }, { phase: "intro" });
    setPlayerNameInput(normalizedName);
    setPlayerNameError("");
    setCharacter(c);
    setStats(s);
    setSemester(1);
    setRound(1);
    setSeenEventIds(new Set());
    setSeenCampusIds(new Set());
    setActionMemory(createActionMemory());
    setPhase("chargen");
  }, [playerNameInput]);

  const confirmCharacter = useCallback(() => {
    // === 埋点 character_confirm ===
    if (character && stats) {
      tracker.track("character_confirm", {
        name_length: character.name.length,
        tier: TIER_LABELS[character.masterTier] ?? `tier_${character.masterTier}`,
        undergrad_school: character.undergradSchool,
        master_school: character.masterSchool,
        is_overseas: character.isOverseas,
        init_stats: stats,
      }, {
        phase: "chargen",
        statsSnapshot: stats,
      });
    }
    setPhase("mentor_choice");
  }, [character, stats]);

  const updateInternshipDetails = useCallback((internshipId: string, updates: InternshipEditableDetails) => {
    setPastInternships((previous) => previous.map((internship) => (
      internship.id === internshipId ? { ...internship, ...updates } : internship
    )));
  }, []);

  const maybeShowEvent = useCallback(
    (currentStats: Stats, sem: number, seen: Set<string>) => {
      setSelectedEventBranch(null);
      setIsCustomEventActionOpen(false);
      setCustomEventAction("");
      setCustomEventActionFeedback("");
      customEventEvaluationAbortRef.current?.abort();
      customEventEvaluationAbortRef.current = null;
      setIsEvaluatingCustomEventAction(false);
      const hasEvent = Math.random() < 0.45;
      if (!hasEvent) {
        setPhase("action_choice");
        return;
      }
      const causalStats: CausalStats = currentStats;
      const ev = getCausalEvent(
        EVENTS,
        seen,
        causalStats,
        actionMemory,
        { isOverseas: character?.isOverseas || false, semester: sem },
      );
      if (!ev) {
        setPhase("action_choice");
      } else {
        setCurrentEvent(ev);
        setPhase("event_view");
      }
    },
    [character, actionMemory]
  );

  const selectMentor = useCallback(
    (m: Mentor, customName?: string) => {
      if (!stats) return;
      const finalMentor: Mentor = { ...m };
      if (customName && customName.trim()) {
        finalMentor.customName = customName.trim().slice(0, 12);
      }
      // 把随机命中的名字落到 mentor.name，保证存档/显示一致
      const rolled = rolledMentorNames[m.id];
      if (rolled && !finalMentor.customName) {
        finalMentor.name = rolled;
      }
      setMentor(finalMentor);

      // —— 社交系统初始化：同步 NPC 显示名 + 通过对话树触发开场白 ——
      const displayName = (finalMentor.customName && finalMentor.customName.trim())
        ? finalMentor.customName.trim()
        : finalMentor.name;
      setProfessorDisplayName(displayName);
      setSocialState((prev) => {
        // 初始化 professor bond，好感度沿用 bonuses 结算后的值
        const { newStats } = applyEffects(stats, m.bonuses);
        const initFavor = newStats.mentorFavorability ?? 30;
        // 先建空 state + bond，然后用对话树引擎触发 prof_opening
        const withBond: SocialState = {
          ...prev,
          bonds: {
            ...prev.bonds,
            professor: {
              npcId: "professor",
              favorability: initFavor,
              messageIds: [],
              anchorFlags: [],
              lastInteractionRound: 0,
              completedTreeIds: [],
              activeTreeId: null,
              activeNodeId: null,
              pendingTreeIds: [],
              chatsThisRound: 0,
              milestoneFlags: [],
              lastChatsResetRound: 0,
            },
          },
        };
        // 触发开场对话树（trigger.type="unlock" 会自动命中已解锁的 professor）
        const triggered = checkTreeTriggers(withBond, {
          semester: 1,
          round: 1,
          totalRound: 1,
        });
        return triggered.state;
      });

      const { newStats } = applyEffects(stats, m.bonuses);
      setStats(newStats);
      maybeShowEvent(newStats, 1, new Set());
      setShowTutorial(true);
      setTutorialStep(0);
      setDesktopGameSection("map");
      // === 埋点 mentor_select ===
      tracker.track("mentor_select", {
        mentor_id: m.id,
        mentor_name: finalMentor.name,
        mentor_custom_name: finalMentor.customName ?? null,
      }, { phase: "mentor_choice" });
      tracker.setContext({ turnIndex: 0, semester: 1, round: 1, phase: "event_view" });
    },
    [stats, maybeShowEvent, rolledMentorNames]
  );

  /** 玩家在消息 Tab 选择回复当前 NPC —— 通过对话树引擎推进 */
  const handleSocialReply = useCallback(
    (option: NPCReplyOption) => {
      const currentRound = (semester - 1) * 4 + round;
      const targetNpcId = activeSocialNpcId;

      // 应用 statEffects 的回调（对话树引擎会调用它）
      const applyStatEffects = (effects: Record<string, number>) => {
        setStats((prevStats) => {
          if (!prevStats) return prevStats;
          const next = { ...prevStats };
          for (const [key, delta] of Object.entries(effects)) {
            // 只更新 Stats 中存在的数值字段
            if (key in next && typeof (next as Record<string, unknown>)[key] === "number") {
              (next as Record<string, number>)[key] = Math.max(
                0,
                Math.min(100, ((next as Record<string, number>)[key] as number) + delta),
              );
            }
          }
          return next;
        });
      };

      setSocialState((prev) =>
        advanceDialogue(prev, targetNpcId, option.id, applyStatEffects, currentRound),
      );

      // 把好感度变化同步回 stats.mentorFavorability（仅对 professor）
      if (targetNpcId === "professor" && option.favorDelta) {
        setStats((prevStats) => {
          if (!prevStats) return prevStats;
          const currentFavor = socialState.bonds.professor?.favorability ?? prevStats.mentorFavorability;
          const next = Math.max(0, Math.min(100, currentFavor + option.favorDelta));
          return { ...prevStats, mentorFavorability: next };
        });
      }
    },
    [semester, round, activeSocialNpcId, socialState.bonds.professor?.favorability]
  );

  /** 进入消息 Tab 时标记当前 NPC 已读 */
  const handleSocialMarkRead = useCallback(() => {
    setSocialState((prev) => markAllRead(prev, activeSocialNpcId));
  }, [activeSocialNpcId]);

  /** 切换消息 Tab 中的 NPC */
  const handleSocialSelectNpc = useCallback((npcId: string) => {
    setActiveSocialNpcId(npcId);
    setSocialState((prev) => markAllRead(prev, npcId));
  }, []);

  /** 在联系人 Tab 打招呼 */
  const handleSocialGreeting = useCallback((npcId: string, customText?: string) => {
    setSocialState((prev) => sendGreeting(prev, npcId, (semester - 1) * 4 + round, customText));
    setActiveSocialNpcId(npcId);
  }, [semester, round]);

  // 角色确认后，进入第一回合（先判断事件）
  const beginFirstRound = useCallback(() => {
    if (!character || !stats) return;
    maybeShowEvent(stats, 1, new Set());
  }, [character, stats, maybeShowEvent]);

  // 玩家选择事件分支：此时结算属性，但先停留在结果叙事页。
  const chooseEventBranch = useCallback((branch: EventBranchOption) => {
    if (!currentEvent || !stats || selectedEventBranch) return;

    const newSeen = new Set(seenEventIds);
    newSeen.add(currentEvent.id);
    setSeenEventIds(newSeen);

    const { newStats, delta } = applyEffects(stats, branch.effects);
    setStats(newStats);
    setEventDelta(delta);
    setSelectedEventBranch(branch);

    // 行为记忆：记录事件结算（更新节奏因子 / 锁定必触发标记）
    setActionMemory((prev) => {
      const meta = EVENT_META[currentEvent.id];
      const theme = meta?.theme ?? "growth";
      const mood = meta?.mood ?? (currentEvent.type ?? "positive");
      let next = recordEventOutcome(prev, currentEvent.id, theme, mood);
      if (isGuaranteedHit(currentEvent.id, prev, newStats, semester)) {
        next = markGuaranteedTriggered(next, currentEvent.id);
      }
      return next;
    });

    // 特殊事件仍保留原有的名牌厂加成。
    if (currentEvent.id === "e45") {
      setOfferBuffs((previous) => ({ ...previous, tencent: (previous.tencent || 0) + 15, bytedance: (previous.bytedance || 0) + 15 }));
    } else if (currentEvent.id === "e46") {
      setOfferBuffs((previous) => ({ ...previous, xiaohongshu: (previous.xiaohongshu || 0) + 20, bilibili: (previous.bilibili || 0) + 20 }));
    } else if (currentEvent.id === "e47") {
      setOfferBuffs((previous) => ({ ...previous, google: (previous.google || 0) + 20, microsoft: (previous.microsoft || 0) + 20 }));
    }
  }, [currentEvent, stats, seenEventIds, selectedEventBranch]);

  const submitCustomEventAction = useCallback(async () => {
    const action = customEventAction.trim();
    if (!currentEvent || !stats || selectedEventBranch || isEvaluatingCustomEventAction || action.length < 10) return;

    customEventEvaluationAbortRef.current?.abort();
    const controller = new AbortController();
    customEventEvaluationAbortRef.current = controller;
    setIsEvaluatingCustomEventAction(true);
    setCustomEventActionFeedback("");

    try {
      const evaluation = await evaluateCustomEventAction({
        event: {
          id: currentEvent.id,
          title: currentEvent.title,
          description: currentEvent.description,
          type: currentEvent.type,
        },
        action,
        stats,
        character,
        semester,
        referenceBranches: (EVENT_BRANCHES[currentEvent.id] ?? []).map((branch) => ({
          label: branch.label,
          tag: branch.tag,
          effects: branch.effects,
        })),
        signal: controller.signal,
      });

      chooseEventBranch({
        id: "D",
        label: evaluation.summary,
        tag: evaluation.tag,
        effects: evaluation.effects,
        resultText: evaluation.resultText,
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        setCustomEventActionFeedback("已取消推演，你的输入已保留，可以修改后重新提交。");
      } else {
        console.error("Custom event evaluation failed:", error);
        setCustomEventActionFeedback(error instanceof Error ? error.message : "AI 推演失败，请稍后重试。");
      }
    } finally {
      if (customEventEvaluationAbortRef.current === controller) {
        customEventEvaluationAbortRef.current = null;
        setIsEvaluatingCustomEventAction(false);
      }
    }
  }, [
    character,
    chooseEventBranch,
    currentEvent,
    customEventAction,
    isEvaluatingCustomEventAction,
    selectedEventBranch,
    semester,
    stats,
  ]);
  // 看完分支结果后返回地图继续行动；没有分支数据的旧事件沿用原结算方式。
  const acknowledgeEvent = useCallback(() => {
    if (!currentEvent || !stats) return;
    const branches = EVENT_BRANCHES[currentEvent.id] ?? [];
    if (branches.length > 0) {
      if (!selectedEventBranch) return;
      setPhase("action_choice");
      setDesktopGameSection("map");
      return;
    }

    const newSeen = new Set(seenEventIds);
    newSeen.add(currentEvent.id);
    setSeenEventIds(newSeen);
    const { newStats, delta } = applyEffects(stats, currentEvent.effects);
    setStats(newStats);
    setEventDelta(delta);
    // 行为记忆：旧式无分支事件也要结算
    setActionMemory((prev) => {
      const meta = EVENT_META[currentEvent.id];
      const theme = meta?.theme ?? "growth";
      const mood = meta?.mood ?? (currentEvent.type ?? "positive");
      let next = recordEventOutcome(prev, currentEvent.id, theme, mood);
      if (isGuaranteedHit(currentEvent.id, prev, newStats, semester)) {
        next = markGuaranteedTriggered(next, currentEvent.id);
      }
      return next;
    });
    setPhase("action_choice");
    setDesktopGameSection("map");
  }, [currentEvent, stats, seenEventIds, selectedEventBranch, semester]);

  // 玩家选择行动
  const chooseAction = useCallback(
    (action: Action) => {
      const pendingInterview = internshipApplications.find((application) => application.status === "interview");
      if (pendingInterview) {
        setCareerInboxNotificationCount((previous) => Math.max(previous, 1));
        setActiveInterviewApplicationId(null);
        setDesktopGameSection("computer");
        return;
      }
      if (!stats) return;
      const { newStats, delta } = applyEffects(stats, action.effects);
      // === 埋点 action_choose ===
      const currentTurnIndex = (semester - 1) * 4 + (round - 1);
      tracker.track("action_choose", {
        action_id: action.id,
        action_label: action.label,
        stats_before: stats,
      }, {
        turnIndex: currentTurnIndex,
        semester,
        round,
        phase: "action_choice",
        statsSnapshot: stats,
      });
      // 行为记忆：记录玩家本次选择（用于事件权重）
      setActionMemory((prev) => {
        const next = recordAction(prev, action.id as ActionId);
        return recordMentorBetrayal(next, stats.mentorFavorability, newStats.mentorFavorability);
      });
      setStats(newStats);
      setChosenAction(action);
      setActionDelta(delta);
      setActionNarrative(pick(action.narratives));

      if (action.id === "internship") {
        setCurrentOfferedInternships(getInternshipListings(newStats));
        setSelectedInternshipIds([]);
        setInternshipChannel("official");
        setInternshipApplicationFeedback("");
      } else {
        setCurrentOfferedInternships([]);
        setSelectedInternshipIds([]);
      }

      setPhase("action_result");
    },
    [stats, internshipApplications]
  );

  // 进入下一回合 / 或进入最终 offer 选择阶段
  const nextRound = useCallback(() => {
    const pendingInterview = internshipApplications.find((application) => application.status === "interview");
    if (pendingInterview) {
      setCareerInboxNotificationCount((previous) => Math.max(previous, 1));
      setActiveInterviewApplicationId(null);
      setDesktopGameSection("computer");
      return;
    }
    if (!stats) return;

    const totalRound = (semester - 1) * 4 + round;
    if (chosenAction?.id === "internship" && selectedInternshipIds.length === 0) {
      setInternshipApplicationFeedback("请至少选择 1 个岗位再提交投递。");
      return;
    }

    const completedInterviewResults = internshipApplications
      .filter((application) => application.status === "interview_pending")
      .map((application): InternshipApplication => {
        const option = INTERNSHIP_OPTIONS.find((item) => item.id === application.internshipId);
        const passed = application.interviewPassed === true;
        return {
          ...application,
          status: passed ? "offered" : "rejected",
          message: passed
            ? `面试通过。${option?.companyName ?? "招聘团队"} 向你发来了实习 Offer，等待你的决定。`
            : "感谢你参加面试。团队认可你的投入，但本次决定优先推进与岗位经验更直接的候选人。",
        };
      });
    let newCareerInboxMessageCount = completedInterviewResults.length;
    const completedResultMap = new Map(completedInterviewResults.map((application) => [application.id, application]));
    if (completedInterviewResults.length > 0) {
      setInternshipApplications((previous) => previous.map((application) => completedResultMap.get(application.id) ?? application));

    }

    if (chosenAction?.id === "internship") {
      const submitted = selectedInternshipIds.map((internshipId, index): InternshipApplication => ({
        id: `${internshipId}-${totalRound}-${Date.now()}-${index}`,
        internshipId,
        channel: internshipChannel,
        submittedRound: totalRound,
        status: "submitted",
        fitAtSubmission: (() => {
          const option = INTERNSHIP_OPTIONS.find((item) => item.id === internshipId);
          return option && getInternshipFitInfo(option, stats).label === "冲刺" ? "stretch" : "matched";
        })(),
        message: "简历已投递，等待筛选结果。",
      }));
      const resolved = resolveInternshipScreening(submitted, stats);
      newCareerInboxMessageCount += resolved.filter((application) => application.status === "interview" || application.status === "rejected").length;
      setInternshipApplications((previous) => [...previous, ...resolved]);
      setCurrentInternshipUpdates([...completedInterviewResults, ...resolved]);
      setInternshipApplicationFeedback("");
    } else if (completedInterviewResults.length > 0) {
      setCurrentInternshipUpdates(completedInterviewResults);
    }
    if (newCareerInboxMessageCount > 0) {
      setCareerInboxNotificationCount(newCareerInboxMessageCount);
    }
    setEventDelta({});
    setSelectedEventBranch(null);
    setIsCustomEventActionOpen(false);
    setCustomEventAction("");
    setCustomEventActionFeedback("");
    customEventEvaluationAbortRef.current?.abort();
    customEventEvaluationAbortRef.current = null;
    setIsEvaluatingCustomEventAction(false);
    setActionDelta({});
    setChosenAction(null);
    setCurrentEvent(null);
    setSelectedInternshipId(null);
    setCurrentOfferedInternships([]);
    setSelectedInternshipIds([]);

    // 1. 被动增加年龄焦虑 (0-5点)
    const { newStats: statsAfterPassive } = applyEffects(stats, { ageAnxiety: [0, 5] });
    setStats(statsAfterPassive);

    if (statsAfterPassive.mentorFavorability <= 0) {
      const expelledEnding = ENDINGS.find(e => e.id === "expelled");
      if (expelledEnding) setEnding(expelledEnding);
      // === 埋点 ending_reach（提前结局：导师好感清零）===
      tracker.track("ending_reach", {
        ending_id: "expelled", ending_title: expelledEnding?.title ?? "退学",
        is_early_ending: true, early_trigger_reason: "mentor_zero",
        ending_turn_index: totalRound - 1, final_stats: statsAfterPassive,
        offer_name: null, internship_count: internshipApplications.length,
      }, { phase: "ending", statsSnapshot: statsAfterPassive });
      setPhase("ending");
      return;
    }

    if (statsAfterPassive.selfDoubt >= 100) {
      const selfDoubtEnding = ENDINGS.find(e => e.id === "self_doubt_quit");
      if (selfDoubtEnding) setEnding(selfDoubtEnding);
      // === 埋点 ending_reach（提前结局：自我怀疑爆表）===
      tracker.track("ending_reach", {
        ending_id: "self_doubt_quit", ending_title: selfDoubtEnding?.title ?? "自我怀疑",
        is_early_ending: true, early_trigger_reason: "self_doubt_max",
        ending_turn_index: totalRound - 1, final_stats: statsAfterPassive,
        offer_name: null, internship_count: internshipApplications.length,
      }, { phase: "ending", statsSnapshot: statsAfterPassive });
      setPhase("ending");
      return;
    }

    if (statsAfterPassive.ageAnxiety >= 100) {
      const ageAnxietyEnding = ENDINGS.find(e => e.id === "age_anxiety_pivot");
      if (ageAnxietyEnding) setEnding(ageAnxietyEnding);
      // === 埋点 ending_reach（提前结局：年龄焦虑爆表）===
      tracker.track("ending_reach", {
        ending_id: "age_anxiety_pivot", ending_title: ageAnxietyEnding?.title ?? "年龄焦虑",
        is_early_ending: true, early_trigger_reason: "age_anxiety_max",
        ending_turn_index: totalRound - 1, final_stats: statsAfterPassive,
        offer_name: null, internship_count: internshipApplications.length,
      }, { phase: "ending", statsSnapshot: statsAfterPassive });
      setPhase("ending");
      return;
    }

    if (statsAfterPassive.stress <= 0) {
      const stressEnding = ENDINGS.find(e => e.id === "stress_breakdown");
      if (stressEnding) setEnding(stressEnding);
      // === 埋点 ending_reach（提前结局：压力归零）===
      tracker.track("ending_reach", {
        ending_id: "stress_breakdown", ending_title: stressEnding?.title ?? "压力崩溃",
        is_early_ending: true, early_trigger_reason: "stress_zero",
        ending_turn_index: totalRound - 1, final_stats: statsAfterPassive,
        offer_name: null, internship_count: internshipApplications.length,
      }, { phase: "ending", statsSnapshot: statsAfterPassive });
      setPhase("ending");
      return;
    }

    if (totalRound >= 24) {
      // 不直接给出结局，先进入 offer 选择阶段
      setPhase("offer_choice");
      return;
    }

    let nextSem = semester;
    let nextRd = round + 1;
    if (nextRd > 4) {
      nextRd = 1;
      nextSem = semester + 1;
      // 学期切换：清空本学期行为计数
      setActionMemory((prev) => resetSemesterActions(prev));
    }
    setSemester(nextSem);
    setRound(nextRd);
    setDesktopGameSection("map");

    // ── 社交系统：检查是否有新 NPC 解锁 + 对话树触发 ──
    const nextTotalRound = (nextSem - 1) * 4 + nextRd;
    setSocialState((prevSocial) => {
      // 1. 先重置本回合聊天计数
      let next = resetChatsThisRound(prevSocial, nextTotalRound);

      // 2. 检查新解锁的 NPC
      const newlyUnlocked = checkAllUnlocks(
        { semester: nextSem, round: nextRd, totalRound: nextTotalRound },
        next,
      );
      newlyUnlocked.forEach((npcId) => {
        next = greetNpc(next, npcId, nextTotalRound);
      });

      // 3. 检查对话树触发（好感里程碑 + 按回合 + unlock 触发器）
      const triggered = checkTreeTriggers(next, {
        semester: nextSem,
        round: nextRd,
        totalRound: nextTotalRound,
      });
      next = triggered.state;

      return next;
    });

    // === 埋点 round_complete（提前结局已由 return 分支处理，这里记录正常推进的回合）===
    tracker.setContext({ turnIndex: nextRd - 1 + (nextSem - 1) * 4, semester: nextSem, round: nextRd });
    tracker.track("round_complete", {
      completed_turn_index: totalRound - 1, // 已完成的回合（0-based）
      stats_snapshot: statsAfterPassive,
    }, {
      turnIndex: totalRound - 1,
      semester,
      round,
      phase: "action_result",
      statsSnapshot: statsAfterPassive,
    });

    // 10% 概率弹出校招/特招事件 (不在第一学期)
    if (nextSem >= 2 && Math.random() < 0.15) {
      const availableCampusEvents = CAMPUS_EVENTS.filter(
        ce => !seenCampusIds.has(ce.id) && (!ce.condition || ce.condition(statsAfterPassive))
      );
      if (availableCampusEvents.length > 0) {
        setActiveCampusEvent(pick(availableCampusEvents));
      }
    }

    maybeShowEvent(statsAfterPassive, nextSem, seenEventIds);
  }, [stats, semester, round, seenEventIds, seenCampusIds, maybeShowEvent, chosenAction, selectedInternshipIds, internshipChannel, internshipApplications]);

  const selectInternshipApplication = useCallback((applicationId: string) => {
    setActiveInterviewApplicationId(applicationId || null);
    if (!applicationId || !stats) return;

    const selected = internshipApplications.find((application) => application.id === applicationId);
    if (!selected) return;

    if (!selected.screeningMindsetSettled) {
      const batch = internshipApplications.filter((application) => application.submittedRound === selected.submittedRound);
      const screeningRejections = batch.filter((application) => application.status === "rejected" && !application.interviewStage);
      const interviewCount = batch.filter((application) => Boolean(application.interviewStage)).length;
      const hasScreeningOutcome = screeningRejections.length > 0 || interviewCount > 0;

      if (hasScreeningOutcome) {
        const rejectionCount = screeningRejections.length;
        const baseImpact = rejectionCount === 1
          ? { selfDoubt: 2, stress: -1, ageAnxiety: 0 }
          : rejectionCount === 2
            ? { selfDoubt: 5, stress: -2, ageAnxiety: 0 }
            : rejectionCount >= 3
              ? { selfDoubt: 9, stress: -4, ageAnxiety: 1 }
              : { selfDoubt: 0, stress: 0, ageAnxiety: 0 };
        const weightedRejections = screeningRejections.reduce((total, application) => {
          if (application.fitAtSubmission === "stretch") return total + 0.5;
          if (application.fitAtSubmission === "matched") return total + 1;
          const option = INTERNSHIP_OPTIONS.find((item) => item.id === application.internshipId);
          return total + (option && getInternshipFitInfo(option, stats).label === "冲刺" ? 0.5 : 1);
        }, 0);
        const rejectionFactor = rejectionCount > 0 ? weightedRejections / rejectionCount : 0;
        const resilienceReduction = stats.stress >= 85 ? 2 : stats.stress >= 70 ? 1 : 0;
        const selfDoubtImpact = Math.max(0, Math.round(baseImpact.selfDoubt * rejectionFactor) - resilienceReduction) - interviewCount;
        const stressImpact = rejectionCount > 0 ? -Math.max(1, Math.round(Math.abs(baseImpact.stress) * rejectionFactor)) : 0;
        const ageAnxietyImpact = Math.round(baseImpact.ageAnxiety * rejectionFactor);
        const effects: Record<string, number> = {};
        if (selfDoubtImpact !== 0) effects.selfDoubt = selfDoubtImpact;
        if (stressImpact !== 0) effects.stress = stressImpact;
        if (ageAnxietyImpact !== 0) effects.ageAnxiety = ageAnxietyImpact;
        if (Object.keys(effects).length > 0) {
          setStats((previous) => previous ? applyEffects(previous, effects).newStats : previous);
        }

        const outcomeParts = [
          rejectionCount > 0 ? `${rejectionCount} 份申请未通过` : "",
          interviewCount > 0 ? `${interviewCount} 份申请进入面试` : "",
        ].filter(Boolean);
        const impactParts = [
          selfDoubtImpact !== 0 ? `自我怀疑 ${selfDoubtImpact > 0 ? "+" : ""}${selfDoubtImpact}` : "",
          stressImpact !== 0 ? `抗压值 ${stressImpact}` : "",
          ageAnxietyImpact !== 0 ? `年龄焦虑 +${ageAnxietyImpact}` : "",
        ].filter(Boolean);
        const feedback = `本轮求职反馈：${outcomeParts.join("，")}。${impactParts.length > 0 ? impactParts.join("，") : "心态保持稳定"}。`;
        const settleBatch = (items: InternshipApplication[]) => items.map((application) => application.submittedRound === selected.submittedRound
          ? { ...application, screeningMindsetSettled: true, mindsetFeedback: feedback }
          : application);
        setInternshipApplications((previous) => settleBatch(previous));
        setCurrentInternshipUpdates((previous) => settleBatch(previous));
      }
    }

    if (selected.status === "offered" && !selected.interviewResultMindsetSettled) {
      const offerEffects = { selfDoubt: -4, ageAnxiety: -2 };
      setStats((previous) => previous ? applyEffects(previous, offerEffects).newStats : previous);
      const feedback = "收到 Offer：自我怀疑 -4，年龄焦虑 -2。";
      const settleOffer = (items: InternshipApplication[]) => items.map((application) => application.id === applicationId
        ? { ...application, interviewResultMindsetSettled: true, mindsetFeedback: feedback }
        : application);
      setInternshipApplications((previous) => settleOffer(previous));
      setCurrentInternshipUpdates((previous) => settleOffer(previous));
    }
  }, [internshipApplications, stats]);

  const attendInternshipInterview = useCallback((applicationId: string) => {
    const update = (item: InternshipApplication): InternshipApplication => item.id === applicationId
      && item.status === "interview"
      && item.interviewStage === "invited"
      ? {
          ...item,
          interviewStage: "preparing",
          message: "你已确认参加视频面试。请选择一项面试前准备策略。",
        }
      : item;
    setInternshipApplications((previous) => previous.map(update));
    setCurrentInternshipUpdates((previous) => previous.map(update));
  }, []);

  const declineInternshipInterview = useCallback((applicationId: string) => {
    const update = (item: InternshipApplication): InternshipApplication => item.id === applicationId
      && item.status === "interview"
      && (item.interviewStage === "invited" || item.interviewStage === "preparing")
      ? {
          ...item,
          status: "declined",
          message: "你拒绝了这次面试邀请，这条招聘流程已经结束。",
        }
      : item;
    setInternshipApplications((previous) => previous.map(update));
    setCurrentInternshipUpdates((previous) => previous.map(update));
  }, []);

  const chooseInterviewPreparation = useCallback((applicationId: string, preparation: ComputerInterviewPreparation) => {
    const update = (item: InternshipApplication): InternshipApplication => item.id === applicationId && item.status === "interview"
      ? {
          ...item,
          interviewStage: "in_progress",
          interviewPreparation: preparation,
          interviewQuestionIndex: item.interviewQuestionIndex ?? 0,
          interviewAnswers: item.interviewAnswers ?? [],
          interviewScore: item.interviewScore ?? 0,
          message: "你已进入视频面试。完成三道问题后，招聘团队会在下一回合反馈结果。",
        }
      : item;
    setInternshipApplications((previous) => previous.map(update));
    setCurrentInternshipUpdates((previous) => previous.map(update));
  }, []);

  const answerInternshipInterview = useCallback((applicationId: string, answer: ComputerInterviewAnswer) => {
    if (!stats) return;
    const application = internshipApplications.find((item) => item.id === applicationId);
    const option = application ? INTERNSHIP_OPTIONS.find((item) => item.id === application.internshipId) : null;
    if (!application || !option || application.status !== "interview" || application.interviewStage !== "in_progress") return;

    const questions = getInternshipInterviewQuestions(option);
    const questionIndex = application.interviewQuestionIndex ?? 0;
    const preferredAnswers: ComputerInterviewAnswer[] = ["structured", "evidence", "structured"];
    const abilityScore = answer === "structured"
      ? (stats.logic + stats.structured) / 25
      : answer === "honest"
        ? (stats.expression + stats.stress) / 27
        : (stats.logic + stats.expression) / 25 + pastInternships.length;
    const answerFitBonus = preferredAnswers[questionIndex] === answer ? 3 : 0;
    const preparationBonus = application.interviewPreparation === "company" && questionIndex === 2
      ? 3
      : application.interviewPreparation === "story" && questionIndex === 1
        ? 3
        : application.interviewPreparation === "rest"
          ? 1
          : 0;
    const nextScore = (application.interviewScore ?? 0) + abilityScore + answerFitBonus + preparationBonus;
    const nextAnswers = [...(application.interviewAnswers ?? []), answer];
    const isComplete = questionIndex >= questions.length - 1;
    const currentTotalRound = (semester - 1) * 4 + round;

    let updated: InternshipApplication;
    if (isComplete) {
      const requirementGaps = getInternshipRequirementGaps(option, stats);
      const fitMargin = requirementGaps.reduce((total, gap) => total + gap.value, 0) / requirementGaps.length;
      const passChance = Math.max(16, Math.min(90, 24 + fitMargin * 1.15 + nextScore * 2.35));
      updated = {
        ...application,
        status: "interview_pending",
        interviewStage: "waiting_result",
        interviewQuestionIndex: questionIndex,
        interviewAnswers: nextAnswers,
        interviewScore: nextScore,
        interviewPassed: Math.random() * 100 < passChance,
        interviewCompletedRound: currentTotalRound,
        message: "面试已经结束。招聘团队正在整理评价，结果会在下一回合通过电脑邮箱送达。",
      };
      const { newStats } = applyEffects(stats, { expression: 1, structured: 1 });
      setStats(newStats);
    } else {
      updated = {
        ...application,
        interviewQuestionIndex: questionIndex + 1,
        interviewAnswers: nextAnswers,
        interviewScore: nextScore,
        message: `视频面试进行中：已完成 ${questionIndex + 1} / ${questions.length} 道问题。`,
      };
    }

    setInternshipApplications((previous) => previous.map((item) => item.id === applicationId ? updated : item));
    setCurrentInternshipUpdates((previous) => previous.map((item) => item.id === applicationId ? updated : item));
  }, [internshipApplications, pastInternships.length, round, semester, stats]);
  const acceptInternshipOffer = useCallback((applicationId: string) => {
    const application = internshipApplications.find((item) => item.id === applicationId);
    const option = application ? INTERNSHIP_OPTIONS.find((item) => item.id === application.internshipId) : null;
    if (!application || !option || application.status !== "offered") return;

    // 只与「同一轮投递」的其他流程竞争：不同学期/轮次接受的实习应全部留痕在简历
    const sameRound = internshipApplications.filter(
      (item) => item.id !== applicationId && item.submittedRound === application.submittedRound
    );
    const previouslyAccepted = sameRound.filter((item) => item.status === "accepted");
    const previouslyAcceptedInternshipIds = new Set(previouslyAccepted.map((item) => item.internshipId));
    const competingIds = new Set(
      sameRound
        .filter((item) => (
          item.status === "accepted"
          || item.status === "offered"
          || item.status === "interview"
          || item.status === "interview_pending"
        ))
        .map((item) => item.id)
    );
    const updateBatch = (items: InternshipApplication[]) => items.map((item): InternshipApplication => {
      if (item.id === applicationId) {
        return {
          ...item,
          status: "accepted",
          message: previouslyAccepted.length > 0
            ? `你改为接受 ${option.companyName} 的实习 Offer，原先接受的实习已撤销。这段经历已经加入简历。`
            : `你接受了 ${option.companyName} 的实习 Offer。这段经历已经加入简历。`,
        };
      }
      if (competingIds.has(item.id)) {
        return {
          ...item,
          status: "declined",
          message: item.status === "accepted"
            ? `你后来改为接受 ${option.companyName} 的 Offer，因此撤销了此前的接受决定。`
            : `你已经接受了 ${option.companyName} 的 Offer，因此放弃了这条仍在进行的流程。`,
        };
      }
      return item;
    });

    setInternshipApplications((previous) => updateBatch(previous));
    setCurrentInternshipUpdates((previous) => updateBatch(previous));
    setPastInternships((previous) => {
      const withoutPreviousAcceptance = previous.filter((item) => !previouslyAcceptedInternshipIds.has(item.id));
      return withoutPreviousAcceptance.some((item) => item.id === option.id)
        ? withoutPreviousAcceptance
        : [...withoutPreviousAcceptance, option];
    });
  }, [internshipApplications]);
  const declineInternshipOffer = useCallback((applicationId: string) => {
    const application = internshipApplications.find((item) => item.id === applicationId);
    if (!application || application.status !== "offered") return;
    const updated: InternshipApplication = {
      ...application,
      status: "declined",
      message: "你拒绝了这份 Offer，决定继续等待更合适的机会。",
    };
    setInternshipApplications((previous) => previous.map((item) => item.id === applicationId ? updated : item));
    setCurrentInternshipUpdates((previous) => previous.map((item) => item.id === applicationId ? updated : item));
  }, [internshipApplications]);
  // 处理校招/特招弹窗交互
  const handleCampusEvent = useCallback((participate: boolean) => {
    if (!activeCampusEvent || !stats) return;

    if (!participate) {
      setActiveCampusEvent(null);
      setSeenCampusIds(prev => new Set(prev).add(activeCampusEvent.id));
      return;
    }

    // 参与挑战
    const isSuccess = activeCampusEvent.successCondition(stats);
    if (isSuccess) {
      setOfferBuffs(prev => {
        const newBuffs = { ...prev };
        for (const [company, val] of Object.entries(activeCampusEvent.successBuff)) {
          newBuffs[company] = (newBuffs[company] || 0) + val;
        }
        return newBuffs;
      });
    }

    setCampusEventResult({
      success: isSuccess,
      narrative: isSuccess ? activeCampusEvent.successNarrative : activeCampusEvent.failNarrative,
    });
  }, [activeCampusEvent, stats]);

  const dismissCampusResult = useCallback(() => {
    if (activeCampusEvent) {
      setSeenCampusIds(prev => new Set(prev).add(activeCampusEvent.id));
    }
    setActiveCampusEvent(null);
    setCampusEventResult(null);
  }, [activeCampusEvent]);

  // 重新开始
  const resetGame = useCallback(() => {
    // === 埋点 game_reset ===
    tracker.track("game_reset", {
      reset_phase: "ending",
      final_ending_id: ending?.id ?? null,
    });
    localStorage.removeItem(STORAGE_KEY);
    setPhase("intro");
    setCharacter(null);
    setStats(null);
    setEnding(null);
    setSelectedOfferId(null);
    setSelectedInternshipId(null);
    setEventDelta({});
    setSelectedEventBranch(null);
    setIsCustomEventActionOpen(false);
    setCustomEventAction("");
    setCustomEventActionFeedback("");
    customEventEvaluationAbortRef.current?.abort();
    customEventEvaluationAbortRef.current = null;
    setIsEvaluatingCustomEventAction(false);
    setActionDelta({});
    setChosenAction(null);
    setCurrentEvent(null);
    setSeenEventIds(new Set());
    setSeenCampusIds(new Set());
    setActionMemory(createActionMemory());
    setPastInternships([]);
    setCurrentOfferedInternships([]);
    setSelectedInternshipIds([]);
    setInternshipChannel("official");
    setInternshipApplications([]);
    setCurrentInternshipUpdates([]);
    setInternshipApplicationFeedback("");
    setActiveInterviewApplicationId(null);
    setCareerInboxNotificationCount(0);
    setOfferBuffs({});
    setReceivedOffers(null);
    setActiveCampusEvent(null);
    setCampusEventResult(null);
    setGlobalEndingStats(null);
    setGlobalDistribution(null);
    setIsDistributionOpen(false);
    setDistributionLoading(false);
    setDistributionError("");
    setExpandedOfferLevels(new Set(["大厂"]));
    setHasSubmittedResult(false);
    setTutorialStep(0);
    setPlayerNameInput("");
    setPlayerNameError("");
    setShareFeedback("");
    setIsExportingEnding(false);
    setShowTutorial(false);
    setIsResumeOpen(false);
    setActionNarrative("");
    setIsSettingsOpen(false);
    setLocalSaveUpdatedAt(null);
    setLocalSaveFeedback("");
    setDesktopGameSection("map");
    tracker.startNewGame();
  }, [ending]);

  // ── 渲染：进度显示
  const totalRound = (semester - 1) * 4 + round;
  const progressPct = Math.round((totalRound / 24) * 100);
  const computerInterviews: ComputerInterviewItem[] = [...internshipApplications]
    .reverse()
    .map((application) => {
      const option = INTERNSHIP_OPTIONS.find((item) => item.id === application.internshipId)!;
      const channel = INTERNSHIP_CHANNELS.find((item) => item.id === application.channel);
      return {
        id: application.id,
        company: option?.companyName ?? "招聘团队",
        role: option?.title ?? "实习岗位",
        channelLabel: channel?.label ?? "在线申请",
        stipend: option?.stipend ?? "面议",
        message: application.message,
        status: application.status,
        stage: application.interviewStage ?? "invited",
        preparation: application.interviewPreparation,
        questionIndex: application.interviewQuestionIndex ?? 0,
        answers: application.interviewAnswers ?? [],
        questions: option ? getInternshipInterviewQuestions(option) : [],
        mindsetFeedback: application.mindsetFeedback,
      };
    });
  const computerPendingCount = internshipApplications.filter((application) => application.status === "interview" || application.status === "offered").length;

  // ── 渲染：公司达标情况（结局页用）
  const qualifiedCompanies = stats ? checkQualifiedCompanies(stats, offerBuffs, pastInternships) : [];

  // ================================================================
  // RENDER
  // ================================================================

  // 确保从最新的 EVENTS 数组中获取当前事件对象（包含 type 属性）
  // 解决 React 状态中可能存储了旧版事件对象导致 type 丢失的问题
  const displayEvent = currentEvent ? EVENTS.find(e => e.id === currentEvent.id) || currentEvent : null;
  const displayEventBranches = displayEvent ? EVENT_BRANCHES[displayEvent.id] ?? [] : [];

  // 样式变量（偏建筑学术风·玻璃质感）
  const bg =
    "radial-gradient(circle at top left, rgba(201,168,76,0.16), transparent 55%), radial-gradient(circle at bottom right, rgba(63,131,248,0.12), transparent 55%), repeating-linear-gradient(0deg, transparent 0, transparent 63px, rgba(201,168,76,0.035) 64px), repeating-linear-gradient(90deg, transparent 0, transparent 63px, rgba(201,168,76,0.035) 64px), #050814";
  const card = "rgba(7, 12, 28, 0.9)";
  const border = "rgba(201,168,76,0.24)";
  const textPrimary = "#f1f3fb";
  const textSecondary = "rgba(198,207,234,0.68)";
  const accent = "#c9a84c";

  const pageStyle: CSSProperties = {
    minHeight: "100vh",
    background: bg,
    backgroundAttachment: "fixed",
    color: textPrimary,
    fontFamily: "'Noto Sans SC', sans-serif",
    fontSize: "17px",
  };

  // ── 介绍页
  if (phase === "intro") {
    return (
      <div
        style={{
          ...pageStyle,
          backgroundImage: `linear-gradient(90deg, rgba(5,8,20,0.98) 0%, rgba(5,8,20,0.9) 34%, rgba(5,8,20,0.42) 65%, rgba(5,8,20,0.16) 100%), url("./assets/visuals/hero/architecture-career-hero.webp")`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
        className="relative flex min-h-screen flex-col items-center justify-center overflow-x-hidden overflow-y-auto px-5 py-6 sm:px-6 lg:py-8"
      >
        <LocalSaveSettings
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          slots={localSaveSlots}
          feedback={localSaveFeedback}
          canSave={false}
          onSave={saveLocalGame}
          onLoad={loadLocalGame}
          onDelete={deleteLocalSave}
          onRestart={resetGame}
        />
        <div className="relative z-10 max-w-lg w-full text-center lg:text-left lg:mr-[42vw]">
          <p className="mb-4 text-[12px] uppercase tracking-[0.3em]" style={{ color: accent }}>
            ARCH·HISTORIA · 互动叙事
          </p>
          <h1
            className="mb-3 text-4xl sm:text-5xl lg:text-[52px]"
            style={{ color: textPrimary, fontFamily: "'Playfair Display', 'Noto Serif SC', serif", letterSpacing: "0.05em" }}
          >
            我是一个"建"人
          </h1>
          <p className="mb-6 text-[15px] leading-relaxed" style={{ color: textSecondary }}>
            你是一名建筑学硕士研究生。<br />
            行业下行，你决定转行互联网或外企。<br />
            三年，六学期，二十四个回合。<br />
            你的选择决定你的结局。
          </p>
          <div className="mb-6 flex flex-col gap-2 text-left">
            {[
              ["纯文字交互", "数值驱动叙事，类养成 + 随机事件"],
              ["11项属性值", "建筑专业力、逻辑力、导师好感度……"],
              ["52条随机事件", "导师压力、HR已读不回、海归竞争……"],
              ["40+真实实习+12种结局", "从大厂PM到被退学，由你的选择决定"],
            ].map(([title, desc]) => (
              <div
                key={title}
                className="flex items-start gap-3 rounded-xl px-4 py-2.5 backdrop-blur-md transition-transform duration-300 hover:translate-x-1"
                style={{ background: card, border: `1px solid ${border}` }}
              >
                <Zap size={13} style={{ color: accent, marginTop: 2, flexShrink: 0 }} />
                <div>
                  <p className="text-[14px]" style={{ color: textPrimary }}>{title}</p>
                  <p className="text-[13px] mt-0.5" style={{ color: textSecondary }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mb-4 text-left">
            <label htmlFor="player-name" className="mb-2 block text-[12px] tracking-[0.16em]" style={{ color: accent }}>
              你的姓名 / PLAYER NAME
            </label>
            <input
              id="player-name"
              type="text"
              value={playerNameInput}
              maxLength={16}
              autoComplete="name"
              placeholder="输入姓名，开始这段故事"
              onChange={(event) => {
                setPlayerNameInput(event.target.value);
                if (playerNameError) setPlayerNameError("");
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") startGame();
              }}
              aria-invalid={Boolean(playerNameError)}
              aria-describedby={playerNameError ? "player-name-error" : undefined}
              className="w-full rounded-xl px-4 py-3 text-[15px] outline-none transition-all placeholder:text-slate-500 focus:ring-2 focus:ring-[#c9a84c]/45"
              style={{ background: "rgba(5,8,20,0.76)", color: textPrimary, border: playerNameError ? "1px solid rgba(239,83,80,0.7)" : "1px solid rgba(201,168,76,0.3)" }}
            />
            {playerNameError && (
              <p id="player-name-error" className="mt-2 text-[12px] text-red-400">{playerNameError}</p>
            )}
          </div>

          <button
            onClick={startGame}
            className="w-full rounded-xl py-3.5 text-[16px] transition-all duration-200 hover:opacity-90 active:scale-95"
            style={{ background: accent, color: "#070d1c" }}
          >
            以 {playerNameInput.trim() || "我的名字"} 开始游戏 →
          </button>
          <button type="button" onClick={() => { setLocalSaveFeedback(""); setLocalSaveSlots(readLocalSaveSlotSummaries()); setIsSettingsOpen(true); }} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.025] py-2.5 text-[12px] text-slate-400 transition hover:border-[#c9a84c]/25 hover:text-[#dec678]">
            <FolderOpen size={14} />查看三个存档格
          </button>
          <div className="mt-3 flex flex-col items-center gap-1 text-[11px]" style={{ color: "rgba(180,200,240,0.3)" }}>
             <p>手机与电脑端均可完整体验，游戏进度会自动保存在本机。</p>
             <p>本游戏纯属虚构，如有雷同，那可真是太巧了。</p>
          </div>
        </div>
      </div>
    );
  }

  // ── 角色生成页
  if (phase === "chargen" && character && stats) {
    return (
      <div
        style={{
          ...pageStyle,
          backgroundImage: 'linear-gradient(90deg, rgba(5,8,20,0.98) 0%, rgba(5,8,20,0.92) 38%, rgba(5,8,20,0.46) 66%, rgba(5,8,20,0.16) 100%), url("./assets/visuals/hero/architecture-career-hero.webp")',
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
        className="relative flex min-h-screen flex-col items-center justify-center overflow-y-auto px-4 py-6 sm:px-6 lg:py-8"
      >
        <div className="relative z-10 w-full max-w-xl lg:mr-[42vw]">
          <p className="mb-3 text-[12px] uppercase tracking-[0.3em]" style={{ color: accent }}>
            角色档案已生成
          </p>
          <h2 className="mb-1 text-3xl sm:text-4xl" style={{ fontFamily: "'Playfair Display', 'Noto Serif SC', serif" }}>
            你的起点
          </h2>
          <p className="mb-5 text-[14px]" style={{ color: textSecondary }}>
            {character.name}，这是属于你的第一份人生底稿。
          </p>

          <div className="mb-4 rounded-2xl p-5 backdrop-blur-md" style={{ background: card, border: "1px solid " + border }}>
            <p className="mb-3 text-[11px] uppercase tracking-widest" style={{ color: textSecondary }}>教育背景</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-white/5 bg-white/[0.018] p-3">
                <p className="mb-1.5 text-[12px]" style={{ color: textSecondary }}>本科院校</p>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[15px]" style={{ color: textPrimary }}>{character.undergradSchool}</span>
                  <span className="rounded px-1.5 py-0.5 text-[10px]" style={{ background: TIER_COLORS[character.undergradTier] + "20", color: TIER_COLORS[character.undergradTier] }}>
                    {TIER_LABELS[character.undergradTier]}
                  </span>
                </div>
              </div>
              <div className="rounded-xl border border-white/5 bg-white/[0.018] p-3">
                <p className="mb-1.5 text-[12px]" style={{ color: textSecondary }}>硕士院校</p>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[15px]" style={{ color: textPrimary }}>{character.masterSchool}</span>
                  {character.isOverseas ? (
                    <span className="rounded px-1.5 py-0.5 text-[10px]" style={{ background: "#4a9eff20", color: "#4a9eff" }}>海外留学</span>
                  ) : (
                    <span className="rounded px-1.5 py-0.5 text-[10px]" style={{ background: TIER_COLORS[character.masterTier] + "20", color: TIER_COLORS[character.masterTier] }}>
                      {TIER_LABELS[character.masterTier]}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="mb-4 rounded-2xl p-5 backdrop-blur-md" style={{ background: card, border: "1px solid " + border }}>
            <p className="mb-3 text-[11px] uppercase tracking-widest" style={{ color: textSecondary }}>初始属性</p>
            <div className="grid grid-cols-2 gap-x-6">
              <div>
                {(["arch", "logic", "expression", "english", "structured"] as StatKey[]).map((k) => (
                  <StatBar key={k} statKey={k} value={stats[k]} />
                ))}
              </div>
              <div>
                {(["stress", "network", "money", "selfDoubt", "ageAnxiety"] as StatKey[]).map((k) => (
                  <StatBar key={k} statKey={k} value={stats[k]} />
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <button
              onClick={confirmCharacter}
              className="rounded-xl py-3.5 text-[15px] transition-all hover:opacity-90"
              style={{ background: accent, color: "#070d1c" }}
            >
              就是这个背景，继续 →
            </button>
            <button
              onClick={startGame}
              className="flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-[13px] transition-all hover:bg-white/[0.04]"
              style={{ background: "rgba(5,8,20,0.68)", color: textSecondary, border: "1px solid " + border }}
            >
              <RefreshCw size={12} /> 重新生成
            </button>
          </div>
          <AIAssistant gameContext={{ character, stats, mentor, semester, phase, ending }} />
        </div>
      </div>
    );
  }

  // ── 导师选择页
  if (phase === "mentor_choice" && character && stats) {
    const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
      <div>
        <h4 className="text-[11px] uppercase tracking-[0.2em] mb-2.5" style={{ color: "#c9a84c" }}>{title}</h4>
        {children}
      </div>
    );
    return (
      <div
        style={{
          ...pageStyle,
          backgroundImage: 'linear-gradient(90deg, rgba(5,8,20,0.99) 0%, rgba(5,8,20,0.94) 42%, rgba(5,8,20,0.48) 69%, rgba(5,8,20,0.16) 100%), url("./assets/visuals/hero/architecture-career-hero.webp")',
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
        className="relative flex min-h-screen flex-col items-center justify-start overflow-y-auto px-4 py-6 sm:px-5 lg:justify-center lg:py-7"
      >
        <div className="relative z-10 w-full max-w-[680px] lg:mr-[42vw]">
          <div className="mb-4">
            <p className="mb-2 text-[12px] uppercase tracking-[0.3em]" style={{ color: accent }}>选择你的导师</p>
            <h2 className="text-3xl sm:text-4xl" style={{ fontFamily: "'Playfair Display', 'Noto Serif SC', serif" }}>学术道路上的引路人</h2>
            <p className="mt-2 text-[13px]" style={{ color: textSecondary }}>不同导师会改变你的初始能力，也会影响未来三年的生存方式。</p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {MENTORS.map((m) => {
              const isSelected = pendingMentor?.id === m.id;
              const rolledName = rolledMentorNames[m.id] ?? m.name;
              return (
              <div
                key={m.id}
                role="button"
                tabIndex={0}
                onClick={() => {
                  setPendingMentor(m);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setPendingMentor(m);
                  }
                }}
                className="group relative cursor-pointer overflow-hidden rounded-2xl text-left outline-none transition-all duration-300 hover:-translate-y-1 hover:border-[#c9a84c]/55 focus-visible:ring-2 focus-visible:ring-[#c9a84c]/55"
                style={{
                  backgroundColor: card,
                  border: "1px solid " + (isSelected ? "#c9a84c" : border),
                  boxShadow: isSelected ? "0 0 0 2px #c9a84c55, 0 18px 45px rgba(0,0,0,0.28)" : "0 18px 45px rgba(0,0,0,0.28)",
                }}
              >
                <div className="relative h-28 overflow-hidden">
                  <img src={m.image} alt="" className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-[1.025]" />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-[#070c1c]/25 to-[#070c1c]" />
                  {isSelected && (
                    <div className="absolute top-2 right-2 rounded-full bg-[#c9a84c] text-[#070c1c] text-[10px] font-bold px-2 py-0.5">已选中</div>
                  )}
                  {/* 查看简历按钮 */}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setResumeMentorId(m.id); }}
                    className="absolute bottom-2 right-2 rounded-full bg-black/50 backdrop-blur-sm text-white text-[10px] font-medium px-2.5 py-1 transition-colors hover:bg-[#c9a84c] hover:text-[#070c1c] flex items-center gap-1"
                    title="查看导师简历"
                  >
                    📄 简历
                  </button>
                </div>
                <div className="p-4">
                  <div className="mb-2.5 flex items-center gap-3">
                  <span className="text-2xl">{m.emoji}</span>
                  <div>
                    <h3 className="text-[17px] font-bold" style={{ color: textPrimary }}>{rolledName}</h3>
                    <p className="text-[11px]" style={{ color: accent }}>{m.title}</p>
                  </div>
                </div>
                <p className="mb-3 min-h-[58px] text-[12px] leading-relaxed" style={{ color: textSecondary }}>{m.description}</p>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 border-t border-white/5 pt-2.5">
                  {Object.entries(m.bonuses).map(([k, v]) => {
                    const key = k as StatKey;
                    const val = Array.isArray(v) ? v[0] : v;
                    return (
                      <div key={k} className="flex items-center justify-between gap-2">
                        <span className="text-[10px]" style={{ color: textSecondary }}>{STAT_META[key]?.label}</span>
                        <span className={"font-mono text-[11px] " + (val > 0 ? "text-green-400" : "text-red-400")}>
                          {val > 0 ? "+" + val : val}
                        </span>
                      </div>
                    );
                  })}
                  </div>
                </div>
              </div>
              );
            })}
          </div>

          {/* 导师简历弹窗 */}
          {resumeMentorId && (() => {
            const m = MENTORS.find((x) => x.id === resumeMentorId);
            if (!m) return null;
            const displayName = rolledMentorNames[m.id] ?? m.name;
            const p = m.profile;
            return (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
                style={{ backgroundColor: "rgba(0,0,0,0.72)" }}
                onClick={() => setResumeMentorId(null)}
              >
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="relative w-full max-w-[560px] max-h-[88vh] overflow-y-auto rounded-2xl"
                  style={{
                    backgroundColor: "#0d1220",
                    border: "1px solid #c9a84c44",
                    boxShadow: "0 30px 80px rgba(0,0,0,0.6)",
                  }}
                >
                  {/* 头部：封面 + 名字 */}
                  <div className="relative h-28 overflow-hidden rounded-t-2xl">
                    <img src={m.image} alt="" className="h-full w-full object-cover object-center opacity-70" />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0d1220] via-[#0d1220]/60 to-transparent" />
                    <button
                      type="button"
                      onClick={() => setResumeMentorId(null)}
                      className="absolute top-3 right-3 rounded-full bg-black/50 text-white w-8 h-8 flex items-center justify-center hover:bg-[#c9a84c] hover:text-[#070c1c] transition-colors"
                    >
                      ✕
                    </button>
                    <div className="absolute bottom-3 left-4 flex items-center gap-3">
                      <span className="text-3xl">{m.emoji}</span>
                      <div>
                        <h2 className="text-xl font-bold" style={{ color: textPrimary }}>{displayName}</h2>
                        <p className="text-[11px]" style={{ color: accent }}>{m.title}</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 space-y-5">
                    {/* 性格标签 */}
                    <div className="flex items-start gap-2">
                      <span className="text-[11px] mt-0.5" style={{ color: textSecondary }}>性格</span>
                      <p className="text-[12px] leading-relaxed flex-1" style={{ color: textPrimary }}>{p.personality}</p>
                    </div>

                    {/* 个人信息 */}
                    <Section title="个人信息">
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                        {p.personalInfo.map((it) => (
                          <div key={it.label} className="flex items-baseline gap-2 text-[12px]">
                            <span className="shrink-0" style={{ color: textSecondary }}>{it.label}</span>
                            <span className="text-right" style={{ color: textPrimary }}>{it.value}</span>
                          </div>
                        ))}
                      </div>
                    </Section>

                    {/* 教育背景 */}
                    <Section title="教育背景">
                      <div className="space-y-2">
                        {p.education.map((e, i) => (
                          <div key={i} className="flex items-start gap-3 text-[12px]">
                            <span className="shrink-0 font-mono text-[11px]" style={{ color: accent, minWidth: "92px" }}>{e.period}</span>
                            <span style={{ color: textPrimary }}>{e.desc}</span>
                          </div>
                        ))}
                      </div>
                    </Section>

                    {/* 工作经历 */}
                    <Section title="工作经历">
                      <div className="space-y-2">
                        {p.experience.map((e, i) => (
                          <div key={i} className="flex items-start gap-3 text-[12px]">
                            <span className="shrink-0 font-mono text-[11px]" style={{ color: accent, minWidth: "92px" }}>{e.period}</span>
                            <span style={{ color: textPrimary }}>{e.desc}</span>
                          </div>
                        ))}
                      </div>
                    </Section>

                    {/* 研究方向 */}
                    <Section title="研究方向">
                      <div className="flex flex-wrap gap-1.5">
                        {p.research.map((r, i) => (
                          <span key={i} className="rounded-full px-2.5 py-1 text-[11px]" style={{ backgroundColor: "rgba(201,168,76,0.12)", color: "#e8d9a8", border: "1px solid rgba(201,168,76,0.2)" }}>
                            {r}
                          </span>
                        ))}
                      </div>
                    </Section>

                    {/* 代表作 */}
                    <Section title="代表作品 / 课题">
                      <ul className="space-y-1.5">
                        {p.works.map((w, i) => (
                          <li key={i} className="text-[12px] leading-relaxed pl-3 relative" style={{ color: textPrimary }}>
                            <span className="absolute left-0 top-2 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#c9a84c" }} />
                            {w}
                          </li>
                        ))}
                      </ul>
                    </Section>

                    {/* 获奖 */}
                    <Section title="获奖与荣誉">
                      <ul className="space-y-1.5">
                        {p.awards.map((a, i) => (
                          <li key={i} className="text-[12px] leading-relaxed pl-3 relative" style={{ color: textPrimary }}>
                            <span className="absolute left-0 top-2 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#c9a84c" }} />
                            {a}
                          </li>
                        ))}
                      </ul>
                    </Section>

                    {/* 学生评价 */}
                    <Section title="学生评价（匿名）">
                      <div className="space-y-2.5">
                        {p.studentReviews.map((r, i) => (
                          <div key={i} className="rounded-lg p-3 text-[12px] leading-relaxed" style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                            <div className="flex items-center gap-1 mb-1.5">
                              {[1,2,3,4,5].map((s) => (
                                <span key={s} className={s <= r.stars ? "text-[#c9a84c]" : "text-[#444]"}>★</span>
                              ))}
                              <span className="ml-2 text-[10px]" style={{ color: textSecondary }}>匿名同学</span>
                            </div>
                            <p style={{ color: textPrimary }}>「{r.text}」</p>
                          </div>
                        ))}
                      </div>
                    </Section>

                    {/* 名言 */}
                    <div className="rounded-xl p-4" style={{ backgroundColor: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.18)" }}>
                      <p className="text-[13px] italic leading-relaxed text-center" style={{ color: "#e8d9a8", fontFamily: "'Noto Serif SC', serif" }}>
                        「{p.quote}」
                      </p>
                      <p className="text-[10px] text-center mt-2" style={{ color: textSecondary }}>—— {displayName}</p>
                    </div>

                    {/* 底部操作 */}
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          selectMentor(m);
                          setResumeMentorId(null);
                        }}
                        className="flex-1 rounded-lg py-2.5 text-[13px] font-semibold transition-colors"
                        style={{ backgroundColor: "#c9a84c", color: "#070c1c" }}
                      >
                        选这位导师 →
                      </button>
                      <button
                        type="button"
                        onClick={() => setResumeMentorId(null)}
                        className="rounded-lg px-4 py-2.5 text-[13px] transition-colors"
                        style={{ color: textSecondary, border: "1px solid " + border }}
                      >
                        关闭
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* 选中后即时确认按钮 */}
          {pendingMentor && (() => {
            const rolledName = rolledMentorNames[pendingMentor.id] ?? pendingMentor.name;
            return (
              <button
                type="button"
                onClick={() => selectMentor(pendingMentor)}
                className="mt-4 w-full rounded-xl py-3.5 text-[15px] font-bold transition-all hover:brightness-110"
                style={{ backgroundColor: "#c9a84c", color: "#070c1c", boxShadow: "0 12px 36px rgba(201,168,76,0.35)" }}
              >
                确认选择「{rolledName}」→
              </button>
            );
          })()}
          <AIAssistant gameContext={{ character, stats, mentor, semester, phase, ending }} />
        </div>
      </div>
    );
  }
  // ── 游戏主界面（event_view / action_choice / action_result）
  if ((phase === "event_view" || phase === "action_choice" || phase === "action_result") && character && stats) {
    return (
      <div
        style={{
          ...pageStyle,
          backgroundImage:
            'linear-gradient(rgba(5, 8, 20, 0.74), rgba(5, 8, 20, 0.82)), url("./assets/visuals/backgrounds/game-dashboard-background.png")',
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
        className="flex min-h-screen flex-col pb-[calc(4.25rem+env(safe-area-inset-bottom))] lg:flex-row lg:pb-0"
      >
        {ENABLE_DESKTOP_GAME_SIDEBAR && (
          <DesktopGameSidebar
            active={desktopGameSection}
            onChange={(section) => {
              setDesktopGameSection(section);
              if (section === "computer") setCareerInboxNotificationCount(0);
            }}
            statusAlert={stats.mentorFavorability < 15 || stats.stress < 20 || stats.selfDoubt > 75 || stats.ageAnxiety > 75}
            resumeUpdated={pastInternships.length > 0}
            computerBadge={computerPendingCount}
            roundAlert={phase === "event_view" || phase === "action_result" || Boolean(activeCampusEvent)}
            schoolName={character.masterSchool}
            schoolTier={character.isOverseas ? "海外留学" : TIER_LABELS[character.masterTier]}
            onOpenSettings={() => { setLocalSaveFeedback(""); setIsSettingsOpen(true); }}
            tutorialActive={showTutorial && tutorialStep === 0}
          />
        )}
        <LocalSaveSettings
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          slots={localSaveSlots}
          feedback={localSaveFeedback}
          canSave={phase !== "intro"}
          onSave={saveLocalGame}
          onLoad={loadLocalGame}
          onDelete={deleteLocalSave}
          onRestart={resetGame}
        />
        {ENABLE_DESKTOP_GAME_SIDEBAR && (
          <MobileGameShell
            active={desktopGameSection}
            onChange={(section) => {
              setDesktopGameSection(section);
              if (section === "computer") setCareerInboxNotificationCount(0);
            }}
            onOpenSettings={() => { setLocalSaveFeedback(""); setIsSettingsOpen(true); }}
            semesterLabel={SEMESTER_LABELS[semester]}
            round={round}
            progress={progressPct}
            computerBadge={computerPendingCount}
            statusAlert={stats.mentorFavorability < 15 || stats.stress < 20 || stats.selfDoubt > 75 || stats.ageAnxiety > 75}
            roundAlert={phase === "event_view" || phase === "action_result" || Boolean(activeCampusEvent)}
          />
        )}
        {careerInboxNotificationCount > 0 && desktopGameSection !== "computer" && (
          <div className="fixed inset-0 z-[235] flex items-center justify-center bg-[#020611]/72 p-5 backdrop-blur-sm">
            <section role="dialog" aria-modal="true" aria-labelledby="career-inbox-title" className="w-full max-w-md overflow-hidden rounded-2xl border border-blue-400/25 bg-[#091321] shadow-[0_28px_90px_rgba(0,0,0,0.62)]">
              <div className="border-b border-white/[0.07] bg-[radial-gradient(circle_at_top_right,rgba(72,126,210,0.18),transparent_55%)] px-6 py-5">
                <div className="flex items-start gap-4">
                  <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-blue-400/25 bg-blue-400/10 text-blue-300">
                    <BriefcaseBusiness size={21} />
                    <span className="absolute -right-1.5 -top-1.5 min-w-5 rounded-full bg-red-500 px-1 text-center text-[10px] font-bold leading-5 text-white">{careerInboxNotificationCount}</span>
                  </span>
                  <div>
                    <p className="text-[10px] tracking-[0.2em] text-blue-300">APPLICATION UPDATE</p>
                    <h3 id="career-inbox-title" className="mt-1 text-xl font-semibold text-white">求职邮箱有新消息</h3>
                  </div>
                </div>
                <p className="mt-4 text-[13px] leading-6 text-slate-300">电脑传来一声新邮件提示。你正在进行的招聘流程出现了新的进展，邮件标题只显示“Application Update”。</p>
                <p className="mt-2 text-[11px] text-slate-500">打开求职电脑查看邮件，并处理其中需要回复的事项。</p>
              </div>
              <div className="flex items-center justify-end gap-2 px-6 py-4">
                <button type="button" onClick={() => setCareerInboxNotificationCount(0)} className="rounded-lg px-4 py-2 text-[11px] text-slate-400 transition hover:bg-white/5 hover:text-white">稍后处理</button>
                <button type="button" onClick={() => { setCareerInboxNotificationCount(0); setActiveInterviewApplicationId(null); setDesktopGameSection("computer"); }} className="rounded-lg border border-blue-400/25 bg-blue-400/12 px-5 py-2 text-[11px] font-medium text-blue-200 transition hover:bg-blue-400/20">打开求职电脑</button>
              </div>
            </section>
          </div>
        )}
        {/* ── 贴合界面的新手指引 ── */}
        {showTutorial && (
          <GameOnboardingGuide
            step={tutorialStep}
            phase={phase}
            onStepChange={(step) => {
              setTutorialStep(step);
              if (step === 1) setDesktopGameSection("round");
            }}
            onFinish={() => { setShowTutorial(false); setTutorialStep(0); setDesktopGameSection("map"); }}
          />
        )}
        {/* ─── 左侧：属性面板 ─── */}
        <aside
          className={`${ENABLE_DESKTOP_GAME_SIDEBAR ? (desktopGameSection === "status" ? "flex" : "hidden") : "flex"} shrink-0 flex-col border-b p-4 pb-28 lg:self-start lg:border-b-0 lg:border-r lg:p-5 lg:pb-5 ${ENABLE_DESKTOP_GAME_SIDEBAR ? (desktopGameSection === "status" ? "lg:flex lg:min-w-0 lg:flex-1 lg:shrink" : "lg:hidden") : "lg:flex lg:w-64"}`}
          style={{ borderColor: border, background: "rgba(255,255,255,0.01)" }}
        >
          {ENABLE_DESKTOP_GAME_SIDEBAR && desktopGameSection === "status" ? (
            <StatusAnalysisPanel stats={stats} phase={phase} actionDelta={actionDelta} eventDelta={eventDelta} />
          ) : (
          <>
          {/* 角色信息 */}
          <div className="mb-5">
            <p className="text-[12px] tracking-widest uppercase mb-2" style={{ color: textSecondary }}>
              角色档案
            </p>
            <p className="text-[14px] mb-0.5" style={{ color: textPrimary }}>{character.masterSchool}</p>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-[12px]" style={{ color: textSecondary }}>
                {character.isOverseas ? "海外留学" : TIER_LABELS[character.masterTier]}
              </span>
              {character.isOverseas && (
              <span className="inline-block text-[10px] px-1.5 py-0.5 rounded leading-none" style={{ background: "#4a9eff15", color: accent, border: `1px solid ${border}` }}>
                🌏 海归
              </span>
            )}
            </div>
            {mentor && (
              <div className="py-2 mb-4 pb-4" style={{ borderBottom: `1px solid ${border}` }}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-[20px]" style={{ background: "rgba(255,255,255,0.05)" }}>
                    {mentor.emoji}
                  </div>
                  <div>
                    <p className="text-[11px] leading-none mb-1.5" style={{ color: textSecondary }}>当前导师</p>
                    <p className="text-[14px] font-bold leading-none" style={{ color: textPrimary }}>{mentorDisplayName(mentor)}</p>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-end mb-1.5">
                    <span className="text-[12px]" style={{ color: textSecondary }}>好感度</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[14px] font-mono font-bold" style={{ color: accent }}>{stats.mentorFavorability}</span>
                      <DeltaBadge
                        statKey="mentorFavorability"
                        value={(phase === "action_result" ? (actionDelta.mentorFavorability ?? eventDelta.mentorFavorability) : eventDelta.mentorFavorability) ?? 0}
                      />
                    </div>
                  </div>
                  <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                    <div
                      className="h-full transition-all duration-700"
                      style={{
                        width: `${stats.mentorFavorability}%`,
                        background: stats.mentorFavorability < 20 ? "#ff4d4f" : accent
                      }}
                    />
                  </div>
                  {stats.mentorFavorability < 15 && (
                    <div className="flex items-start gap-1 mt-2 text-[11px] leading-tight text-red-400 animate-pulse">
                      <TriangleAlert size={12} className="shrink-0 mt-0.5" />
                      <span>警告：导师耐心即将耗尽！</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 进度 */}
          <div className="mb-5 pb-5" style={{ borderBottom: `1px solid ${border}` }}>
            <div className="flex justify-between items-center mb-1.5">
              <p className="text-[12px] tracking-widest uppercase" style={{ color: textSecondary }}>进度</p>
              <p className="text-[12px]" style={{ color: textSecondary }}>{totalRound}/24</p>
            </div>
            <div className="h-1 rounded-full mb-2" style={{ background: "rgba(255,255,255,0.07)" }}>
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${progressPct}%`, background: accent }} />
            </div>
            <p className="text-[13px]" style={{ color: textPrimary }}>{SEMESTER_LABELS[semester]}</p>
            <p className="text-[12px]" style={{ color: textSecondary }}>第 {round} 回合</p>
          </div>

          {/* 技能属性 */}
          <div className="mb-3">
            <p className="text-[12px] tracking-widest uppercase mb-3" style={{ color: textSecondary }}>技能</p>
            {(["arch", "logic", "expression", "english", "structured", "stress", "network", "money"] as StatKey[]).map((k) => (
              <StatBar key={k} statKey={k} value={stats[k]} delta={phase === "action_result" ? (actionDelta[k] ?? eventDelta[k]) : eventDelta[k]} />
            ))}
          </div>

          {/* 心理状态 */}
          <div>
            <p className="text-[12px] tracking-widest uppercase mb-3" style={{ color: "rgba(239,83,80,0.6)" }}>
              心理状态
            </p>
            {(["selfDoubt", "ageAnxiety"] as StatKey[]).map((k) => (
              <StatBar key={k} statKey={k} value={stats[k]} delta={phase === "action_result" ? (actionDelta[k] ?? eventDelta[k]) : eventDelta[k]} />
            ))}
          </div>
          </>
          )}
        </aside>

        <main className={`${ENABLE_DESKTOP_GAME_SIDEBAR ? (desktopGameSection === "round" ? "block" : "hidden") : "block"} relative flex-1 overflow-y-auto px-4 pb-28 pt-5 sm:px-6 lg:p-8 ${ENABLE_DESKTOP_GAME_SIDEBAR ? (desktopGameSection === "round" ? "lg:mx-auto lg:block lg:w-full lg:max-w-5xl" : "lg:hidden") : "lg:block"}`}>
          {/* 简历弹窗 */}
          {isResumeOpen && (
            <div className="fixed inset-0 z-[100] p-6 flex flex-col" style={{ background: bg }}>
              <button
                onClick={() => setIsResumeOpen(false)}
                className="absolute top-4 right-6 z-[110] px-4 py-2 rounded-xl text-[14px]"
                style={{ background: accent, color: "#070d1c" }}
              >
                关闭简历 ×
              </button>
              <ResumeView
                character={character}
                stats={stats}
                pastInternships={pastInternships}
                onUpdateInternshipDetails={updateInternshipDetails}
                onClose={() => setIsResumeOpen(false)}
              />
            </div>
          )}

          {/* 页眉 */}
          <div className="mb-6 hidden items-center justify-between lg:flex">
            <div>
              <p className="text-[13px] tracking-widest uppercase" style={{ color: accent }}>
                {SEMESTER_LABELS[semester]}
              </p>
              <p className="text-[15px] mt-0.5" style={{ color: textSecondary }}>
                第 {round} 回合 · 共24回合
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={resetGame}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] transition-all hover:opacity-70"
                style={{ color: textSecondary, border: `1px solid ${border}` }}
              >
                <RefreshCw size={11} /> 重新开始
              </button>
              <button
                type="button"
                onClick={() => { setDesktopGameSection("round"); setTutorialStep(0); setShowTutorial(true); }}
                aria-label="查看新手指引"
                title="查看新手指引"
                className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition hover:bg-white/[0.05] hover:text-[#dec678]"
                style={{ border: `1px solid ${border}` }}
              >
                <CircleHelp size={14} />
              </button>
            </div>
          </div>

          {/* ── 校园特招弹窗 (覆盖在最上方) ── */}
          {activeCampusEvent && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center px-6" style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(6px)" }}>
              <div className="max-w-md w-full rounded-2xl p-7" style={{ background: card, border: `1px solid ${accent}` }}>
                <p className="text-[12px] tracking-widest uppercase mb-4" style={{ color: accent }}>
                  特殊机遇 · {activeCampusEvent.companyName}
                </p>

                {!campusEventResult ? (
                  <>
                    <h3 className="text-2xl mb-3" style={{ color: textPrimary, fontFamily: "'Noto Serif SC', serif" }}>
                      {activeCampusEvent.title}
                    </h3>
                    <p className="text-[15px] leading-relaxed mb-6" style={{ color: "rgba(200,220,255,0.7)" }}>
                      {activeCampusEvent.description}
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleCampusEvent(false)}
                        className="flex-1 py-3 rounded-xl text-[14px] transition-all hover:bg-white/5"
                        style={{ border: `1px solid rgba(255,255,255,0.1)`, color: textSecondary }}
                      >
                        无视并离开
                      </button>
                      <button
                        onClick={() => handleCampusEvent(true)}
                        className="flex-1 py-3 rounded-xl text-[14px] transition-all hover:opacity-90"
                        style={{ background: accent, color: "#070d1c" }}
                      >
                        尝试挑战
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <h3 className="text-2xl mb-3" style={{ color: campusEventResult.success ? accent : "#f87171", fontFamily: "'Noto Serif SC', serif" }}>
                      {campusEventResult.success ? "挑战成功" : "挑战失败"}
                    </h3>
                    <p className="text-[16px] leading-relaxed mb-6" style={{ color: "rgba(220,235,255,0.85)" }}>
                      {campusEventResult.narrative}
                    </p>
                    <button
                      onClick={dismissCampusResult}
                      className="w-full py-3 rounded-xl text-[15px] transition-all hover:opacity-90"
                      style={{ background: campusEventResult.success ? accent : "rgba(255,255,255,0.1)", color: campusEventResult.success ? "#070d1c" : textSecondary }}
                    >
                      继续
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ── 事件卡片 ── */}
          {(phase === "event_view" || (phase === "action_choice" && displayEvent)) && displayEvent && phase === "event_view" && (
            <div
              className={`mb-6 rounded-2xl p-6 ${showTutorial && tutorialStep === 1 ? "relative z-[221] ring-2 ring-[#dec678]/80 shadow-[0_0_0_8px_rgba(201,168,76,0.08)]" : ""}`}
              style={{
                background: displayEvent.type === "positive" ? "rgba(74,222,128,0.05)" : "rgba(239,83,80,0.05)",
                border: displayEvent.type === "positive" ? "1px solid rgba(74,222,128,0.2)" : "1px solid rgba(239,83,80,0.2)",
              }}
            >
              <div className="mb-3 flex items-center gap-2">
                <span
                  className="rounded px-2 py-1 text-[12px] uppercase tracking-widest"
                  style={{
                    color: displayEvent.type === "positive" ? "#4ade80" : "#ef5350",
                    background: displayEvent.type === "positive" ? "rgba(74,222,128,0.1)" : "rgba(239,83,80,0.1)",
                  }}
                >
                  随机事件 · 分支叙事
                </span>
              </div>
              <h3 className="mb-3 text-[18px]" style={{ color: textPrimary, fontFamily: "'Noto Serif SC', serif" }}>
                {displayEvent.title}
              </h3>
              <p className="mb-5 text-[15px] leading-relaxed" style={{ color: "rgba(200,220,255,0.7)" }}>
                {displayEvent.description}
              </p>

              {selectedEventBranch ? (
                <div className="border-t pt-5" style={{ borderColor: border }}>
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="text-[11px] uppercase tracking-[0.18em]" style={{ color: textSecondary }}>你的选择</span>
                    <span className="rounded-full border border-[#c9a84c]/25 bg-[#c9a84c]/10 px-2 py-0.5 text-[11px] text-[#dec678]">
                      {selectedEventBranch.tag}
                    </span>
                  </div>
                  <h4 className="mb-3 text-[17px] font-semibold" style={{ color: textPrimary }}>
                    {selectedEventBranch.label}
                  </h4>
                  <p className="mb-5 text-[15px] leading-[1.8]" style={{ color: "rgba(220,235,255,0.84)", fontFamily: "'Noto Serif SC', serif" }}>
                    {selectedEventBranch.resultText}
                  </p>
                  <p className="mb-2 text-[11px] uppercase tracking-[0.18em]" style={{ color: textSecondary }}>实际属性变化</p>
                  <div className="mb-5 flex flex-wrap gap-1.5">
                    {Object.keys(eventDelta).length > 0 ? (
                      (Object.keys(eventDelta) as StatKey[]).map((key) => (
                        <DeltaBadge key={key} statKey={key} value={eventDelta[key]!} />
                      ))
                    ) : (
                      <span className="text-[13px]" style={{ color: textSecondary }}>属性已处于边界，本次没有产生实际数值变化</span>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={acknowledgeEvent}
                      className="flex-1 rounded-xl px-5 py-2.5 text-[14px] transition-all hover:opacity-90"
                      style={{
                        background: displayEvent.type === "positive" ? "rgba(74,222,128,0.15)" : "rgba(239,83,80,0.15)",
                        color: displayEvent.type === "positive" ? "#4ade80" : "#ef5350",
                        border: displayEvent.type === "positive" ? "1px solid rgba(74,222,128,0.25)" : "1px solid rgba(239,83,80,0.25)",
                      }}
                    >
                      返回地图继续行动
                    </button>
                    <a
                      href="https://v.wjx.cn/vm/YDzWe08.aspx#"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center whitespace-nowrap rounded-xl px-4 py-2.5 text-[13px] transition-all hover:bg-white/5"
                      style={{ color: textSecondary, border: `1px dashed ${textSecondary}` }}
                    >
                      ✍️ 投稿故事
                    </a>
                  </div>
                </div>
              ) : displayEventBranches.length > 0 ? (
                <div>
                  <p className="mb-3 text-[12px] uppercase tracking-[0.18em]" style={{ color: textSecondary }}>
                    你会怎么做？
                  </p>
                  <div className="space-y-3">
                    {displayEventBranches.map((branch) => (
                      <button
                        key={branch.id}
                        type="button"
                        onClick={() => chooseEventBranch(branch)}
                        className="group w-full rounded-xl border border-white/10 bg-white/[0.025] p-4 text-left outline-none transition-all hover:border-[#c9a84c]/40 hover:bg-[#c9a84c]/[0.06] focus-visible:ring-2 focus-visible:ring-[#c9a84c]/50"
                      >
                        <span className="mb-3 flex items-center gap-3">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#c9a84c]/25 bg-[#c9a84c]/10 font-mono text-[12px] text-[#dec678]">
                            {branch.id}
                          </span>
                          <span className="text-[15px] font-medium text-slate-100">{branch.label}</span>
                          <span className="ml-auto rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-slate-400 transition-colors group-hover:text-slate-200">
                            {branch.tag}
                          </span>
                        </span>
                      </button>
                    ))}

                    {isCustomEventActionOpen ? (
                      <div className="rounded-xl border border-[#c9a84c]/35 bg-[#c9a84c]/[0.055] p-4" aria-label="自定义行动">
                        <div className="mb-3 flex items-center gap-3">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#c9a84c]/35 bg-[#c9a84c]/15 font-mono text-[12px] text-[#dec678]">D</span>
                          <div>
                            <p className="text-[15px] font-medium text-slate-100">我有自己的做法</p>
                            <p className="mt-0.5 text-[11px] text-slate-500">描述你的行动，之后将由 AI 推演可能的影响</p>
                          </div>
                          <span className="ml-auto rounded-full border border-[#c9a84c]/20 px-2 py-0.5 text-[10px] text-[#cdb768]">自由行动</span>
                        </div>

                        <div className="relative">
                          <textarea
                            value={customEventAction}
                            onChange={(event) => {
                              setCustomEventAction(event.target.value);
                              setCustomEventActionFeedback("");
                            }}
                            maxLength={200}
                            rows={4}
                            autoFocus
                            disabled={isEvaluatingCustomEventAction}
                            placeholder="例如：我会在面试后做一个小型线上项目，并把结果补充发给 HR……"
                            className="w-full resize-none rounded-xl border border-white/10 bg-black/20 px-4 py-3 pb-8 text-[14px] leading-relaxed text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-[#c9a84c]/45 focus:ring-2 focus:ring-[#c9a84c]/10"
                          />
                          <span className="pointer-events-none absolute bottom-2.5 right-3 text-[10px] tabular-nums text-slate-600">
                            {customEventAction.length} / 200
                          </span>
                        </div>

                        {isEvaluatingCustomEventAction && (
                          <div
                            className="mt-3 rounded-xl border border-[#c9a84c]/20 bg-black/20 p-3.5"
                            role="status"
                            aria-live="polite"
                          >
                            <div className="mb-3 flex items-center justify-between gap-3">
                              <span className="flex items-center gap-2 text-[12px] font-medium text-[#dec678]">
                                <RefreshCw size={13} className="animate-spin" />AI 推演进行中
                              </span>
                              <span className="text-[10px] text-slate-600">无需重复提交</span>
                            </div>
                            <div className="space-y-2.5">
                              {[
                                "理解你的行动与当前处境",
                                "评估可行性、风险与代价",
                                "生成结果并计算属性影响",
                              ].map((step, index) => {
                                const activeIndex = Math.min(customEventEvaluationStage, 2);
                                const isDone = index < activeIndex;
                                const isActive = index === activeIndex;
                                return (
                                  <div key={step} className="flex items-center gap-2.5">
                                    <span
                                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] transition-colors ${
                                        isDone
                                          ? "border-emerald-400/35 bg-emerald-400/10 text-emerald-300"
                                          : isActive
                                            ? "border-[#c9a84c]/45 bg-[#c9a84c]/10 text-[#dec678]"
                                            : "border-white/10 text-slate-700"
                                      }`}
                                    >
                                      {isDone ? <Check size={11} /> : isActive ? <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" /> : index + 1}
                                    </span>
                                    <span className={`text-[11px] transition-colors ${isDone ? "text-slate-500" : isActive ? "text-slate-200" : "text-slate-700"}`}>
                                      {step}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                            {customEventEvaluationStage >= 3 && (
                              <p className="mt-3 border-t border-white/[0.06] pt-2.5 text-[10px] leading-relaxed text-slate-500">
                                仍在等待模型生成。复杂选择可能需要更久，你的输入已安全保留，也可以随时取消推演。
                              </p>
                            )}
                          </div>
                        )}

                        {customEventActionFeedback && (
                          <p className="mt-2 rounded-lg border border-[#c9a84c]/15 bg-[#c9a84c]/[0.05] px-3 py-2 text-[12px] leading-relaxed text-[#cdb768]" role="status">
                            {customEventActionFeedback}
                          </p>
                        )}

                        <div className="mt-3 flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              if (isEvaluatingCustomEventAction) {
                                customEventEvaluationAbortRef.current?.abort();
                                return;
                              }
                              setIsCustomEventActionOpen(false);
                              setCustomEventAction("");
                              setCustomEventActionFeedback("");
                            }}
                            className="rounded-lg px-4 py-2 text-[12px] text-slate-400 transition hover:bg-white/5 hover:text-slate-200"
                          >
                            {isEvaluatingCustomEventAction ? "取消推演" : "取消"}
                          </button>
                          <button
                            type="button"
                            disabled={customEventAction.trim().length < 10 || isEvaluatingCustomEventAction}
                            onClick={submitCustomEventAction}
                            aria-busy={isEvaluatingCustomEventAction}
                            className="flex items-center gap-2 rounded-lg border border-[#c9a84c]/30 bg-[#c9a84c]/15 px-4 py-2 text-[12px] font-medium text-[#dec678] transition hover:bg-[#c9a84c]/20 disabled:cursor-not-allowed disabled:border-white/5 disabled:bg-white/[0.025] disabled:text-slate-600"
                          >
                            {isEvaluatingCustomEventAction ? (
                              <><RefreshCw size={13} className="animate-spin" />命运正在推演……</>
                            ) : (
                              <>推演结果 →</>
                            )}
                          </button>
                        </div>
                        {customEventAction.trim().length > 0 && customEventAction.trim().length < 10 && (
                          <p className="mt-2 text-right text-[10px] text-slate-600">至少输入 10 个字，让 AI 能理解你的行动</p>
                        )}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setIsCustomEventActionOpen(true);
                          setCustomEventActionFeedback("");
                        }}
                        className="group w-full rounded-xl border border-dashed border-[#c9a84c]/25 bg-[#c9a84c]/[0.025] p-4 text-left outline-none transition-all hover:border-[#c9a84c]/50 hover:bg-[#c9a84c]/[0.07] focus-visible:ring-2 focus-visible:ring-[#c9a84c]/50"
                      >
                        <span className="flex items-center gap-3">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#c9a84c]/25 bg-[#c9a84c]/10 font-mono text-[12px] text-[#dec678]">D</span>
                          <span>
                            <span className="block text-[15px] font-medium text-slate-100">我有自己的做法</span>
                            <span className="mt-1 block text-[11px] text-slate-500">输入你的行动，让 AI 推演可能的结果</span>
                          </span>
                          <span className="ml-auto rounded-full border border-[#c9a84c]/15 px-2 py-0.5 text-[10px] text-[#a9965b] transition-colors group-hover:text-[#dec678]">自由行动</span>
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <div className="mb-5 flex flex-wrap gap-1.5">
                    {(Object.keys(displayEvent.effects) as StatKey[]).map((key) => (
                      <DeltaBadge key={key} statKey={key} value={displayEvent.effects[key]!} />
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={acknowledgeEvent}
                    className="w-full rounded-xl px-5 py-2.5 text-[14px] transition-all hover:opacity-90"
                    style={{ color: textSecondary, border: `1px solid ${border}` }}
                  >
                    继续
                  </button>
                </div>
              )}
            </div>
          )}
          {/* ── 已发生事件提醒（action_choice阶段显示） ── */}
          {phase === "action_choice" && displayEvent && (
            <div
              className="rounded-xl px-4 py-3 mb-4 flex items-start gap-2"
              style={{
                background: displayEvent.type === "positive" ? "rgba(74,222,128,0.05)" : "rgba(239,83,80,0.05)",
                border: displayEvent.type === "positive" ? "1px solid rgba(74,222,128,0.12)" : "1px solid rgba(239,83,80,0.12)"
              }}
            >
              <span
                className="text-[12px] px-1.5 py-0.5 rounded mt-0.5 shrink-0"
                style={{
                  background: displayEvent.type === "positive" ? "rgba(74,222,128,0.1)" : "rgba(239,83,80,0.1)",
                  color: displayEvent.type === "positive" ? "#4ade80" : "#ef5350"
                }}
              >
                事件
              </span>
              <p className="text-[14px]" style={{ color: displayEvent.type === "positive" ? "rgba(74,222,128,0.8)" : "rgba(239,83,80,0.8)" }}>
                《{displayEvent.title}》已发生，属性已更新。现在选择本回合行动。
              </p>
            </div>
          )}

          {/* ── 行动选择 ── */}
          {phase === "action_choice" && (
            <div className={showTutorial && tutorialStep === 1 ? "relative z-[221] -m-3 rounded-2xl p-3 ring-2 ring-[#dec678]/80 shadow-[0_0_0_8px_rgba(201,168,76,0.08)]" : ""}>
              <p className="text-[14px] mb-4" style={{ color: textSecondary }}>
                本回合行动（选择一项）：
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {ACTIONS.filter(
                  (action) =>
                    (action.id !== "campus" || semester >= 5)
                    && (action.id !== "internship" || totalRound < 24)
                ).map((action) => (
                  <button
                    key={action.id}
                    onClick={() => {
                      chooseAction(action);
                      if (action.id === "internship") setDesktopGameSection("map");
                    }}
                    className="text-left p-4 rounded-xl transition-all duration-200 hover:border-blue-400/40 hover:bg-white/5 group"
                    style={{ background: card, border: `1px solid ${border}` }}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xl">{action.emoji}</span>
                      <span className="text-[15px]" style={{ color: textPrimary }}>{action.label}</span>
                    </div>
                    <p className="text-[13px] leading-relaxed mb-2" style={{ color: textSecondary }}>
                      {action.description}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {(Object.keys(action.effects) as StatKey[]).slice(0, 3).map((k) => (
                        <DeltaBadge key={k} statKey={k} value={action.effects[k]!} />
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── 行动结果 ── */}
          {phase === "action_result" && chosenAction && chosenAction.id !== "internship" && (
            <div className={showTutorial && tutorialStep === 1 ? "relative z-[221] -m-3 rounded-2xl p-3 ring-2 ring-[#dec678]/80 shadow-[0_0_0_8px_rgba(201,168,76,0.08)]" : ""}>
              <div
                className="rounded-2xl p-6 mb-6"
                style={{ background: "rgba(74,158,255,0.05)", border: `1px solid rgba(74,158,255,0.18)` }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">{chosenAction.emoji}</span>
                  <span
                    className="text-[12px] tracking-widest uppercase px-2 py-1 rounded"
                    style={{ color: accent, background: "rgba(74,158,255,0.1)" }}
                  >
                    {chosenAction.label}
                  </span>
                </div>
                <p className="text-[16px] leading-relaxed mb-5" style={{ color: "rgba(220,235,255,0.85)", fontFamily: "'Noto Serif SC', serif" }}>
                  {actionNarrative}
                </p>
                {/* 属性变化 */}
                {Object.keys(actionDelta).length > 0 && (
                  <>
                    <p className="text-[12px] uppercase tracking-widest mb-2" style={{ color: textSecondary }}>属性变化</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(Object.keys(actionDelta) as StatKey[]).map((k) => (
                        <DeltaBadge key={k} statKey={k} value={actionDelta[k]!} />
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* 学期小结（每4回合一次） */}
              {round === 4 && (
                <div
                  className="rounded-xl px-5 py-4 mb-5 text-center"
                  style={{ background: "rgba(255,255,255,0.025)", border: `1px solid ${border}` }}
                >
                  <p className="text-[13px] tracking-widest uppercase mb-1" style={{ color: accent }}>
                    {SEMESTER_LABELS[semester]} 结束
                  </p>
                  {semester < 6 ? (
                    <p className="text-[14px]" style={{ color: textSecondary }}>
                      时间继续向前，{SEMESTER_LABELS[semester + 1 > 6 ? 6 : semester + 1]}即将开始。
                    </p>
                  ) : (
                    <p className="text-[14px]" style={{ color: textSecondary }}>
                      三年已过，你的故事即将揭晓。
                    </p>
                  )}
                </div>
              )}

              <button
                onClick={nextRound}
                className="w-full py-3.5 rounded-xl text-[15px] transition-all hover:opacity-90 flex items-center justify-center gap-2"
                style={{ background: totalRound >= 24 ? "#4a9eff" : `rgba(74,158,255,0.15)`, color: totalRound >= 24 ? "#070d1c" : accent, border: totalRound >= 24 ? "none" : `1px solid rgba(74,158,255,0.3)` }}
              >
                {chosenAction.id === "internship"
                  ? selectedInternshipIds.length > 0
                    ? `提交 ${selectedInternshipIds.length} 份申请，进入下一回合`
                    : "请先选择要投递的岗位"
                  : totalRound >= 24 ? "查看结局 →" : "进入下一回合"}
                {totalRound < 24 && chosenAction.id !== "internship" && <ChevronRight size={14} />}
              </button>
            </div>
          )}
        </main>

        {ENABLE_DESKTOP_GAME_SIDEBAR && desktopGameSection === "map" && (
          <>
            <MobileMapView
              canChooseAction={phase === "action_choice"}
              notice={
                activeCampusEvent
                  ? { title: "收到一条特殊机遇", description: "前往“本回合”查看邀请并作出决定。" }
                  : phase === "event_view"
                    ? { title: selectedEventBranch ? "事件结果等待确认" : "本回合出现随机事件", description: selectedEventBranch ? "查看结果后即可返回地图选择行动。" : "先处理事件，地图行动随后开放。", urgent: true }
                    : phase === "action_result"
                      ? { title: "本轮行动等待结算", description: "查看行动结果，并确认进入下一回合。" }
                      : null
              }
              onOpenRound={() => setDesktopGameSection("round")}
              actions={ACTIONS}
              onChooseAction={(actionId) => {
                const action = ACTIONS.find((candidate) => candidate.id === actionId);
                if (!action || phase !== "action_choice") return;
                chooseAction(action);
                if (action.id !== "internship") setDesktopGameSection("round");
              }}
            />
            <DesktopMapPreview
              semesterLabel={SEMESTER_LABELS[semester]}
              semester={semester}
              round={round}
              canChooseAction={phase === "action_choice"}
              roundNotice={
                activeCampusEvent
                  ? { title: "收到一条特殊机遇", description: "前往“本回合”查看邀请并作出决定。" }
                  : phase === "event_view"
                    ? { title: selectedEventBranch ? "事件结果等待确认" : "本回合出现随机事件", description: selectedEventBranch ? "查看结果后即可返回地图选择行动。" : "先处理事件，地图行动随后开放。", urgent: true }
                    : phase === "action_result"
                      ? { title: "本轮行动等待结算", description: "查看行动结果，并确认进入下一回合。" }
                      : null
              }
              onOpenRound={() => setDesktopGameSection("round")}
              actions={ACTIONS}
              onChooseAction={(actionId) => {
                const action = ACTIONS.find((candidate) => candidate.id === actionId);
                if (!action || phase !== "action_choice") return;
                chooseAction(action);
                if (action.id !== "internship") setDesktopGameSection("round");
              }}
            />
          </>
        )}

        {desktopGameSection !== "computer" && phase === "action_result" && chosenAction?.id === "internship" && currentOfferedInternships.length > 0 && (
          <div className="fixed inset-0 z-[210] flex items-center justify-center bg-[#020611]/78 p-3 backdrop-blur-md sm:p-6">
            <section role="dialog" aria-modal="true" aria-labelledby="map-internship-title" className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-[#c9a84c]/30 bg-[#07101d] shadow-[0_30px_100px_rgba(0,0,0,0.68)]">
              <header className="flex flex-wrap items-end justify-between gap-3 border-b border-white/[0.08] bg-[radial-gradient(circle_at_top_right,rgba(201,168,76,0.12),transparent_58%)] px-4 py-3 sm:px-5">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.22em] text-[#c9a84c]">Career Center · Internship Radar</p>
                  <h3 id="map-internship-title" className="mt-1 text-xl font-semibold text-white">选择本轮要投递的岗位</h3>
                  <p className="mt-1 text-[11px] text-slate-500">最多投递 3 个岗位，筛选进展将在下一回合发送到求职电脑。</p>
                </div>
                <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] text-slate-400">已选 {selectedInternshipIds.length} / 3</span>
              </header>

              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-5">
                <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-3">
                  {currentOfferedInternships.map((option) => {
                    const selected = selectedInternshipIds.includes(option.id);
                    const fit = getInternshipFitInfo(option, stats);
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => {
                          setInternshipApplicationFeedback("");
                          setSelectedInternshipIds((previous) => {
                            if (previous.includes(option.id)) return previous.filter((id) => id !== option.id);
                            if (previous.length >= 3) {
                              setInternshipApplicationFeedback("一轮最多投递 3 个岗位，先取消一个已选岗位。");
                              return previous;
                            }
                            return [...previous, option.id];
                          });
                        }}
                        className={`rounded-xl border p-3 text-left transition-all ${selected ? "border-[#c9a84c] bg-[#c9a84c]/12 shadow-[0_0_0_1px_rgba(201,168,76,0.14)]" : "border-blue-300/15 bg-[#0a1224] hover:border-blue-300/30 hover:bg-[#0d172b]"}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div><p className="text-[11px] text-slate-500">{option.companyName}</p><p className="mt-0.5 text-[14px] font-medium text-white">{option.title}</p></div>
                          <span className="shrink-0 rounded-full border px-2 py-0.5 text-[9px]" style={{ color: fit.color, borderColor: `${fit.color}55`, background: `${fit.color}12` }}>{fit.label}</span>
                        </div>
                        <p className="mt-1.5 text-[11px] text-[#dec678]">{option.stipend}</p>
                        <p className="mt-1.5 line-clamp-2 text-[11px] leading-4 text-slate-400">{option.description}</p>
                        <div className="mt-2 flex items-center justify-between gap-2 border-t border-white/[0.06] pt-2"><span className="text-[9px] text-slate-600">{fit.reason}</span><span className={`text-[10px] ${selected ? "text-[#dec678]" : "text-slate-600"}`}>{selected ? "已加入投递" : "选择岗位"}</span></div>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-3.5">
                  <p className="mb-2 text-[10px] uppercase tracking-[0.18em] text-slate-500">选择投递渠道</p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {INTERNSHIP_CHANNELS.map((channel) => {
                      const selected = internshipChannel === channel.id;
                      return (
                        <button key={channel.id} type="button" onClick={() => setInternshipChannel(channel.id)} className={`rounded-xl border px-3 py-2.5 text-left transition-all ${selected ? "border-blue-400/50 bg-blue-400/10" : "border-white/[0.08] bg-white/[0.02] hover:border-white/15"}`}>
                          <span className={`block text-[11px] font-medium ${selected ? "text-blue-300" : "text-slate-300"}`}>{channel.label}</span>
                          <span className="mt-1 block text-[9px] leading-4 text-slate-600">{channel.description}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {internshipApplicationFeedback && <p className="mt-3 rounded-lg border border-[#c9a84c]/15 bg-[#c9a84c]/[0.05] px-3 py-2 text-[10px] text-[#cdb768]">{internshipApplicationFeedback}</p>}
              </div>

              <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.08] px-4 py-3 sm:px-5">
                <p className="text-[10px] text-slate-600">提交后本回合结束，招聘进展不会在地图上直接揭晓。</p>
                <button type="button" onClick={nextRound} className="rounded-xl border border-[#c9a84c]/35 bg-[#c9a84c]/15 px-6 py-3 text-[12px] font-semibold text-[#e3cc7d] transition hover:bg-[#c9a84c]/22">
                  {selectedInternshipIds.length > 0 ? `提交 ${selectedInternshipIds.length} 份申请并结束本回合` : "请先选择要投递的岗位"}
                </button>
              </footer>
            </section>
          </div>
        )}
        {ENABLE_DESKTOP_GAME_SIDEBAR && desktopGameSection === "computer" && (
          <DesktopComputerPreview
            interviews={computerInterviews}
            activeInterviewId={activeInterviewApplicationId}
            onSelectInterview={selectInternshipApplication}
            onAttendInterview={attendInternshipInterview}
            onDeclineInterview={declineInternshipInterview}
            onChoosePreparation={chooseInterviewPreparation}
            onAnswer={answerInternshipInterview}
            onAcceptOffer={acceptInternshipOffer}
            onDeclineOffer={declineInternshipOffer}
            onClose={() => { setDesktopGameSection("map"); setActiveInterviewApplicationId(null); }}
            socialState={socialState}
            socialMessages={socialMessages}
            socialReplyOptions={getActiveReplyOptions(socialState, activeSocialNpcId)}
            activeNpcId={activeSocialNpcId}
            professorName={mentorDisplayName(mentor)}
            professorFavorability={socialState.bonds.professor?.favorability ?? stats?.mentorFavorability ?? 30}
            socialUnlockContext={{ semester, round, totalRound: (semester - 1) * 4 + round }}
            socialUnreadCount={socialUnreadCount}
            onSocialReply={handleSocialReply}
            onSocialMarkRead={handleSocialMarkRead}
            onSocialSelectNpc={handleSocialSelectNpc}
            onSocialGreeting={handleSocialGreeting}
          />
        )}
        {/* ─── 右侧：常驻简历 ─── */}
        <aside
          className={`${ENABLE_DESKTOP_GAME_SIDEBAR ? (desktopGameSection === "resume" ? "flex" : "hidden") : "hidden"} shrink-0 flex-col overflow-y-auto p-4 pb-28 lg:p-5 lg:pb-5 ${ENABLE_DESKTOP_GAME_SIDEBAR ? (desktopGameSection === "resume" ? "lg:flex lg:min-w-0 lg:flex-1 lg:shrink lg:flex-1" : "lg:hidden") : "lg:flex lg:w-80"}`}
          style={{ background: "rgba(0,0,0,0.2)" }}
        >
          <ResumeView
            character={character}
            stats={stats}
            pastInternships={pastInternships}
            onUpdateInternshipDetails={updateInternshipDetails}
            onClose={() => { }}
          />
        </aside>
        {ENABLE_DESKTOP_GAME_SIDEBAR && (
          <DecisionStatusRail
            stats={stats}
            mentor={mentor}
            semester={semester}
            round={round}
            totalRound={totalRound}
            progressPct={progressPct}
            phase={phase}
            actionDelta={actionDelta}
            eventDelta={eventDelta}
            tutorialActive={showTutorial && tutorialStep === 2}
          />
        )}

        <AIAssistant gameContext={{ character, stats, mentor, semester, phase, ending }} tutorialActive={showTutorial && tutorialStep === 3} />
      </div >
    );
  }

  // ── offer 选择页（结局前，让玩家选定具体 offer）
  if (phase === "offer_choice" && stats) {
    if (!receivedOffers) {
      // 首次计算本局游戏拿到的随机offer
      setReceivedOffers(checkQualifiedCompanies(stats, offerBuffs, pastInternships));
      return null;
    }

    const qualified = receivedOffers;


    const handleConfirmOffer = () => {
      // 增加提示逻辑：如果用户有 offer 但未选择，弹窗或阻止
      if (qualified.length > 0 && !selectedOfferId) {
        // 这里简单做一个 window.confirm 或者直接 toast 提示
        // 考虑到 UI 风格，我们可以在按钮上方显示红字提示，或者直接用 window.confirm
        if (!window.confirm("你目前拥有 Offer 但未选择任何一项，继续将导致【无 Offer 结局】。确定要放弃所有机会吗？")) {
          return;
        }
      }
      const finalEnding = calculateEndingWithOffer(stats, selectedOfferId);
      // === 埋点 ending_reach（正常结局，走 offer 选择）===
      const selectedCompany = selectedOfferId ? COMPANIES.find((c) => c.id === selectedOfferId) : null;
      tracker.track("ending_reach", {
        ending_id: finalEnding.id,
        ending_title: finalEnding.title,
        is_early_ending: false,
        early_trigger_reason: null,
        ending_turn_index: 23,
        final_stats: stats,
        offer_name: selectedCompany?.name ?? null,
        offer_id: selectedOfferId,
        offer_level: selectedOfferId ? COMPANY_OFFER_META[selectedOfferId]?.level ?? null : null,
        offer_count_total: qualified.length,
        internship_count: internshipApplications.length,
      }, {
        phase: "offer_choice",
        statsSnapshot: stats,
      });
      setEnding(finalEnding);
      setPhase("ending");
    };

    const offerPageStyle: CSSProperties = {
      ...pageStyle,
      backgroundImage:
        'linear-gradient(rgba(5, 8, 20, 0.74), rgba(5, 8, 20, 0.82)), url("/assets/visuals/backgrounds/game-dashboard-background.png")',
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
    };

    return (
      <div style={offerPageStyle} className="min-h-screen px-5 py-10 sm:px-8 lg:py-14">
        <div className="mx-auto w-full max-w-6xl">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-3 text-[12px] uppercase tracking-[0.34em]" style={{ color: accent }}>三年结束 · OFFER SELECTION</p>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl" style={{ color: textPrimary }}>选择你的下一站</h1>
              <p className="mt-3 max-w-2xl text-[14px] leading-relaxed" style={{ color: textSecondary }}>
                秋招结果已经揭晓。薪资之外，公司赛道、成长方式和工作节奏同样会改变你的结局。
              </p>
            </div>
            <div className="flex items-center gap-3 rounded-2xl px-4 py-3" style={{ background: "rgba(201,168,76,0.07)", border: `1px solid ${border}` }}>
              <BriefcaseBusiness size={20} style={{ color: accent }} />
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: textSecondary }}>正式意向书</p>
                <p className="mt-0.5 text-[17px] font-semibold" style={{ color: textPrimary }}>{qualified.length} 份 Offer</p>
              </div>
            </div>
          </div>

          {qualified.length === 0 ? (
            <div className="rounded-3xl px-8 py-14 text-center" style={{ background: card, border: `1px solid ${border}` }}>
              <BriefcaseBusiness size={34} className="mx-auto mb-4 opacity-40" />
              <p className="text-lg" style={{ color: textPrimary }}>本轮没有收到正式 Offer</p>
              <p className="mx-auto mt-3 max-w-xl text-[14px] leading-relaxed" style={{ color: textSecondary }}>
                激烈的竞争让你暂时进入了人才库，但这并不代表故事结束。继续查看属于你的结局。
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {qualified.map((c) => {
                const meta = COMPANY_OFFER_META[c.id] ?? { salary: "面议", perks: c.description, level: "中厂" as const };
                const selected = selectedOfferId === c.id;
                const companyAccent = OFFER_CATEGORY_ACCENTS[c.category] ?? accent;
                const logo = COMPANY_LOGOS[c.id];
                const perkItems = meta.perks.split("·").map((item) => item.trim()).filter(Boolean);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedOfferId(selected ? null : c.id)}
                    aria-pressed={selected}
                    className="group relative overflow-hidden rounded-xl text-left transition-all duration-200 hover:-translate-y-1"
                    style={{
                      background: selected ? "rgba(201,168,76,0.12)" : "rgba(9,14,30,0.96)",
                      border: selected ? `1px solid ${accent}` : `1px solid ${border}`,
                      boxShadow: selected ? "0 14px 38px rgba(0,0,0,0.34), 0 0 0 1px rgba(201,168,76,0.2)" : "0 9px 24px rgba(0,0,0,0.18)",
                    }}
                  >
                    <span className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden bg-white p-5">
                      <span className="absolute left-3 top-3 z-10 max-w-[70%] truncate rounded-full px-2.5 py-1 text-[10px] font-semibold shadow-sm" style={{ background: "rgba(7,12,27,0.82)", color: companyAccent }}>{c.category}</span>
                      {selected && <span className="absolute right-3 top-3 z-10 flex items-center gap-1 rounded-full bg-[#c9a84c] px-2.5 py-1 text-[10px] font-semibold text-[#07101d] shadow-md"><CheckCircle2 size={12} />已选择</span>}
                      {logo ? (
                        <img src={logo} alt={c.name + "公司图标"} className="h-full w-full scale-105 object-contain transition-transform duration-200 group-hover:scale-110" />
                      ) : (
                        <span className="flex h-24 w-24 items-center justify-center rounded-3xl text-4xl font-bold" style={{ background: `${companyAccent}18`, color: companyAccent }}>{c.name.slice(0, 1)}</span>
                      )}
                    </span>

                    <span className="block p-4">
                      <span className="flex items-start justify-between gap-3">
                        <span className="min-w-0">
                          <span className="block truncate text-[17px] font-semibold" style={{ color: textPrimary }}>{c.name}</span>
                          <span className="mt-1 block truncate text-[11px]" style={{ color: textSecondary }}>{getOfferRole(c.category)}</span>
                        </span>
                        <span className="shrink-0 text-right text-[15px] font-semibold" style={{ color: accent }}>{meta.salary}</span>
                      </span>
                      <span className="mt-3 block truncate text-[11px]" style={{ color: textSecondary }}>{c.description}</span>
                      <span className="mt-3 flex gap-1.5 overflow-hidden">
                        {perkItems.slice(0, 2).map((perk) => <span key={perk} className="shrink-0 rounded-md border border-white/[0.07] bg-white/[0.035] px-2 py-1 text-[9px]" style={{ color: textSecondary }}>{perk}</span>)}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="mt-8 rounded-2xl p-4 sm:flex sm:items-center sm:justify-between sm:gap-6" style={{ background: "rgba(9,14,30,0.9)", border: `1px solid ${selectedOfferId ? "rgba(201,168,76,0.45)" : border}` }}>
            <div className="mb-4 sm:mb-0">
              {selectedOfferId && qualified.length > 0 ? (
                <><p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: textSecondary }}>当前选择</p><p className="mt-1 text-[16px] font-semibold" style={{ color: accent }}>{qualified.find((c) => c.id === selectedOfferId)?.name} · {getOfferRole(qualified.find((c) => c.id === selectedOfferId)?.category ?? "")}</p></>
              ) : qualified.length > 0 ? (
                <><p className="flex items-center gap-2 text-[14px] text-red-400"><TriangleAlert size={16} />尚未选择 Offer</p><p className="mt-1 text-[12px]" style={{ color: textSecondary }}>直接继续将视为放弃全部机会。</p></>
              ) : (
                <p className="text-[14px]" style={{ color: textSecondary }}>准备查看最终结局。</p>
              )}
            </div>
            <button
              onClick={handleConfirmOffer}
              className="w-full shrink-0 rounded-xl px-7 py-3.5 text-[14px] font-semibold transition-all hover:opacity-90 sm:w-auto"
              style={{ background: (!selectedOfferId && qualified.length > 0) ? "rgba(255,255,255,0.1)" : accent, color: (!selectedOfferId && qualified.length > 0) ? textSecondary : "#070d1c" }}
            >
              {(!selectedOfferId && qualified.length > 0) ? "放弃 Offer 并查看结局" : "确认选择，查看结局 →"}
            </button>
          </div>

          <AIAssistant gameContext={{ character, stats, mentor, semester, phase, ending }} />
        </div>
      </div>
    );
  }
  // ── 结局页
  if (phase === "ending" && stats) {
    const finalEnding = ending || ENDINGS[0]; // 回退到第一个结局以防万一
    const qualified = receivedOffers || [];
    const selectedCompany = qualified.find((company) => company.id === selectedOfferId);
    const endingBackground = selectedCompany
      ? COMPANY_ENDING_BACKGROUNDS[selectedCompany.id] ?? ENDING_BACKGROUNDS[finalEnding.id]
      : ENDING_BACKGROUNDS[finalEnding.id];
    const endingPageStyle: CSSProperties = endingBackground ? {
      ...pageStyle,
      backgroundImage: `linear-gradient(180deg, rgba(3,6,16,0.20) 0%, rgba(3,6,16,0.42) 48%, rgba(3,6,16,0.78) 100%), url("${endingBackground}")`,
      backgroundSize: "cover",
      backgroundPosition: "center top",
      backgroundRepeat: "no-repeat",
      backgroundAttachment: "fixed",
    } : pageStyle;
    const shareName = character?.name?.trim() || "未命名同学";
    const shareNameSlotWidth = Math.min(280, Math.max(90, Array.from(shareName).length * 9 + 20));
    const shareText = `${shareName}在《我是一个“建”人》中达成结局「${finalEnding.title}」${selectedCompany ? `，即将入职${selectedCompany.name}` : ""}。`;
    const endingCountMap = new Map(globalDistribution?.endings.map((item) => [item.title, item.count]) ?? []);
    const knownEndingTitles = new Set(ENDINGS.map((item) => item.title));
    const endingDistributionRows = [
      ...ENDINGS.map((item) => ({ title: item.title, count: endingCountMap.get(item.title) ?? 0, color: item.color })),
      ...(globalDistribution?.endings ?? [])
        .filter((item) => !knownEndingTitles.has(item.title))
        .map((item) => ({ title: item.title, count: item.count, color: "#94a3b8" })),
    ].sort((a, b) => b.count - a.count || a.title.localeCompare(b.title));
    const offerCountMap = new Map(globalDistribution?.offers.map((item) => [item.name, item.count]) ?? []);
    const knownOfferNames = new Set(COMPANIES.map((company) => company.name));
    const offerLevelOrder = ["大厂", "中厂", "咨询", "投行", "车企", "外企", "小厂", "传统", "其他"];
    const offerLevelAccents: Record<string, string> = {
      大厂: "#5b8cff", 外企: "#72c7d8", 咨询: "#c9a84c", 投行: "#d8bd69", 车企: "#70c998",
      中厂: "#a78bfa", 小厂: "#f59e5b", 传统: "#94a3b8", 其他: "#64748b",
    };
    const totalOfferCount = (globalDistribution?.offers ?? []).reduce((sum, item) => sum + item.count, 0);
    const offerLevelRows = offerLevelOrder.map((level) => {
      const knownCompanies = COMPANIES
        .filter((company) => (COMPANY_OFFER_META[company.id]?.level ?? "其他") === level)
        .map((company) => ({ name: company.name, count: offerCountMap.get(company.name) ?? 0 }));
      const unknownCompanies = level === "其他"
        ? (globalDistribution?.offers ?? []).filter((item) => !knownOfferNames.has(item.name))
        : [];
      const companies = [...knownCompanies, ...unknownCompanies]
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
      return {
        level,
        color: offerLevelAccents[level],
        count: companies.reduce((sum, company) => sum + company.count, 0),
        companies,
      };
    }).filter((item) => item.count > 0);

    const toggleGlobalDistribution = () => {
      const nextOpen = !isDistributionOpen;
      setIsDistributionOpen(nextOpen);
      if (nextOpen && !globalDistribution && !distributionLoading) void loadGlobalDistribution();
    };

    const toggleOfferLevel = (level: string) => {
      setExpandedOfferLevels((previous) => {
        const next = new Set(previous);
        if (next.has(level)) next.delete(level);
        else next.add(level);
        return next;
      });
    };

    const handleShareEnding = async () => {
      const exportNode = endingExportRef.current;
      if (!exportNode || isExportingEnding) return;

      setIsExportingEnding(true);
      setShareFeedback("正在生成结局长图…");

      try {
        exportNode.querySelectorAll<HTMLButtonElement>("[data-cancel-internship-edit]").forEach((button) => button.click());
        await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
        await document.fonts.ready;

        const { toPng } = await import("html-to-image");
        const currentExportNode = endingExportRef.current;
        if (!currentExportNode) throw new Error("结局内容暂时不可用");

        const exportStyle: Partial<CSSStyleDeclaration> = endingBackground ? {
          backgroundColor: "#050814",
          backgroundImage: `linear-gradient(180deg, rgba(3,6,16,0.20) 0%, rgba(3,6,16,0.42) 48%, rgba(3,6,16,0.78) 100%), url("${endingBackground}")`,
          backgroundSize: "cover",
          backgroundPosition: "center top",
          backgroundRepeat: "no-repeat",
        } : {
          background: bg,
        };

        const exportImages = Array.from(currentExportNode.querySelectorAll("img"));
        await Promise.all(exportImages.map((image) => (
          image.complete
            ? Promise.resolve()
            : new Promise<void>((resolve) => {
                image.addEventListener("load", () => resolve(), { once: true });
                image.addEventListener("error", () => resolve(), { once: true });
              })
        )));

        const exportPadding = 32;
        const exportWidth = currentExportNode.scrollWidth + exportPadding * 2;
        const exportHeight = currentExportNode.scrollHeight + exportPadding * 2;
        const exportNodeBounds = currentExportNode.getBoundingClientRect();
        const exportNameSlots = Array.from(
          currentExportNode.querySelectorAll<HTMLElement>("[data-export-name-slot]"),
        ).map((slot) => {
          const bounds = slot.getBoundingClientRect();
          return {
            kind: slot.dataset.exportNameSlot === "header" ? "header" : "record",
            left: bounds.left - exportNodeBounds.left + exportPadding,
            top: bounds.top - exportNodeBounds.top + exportPadding,
            width: bounds.width,
            height: bounds.height,
          };
        });
        const capturedDataUrl = await toPng(currentExportNode, {
          cacheBust: true,
          pixelRatio: 2,
          width: exportWidth,
          height: exportHeight,
          backgroundColor: "#050814",
          skipFonts: true,
          filter: (node) => !(node instanceof HTMLElement && node.dataset.exportHidden === "true"),
          style: {
            ...exportStyle,
            boxSizing: "border-box",
            width: `${exportWidth}px`,
            height: `${exportHeight}px`,
            maxWidth: "none",
            margin: "0",
            padding: `${exportPadding}px`,
          },
        });

        // 姓名不进入 DOM 截图，避免浏览器隐私层对用户输入区域打码；
        // 截图完成后再直接绘制到最终 PNG 像素上。
        const capturedImage = new Image();
        await new Promise<void>((resolve, reject) => {
          capturedImage.addEventListener("load", () => resolve(), { once: true });
          capturedImage.addEventListener("error", () => reject(new Error("结局底图加载失败")), { once: true });
          capturedImage.src = capturedDataUrl;
        });
        const exportCanvas = document.createElement("canvas");
        exportCanvas.width = capturedImage.naturalWidth;
        exportCanvas.height = capturedImage.naturalHeight;
        const exportContext = exportCanvas.getContext("2d");
        if (!exportContext) throw new Error("无法创建结局图片画布");
        exportContext.drawImage(capturedImage, 0, 0);
        const exportScale = capturedImage.naturalWidth / exportWidth;
        exportContext.fillStyle = textPrimary;
        exportContext.textAlign = "center";
        exportContext.textBaseline = "middle";
        exportNameSlots.forEach((slot) => {
          const fontSize = slot.kind === "header" ? 14 : 24;
          const fontWeight = slot.kind === "header" ? 600 : 700;
          exportContext.font = `${fontWeight} ${fontSize * exportScale}px Arial, "Microsoft YaHei", sans-serif`;
          exportContext.fillText(
            shareName,
            (slot.left + slot.width / 2) * exportScale,
            (slot.top + slot.height / 2) * exportScale,
            slot.width * exportScale,
          );
        });
        const dataUrl = exportCanvas.toDataURL("image/png");
        const imageBlob = await (await fetch(dataUrl)).blob();
        const fileName = `${finalEnding.title}-结局长图.png`;
        const imageFile = new File([imageBlob], fileName, { type: "image/png" });

        const shouldUseNativeShare = window.matchMedia("(pointer: coarse)").matches;
        if (
          shouldUseNativeShare &&
          typeof navigator.share === "function" &&
          typeof navigator.canShare === "function" &&
          navigator.canShare({ files: [imageFile] })
        ) {
          await navigator.share({
            title: "我是一个“建”人｜我的结局",
            text: shareText,
            files: [imageFile],
          });
          setShareFeedback("结局长图已分享");
          return;
        }

        const downloadLink = document.createElement("a");
        downloadLink.href = dataUrl;
        downloadLink.download = fileName;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        downloadLink.remove();
        setShareFeedback("结局长图已下载，可以直接发送给朋友");
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          setShareFeedback("已取消分享，长图未发送");
          return;
        }
        console.error("生成结局长图失败", error);
        setShareFeedback("长图生成失败，请稍后重试");
      } finally {
        setIsExportingEnding(false);
      }
    };


    return (
      <div style={endingPageStyle} className="flex flex-col items-center min-h-screen px-6 py-16">
        <LocalSaveSettings
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          slots={localSaveSlots}
          feedback={localSaveFeedback}
          canSave={phase !== "intro"}
          onSave={saveLocalGame}
          onLoad={loadLocalGame}
          onDelete={deleteLocalSave}
          onRestart={resetGame}
        />
        <div className="max-w-2xl w-full">
          {isResumeOpen && character && (
            <ResumeView
              character={character}
              stats={stats}
              pastInternships={pastInternships}
              onUpdateInternshipDetails={updateInternshipDetails}
              onClose={() => setIsResumeOpen(false)}
            />
          )}
          <div ref={endingExportRef} data-ending-export="true">
          <div
            className="mb-4 text-[13px] uppercase tracking-[0.3em]"
            style={{ color: textSecondary, fontFamily: "Arial, 'Microsoft YaHei', sans-serif" }}
          >
            三年结束 · {isExportingEnding ? (
              <span
                data-export-name-slot="header"
                aria-hidden="true"
                className="mx-1 inline-block h-5 align-middle"
                style={{ width: `${shareNameSlotWidth}px` }}
              />
            ) : (
              <span style={{ color: textPrimary, fontWeight: 600 }}>{shareName}</span>
            )} 的最终结局
          </div>

          {/* 结局卡 */}
          <div
            className="rounded-2xl p-8 mb-8"
            style={{ background: `linear-gradient(145deg, ${finalEnding.color}12, rgba(5,8,20,0.86))`, border: `1px solid ${finalEnding.color}38`, backdropFilter: "blur(16px)", boxShadow: "0 22px 70px rgba(0,0,0,0.28)" }}
          >
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg mb-4 text-[12px] tracking-widest uppercase"
              style={{ background: `${finalEnding.color}15`, color: finalEnding.color }}
            >
              <BookOpen size={11} /> 你的结局
            </div>
            <h1
              className="text-4xl mb-2"
              style={{ color: finalEnding.color, fontFamily: "'Playfair Display', 'Noto Serif SC', serif" }}
            >
              {finalEnding.title}
            </h1>
            <p className="text-[15px] mb-6" style={{ color: textSecondary }}>
              {finalEnding.subtitle}
            </p>
            
            {/* 动态显示获得的 Offer 公司名称 */}
            {selectedOfferId && qualified.find(c => c.id === selectedOfferId) && (
              <div className="mb-6 p-4 rounded-xl flex items-center gap-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <span className="text-[24px]">🎉</span>
                <div>
                  <p className="text-[12px] opacity-60 mb-0.5">即将入职</p>
                  <p className="text-[18px] font-bold text-white font-serif">
                    {qualified.find(c => c.id === selectedOfferId)?.name}
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {finalEnding.description.split("\n\n").map((p, i) => (
                <p key={i} className="text-[15px] leading-relaxed" style={{ color: "rgba(210,225,255,0.8)", fontFamily: "'Noto Serif SC', serif" }}>
                  {p}
                </p>
              ))}
            </div>

            {/* 全服统计 */}
            {globalEndingStats && globalEndingStats.total > 0 && (
               <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-[12px]" style={{ color: textSecondary }}>
                 <span>全服达成次数：{globalEndingStats.sameEndingCount}</span>
                 <span>全服占比：{((globalEndingStats.sameEndingCount / globalEndingStats.total) * 100).toFixed(1)}%</span>
               </div>
            )}
          </div>


          {/* ── 生涯履历（整合了属性、教育、实习） ── */}
          <div className="rounded-2xl p-6 mb-8" style={{ background: card, border: `1px solid ${border}` }}>
            <p className="text-[13px] tracking-[0.2em] uppercase mb-2 text-center" style={{ color: accent }}>
              GRADUATE RECORD · 生涯履历
            </p>
            <div
              className="mb-6 flex min-h-9 items-center justify-center text-center text-[24px] font-semibold"
              style={{ color: textPrimary, fontFamily: "Arial, 'Microsoft YaHei', sans-serif" }}
            >
              {isExportingEnding ? (
                <span
                  data-export-name-slot="record"
                  aria-hidden="true"
                  className="inline-block h-9"
                  style={{ width: `${shareNameSlotWidth * 2}px`, maxWidth: "100%" }}
                />
              ) : (
                shareName
              )}
            </div>

            {/* 1. 教育背景 */}
            <div className="mb-8 pb-8 border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
              <p className="text-[12px] tracking-widest uppercase mb-4" style={{ color: textSecondary }}>教育背景</p>
              <div className="flex flex-col sm:flex-row gap-8">
                <div>
                  <p className="text-[13px] mb-1.5" style={{ color: textSecondary }}>本科</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[16px] leading-tight">{character.undergradSchool}</span>
                    <span className="text-[11px] px-1.5 py-0.5 rounded leading-none shrink-0" style={{ background: `${TIER_COLORS[character.undergradTier]}20`, color: TIER_COLORS[character.undergradTier] }}>
                      {TIER_LABELS[character.undergradTier]}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-[13px] mb-1.5" style={{ color: textSecondary }}>硕士</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[16px] leading-tight">{character.masterSchool}</span>
                    {character.isOverseas ? (
                      <span className="text-[11px] px-1.5 py-0.5 rounded leading-none shrink-0" style={{ background: "#4a9eff20", color: "#4a9eff" }}>海外留学</span>
                    ) : (
                      <span className="text-[11px] px-1.5 py-0.5 rounded leading-none shrink-0" style={{ background: `${TIER_COLORS[character.masterTier]}20`, color: TIER_COLORS[character.masterTier] }}>
                        {TIER_LABELS[character.masterTier]}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 2. 最终属性 */}
            <div className="mb-8 pb-8 border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
              <p className="text-[12px] tracking-widest uppercase mb-4" style={{ color: textSecondary }}>最终属性</p>
              <div className="grid grid-cols-2 gap-x-8 gap-y-1">
                {(["logic", "expression", "english", "structured", "stress", "money"] as StatKey[]).map((k) => (
                  <StatBar key={k} statKey={k} value={stats[k]} />
                ))}
              </div>
            </div>

            {/* 3. 实习经历 */}
            <div>
              <p className="text-[12px] tracking-widest uppercase mb-4" style={{ color: textSecondary }}>实习经历</p>
              {pastInternships.length === 0 ? (
                <div className="py-4 text-center rounded-lg" style={{ background: "rgba(255,255,255,0.02)" }}>
                  <p className="text-[13px] opacity-50">无实习经历</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {[...pastInternships].reverse().map((internship, idx) => (
                    <div key={`${internship.id}-${idx}`} className="flex flex-col gap-2">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1">
                        <div>
                          <h4 className="text-[15px] text-white font-medium">{internship.companyName}</h4>
                          <p className="text-[13px]" style={{ color: textSecondary }}>{internship.title}</p>
                        </div>
                        <span className="text-[12px] tabular-nums mt-1 sm:mt-0" style={{ color: accent }}>
                          {internship.stipend.split(' · ')[0]}
                        </span>
                      </div>
                      <EditableInternshipDetails internship={internship} onSave={updateInternshipDetails} />

                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {isExportingEnding && (
            <div
              className="mt-8 flex items-center justify-between gap-6 rounded-2xl p-6"
              style={{ background: "rgba(5,8,20,0.9)", border: "1px solid rgba(201,168,76,0.32)" }}
            >
              <div className="min-w-0">
                <p className="text-[11px] tracking-[0.24em]" style={{ color: accent }}>ARCH CAREER SIMULATOR</p>
                <p className="mt-2 text-[22px] font-semibold" style={{ color: textPrimary, fontFamily: "'Noto Serif SC', serif" }}>扫码开启你的建筑转行人生</p>
                <p className="mt-2 text-[13px] leading-relaxed" style={{ color: textSecondary }}>进入《我是一个“建”人》，看看三年后的你会走向哪一种结局。</p>
              </div>
              <div className="shrink-0 rounded-xl bg-white p-2">
                <img src="/assets/visuals/share/game-qr.png" alt="游戏二维码" className="h-28 w-28" />
              </div>
            </div>
          )}
          </div>

          <section
            data-export-hidden="true"
            className="mb-8 overflow-hidden rounded-2xl"
            style={{ background: "rgba(5,10,24,0.92)", border: `1px solid ${border}`, backdropFilter: "blur(14px)" }}
          >
            <button
              type="button"
              onClick={toggleGlobalDistribution}
              aria-expanded={isDistributionOpen}
              aria-controls="global-ending-distribution"
              className="flex w-full items-center gap-4 p-5 text-left outline-none transition-colors hover:bg-white/[0.035] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#c9a84c]/50"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#c9a84c]/20 bg-[#c9a84c]/10 text-[#dec678]">
                <TrendingUp size={18} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[16px] font-semibold text-slate-100">查看全部结局与 Offer 分布</span>
                <span className="mt-1 block text-[11px] text-slate-500">基于全服已提交的通关记录 · 不会进入分享图</span>
              </span>
              <ChevronDown className={`shrink-0 text-slate-500 transition-transform duration-200 ${isDistributionOpen ? "rotate-180" : ""}`} size={18} />
            </button>

            {isDistributionOpen && (
              <div id="global-ending-distribution" className="border-t border-white/10 p-5">
                {distributionLoading && (
                  <div className="flex items-center justify-center gap-2 py-10 text-[13px] text-slate-400">
                    <RefreshCw size={15} className="animate-spin" />正在读取全服统计…
                  </div>
                )}
                {distributionError && !distributionLoading && (
                  <div className="rounded-xl border border-red-400/15 bg-red-400/[0.06] p-4 text-center">
                    <p className="text-[13px] text-red-300">{distributionError}</p>
                    <button type="button" onClick={() => { setGlobalDistribution(null); void loadGlobalDistribution(); }} className="mt-3 rounded-lg border border-red-300/20 px-3 py-1.5 text-[12px] text-red-200 hover:bg-red-300/10">重新加载</button>
                  </div>
                )}
                {globalDistribution && !distributionLoading && (
                  <div className="space-y-8">
                    <div>
                      <div className="mb-4 flex items-end justify-between gap-4">
                        <div><p className="text-[11px] uppercase tracking-[0.2em] text-[#c9a84c]">ENDING ATLAS</p><h3 className="mt-1 text-[17px] font-semibold text-slate-100">全部结局达成占比</h3></div>
                        <span className="text-[11px] tabular-nums text-slate-500">{globalDistribution.total} 次通关</span>
                      </div>
                      <div className="space-y-3">
                        {endingDistributionRows.map((item) => {
                          const percentage = globalDistribution.total > 0 ? item.count / globalDistribution.total * 100 : 0;
                          const current = item.title === finalEnding.title;
                          return (
                            <div key={item.title} className={`rounded-lg px-3 py-2.5 ${current ? "bg-white/[0.055] ring-1 ring-inset ring-white/10" : ""}`}>
                              <div className="mb-1.5 flex items-center gap-2 text-[12px]">
                                <span className="h-1.5 w-1.5 rounded-full" style={{ background: item.color }} />
                                <span className={current ? "font-semibold text-slate-100" : "text-slate-300"}>{item.title}</span>
                                {current && <span className="rounded bg-[#c9a84c]/10 px-1.5 py-0.5 text-[9px] text-[#dec678]">你的结局</span>}
                                <span className="ml-auto tabular-nums text-slate-500">{item.count} 次 · {percentage.toFixed(1)}%</span>
                              </div>
                              <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]"><div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.max(percentage > 0 ? 0.8 : 0, percentage)}%`, background: item.color }} /></div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="border-t border-white/10 pt-7">
                      <div className="mb-4 flex items-end justify-between gap-4">
                        <div><p className="text-[11px] uppercase tracking-[0.2em] text-[#c9a84c]">OFFER DESTINATIONS</p><h3 className="mt-1 text-[17px] font-semibold text-slate-100">Offer 类别与公司占比</h3></div>
                        <span className="text-[11px] tabular-nums text-slate-500">{totalOfferCount} 份 Offer</span>
                      </div>
                      {totalOfferCount > 0 ? (
                        <div className="grid items-start gap-3 xl:grid-cols-2">
                          {offerLevelRows.map((group) => {
                            const levelOpen = expandedOfferLevels.has(group.level);
                            const categoryPercentage = group.count / totalOfferCount * 100;
                            return (
                              <div key={group.level} className="overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.02]">
                                <button type="button" onClick={() => toggleOfferLevel(group.level)} aria-expanded={levelOpen} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.035]">
                                  <span className="h-2 w-2 rounded-full" style={{ background: group.color }} />
                                  <span className="text-[13px] font-medium text-slate-200">{group.level}</span>
                                  <span className="ml-auto text-[11px] tabular-nums text-slate-500">{group.count} 份 · {categoryPercentage.toFixed(1)}% 的 Offer</span>
                                  <ChevronDown size={14} className={`text-slate-600 transition-transform ${levelOpen ? "rotate-180" : ""}`} />
                                </button>
                                {levelOpen && (
                                  <div className="space-y-2 border-t border-white/[0.07] px-4 py-3">
                                    {group.companies.map((company) => {
                                      const withinCategory = group.count > 0 ? company.count / group.count * 100 : 0;
                                      const overall = globalDistribution.total > 0 ? company.count / globalDistribution.total * 100 : 0;
                                      return (
                                        <div key={company.name} className="border-b border-white/[0.045] pb-2.5 text-[11px] last:border-0 last:pb-0">
                                          <div className="mb-1.5 flex min-w-0 items-center gap-3">
                                            <span className={`min-w-0 flex-1 truncate ${company.name === selectedCompany?.name ? "font-semibold text-[#dec678]" : "text-slate-400"}`} title={company.name}>
                                              {company.name}
                                            </span>
                                            <span className="shrink-0 tabular-nums text-slate-500">{company.count} 份</span>
                                          </div>
                                          <div className="flex min-w-0 items-center gap-3">
                                            <div className="h-1.5 min-w-12 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                                              <div className="h-full rounded-full" style={{ width: `${withinCategory}%`, background: group.color }} />
                                            </div>
                                            <span className="shrink-0 whitespace-nowrap tabular-nums text-slate-500">
                                              类内 {withinCategory.toFixed(1)}% · 全服 {overall.toFixed(1)}%
                                            </span>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 text-center text-[13px] text-slate-500">尚无 Offer 去向数据</p>
                      )}
                    </div>
                    <p className="text-[10px] leading-relaxed text-slate-600">占比按已提交的通关记录计算；公司“类内占比”以该类别全部 Offer 为分母，“全服占比”以全部通关次数为分母。</p>
                  </div>
                )}
              </div>
            )}
          </section>

          <div className="mb-8">
            <button
              type="button"
              onClick={handleShareEnding}
              disabled={isExportingEnding}
              className="flex w-full items-center justify-center gap-2 rounded-xl py-4 text-[15px] font-semibold transition-all hover:-translate-y-0.5 hover:opacity-95 disabled:cursor-wait disabled:opacity-70"
              style={{ background: finalEnding.color, color: "#07101d", boxShadow: `0 12px 30px ${finalEnding.color}20` }}
            >
              {isExportingEnding ? <RefreshCw size={17} className="animate-spin" /> : <Share2 size={17} />}
              {isExportingEnding ? "正在生成结局长图…" : "导出并分享结局长图"}
            </button>
            {shareFeedback && <p className="mt-2 text-center text-[12px]" style={{ color: textSecondary }} aria-live="polite">{shareFeedback}</p>}
          </div>

          {/* 删除了最终选 offer 的环节，因为在之前已经选过了 */}

          <button
            onClick={resetGame}
            className="w-full py-4 rounded-xl text-[15px] transition-all hover:opacity-90 flex items-center justify-center gap-2"
            style={{ background: "rgba(74,158,255,0.12)", color: accent, border: `1px solid rgba(74,158,255,0.25)` }}
          >
            <RefreshCw size={15} /> 重新开始
          </button>

          <a
            href="https://v.wjx.cn/vm/OMZxZN6.aspx#"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full mt-4 py-3 rounded-xl text-[14px] transition-all hover:opacity-80 flex items-center justify-center gap-2"
            style={{ background: "transparent", color: textSecondary, border: `1px dashed ${textSecondary}` }}
          >
            📝 填写反馈问卷，帮助我们优化游戏
          </a>
          <AIAssistant gameContext={{ character, stats, mentor, semester, phase, ending }} />
        </div>
      </div>
    );
  }

  return null;
}
