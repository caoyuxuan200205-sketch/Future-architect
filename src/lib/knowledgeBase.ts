import { supabase } from "./supabase";

export interface KnowledgeChunk {
  id: string;
  category: string;
  content: string;
  keywords: string[];
  title?: string;
  similarity?: number;
}

// 核心本地游戏机制知识库（涵盖属性、导师、同门、求职电脑、毕业论文、经济账单等全量系统）
export const KNOWLEDGE_BASE: KnowledgeChunk[] = [
  // ================================================================
  // 1. 核心属性与心理健康
  // ================================================================
  {
    id: "attr_arch",
    category: "属性解析",
    title: "建筑专业力 (arch)",
    content: "建筑专业力 (arch): 影响能否进入传统设计院（如中建院、华东院、同济院等）和完成高水平毕业论文。通过在【建筑学院】'改图'、'做导师私活'提升。走转行路线时不需要盲目堆高，但不能过低影响毕业论文得分。",
    keywords: ["建筑", "专业力", "设计院", "属性", "改图", "方案", "图纸"]
  },
  {
    id: "attr_logic",
    category: "属性解析",
    title: "逻辑力 (logic)",
    content: "逻辑力 (logic): 转行互联网大厂（腾讯、字节、阿里）、外企、顶尖咨询与投行的核心硬实力。通过在【图书馆】'学产品'、'宏观行研建模'、'算法代码学习'提升。大厂战略与产品岗普遍要求 70+ 甚至 80+。",
    keywords: ["逻辑", "逻辑力", "互联网", "大厂", "属性", "学产品", "算法", "行研", "代码"]
  },
  {
    id: "attr_expression",
    category: "属性解析",
    title: "表达力 (expression)",
    content: "表达力 (expression): 面试、无领导小组群面与述职汇报的刚需属性。通过在【就业中心】'模拟群面演练'、'投实习'、以及参加秋招提升。外企、产品经理和咨询岗位对表达力极其看重。",
    keywords: ["表达", "表达力", "面试", "沟通", "群面", "汇报", "演练"]
  },
  {
    id: "attr_english",
    category: "属性解析",
    title: "英语能力 (english)",
    content: "英语能力 (english): 进入外企（Google、Apple、微软等）与外资设计所的刚需门槛。通过在【图书馆】'考雅思冲刺'提升，但需消耗较多金钱与精力。走国内大厂或传统设计院路线无需过度投入。",
    keywords: ["英语", "外企", "雅思", "出国", "谷歌", "微软", "托福", "外资"]
  },
  {
    id: "attr_structured",
    category: "属性解析",
    title: "结构化思维 (structured)",
    content: "结构化思维 (structured): 顶级管理咨询（麦肯锡、波士顿、贝恩）与大厂战略/商业分析岗位的核心考查点。通过【图书馆】'学产品'、'行业研究'提升，能显著提高求职电脑中的模拟面试通过率。",
    keywords: ["结构化", "思维", "咨询", "投行", "麦肯锡", "波士顿", "商析", "战略"]
  },
  {
    id: "attr_stress",
    category: "属性解析",
    title: "抗压值 (stress)",
    content: "抗压值 (stress): 心理防线数值（越高越好）。归零会直接触发【灰度空间的休止符】崩溃退学结局。改图、高强度赶 DDL 会持续扣减抗压；可通过在【宿舍】'规律长跑健身'、'彻底躺平休整'或与室友江淮、白栩互动大幅恢复。",
    keywords: ["压力", "抗压", "崩溃", "心理", "摆烂", "健身", "长跑", "休整", "回血"]
  },
  {
    id: "attr_network",
    category: "属性解析",
    title: "人脉值 (network)",
    content: "人脉值 (network): 决定能否解锁隐藏内推码、高端副业以及大厂直通宣讲会。通过拜访同门（张一帆、陆予忱、沈清淮等）、在【咖啡馆】约校友猎头局以及参加求职沙龙提升。",
    keywords: ["人脉", "内推", "认识", "学长", "关系", "校友", "猎头", "同门"]
  },
  {
    id: "attr_money",
    category: "属性解析",
    title: "金钱与财务 (money)",
    content: "金钱 (money): 每月生存、考雅思及给导师/同门赠送礼物的经济基础。归零不会直接暴毙但会极大推高焦虑值。通过在【咖啡馆】'接商业外包'、大厂实习发薪以及评定高额奖学金快速补充资金。",
    keywords: ["钱", "金钱", "穷", "副业", "实习工资", "奖学金", "外包", "财务", "存款"]
  },
  {
    id: "attr_selfDoubt",
    category: "属性解析",
    title: "自我怀疑 (selfDoubt)",
    content: "自我怀疑 (selfDoubt): 负面心理属性（越低越好）。达到 100 会触发【回去继承家产】不装了摊牌了结局。屡次被拒信打击、导师苛责批评会增加；拿到大厂 Offer、论文通过、被同门鼓励会显著降低。",
    keywords: ["怀疑", "自我怀疑", "继承家产", "负面", "心态", "打击", "被拒"]
  },
  {
    id: "attr_ageAnxiety",
    category: "属性解析",
    title: "年龄焦虑 (ageAnxiety)",
    content: "年龄焦虑 (ageAnxiety): 负面时间压力属性（越低越好）。达到 100 会触发【遁入空门/出家】结局。看到同龄人升职加薪、转行受阻会增加；保持稳定的求职与科研节奏能有效抑制焦虑增长。",
    keywords: ["年龄", "焦虑", "老", "同龄人", "出家", "和尚", "延毕焦虑"]
  },
  {
    id: "attr_mentor",
    category: "属性解析",
    title: "导师好感度 (mentorFavorability)",
    content: "导师好感度 (mentorFavorability): 关乎学业生死的关键红线！好感度低于 20 会亮起退学红灯，归零会立即触发【被退学劝退】结局。在【导师办公室】改图、汇报、送礼可拉升；私自翘课实习、彻底摆烂会大幅扣减好感。",
    keywords: ["导师", "好感度", "退学", "老师", "关系", "红灯", "开除", "劝退"]
  },

  // ================================================================
  // 2. 导师系统与办公室拜访
  // ================================================================
  {
    id: "mentor_types",
    category: "导师系统",
    title: "四大导师类型解析",
    content: "开局可选择不同导师风格：\n1. 【学术大牛 (如旸晟/钱老)】：专业力+15，逻辑+5，但抗压-10，初始好感低且极度严厉，适合传统学术路线，转行需谨慎平衡；\n2. 【放养型导师】：人脉+10，逻辑+10，抗压+10，不常管学生，转行互联网/大厂的神仙导师；\n3. 【实践工程型】：结构化+12，金钱+15，项目多经费足，最容易平稳发育；\n4. 【海龟青年学者】：英语+15，表达+12，极度适合外企路线。",
    keywords: ["导师类型", "学术大牛", "放养导师", "实践导师", "海龟导师", "选导师", "导师推荐"]
  },
  {
    id: "mentor_office_visit",
    category: "导师系统",
    title: "导师办公室 AVG 沉浸拜访",
    content: "在地图点击【导师办公室】可进入 AVG 沉浸式面谈：\n1. 【学术请教】：探讨近代建筑史或设计方案，稳步提升专业力与导师好感；\n2. 【实习申请】：好感度足够时申请外出实习许可，避免因私自实习被导师扣好感；\n3. 【送礼关怀】：根据导师偏好赠送精选好礼，快速破冰。",
    keywords: ["导师办公室", "面谈", "拜访导师", "学术请教", "实习申请", "AVG", "敲门"]
  },
  {
    id: "mentor_gifting",
    category: "导师系统",
    title: "导师送礼攻略与拒礼机制",
    content: "送礼可快速增加导师好感，但需注意：\n1. 礼品需契合导师类型：学术大牛偏好珍藏古籍/名茶，海龟导师偏好精品手冲咖啡豆，实践导师偏好实用好礼；\n2. 若导师好感度过低（如低于 15），送贵重现金或大礼可能触发拒收并增加尴尬与自我怀疑，建议先从日常改图和学术请教做起。",
    keywords: ["送礼", "礼物", "拒礼", "茶叶", "咖啡豆", "好感度拉升", "送礼被拒"]
  },
  {
    id: "mentor_crisis",
    category: "导师系统",
    title: "导师危机处理与防退学",
    content: "当右侧栏显示导师好感度低于 20 时，进入高危预警状态。若好感度降至 0 将直接判定游戏失败（退学）。救急策略：\n1. 立即停止任何会扣好感的实习与摆烂；\n2. 连续前往【建筑学院】执行'改图'；\n3. 前往【导师办公室】主动汇报课题进展或赠送礼物挽回关系。",
    keywords: ["退学危机", "好感低", "防退学", "救急", "挽回导师", "被劝退"]
  },

  // ================================================================
  // 3. NPC 同门社交系统与羁绊加成
  // ================================================================
  {
    id: "npc_zhang_yifan",
    category: "NPC同门",
    title: "同门 · 张一帆 (专硕同门 · 清爽校草)",
    content: "【张一帆】：和你同届入学，Rhino 参数化与建模鬼才，院里公认的清爽校草。\n- 位置：【建筑学院】同门工位。\n- 互动价值：一起熬夜改图、切磋建模方案、吐槽导师改图要求。\n- 专属 Buff：高好感度时提供'建模效率提升'与'抗压恢复'，是前期最值得结交的铁杆战友。",
    keywords: ["张一帆", "同门", "校草", "建模", "Rhino", "建筑学院", "工位", "咖啡"]
  },
  {
    id: "npc_lu_yuchen",
    category: "NPC同门",
    title: "同门 · 陆予忱 (职业导师 · 禁欲系 Hot Nerd)",
    content: "【陆予忱】：跨界算法与产品的大神，专注求职策略与商业逻辑。\n- 位置：【就业中心】204 职业指导室。\n- 互动价值：深度拆解大厂群面技巧、重构简历 STAR 逻辑、探讨 AI 空间算法与面试真题。\n- 专属 Buff：提升群面通过率与逻辑力加成，是转行大厂/咨询必刷好感度的关键 NPC。",
    keywords: ["陆予忱", "就业中心", "Hot Nerd", "群面", "简历", "面试", "算法", "求职导师"]
  },
  {
    id: "npc_bai_xu",
    category: "NPC同门",
    title: "学弟 · 白栩 (治愈系小狗学弟)",
    content: "【白栩】：低一年级的设计系学弟，阳光治愈，手工模型能力极强。\n- 位置：【咖啡馆】阳光卡座（研二起解锁）。\n- 互动价值：指导快题方案、一起拼装椴木模型、享用甜点与治愈陪伴。\n- 专属 Buff：互动可大幅降低自我怀疑与年龄焦虑，快速恢复抗压值。",
    keywords: ["白栩", "学弟", "咖啡馆", "模型", "治愈", "减压", "甜点", "小狗学弟"]
  },
  {
    id: "npc_shen_qinghuai",
    category: "NPC同门",
    title: "学长 · 沈清淮 (温润手绘白月光 · 古籍文献大师)",
    content: "【沈清淮】：高年级专硕学长，温润儒雅，擅长近代建筑史考据与徒手钢笔透视速写。\n- 位置：【图书馆】3 楼古籍特藏阅览区。\n- 互动价值：切磋手绘透视、考据文献断代、共同研读《营造学社汇刊》珍本文献。\n- 专属 Buff：提供稳定的学术力与论文分加成；好感度达到 60+ 时可触发独家内推机会！",
    keywords: ["沈清淮", "学长", "图书馆", "白月光", "古籍", "手绘", "近代建筑史", "营造学社", "内推"]
  },
  {
    id: "npc_jiang_huai",
    category: "NPC同门",
    title: "室友 · 江淮 (体育生室友 · 热血硬汉)",
    content: "【江淮】：同寝室的体育生舍友，性格豪爽讲义气。\n- 位置：【宿舍】。\n- 互动价值：带你夜跑长跑排毒、大排档吃烧烤宵夜、深夜倾听你的转行烦恼。\n- 专属 Buff：大幅提升体力抗压上限，有效清空负面状态。",
    keywords: ["江淮", "室友", "宿舍", "长跑", "夜跑", "排毒", "大排档", "宵夜", "硬汉"]
  },
  {
    id: "npc_social_features",
    category: "NPC同门",
    title: "求职电脑微信社交与对话树",
    content: "在左侧栏打开【电脑 -> 消息】可与所有已结识的 NPC 进行微信聊天：\n1. 支持点击打招呼、探讨课题、申请内推；\n2. 达到好感度里程碑（如 30/60/80）会触发专属剧情对话树与分支选项；\n3. 连续多次无意义打招呼可能会触发专属彩蛋或 NPC 忙碌回复。",
    keywords: ["微信", "聊天", "电脑消息", "对话树", "打招呼", "里程碑", "社交互动"]
  },

  // ================================================================
  // 4. 毕业论文系统与答辩机制
  // ================================================================
  {
    id: "thesis_system",
    category: "毕业论文",
    title: "毕业论文得分与答辩规则",
    content: "毕业论文分数 (thesisScore) 决定能否顺利拿到学位：\n- ≥85 分：优秀论文毕业（解锁学霸成就并大幅加成秋招）；\n- 60~84 分：正常通过毕业；\n- <60 分：论文未达标直接判定延毕！延毕将导致所有已拿到的全职大厂 Offer 被强制作废撤回。",
    keywords: ["毕业论文", "论文分", "答辩", "学位", "优秀论文", "延毕", "论文要求"]
  },
  {
    id: "thesis_proposal_warning",
    category: "毕业论文",
    title: "研二下学期开题警戒线 (30分)",
    content: "【极其重要】：在研二下学期（第 4 学期）结束前，玩家的论文得分必须达到 30 分以上！若低于 30 分，系统会在界面弹出【延毕风险预警】。若研三开学仍未补足，将直接失去参加秋招的资格并面临延毕危机。",
    keywords: ["开题", "开题报告", "警戒线", "30分", "研二下", "延毕预警", "延毕风险"]
  },
  {
    id: "thesis_improvement",
    category: "毕业论文",
    title: "提升毕业论文分的四大途径",
    content: "如何快速提升论文分数：\n1. 【建筑学院】：执行'推进学位论文'行动（稳步提升 8~12 分）；\n2. 【图书馆】：与沈清淮学长研读文献，切磋古籍考据（学术加成）；\n3. 【导师办公室】：找导师进行学术请教与论文汇报，获取导师修改意见；\n4. 保持较高的建筑专业力与逻辑力，会给予论文产出被动加成。",
    keywords: ["提升论文", "写论文", "刷论文分", "开题攻略", "学术汇报", "过论文"]
  },

  // ================================================================
  // 5. 求职电脑与模拟面试攻略
  // ================================================================
  {
    id: "computer_job_hunting",
    category: "求职电脑",
    title: "求职电脑终端使用指南",
    content: "在左侧菜单栏点击【电脑 -> 求职】即可进入求职系统：\n1. 浏览互联网大厂、外企、咨询公司、知名设计院的招聘岗位；\n2. 一键投递个人简历（投递成功后进入 HR 筛选池）；\n3. 查看已投递岗位的流程状态（已投递 / 待面试 / 面试中 / 已录用 / 流程终止）。",
    keywords: ["求职电脑", "电脑求职", "投简历", "投递", "招聘", "职位列表", "求职终端"]
  },
  {
    id: "computer_inbox_notice",
    category: "求职电脑",
    title: "求职邮箱小红点与面试邀约",
    content: "当收到大厂 HR 邮件或面试邀请时，界面会弹出【Application Update】提示并在电脑图标显示红点。\n请务必及时点击进入电脑处理面试邀约或笔试问卷。若长时间忽视，面试邀约可能会超时失效。",
    keywords: ["邮箱", "小红点", "Application Update", "面试邀请", "新邮件", "HR邮件"]
  },
  {
    id: "interview_answer_strategy",
    category: "求职电脑",
    title: "模拟面试三类回答策略解析",
    content: "在求职电脑的模拟面试中，每个问题提供三类回答倾向：\n1. 【结构化逻辑回答 (STAR 原则)】：最适合产品经理、运营和战略咨询岗，大幅提升逻辑与结构化得分；\n2. 【硬核论据与案例支撑】：最适合算法、研发、设计方案岗，提升专业力认可度；\n3. 【真诚沟通与文化匹配】：在压力面或 HR 综合面中使用，能化解尴尬并稳定心态。",
    keywords: ["模拟面试", "面试答题", "STAR原则", "结构化回答", "面试技巧", "面试题库", "求职面试"]
  },
  {
    id: "internship_accumulation",
    category: "求职电脑",
    title: "实习履历与秋招转正加成",
    content: "在研二期间争取 1~2 段高含金量大厂实习是转行成功的基石：\n1. 每段实习均会在个人履历中留下印记，并在研三秋招中带来巨额录取率加成；\n2. 实习期间每月自动发放可观薪资，极大改善个人现金流；\n3. 实习表现优异可提前锁定大厂秋招转正绿卡（直通 Offer）。",
    keywords: ["实习经历", "实习加成", "转正绿卡", "秋招加成", "实习薪资", "暑期实习"]
  },

  // ================================================================
  // 6. 经济系统与每月账单
  // ================================================================
  {
    id: "finance_monthly_bill",
    category: "经济系统",
    title: "每月账单结算系统",
    content: "游戏每回合开始时会弹出【每月财务账单】：\n- 支出项：基础生活费、房租支出、社交应酬；\n- 收入项：研究生基础津贴、实习工资入账、兼职外包收益、奖学金分批发放；\n- 账单会清晰展示当月净盈余与总资产变化，帮助玩家合理控制开销。",
    keywords: ["每月账单", "账单", "结算", "生活费", "房租", "收支", "财务账单"]
  },
  {
    id: "finance_city_cost",
    category: "经济系统",
    title: "城市生活成本系数",
    content: "玩家所在城市会影响每月刚性支出：\n- 一线城市（北京、上海、深圳）：房租与物价系数最高，但大厂实习薪资和兼职单价也最高；\n- 新一线/二线城市（杭州、成都、西安等）：生活成本适中，平稳发育难度较低。",
    keywords: ["城市成本", "房租", "一线城市", "北京", "上海", "深圳", "生活成本"]
  },
  {
    id: "finance_sidejob_tips",
    category: "经济系统",
    title: "副业兼职与外包策略",
    content: "资金短缺时，可在【咖啡馆】执行'接商业外包'行动快速赚取数千元现金。\n注意：频繁接私活外包会消耗宝贵的行动点数，并可能因为过度疲劳轻微扣减抗压值，建议按需接单。",
    keywords: ["副业", "外包", "接私活", "赚钱", "资金短缺", "兼职"]
  },

  // ================================================================
  // 7. 地图六大地点与行动指南
  // ================================================================
  {
    id: "map_building_school",
    category: "地图探索",
    title: "【建筑学院】功能概览",
    content: "【建筑学院】：专业基本盘与学位主阵地。\n- 核心行动：改图刷导师好感、推进学位毕业论文、打磨跨界设计作品集；\n- NPC 驻留：专硕同门张一帆（工位旁）。",
    keywords: ["建筑学院", "改图", "作品集", "张一帆", "工位", "学院"]
  },
  {
    id: "map_library",
    category: "地图探索",
    title: "【图书馆】功能概览",
    content: "【图书馆】：转行硬技能与考证修炼地。\n- 核心行动：学产品 PRD、宏观行业研究与建模、算法代码学习、数据分析实操、雅思考试冲刺；\n- NPC 驻留：古籍文献学长沈清淮（3 楼特藏区）。",
    keywords: ["图书馆", "学产品", "行研", "代码", "雅思", "沈清淮", "数据分析"]
  },
  {
    id: "map_career_center",
    category: "地图探索",
    title: "【就业中心】功能概览",
    content: "【就业中心】：求职实战与校招大本营。\n- 核心行动：投递高含金量实习、模拟无领导小组群面、参加研三秋招双选会；\n- NPC 驻留：职业指导同门陆予忱（204 房间）。",
    keywords: ["就业中心", "投实习", "模拟群面", "秋招", "陆予忱", "双选会"]
  },
  {
    id: "map_cafe",
    category: "地图探索",
    title: "【咖啡馆】功能概览",
    content: "【咖啡馆】：社交拓展与副业搞钱胜地。\n- 核心行动：接商业外包副业、约跨界校友猎头局、打探大厂内推直聘情报；\n- NPC 驻留：治愈系学弟白栩（阳光卡座，研二起解锁）。",
    keywords: ["咖啡馆", "外包", "副业", "校友", "白栩", "猎头", "内推情报"]
  },
  {
    id: "map_dorm",
    category: "地图探索",
    title: "【宿舍】功能概览",
    content: "【宿舍】：休整回血与心态调节港湾。\n- 核心行动：规律长跑健身（提抗压排毒）、彻底躺平休整（大减焦虑）；\n- NPC 驻留：体育生室友江淮。",
    keywords: ["宿舍", "长跑", "健身", "躺平", "摆烂", "江淮", "回血", "抗压恢复"]
  },

  // ================================================================
  // 8. 目标结局与阶段通关攻略
  // ================================================================
  {
    id: "target_bigtech_route",
    category: "通关攻略",
    title: "互联网大厂通关路线 (腾讯/字节/阿里)",
    content: "达成条件：逻辑力 ≥75，表达力 ≥70，结构化思维 ≥70，至少 1 段互联网实习，论文分 ≥60。\n攻略节奏：研一在图书馆狂刷'学产品'和'行研'，研二通过求职电脑投递暑期实习并找陆予忱模拟群面，研三秋招直接收割 Offer。",
    keywords: ["大厂攻略", "进大厂", "腾讯", "字节", "阿里", "产品经理", "转行大厂"]
  },
  {
    id: "target_foreign_route",
    category: "通关攻略",
    title: "外企精英通关路线 (Google/Apple/微软)",
    content: "达成条件：英语能力 ≥80，逻辑力 ≥75，表达力 ≥75，论文分 ≥60。\n攻略节奏：强烈建议开局选【海龟导师】，研一到研二在图书馆准备雅思，多去就业中心练全英面试，秋招投递外企管培/技术岗。",
    keywords: ["外企攻略", "谷歌", "微软", "苹果", "外企要求", "雅思高分"]
  },
  {
    id: "target_consulting_route",
    category: "通关攻略",
    title: "顶级咨询与投行通关路线 (麦肯锡/高盛)",
    content: "达成条件（最高难度）：逻辑力 ≥85，结构化思维 ≥85，英语能力 ≥80，人脉 ≥70。\n攻略节奏：需要极限加点，兼顾学产品、深度行研与高难度 Case 面试，充分借助陆予忱与沈清淮的高好感内推加成。",
    keywords: ["咨询攻略", "麦肯锡", "波士顿", "投行", "高盛", "顶级Offer", "最高难度"]
  },
  {
    id: "target_traditional_route",
    category: "通关攻略",
    title: "传统顶级设计院通关路线 (中建院/同济院)",
    content: "达成条件：建筑专业力 ≥80，导师好感度 ≥85，毕业论文 ≥85（优秀论文）。\n攻略节奏：选学术大牛或实践导师，安心当导师的得意门生，持续改图和精研近代建筑史论文，由导师直接推荐入职。",
    keywords: ["设计院攻略", "中建院", "同济院", "传统路线", "学术接班人", "优秀毕业"]
  },
  {
    id: "stage_timeline_guide",
    category: "通关攻略",
    title: "研一至研三整体通关时间轴",
    content: "1. 【研一阶段 (1~8 回合)】：明确发展方向，稳住导师好感在 40 以上，转行党猛冲逻辑与结构化思维，稳住月度收支；\n2. 【研二阶段 (9~16 回合)】：中盘拉开差距！研二下务必把论文分冲到 30+ 越过开题警戒线，同时通过求职电脑投递暑期大厂实习；\n3. 【研三阶段 (17~24 回合)】：决战秋招！处理求职电脑中的面试邀约，善用同门内推，完成毕业论文终审答辩，锁定神仙 Offer！",
    keywords: ["通关时间轴", "节奏", "研一怎么玩", "研二怎么玩", "研三秋招", "新手攻略", "保姆级攻略"]
  }
];

// 获取 ModelScope Qwen3-Embedding 向量 (4096维)
async function getQueryEmbedding(query: string): Promise<number[]> {
  const customKey = localStorage.getItem("qwen_api_key");
  const customBaseUrl = localStorage.getItem("qwen_base_url");

  const apiKey = customKey || import.meta.env.VITE_QWEN_API_KEY || "";
  const baseUrl = customBaseUrl || import.meta.env.VITE_QWEN_BASE_URL || "https://api-inference.modelscope.cn/v1";
  const model = "Qwen/Qwen3-Embedding-8B";

  if (!apiKey) {
    throw new Error("Missing ModelScope API Key");
  }

  const response = await fetch(`${baseUrl}/embeddings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model,
      input: query,
      encoding_format: "float" // 强制要求 float
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Embedding API failed: ${response.status} - ${errText}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

// 本地全文/关键词匹配搜索（兜底方案）
export function localSearch(query: string, topK: number = 4): KnowledgeChunk[] {
  const queryWords = query.toLowerCase().split(/[ \t\n,?.!，。？！、\-_/]+/).filter(w => w.length > 0);
  if (queryWords.length === 0) return [];

  const scored = KNOWLEDGE_BASE.map(chunk => {
    let score = 0;
    const content = chunk.content.toLowerCase();
    const title = (chunk.title || "").toLowerCase();
    const category = chunk.category.toLowerCase();

    queryWords.forEach(word => {
      // 1. 标题完全匹配或包含：极高权重
      if (title.includes(word)) {
        score += 8;
      }
      // 2. 关键词精准匹配：高权重
      if (chunk.keywords.some(k => k.toLowerCase().includes(word) || word.includes(k.toLowerCase()))) {
        score += 5;
      }
      // 3. 分类匹配：中权重
      if (category.includes(word)) {
        score += 3;
      }
      // 4. 正文包含：基础权重
      if (content.includes(word)) {
        score += 1.5;
      }
    });

    return { chunk, score };
  });

  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(s => s.chunk)
    .slice(0, topK);
}

// 异步 RAG 检索入口
export async function searchKnowledge(query: string, topK: number = 4): Promise<KnowledgeChunk[]> {
  try {
    console.log(`[RAG Search] Starting ModelScope Qwen3 semantic search for: "${query}"`);
    
    const queryEmbedding = await getQueryEmbedding(query);
    
    const { data, error } = await supabase.rpc("match_knowledge_chunks", {
      query_embedding: queryEmbedding,
      match_threshold: 0.3,
      match_count: topK
    });

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      console.log(`[RAG Search] Cloud returned 0 matches. Falling back to local search.`);
      return localSearch(query, topK);
    }

    console.log(`[RAG Search] Cloud semantic search success. Found ${data.length} matches.`);
    
    return data.map((row: any) => ({
      id: row.id.toString(),
      category: row.category,
      content: `【${row.title}】\n${row.content}`,
      keywords: [],
      title: row.title,
      similarity: row.similarity
    }));

  } catch (error: any) {
    console.warn(`[RAG Search] Cloud search failed: ${error.message || error}. Falling back to local keyword matching.`);
    return localSearch(query, topK);
  }
}
