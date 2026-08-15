/**
 * 导师办公室会面剧情、心境与多维对话数据
 */
import type { ToneTier } from "./types";

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
  category: "academic" | "chat" | "gift" | "opportunity" | "leave";
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
    if (name === "冷冬青") {
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
    if (name === "钟建国") {
      avatarImage = "/assets/visuals/npcs/professor_practice_cui.jpg";
      hasPortrait = true;
      moods = ["在材料样板堆里翻找一块可替代的仿木铝板", "和结构工程师讨论大跨度桁架的节点优化", "桌上摊开明晚市长汇报的总平面终稿"];
    }
    if (name === "何建民") {
      avatarImage = "/assets/visuals/npcs/professor_practice_he.jpg";
      hasPortrait = true;
      moods = ["戴着黑框眼镜在数字平板上勾画总图节点", "和来访的甲方项目负责人讨论材料样板替换方案", "翻看昨天工地反馈的结构修改意见"];
    }
    if (name === "柳岩松") {
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
    if (name === "王永和") {
      avatarImage = "/assets/visuals/npcs/professor_overseas_zhang.jpg";
      hasPortrait = true;
      moods = ["刚结束一场跨越八个时区的联合设计评图", "在白板上勾勒着下一个驻地名古屋的项目时间表", "翻阅来自康奈尔与米兰理工的交换生作品集"];
    }
    if (name === "庄岩松") {
      avatarImage = "/assets/visuals/npcs/professor_overseas_zhuang.jpg";
      hasPortrait = true;
      moods = ["在模型室里排列着十几个 1:50 的参数化结构模型", "屏幕上并行开着 Grasshopper 与 Karamba3D 的实时演算", "和学生讨论下周赴巴塞罗那的学术考察路线"];
    }
    if (name === "董永辉") {
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

  return options;
}
