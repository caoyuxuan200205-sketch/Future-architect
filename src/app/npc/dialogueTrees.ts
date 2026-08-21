/**
 * 对话树注册表（DialogueTree Registry）
 * P0 一期内容：professor 5 棵 + 其他 3 个 NPC 各 2 棵
 *
 * 设计原则：
 * 1. 每棵树是一个微型剧本，有起承转合，不是无限循环
 * 2. oneShot 默认 true，关键剧情不可重复
 * 3. 关键选项设置 anchorFlag，影响结局判定
 * 4. statEffects 让对话直接改变玩家属性，产生实质后果
 */
import type { DialogueTree } from "./types";

export const DIALOGUE_TREES: Record<string, DialogueTree> = {
  // ================================================================
  // 🏛️ Professor（学校导师）— 5 棵对话树
  // ================================================================

  /** 1. 开场白（替代原 PROFESSOR_OPENING_DIALOGUE） */
  prof_opening: {
    id: "prof_opening",
    npcId: "professor",
    trigger: { type: "unlock" },
    startNodeId: "start",
    oneShot: true,
    nodes: {
      start: {
        id: "start",
        npcMessage:
          "你来了。这一届新生里，你的履历我看了——不算差，但也谈不上惊艳。接下来这三年你想做什么，现在就可以说。我不喜欢绕弯子。",
        tone: "neutral",
        options: [
          {
            id: "humble",
            text: "老师好，我还差得很远，想跟您多学点东西。",
            favorDelta: 2,
            responseTone: "neutral",
            nextNodeId: "humble_reply",
          },
          {
            id: "clear",
            text: "我有想法了，想做数字化方向的课题。",
            favorDelta: 1,
            responseTone: "neutral",
            nextNodeId: "clear_reply",
          },
          {
            id: "bold",
            text: "说实话，我还没想好。",
            favorDelta: -1,
            responseTone: "cold",
            nextNodeId: "bold_reply",
          },
        ],
      },
      humble_reply: {
        id: "humble_reply",
        npcMessage:
          "嗯。知道自己差，比不知道强。论文方向我这周会发你一份清单，你先读起来。",
        tone: "neutral",
        options: [
          {
            id: "humble_ack",
            text: "好的老师，我认真读。",
            favorDelta: 1,
            setAnchorFlags: ["professor_good_start"],
            // 无 nextNodeId → 对话结束
          },
        ],
      },
      clear_reply: {
        id: "clear_reply",
        npcMessage:
          "数字化？说具体的——别用这种大词糊弄我。你回去写一页纸的提案再来找我。",
        tone: "neutral",
        options: [
          {
            id: "clear_ack",
            text: "好的，我下周给您提案。",
            favorDelta: 1,
            setAnchorFlags: ["professor_topic_clear"],
          },
        ],
      },
      bold_reply: {
        id: "bold_reply",
        npcMessage:
          "没想好就回去想。我的办公室不是用来发呆的——下周同一时间，我要听到你的答案。",
        tone: "cold",
        options: [
          {
            id: "bold_ack",
            text: "（默默点头）",
            favorDelta: 0,
            statEffects: { selfDoubt: 2 },
          },
        ],
      },
    },
  },

  /** 2. 期中谈话（研一上第 4 回合触发） */
  prof_midterm_review: {
    id: "prof_midterm_review",
    npcId: "professor",
    trigger: { type: "round", round: 4 },
    startNodeId: "ask",
    oneShot: true,
    nodes: {
      ask: {
        id: "ask",
        npcMessage:
          "坐。开学两个月了，我问你一句实话——最近状态怎么样？别跟我打官腔。",
        tone: "polite",
        options: [
          {
            id: "good",
            text: "还行，正在跟进您给的论文清单。",
            favorDelta: 1,
            responseTone: "polite",
            nextNodeId: "good_follow",
          },
          {
            id: "struggle",
            text: "说实话，有点跟不上。",
            favorDelta: 0,
            statEffects: { selfDoubt: 3 },
            responseTone: "neutral",
            nextNodeId: "struggle_follow",
          },
          {
            id: "hide",
            text: "都挺好的老师。",
            favorDelta: -1,
            responseTone: "cold",
            nextNodeId: "hide_follow",
          },
        ],
      },
      good_follow: {
        id: "good_follow",
        npcMessage:
          "嗯，我看你最近交的东西确实在往前走。但别满足于'还行'——'还行'在学术界等于'平庸'。",
        tone: "polite",
        options: [
          {
            id: "good_push",
            text: "我会更努力的。",
            favorDelta: 1,
            statEffects: { arch: 2 },
          },
          {
            id: "good_curious",
            text: "老师觉得我应该往哪个方向深挖？",
            favorDelta: 2,
            setAnchorFlags: ["professor_guidance_asked"],
          },
        ],
      },
      struggle_follow: {
        id: "struggle_follow",
        npcMessage:
          "跟不上是正常的。但我更想知道——你是真的想跟上来，还是已经在心里打了退堂鼓？",
        tone: "neutral",
        options: [
          {
            id: "struggle_want",
            text: "我想跟上，请您多指点。",
            favorDelta: 2,
            setAnchorFlags: ["professor_willing_to_learn"],
          },
          {
            id: "struggle_honest",
            text: "老师，其实我最近在想……我是不是真的适合读研。",
            favorDelta: -1,
            setAnchorFlags: ["professor_doubt_expressed"],
            statEffects: { selfDoubt: 4 },
          },
        ],
      },
      hide_follow: {
        id: "hide_follow",
        npcMessage:
          "都挺好？那我下次组会随机点你，看你是不是都挺好。回去吧。",
        tone: "cold",
        options: [
          {
            id: "hide_ack",
            text: "（点头离开）",
            favorDelta: 0,
            statEffects: { stress: -3 },
          },
        ],
      },
    },
  },

  /** 3. 毕业方向抉择（研一下第 2 回合触发，关键剧情） */
  prof_career_direction: {
    id: "prof_career_direction",
    npcId: "professor",
    trigger: { type: "round", round: 6 },
    startNodeId: "ask",
    oneShot: true,
    nodes: {
      ask: {
        id: "ask",
        npcMessage:
          "坐。今天不谈论文，谈点正经的——毕业之后，你到底想干嘛？",
        tone: "polite",
        options: [
          {
            id: "pivot",
            text: "老师，我想去互联网做产品。",
            favorDelta: 0,
            setAnchorFlags: ["wants_pivot"],
            nextNodeId: "pivot_q",
          },
          {
            id: "phd",
            text: "我想读博，继续深造。",
            favorDelta: 3,
            setAnchorFlags: ["wants_phd"],
            nextNodeId: "phd_q",
          },
          {
            id: "design",
            text: "我可能还是回设计院。",
            favorDelta: -1,
            setAnchorFlags: ["wants_design"],
            nextNodeId: "design_q",
          },
          {
            id: "undecided",
            text: "老师，说实话我还没想好。",
            favorDelta: -2,
            statEffects: { selfDoubt: 3 },
            nextNodeId: "undecided_q",
          },
        ],
      },
      pivot_q: {
        id: "pivot_q",
        npcMessage:
          "互联网？你凭什么？你最近半年做了什么和产品有关的事？",
        tone: "neutral",
        options: [
          {
            id: "pivot_proof",
            text: "我做了 XX 项目，学了 YY，正在准备相关实习。",
            favorDelta: 2,
            statEffects: { logic: 3, expression: 1 },
            setAnchorFlags: ["professor_acknowledged_pivot"],
          },
          {
            id: "pivot_prepare",
            text: "我还在准备阶段。",
            favorDelta: -1,
            statEffects: { selfDoubt: 5 },
            nextNodeId: "pivot_push",
          },
          {
            id: "pivot_defend",
            text: "老师，您觉得我不行吗？",
            favorDelta: -3,
            setAnchorFlags: ["professor_doubt_conflict"],
            nextNodeId: "pivot_push",
          },
        ],
      },
      pivot_push: {
        id: "pivot_push",
        npcMessage:
          "行，我知道了。但你给我记住——这行没那么好进。你要是真想转，就别只停在嘴上。",
        tone: "neutral",
        options: [
          {
            id: "pivot_push_ack",
            text: "我知道了老师。",
            favorDelta: 1,
          },
        ],
      },
      phd_q: {
        id: "phd_q",
        npcMessage:
          "读博？你这股劲头我看得出来。但你得想清楚——这是七年的事，不是三年。",
        tone: "warm",
        options: [
          {
            id: "phd_sure",
            text: "我想清楚了。",
            favorDelta: 3,
            setAnchorFlags: ["professor_phd_offer"],
          },
          {
            id: "phd_hesitate",
            text: "其实我也还在犹豫。",
            favorDelta: -1,
            statEffects: { selfDoubt: 2 },
          },
        ],
      },
      design_q: {
        id: "design_q",
        npcMessage:
          "回设计院也行。但你这几年学的逻辑、表达、思考方式，都白费了？",
        tone: "cold",
        options: [
          {
            id: "design_not_waste",
            text: "不算白费，是一种积累。",
            favorDelta: 1,
          },
          {
            id: "design_doubt",
            text: "我也不知道算不算白费。",
            favorDelta: 0,
            statEffects: { selfDoubt: 3 },
          },
        ],
      },
      undecided_q: {
        id: "undecided_q",
        npcMessage:
          "没想好就回去想。但我提醒你——等到研三才想清楚，就晚了。",
        tone: "neutral",
        options: [
          {
            id: "undecided_ack",
            text: "老师说得对，我会尽快想清楚。",
            favorDelta: 0,
          },
        ],
      },
    },
  },

  /** 4. 好感≥60 里程碑：约咖啡聊读博 */
  prof_favor_60: {
    id: "prof_favor_60",
    npcId: "professor",
    trigger: { type: "milestone", milestoneFavor: 60 },
    startNodeId: "invite",
    oneShot: true,
    nodes: {
      invite: {
        id: "invite",
        npcMessage:
          "你最近状态不错。下周三下午有空吗？我想找你聊聊——不谈论文，谈点别的。",
        tone: "warm",
        options: [
          {
            id: "accept",
            text: "好的老师，我有空。",
            favorDelta: 1,
            nextNodeId: "coffee",
          },
          {
            id: "decline",
            text: "老师抱歉，我下周有事。",
            favorDelta: -2,
          },
        ],
      },
      coffee: {
        id: "coffee",
        npcMessage:
          "我跟你说个事——其实我一直觉得你有读博的潜质。你愿意的话，我可以推荐你继续深造。",
        tone: "warm",
        options: [
          {
            id: "phd_yes",
            text: "老师，我愿意好好考虑。",
            favorDelta: 2,
            setAnchorFlags: ["professor_phd_offer"],
          },
          {
            id: "pivot_explain",
            text: "老师，谢谢您。但我心里其实更想去业界。",
            favorDelta: 0,
            setAnchorFlags: ["professor_understand_pivot"],
          },
          {
            id: "still_thinking",
            text: "老师，我还在想毕业方向。",
            favorDelta: 0,
          },
        ],
      },
    },
  },

  /** 5. 好感≤15 最后通牒 */
  prof_low_warning: {
    id: "prof_low_warning",
    npcId: "professor",
    trigger: { type: "milestone", milestoneFavor: 15 },
    startNodeId: "warning",
    oneShot: true,
    nodes: {
      warning: {
        id: "warning",
        npcMessage:
          "我们认识这么久了，我跟你说句实话——你再这样下去，我没办法继续带你。你自己想想。",
        tone: "cold",
        options: [
          {
            id: "apologize",
            text: "老师，对不起，我会调整状态。",
            favorDelta: 3,
            statEffects: { stress: -5, selfDoubt: 3 },
          },
          {
            id: "defend",
            text: "老师，我觉得我已经尽力了。",
            favorDelta: -2,
            setAnchorFlags: ["professor_conflict_escalated"],
            statEffects: { stress: -8 },
          },
          {
            id: "silent",
            text: "（沉默）",
            favorDelta: -1,
            statEffects: { selfDoubt: 5 },
          },
        ],
      },
    },
  },

  // ================================================================
  // 🎓 Lab Senior（专硕学长 · 沈清淮）— 2 棵对话树
  // ================================================================

  /** 1. 解锁首聊：八卦 + 实习线索 */
  senior_gossip_1: {
    id: "senior_gossip_1",
    npcId: "lab_senior",
    trigger: { type: "unlock" },
    startNodeId: "greet",
    oneShot: true,
    nodes: {
      greet: {
        id: "greet",
        npcMessage:
          "哎你就是新来的那个？我跟你说，组里那个谁最近被导师骂得不行……算了不说了。你最近想干啥？",
        tone: "polite",
        options: [
          {
            id: "ask_intern",
            text: "学长，我想去实习，有没有推荐？",
            favorDelta: 2,
            setAnchorFlags: ["senior_intern_hint"],
            nextNodeId: "intern_tip",
          },
          {
            id: "ask_academic",
            text: "我想多读点论文，您有什么建议？",
            favorDelta: 1,
            nextNodeId: "academic_tip",
          },
          {
            id: "gossip_back",
            text: "组里那个谁到底怎么了？",
            favorDelta: 1,
            nextNodeId: "gossip_back_reply",
          },
        ],
      },
      intern_tip: {
        id: "intern_tip",
        npcMessage:
          "实习啊……我记得 XX 厂有个岗位挺适合建筑背景的，我朋友圈发过。你去找找，找不到再问我。",
        tone: "polite",
        options: [
          {
            id: "thanks",
            text: "谢谢学长！我去看看。",
            favorDelta: 1,
            statEffects: { expression: 1 },
          },
        ],
      },
      academic_tip: {
        id: "academic_tip",
        npcMessage:
          "论文的话，先从近五年的顶刊看起。我们组那个谁最近在读 XXX，你可以跟他聊聊。",
        tone: "polite",
        options: [
          {
            id: "academic_thanks",
            text: "好的，我去找他。",
            favorDelta: 1,
            statEffects: { arch: 1 },
          },
        ],
      },
      gossip_back_reply: {
        id: "gossip_back_reply",
        npcMessage:
          "（凑近）我跟你说啊，他上周组会直接被导师问哭了。所以你以后组会一定要准备好，不然下场跟他一样。",
        tone: "polite",
        options: [
          {
            id: "gossip_warn_ack",
            text: "（点头）我记住了。",
            favorDelta: 2,
            statEffects: { stress: -2 },
          },
        ],
      },
    },
  },

  /** 2. 好感≥60 里程碑：内推机会 */
  senior_favor_60: {
    id: "senior_favor_60",
    npcId: "lab_senior",
    trigger: { type: "milestone", milestoneFavor: 60 },
    startNodeId: "offer",
    oneShot: true,
    nodes: {
      offer: {
        id: "offer",
        npcMessage:
          "我跟你说个事——我朋友在那家 XX 公司，最近在招人。你要不要我帮你内推？",
        tone: "warm",
        options: [
          {
            id: "accept_push",
            text: "学长真的太感谢了！",
            favorDelta: 2,
            setAnchorFlags: ["senior_inner_push"],
            statEffects: { expression: 2 },
          },
          {
            id: "polite_decline",
            text: "谢谢学长，但我想自己试试。",
            favorDelta: -1,
          },
        ],
      },
    },
  },

  // ================================================================
  // 📐 Peer（同门张一帆）— 2 棵对话树
  // ================================================================

  /** 1. 首次见面 */
  peer_first_meet: {
    id: "peer_first_meet",
    npcId: "peer",
    trigger: { type: "unlock" },
    startNodeId: "meet",
    oneShot: true,
    nodes: {
      meet: {
        id: "meet",
        npcMessage: "你也在这组？那以后一起混吧。你最近在忙啥？",
        tone: "neutral",
        options: [
          {
            id: "reading",
            text: "在跟导师给的论文清单。",
            favorDelta: 1,
            nextNodeId: "reading_reply",
          },
          {
            id: "exploring",
            text: "还在摸索阶段，你呢？",
            favorDelta: 2,
            nextNodeId: "exploring_reply",
          },
          {
            id: "nothing",
            text: "也没啥特别的事。",
            favorDelta: -1,
            nextNodeId: "nothing_reply",
          },
        ],
      },
      reading_reply: {
        id: "reading_reply",
        npcMessage:
          "哦？导师给你清单了？那我借来看看呗，我也想跟上进度。",
        tone: "neutral",
        options: [
          {
            id: "share",
            text: "好啊，我发你。",
            favorDelta: 2,
            setAnchorFlags: ["peer_shared_resource"],
          },
          {
            id: "hesitate",
            text: "这个……我还在看，看完再说？",
            favorDelta: -1,
            statEffects: { selfDoubt: 1 },
          },
        ],
      },
      exploring_reply: {
        id: "exploring_reply",
        npcMessage:
          "我也在摸索。不过我跟你说，我已经开始准备实习的事了——早准备总是没错的。",
        tone: "neutral",
        options: [
          {
            id: "curious_intern",
            text: "实习？你怎么准备的？",
            favorDelta: 2,
            setAnchorFlags: ["peer_intern_aware"],
            statEffects: { logic: 1 },
          },
          {
            id: "calm",
            text: "不急吧，才研一。",
            favorDelta: -1,
          },
        ],
      },
      nothing_reply: {
        id: "nothing_reply",
        npcMessage: "行吧。有事找我。",
        tone: "neutral",
        options: [
          {
            id: "nothing_ack",
            text: "好的。",
            favorDelta: 0,
          },
        ],
      },
    },
  },

  /** 2. 暗示比较（研一上第 3 回合触发） */
  peer_comparison: {
    id: "peer_comparison",
    npcId: "peer",
    trigger: { type: "round", round: 3 },
    startNodeId: "compare",
    oneShot: true,
    nodes: {
      compare: {
        id: "compare",
        npcMessage:
          "哎，我跟你说个事——我那篇综述初稿导师说可以了，你那边进展咋样？",
        tone: "neutral",
        options: [
          {
            id: "behind",
            text: "我还在改……",
            favorDelta: 0,
            statEffects: { selfDoubt: 4, logic: 2 },
            nextNodeId: "behind_reply",
          },
          {
            id: "same_pace",
            text: "差不多进度。",
            favorDelta: 1,
            nextNodeId: "same_reply",
          },
          {
            id: "honest",
            text: "我还没开始写。",
            favorDelta: -1,
            statEffects: { selfDoubt: 5 },
            nextNodeId: "honest_reply",
          },
        ],
      },
      behind_reply: {
        id: "behind_reply",
        npcMessage: "没事，慢慢来。有不懂的可以问我。",
        tone: "neutral",
        options: [
          {
            id: "thanks_peer",
            text: "谢谢，我会的。",
            favorDelta: 2,
          },
        ],
      },
      same_reply: {
        id: "same_reply",
        npcMessage: "哦？那挺好。我还以为只有我熬夜了。",
        tone: "neutral",
        options: [
          {
            id: "same_ack",
            text: "哈哈，一起加油。",
            favorDelta: 1,
          },
        ],
      },
      honest_reply: {
        id: "honest_reply",
        npcMessage: "……那你抓紧吧。下周组会导师肯定要问。",
        tone: "cold",
        options: [
          {
            id: "honest_panic",
            text: "（心头一紧）好的我今晚就开始。",
            favorDelta: 0,
            statEffects: { stress: -3, arch: 1 },
          },
        ],
      },
    },
  },

  // ================================================================
  // 🌳 College Friend（本科好友顾小北）— 2 棵对话树
  // ================================================================

  /** 1. 叙旧 */
  friend_catch_up: {
    id: "friend_catch_up",
    npcId: "college_friend",
    trigger: { type: "unlock" },
    startNodeId: "greet",
    oneShot: true,
    nodes: {
      greet: {
        id: "greet",
        npcMessage:
          "好久不见啊！听说你读研了，怎么样？还适应吗？",
        tone: "polite",
        options: [
          {
            id: "fine",
            text: "还行，在慢慢适应。",
            favorDelta: 1,
            nextNodeId: "fine_reply",
          },
          {
            id: "complain",
            text: "别提了，累得要死。",
            favorDelta: 2,
            statEffects: { stress: 3 },
            nextNodeId: "complain_reply",
          },
          {
            id: "honest_busy",
            text: "挺忙的，但有收获。",
            favorDelta: 1,
            nextNodeId: "busy_reply",
          },
        ],
      },
      fine_reply: {
        id: "fine_reply",
        npcMessage:
          "那就好。我跟你说，工作之后你会发现，读研那段日子其实是最纯粹的。",
        tone: "polite",
        options: [
          {
            id: "fine_curious",
            text: "你那边工作怎么样？",
            favorDelta: 2,
            nextNodeId: "work_share",
          },
          {
            id: "fine_ack",
            text: "是啊，我现在也慢慢体会到了。",
            favorDelta: 1,
          },
        ],
      },
      complain_reply: {
        id: "complain_reply",
        npcMessage:
          "哈哈我就知道。但你听我一句——累是暂时的，关键是别把自己弄丢了。",
        tone: "polite",
        options: [
          {
            id: "complain_thanks",
            text: "谢谢你这话。",
            favorDelta: 2,
            statEffects: { selfDoubt: -2 },
          },
        ],
      },
      busy_reply: {
        id: "busy_reply",
        npcMessage: "有收获就好。有空出来吃个饭？",
        tone: "polite",
        options: [
          {
            id: "accept_meal",
            text: "好啊，约时间。",
            favorDelta: 2,
            setAnchorFlags: ["friend_meal_plan"],
            statEffects: { stress: 3 },
          },
          {
            id: "too_busy",
            text: "最近太忙，下次吧。",
            favorDelta: -1,
          },
        ],
      },
      work_share: {
        id: "work_share",
        npcMessage:
          "我啊，就是打工呗。但你别说，我最近也在想，当初为什么没跟你一样去读研。",
        tone: "polite",
        options: [
          {
            id: "encourage",
            text: "工作也挺好的，至少赚钱了。",
            favorDelta: 1,
            statEffects: { selfDoubt: -1 },
          },
          {
            id: "comfort",
            text: "你想读的话以后也可以。",
            favorDelta: 2,
          },
        ],
      },
    },
  },

  /** 2. 好感≥60 深夜长谈（降 selfDoubt） */
  friend_favor_60_emotional: {
    id: "friend_favor_60_emotional",
    npcId: "college_friend",
    trigger: { type: "milestone", milestoneFavor: 60 },
    startNodeId: "late_night",
    oneShot: true,
    nodes: {
      late_night: {
        id: "late_night",
        npcMessage:
          "哎这么晚还没睡？我也睡不着。说吧，最近是不是扛不住了？",
        tone: "warm",
        options: [
          {
            id: "open_up",
            text: "其实……我最近确实有点迷茫。",
            favorDelta: 3,
            statEffects: { selfDoubt: -8, stress: 5 },
            nextNodeId: "open_up_reply",
          },
          {
            id: "deny",
            text: "没有啊，挺好的。",
            favorDelta: -1,
          },
        ],
      },
      open_up_reply: {
        id: "open_up_reply",
        npcMessage:
          "我跟你说个事——你现在纠结的所有事，三年后回头看都不算事。信我。",
        tone: "warm",
        options: [
          {
            id: "believe",
            text: "谢谢你，我会记住的。",
            favorDelta: 3,
            statEffects: { selfDoubt: -5 },
            setAnchorFlags: ["friend_emotional_anchor"],
          },
          {
            id: "cant_believe",
            text: "但是我现在真的很难受。",
            favorDelta: 1,
            statEffects: { selfDoubt: -3 },
          },
        ],
      },
    },
  },

  // ================================================================
  // 🚨 隐藏彩蛋：狂发打招呼触发导师爆发（professor_storm_out）
  // ================================================================

  /**
   * 触发条件：单回合连续打招呼 ≥5 次
   * 由 sendGreeting 内部检测计数后调用 triggerDialogueTree 手动触发
   * oneShot=false，允许复现（但触发后会进入冷却期）
   */
  professor_storm_out: {
    id: "professor_storm_out",
    npcId: "professor",
    trigger: { type: "manual" },
    startNodeId: "storm_start",
    oneShot: false,
    nodes: {
      storm_start: {
        id: "storm_start",
        npcMessage:
          "（导师把你叫到了办公室。他合上笔记本电脑，盯了你足足五秒钟。）\n\n「你今天给我发了五条消息。五条。」\n\n「我是你导师，不是你的微信机器人。你有什么事，一次性说清楚；没事，就回去做你该做的事。」\n\n「再这样下去，我会怀疑你是不是不适合做研究。」",
        tone: "cold",
        options: [
          {
            id: "apologize",
            text: "对不起老师，我太紧张了，以后不会了。",
            favorDelta: -2,
            statEffects: { selfDoubt: 8 },
            setAnchorFlags: ["prof_storm_apologize"],
            nextNodeId: "apologize_reply",
          },
          {
            id: "defend",
            text: "老师我只是想多跟您交流……",
            favorDelta: -5,
            statEffects: { selfDoubt: 12, logic: -2 },
            setAnchorFlags: ["prof_storm_defend"],
            nextNodeId: "defend_reply",
          },
          {
            id: "silent",
            text: "（沉默，低头不说话）",
            favorDelta: -3,
            statEffects: { selfDoubt: 10 },
            setAnchorFlags: ["prof_storm_silent"],
            nextNodeId: "silent_reply",
          },
        ],
      },
      apologize_reply: {
        id: "apologize_reply",
        npcMessage:
          "（导师叹了口气，语气缓和了一些。）\n\n「紧张我理解。但研究生最忌讳的就是焦虑驱动的无效动作。」\n\n「回去想清楚自己要什么，再来找我。别再用消息数量刷存在感了。」",
        tone: "cold",
        options: [
          {
            id: "agree",
            text: "我明白了，谢谢老师。",
            favorDelta: 1,
            nextNodeId: null,
          },
          {
            id: "ask",
            text: "那我应该怎么跟您交流比较好？",
            favorDelta: 2,
            statEffects: { logic: 1 },
            nextNodeId: null,
          },
        ],
      },
      defend_reply: {
        id: "defend_reply",
        npcMessage:
          "（导师眉头拧得更紧。）\n\n「交流？你这叫骚扰。」\n\n「我带过十几个学生，没有一个像你这样。你要是觉得委屈，可以去找副院长反映——但我的建议是：先把你的论文方向想清楚。」\n\n「出去吧。这周不用来找我了。」",
        tone: "cold",
        options: [
          {
            id: "leave",
            text: "（退出办公室，轻轻关上门）",
            favorDelta: -3,
            statEffects: { selfDoubt: 15 },
            nextNodeId: null,
          },
        ],
      },
      silent_reply: {
        id: "silent_reply",
        npcMessage:
          "（长时间的沉默。导师靠在椅背上，手指敲着桌面。）\n\n「……行。你不想说话，那我说。」\n\n「研究不是靠发消息做出来的。你回去，把你这一周读过的文献列一个清单发我——用一封邮件，不是五条微信。」\n\n「能做到吗？」",
        tone: "cold",
        options: [
          {
            id: "nod",
            text: "（点头）能。",
            favorDelta: 0,
            statEffects: { selfDoubt: 5, logic: 1 },
            nextNodeId: null,
          },
          {
            id: "shake",
            text: "（摇头）我……我做不到。",
            favorDelta: -5,
            statEffects: { selfDoubt: 20 },
            setAnchorFlags: ["prof_storm_breakdown"],
            nextNodeId: null,
          },
        ],
      },
    },
  },
};
