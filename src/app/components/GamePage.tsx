import { useState, useCallback, useEffect, type CSSProperties } from "react";
import { RefreshCw, ChevronRight, Zap, TrendingUp, TrendingDown, BookOpen, TriangleAlert } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { AIAssistant } from "./AIAssistant";

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
    description: "大量投递简历，提升表达力与人脉，但面临被拒的心理压力",
    effects: { expression: 5, network: 5, selfDoubt: -4, money: 3, mentorFavorability: [-10, -5] },
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
];

// ================================================================
// SECTION 4.5: 校园宣讲/特招弹窗事件 (独立于主回合事件外)
// ================================================================

const CAMPUS_EVENTS: CampusEvent[] = [
  {
    id: "ce01",
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

function generateCharacter(): { character: CharacterInfo; stats: Stats } {
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

  return { character: { undergradTier, undergradSchool, masterTier, masterSchool, isOverseas }, stats };
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

function getRandomEvent(
  seenIds: Set<string>,
  ctx: { stats: Stats; isOverseas: boolean; semester: number }
): GameEvent | null {
  const available = EVENTS.filter((e) => {
    if (seenIds.has(e.id)) return false;
    if (e.condition && !e.condition(ctx)) return false;
    return true;
  });
  if (available.length === 0) return null;
  return pick(available);
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

  google: { salary: "50k+·14（月）", perks: "全球团队 · 丰厚股票 · 无限零食", level: "外企" },
  microsoft: { salary: "45k·14（月）", perks: "混合办公 · 学习预算 · 购股计划", level: "外企" },
  amazon: { salary: "42k·14（月）", perks: "签字奖金 · 股票奖励 · 国际轮岗", level: "外企" },
  meta: { salary: "48k·14（月）", perks: "远程优先 · 顶级设备 · 丰富假期", level: "外企" },
  apple: { salary: "55k·14（月）", perks: "硬件内购 · 设计文化 · 全球项目", level: "外企" },

  mckinsey: { salary: "45k·16（月）", perks: "全球项目 · 海外出差 · 高强度培养", level: "咨询" },
  bcg: { salary: "43k·16（月）", perks: "快速晋升 · 行业视野 · 项目奖金", level: "咨询" },
  bain: { salary: "42k·16（月）", perks: "导师一对一 · 体系化培训 · 团队文化", level: "咨询" },

  netease: { salary: "21k·14（月）", perks: "下午茶 · 音乐氛围 · 相对稳定", level: "中厂" },
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

// 简化的实习机会（根据当前能力值筛选）
interface InternshipOption {
  id: string;
  title: string;
  companyName: string;
  stipend: string;
  description: string;
  minLogic: number;
  minExpression: number;
  detailedAchievements?: string[]; // 新增：用于结局页展示的具体工作成就
}

const INTERNSHIP_OPTIONS: InternshipOption[] = [
  {
    id: "intern_tencent",
    title: "产品策划实习生",
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
    title: "助教实习生",
    companyName: "大轩保研机构",
    stipend: "130 元/天 · 课时费",
    description: "协助老师批改作业，解答学生疑问，需要基础学科知识。",
    minLogic: 40,
    minExpression: 45,
    detailedAchievements: [
      "负责《建筑历史》课程作业批改与答疑，学员满意度95%。",
      "整理考研真题资料库，编写历年真题解析讲义。",
    ],
  },
  {
    id: "intern_boss",
    title: "产品助理",
    companyName: "Boss直聘",
    stipend: "250 元/天 · 导师带教",
    description: "协助产品经理进行需求调研和数据整理，参与日常的立项会议。",
    minLogic: 40,
    minExpression: 40,
  },
  {
    id: "intern_fanka",
    title: "内容审核实习生",
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
];

function getAvailableInternships(stats: Stats): InternshipOption[] {
  const available = INTERNSHIP_OPTIONS.filter(
    (opt) => stats.logic >= opt.minLogic && stats.expression >= opt.minExpression
  );

  // 随机打乱满足门槛的实习机会，增加每次“投简历”的随机体验
  for (let i = available.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [available[i], available[j]] = [available[j], available[i]];
  }

  // 界面最多展示3个
  return available.slice(0, 3);
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

function ResumeView({
  character,
  stats,
  pastInternships,
  onClose,
}: {
  character: CharacterInfo;
  stats: Stats;
  pastInternships: InternshipOption[];
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
                <div key={idx} className="pb-4 border-b last:border-0 last:pb-0" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="text-[18px] text-white" style={{ fontFamily: "'Noto Serif SC', serif" }}>{internship.companyName}</h4>
                    <span className="text-[13px]" style={{ color: accent }}>{internship.stipend.split(' · ')[0]}</span>
                  </div>
                  <p className="text-[14px] mb-2" style={{ color: "rgba(180,200,240,0.85)" }}>
                    {internship.title}
                  </p>
                  <p className="text-[13px] leading-relaxed" style={{ color: textSecondary }}>
                    {internship.description}
                  </p>
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

interface Mentor {
  id: string;
  name: string;
  title: string;
  description: string;
  bonuses: Partial<Record<StatKey, EffectValue>>;
  emoji: string;
}

const MENTORS: Mentor[] = [
  {
    id: "academic",
    name: "学术大牛",
    title: "国家级重点课题负责人",
    description: "专注学术深度与专业度，对图纸质量要求极高。能显著提升你的建筑底蕴，但由于其严苛性格，初始好感度较低且学术压力巨大。",
    emoji: "🏛️",
    bonuses: { arch: 15, logic: 5, stress: -10, mentorFavorability: -10 },
  },
  {
    id: "hands_off",
    name: "放养型导师",
    title: "自由主义学术推崇者",
    description: "很少管学生，给了你极大的自我探索空间。适合发展人脉与逻辑思维，环境宽松，压力极小，但也需要你更自律地维持专业输出。",
    emoji: "🪁",
    bonuses: { network: 10, logic: 10, stress: 10, arch: -5 },
  },
  {
    id: "practice",
    name: "实践工程型",
    title: "大型院总建筑师/合伙人",
    description: "手头有大量落地的公建项目，极其关注就业与实务能力。能帮你积累丰厚的行业资源与执行力，有效缓解转行的不确定感。",
    emoji: "🏗️",
    bonuses: { structured: 12, money: 15, arch: 5, selfDoubt: -10 },
  },
  {
    id: "overseas",
    name: "海龟青年学者",
    title: "普林斯顿/AA 优秀归国博士",
    description: "带有鲜明的国际视野，关注叙事表达与跨学科研究。能极大提升你的英语水平与表达逻辑，并利用其海外背景缓解你的年龄焦虑。",
    emoji: "✈️",
    bonuses: { english: 15, expression: 12, network: 5, ageAnxiety: -5 },
  },
];

type GamePhase =
  | "intro"
  | "chargen"
  | "mentor_choice"
  | "event_view"
  | "action_choice"
  | "action_result"
  | "offer_choice"
  | "ending";

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

  // 新增状态
  const [pastInternships, setPastInternships] = useState<InternshipOption[]>([]);
  const [currentOfferedInternships, setCurrentOfferedInternships] = useState<InternshipOption[]>([]);
  const [offerBuffs, setOfferBuffs] = useState<Record<string, number>>({});
  const [isResumeOpen, setIsResumeOpen] = useState(false);
  const [receivedOffers, setReceivedOffers] = useState<Company[] | null>(null);

  // Supabase 统计状态
  const [globalEndingStats, setGlobalEndingStats] = useState<{ total: number; sameEndingCount: number } | null>(null);
  const [hasSubmittedResult, setHasSubmittedResult] = useState(false);

  // ── 存档/读档逻辑 ──
  const STORAGE_KEY = "archGameSave_v1";

  // 自动保存
  useEffect(() => {
    // 只有在非 intro 阶段才保存，避免覆盖存档为初始状态
    if (phase === "intro") return;

    const gameState = {
      phase, character, stats, mentor, semester, round,
      currentEvent, activeCampusEvent, campusEventResult,
      seenEventIds: Array.from(seenEventIds),
      seenCampusIds: Array.from(seenCampusIds),
      chosenAction, actionDelta, eventDelta, ending,
      actionNarrative, selectedOfferId, selectedInternshipId,
      showTutorial, tutorialStep,
      pastInternships, currentOfferedInternships, offerBuffs,
      isResumeOpen, receivedOffers,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(gameState));
  }, [
    phase, character, stats, mentor, semester, round,
    currentEvent, activeCampusEvent, campusEventResult,
    seenEventIds, seenCampusIds,
    chosenAction, actionDelta, eventDelta, ending,
    actionNarrative, selectedOfferId, selectedInternshipId,
    showTutorial, tutorialStep,
    pastInternships, currentOfferedInternships, offerBuffs,
    isResumeOpen, receivedOffers
  ]);

  // 初始加载
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.phase && data.phase !== "intro") {
          setPhase(data.phase);
          if (data.character) setCharacter(data.character);
          if (data.stats) setStats(data.stats);
          if (data.mentor) setMentor(data.mentor);
          if (data.semester) setSemester(data.semester);
          if (data.round) setRound(data.round);
          if (data.currentEvent) setCurrentEvent(data.currentEvent);
          if (data.activeCampusEvent) setActiveCampusEvent(data.activeCampusEvent);
          if (data.campusEventResult) setCampusEventResult(data.campusEventResult);
          if (data.seenEventIds) setSeenEventIds(new Set(data.seenEventIds));
          if (data.seenCampusIds) setSeenCampusIds(new Set(data.seenCampusIds));
          if (data.chosenAction) setChosenAction(data.chosenAction);
          if (data.actionDelta) setActionDelta(data.actionDelta);
          if (data.eventDelta) setEventDelta(data.eventDelta);
          if (data.ending) setEnding(data.ending);
          if (data.actionNarrative) setActionNarrative(data.actionNarrative);
          if (data.selectedOfferId) setSelectedOfferId(data.selectedOfferId);
          if (data.selectedInternshipId) setSelectedInternshipId(data.selectedInternshipId);
          if (data.showTutorial !== undefined) setShowTutorial(data.showTutorial);
          if (data.tutorialStep !== undefined) setTutorialStep(data.tutorialStep);
          if (data.pastInternships) setPastInternships(data.pastInternships);
          if (data.currentOfferedInternships) setCurrentOfferedInternships(data.currentOfferedInternships);
          if (data.offerBuffs) setOfferBuffs(data.offerBuffs);
          if (data.isResumeOpen !== undefined) setIsResumeOpen(data.isResumeOpen);
          if (data.receivedOffers) setReceivedOffers(data.receivedOffers);
        }
      } catch (e) {
        console.error("Failed to load save game", e);
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

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

  // 开始游戏：生成角色
  const startGame = useCallback(() => {
    const { character: c, stats: s } = generateCharacter();
    setCharacter(c);
    setStats(s);
    setSemester(1);
    setRound(1);
    setSeenEventIds(new Set());
    setSeenCampusIds(new Set());
    setPhase("chargen");
  }, []);

  const confirmCharacter = useCallback(() => {
    setPhase("mentor_choice");
  }, []);

  const maybeShowEvent = useCallback(
    (currentStats: Stats, sem: number, seen: Set<string>) => {
      const hasEvent = Math.random() < 0.45;
      if (!hasEvent) {
        setPhase("action_choice");
        return;
      }
      const availableEvents = EVENTS.filter(
        (e) => !seen.has(e.id) && (!e.condition || e.condition({ stats: currentStats, isOverseas: character?.isOverseas || false, semester: sem }))
      );
      if (availableEvents.length === 0) {
        setPhase("action_choice");
      } else {
        const ev = pick(availableEvents);
        setCurrentEvent(ev);
        setPhase("event_view");
      }
    },
    [character]
  );

  const selectMentor = useCallback(
    (m: Mentor) => {
      if (!stats) return;
      setMentor(m);
      const { newStats } = applyEffects(stats, m.bonuses);
      setStats(newStats);
      maybeShowEvent(newStats, 1, new Set());
      setShowTutorial(true);
    },
    [stats, maybeShowEvent]
  );

  // 角色确认后，进入第一回合（先判断事件）
  const beginFirstRound = useCallback(() => {
    if (!character || !stats) return;
    maybeShowEvent(stats, 1, new Set());
  }, [character, stats, maybeShowEvent]);

  // 玩家确认事件后
  const acknowledgeEvent = useCallback(() => {
    if (!currentEvent || !stats) return;
    const newSeen = new Set(seenEventIds);
    newSeen.add(currentEvent.id);
    setSeenEventIds(newSeen);

    const { newStats, delta } = applyEffects(stats, currentEvent.effects);
    setStats(newStats);
    setEventDelta(delta);

    // 处理特殊事件带来的名牌厂buff
    if (currentEvent.id === "e45") {
      setOfferBuffs(prev => ({ ...prev, tencent: (prev.tencent || 0) + 15, bytedance: (prev.bytedance || 0) + 15 }));
    } else if (currentEvent.id === "e46") {
      setOfferBuffs(prev => ({ ...prev, xiaohongshu: (prev.xiaohongshu || 0) + 20, bilibili: (prev.bilibili || 0) + 20 }));
    } else if (currentEvent.id === "e47") {
      setOfferBuffs(prev => ({ ...prev, google: (prev.google || 0) + 20, microsoft: (prev.microsoft || 0) + 20 }));
    }

    setPhase("action_choice");
  }, [currentEvent, stats, seenEventIds]);

  // 玩家选择行动
  const chooseAction = useCallback(
    (action: Action) => {
      if (!stats) return;
      const { newStats, delta } = applyEffects(stats, action.effects);
      setStats(newStats);
      setChosenAction(action);
      setActionDelta(delta);
      setActionNarrative(pick(action.narratives));

      if (action.id === "internship") {
        setCurrentOfferedInternships(getAvailableInternships(newStats));
      } else {
        setCurrentOfferedInternships([]);
      }

      setPhase("action_result");
    },
    [stats]
  );

  // 进入下一回合 / 或进入最终 offer 选择阶段
  const nextRound = useCallback(() => {
    if (!stats) return;

    // 记录上一回合选择的实习
    if (selectedInternshipId) {
      // 重新从最新的 INTERNSHIP_OPTIONS 中查找，以确保获取到 detailedAchievements
      const internship = INTERNSHIP_OPTIONS.find(o => o.id === selectedInternshipId);
      if (internship) {
        setPastInternships(prev => [...prev, internship]);
      }
    }

    setEventDelta({});
    setActionDelta({});
    setChosenAction(null);
    setCurrentEvent(null);
    setSelectedInternshipId(null);
    setCurrentOfferedInternships([]);

    const totalRound = (semester - 1) * 4 + round;

    // 1. 被动增加年龄焦虑 (0-5点)
    const { newStats: statsAfterPassive } = applyEffects(stats, { ageAnxiety: [0, 5] });
    setStats(statsAfterPassive);

    if (statsAfterPassive.mentorFavorability <= 0) {
      const expelledEnding = ENDINGS.find(e => e.id === "expelled");
      if (expelledEnding) setEnding(expelledEnding);
      setPhase("ending");
      return;
    }

    if (statsAfterPassive.selfDoubt >= 100) {
      const selfDoubtEnding = ENDINGS.find(e => e.id === "self_doubt_quit");
      if (selfDoubtEnding) setEnding(selfDoubtEnding);
      setPhase("ending");
      return;
    }

    if (statsAfterPassive.ageAnxiety >= 100) {
      const ageAnxietyEnding = ENDINGS.find(e => e.id === "age_anxiety_pivot");
      if (ageAnxietyEnding) setEnding(ageAnxietyEnding);
      setPhase("ending");
      return;
    }

    if (statsAfterPassive.stress <= 0) {
      const stressEnding = ENDINGS.find(e => e.id === "stress_breakdown");
      if (stressEnding) setEnding(stressEnding);
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
    if (nextRd > 4) { nextRd = 1; nextSem = semester + 1; }
    setSemester(nextSem);
    setRound(nextRd);

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
  }, [stats, semester, round, seenEventIds, seenCampusIds, maybeShowEvent, selectedInternshipId]);

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
    localStorage.removeItem(STORAGE_KEY);
    setPhase("intro");
    setCharacter(null);
    setStats(null);
    setEnding(null);
    setSelectedOfferId(null);
    setSelectedInternshipId(null);
    setEventDelta({});
    setActionDelta({});
    setChosenAction(null);
    setCurrentEvent(null);
    setSeenEventIds(new Set());
    setSeenCampusIds(new Set());
    setPastInternships([]);
    setCurrentOfferedInternships([]);
    setOfferBuffs({});
    setReceivedOffers(null);
    setActiveCampusEvent(null);
    setCampusEventResult(null);
    setGlobalEndingStats(null);
    setHasSubmittedResult(false);
    setTutorialStep(0);
  }, []);

  // ── 渲染：进度显示
  const totalRound = (semester - 1) * 4 + round;
  const progressPct = Math.round((totalRound / 24) * 100);

  // ── 渲染：公司达标情况（结局页用）
  const qualifiedCompanies = stats ? checkQualifiedCompanies(stats, offerBuffs, pastInternships) : [];

  // ================================================================
  // RENDER
  // ================================================================

  // 确保从最新的 EVENTS 数组中获取当前事件对象（包含 type 属性）
  // 解决 React 状态中可能存储了旧版事件对象导致 type 丢失的问题
  const displayEvent = currentEvent ? EVENTS.find(e => e.id === currentEvent.id) || currentEvent : null;

  // 样式变量（偏建筑学术风·玻璃质感）
  const bg =
    "radial-gradient(circle at top left, rgba(201,168,76,0.16), transparent 55%), radial-gradient(circle at bottom right, rgba(63,131,248,0.12), transparent 55%), #050814";
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
      <div style={pageStyle} className="flex flex-col items-center justify-center min-h-screen px-6 py-16">
        <div className="max-w-lg w-full text-center">
          <p className="text-[13px] tracking-[0.3em] uppercase mb-6" style={{ color: accent }}>
            ARCH·HISTORIA · 互动叙事
          </p>
          <h1
            className="text-5xl mb-4"
            style={{ color: textPrimary, fontFamily: "'Playfair Display', 'Noto Serif SC', serif", letterSpacing: "0.05em" }}
          >
            我是一个"建"人
          </h1>
          <p className="text-[16px] mb-10 leading-relaxed" style={{ color: textSecondary }}>
            你是一名建筑学硕士研究生。<br />
            行业下行，你决定转行互联网或外企。<br />
            三年，六学期，二十四个回合。<br />
            你的选择决定你的结局。
          </p>
          <div className="flex flex-col gap-3 mb-10 text-left">
            {[
              ["纯文字交互", "数值驱动叙事，类养成 + 随机事件"],
              ["11项属性值", "建筑专业力、逻辑力、导师好感度……"],
              ["52条随机事件", "导师压力、HR已读不回、海归竞争……"],
              ["40+真实实习+12种结局", "从大厂PM到被退学，由你的选择决定"],
            ].map(([title, desc]) => (
              <div
                key={title}
                className="flex items-start gap-3 px-4 py-3 rounded-xl"
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
          <button
            onClick={startGame}
            className="w-full py-4 rounded-xl text-[16px] transition-all duration-200 hover:opacity-90 active:scale-95"
            style={{ background: accent, color: "#070d1c" }}
          >
            开始游戏 →
          </button>
          <div className="flex flex-col items-center gap-1.5 mt-4 text-[12px]" style={{ color: "rgba(180,200,240,0.3)" }}>
             <p>建议使用电脑端浏览器体验以获得最佳效果</p>
             <p>本游戏纯属虚构，如有雷同，那可真是太巧了。</p>
          </div>
        </div>
      </div>
    );
  }

  // ── 角色生成页
  if (phase === "chargen" && character && stats) {
    return (
      <div style={pageStyle} className="flex flex-col items-center justify-center min-h-screen px-6 py-12">
        <div className="max-w-lg w-full">
          <p className="text-[13px] tracking-[0.3em] uppercase mb-6" style={{ color: accent }}>
            角色档案已生成
          </p>
          <h2
            className="text-3xl mb-2"
            style={{ fontFamily: "'Playfair Display', 'Noto Serif SC', serif" }}
          >
            你的起点
          </h2>
          <p className="text-[15px] mb-8" style={{ color: textSecondary }}>
            系统已为你随机生成背景与初始属性。
          </p>

          {/* 学校背景 */}
          <div className="rounded-2xl p-6 mb-6" style={{ background: card, border: `1px solid ${border}` }}>
            <p className="text-[12px] tracking-widest uppercase mb-4" style={{ color: textSecondary }}>
              教育背景
            </p>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[14px]" style={{ color: textSecondary }}>本科院校</span>
                <div className="text-right">
                  <span className="text-[15px]" style={{ color: textPrimary }}>{character.undergradSchool}</span>
                  <span
                    className="ml-2 text-[12px] px-2 py-0.5 rounded"
                    style={{ background: `${TIER_COLORS[character.undergradTier]}20`, color: TIER_COLORS[character.undergradTier] }}
                  >
                    {TIER_LABELS[character.undergradTier]}
                  </span>
                </div>
              </div>
              <div className="h-px" style={{ background: border }} />
              <div className="flex justify-between items-center">
                <span className="text-[14px]" style={{ color: textSecondary }}>硕士院校</span>
                <div className="text-right">
                  <span className="text-[15px]" style={{ color: textPrimary }}>{character.masterSchool}</span>
                  {character.isOverseas ? (
                    <span className="ml-2 text-[12px] px-2 py-0.5 rounded" style={{ background: "#4a9eff20", color: "#4a9eff" }}>
                      海外留学
                    </span>
                  ) : (
                    <span
                      className="ml-2 text-[12px] px-2 py-0.5 rounded"
                      style={{ background: `${TIER_COLORS[character.masterTier]}20`, color: TIER_COLORS[character.masterTier] }}
                    >
                      {TIER_LABELS[character.masterTier]}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 初始属性 */}
          <div className="rounded-2xl p-6 mb-6" style={{ background: card, border: `1px solid ${border}` }}>
            <p className="text-[12px] tracking-widest uppercase mb-4" style={{ color: textSecondary }}>
              初始属性
            </p>
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

          <button
            onClick={confirmCharacter}
            className="w-full py-3.5 rounded-xl text-[15px] transition-all hover:opacity-90"
            style={{ background: accent, color: "#070d1c" }}
          >
            就是这个背景，继续 →
          </button>
          <button
            onClick={startGame}
            className="w-full mt-2 py-3 rounded-xl text-[14px] transition-all hover:opacity-70 flex items-center justify-center gap-2"
            style={{ background: "transparent", color: textSecondary, border: `1px solid ${border}` }}
          >
            <RefreshCw size={12} /> 重新生成
          </button>
          <AIAssistant gameContext={{ character, stats, mentor, semester, phase, ending }} />
        </div>
      </div>
    );
  }

  // ── 导师选择页
  if (phase === "mentor_choice" && character && stats) {
    return (
      <div style={pageStyle} className="flex flex-col items-center justify-center min-h-screen px-6 py-12">
        <div className="max-w-4xl w-full">
          <p className="text-[13px] tracking-[0.3em] uppercase mb-6 text-center" style={{ color: accent }}>
            选择你的导师
          </p>
          <h2
            className="text-3xl mb-8 text-center"
            style={{ fontFamily: "'Playfair Display', 'Noto Serif SC', serif" }}
          >
            学术道路上的引路人
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {MENTORS.map((m) => (
              <div
                key={m.id}
                onClick={() => selectMentor(m)}
                className="group cursor-pointer rounded-2xl p-6 transition-all duration-300 hover:scale-[1.02]"
                style={{
                  background: card,
                  border: `1px solid ${border}`,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
                }}
              >
                <div className="flex items-center gap-4 mb-4">
                  <span className="text-3xl">{m.emoji}</span>
                  <div>
                    <h3 className="text-[18px] font-bold" style={{ color: textPrimary }}>{m.name}</h3>
                    <p className="text-[12px]" style={{ color: accent }}>{m.title}</p>
                  </div>
                </div>
                <p className="text-[14px] leading-relaxed mb-6" style={{ color: textSecondary }}>
                  {m.description}
                </p>
                <div className="grid grid-cols-2 gap-2 mt-auto">
                  {Object.entries(m.bonuses).map(([k, v]) => {
                    const key = k as StatKey;
                    const val = Array.isArray(v) ? v[0] : v;
                    return (
                      <div key={k} className="flex items-center gap-2">
                        <span className="text-[11px]" style={{ color: textSecondary }}>{STAT_META[key]?.label}</span>
                        <span className={`text-[12px] font-mono ${val > 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {val > 0 ? `+${val}` : val}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <AIAssistant gameContext={{ character, stats, mentor, semester, phase, ending }} />
        </div>
      </div>
    );
  }

  // ── 游戏主界面（event_view / action_choice / action_result）
  if ((phase === "event_view" || phase === "action_choice" || phase === "action_result") && character && stats) {
    return (
      <div style={pageStyle} className="flex flex-col lg:flex-row min-h-screen">
        {/* ── 新手引导弹窗 ── */}
        {showTutorial && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center px-6" style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}>
            <div className="max-w-md w-full rounded-2xl p-8 relative" style={{ background: card, border: `1px solid ${accent}` }}>
              
              {/* Step 0: 左侧属性 */}
              {tutorialStep === 0 && (
                <>
                  <div className="text-center mb-6">
                    <p className="text-[12px] tracking-widest uppercase mb-2" style={{ color: accent }}>
                      GUIDE 1/3
                    </p>
                    <h3 className="text-2xl font-bold text-white" style={{ fontFamily: "'Noto Serif SC', serif" }}>
                      关注你的核心数值
                    </h3>
                  </div>
                  
                  <div className="space-y-6 mb-8">
                    <div className="flex gap-4">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(74,158,255,0.1)", color: "#4a9eff" }}>
                        <TrendingUp size={20} />
                      </div>
                      <div>
                        <h4 className="text-[16px] font-bold text-white mb-1">左侧属性面板</h4>
                        <p className="text-[14px]" style={{ color: textSecondary }}>
                          逻辑、表达、英语等属性直接决定你能拿到什么等级的 Offer。请根据目标尽早规划加点。
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(239,83,80,0.1)", color: "#ef5350" }}>
                        <Zap size={20} />
                      </div>
                      <div>
                        <h4 className="text-[16px] font-bold text-white mb-1">压力与焦虑</h4>
                        <p className="text-[14px]" style={{ color: textSecondary }}>
                          压力过大会导致崩溃，焦虑过高会触发转行结局。请适时选择“摆烂”或“运动”来调整状态。
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(201,168,76,0.1)", color: accent }}>
                        <BookOpen size={20} />
                      </div>
                      <div>
                        <h4 className="text-[16px] font-bold text-white mb-1">导师好感度</h4>
                        <p className="text-[14px]" style={{ color: textSecondary }}>
                          千万别惹导师生气！好感度过低（&lt;0）会直接导致退学结局。送礼或完成课题可挽回。
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Step 1: 中间行动 */}
              {tutorialStep === 1 && (
                <>
                  <div className="text-center mb-6">
                    <p className="text-[12px] tracking-widest uppercase mb-2" style={{ color: accent }}>
                      GUIDE 2/3
                    </p>
                    <h3 className="text-2xl font-bold text-white" style={{ fontFamily: "'Noto Serif SC', serif" }}>
                      每回合一次行动
                    </h3>
                  </div>
                  <div className="space-y-6 mb-8 px-2">
                     <p className="text-[15px] leading-relaxed text-center" style={{ color: textSecondary }}>
                       中间区域是你的行动面板。你可以选择【改图】、【学产品】、【投实习】等行动。<br/><br/>
                       有些行动会消耗金钱，有些会增加压力。请根据你的目标（互联网/外企/深造）来平衡你的每一周。
                     </p>
                     <div className="p-4 rounded-xl text-center text-[13px]" style={{ background: "rgba(255,255,255,0.05)" }}>
                        💡 提示：偶尔会出现“随机事件”和“校园招聘”，那是改变命运的机会，不要错过！
                     </div>
                  </div>
                </>
              )}

              {/* Step 2: 右侧简历 */}
              {tutorialStep === 2 && (
                <>
                  <div className="text-center mb-6">
                    <p className="text-[12px] tracking-widest uppercase mb-2" style={{ color: accent }}>
                      GUIDE 3/3
                    </p>
                    <h3 className="text-2xl font-bold text-white" style={{ fontFamily: "'Noto Serif SC', serif" }}>
                      丰富你的简历
                    </h3>
                  </div>
                  <div className="space-y-6 mb-8 px-2">
                     <p className="text-[15px] leading-relaxed text-center" style={{ color: textSecondary }}>
                       右侧面板展示了你的【教育背景】和【实习经历】。<br/><br/>
                       当你成功完成实习或特殊事件时，简历会自动更新。一份漂亮的简历是你拿到大厂 Offer 的敲门砖。
                     </p>
                     <div className="p-4 rounded-xl text-center text-[13px]" style={{ background: "rgba(255,255,255,0.05)" }}>
                        📄 你的目标：在24个回合结束前，打造一份完美的简历。
                     </div>
                  </div>
                </>
              )}
              
              <div className="flex flex-col gap-3">
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowTutorial(false)}
                    className="flex-1 py-3 rounded-xl text-[14px] transition-all hover:bg-white/5"
                    style={{ border: `1px solid rgba(255,255,255,0.1)`, color: textSecondary }}
                  >
                    跳过引导
                  </button>
                  <button
                    onClick={() => {
                      if (tutorialStep < 2) {
                        setTutorialStep(s => s + 1);
                      } else {
                        setShowTutorial(false);
                      }
                    }}
                    className="flex-1 py-3 rounded-xl text-[14px] font-bold transition-all hover:opacity-90"
                    style={{ background: accent, color: "#070d1c" }}
                  >
                    {tutorialStep < 2 ? "下一步 →" : "开始游戏"}
                  </button>
                </div>
                
                {tutorialStep === 1 && (
                  <a
                    href="https://v.wjx.cn/vm/YDzWe08.aspx#"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full py-2.5 rounded-xl text-[12px] text-center transition-all hover:opacity-80"
                    style={{ background: "rgba(255,255,255,0.05)", color: textSecondary, border: `1px dashed ${textSecondary}` }}
                  >
                    ✍️ 随机事件征集：分享你的真实故事
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─── 左侧：属性面板 ─── */}
        <aside
          className="lg:w-64 shrink-0 lg:self-start border-b lg:border-b-0 lg:border-r p-5 flex flex-col"
          style={{ borderColor: border, background: "rgba(255,255,255,0.01)" }}
        >
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
                    <p className="text-[14px] font-bold leading-none" style={{ color: textPrimary }}>{mentor.name}</p>
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
        </aside>

        <main className="flex-1 p-6 lg:p-8 overflow-y-auto relative">
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
                onClose={() => setIsResumeOpen(false)}
              />
            </div>
          )}

          {/* 页眉 */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-[13px] tracking-widest uppercase" style={{ color: accent }}>
                {SEMESTER_LABELS[semester]}
              </p>
              <p className="text-[15px] mt-0.5" style={{ color: textSecondary }}>
                第 {round} 回合 · 共24回合
              </p>
            </div>
            <button
              onClick={resetGame}
              className="text-[12px] px-3 py-1.5 rounded-lg transition-all hover:opacity-70 flex items-center gap-1.5"
              style={{ color: textSecondary, border: `1px solid ${border}` }}
            >
              <RefreshCw size={10} /> 重新开始
            </button>
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
              className="rounded-2xl p-6 mb-6"
              style={{
                background: displayEvent.type === "positive" ? "rgba(74,222,128,0.05)" : "rgba(239,83,80,0.05)",
                border: displayEvent.type === "positive" ? "1px solid rgba(74,222,128,0.2)" : "1px solid rgba(239,83,80,0.2)"
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <span
                  className="text-[12px] tracking-widest uppercase px-2 py-1 rounded"
                  style={{
                    color: displayEvent.type === "positive" ? "#4ade80" : "#ef5350",
                    background: displayEvent.type === "positive" ? "rgba(74,222,128,0.1)" : "rgba(239,83,80,0.1)"
                  }}
                >
                  随机事件
                </span>
              </div>
              <h3 className="text-[18px] mb-3" style={{ color: textPrimary, fontFamily: "'Noto Serif SC', serif" }}>
                {displayEvent.title}
              </h3>
              <p className="text-[15px] leading-relaxed mb-5" style={{ color: "rgba(200,220,255,0.7)" }}>
                {displayEvent.description}
              </p>
              {/* 效果预览 */}
              <div className="flex flex-wrap gap-1.5 mb-5">
                {(Object.keys(displayEvent.effects) as StatKey[]).map((k) => (
                  <DeltaBadge key={k} statKey={k} value={displayEvent.effects[k]!} />
                ))}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={acknowledgeEvent}
                  className="flex-1 px-5 py-2.5 rounded-xl text-[14px] transition-all hover:opacity-90"
                  style={{
                    background: displayEvent.type === "positive" ? "rgba(74,222,128,0.15)" : "rgba(239,83,80,0.15)",
                    color: displayEvent.type === "positive" ? "#4ade80" : "#ef5350",
                    border: displayEvent.type === "positive" ? "1px solid rgba(74,222,128,0.25)" : "1px solid rgba(239,83,80,0.25)"
                  }}
                >
                  继续
                </button>
                <a
                  href="https://v.wjx.cn/vm/YDzWe08.aspx#"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 rounded-xl text-[13px] transition-all hover:bg-white/5 flex items-center whitespace-nowrap"
                  style={{ color: textSecondary, border: `1px dashed ${textSecondary}` }}
                >
                  ✍️ 投稿故事
                </a>
              </div>
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
            <>
              <p className="text-[14px] mb-4" style={{ color: textSecondary }}>
                本回合行动（选择一项）：
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {ACTIONS.filter(
                  (action) =>
                    action.id !== "campus" || semester >= 5
                ).map((action) => (
                  <button
                    key={action.id}
                    onClick={() => chooseAction(action)}
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
            </>
          )}

          {/* ── 行动结果 ── */}
          {phase === "action_result" && chosenAction && (
            <div>
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

              {/* 如果是“投实习”，给出可选的实习 offer */}
              {chosenAction.id === "internship" && currentOfferedInternships.length > 0 && (
                <div
                  className="rounded-2xl p-5 mb-5"
                  style={{ background: "rgba(7,16,40,0.9)", border: `1px dashed ${border}` }}
                >
                  <p
                    className="text-[14px] mb-3"
                    style={{ color: textSecondary }}
                  >
                    根据你当前的能力值，本学期你拿到了以下实习机会，选择一个你更想去的：
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {currentOfferedInternships.map((opt) => {
                      const selected = selectedInternshipId === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() =>
                            setSelectedInternshipId(
                              selected ? null : opt.id
                            )
                          }
                          className="text-left rounded-xl px-3.5 py-3 transition-all duration-200"
                          style={{
                            background: selected
                              ? "rgba(201,168,76,0.16)"
                              : "rgba(10,18,40,0.9)",
                            border: selected
                              ? `1px solid ${accent}`
                              : "1px solid rgba(120,140,200,0.25)",
                            boxShadow: selected
                              ? "0 0 0 1px rgba(201,168,76,0.25)"
                              : "none",
                          }}
                        >
                          <p
                            className="text-[14px] mb-0.5"
                            style={{ color: textPrimary }}
                          >
                            {opt.title}
                          </p>
                          <p
                            className="text-[13px] mb-1"
                            style={{ color: textSecondary }}
                          >
                            {opt.companyName}
                          </p>
                          <p
                            className="text-[13px] mb-1"
                            style={{ color: accent }}
                          >
                            {opt.stipend}
                          </p>
                          <p
                            className="text-[13px] leading-relaxed"
                            style={{ color: "rgba(190,205,240,0.7)" }}
                          >
                            {opt.description}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                  <p
                    className="text-[12px] mt-3"
                    style={{ color: "rgba(160,180,220,0.6)" }}
                  >
                    （不选择也可以直接进入下一回合，仅影响你的代入感，不改变数值结局。）
                  </p>
                </div>
              )}

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
                {totalRound >= 24 ? "查看结局 →" : `进入下一回合 `}
                {totalRound < 24 && <ChevronRight size={14} />}
              </button>
            </div>
          )}
        </main>

        {/* ─── 右侧：常驻简历 ─── */}
        <aside
          className="hidden lg:flex lg:w-80 shrink-0 flex-col p-5 overflow-y-auto"
          style={{ background: "rgba(0,0,0,0.2)" }}
        >
          <ResumeView
            character={character}
            stats={stats}
            pastInternships={pastInternships}
            onClose={() => { }}
          />
        </aside>
        <AIAssistant gameContext={{ character, stats, mentor, semester, phase, ending }} />
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
    const catMap: Record<string, Company[]> = {};
    qualified.forEach((c) => {
      if (!catMap[c.category]) catMap[c.category] = [];
      catMap[c.category].push(c);
    });

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
      setEnding(finalEnding);
      setPhase("ending");
    };

    return (
      <div style={pageStyle} className="flex flex-col items-center min-h-screen px-6 py-16">
        <div className="max-w-2xl w-full">
          <p className="text-[13px] tracking-[0.3em] uppercase mb-4" style={{ color: textSecondary }}>
            三年结束 · 选择你的 offer
          </p>

          <div className="rounded-2xl p-6 mb-6" style={{ background: card, border: `1px solid ${border}` }}>
            <p className="text-[15px] mb-2" style={{ color: textPrimary }}>
              秋招开奖结果揭晓。
            </p>
            <p className="text-[14px] mb-4" style={{ color: textSecondary }}>
              由于当前就业环境及运气因素，你综合表现达标并最终收到了以下公司的正式意向书：
            </p>

            {qualified.length === 0 && (
              <div className="py-6 text-center rounded-lg" style={{ background: "rgba(255,255,255,0.02)" }}>
                <p className="text-[14px] opacity-70">
                  很遗憾，由于激烈的竞争，你没有收到任何公司的 Offer（已进入人才库）。<br /><br />
                  不用灰心，接下来的结局依然有属于你的故事。
                </p>
              </div>
            )}

            {qualified.length > 0 &&
              Object.entries(catMap).map(([cat, coms]) => (
                <div key={cat} className="mb-4">
                  <p className="text-[12px] mb-2" style={{ color: textSecondary }}>
                    {cat}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {coms.map((c) => {
                      const meta = COMPANY_OFFER_META[c.id] ?? {
                        salary: "面议",
                        perks: c.description,
                        level: "中厂" as const,
                      };
                      const selected = selectedOfferId === c.id;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() =>
                            setSelectedOfferId(selected ? null : c.id)
                          }
                          className="px-3 py-2 rounded-xl text-left transition-all duration-200"
                          style={{
                            background: selected
                              ? "rgba(201,168,76,0.16)"
                              : "rgba(9,14,30,0.9)",
                            border: selected
                              ? `1px solid ${accent}`
                              : `1px solid ${border}`,
                            boxShadow: selected
                              ? "0 0 0 1px rgba(201,168,76,0.22)"
                              : "none",
                          }}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-[14px]" style={{ color: textPrimary }}>
                              {c.name}
                            </span>
                            <span className="text-[12px]" style={{ color: accent }}>
                              {meta.salary}
                            </span>
                          </div>
                          <p className="text-[13px] mb-0.5" style={{ color: textSecondary }}>
                            {meta.perks}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

            {selectedOfferId && qualified.length > 0 && (
              <p className="text-[13px] mt-2" style={{ color: accent }}>
                已选择：
                <span className="ml-1">
                  {qualified.find((c) => c.id === selectedOfferId)?.name}
                </span>
                。
              </p>
            )}
            
            {!selectedOfferId && qualified.length > 0 && (
              <p className="text-[13px] mt-2 text-red-400">
                ⚠ 请点击上方卡片选择一个 Offer，否则将默认为放弃所有机会。
              </p>
            )}
          </div>

          <button
            onClick={handleConfirmOffer}
            className="w-full py-3.5 rounded-xl text-[15px] transition-all hover:opacity-90 flex items-center justify-center gap-2"
            style={{ background: (!selectedOfferId && qualified.length > 0) ? "rgba(255,255,255,0.1)" : accent, color: (!selectedOfferId && qualified.length > 0) ? textSecondary : "#070d1c" }}
          >
            {(!selectedOfferId && qualified.length > 0) ? "放弃 Offer 并查看结局" : "确认，查看结局 →"}
          </button>
          <AIAssistant gameContext={{ character, stats, mentor, semester, phase, ending }} />
        </div>
      </div>
    );
  }

  // ── 结局页
  if (phase === "ending" && stats) {
    const finalEnding = ending || ENDINGS[0]; // 回退到第一个结局以防万一
    const qualified = receivedOffers || [];
    const catMap: Record<string, Company[]> = {};
    qualified.forEach((c) => {
      if (!catMap[c.category]) catMap[c.category] = [];
      catMap[c.category].push(c);
    });

    return (
      <div style={pageStyle} className="flex flex-col items-center min-h-screen px-6 py-16">
        <div className="max-w-2xl w-full">
          {isResumeOpen && character && (
            <ResumeView
              character={character}
              stats={stats}
              pastInternships={pastInternships}
              onClose={() => setIsResumeOpen(false)}
            />
          )}
          <p className="text-[13px] tracking-[0.3em] uppercase mb-4" style={{ color: textSecondary }}>
            三年结束 · 最终结局
          </p>

          {/* 结局卡 */}
          <div
            className="rounded-2xl p-8 mb-8"
            style={{ background: `${finalEnding.color}08`, border: `1px solid ${finalEnding.color}30` }}
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
            <p className="text-[13px] tracking-[0.2em] uppercase mb-6 text-center" style={{ color: accent }}>
              GRADUATE RECORD · 生涯履历
            </p>

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
                    <div key={idx} className="flex flex-col gap-2">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1">
                        <div>
                          <h4 className="text-[15px] text-white font-medium">{internship.companyName}</h4>
                          <p className="text-[13px]" style={{ color: textSecondary }}>{internship.title}</p>
                        </div>
                        <span className="text-[12px] tabular-nums mt-1 sm:mt-0" style={{ color: accent }}>
                          {internship.stipend.split(' · ')[0]}
                        </span>
                      </div>
                      {internship.detailedAchievements && (
                        <ul className="list-disc list-inside text-[13px] space-y-0.5" style={{ color: "rgba(200,220,255,0.6)" }}>
                          {internship.detailedAchievements.map((ach, i) => (
                            <li key={i}>{ach}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 删除了最终选 offer 的环节，因为在之前已经选过了 */}

          <button
            onClick={resetGame}
            className="w-full py-4 rounded-xl text-[15px] transition-all hover:opacity-90 flex items-center justify-center gap-2"
            style={{ background: "rgba(74,158,255,0.12)", color: accent, border: `1px solid rgba(74,158,255,0.25)` }}
          >
            <RefreshCw size={14} /> 重新开始，写另一个故事
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
