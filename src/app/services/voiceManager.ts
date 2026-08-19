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
    const cleanText = text.trim();
    const characterVoices = this.voiceMap[characterId];
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
