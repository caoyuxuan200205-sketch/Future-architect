/**
 * 全局 NPC 语音音效管理器
 * 支持按角色 + 台词文本自动匹配对应的音频文件播放
 */

class VoiceManager {
  private currentAudio: HTMLAudioElement | null = null;
  private volume: number = 1.0;

  /**
   * 静态语音台词映射库：characterId -> { text -> audioUrl }
   * 随着后续生成更多语音，可在此处或通过 registerVoice 添加
   */
  private voiceMap: Record<string, Record<string, string>> = {
    jiang_huai: {
      // 下半身热区
      "喂！那里不行啦……": "/assets/audio/npc/jiang_huai/jh_touch_zone_1.wav",
      "你、你手往哪儿放呢！": "/assets/audio/npc/jiang_huai/jh_touch_zone_2.wav",
      "哈哈哈痒！别闹了别闹了！": "/assets/audio/npc/jiang_huai/jh_touch_zone_3.wav",
      "裤子有什么好戳的啦……变态。": "/assets/audio/npc/jiang_huai/jh_touch_zone_4.wav",
      "再戳我可要脸红了啊……": "/assets/audio/npc/jiang_huai/jh_touch_zone_5.wav",

      // 常规状态全身触摸
      "喂！摸肌肉要收费的啊！": "/assets/audio/npc/jiang_huai/jh_touch_norm_1.wav",
      "哈哈哈别闹，我刚出的汗！": "/assets/audio/npc/jiang_huai/jh_touch_norm_2.wav",
      "怎么，不服？球场单挑去！": "/assets/audio/npc/jiang_huai/jh_touch_norm_3.wav",
      "你这一下，还没我发球力度大。": "/assets/audio/npc/jiang_huai/jh_touch_norm_4.wav",
      "别碰我球拍啊，那可是我的命根子！": "/assets/audio/npc/jiang_huai/jh_touch_norm_5.wav",

      // 恋人状态亲密触摸
      "又偷袭？看我反手一个公主抱！": "/assets/audio/npc/jiang_huai/jh_touch_lover_1.wav",
      "手这么凉？来，塞我队服里暖暖。": "/assets/audio/npc/jiang_huai/jh_touch_lover_2.wav",
      "乖，等我打完这场，带你去吃烤冷面。": "/assets/audio/npc/jiang_huai/jh_touch_lover_3.wav",
      "嘘……别让隔壁床听见，怪不好意思的。": "/assets/audio/npc/jiang_huai/jh_touch_lover_4.wav",

      // 名言与常驻问候
      "天天对着电脑画图脖子不酸吗？走，换上球鞋，跟我去球场打一个小时羽毛球出身汗，我教你杀球！": "/assets/audio/npc/jiang_huai/jh_quote.wav",
      "哟，大建筑师回来啦？看你脸色白得跟纸一样，快吃个鸡腿补充能量！": "/assets/audio/npc/jiang_huai/jh_greet_main.wav",
      "天天对着电脑画图不累吗？走，去球场出身汗！": "/assets/audio/npc/jiang_huai/jh_catchphrase_1.wav",
      "有我罩着你，天塌下来我替你顶着！": "/assets/audio/npc/jiang_huai/jh_catchphrase_2.wav",
      "回来啦？给你带了刚烤好的鸡腿。": "/assets/audio/npc/jiang_huai/jh_catchphrase_3.wav",

      // 初次进入宿舍相遇剧情
      "哟，我们的大建筑师终于舍得从工位回来了？看你这脸色白得跟纸一样，八成又通宵改图没吃晚饭吧。": "/assets/audio/npc/jiang_huai/jh_meet_01.wav",
      "跟我客气什么。以后只要回宿舍，有我罩着你。不管是想吃夜宵还是压力大想去操场暴汗，随时叫我！": "/assets/audio/npc/jiang_huai/jh_meet_02.wav",

      // 研习与生活日常：打羽毛球
      "来！网前小球放得漂亮！看我这记反手后场高远球——接住了！": "/assets/audio/npc/jiang_huai/jh_study_badminton_1.wav",
      "爽吧！以后每周我都带你来打两次，包你身材和精神状态好到飞起！": "/assets/audio/npc/jiang_huai/jh_study_badminton_2.wav",

      // 研习与生活日常：请教力学
      "多大点事。你这是纯剪切滞后效应没考虑进去，在根部加两道暗桁架，钢骨混凝土截面放大 100mm 就搞定了。我直接用 PKPM 帮你验算一遍弯矩图。": "/assets/audio/npc/jiang_huai/jh_study_struct_1.wav",
      "搞定！安全系数拉满了。有我的力学验算给你背书，老齐挑不出半点毛病。": "/assets/audio/npc/jiang_huai/jh_study_struct_2.wav",

      // 研习与生活日常：吃烤冷面
      "老板，两份烤冷面，都加里脊加蛋，微辣！再来两瓶冰可乐！": "/assets/audio/npc/jiang_huai/jh_study_snack_1.wav",
      "瞎操心什么！你有多优秀我天天看在眼里。退一万步讲，天塌下来还有我这个舍友在前面替你顶着呢！吃肉！": "/assets/audio/npc/jiang_huai/jh_study_snack_2.wav",

      // 研习与生活日常：晨跑拉伸
      "大懒虫起床啦！今天早晨空气绝好，跟着我慢跑三公里，整天精神百倍！": "/assets/audio/npc/jiang_huai/jh_study_run_1.wav",
      "那当然，我可是专业私教水准。以后天天早上跟我打卡，把你的肩颈彻底调理好！": "/assets/audio/npc/jiang_huai/jh_study_run_2.wav",

      // 恋爱进阶分支：牵手 (好感 45)
      "给，擦擦汗。刚才那记杀球救得真帅，我都差点没接住。": "/assets/audio/npc/jiang_huai/jh_romance_towel_1.wav",
      "咳……你、你脸红起来的样子……还挺好看的。": "/assets/audio/npc/jiang_huai/jh_romance_towel_2.wav",

      // 恋爱进阶分支：拥抱 (好感 65)
      "过来靠着我打。我体温高，给你当人体恒温靠垫。": "/assets/audio/npc/jiang_huai/jh_romance_back_1.wav",
      "困了就直接睡吧，我就在这儿靠着你，哪儿也不去。": "/assets/audio/npc/jiang_huai/jh_romance_back_2.wav",

      // 恋爱进阶分支：接吻 (好感 80)
      "知不知道你在球场上有多要命？我忍了一整场了。": "/assets/audio/npc/jiang_huai/jh_romance_kiss.wav",

      // 恋爱进阶分支：同床相拥 (好感 95)
      "喂，睡不着？过来我被窝里。": "/assets/audio/npc/jiang_huai/jh_romance_bed_1.wav",
      "不管是读研还是以后去哪个城市，你这辈子都别想甩开我。做我一个人的专属搭子，听到了没？": "/assets/audio/npc/jiang_huai/jh_romance_bed_2.wav",

      // 告白定情大事件
      "同居快两年了，我看过你熬夜改图崩溃大哭，也看过你拿到奖学金傻笑的样子。": "/assets/audio/npc/jiang_huai/jh_confess_intro_1.wav",
      "平时我大大咧咧的，但每次看到你揉太阳穴，我心里就揪得难受。": "/assets/audio/npc/jiang_huai/jh_confess_intro_2.wav",
      "我不想要只做你室友了。做我对象吧！以后你的早饭、夜宵、体力活和所有委屈，我全包了！": "/assets/audio/npc/jiang_huai/jh_confess_intro_3.wav",
      "成交！从今往后你就是我江淮的人了，谁敢在院里欺负你，我第一个找他练练！": "/assets/audio/npc/jiang_huai/jh_confess_accept.wav",
      "行！听你的！反正不管怎么样，哥们永远是你在 502 最硬核的后盾！": "/assets/audio/npc/jiang_huai/jh_confess_reject.wav",

      // 宿舍日常开门小剧场 1（冰可乐）
      "哟，大建筑师回寝室啦！看你这虚脱样，赶快把鞋脱了上床歇会儿。": "/assets/audio/npc/jiang_huai/jh_interact_coke_1.wav",
      "今晚寝室我罩着你，老齐要是半夜催图，我就替你回消息说你睡了！": "/assets/audio/npc/jiang_huai/jh_interact_coke_2.wav",

      // 宿舍日常开门小剧场 2（俯卧撑拉你运动）
      "回来了？走，换身运动服，跟我去操场跑两圈排排毒！天天坐在电脑前骨头都要生锈了。": "/assets/audio/npc/jiang_huai/jh_interact_pushup_1.wav",
      "那我背你去！体能训练一刻也不能落下！": "/assets/audio/npc/jiang_huai/jh_interact_pushup_2.wav",

      // 宿舍日常开门小剧场 3（炸鸡米花）
      "喂，舍友，快来看我刚在食堂抢到的现炸鸡米花！": "/assets/audio/npc/jiang_huai/jh_interact_chicken_1.wav",
      "废话，同居这么久了，我不疼你谁疼你？": "/assets/audio/npc/jiang_huai/jh_interact_chicken_2.wav",
    },

    // 陆予忱（禁欲高智 · 秋招战神）
    lu_yuchen: {
      // 常规立绘触摸
      "请注意你的行为边界。": "/assets/audio/npc/lu_yuchen/lyc_touch_norm_1.wav",
      "……简历改完了吗？": "/assets/audio/npc/lu_yuchen/lyc_touch_norm_2.wav",
      "我的耐心是有置信区间的，建议你先查一下。": "/assets/audio/npc/lu_yuchen/lyc_touch_norm_3.wav",
      "再这样，我要把你从我的最优解里移除了。": "/assets/audio/npc/lu_yuchen/lyc_touch_norm_4.wav",
      "……这次，我当作没发生。": "/assets/audio/npc/lu_yuchen/lyc_touch_norm_5.wav",

      // 恋人立绘亲密触摸
      "……下不为例。": "/assets/audio/npc/lu_yuchen/lyc_touch_lover_1.wav",
      "你现在的心率，已经超出静息阈值了。": "/assets/audio/npc/lu_yuchen/lyc_touch_lover_2.wav",
      "别闹。……不过，手可以牵。": "/assets/audio/npc/lu_yuchen/lyc_touch_lover_3.wav",
      "我的逻辑闭环，遇到你就永远缺一个条件。": "/assets/audio/npc/lu_yuchen/lyc_touch_lover_4.wav",

      // 就业中心开场随机小剧场 1（危地马拉手冲）
      "刚帮两个研三的同学改完外企 Case 框架。你来得正好，我刚冲了一壶危地马拉手冲。": "/assets/audio/npc/lu_yuchen/lyc_interact_coffee_1.wav",
      "坐。今天想聊聊职业路径，还是纯粹想找我坐一会儿？": "/assets/audio/npc/lu_yuchen/lyc_interact_coffee_2.wav",

      // 就业中心开场随机小剧场 2（大厂题库与特供）
      "来得正好。我刚把头部互联网大厂的最新题库做完聚类分析，正打算找你一起复盘。": "/assets/audio/npc/lu_yuchen/lyc_interact_case_1.wav",
      "对其他人是工作，对你……是专属特供。": "/assets/audio/npc/lu_yuchen/lyc_interact_case_2.wav",

      // 就业中心开场随机小剧场 3（关门与期望值达标）
      "门带上吧，今天外面有点吵。": "/assets/audio/npc/lu_yuchen/lyc_interact_door_1.wav",
      "原本有点枯燥，但看到你推门进来的那一刻，今天的期望值已经达标了。": "/assets/audio/npc/lu_yuchen/lyc_interact_door_2.wav",

      // 核心名言与常驻问候
      "投递简历不是概率游戏，而是参数化路径最优解。坐过来，我帮你把底层逻辑重构一遍。": "/assets/audio/npc/lu_yuchen/lyc_quote.wav",
      "“投递简历不是概率游戏，而是参数化路径最优解。坐过来，我帮你把底层逻辑重构一遍。”": "/assets/audio/npc/lu_yuchen/lyc_quote.wav",
      "投递简历不是概率游戏，而是参数化路径最优解。": "/assets/audio/npc/lu_yuchen/lyc_quote.wav",
      "坐过来，我帮你把底层逻辑重构一遍。": "/assets/audio/npc/lu_yuchen/lyc_quote.wav",
      "逻辑闭环了吗？": "/assets/audio/npc/lu_yuchen/lyc_catchphrase_3.wav",
      "以后有大厂笔试、战略案例或者简历问题，随时来就业中心 204 找我。": "/assets/audio/npc/lu_yuchen/lyc_greet_main.wav",

      // 就业中心初遇剧情
      "看第三章的商业拆解模型就行。其他都是给非专业看的废话。": "/assets/audio/npc/lu_yuchen/lyc_meet_01.wav",
      "嗯。以后来就业中心找资料或者改简历，可以直接来 204 工位找我。坐下来聊，效率更高。": "/assets/audio/npc/lu_yuchen/lyc_meet_02.wav",

      // 高智研讨：探讨 AI
      "完全可行。我上个月在 GitHub 上开源了一个 Spatial-Agent 库，底层就是基于多智能体博弈。": "/assets/audio/npc/lu_yuchen/lyc_study_ai_1.wav",
      "这个项目的二作署你的名字吧。未来如果你打算去大厂做 AI 空间算法，这会是你最重磅的背书。": "/assets/audio/npc/lu_yuchen/lyc_study_ai_2.wav",

      // 高智研讨：剖析课题
      "他那是老一辈文人的唯美叙事。来，我电脑里有近代海关地契数据库，我们用数据打他的脸。": "/assets/audio/npc/lu_yuchen/lyc_study_mentor_1.wav",
      "下次开题答辩，把这份数据图表甩出来。有我在后面给你兜底，不用怕他卡你。": "/assets/audio/npc/lu_yuchen/lyc_study_mentor_2.wav",

      // 高智研讨：修改简历
      "好。那我直接说：第一页的空间叙事太冗长，HR 扫一眼只有 6 秒。把‘主导近代建筑空间复原’改成‘通过数字化建模降低 35% 空间冗余度’。": "/assets/audio/npc/lu_yuchen/lyc_study_resume_1.wav",
      "改完之后质感完全不同了。有这份简历在，大厂第一轮简历筛查你不用担心了。": "/assets/audio/npc/lu_yuchen/lyc_study_resume_2.wav",

      // 高智研讨：拆解案例
      "把建筑的剖面思维拿出来——空间有竖向传力，商业也有价值链闭环。你看我画的这个 MECE 决策树。": "/assets/audio/npc/lu_yuchen/lyc_study_case_1.wav",
      "你的悟性比我想象的还要高。这套分析框架你收好，面试遇到任何突发案例，照着这个骨架填肉就行。": "/assets/audio/npc/lu_yuchen/lyc_study_case_2.wav",

      // 恋爱进阶分支：牵手 (好感 45)
      "手腕放松。运笔要稳……像这样，顺着视平线压下去。": "/assets/audio/npc/lu_yuchen/lyc_romance_hand_1.wav",
      "学会了吗？……以后所有的草图，我都亲自手把手教你画。": "/assets/audio/npc/lu_yuchen/lyc_romance_hand_2.wav",

      // 恋爱进阶分支：拥抱 (好感 65)
      "别自己一个人胡思乱想。过来。": "/assets/audio/npc/lu_yuchen/lyc_romance_hug_1.wav",
      "有我在，你绝不可能输。靠着我歇一会儿……就我们两个。": "/assets/audio/npc/lu_yuchen/lyc_romance_hug_2.wav",

      // 恋爱进阶分支：接吻 (好感 80)
      "……知不知道摘我眼镜是要付出代价的？": "/assets/audio/npc/lu_yuchen/lyc_romance_kiss_1.wav",
      "……这是你主动招惹我的。": "/assets/audio/npc/lu_yuchen/lyc_romance_kiss_2.wav",

      // 恋爱进阶分支：终身绑定 (好感 95)
      "别人都在追求概率最大的通用解，但我用所有的数学模型推演过无数遍——": "/assets/audio/npc/lu_yuchen/lyc_romance_promise_1.wav",
      "我人生的全局最优解，从始至终只有你一个。签下我吧，永不违约。": "/assets/audio/npc/lu_yuchen/lyc_romance_promise_2.wav",

      // 告白定情大事件
      "在我的职业模型里，所有的变量都可以被量化、归类和建立回归方程。": "/assets/audio/npc/lu_yuchen/lyc_confess_intro_1.wav",
      "但唯独遇到你之后，我所有的理性逻辑与战略推演……全部失效了。": "/assets/audio/npc/lu_yuchen/lyc_confess_intro_2.wav",
      "我分析过上千份人生路径，但唯一想共同签署的长期合约，只有你。愿意做我的伴侣吗？": "/assets/audio/npc/lu_yuchen/lyc_confess_intro_3.wav",
      "从现在开始，我的时间、资源与所有未来，全部对你终身开放特权。": "/assets/audio/npc/lu_yuchen/lyc_confess_accept.wav",
      "我尊重你的决定。无论如何，只要你在求职或学术上需要指引，我随时为你预留最高优先级。": "/assets/audio/npc/lu_yuchen/lyc_confess_reject.wav",
    },

    // 白栩（软萌正太 · 情绪价值 · 粘人小狗学弟）
    bai_xu: {
      // 常规立绘触摸
      "学长！痒痒！嘿嘿~": "/assets/audio/npc/bai_xu/bx_touch_norm_1.mp3",
      "呜，别戳脸啦，会变大饼脸的！": "/assets/audio/npc/bai_xu/bx_touch_norm_2.mp3",
      "学长是不是饿了？我刚烤了玛德琳，给你拿！": "/assets/audio/npc/bai_xu/bx_touch_norm_3.mp3",
      "学长的手指好长哦……啊，我不是那个意思！": "/assets/audio/npc/bai_xu/bx_touch_norm_4.mp3",
      "嘿嘿，学长是在跟我玩点一点的游戏吗？": "/assets/audio/npc/bai_xu/bx_touch_norm_5.mp3",

      // 恋人立绘亲密触摸
      "学长最好了！再摸一下也可以哦~": "/assets/audio/npc/bai_xu/bx_touch_lover_1.mp3",
      "嘿嘿，被学长逮到了！那我就不跑啦。": "/assets/audio/npc/bai_xu/bx_touch_lover_2.mp3",
      "学长的手心好温暖，想一直被这样摸头~": "/assets/audio/npc/bai_xu/bx_touch_lover_3.mp3",
      "学长学长，我今天超乖的，要奖励！": "/assets/audio/npc/bai_xu/bx_touch_lover_4.mp3",

      // 核心名言与常驻问候
      "学长！你今天终于来咖啡馆自习啦！我特意给你占了窗边阳光最好的位置，快尝尝我帮你点的焦糖海盐热可可！": "/assets/audio/npc/bai_xu/bx_quote.mp3",
      "“学长！你今天终于来咖啡馆自习啦！我特意给你占了窗边阳光最好的位置，快尝尝我帮你点的焦糖海盐热可可！”": "/assets/audio/npc/bai_xu/bx_quote.mp3",
      "学长好！我特意给你占了窗边阳光最好的位置，快尝尝刚出炉的热可可！": "/assets/audio/npc/bai_xu/bx_greet_main.mp3",
      "学长！快尝尝我帮你买的草莓巴斯克！": "/assets/audio/npc/bai_xu/bx_catchphrase_1.mp3",
      "只要学长摸摸头，我再画 100 个大样都没问题！": "/assets/audio/npc/bai_xu/bx_catchphrase_2.mp3",
      "学长你在哪里，我就跟到哪里！": "/assets/audio/npc/bai_xu/bx_catchphrase_3.mp3",

      // 咖啡馆初遇剧情
      "学、学长！你是近代建筑史组的师兄对不对？我在学院的评图展上反复看过你的快题和模型，特别特别崇拜你！": "/assets/audio/npc/bai_xu/bx_meet_01.mp3",
      "我这边刚好占了两个人的大卡座！学长如果不介意的话……可以坐我旁边吗？我刚刚帮你点了刚出炉的草莓巴斯克！": "/assets/audio/npc/bai_xu/bx_meet_02.mp3",
      "嗯！我叫白栩！以后学长在咖啡馆改图累了，我随时帮你跑腿买甜品、借模型工具！请学长多多指教！": "/assets/audio/npc/bai_xu/bx_meet_03.mp3",

      // 咖啡馆开门随机小剧场
      "学长！学长这里！快过来坐！": "/assets/audio/npc/bai_xu/bx_interact_seat_1.mp3",
      "没有没有！我也刚到五分钟！我特意给你霸占了采光最好、有软垫的沙发卡座，还给你点了最爱吃的草莓慕斯！": "/assets/audio/npc/bai_xu/bx_interact_seat_2.mp3",
      "唔……学长摸我头的话，我今天拼模型的速度可以提升 200%！": "/assets/audio/npc/bai_xu/bx_interact_wood_1.mp3",
      "学长，咖啡馆今天放的歌好好听哦……": "/assets/audio/npc/bai_xu/bx_interact_song_1.mp3",
      "因为学长比图纸好看一千倍呀！真想每天都在这里和学长自习一辈子……": "/assets/audio/npc/bai_xu/bx_interact_song_2.mp3",

      // 手作研习：指导快题
      "学长……我这个社区图书馆的立面总觉得呆板，老师说没有韵律感，你能不能帮我指点一下？": "/assets/audio/npc/bai_xu/bx_study_design_1.mp3",
      "哇……！学长你随手改两笔，整个立面一下子活过来了！学长你真的太厉害了，我什么时候才能像你一样棒啊！": "/assets/audio/npc/bai_xu/bx_study_design_2.mp3",

      // 手作研习：拼装模型
      "学长快看！我用 1:100 的椴木板切好了你那套方案的微缩构件，我们一起把它拼出来吧！": "/assets/audio/npc/bai_xu/bx_study_model_1.mp3",
      "因为是学长的方案呀！只要是学长的东西，我都想用全世界最好的手艺把它做成实物！": "/assets/audio/npc/bai_xu/bx_study_model_2.mp3",

      // 手作研习：听他吐槽
      "学长你不知道！今天早八的构造老师让我们手画 50 个不同节点的防水大样，我画到手抽筋，感觉整个人都要融化了呜呜呜……": "/assets/audio/npc/bai_xu/bx_study_complain_1.mp3",
      "嘻嘻！吃到学长的糖，我瞬间又充满电啦！只要学长摸摸头，我再画 100 个大样都没问题！": "/assets/audio/npc/bai_xu/bx_study_complain_2.mp3",

      // 手作研习：交换素材
      "是我自己一张一张勾画修图攒下的‘学弟私房素材库’！学长把 U 盘给我，我全拷给你！": "/assets/audio/npc/bai_xu/bx_study_asset_1.mp3",
      "只要学长喜欢，我以后画的所有新插画和新素材，都第一个打包发给学长！": "/assets/audio/npc/bai_xu/bx_study_asset_2.mp3",

      // 恋爱进阶分支：擦嘴角 (好感 45)
      "唔……这家热可可上的棉花糖好好吃！学长你也尝……啊？": "/assets/audio/npc/bai_xu/bx_romance_wipe_1.mp3",
      "因、因为学长的手指好温柔……心跳突然变得好快……": "/assets/audio/npc/bai_xu/bx_romance_wipe_2.mp3",

      // 恋爱进阶分支：拥抱 (好感 65)
      "学长，我忘带伞了……雨好大，我可以和你撑一把吗？": "/assets/audio/npc/bai_xu/bx_romance_umbrella_1.mp3",
      "学长身上的味道好安心……要是这条路永远走不完就好了。": "/assets/audio/npc/bai_xu/bx_romance_umbrella_2.mp3",

      // 恋爱进阶分支：接吻 (好感 80)
      "学长……你把眼睛闭上三秒钟好不好？我有个特别的惊喜要送给你……": "/assets/audio/npc/bai_xu/bx_romance_kiss_1.mp3",
      "学、学长！我喜欢你！从开学第一眼见到你起就超级超级喜欢你！": "/assets/audio/npc/bai_xu/bx_romance_kiss_2.mp3",

      // 恋爱进阶分支：专属小狗 (好感 95)
      "学长，别人都说读研很苦很累，可是只要每天能见到你，我的世界就像洒满了阳光一样甜。": "/assets/audio/npc/bai_xu/bx_romance_sunset_1.mp3",
      "一言为定！学长是白栩一个人的大设计师，白栩是学长一辈子的粘人小狗，永远永远不分开！": "/assets/audio/npc/bai_xu/bx_romance_sunset_2.mp3",

      // 告白定情大事件
      "学长……我每次借口让你辅导快题、让你帮我拼模型，其实都是我偷偷计划好的。": "/assets/audio/npc/bai_xu/bx_confess_intro_1.mp3",
      "我根本不是什么笨蛋学弟……我只是太想找理由多看学长几眼了。": "/assets/audio/npc/bai_xu/bx_confess_intro_2.mp3",
      "学长，我超级超级喜欢你！你可以……做我的恋人吗？我以后天天做甜品给你吃！": "/assets/audio/npc/bai_xu/bx_confess_intro_3.mp3",
      "哇啊啊学长最好了！我是全天下最幸福的人！我一辈子都不会松开学长的！": "/assets/audio/npc/bai_xu/bx_confess_accept.mp3",
      "嗯！只要学长不讨厌我，愿意继续和我喝咖啡拼模型，我就永远是学长最乖的小学弟！": "/assets/audio/npc/bai_xu/bx_confess_reject.mp3",
    },

    // 学术大牛派导师（如：齐廷宝 · 传统学界泰斗）
    academic: {
      // 4位学术大牛初见剧情专属语音
      "你好，先回答我一个问题——你为什么要来读建筑？想清楚了再回答。": "/assets/audio/npc/academic/ge_meet_01.mp3",
      "坦率地说，我不关心你的分数，也不关心你本科画过多少张图。我关心的只有一件事——你对\"空间\"有没有真正的好奇。可以说，我们是全国最好的建筑学院。如果连我们的学生都只是来混一个学位、混一个饭碗，那这个学科就真的完了。": "/assets/audio/npc/academic/ge_meet_02.mp3",
      "坦率地说，我不关心你的分数，也不关心你本科画过多少张图。我关心的只有一件事——你对“空间”有没有真正的好奇。可以说，我们是全国最好的建筑学院。如果连我们的学生都只是来混一个学位、混一个饭碗，那这个学科就真的完了。": "/assets/audio/npc/academic/ge_meet_02.mp3",
      "我的导师刘先生当年跟我说：研究传统，不是为了复古，而是为了创造性地转化。这句话我送给你。接下来这三年，我不指望你做出什么漂亮的东西——漂亮是最不值钱的。我要你学会一件事：认识\"空\"，认识空间是怎么被分出来的。": "/assets/audio/npc/academic/ge_meet_03.mp3",
      "我的导师刘先生当年跟我说：研究传统，不是为了复古，而是为了创造性地转化。这句话我送给你。接下来这三年，我不指望你做出什么漂亮的东西——漂亮是最不值钱的。我要你学会一件事：认识“空”，认识空间是怎么被分出来的。": "/assets/audio/npc/academic/ge_meet_03.mp3",
      "记住，别学那些只做表皮文章的建筑师——像隈研吾那种，狗屁不通。方法才是你唯一能带走的东西。": "/assets/audio/npc/academic/ge_meet_04.mp3",

      "先考你一个问题——你说你懂斗栱，那我问你：一朵斗栱，是构件，还是空间？": "/assets/audio/npc/academic/qi_meet_01.mp3",
      "答不上来不丢人。坦率地说，模数不是拿来背的数字，而是认识空间的一把尺——你连这把尺都不会用，谈什么做设计？做学问要耐得住寂寞，但更重要的是，你要配得上寂寞。": "/assets/audio/npc/academic/qi_meet_02.mp3",
      "回去把这套铺作拆开、再装回去，装三遍。三遍都装不严丝合缝，下周一别来见我。": "/assets/audio/npc/academic/qi_meet_03.mp3",

      "坐。先回答我一个问题——文献里的\"材分\"，和你在浙西山里亲手摸到的那根柱础，是同一个东西吗？": "/assets/audio/npc/academic/tong_meet_01.mp3",
      "坐。先回答我一个问题——文献里的“材分”，和你在浙西山里亲手摸到的那根柱础，是同一个东西吗？": "/assets/audio/npc/academic/tong_meet_01.mp3",
      "可以说，考据不是查字典，而是用脚去认识一座建筑曾经如何分地。纸上的柱础，和你亲手量过的那根，是两种东西。你的脚踩过它，才有资格在纸上谈论它。": "/assets/audio/npc/academic/tong_meet_02.mp3",
      "坦率地说，我不反对数字工具，但认识\"空\"的功夫，只能在一手材料和现场里磨出来。回去把宋《营造法式》\"材分\"读透，下周带着问题来。": "/assets/audio/npc/academic/tong_meet_03.mp3",
      "坦率地说，我不反对数字工具，但认识“空”的功夫，只能在一手材料和现场里磨出来。回去把宋《营造法式》“材分”读透，下周带着问题来。": "/assets/audio/npc/academic/tong_meet_03.mp3",

      "来了呀。坐。先别急着说\"报到\"两个字——我想先问你：你走进一座明代的殿宇，最先感受到的是什么？是那根柱子，还是柱子之间、被礼制划出来的那个\"空\"？": "/assets/audio/npc/academic/zhu_meet_01.mp3",
      "来了呀。坐。先别急着说“报到”两个字——我想先问你：你走进一座明代的殿宇，最先感受到的是什么？是那根柱子，还是柱子之间、被礼制划出来的那个“空”？": "/assets/audio/npc/academic/zhu_meet_01.mp3",
      "可以说，礼制不是死板的规矩，而是一种分地的方法——它规定了谁站哪里，也就规定了空间如何被秩序化。这幅斗栱，看着是构件，其实是那个时代的人，对\"空\"的一次划分。": "/assets/audio/npc/academic/zhu_meet_02.mp3",
      "可以说，礼制不是死板的规矩，而是一种分地的方法——它规定了谁站哪里，也就规定了空间如何被秩序化。这幅斗栱，看着是构件，其实是那个时代的人，对“空”的一次划分。": "/assets/audio/npc/academic/zhu_meet_02.mp3",
      "坦率地说，我教的不是考据，也不是风格。我希望你读每一份文献时都先问一句：当时的人，为什么要把空间分成这样？带着这个问题，再来找我。": "/assets/audio/npc/academic/zhu_meet_03.mp3",

      // 常规立绘触摸
      "手放好。图纸不会因为你碰它就变好。": "/assets/audio/npc/academic/academic_touch_norm_1.mp3",
      "你的精力若用在文献上，早就开题了。": "/assets/audio/npc/academic/academic_touch_norm_2.mp3",
      "……这次，我当作没看见。": "/assets/audio/npc/academic/academic_touch_norm_3.mp3",
      "有问题用嘴问，不是用手。": "/assets/audio/npc/academic/academic_touch_norm_4.mp3",

      // 禁忌心动深入（好感 ≥ 80 亲密触摸）
      "办公室里……注意影响。": "/assets/audio/npc/academic/academic_touch_intimate_1.mp3",
      "咳。门没锁，你别得寸进尺。": "/assets/audio/npc/academic/academic_touch_intimate_2.mp3",
      "下周一组会你最好准备充分。……还有，咖啡谢谢。": "/assets/audio/npc/academic/academic_touch_intimate_3.mp3",
      "我带过十几个学生，就你最不让人省心。": "/assets/audio/npc/academic/academic_touch_intimate_4.mp3",

      // 核心名言
      "做学问要耐得住寂寞——但更重要的是，你要配得上寂寞。": "/assets/audio/npc/academic/academic_quote.mp3",
      "“做学问要耐得住寂寞——但更重要的是，你要配得上寂寞。”": "/assets/audio/npc/academic/academic_quote.mp3",

      // 办公室学术请教与研讨
      "这份综述把核心脉络理出来了，比上周有长进。记住，文献考据不能只看二手转述，宋代官式形制必须核对一手地方志。回去把这几处注释补齐。": "/assets/audio/npc/academic/academic_study_basic.mp3",
      "你这个问题抓得很准。当年我做这个专题时，也在文献断代上卡了半年。你看这个柱础雕饰与斗栱出跳的比例，其实反映的是明初官营营造厂向民间匠作的过渡……": "/assets/audio/npc/academic/academic_study_deep.mp3",
      "当年我们在浙西大山里测绘古祠堂，连像样的测距仪都没有，全靠皮尺和爬梁。晚上就睡在老乡家的门板上……现在科研条件好了，但那股钻研的劲头千万不能丢。": "/assets/audio/npc/academic/academic_chat_lore.mp3",
      "下半年院里和国家文物局合作的重点修缮项目，我正打算带一两个得力学生进组。你近期的踏实表现我心里有数，把大纲准备好，到时候你做核心成员。": "/assets/audio/npc/academic/academic_opportunity.mp3",

      // 送礼关怀与师德边界剧情
      "你这孩子，心意我领了。平时做科研用脑多，自己也多注意身体。下次组会别空着肚子来，我办公室常备着点心。": "/assets/audio/npc/academic/academic_gift_accept.mp3",
      "我说多少次了，做学问的不搞这些虚的。你要真想感谢我——": "/assets/audio/npc/academic/academic_gift_reject_1.mp3",
      "把下次的开题报告写扎实了。把那几篇罕见文献的出处一个个核对清楚。把你的论证逻辑捋顺，别让我在答辩现场替你圆场——比送什么茶都强。东西拿回去。": "/assets/audio/npc/academic/academic_gift_reject_2.mp3",
      "我跟你说实话——我教了三十年书，没收过学生的现金。但你这学期做的这个宋代柱础断代，确实让我看到了点东西。这个钱我收下，不是因为我需要它，是因为我不想让你难堪。但下一次，别再这样了。": "/assets/audio/npc/academic/academic_cash_accept.mp3",
      "你知不知道你现在的行为，在学校的师德规范里叫什么？这个东西你拿回去。下不为例。我不会记在档案里，但你自己心里要有数。": "/assets/audio/npc/academic/academic_cash_reject.mp3",

      // 禁忌心动攻略分支
      "……奶沫张力不合流体力学规范。不过，下不为例。": "/assets/audio/npc/academic/academic_romance_coffee.mp3",
      "行距调 1.5 倍，手别抖……看着屏幕，别看我。": "/assets/audio/npc/academic/academic_romance_hand.mp3",
      "哭什么。有我给你撑腰，全院没人敢卡你。": "/assets/audio/npc/academic/academic_romance_hug.mp3",
      "你不仅是得意门生，更是我唯一的非理性解。": "/assets/audio/npc/academic/academic_romance_kiss.mp3",
      "恭喜全票优秀答辩。这篇论文无可挑剔。": "/assets/audio/npc/academic/academic_romance_prop_1.mp3",
      "我的未来人生蓝图，你是唯一的终身架构师。": "/assets/audio/npc/academic/academic_romance_prop_2.mp3",
    },

    // 国际海归派导师（如：常彤 / 庄岩松 / 王永和 / 董永辉）
    overseas: {
      // 4位海归派导师初见专属语音
      "欢迎。先问你一个我常问自己的问题——你做的判断，是感受出来的，还是数据逼出来的？": "/assets/audio/npc/overseas/chang_meet_01.mp3",
      "我做的方向，是把城市的\"感觉\"翻译成可以验证的数据。直觉很好，但如果没有数据支撑，直觉就只是运气。": "/assets/audio/npc/overseas/chang_meet_02.mp3",
      "我做的方向，是把城市的“感觉”翻译成可以验证的数据。直觉很好，但如果没有数据支撑，直觉就只是运气。": "/assets/audio/npc/overseas/chang_meet_02.mp3",
      "所以我希望我的学生，既要会看城市，也要会看数据。回去把 Python 和 GIS 的基础补上，我们下学期会做一组真实的城市研究。": "/assets/audio/npc/overseas/chang_meet_03.mp3",
      "所以我希望我的学生，既要会看城市，也要会看数据。回去把 Python和GIS 的基础补上，我们下学期会做一组真实的城市研究。": "/assets/audio/npc/overseas/chang_meet_03.mp3",

      "看到没有——这个曲面，是 2000 根杆件自己\"算\"出来的。数字工具不是让你偷懒，是让你去做手工做不出的空间。": "/assets/audio/npc/overseas/zhuang_meet_01.mp3",
      "看到没有——这个曲面，是 2000 根杆件自己“算”出来的。数字工具不是让你偷懒，是让你去做手工做不出的空间。": "/assets/audio/npc/overseas/zhuang_meet_01.mp3",
      "我下周带一组学生去巴塞罗那做学术考察，看高迪、看 Mies。但记住——工具再酷，最终考验的还是你对空间有没有判断。": "/assets/audio/npc/overseas/zhuang_meet_02.mp3",
      "回去先把 Grasshopper 基础跑起来，下个月我要看到你的第一个\"会呼吸\"的模型。": "/assets/audio/npc/overseas/zhuang_meet_03.mp3",
      "回去先把 Grasshopper 基础跑起来，下个月我要看到你的第一个“会呼吸”的模型。": "/assets/audio/npc/overseas/zhuang_meet_03.mp3",

      "Hi，请坐。别太拘谨——在进入课题前，我先问你一个 simple question：你觉得建筑学是一种技术，还是一种“世界语”（Universal Language）？": "/assets/audio/npc/overseas/wang_meet_01.mp3",
      "Hi，请坐。别太拘谨——在进入课题前，我先问你一个 simple question：你觉得建筑学是一种技术，还是一种“世界语”？": "/assets/audio/npc/overseas/wang_meet_01.mp3",
      "可以说，不同地域的建筑是不同的方言，但空间能唤起的情感和身体体验是相通的。我不希望你被某种狭隘的传统符号框住，也不要盲目崇拜参数化炫技。": "/assets/audio/npc/overseas/wang_meet_02.mp3",
      "坦率地说，读研三年，我要你建立的是一套能与全球顶级学者无障碍对话的批判性思维。先把 Tschumi 的文本读透，下周 Studio 见。": "/assets/audio/npc/overseas/wang_meet_03.mp3",

      "坐。你见过每天吞吐十万人的航站楼吧？你说，这种超级大空间的“建筑灵魂”，是藏在大跨度屋顶下，还是藏在人流与行李的精确重组里？": "/assets/audio/npc/overseas/dong_meet_01.mp3",
      "坐。你见过每天吞吐十万人的航站楼吧？你说，这种超级大空间的\"建筑灵魂\"，是藏在大跨度屋顶下，还是藏在人流与行李的精确重组里？": "/assets/audio/npc/overseas/dong_meet_01.mp3",
      "传统建筑学总爱沉溺在小品式的自我感动里。但真正的现代文明，是由机场、高铁站这些巨型机器驱动的。我们要研究的是复杂系统的秩序。": "/assets/audio/npc/overseas/dong_meet_02.mp3",
      "跟着我做研究，格局要放大。把这篇流动空间拓扑学论文读完，下周我们讨论课题切入点。": "/assets/audio/npc/overseas/dong_meet_03.mp3",

      // 常规立绘触摸
      "Excuse me？注意一下 office etiquette。": "/assets/audio/npc/overseas/overseas_touch_norm_1.mp3",
      "在国外的 lab，这样是要发邮件道歉的。": "/assets/audio/npc/overseas/overseas_touch_norm_2.mp3",
      "哈哈，你们年轻人真是有意思。": "/assets/audio/npc/overseas/overseas_touch_norm_3.mp3",
      "Sorry，我的 personal space 可是有红线的。": "/assets/audio/npc/overseas/overseas_touch_norm_4.mp3",

      // 禁忌心动深入（好感 ≥ 80 亲密触摸）
      "Shh……隔壁办公室的 colleague 还在。": "/assets/audio/npc/overseas/overseas_touch_intimate_1.mp3",
      "你让我想起我在剑桥带过最调皮的学生……也是我现在的偏心。": "/assets/audio/npc/overseas/overseas_touch_intimate_2.mp3",
      "Well……coffee break 时间，可以陪你十分钟。": "/assets/audio/npc/overseas/overseas_touch_intimate_3.mp3",
      "Keep this between us，好吗？": "/assets/audio/npc/overseas/overseas_touch_intimate_4.mp3",

      // 核心名言
      "建筑是一种语言——问题在于，你想说哪种方言？还是想学会世界语？": "/assets/audio/npc/overseas/overseas_quote.mp3",
      "“建筑是一种语言——问题在于，你想说哪种方言？还是想学会世界语？”": "/assets/audio/npc/overseas/overseas_quote.mp3",

      // 送礼关怀与师生边界剧情
      "好。我收下。 不是因为这是一盒茶——是因为你愿意跨过那种\"师生边界感\"来跟我表达尊重。我知道这对你来说不容易，我也知道在中国语境里这意味着什么。": "/assets/audio/npc/overseas/overseas_gift_accept_1.mp3",
      "好。我收下。不是因为这是一盒茶——是因为你愿意跨过那种‘师生边界感’来跟我表达尊重。我知道这对你来说不容易，我也知道在中国语境里这意味着什么。": "/assets/audio/npc/overseas/overseas_gift_accept_1.mp3",
      "下次我请组里同学一起喝茶——我来煮，你来讲讲你家乡的茶文化怎么样？I'm serious, 这可以是我们下次 studio 的一个 warm-up。": "/assets/audio/npc/overseas/overseas_gift_accept_2.mp3",
      "Hmm…thanks, but we don't really do this in my group. 我比较习惯就事论事，你把研究做好我就很欣慰了——这个你拿回去吧，别让我为难。": "/assets/audio/npc/overseas/overseas_gift_reject.mp3",
      "Listen, in my group, we keep it professional. But… I can see you're not trying to buy anything. I'll take it this once. Next time, if you want to thank me, bring me a really good question, not an envelope. Deal?": "/assets/audio/npc/overseas/overseas_cash_accept.mp3",
      "I'm going to pretend I didn't see this. Take it back. Now. And please—don't ever do this again.": "/assets/audio/npc/overseas/overseas_cash_reject.mp3",
    },

    // 自由放养派导师（如：钱晓茜 / 李诸葛 / 沈剑葳 / 冷冬青）
    hands_off: {
      // 4位放养派导师初见专属语音
      "欢迎呀。先喝咖啡——我这儿没什么上下级，倒是常有跨学科的朋友过来聊天。": "/assets/audio/npc/hands_off/qian_meet_01.mp3",
      "我最近在想：建筑生的那套空间思维，能不能拿去跟数据、跟 AI、跟社会学的工具杂交？真正的创新，往往发生在学科的交叉点上。": "/assets/audio/npc/hands_off/qian_meet_02.mp3",
      "我最近在想：建筑生的那套空间思维，能不能拿去跟数据、跟AI、跟社会学的工具杂交？真正的创新，往往发生在学科的交叉点上。": "/assets/audio/npc/hands_off/qian_meet_02.mp3",
      "所以我不会规定你做什么。你去处一个让你兴奋的交叉点，找到了来告诉我。找不到，就多来喝两杯咖啡。": "/assets/audio/npc/hands_off/qian_meet_03.mp3",

      "打扰什么，我这儿最欢迎学生来喝茶。来，边喝边说——你最近在看什么？不是论文，是那种让你舍不得放下的事。": "/assets/audio/npc/hands_off/li_meet_01.mp3",
      "我不喜欢\"标准做法\"。地方营造、非标准设计，都靠一个东西：你对这块地方、这群人有没有真感情。没有感情的方案，做出来也是死的。": "/assets/audio/npc/hands_off/li_meet_02.mp3",
      "我不喜欢“标准做法”。地方营造、非标准设计，都靠一个东西：你对这块地方、这群人有没有真感情。没有感情的方案，做出来也是死的。": "/assets/audio/npc/hands_off/li_meet_02.mp3",
      "这样，这周你自己去逛一个你平时不会去的地方，回来跟我讲讲\"为什么是它\"。讲不出来也没关系，喝茶。": "/assets/audio/npc/hands_off/li_meet_03.mp3",
      "这样，这周你自己去逛一个你平时不会去的地方，回来跟我讲讲“为什么是它”。讲不出来也没关系，喝茶。": "/assets/audio/npc/hands_off/li_meet_03.mp3",

      "嘘……先闭上眼睛，听十秒钟。除了蝉鸣和风声，你还听到了什么？": "/assets/audio/npc/hands_off/shen_meet_01.mp3",
      "空间不仅是被\"看\"到的，更是被身体\"听\"到的。一堵砖墙和一扇木窗，对声波的漫反射截然不同。建筑学一直太视觉中心主义了。": "/assets/audio/npc/hands_off/shen_meet_02.mp3",
      "空间不仅是被“看”到的，更是被身体“听”到的。一堵砖墙和一扇木窗，对声波的漫反射截然不同。建筑学一直太视觉中心主义了。": "/assets/audio/npc/hands_off/shen_meet_02.mp3",
      "拿去，去校园里采集三种最让你心动的空间声景，下周我们聊聊怎么把声音转化为平面。": "/assets/audio/npc/hands_off/shen_meet_03.mp3",

      "坐。如果一栋建筑不能在人的记忆里留下一场梦，那它就只是一堆终将风化的钢筋混凝土，不是吗？": "/assets/audio/npc/hands_off/leng_meet_01.mp3",
      "形式会过时，功能会演变，唯有空间对时间的铭刻是永恒的。我希望你不要急着画出漂亮的图纸，先想清楚你想通过空间讲述什么故事。": "/assets/audio/npc/hands_off/leng_meet_02.mp3",
      "回去看完这部电影，写一篇关于'空间与记忆'的随笔，随时发我邮箱。": "/assets/audio/npc/hands_off/leng_meet_03.mp3",
      "回去看完这部电影，写一篇关于‘空间与记忆’的随笔，随时发我邮箱。": "/assets/audio/npc/hands_off/leng_meet_03.mp3",

      // 常规立绘触摸
      "嗯？有事儿说事儿。": "/assets/audio/npc/hands_off/handsoff_touch_norm_1.mp3",
      "年轻人精力是真旺盛啊。": "/assets/audio/npc/hands_off/handsoff_touch_norm_2.mp3",
      "别戳了，我这外套挺贵的。": "/assets/audio/npc/hands_off/handsoff_touch_norm_3.mp3",
      "怎么，又缺经费了？": "/assets/audio/npc/hands_off/handsoff_touch_norm_4.mp3",

      // 禁忌心动深入（好感 ≥ 80 亲密触摸）
      "行了行了，被人看见我这老脸往哪搁。": "/assets/audio/npc/hands_off/handsoff_touch_intimate_1.mp3",
      "你啊……比我当年胆子大多了。": "/assets/audio/npc/hands_off/handsoff_touch_intimate_2.mp3",
      "今晚有空的话……算了，先把你的图改完。": "/assets/audio/npc/hands_off/handsoff_touch_intimate_3.mp3",
      "我这人散漫，但你的事，我记着呢。": "/assets/audio/npc/hands_off/handsoff_touch_intimate_4.mp3",

      // 核心名言
      "我不需要管你——但你需要对你自己负责。做不到的话，门在那边。": "/assets/audio/npc/hands_off/handsoff_quote.mp3",
      "“我不需要管你——但你需要对你自己负责。做不到的话，门在那边。”": "/assets/audio/npc/hands_off/handsoff_quote.mp3",

      // 送礼关怀与师生边界剧情
      "嚯，这包装挺讲究啊。你这孩子倒是会挑——行，我收了，正好今天这杯手冲冲砸了。": "/assets/audio/npc/hands_off/handsoff_gift_accept_1.mp3",
      "坐一会儿？ 我刚煮上水，咱俩一起喝一杯。你最近那个跨学科的方向想得怎么样了？别跟我客气，自己找地方坐——地上也行，我这儿本来就没什么规矩。": "/assets/audio/npc/hands_off/handsoff_gift_accept_2.mp3",
      "坐一会儿？我刚煮上水，咱俩一起喝一杯。你最近那个跨学科的方向想得怎么样了？别跟我客气，自己找地方坐——地上也行，我这儿本来就没什么规矩。": "/assets/audio/npc/hands_off/handsoff_gift_accept_2.mp3",
      "加。当然加。你以为我做放养型是因为懒？ 是因为我知道你们这一代人要做的建筑，不能再只靠类型学和功能流线了——你得自己去找交叉点。你今天的茶，换这杯 talk，值。": "/assets/audio/npc/hands_off/handsoff_gift_accept_3.mp3",
      "加。当然加。你以为我做放养型是因为懒？是因为我知道你们这一代人要做的建筑，不能再只靠类型学和功能流线了——你得自己去找交叉点。你今天的茶，换这杯 talk，值。": "/assets/audio/npc/hands_off/handsoff_gift_accept_3.mp3",
      "哎呀你这孩子客气啥，自己留着用。咱们组不兴这些——赶紧回去忙吧。": "/assets/audio/npc/hands_off/handsoff_gift_reject.mp3",
      "哎呀你这孩子客气啥，自己留着用。咱们组不兴这些，你把项目做出来就是给我最好的礼物——行了行了，赶紧回去忙吧。": "/assets/audio/npc/hands_off/handsoff_gift_reject.mp3",
      "那我就不推了——但我跟你说，咱们组靠的是你自己做出东西，不是这些。下次好好做项目，比什么都强。": "/assets/audio/npc/hands_off/handsoff_cash_accept.mp3",
      "等等等等——这个数字你认真的？这已经不是我能不能收的问题了，是我要不要提醒你\"你在做什么\"的问题。拿回去。": "/assets/audio/npc/hands_off/handsoff_cash_reject.mp3",
      "等等等等——这个数字你认真的？这已经不是我能不能收的问题了，是我要不要提醒你‘你在做什么’的问题。拿回去。": "/assets/audio/npc/hands_off/handsoff_cash_reject.mp3",
    },

    // 产学研实务派导师（如：钟建国 / 程恺 / 何建民 / 柳岩松）
    practice: {
      // 4位实务派导师初见专属语音
      "来了？会画图吗——我问的不是 CAD，是会用红铅笔圈问题吗？": "/assets/audio/npc/practice/zhong_meet_01.mp3",
      "会一点可不够。图纸上的每一根线，落到工地上都是真金白银和工人的汗。你画错一笔，别人要白干一天。": "/assets/audio/npc/practice/zhong_meet_02.mp3",
      "不过别怕，实务这行，都是跑工地跑出来的。下次我去项目现场盯节点，你跟着——让你看看甲方是怎么把方案一点点\"磨\"成现实的。": "/assets/audio/npc/practice/zhong_meet_03.mp3",
      "不过别怕，实务这行，都是跑工地跑出来的。下次我去项目现场盯节点，你跟着——让你看看甲方是怎么把方案一点点“磨”成现实的。": "/assets/audio/npc/practice/zhong_meet_03.mp3",

      "来了呀。伸手摸摸这块混凝土——感受到了吗？这种粗糙却有秩序的触感，是电脑屏幕渲染永远给不了的。": "/assets/audio/npc/practice/cheng_meet_01.mp3",
      "做工程实务不是让你向商业妥协，而是教你如何在最严苛的造价和工期约束下，把高品质的空间和材质硬生生抠出来。": "/assets/audio/npc/practice/cheng_meet_02.mp3",
      "这顶帽子你收好。下周美术馆主体结构封顶，跟着我一起上脚手架验筋去！": "/assets/audio/npc/practice/cheng_meet_03.mp3",

      "坐。我先问你：很多学生自诩‘大设计师’，但连最基本的剪刀梯疏散宽度和喷淋排烟管井都没概念。你觉得没有技术支撑的方案是什么？": "/assets/audio/npc/practice/he_meet_01.mp3",
      "坐。我先问你：很多学生自诩\"大设计师\"，但连最基本的剪刀梯疏散宽度和喷淋排烟管井都没概念。你觉得没有技术支撑的方案是什么？": "/assets/audio/npc/practice/he_meet_01.mp3",
      "所有的诗意和流线，都必须长在严丝合缝的技术骨架上。做实务，安全和规范是第一道红线，碰了就要坐牢。": "/assets/audio/npc/practice/he_meet_02.mp3",
      "拿去，找出这版方案里隐藏的 3 处消防与柱网硬伤，明天上午交给我。": "/assets/audio/npc/practice/he_meet_03.mp3",

      "欢迎！如今的大型公建早就不是一个人拿铅笔就能画完的时代了。现代大建筑师的核心壁垒是系统协同、数据逻辑与接口管控。": "/assets/audio/npc/practice/liu_meet_01.mp3",
      "我们的模型精确到每一根螺栓和角钢。只要一处管线打架，现场就要停工返工。": "/assets/audio/npc/practice/liu_meet_02.mp3",
      "账号密码发你微信了。下周直接进项目组协助做管综消碰撞，用实战把你的数字化能力拉满！": "/assets/audio/npc/practice/liu_meet_03.mp3",

      // 常规立绘触摸
      "干嘛？工地上可没人惯着你。": "/assets/audio/npc/practice/practice_touch_norm_1.mp3",
      "手闲就去画两个大样。": "/assets/audio/npc/practice/practice_touch_norm_2.mp3",
      "行了，回去干活。": "/assets/audio/npc/practice/practice_touch_norm_3.mp3",
      "这点小动作，甲方桌上见多了。": "/assets/audio/npc/practice/practice_touch_norm_4.mp3",

      // 禁忌心动深入（好感 ≥ 80 亲密触摸）
      "胆子不小，敢在办公室动手动脚。": "/assets/audio/npc/practice/practice_touch_intimate_1.mp3",
      "……就这一次，下不为例。": "/assets/audio/npc/practice/practice_touch_intimate_2.mp3",
      "等这个项目结了，再说你的事。": "/assets/audio/npc/practice/practice_touch_intimate_3.mp3",
      "我做事讲效率——你要说什么，直接点。": "/assets/audio/npc/practice/practice_touch_intimate_4.mp3",

      // 核心名言
      "推荐信没用——我直接给你介绍个人。你让他看看你的图。": "/assets/audio/npc/practice/practice_quote.mp3",
      "“推荐信没用——我直接给你介绍个人。你让他看看你的图。”": "/assets/audio/npc/practice/practice_quote.mp3",

      // 送礼关怀与实务江湖剧情
      "哟，明前的？ 你这孩子倒是有心。": "/assets/audio/npc/practice/practice_gift_accept_1.mp3",
      "哟，明前的？你这孩子倒是有心。": "/assets/audio/npc/practice/practice_gift_accept_1.mp3",
      "行，这个我收着——正好这两天跟甲方扯皮扯得嗓子疼。我跟你说，做实务这一行，最缺的就是这种\"有人想着你\"的感觉。你懂吧？": "/assets/audio/npc/practice/practice_gift_accept_2.mp3",
      "行，这个我收着——正好这两天跟甲方扯皮扯得嗓子疼。我跟你说，做实务这一行，最缺的就是这种‘有人想着你’的感觉。你懂吧？": "/assets/audio/npc/practice/practice_gift_accept_2.mp3",
      "别老带东西啊，又不是走亲戚——哎对，下周三那个文化中心中期汇报，你跟着我来，让你看看甲方是怎么\"温柔地\"撕方案的。": "/assets/audio/npc/practice/practice_gift_accept_3.mp3",
      "别老带东西啊，又不是走亲戚——哎对，下周三那个文化中心中期汇报，你跟着我来，让你看看甲方是怎么‘温柔地’撕方案的。": "/assets/audio/npc/practice/practice_gift_accept_3.mp3",
      "你这心意我领了，但这玩意儿真没必要。我跟甲方打了这么多年交道，送的东西比这贵重多了我都退回去——咱们之间，把活干漂亮比啥都强。": "/assets/audio/npc/practice/practice_gift_reject.mp3",
      "行，这个情我领了。下次甲方又改需求，你别自己一个人扛，来找我。咱们做实务的，就是靠这种信任。": "/assets/audio/npc/practice/practice_cash_accept.mp3",
      "你这个数字……你知不知道这已经不是\"心意\"了？我跟甲方打了这么多年交道，收到这种金额是要写检讨的。把它拿走，下次别再这样。": "/assets/audio/npc/practice/practice_cash_reject.mp3",
      "你这个数字……你知不知道这已经不是‘心意’了？我跟甲方打了这么多年交道，收到这种金额是要写检讨的。把它拿走，下次别再这样。": "/assets/audio/npc/practice/practice_cash_reject.mp3",
    },

    // 沈清淮（温润儒雅 · 手绘速写大师 · 治愈系白月光学长）
    shen_qinghuai: {
      // 常规立绘触摸
      "嘘……特藏区要保持安静。": "/assets/audio/npc/shen_qinghuai/sqh_touch_norm_1.mp3",
      "嗯？我袖口是沾了墨渍吗？": "/assets/audio/npc/shen_qinghuai/sqh_touch_norm_2.mp3",
      "别闹，这份手稿要被你碰皱了。": "/assets/audio/npc/shen_qinghuai/sqh_touch_norm_3.mp3",
      "你呀，坐下来，我陪你翻完这一册。": "/assets/audio/npc/shen_qinghuai/sqh_touch_norm_4.mp3",
      "窗外梧桐正好看，你却在看我？": "/assets/audio/npc/shen_qinghuai/sqh_touch_norm_5.mp3",

      // 恋人立绘亲密触摸
      "你呀……真是拿你没办法。": "/assets/audio/npc/shen_qinghuai/sqh_touch_lover_1.mp3",
      "手心痒了？我用钢笔给你画一朵小花。": "/assets/audio/npc/shen_qinghuai/sqh_touch_lover_2.mp3",
      "再这样，我可要把你画进速写本私藏了。": "/assets/audio/npc/shen_qinghuai/sqh_touch_lover_3.mp3",
      "窗外有人在呢……靠近一点再说。": "/assets/audio/npc/shen_qinghuai/sqh_touch_lover_4.mp3",

      // 核心名言与常驻问候
      "近代建筑的每一道砖石缝隙，都藏着时间的记忆。坐下吧，这本晚清洋行测绘孤本，我刚向特藏馆借出来，正好和你一起看。": "/assets/audio/npc/shen_qinghuai/sqh_quote.mp3",
      "“近代建筑的每一道砖石缝隙，都藏着时间的记忆。坐下吧，这本晚清洋行测绘孤本，我刚向特藏馆借出来，正好和你一起看。”": "/assets/audio/npc/shen_qinghuai/sqh_quote.mp3",
      "你来了。这本刚从特藏馆调出来的近代建筑手稿，正好和你一起看。": "/assets/audio/npc/shen_qinghuai/sqh_greet_main.mp3",
      "别急，坐下来，我慢慢讲给你听。": "/assets/audio/npc/shen_qinghuai/sqh_catchphrase_1.mp3",
      "今天有空一起去图书馆自习吗？": "/assets/audio/npc/shen_qinghuai/sqh_catchphrase_2.mp3",

      // 初遇剧情
      "同学也是来查近代营造厂档案的吗？我是研二的沈清淮。这几本特藏文献借阅手续比较繁琐，我已经办好了阅览权限，过来一起看吧。": "/assets/audio/npc/shen_qinghuai/sqh_meet_01.mp3",
      "别客气。近代建筑史的文献考据很花功夫，一个人翻容易枯燥。以后在图书馆如果遇到什么难点，随时来这个靠窗的位置找我。": "/assets/audio/npc/shen_qinghuai/sqh_meet_02.mp3",

      // 图书馆开门随机小剧场
      "你来了。脚步放轻，过来坐我身边。": "/assets/audio/npc/shen_qinghuai/sqh_interact_tea_1.mp3",
      "特藏室今天人不多，很安静。今天有什么文献想和我一起看吗？": "/assets/audio/npc/shen_qinghuai/sqh_interact_tea_2.mp3",
      "随手勾的……觉得你在认真画图时的神态很好看，就忍不住画下来了。": "/assets/audio/npc/shen_qinghuai/sqh_interact_sketch_1.mp3",
      "近代建筑史的文献繁多复杂，不要着急，慢工出细活。": "/assets/audio/npc/shen_qinghuai/sqh_interact_time_1.mp3",
      "能在这个安静的角落陪着你，也是我一天里最期待的时刻。": "/assets/audio/npc/shen_qinghuai/sqh_interact_time_1.mp3",

      // 研习日常：手绘速写
      "把铅笔稍微放平一点，用手腕带动手掌，像这样轻轻铺一道斜排线。你看，石材雕刻的立体感立刻就出来了。": "/assets/audio/npc/shen_qinghuai/sqh_study_sketch_1.mp3",
      "你的结构抓得很准，手感极佳。多画几次，线条会比我更有灵气。": "/assets/audio/npc/shen_qinghuai/sqh_study_sketch_2.mp3",

      // 研习日常：借阅古籍
      "这是古籍部的非卖善本，我已经用课题权限调出来了。翻阅时戴上白手套，慢慢看，里面有几处手绘节点非常罕见。": "/assets/audio/npc/shen_qinghuai/sqh_study_rare_1.mp3",
      "能和你一起研读这些沉睡的文献，感觉整个下午都变得格外充实。": "/assets/audio/npc/shen_qinghuai/sqh_study_rare_2.mp3",

      // 研习日常：文献断代
      "你看图纸右下角的水印纸厂标号，这家造纸工坊只在 1902 至 1908 年间运营；再结合工部局的地税编码，断代范围可以精准锁定在 1905 年前后。": "/assets/audio/npc/shen_qinghuai/sqh_study_dating_1.mp3",
      "做历史考据就像做侦探，每一次抽丝剥茧找到真相，都是对历史最好的致敬。": "/assets/audio/npc/shen_qinghuai/sqh_study_dating_2.mp3",

      // 研习日常：自习陪伴
      "看你揉了好几次太阳穴，别太紧绷。喝口茶歇一歇，累了就靠着椅子闭目养神，我帮你看包。": "/assets/audio/npc/shen_qinghuai/sqh_study_quiet_1.mp3",
      "只要你愿意，以后我身边的这个座位，一直都留给你。": "/assets/audio/npc/shen_qinghuai/sqh_study_quiet_2.mp3",

      // 恋爱进阶分支：牵手 (好感 45)
      "你的手很软……如果不介意的话，就这样看吧，我来替你翻页。": "/assets/audio/npc/shen_qinghuai/sqh_romance_hand_1.mp3",
      "近代建筑的每一道砖石缝隙，都比不过你此刻掌心的温度。": "/assets/audio/npc/shen_qinghuai/sqh_romance_hand_2.mp3",

      // 恋爱进阶分支：拥抱 (好感 65)
      "傻瓜，做学术怎么可能一帆风顺。有我在，你不用一个人扛着所有压力。": "/assets/audio/npc/shen_qinghuai/sqh_romance_hug_1.mp3",
      "靠在我身上歇一会儿吧……有我在，什么都不用怕。": "/assets/audio/npc/shen_qinghuai/sqh_romance_hug_2.mp3",

      // 恋爱进阶分支：接吻 (好感 80)
      "今天在画本上画了一下午的建筑，但其实每一笔……心里想的都是你。": "/assets/audio/npc/shen_qinghuai/sqh_romance_kiss_1.mp3",
      "……知不知道，克制自己不去吻你，是我做过最难的课题。": "/assets/audio/npc/shen_qinghuai/sqh_romance_kiss_2.mp3",

      // 恋爱进阶分支：专属越界 (好感 95)
      "今晚不想再给你讲古建了。比起图纸上的尺度……我更想知道，你允许我靠近到什么程度。": "/assets/audio/npc/shen_qinghuai/sqh_romance_close_1.mp3",
      "不用承诺以后，也不必做到最后。只要你点头……今晚让我用别的方式，好好照顾你。": "/assets/audio/npc/shen_qinghuai/sqh_romance_close_2.mp3",

      // 告白定情大事件
      "古建筑在风雨里能伫立数百年，靠的是每一道榫卯结构的严丝合缝与彼此成全。": "/assets/audio/npc/shen_qinghuai/sqh_confess_intro_1.mp3",
      "以前我以为我的余生只会和这些冰冷的石材文献度过，直到你在那个午后走进了这里。": "/assets/audio/npc/shen_qinghuai/sqh_confess_intro_2.mp3",
      "这幅画的名字叫《余生所向》。你愿意……成为我生命里唯一的白月光与相守之人吗？": "/assets/audio/npc/shen_qinghuai/sqh_confess_intro_3.mp3",
      "得你相伴，是我这一生读过最美、也最想用一生守护的篇章。": "/assets/audio/npc/shen_qinghuai/sqh_confess_accept.mp3",
      "知己亦是极好的缘分。这本速写本依然留给你，无论何时，我身边的座位永远为你留着。": "/assets/audio/npc/shen_qinghuai/sqh_confess_reject.mp3",
    },

    // 张一帆（阳光清爽 · 建模鬼才 · 甜系同门）
    zhang_yifan: {
      // 常规立绘触摸
      "别闹，大家都看着呢。": "/assets/audio/npc/zhang_yifan/zyf_touch_norm_1.mp3",
      "哥哥！别戳啦，我的冰美式要洒了！": "/assets/audio/npc/zhang_yifan/zyf_touch_norm_2.mp3",
      "再闹，我就把你的轴网偷偷改成异形曲面哦？": "/assets/audio/npc/zhang_yifan/zyf_touch_norm_3.mp3",
      "诶嘿嘿……手怎么凉凉的，是不是又熬夜画图了？": "/assets/audio/npc/zhang_yifan/zyf_touch_norm_4.mp3",
      "哎呀，鼠标都要被你抢走了啦！": "/assets/audio/npc/zhang_yifan/zyf_touch_norm_5.mp3",

      // 恋人立绘亲密触摸
      "唔……这里可是 302 工作室诶。": "/assets/audio/npc/zhang_yifan/zyf_touch_lover_1.mp3",
      "再戳就要收费了哦，一杯生椰拿铁，谢谢哥哥。": "/assets/audio/npc/zhang_yifan/zyf_touch_lover_2.mp3",
      "乖啦，今晚陪你通宵改图好不好？": "/assets/audio/npc/zhang_yifan/zyf_touch_lover_3.mp3",
      "被你这样看着，我连 Grasshopper 都要接错线了……": "/assets/audio/npc/zhang_yifan/zyf_touch_lover_4.mp3",

      // 腰胯专属热区（带点撩的涩感反应）
      "哥哥……手放哪呢，我会当真的哦。": "/assets/audio/npc/zhang_yifan/zyf_touch_zone_1.mp3",
      "这里不行啦……会被路过的同门看到的。": "/assets/audio/npc/zhang_yifan/zyf_touch_zone_2.mp3",
      "再闹……今晚的图，我可就贴着画了。": "/assets/audio/npc/zhang_yifan/zyf_touch_zone_3.mp3",
      "再摸！再摸就大了！": "/assets/audio/npc/zhang_yifan/zyf_touch_zone_4.mp3",
      "唔……再往下，就要收费了——收你一辈子那种。": "/assets/audio/npc/zhang_yifan/zyf_touch_zone_5.mp3",

      // 核心名言与常驻问候
      "哥哥，方案改累了就歇会儿！我刚点了两杯生椰拿铁，顺便帮你看看这版复杂的异形悬挑节点！": "/assets/audio/npc/zhang_yifan/zyf_quote.mp3",
      "“哥哥，方案改累了就歇会儿！我刚点了两杯生椰拿铁，顺便帮你看看这版复杂的异形悬挑节点！”": "/assets/audio/npc/zhang_yifan/zyf_quote.mp3",
      "哥哥你来啦！方案改累了就歇会儿，我刚点了两杯生椰拿铁！": "/assets/audio/npc/zhang_yifan/zyf_greet_main.mp3",
      "哥哥，方案改累了就歇会儿！": "/assets/audio/npc/zhang_yifan/zyf_catchphrase_1.mp3",
      "天塌下来有我陪你一起挨训。": "/assets/audio/npc/zhang_yifan/zyf_catchphrase_2.mp3",
      "要不我们一起熬？": "/assets/audio/npc/zhang_yifan/zyf_catchphrase_3.mp3",

      // 中大院 302 工位开门随机小剧场
      "哥哥你来啦！快坐快坐，我刚点了一杯生椰拿铁，特意让店员加了双份浓缩，分你半杯！": "/assets/audio/npc/zhang_yifan/zyf_interact_coffee_1.mp3",
      "今天有什么想一起研究的？不管改图还是摸鱼，我都奉陪到底！": "/assets/audio/npc/zhang_yifan/zyf_interact_coffee_2.mp3",
      "隔壁组全被导师叫去开批斗会了，就剩我在这里守家！": "/assets/audio/npc/zhang_yifan/zyf_interact_snack_1.mp3",
      "趁老齐还没突击检查，快补充点糖分！看你最近眼圈都熬黑了，心疼死我了。": "/assets/audio/npc/zhang_yifan/zyf_interact_snack_2.mp3",
      "哥哥你看天边的晚霞，颜色像不像我们上次调的参数化渐变曲面？": "/assets/audio/npc/zhang_yifan/zyf_interact_sunset_1.mp3",
      "因为只要和你坐在一起，连对着电脑改图都觉得特别浪漫嘛。": "/assets/audio/npc/zhang_yifan/zyf_interact_sunset_2.mp3",

      // 研习日常：探讨方案
      "哥哥你把椅子挪过来点！你看——如果把核心筒往右微调 500mm，整个采光中庭的动线瞬间通透了。我顺便用 GH 帮你跑个日照模拟！": "/assets/audio/npc/zhang_yifan/zyf_study_design_1.mp3",
      "搞定啦！渲染图也帮你跑好了。怎么样，我们俩的组合是不是天下第一？": "/assets/audio/npc/zhang_yifan/zyf_study_design_2.mp3",

      // 研习日常：吐槽导师
      "哈哈哈哈他也给你发了？！他昨晚还私聊催我交结构验算，我直接把手机反扣装死！来，快喝口冰美式消消火！": "/assets/audio/npc/zhang_yifan/zyf_study_complain_1.mp3",
      "没事的哥哥，天塌下来有我陪你一起挨训。有你在组里，熬夜画图都没那么难熬了。": "/assets/audio/npc/zhang_yifan/zyf_study_complain_2.mp3",

      // 研习日常：大厂模面
      "问对人啦！我这周刚好整理了一份《建筑空间思维转译互联网产品模型白皮书》，我当面试官，咱们先来一轮 1v1 模拟！": "/assets/audio/npc/zhang_yifan/zyf_study_interview_1.mp3",
      "哥哥你刚才那个‘空间体验即用户心智’的回答太绝了！这套真题原稿全发你网盘了，秋招我们一起上岸！": "/assets/audio/npc/zhang_yifan/zyf_study_interview_2.mp3",

      // 研习日常：调试电池
      "哇真的吗！哥哥你什么时候连 Python 代码都写得这么溜了……快坐过来教教我！": "/assets/audio/npc/zhang_yifan/zyf_study_script_1.mp3",
      "跑通了！哥哥你怎么什么都会啊……突然觉得有你在身边，心里特别有安全感。": "/assets/audio/npc/zhang_yifan/zyf_study_script_2.mp3",

      // 恋爱进阶分支：牵手 (好感 45)
      "啊……不好意思哥哥，我不是故意……": "/assets/audio/npc/zhang_yifan/zyf_romance_hand_1.mp3",
      "哥哥……你的手好暖和。那……就这么牵着改图，不准松开哦。": "/assets/audio/npc/zhang_yifan/zyf_romance_hand_2.mp3",

      // 恋爱进阶分支：拥抱 (好感 65)
      "辛苦啦哥哥。站起来伸展一下，借你一个‘无限续航能量抱抱’要不要？": "/assets/audio/npc/zhang_yifan/zyf_romance_hug_1.mp3",
      "感受到了吗？我的心跳。不管未来做建筑还是去大厂，只要你需要，我随时都在这里给你靠着。": "/assets/audio/npc/zhang_yifan/zyf_romance_hug_2.mp3",

      // 恋爱进阶分支：亲脸颊 (好感 80)
      "哥哥你快看这个剖面透视！我加了一道漫反射天光，这里的阴影层次是不是特性感……唔？！": "/assets/audio/npc/zhang_yifan/zyf_romance_kiss_1.mp3",
      "笨蛋……那、那下次要亲……至少提前告诉我一声，让我有个心理准备呀……": "/assets/audio/npc/zhang_yifan/zyf_romance_kiss_2.mp3",

      // 恋爱进阶分支：深情定情 (好感 95)
      "哥哥，你知道吗？从开学第一天在导师门外见到你起，我就没想过只当你的普通同门。": "/assets/audio/npc/zhang_yifan/zyf_romance_promise_1.mp3",
      "一言为定……不管是毕业设计还是大厂 Offer，我的未来里永远都有你的位置。": "/assets/audio/npc/zhang_yifan/zyf_romance_promise_2.mp3",
    },
  };

  /**
   * 注册单条语音
   */
  public registerVoice(characterId: string, text: string, audioUrl: string) {
    if (!this.voiceMap[characterId]) {
      this.voiceMap[characterId] = {};
    }
    this.voiceMap[characterId][text.trim()] = audioUrl;
  }

  /**
   * 根据角色 ID 和当前台词文本自动播放对应的语音（支持精准匹配与去除括号动作后的模糊匹配）
   */
  public playVoiceByText(characterId?: string, text?: string): boolean {
    if (!characterId || !text) return false;
    let normId = characterId;
    if (normId === "global_scholar") normId = "overseas";
    if (normId === "industry") normId = "practice";
    if (normId === "lab_senior") normId = "shen_qinghuai";
    if (normId === "peer") normId = "zhang_yifan";
    const cleanText = text.trim();
    const characterVoices = this.voiceMap[normId];
    if (!characterVoices) return false;

    // 1. 精确匹配
    let audioUrl = characterVoices[cleanText];

    // 2. 去除开头的动作括号（例如 "（他笑着...）爽吧！..." -> "爽吧！..."）
    if (!audioUrl) {
      const strippedAction = cleanText.replace(/^[（(][^）)]*[）)]\s*/, "").trim();
      audioUrl = characterVoices[strippedAction];
    }

    // 3. 包含匹配
    if (!audioUrl) {
      for (const [key, url] of Object.entries(characterVoices)) {
        if (cleanText.includes(key) || key.includes(cleanText)) {
          audioUrl = url;
          break;
        }
      }
    }

    if (!audioUrl) return false;

    this.playAudio(audioUrl);
    return true;
  }

  /**
   * 直接播放指定路径的音频
   */
  public playAudio(audioUrl: string) {
    // 1. 打断并停止上一个正在播放的音频
    this.stop();

    try {
      const audio = new Audio(audioUrl);
      audio.volume = this.volume;
      this.currentAudio = audio;

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          // 浏览器自动播放策略或缺失文件时的静默容错
          console.warn("[VoiceManager] 音频播放受阻或失败:", audioUrl, err);
        });
      }

      audio.onended = () => {
        if (this.currentAudio === audio) {
          this.currentAudio = null;
        }
      };
    } catch (e) {
      console.error("[VoiceManager] 播放异常:", e);
    }
  }

  /**
   * 停止当前播放的语音
   */
  public stop() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
  }

  /**
   * 设置全局语音音量 (0.0 ~ 1.0)
   */
  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.currentAudio) {
      this.currentAudio.volume = this.volume;
    }
  }
}

export const voiceManager = new VoiceManager();
