import React, { useState, useEffect } from "react";
import {
  GraduationCap,
  Sparkles,
  BookOpen,
  Coffee,
  Gift,
  Award,
  ChevronRight,
  X,
  Heart,
  Quote,
  CheckCircle2,
  AlertCircle,
  Compass,
} from "lucide-react";
import {
  getMentorOfficeProfile,
  generateOfficeDialogueOptions,
  rollMentorPresence,
  getMentorAwayScene,
  type OfficeDialogueOption,
  type MentorOfficeProfile,
  type MentorAwayScene,
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
  onExecuteOption: (option: OfficeDialogueOption) => void;
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
}: MentorOfficeModalProps) {
  const [activeTab, setActiveTab] = useState<"dialogue" | "profile">("dialogue");
  const [selectedOption, setSelectedOption] = useState<OfficeDialogueOption | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [hasExecuted, setHasExecuted] = useState(false);
  const [currentNarrative, setCurrentNarrative] = useState<string | null>(null);
  const [currentReply, setCurrentReply] = useState<string | null>(null);
  const [replyTone, setReplyTone] = useState<ToneTier>("neutral");
  const [currentMoodIndex, setCurrentMoodIndex] = useState(0);
  const [isAway, setIsAway] = useState(false);
  const [awayScene, setAwayScene] = useState<MentorAwayScene | null>(null);

  const profile: MentorOfficeProfile = getMentorOfficeProfile(mentor);
  const currentTone = toneFromFavorability(favorability);
  const options = generateOfficeDialogueOptions(profile, favorability, money, canChooseAction);

  useEffect(() => {
    if (isOpen) {
      setSelectedOption(null);
      setHasExecuted(false);
      setCurrentNarrative(null);
      setCurrentReply(null);
      setCurrentMoodIndex(Math.floor(Math.random() * profile.currentMoods.length));
      // 判定导师是否在办公室（放养型导师扑空概率大）
      const present = rollMentorPresence(profile.mentorId);
      setIsAway(!present);
      setAwayScene(present ? null : getMentorAwayScene(profile));
    }
  }, [isOpen, mentor]);

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
    setSelectedOption(opt);
  };

  const handleConfirmAction = () => {
    if (!selectedOption || !canChooseAction || isExecuting || selectedOption.disabled) return;
    if (selectedOption.statDeltas?.money && selectedOption.statDeltas.money < 0 && money < Math.abs(selectedOption.statDeltas.money)) {
      return;
    }

    setIsExecuting(true);
    setCurrentReply(selectedOption.mentorReply);
    setReplyTone(selectedOption.replyTone);
    setCurrentNarrative(selectedOption.resultNarrative);
    setHasExecuted(true);

    // 回调外部更新游戏数值与回合
    onExecuteOption(selectedOption);
    setIsExecuting(false);
  };

  return (
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
              <>
                {/* 弱化场景背景（虚化降饱和，给人物立绘让位） */}
                <img
                  src={profile.sceneImage}
                  alt="导师办公室环境"
                  className="absolute inset-0 h-full w-full object-cover brightness-[0.45] contrast-[0.95] saturate-[0.7] blur-[2px] scale-110"
                />
                {/* 氛围渐变遮罩：上下深、左右带阴影 */}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#07101d] via-[#07101d]/55 to-[#07101d]/40" />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/35 via-transparent to-black/45" />

                {/* 心境浮窗（贴顶精致小巧） */}
                <div className="absolute left-4 right-4 top-4 z-20 flex items-center gap-2 rounded-xl border border-white/15 bg-[#060c16]/85 px-3 py-1.5 text-[11px] text-slate-300 backdrop-blur-md shadow-lg">
                  <Sparkles size={12} className="text-amber-400 shrink-0 animate-pulse" />
                  <span className="truncate">当前状态：<span className="text-amber-200">{currentMood}</span></span>
                </div>

                {/* 人物立绘主视觉：占据全部可用空间，按比例完整显示 */}
                <div className="relative z-10 flex-1 flex min-h-0 items-end justify-center px-2 pt-2 pb-2">
                  <img
                    src={profile.avatarImage}
                    alt={profile.name}
                    className="max-h-full max-w-full w-auto h-auto object-contain drop-shadow-[0_24px_50px_rgba(0,0,0,0.7)]"
                    style={{ filter: "brightness(1.04) contrast(1.06)" }}
                  />
                </div>
              </>
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
            {/* 对话回响区域（AVG 对白气泡） */}
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

                {/* 执行后的剧情叙述 */}
                {currentNarrative && (
                  <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-3.5 text-xs leading-relaxed text-emerald-200 animate-in fade-in duration-300">
                    <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                    <span>{currentNarrative}</span>
                  </div>
                )}
              </div>
            </div>

            {/* 互动选项池 */}
            {!hasExecuted ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                    选择会面互动事项
                  </h4>
                  <span className="text-xs text-amber-300/80">
                    {canChooseAction ? "可消耗本回合行动" : "本回合已有待处理事项"}
                  </span>
                </div>

                <div className="grid gap-2.5 sm:grid-cols-2">
                  {options.map((opt) => {
                    const isSelected = selectedOption?.id === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleSelectOption(opt)}
                        className={`group relative flex flex-col justify-between rounded-2xl border p-4 text-left transition-all ${
                          isSelected
                            ? "border-[#c9a84c] bg-[#c9a84c]/15 ring-2 ring-[#c9a84c]/30 shadow-lg scale-[1.01]"
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

                        {/* 收益预告 */}
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
                    className="flex items-center gap-2 rounded-xl border border-[#c9a84c]/60 bg-gradient-to-r from-[#c9a84c] to-[#dec678] px-6 py-2.5 text-xs font-bold text-black shadow-lg transition hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <span>确认发起该项交流</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-auto flex items-center justify-between border-t border-white/10 pt-5">
                <span className="text-xs text-emerald-300">
                  ✨ 本轮交流圆满结束，相关属性与好感度已同步更新。
                </span>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex items-center gap-2 rounded-xl border border-[#c9a84c]/60 bg-[#c9a84c] px-6 py-2.5 text-xs font-bold text-black shadow-lg transition hover:brightness-110"
                >
                  <span>确认并返回地图</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
