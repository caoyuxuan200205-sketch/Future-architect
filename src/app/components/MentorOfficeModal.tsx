import React, { useState, useEffect } from "react";
import {
  GraduationCap,
  Sparkles,
  BookOpen,
  Coffee,
  Gift,
  Award,
  ChevronRight,
  ChevronDown,
  X,
  Heart,
  Quote,
  CheckCircle2,
  XCircle,
  AlertCircle,
  MessageSquare,
  Compass,
} from "lucide-react";
import {
  getMentorOfficeProfile,
  generateOfficeDialogueOptions,
  rollMentorPresence,
  rollGiftRejection,
  rollCashGiftRejection,
  generateCashGiftOption,
  isRedLineViolation,
  cashGiftTierIndex,
  CASH_GIFT_TIER_LABELS,
  CASH_GIFT_MIN,
  CASH_GIFT_MAX_NORMAL,
  CASH_GIFT_SLIDER_MAX,
  CASH_GIFT_PER_SEMESTER_LIMIT,
  readCashGiftRecord,
  writeCashGiftRecord,
  canSendCashGiftThisSemester,
  getMentorAwayScene,
  type OfficeDialogueOption,
  type MentorOfficeProfile,
  type MentorAwayScene,
  type GiftDialogueLine,
} from "../npc/mentorEncounterData";
import { TONE_LABEL, TONE_BUBBLE_COLOR, toneFromFavorability } from "../npc/npcRegistry";
import { moneyToBalance, formatYuan } from "../economy/finance";
import type { ToneTier } from "../npc/types";

interface MentorOfficeModalProps {
  isOpen: boolean;
  onClose: () => void;
  mentor: { id: string; name: string; title?: string; image?: string } | null;
  favorability: number;
  money: number;
  stats: {
    arch: number;
    logic: number;
    stress: number;
  };
  canChooseAction: boolean;
  /** 当玩家确认执行一项办公室互动时触发；rejected 标记仅对送礼类选项有效 */
  onExecuteOption: (option: OfficeDialogueOption, rejected: boolean) => void;
  /** 当前学期（用于送钱限频记账） */
  semester?: number;
  round?: number;
  partners?: string[];
  onAcceptConfession?: (npcId: string, npcName: string) => void;
  confessedNpcIds?: string[];
  onMarkConfessed?: (npcId: string) => void;
}

export function MentorOfficeModal({
  isOpen,
  onClose,
  mentor,
  favorability,
  money,
  stats,
  canChooseAction,
  onExecuteOption,
  semester = 1,
  round = 0,
  partners = [],
  onAcceptConfession,
  confessedNpcIds = [],
  onMarkConfessed,
}: MentorOfficeModalProps) {
  // ===== 所有 Hooks 必须在早期 return 之前声明（React Hook 规则） =====
  const [activeTab, setActiveTab] = useState<"dialogue" | "profile">("dialogue");
  const [optionCategory, setOptionCategory] = useState<"academic" | "gift" | "romance">("academic");
  const [selectedOption, setSelectedOption] = useState<OfficeDialogueOption | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [hasExecuted, setHasExecuted] = useState(false);
  const [currentNarrative, setCurrentNarrative] = useState<string | null>(null);
  const [currentReply, setCurrentReply] = useState<string | null>(null);
  const [replyTone, setReplyTone] = useState<ToneTier>("neutral");
  const [currentMoodIndex, setCurrentMoodIndex] = useState(0);
  const [isAway, setIsAway] = useState(false);
  const [awayScene, setAwayScene] = useState<MentorAwayScene | null>(null);
  // 送礼被拒收时的醒目提示
  const [giftRejected, setGiftRejected] = useState(false);
  // 送礼剧情对话序列播放器
  const [dialogueSequence, setDialogueSequence] = useState<GiftDialogueLine[]>([]);
  const [dialogueIndex, setDialogueIndex] = useState(0);
  const [dialogueComplete, setDialogueComplete] = useState(false);
  const [isConfessing, setIsConfessing] = useState(false);
  const [hasChosenConfession, setHasChosenConfession] = useState(false);
  // 暂存送礼结算数据，等对话序列播完再触发外部回调
  const pendingExecutionRef = React.useRef<{ option: OfficeDialogueOption; rejected: boolean } | null>(null);

  // ===== 送钱（现金）状态 =====
  // 是否正在输入金额（独立浮层弹窗）
  const [cashInputOpen, setCashInputOpen] = useState(false);
  // 玩家选择的金额（数字，滑块/输入双向绑定）
  const [cashAmount, setCashAmount] = useState<number>(1000);
  // 已生成的送钱选项（点击"确认送出"后生成，走正常的拒收/收下流程）
  const [cashGiftOption, setCashGiftOption] = useState<OfficeDialogueOption | null>(null);

  const isDialoguePlaying = dialogueSequence.length > 0 && !dialogueComplete;

  const profile: MentorOfficeProfile = getMentorOfficeProfile(mentor);
  const currentTone = toneFromFavorability(favorability);
  const options = generateOfficeDialogueOptions(profile, favorability, money, canChooseAction);

  const mentorId = mentor?.id;

  const prevIsOpenRef = React.useRef(false);

  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      setSelectedOption(null);
      setHasExecuted(false);
      setCurrentNarrative(null);
      const greetings = [
        `「你来了。最近的研究进展如何？关于近代建筑史的文献与开题，遇到什么卡点了吗？」`,
        `「坐。桌上这本刚出的《营造法式新释》你拿去看两周。文献考据要耐得住寂寞，慢慢磨。」`,
        `「下周组会的大纲准备得怎么样了？别只顾着熬夜赶图，理论逻辑必须经得起推敲。」`,
        `「刚才院里开会还在讨论你们这届的开题盲审。只要按我的要求扎实做，不用慌。」`,
        `「（${profile.name} 摘下眼镜推了推镜架）今天找我有什么事？学术上的疑难，还是想聊聊别的？」`,
      ];
      setCurrentReply(greetings[Math.floor(Math.random() * greetings.length)]);
      setReplyTone(currentTone);
      setGiftRejected(false);
      setIsConfessing(false);
      setHasChosenConfession(false);
      if (favorability >= 80 && !confessedNpcIds.includes("professor") && CONFESSION_SCRIPTS.professor) {
        setIsConfessing(true);
        const seq = CONFESSION_SCRIPTS.professor.introTurns.map(t => ({
          speaker: (t.speaker === "player" ? "player" : t.speaker === "peer" ? "mentor" : "narration") as "player" | "mentor" | "narration",
          text: t.content,
          tone: t.tone as any
        }));
        setDialogueSequence(seq);
        setDialogueIndex(0);
        setDialogueComplete(false);
      } else {
        setDialogueSequence([]);
        setDialogueIndex(0);
        setDialogueComplete(false);
      }
      pendingExecutionRef.current = null;
      setCashInputOpen(false);
      setCashAmount(1000);
      setCashGiftOption(null);
      setCurrentMoodIndex(Math.floor(Math.random() * profile.currentMoods.length));
      // 判定导师是否在办公室（放养型导师扑空概率大）
      const present = rollMentorPresence(profile.mentorId);
      setIsAway(!present);
      setAwayScene(present ? null : getMentorAwayScene(profile));
    }
    prevIsOpenRef.current = isOpen;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, mentorId]);

  if (!isOpen) return null;

  // 导师不在办公室：渲染扑空场景
  if (isAway && awayScene) {
    return (
      <div className="fixed inset-0 z-[220] flex items-center justify-center bg-[#020611]/88 p-3 backdrop-blur-md sm:p-6 animate-in fade-in duration-200">
        <section
          role="dialog"
          aria-modal="true"
          aria-labelledby="mentor-office-title"
          className="relative flex h-[92vh] max-h-[860px] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-[#c9a84c]/35 bg-[#07101d] shadow-[0_30px_100px_rgba(0,0,0,0.75)]"
        >
          {/* 顶部标题栏 */}
          <header className="flex shrink-0 items-center justify-between border-b border-white/10 bg-[#0a1424]/90 px-6 py-4 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#c9a84c]/30 bg-[#c9a84c]/10 text-[#d7bb66] shadow-inner">
                <GraduationCap size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-medium tracking-[0.2em] text-[#c9a84c] uppercase">
                    FACULTY OFFICE
                  </span>
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-slate-300">
                    {profile.officeLocation}
                  </span>
                </div>
                <h2 id="mentor-office-title" className="text-xl font-bold text-white tracking-wide">
                  {profile.name} <span className="text-sm font-normal text-slate-400">· {profile.title}</span>
                </h2>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-400 transition hover:bg-white/15 hover:text-white"
              title="告辞返回"
            >
              <X size={18} />
            </button>
          </header>

          {/* 扑空场景主体 */}
          <div className="relative flex-1 overflow-hidden">
            <img
              src={profile.sceneImage}
              alt="导师办公室环境"
              className="absolute inset-0 h-full w-full object-cover brightness-[0.6] contrast-[1.05]"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#07101d] via-[#07101d]/60 to-[#07101d]/30" />

            <div className="relative z-10 flex h-full flex-col justify-center gap-5 p-8 sm:p-12">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-400/30 bg-amber-400/10 text-amber-300">
                  <AlertCircle size={24} />
                </span>
                <h3 className="text-2xl font-bold text-white">{awayScene.title}</h3>
              </div>

              <p className="max-w-xl text-[15px] leading-relaxed text-slate-200">
                {awayScene.detail}
              </p>

              <div className="max-w-xl rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-md">
                <p className="text-[13px] leading-relaxed text-slate-300">
                  {awayScene.note}
                </p>
              </div>

              <div className="mt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex items-center gap-2 rounded-xl border border-[#c9a84c]/60 bg-gradient-to-r from-[#c9a84c] to-[#dec678] px-6 py-3 text-sm font-bold text-black shadow-lg transition hover:brightness-110 active:scale-95"
                >
                  <span>下次再来 · 返回地图</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  const currentMood = profile.currentMoods[currentMoodIndex] || "在专注批注文献";

  const handleSelectOption = (opt: OfficeDialogueOption) => {
    if (opt.disabled) return;
    // 送钱入口：弹出独立金额输入浮层，不直接进入确认流程
    if (opt.id === "gift_cash_entry") {
      setSelectedOption(null);
      setCashAmount(1000);
      setCashGiftOption(null);
      setCashInputOpen(true);
      return;
    }
    setSelectedOption(opt);
  };

  // 送钱：玩家输入金额后确认，生成送钱选项并走正常拒收/收下流程
  const handleConfirmCashGift = () => {
    if (!Number.isFinite(cashAmount) || cashAmount < CASH_GIFT_MIN) return;
    if (!canSendCashGiftThisSemester(semester)) return;

    const balanceYuan = moneyToBalance(money);
    const consecutiveCount = readCashGiftRecord(semester).count;
    const opt = generateCashGiftOption(
      profile,
      favorability,
      cashAmount,
      balanceYuan,
      consecutiveCount
    );
    setCashGiftOption(opt);
    setSelectedOption(opt);
    setCashInputOpen(false);
  };

  // 送钱：取消金额输入
  const handleCancelCashGift = () => {
    setCashInputOpen(false);
    setCashAmount(1000);
    setCashGiftOption(null);
    setSelectedOption(null);
  };

  const handleConfirmAction = () => {
    if (!selectedOption || !canChooseAction || isExecuting || selectedOption.disabled) return;
    if (selectedOption.statDeltas?.money && selectedOption.statDeltas.money < 0 && money < Math.abs(selectedOption.statDeltas.money)) {
      return;
    }

    setIsExecuting(true);

    // 送礼类选项：按导师类型 + 好感区间做拒收判定，并启动剧情对话序列
    let isRejected = false;
    let displayOption = selectedOption;
    let sequence: GiftDialogueLine[] | undefined;

    if (selectedOption.category === "gift") {
      // 区分普通送礼 vs 送钱：送钱用专属判定与金额
      const isCashGift = selectedOption.id === "gift_cash";
      if (isCashGift) {
        // 送钱选项的拒收判定直接用原始元数 cashAmount
        isRejected = rollCashGiftRejection(profile.mentorId, favorability, cashAmount);
      } else {
        isRejected = rollGiftRejection(profile.mentorId, favorability);
      }
      if (isRejected && selectedOption.rejection) {
        displayOption = {
          ...selectedOption,
          statDeltas: selectedOption.rejection.statDeltas,
          mentorReply: selectedOption.rejection.mentorReply,
          replyTone: selectedOption.rejection.replyTone,
          resultNarrative: selectedOption.rejection.resultNarrative,
        };
        sequence = selectedOption.rejection.dialogueSequence;
      } else {
        sequence = selectedOption.acceptanceDialogue;
      }
    } else if (selectedOption.category === "romance") {
      sequence = selectedOption.acceptanceDialogue;
    }

    // 立即设置标记与文案（让玩家看到第一条反馈）
    setCurrentReply(displayOption.mentorReply);
    setReplyTone(displayOption.replyTone);
    setCurrentNarrative(displayOption.resultNarrative);
    setGiftRejected(isRejected);
    setHasExecuted(true);

    // 送钱记账：无论收下还是拒收都算消耗一次学期配额（避免玩家通过反复刷拒收来白嫖）
    if (selectedOption.id === "gift_cash") {
      writeCashGiftRecord(semester, round);
    }

    // 送礼：启动剧情对话序列播放器；序列播完后由 advanceDialogue / skipDialogue 触发外部回调
    if (sequence && sequence.length > 0) {
      setDialogueSequence(sequence);
      setDialogueIndex(0);
      setDialogueComplete(false);
      // 暂存结算数据，等对话结束再触发
      pendingExecutionRef.current = { option: displayOption, rejected: isRejected };
    } else {
      // 非送礼选项：立即回调外部
      onExecuteOption(displayOption, isRejected);
    }
    setIsExecuting(false);
  };

  const advanceDialogue = () => {
    if (dialogueIndex < dialogueSequence.length - 1) {
      setDialogueIndex(dialogueIndex + 1);
    } else {
      // 序列播放完毕：触发外部结算
      setDialogueComplete(true);
      const pending = pendingExecutionRef.current;
      if (pending) {
        onExecuteOption(pending.option, pending.rejected);
        pendingExecutionRef.current = null;
      }
    }
  };

  const skipDialogue = () => {
    setDialogueComplete(true);
    const pending = pendingExecutionRef.current;
    if (pending) {
      onExecuteOption(pending.option, pending.rejected);
      pendingExecutionRef.current = null;
    }
  };

  return (
    <>
    <div className="fixed inset-0 z-[220] flex items-center justify-center bg-[#020611]/88 p-3 backdrop-blur-md sm:p-6 animate-in fade-in duration-200">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="mentor-office-title"
        className="relative flex h-[92vh] max-h-[860px] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-[#c9a84c]/35 bg-[#07101d] shadow-[0_30px_100px_rgba(0,0,0,0.75)]"
      >
        {/* 顶部标题栏 */}
        <header className="flex shrink-0 items-center justify-between border-b border-white/10 bg-[#0a1424]/90 px-6 py-4 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#c9a84c]/30 bg-[#c9a84c]/10 text-[#d7bb66] shadow-inner">
              <GraduationCap size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-medium tracking-[0.2em] text-[#c9a84c] uppercase">
                  FACULTY OFFICE
                </span>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-slate-300">
                  {profile.officeLocation}
                </span>
              </div>
              <h2 id="mentor-office-title" className="text-xl font-bold text-white tracking-wide">
                {profile.name} <span className="text-sm font-normal text-slate-400">· {profile.title}</span>
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* 好感度徽章 */}
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-3.5 py-1.5 backdrop-blur-md">
              <Heart size={15} className="text-rose-400 fill-rose-400/30" />
              <span className="text-xs text-slate-300">好感度</span>
              <span className="font-semibold text-rose-300 text-sm">{favorability}</span>
              <span
                className="rounded px-1.5 py-0.5 text-[10px] font-medium"
                style={{
                  backgroundColor: TONE_BUBBLE_COLOR[currentTone],
                  color: "#f1f5f9",
                }}
              >
                {TONE_LABEL[currentTone]}
              </span>
            </div>

            {/* 关闭按钮 */}
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-400 transition hover:bg-white/15 hover:text-white"
              title="告辞返回"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        {/* 视窗主体：AVG 左右/上下分屏 */}
        <div className="grid flex-1 grid-cols-1 overflow-hidden lg:grid-cols-12">
          {/* 左侧：沉浸式视觉小说舞台（环境 + 人物立绘/卡片） */}
          <div className="relative flex flex-col overflow-hidden border-b border-white/10 lg:col-span-5 lg:border-b-0 lg:border-r">
            {profile.hasPortrait ? (
              <div className="relative flex flex-col h-full w-full overflow-hidden bg-white">
                {/* 心境浮窗（贴顶精致小巧） */}
                <div className="absolute left-4 right-4 top-4 z-20 flex items-center gap-2 rounded-xl border border-slate-900/10 bg-[#060c16]/85 px-3 py-1.5 text-[11px] text-slate-300 backdrop-blur-md shadow-lg">
                  <Sparkles size={12} className="text-amber-400 shrink-0 animate-pulse" />
                  <span className="truncate">当前状态：<span className="text-amber-200">{currentMood}</span></span>
                </div>

                {/* 人物立绘主视觉：占据全部可用空间，按比例完整显示 */}
                <div className="relative z-10 flex-1 flex min-h-0 items-end justify-center overflow-hidden bg-white">
                  <img
                    src={profile.avatarImage}
                    alt={profile.name}
                    className="max-h-full max-w-full w-auto h-auto object-contain transition-all duration-700 animate-avg-breathe"
                    style={{ filter: "brightness(1.02) contrast(1.04)" }}
                  />
                </div>
              </div>
            ) : (
              <>
                {/* 背景大图（无立绘时主视觉） */}
                <img
                  src={profile.sceneImage}
                  alt="导师办公室环境"
                  className="absolute inset-0 h-full w-full object-cover brightness-[0.78] contrast-[1.08] transition-transform duration-1000 hover:scale-105"
                />
                {/* 氛围渐变遮罩 */}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#07101d] via-[#07101d]/45 to-transparent" />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/50" />

                {/* 导师心境与实时动作浮窗 */}
                <div className="absolute left-4 right-4 top-4 z-10 flex items-center gap-2 rounded-xl border border-white/15 bg-[#060c16]/80 px-3 py-2 text-xs text-slate-300 backdrop-blur-md shadow-lg">
                  <Sparkles size={14} className="text-amber-400 shrink-0 animate-pulse" />
                  <span className="truncate">当前状态：<span className="text-amber-200">{currentMood}</span></span>
                </div>

                {/* 人物卡片与格言（立绘视觉焦点） */}
                <div className="relative z-10 p-6 space-y-4">
                  <div className="flex items-center gap-4 rounded-2xl border border-white/15 bg-[#07101d]/85 p-4 shadow-2xl backdrop-blur-xl">
                    <img
                      src={profile.avatarImage}
                      alt={profile.name}
                      className="h-16 w-16 shrink-0 rounded-2xl border-2 border-[#c9a84c]/50 object-cover shadow-md"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-white text-base">{profile.name}</h3>
                        <span className="rounded-full bg-[#c9a84c]/15 px-2 py-0.5 text-[11px] font-medium text-[#dec678] border border-[#c9a84c]/30">
                          {profile.personalityTag}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-400 line-clamp-2 leading-relaxed">
                        {profile.officeAtmosphere}
                      </p>
                    </div>
                  </div>

                  {/* 导师经典寄语 */}
                  <div className="rounded-xl border border-[#c9a84c]/20 bg-[#c9a84c]/[0.06] p-3 text-xs leading-relaxed text-amber-200/90 italic">
                    <Quote size={12} className="inline mr-1 opacity-60" />
                    {profile.quote}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* 右侧：多维剧情对话与互动面板 */}
          <div className="flex flex-col overflow-y-auto lg:col-span-7 bg-[#07101d]/95 p-6 lg:p-8">
            {/* 对话回响区域（AVG 对白气泡）—— 送礼剧情播放期间隐藏，把空间让给剧情播放器 */}
            {!isDialoguePlaying && (
            <div className="mb-6 flex-1 rounded-2xl border border-white/10 bg-[#0c172a]/70 p-5 shadow-inner backdrop-blur-md">
              <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                    面谈情境对话
                  </span>
                </div>
                <span className="text-[11px] text-slate-400">
                  {hasExecuted ? "最新回应" : "等待发起交流"}
                </span>
              </div>

              {/* 导师话语 */}
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <img
                    src={profile.avatarImage}
                    alt={profile.name}
                    className="h-10 w-10 shrink-0 rounded-xl border border-white/20 object-cover"
                  />
                  <div
                    className="flex-1 rounded-2xl p-4 text-sm leading-relaxed text-slate-100 shadow-md"
                    style={{
                      backgroundColor: TONE_BUBBLE_COLOR[hasExecuted ? replyTone : currentTone],
                      border: "1px solid rgba(255,255,255,0.1)",
                    }}
                  >
                    <p className="font-semibold text-xs text-[#d7bb66] mb-1">{profile.name}：</p>
                    {currentReply || (
                      <span>
                        「你来了。最近的研究进展如何？关于近代建筑史的文献与开题，遇到什么卡点了吗？」
                      </span>
                    )}
                  </div>
                </div>

                {/* 执行后的剧情叙述（拒收用红色警示风，正常用绿色确认风） */}
                {currentNarrative && (
                  <div
                    className={`mt-3 flex items-start gap-2.5 rounded-xl border p-3.5 text-xs leading-relaxed animate-in fade-in duration-300 ${
                      giftRejected
                        ? "border-rose-500/40 bg-rose-950/30 text-rose-200"
                        : "border-emerald-500/20 bg-emerald-950/20 text-emerald-200"
                    }`}
                  >
                    {giftRejected ? (
                      <XCircle size={16} className="text-rose-400 shrink-0 mt-0.5" />
                    ) : (
                      <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                    )}
                    <span>{currentNarrative}</span>
                  </div>
                )}
              </div>
            </div>
            )}

            {/* 状态分支：① 选择互动 ② 送礼剧情对话播放中 ③ 完成结算 */}
            {!hasExecuted ? (
              <div className="space-y-4">
                {/* 选项分类筛选切换 */}
                <div className="flex items-center gap-1.5 rounded-2xl bg-black/40 p-1.5 border border-white/10">
                  <button
                    type="button"
                    onClick={() => { setOptionCategory("academic"); setSelectedOption(null); }}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition ${optionCategory === "academic" ? "bg-sky-500/25 text-sky-200 border border-sky-400/40 shadow-md" : "text-slate-400 hover:text-slate-200"}`}
                  >
                    <BookOpen size={14} />
                    <span>学术指导</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setOptionCategory("gift"); setSelectedOption(null); }}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition ${optionCategory === "gift" ? "bg-amber-500/25 text-amber-200 border border-amber-400/40 shadow-md" : "text-slate-400 hover:text-slate-200"}`}
                  >
                    <Gift size={14} />
                    <span>心意送礼</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setOptionCategory("romance"); setSelectedOption(null); }}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition ${optionCategory === "romance" ? "bg-gradient-to-r from-rose-500/30 to-pink-500/20 text-rose-200 border border-rose-400/50 shadow-md ring-1 ring-rose-400/30" : "text-rose-400/80 hover:text-rose-200 hover:bg-rose-500/10"}`}
                  >
                    <Heart size={14} className="text-rose-400 fill-rose-400/50" />
                    <span>💘 禁忌心动 · 导师攻略</span>
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                    {optionCategory === "romance" ? "💘 导师禁忌心动 · 羁绊互动" : optionCategory === "gift" ? "🎁 关怀与礼物敬献" : optionCategory === "academic" ? "📖 课题汇报与学术请教" : "选择会面互动事项"}
                  </h4>
                  <span className="text-xs text-amber-300/80">
                    {canChooseAction ? "可消耗本回合行动" : "本回合已有待处理事项"}
                  </span>
                </div>

                <div className="grid gap-2.5 sm:grid-cols-2">
                  {[...options.filter((o) => !(cashGiftOption && o.id === "gift_cash_entry")), ...(cashGiftOption ? [cashGiftOption] : [])]
                    .filter((opt) => {
                      if (optionCategory === "all") return true;
                      if (optionCategory === "academic") return opt.category === "academic" || opt.category === "chat" || opt.category === "opportunity";
                      if (optionCategory === "gift") return opt.category === "gift";
                      if (optionCategory === "romance") return opt.category === "romance";
                      return true;
                    })
                    .map((opt) => {
                      const isRomance = opt.category === "romance";
                      const isLocked = Boolean(opt.disabled);
                    const isSelected = selectedOption?.id === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleSelectOption(opt)}
                        className={`group relative flex flex-col justify-between rounded-2xl border p-4 text-left transition-all ${
                          isLocked
                            ? "border-white/5 bg-black/30 opacity-60 cursor-not-allowed"
                            : isSelected
                              ? isRomance
                                ? "border-rose-400 bg-rose-500/25 ring-2 ring-rose-400/40 shadow-xl scale-[1.01]"
                                : "border-[#c9a84c] bg-[#c9a84c]/15 ring-2 ring-[#c9a84c]/30 shadow-lg scale-[1.01]"
                              : isRomance
                                ? "border-rose-500/30 bg-rose-950/20 hover:border-rose-400/50 hover:bg-rose-500/15"
                                : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]"
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                              <span className="text-base">{opt.emoji}</span>
                              {opt.label}
                            </span>
                            {opt.costText && (
                              <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-slate-400">
                                {opt.costText}
                              </span>
                            )}
                          </div>
                          <p className="text-xs leading-relaxed text-slate-400 line-clamp-2">
                            {opt.description}
                          </p>
                        </div>

                        {opt.statDeltas && (
                          <div className="mt-3 flex flex-wrap gap-1.5 border-t border-white/10 pt-2 text-[10px]">
                            {opt.statDeltas.arch && (
                              <span className="text-amber-300 font-medium">
                                建筑底蕴 +{opt.statDeltas.arch}
                              </span>
                            )}
                            {opt.statDeltas.logic && (
                              <span className="text-sky-300 font-medium">
                                逻辑思维 +{opt.statDeltas.logic}
                              </span>
                            )}
                            {opt.statDeltas.mentorFavorability && (
                              <span className="text-rose-300 font-medium">
                                好感 +{opt.statDeltas.mentorFavorability}
                              </span>
                            )}
                            {opt.statDeltas.money && (
                              <span className="text-emerald-300 font-medium tabular-nums">
                                经费 {opt.statDeltas.money > 0 ? "+" : ""}{formatYuan(moneyToBalance(opt.statDeltas.money))}
                              </span>
                            )}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* 送钱金额输入浮层在组件根层级渲染（fixed 定位独立弹窗） */}

                {/* 底部行动确认栏 */}
                <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4">
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-xl border border-white/15 px-4 py-2.5 text-xs text-slate-400 transition hover:bg-white/5 hover:text-white"
                  >
                    稍后探讨 · 告辞离开
                  </button>

                  <button
                    type="button"
                    disabled={!selectedOption || !canChooseAction}
                    onClick={handleConfirmAction}
                    className={`flex items-center gap-2 rounded-xl px-6 py-2.5 text-xs font-bold shadow-lg transition hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 ${
                      selectedOption?.category === "romance"
                        ? "border border-rose-400/60 bg-gradient-to-r from-rose-500 to-pink-500 text-white"
                        : "border border-[#c9a84c]/60 bg-gradient-to-r from-[#c9a84c] to-[#dec678] text-black"
                    }`}
                  >
                    <span>{selectedOption?.category === "romance" ? "发起禁忌心动" : "确认发起该项交流"}</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            ) : isDialoguePlaying ? (
              /* === 送礼剧情对话播放器 === */
              <div className="mt-auto flex flex-col gap-3 border-t border-white/10 pt-4">
                {/* 序列顶部标识：进度 + 类型 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare size={14} className={giftRejected ? "text-rose-400" : "text-emerald-400"} />
                    <span className={`text-[11px] font-semibold uppercase tracking-wider ${giftRejected ? "text-rose-300" : "text-emerald-300"}`}>
                      {giftRejected ? "拒收剧情 · 对话进行中" : "收下剧情 · 对话进行中"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={skipDialogue}
                    className="text-[11px] text-slate-400 transition hover:text-white"
                  >
                    跳过 ⏩
                  </button>
                </div>

                {/* 当条对话气泡（横向长大字幕风格，参考交互叙事游戏） */}
                {(() => {
                  const line = dialogueSequence[dialogueIndex];
                  if (!line) return null;

                  if (line.speaker === "narration") {
                    return (
                      <div className="w-full animate-in fade-in slide-in-from-bottom-1 duration-300">
                        <div className={`mx-auto rounded-2xl border px-5 py-4 text-[13px] leading-[1.9] italic backdrop-blur-md ${
                          giftRejected
                            ? "border-rose-500/25 bg-rose-950/25 text-rose-100/85"
                            : "border-white/10 bg-black/30 text-slate-300"
                        }`}>
                          <div className="mb-1.5 flex items-center gap-1.5 text-[10px] uppercase tracking-wider opacity-60">
                            <Sparkles size={10} />
                            <span>场景叙述</span>
                          </div>
                          {line.content}
                        </div>
                      </div>
                    );
                  }

                  const isPlayer = line.speaker === "player";
                  const bubbleTone = (!isPlayer && line.tone) || (giftRejected ? "neutral" : "warm");

                  return (
                    <div
                      className={`w-full flex ${isPlayer ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-1 duration-300`}
                    >
                      <div className={`flex items-start gap-3 max-w-[92%] ${isPlayer ? "flex-row-reverse" : ""}`}>
                        {/* 头像 */}
                        <img
                          src={isPlayer ? "" : profile.avatarImage}
                          alt=""
                          className={`h-11 w-11 shrink-0 rounded-xl border object-cover ${
                            isPlayer
                              ? "border-sky-400/40 bg-gradient-to-br from-sky-500/30 to-indigo-500/30"
                              : "border-white/20"
                          }`}
                          style={isPlayer ? { display: "none" } : undefined}
                        />
                        {isPlayer && (
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-sky-400/40 bg-gradient-to-br from-sky-500/30 to-indigo-500/30 text-base">
                            🧑‍🎓
                          </div>
                        )}

                        {/* 气泡主体 */}
                        <div
                          className={`rounded-2xl px-5 py-4 shadow-md min-w-[280px] ${
                            isPlayer ? "rounded-tr-sm" : "rounded-tl-sm"
                          }`}
                          style={{
                            backgroundColor: isPlayer
                              ? "rgba(56, 132, 255, 0.18)"
                              : TONE_BUBBLE_COLOR[bubbleTone as ToneTier],
                            border: `1px solid ${isPlayer ? "rgba(125, 211, 252, 0.25)" : "rgba(255,255,255,0.1)"}`,
                          }}
                        >
                          {/* 说话人 + 动作 */}
                          <div className={`mb-1.5 flex items-baseline gap-2 ${isPlayer ? "justify-end" : ""}`}>
                            <span className={`text-xs font-bold ${isPlayer ? "text-sky-300" : "text-[#d7bb66]"}`}>
                              {line.name || (isPlayer ? "你" : profile.name)}
                            </span>
                            {line.action && (
                              <span className="text-[10px] italic text-slate-300/70">
                                （{line.action}）
                              </span>
                            )}
                          </div>

                          {/* 台词正文 */}
                          <p className="text-[13.5px] leading-[1.85] text-slate-100">
                            {line.content}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* 底部推进控制 */}
                <div className="flex items-center justify-end gap-2 pt-1">

                  <button
                    type="button"
                    onClick={advanceDialogue}
                    className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold text-white shadow-lg transition hover:brightness-110 active:scale-95 ${
                      giftRejected
                        ? "bg-gradient-to-r from-rose-600 to-rose-500"
                        : "bg-gradient-to-r from-emerald-700 to-emerald-600"
                    }`}
                  >
                    <span>
                      {dialogueIndex < dialogueSequence.length - 1 ? "继续" : "完成本场对话"}
                    </span>
                    {dialogueIndex < dialogueSequence.length - 1 ? <ChevronDown size={14} /> : <CheckCircle2 size={14} />}
                  </button>
                </div>
              </div>
            ) : (
              /* === 完成结算 === */
              <div className="mt-auto space-y-3 border-t border-white/10 pt-5">
                {/* 拒收醒目横幅（仅在被拒收时显示） */}
                {giftRejected ? (
                  <div className="flex items-center gap-3 rounded-2xl border border-rose-500/40 bg-rose-950/40 px-4 py-3 shadow-lg animate-in fade-in slide-in-from-top-2 duration-300">
                    <XCircle size={22} className="text-rose-400 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-rose-200">
                        🚫 礼物被导师婉拒
                      </p>
                      <p className="text-[11px] leading-relaxed text-rose-300/90 mt-0.5">
                        钱未扣除，好感度略受影响——这位导师不吃这一套，换个方式拉近关系吧。
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-emerald-300">
                    <CheckCircle2 size={14} />
                    <span>✨ 本轮交流圆满结束，相关属性与好感度已同步更新。</span>
                  </div>
                )}

                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    onClick={onClose}
                    className={`flex items-center gap-2 rounded-xl px-6 py-2.5 text-xs font-bold text-black shadow-lg transition hover:brightness-110 ${
                      giftRejected
                        ? "border border-rose-400/60 bg-rose-400"
                        : "border border-[#c9a84c]/60 bg-[#c9a84c]"
                    }`}
                  >
                    <span>{giftRejected ? "知难而退 · 返回地图" : "确认并返回地图"}</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>

    {/* 送钱金额输入浮层 —— 独立弹窗，z-index 高于主 Modal */}
    {cashInputOpen && (
      <div
        className="fixed inset-0 z-[230] flex items-center justify-center bg-[#020611]/78 p-3 backdrop-blur-sm sm:p-6 animate-in fade-in duration-150"
        onClick={handleCancelCashGift}
      >
        <div
          className="w-full max-w-md rounded-3xl border border-amber-400/35 bg-[#0c1320] p-6 shadow-[0_30px_100px_rgba(0,0,0,0.85)] animate-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 标题 */}
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <span className="text-xl leading-none">🧧</span>
              <div>
                <div className="text-sm font-semibold text-amber-200">敬献一份现金</div>
                <div className="mt-0.5 text-[11px] text-slate-400">
                  你从书包里拿出一个信封，里面装着……
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleCancelCashGift}
              className="rounded-full p-1 text-slate-500 transition hover:bg-white/5 hover:text-white"
              aria-label="关闭"
            >
              <X size={16} />
            </button>
          </div>

          {/* 金额显示 + 数字输入（双向） */}
          <div className="mb-4 flex items-baseline justify-center gap-1">
            <span className="text-xs text-slate-400">¥</span>
            <input
              type="number"
              min={CASH_GIFT_MIN}
              max={CASH_GIFT_SLIDER_MAX}
              step={100}
              value={cashAmount}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                setCashAmount(Number.isFinite(v) ? Math.max(CASH_GIFT_MIN, Math.min(CASH_GIFT_SLIDER_MAX, v)) : CASH_GIFT_MIN);
              }}
              className="w-32 bg-transparent text-center text-4xl font-bold tabular-nums text-white outline-none"
            />
          </div>

          {/* 滑块 */}
          <div className="mb-2">
            <input
              type="range"
              min={CASH_GIFT_MIN}
              max={CASH_GIFT_SLIDER_MAX}
              step={100}
              value={cashAmount}
              onChange={(e) => setCashAmount(parseInt(e.target.value, 10))}
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-gradient-to-r from-amber-500/40 via-amber-400 to-rose-500/70 accent-amber-300"
              style={{
                background: `linear-gradient(to right,
                  #f59e0b 0%,
                  #f59e0b ${(10000 / CASH_GIFT_SLIDER_MAX) * 100}%,
                  #f43f5e ${(10000 / CASH_GIFT_SLIDER_MAX) * 100}%,
                  #f43f5e 100%)`,
              }}
            />
            {/* 刻度（只读，营造"不确定送多少合适"的探索感） */}
            <div className="mt-1.5 flex justify-between text-[9px] text-slate-600">
              <span>¥{CASH_GIFT_MIN}</span>
              <span>¥2,000</span>
              <span>¥5,000</span>
              <span className="text-rose-500/70">¥10,000 · 红线</span>
              <span>¥{CASH_GIFT_SLIDER_MAX.toLocaleString()}</span>
            </div>
          </div>

          {/* 当前档位提示 / 红线警告 */}
          {isRedLineViolation(cashAmount) ? (
            <div className="mb-3 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-[11px] leading-relaxed text-rose-300">
              ⚠️ 金额超过 ¥{CASH_GIFT_MAX_NORMAL.toLocaleString()} 师德红线。
              绝大多数导师会严厉拒收，好感度大幅下降并触发特殊剧情。三思。
            </div>
          ) : (
            <div className="mb-3 text-center text-[11px] text-amber-300/70">
              {CASH_GIFT_TIER_LABELS[cashGiftTierIndex(cashAmount)]}
            </div>
          )}

          {/* 免责 + 余额 + 配额 */}
          <div className="mb-4 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-[10px] leading-relaxed text-slate-500">
            ⚠️ 本剧情仅为游戏机制，模拟师生权力关系张力，不鼓励任何现实中的现金馈赠行为。
            <br />
            当前余额 {formatYuan(moneyToBalance(money))} · 本学期已用 {readCashGiftRecord(semester).count}/{CASH_GIFT_PER_SEMESTER_LIMIT} 次
            {cashAmount > moneyToBalance(money) && (
              <span className="mt-1 block text-rose-300">⚠️ 余额不足（差 {formatYuan(cashAmount - moneyToBalance(money))}）</span>
            )}
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleCancelCashGift}
              className="rounded-xl border border-white/15 px-4 py-2 text-xs text-slate-400 transition hover:bg-white/5 hover:text-white"
            >
              作罢
            </button>
            <button
              type="button"
              onClick={handleConfirmCashGift}
              disabled={
                cashAmount < CASH_GIFT_MIN ||
                !canSendCashGiftThisSemester(semester) ||
                cashAmount > moneyToBalance(money)
              }
              className="flex items-center gap-1.5 rounded-xl border border-amber-400/60 bg-gradient-to-r from-amber-500 to-amber-300 px-5 py-2 text-xs font-bold text-black shadow-lg transition hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span>装入信封</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
