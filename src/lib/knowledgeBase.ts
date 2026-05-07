export interface KnowledgeChunk {
  id: string;
  category: string;
  content: string;
  keywords: string[];
}

export const KNOWLEDGE_BASE: KnowledgeChunk[] = [
  {
    id: "attr_arch",
    category: "属性解析",
    content: "建筑专业力 (arch): 影响能否进入传统设计院（如中建院、华东院等）。通过'改图'和'导师做私活'等事件提升，但会降低转行互联网的机会。如果你打算进入传统路径，这是最重要的属性。",
    keywords: ["建筑", "专业力", "设计院", "属性", "改图"]
  },
  {
    id: "attr_logic",
    category: "属性解析",
    content: "逻辑力 (logic): 转行互联网大厂、外企、咨询、投行的核心属性。通过'学产品'、某些实习或随机事件提升。大厂(如腾讯、字节)要求极高的逻辑力(70+)。",
    keywords: ["逻辑", "逻辑力", "互联网", "大厂", "属性", "学产品"]
  },
  {
    id: "attr_expression",
    category: "属性解析",
    content: "表达力 (expression): 面试和群面必备属性。通过'投实习'、'参加校招'等提升。外企、产品经理岗位非常看重。",
    keywords: ["表达", "表达力", "面试", "沟通", "产品"]
  },
  {
    id: "attr_english",
    category: "属性解析",
    content: "英语能力 (english): 进入外企（Google, Apple等）的刚需门槛。通过'准备雅思'提升，但耗费金钱和精力。如果不打算进外企，不用过多投入。",
    keywords: ["英语", "外企", "雅思", "出国"]
  },
  {
    id: "attr_structured",
    category: "属性解析",
    content: "结构化思维 (structured): 咨询公司和顶级投行极度看重。通过'学产品'等方式提升。",
    keywords: ["结构化", "思维", "咨询", "投行", "麦肯锡", "产品"]
  },
  {
    id: "attr_stress",
    category: "属性解析",
    content: "抗压值 (stress): 越高越好，归零会导致'灰度空间的休止符'崩溃结局。改图、准备雅思会掉抗压，摆烂能大幅恢复。",
    keywords: ["压力", "抗压", "崩溃", "心理", "摆烂"]
  },
  {
    id: "attr_network",
    category: "属性解析",
    content: "人脉值 (network): 能触发隐藏的内推和优质兼职。参加校招、线下沙龙等可以提升。",
    keywords: ["人脉", "内推", "认识", "学长", "关系"]
  },
  {
    id: "attr_money",
    category: "属性解析",
    content: "金钱 (money): 日常生存必需，归零虽然不会直接结束游戏，但会极大增加焦虑。接外包（副业）能赚钱，准备雅思和送礼很费钱。",
    keywords: ["钱", "金钱", "穷", "副业", "实习工资"]
  },
  {
    id: "attr_selfDoubt",
    category: "属性解析",
    content: "自我怀疑 (selfDoubt): 越低越好。达到100会触发'回去继承家产'结局（不装了摊牌了）。各种被拒、被导师PUA都会增加，拿到offer或被认可能降低。",
    keywords: ["怀疑", "自我怀疑", "继承家产", "负面"]
  },
  {
    id: "attr_ageAnxiety",
    category: "属性解析",
    content: "年龄焦虑 (ageAnxiety): 越低越好。达到100会触发'被遗忘在时光深处'出家结局。看到同龄人成功、被嫌弃没经验都会增加。",
    keywords: ["年龄", "焦虑", "老", "同龄人", "出家"]
  },
  {
    id: "attr_mentor",
    category: "属性解析",
    content: "导师好感度 (mentorFavorability): 极度关键！归零会直接触发'被退学'（劝退）结局。送礼、按时交图能提升，摆烂、忤逆会降低。",
    keywords: ["导师", "好感度", "退学", "老师", "关系"]
  },
  {
    id: "mentor_academic",
    category: "导师选择",
    content: "导师-学术大牛: 建筑专业力+15, 逻辑力+5，但抗压-10，初始好感度-10。适合想进设计院的玩家，但前期极易因为好感度低被退学，需要苟住。",
    keywords: ["导师", "大牛", "学术大牛", "设计院", "选谁"]
  },
  {
    id: "mentor_hands_off",
    category: "导师选择",
    content: "导师-放养型导师: 人脉+10, 逻辑+10, 抗压+10, 建筑-5。神仙导师，极其适合转行，给你充足的时间准备产品或互联网面试，缺点是去设计院没优势。",
    keywords: ["导师", "放养", "自由", "转行"]
  },
  {
    id: "mentor_practice",
    category: "导师选择",
    content: "导师-实践工程型: 结构化+12, 金钱+15, 建筑+5, 自我怀疑-10。比较平衡的导师，给钱多，适合平稳发育，无论转行还是设计院都可以。",
    keywords: ["导师", "实践", "工程", "有钱"]
  },
  {
    id: "mentor_overseas",
    category: "导师选择",
    content: "导师-海龟青年学者: 英语+15, 表达+12, 人脉+5, 年龄焦虑-5。极其适合走外企路线的导师，语言加成极高。",
    keywords: ["导师", "海龟", "外企", "英语", "青年"]
  },
  {
    id: "action_revise",
    category: "行动策略",
    content: "行动-改图: 建筑+8，导师好感+2~5，抗压-6，自我怀疑+3，焦虑+2。刷导师好感和建筑专业力的核心手段。",
    keywords: ["行动", "改图", "干活", "专业"]
  },
  {
    id: "action_product",
    category: "行动策略",
    content: "行动-学产品: 逻辑+7，结构化+7，表达+2。建筑-2，导师好感-1。转行大厂、咨询的核心策略。",
    keywords: ["行动", "学产品", "产品", "转行", "互联网"]
  },
  {
    id: "action_internship",
    category: "行动策略",
    content: "行动-投实习: 表达+5，人脉+5，减怀疑，赚钱。但导师极度反感(好感-5~-10)。除非你导师是放养型或者好感度很高，否则慎用，容易被退学。",
    keywords: ["行动", "投实习", "找实习", "导师生气"]
  },
  {
    id: "action_slack",
    category: "行动策略",
    content: "行动-摆烂: 抗压大涨(+8)，焦虑大减(-10)，但所有专业属性均下降，导师好感也会掉。只在濒临崩溃(抗压过低)时保命用。",
    keywords: ["行动", "摆烂", "休息", "保命", "抗压低"]
  },
  {
    id: "target_bigtech",
    category: "求职目标",
    content: "如何进大厂(腾讯/字节/阿里): 需要逻辑、表达、结构化都在70分左右。猛点'学产品'，多刷几次'实习'积累人脉，后期触发宣讲会特招可以大幅提升录取率。",
    keywords: ["大厂", "腾讯", "字节", "阿里", "怎么进"]
  },
  {
    id: "target_foreign",
    category: "求职目标",
    content: "如何进外企(Google/微软): 英语需要达到80+，逻辑和结构化75+。选'海龟导师'开局最好，中途疯狂'准备雅思'。",
    keywords: ["外企", "谷歌", "微软", "英语", "要求"]
  },
  {
    id: "target_consulting",
    category: "求职目标",
    content: "如何进咨询/投行(麦肯锡/高盛): 游戏最高难度。逻辑、结构化、英语全都要80以上。需要极好的初始面板和绝佳的运气，疯狂学产品和练英语。",
    keywords: ["咨询", "投行", "麦肯锡", "高盛", "最难"]
  },
  {
    id: "target_design",
    category: "求职目标",
    content: "如何进设计院(中建院等): 建筑专业力70+即可。无脑'改图'，做导师的乖宝宝，选学术或实践导师，稳进。",
    keywords: ["设计院", "传统", "专业", "中建", "怎么进"]
  },
  {
    id: "early_game",
    category: "游戏技巧",
    content: "前期玩法建议(研一): 优先弄清楚自己的路线。如果要转行，尽早开始'学产品'；如果英语基础差且不打算去外企，千万别点'准备雅思'浪费钱和精力。时刻关注导师好感度，低于30就要开始'送礼'或'改图'了。",
    keywords: ["前期", "研一", "开局", "怎么玩", "攻略"]
  },
  {
    id: "mid_game",
    category: "游戏技巧",
    content: "中期玩法建议(研二): 这是拉开差距的关键期。开始'投实习'，不要怕导师扣好感，大厂实习能带来巨大的Buff(声望加成和录取率提升)。如果没钱了，点一两次'做副业'。",
    keywords: ["中期", "研二", "实习", "发展"]
  },
  {
    id: "late_game",
    category: "游戏技巧",
    content: "后期玩法建议(研三): 拼脸的阶段。多点'参加校招'提升表达和人脉。如果有宣讲会特招(字节/腾讯等)一定要满足条件去参加，拿到直通卡等于半只脚踏入大厂。",
    keywords: ["后期", "研三", "校招", "秋招", "宣讲会"]
  }
];

export function searchKnowledge(query: string, topK: number = 3): KnowledgeChunk[] {
  // 极简关键词匹配评分
  const queryWords = query.toLowerCase().split(/[ \t\n,?.!，。？！]+/).filter(w => w.length > 0);
  if (queryWords.length === 0) return [];

  const scored = KNOWLEDGE_BASE.map(chunk => {
    let score = 0;
    const content = chunk.content.toLowerCase();
    
    queryWords.forEach(word => {
      // 匹配关键字
      if (chunk.keywords.some(k => k.toLowerCase().includes(word))) {
        score += 3;
      }
      // 匹配内容
      if (content.includes(word)) {
        score += 1;
      }
    });

    return { chunk, score };
  });

  // 按分数排序并过滤掉0分的
  const results = scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(s => s.chunk);

  return results.slice(0, topK);
}
