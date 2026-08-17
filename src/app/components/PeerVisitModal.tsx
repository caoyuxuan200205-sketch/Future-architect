import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Heart,
  X,
  GraduationCap,
  Quote,
  MessageSquare,
  CheckCircle2,
  ChevronRight,
  Coffee,
  BookOpen,
  Lock,
  Flame,
  User,
  Briefcase,
} from "lucide-react";
import {
  ZHANG_YIFAN_PROFILE,
  PEER_STUDY_OPTIONS,
  PEER_ROMANCE_OPTIONS,
  LU_YUCHEN_PROFILE,
  LU_YUCHEN_STUDY_OPTIONS,
  LU_YUCHEN_ROMANCE_OPTIONS,
  LU_YUCHEN_FIRST_MEET,
  BAI_XU_PROFILE,
  BAI_XU_STUDY_OPTIONS,
  BAI_XU_ROMANCE_OPTIONS,
  BAI_XU_FIRST_MEET,
  JIANG_HUAI_PROFILE,
  JIANG_HUAI_STUDY_OPTIONS,
  JIANG_HUAI_ROMANCE_OPTIONS,
  JIANG_HUAI_FIRST_MEET,
  SHEN_QINGHUAI_PROFILE,
  SHEN_QINGHUAI_STUDY_OPTIONS,
  SHEN_QINGHUAI_ROMANCE_OPTIONS,
  SHEN_QINGHUAI_FIRST_MEET,
  DAILY_VISIT_GREETINGS,
  type PeerProfile,
  type PeerOption,
  type DialogueTurn,
} from "../npc/peerData";

export interface PeerVisitModalProps {
  isOpen: boolean;
  onClose: () => void;
  characterId?: "zhang_yifan" | "lu_yuchen" | "bai_xu" | "jiang_huai" | "shen_qinghuai";
  favorability?: number;
  canChooseAction?: boolean;
  isFirstMeet?: boolean;
  onCompleteFirstMeet?: () => void;
  onExecuteOption?: (option: PeerOption) => void;
}

export function PeerVisitModal({
  isOpen,
  onClose,
  characterId = "zhang_yifan",
  favorability = 68,
  canChooseAction = true,
  isFirstMeet = false,
  onCompleteFirstMeet,
  onExecuteOption,
}: PeerVisitModalProps) {
  // 一级分类切换：研习互助 vs 私密心动 vs 个人档案
  const [activeCategory, setActiveCategory] = useState<"study" | "romance" | "profile">("study");
  const [selectedOption, setSelectedOption] = useState<PeerOption | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [hasExecuted, setHasExecuted] = useState(false);
  const [currentMoodIndex, setCurrentMoodIndex] = useState(0);

  // 剧情多轮对话序列播放状态
  const [dialogueSequence, setDialogueSequence] = useState<DialogueTurn[]>([]);
  const [dialogueIndex, setDialogueIndex] = useState(0);
  const [dialogueComplete, setDialogueComplete] = useState(false);
  const isDialoguePlaying = dialogueSequence.length > 0 && !dialogueComplete;

  const profile: PeerProfile = characterId === "lu_yuchen"
    ? LU_YUCHEN_PROFILE
    : characterId === "bai_xu"
      ? BAI_XU_PROFILE
      : characterId === "jiang_huai"
        ? JIANG_HUAI_PROFILE
        : characterId === "shen_qinghuai"
          ? SHEN_QINGHUAI_PROFILE
          : ZHANG_YIFAN_PROFILE;
  const studyOptions = characterId === "lu_yuchen"
    ? LU_YUCHEN_STUDY_OPTIONS
    : characterId === "bai_xu"
      ? BAI_XU_STUDY_OPTIONS
      : characterId === "jiang_huai"
        ? JIANG_HUAI_STUDY_OPTIONS
        : characterId === "shen_qinghuai"
          ? SHEN_QINGHUAI_STUDY_OPTIONS
          : PEER_STUDY_OPTIONS;
  const romanceOptions = characterId === "lu_yuchen"
    ? LU_YUCHEN_ROMANCE_OPTIONS
    : characterId === "bai_xu"
      ? BAI_XU_ROMANCE_OPTIONS
      : characterId === "jiang_huai"
        ? JIANG_HUAI_ROMANCE_OPTIONS
        : characterId === "shen_qinghuai"
          ? SHEN_QINGHUAI_ROMANCE_OPTIONS
          : PEER_ROMANCE_OPTIONS;

  useEffect(() => {
    if (isOpen) {
      setActiveCategory("study");
      setSelectedOption(null);
      setIsExecuting(false);
      setHasExecuted(false);
      setCurrentMoodIndex(Math.floor(Math.random() * profile.currentMoods.length));

      // 初次见面特别剧情
      if (isFirstMeet && characterId === "lu_yuchen") {
        setDialogueSequence(LU_YUCHEN_FIRST_MEET);
        setDialogueIndex(0);
        setDialogueComplete(false);
      } else if (isFirstMeet && characterId === "bai_xu") {
        setDialogueSequence(BAI_XU_FIRST_MEET);
        setDialogueIndex(0);
        setDialogueComplete(false);
      } else if (isFirstMeet && characterId === "jiang_huai") {
        setDialogueSequence(JIANG_HUAI_FIRST_MEET);
        setDialogueIndex(0);
        setDialogueComplete(false);
      } else if (isFirstMeet && characterId === "shen_qinghuai") {
        setDialogueSequence(SHEN_QINGHUAI_FIRST_MEET);
        setDialogueIndex(0);
        setDialogueComplete(false);
      } else {
        const pool = DAILY_VISIT_GREETINGS[characterId] || [];
        if (pool.length > 0) {
          const randomIndex = Math.floor(Math.random() * pool.length);
          setDialogueSequence(pool[randomIndex]);
          setDialogueIndex(0);
          setDialogueComplete(false);
        } else {
          setDialogueSequence([]);
          setDialogueIndex(0);
          setDialogueComplete(false);
        }
      }
    }
  }, [isOpen, characterId, isFirstMeet, profile.currentMoods.length]);

  if (!isOpen) return null;

  const currentMood = profile.currentMoods[currentMoodIndex] || profile.quote;

  const handleSelectOption = (opt: PeerOption) => {
    if (favorability < opt.unlockFavorability) return;
    setSelectedOption(opt);
  };

  const handleConfirmAction = () => {
    if (!selectedOption || isExecuting) return;
    setIsExecuting(true);

    if (selectedOption.dialogueSequence && selectedOption.dialogueSequence.length > 0) {
      setDialogueSequence(selectedOption.dialogueSequence);
      setDialogueIndex(0);
      setDialogueComplete(false);
    } else {
      setDialogueComplete(true);
      setHasExecuted(true);
      if (onExecuteOption) {
        onExecuteOption(selectedOption);
      }
    }
    setIsExecuting(false);
  };

  const advanceDialogue = () => {
    if (dialogueIndex < dialogueSequence.length - 1) {
      setDialogueIndex(dialogueIndex + 1);
    } else {
      setDialogueComplete(true);
      if (isFirstMeet && onCompleteFirstMeet) {
        onCompleteFirstMeet();
      } else if (selectedOption && onExecuteOption) {
        setHasExecuted(true);
        onExecuteOption(selectedOption);
      }
    }
  };

  const skipDialogue = () => {
    setDialogueComplete(true);
    if (isFirstMeet && onCompleteFirstMeet) {
      onCompleteFirstMeet();
    } else if (selectedOption && onExecuteOption) {
      setHasExecuted(true);
      onExecuteOption(selectedOption);
    }
  };

  const triggerRandomGreeting = () => {
    const pool = DAILY_VISIT_GREETINGS[characterId] || [];
    if (pool.length > 0) {
      setSelectedOption(null);
      const randomIndex = Math.floor(Math.random() * pool.length);
      setDialogueSequence(pool[randomIndex]);
      setDialogueIndex(0);
      setDialogueComplete(false);
    }
  };

  const currentOptions = activeCategory === "study" ? studyOptions : romanceOptions;

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center bg-[#020611]/88 p-3 backdrop-blur-md sm:p-6 animate-in fade-in duration-200">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="peer-office-title"
        className="relative flex h-[92vh] max-h-[860px] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-[#c9a84c]/35 bg-[#07101d] shadow-[0_30px_100px_rgba(0,0,0,0.75)]"
      >
        {/* 顶部标题栏 */}
        <header className="flex shrink-0 items-center justify-between border-b border-white/10 bg-[#0a1424]/90 px-6 py-4 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#c9a84c]/30 bg-[#c9a84c]/10 text-[#d7bb66] shadow-inner">
              {characterId === "lu_yuchen" ? <Briefcase size={22} /> : characterId === "bai_xu" ? <Coffee size={22} /> : characterId === "jiang_huai" ? <Flame size={22} /> : characterId === "shen_qinghuai" ? <BookOpen size={22} /> : <GraduationCap size={22} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-medium tracking-[0.2em] text-[#c9a84c] uppercase">
                  {characterId === "lu_yuchen" ? "CAREER ADVISOR · HOT NERD" : characterId === "bai_xu" ? "CAFE CORNER · JUNIOR" : characterId === "jiang_huai" ? "DORM 502 · ATHLETE ROOMMATE" : characterId === "shen_qinghuai" ? "LIBRARY 3F · SCHOLARLY SENIOR" : "PEER WORKSTATION"}
                </span>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-slate-300">
                  {characterId === "lu_yuchen" ? "就业中心 204" : characterId === "bai_xu" ? "咖啡馆 阳光卡座" : characterId === "jiang_huai" ? "宿舍 502 室" : "中大院 302"}
                </span>
              </div>
              <h2 id="peer-office-title" className="text-xl font-bold text-white tracking-wide">
                {profile.name} <span className="text-sm font-normal text-slate-400">· {profile.title}</span>
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* 好感度徽章 */}
            <div className="flex items-center gap-2 rounded-full border border-rose-500/30 bg-rose-950/30 px-3.5 py-1.5 backdrop-blur-md">
              <Heart size={15} className="text-rose-400 fill-rose-400/50 animate-pulse" />
              <span className="text-xs text-slate-300">好感度</span>
              <span className="font-semibold text-rose-300 text-sm">{favorability}</span>
              <span className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-rose-500/20 text-rose-200 border border-rose-400/30">
                {favorability >= 90 ? "唯一解" : favorability >= 75 ? "智性心动" : favorability >= 55 ? "亲密同门" : "初识搭子"}
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

        {/* 视窗主体：AVG 左右分屏 */}
        <div className="grid flex-1 grid-cols-1 overflow-hidden lg:grid-cols-12">
          {/* 左侧：沉浸式视觉小说舞台（纯白底无缝融合 + 人物立绘） */}
          <div className="relative flex flex-col overflow-hidden border-b border-white/10 lg:col-span-5 lg:border-b-0 lg:border-r bg-white">
            {/* 心境浮窗 */}
            <div className="absolute left-4 right-4 top-4 z-20 flex items-center gap-2 rounded-xl border border-slate-900/10 bg-[#060c16]/85 px-3 py-1.5 text-[11px] text-slate-300 backdrop-blur-md shadow-lg">
              <Sparkles size={12} className="text-amber-400 shrink-0 animate-pulse" />
              <span className="truncate">
                当前状态：<span className="text-amber-200">{currentMood}</span>
              </span>
            </div>

            {/* 人物立绘主视觉 */}
            <div className="relative z-10 flex-1 flex min-h-0 items-end justify-center overflow-hidden bg-white">
              <img
                src={profile.avatarImage || (profile as any).avatar || "/characters/shen_qinghuai.jpg"}
                alt={profile.name}
                className="max-h-full max-w-full w-auto h-auto object-contain transition-all duration-700 animate-avg-breathe"
                style={{ filter: "brightness(1.02) contrast(1.04)" }}
              />
            </div>
          </div>

          {/* 右侧：分类互动与多轮对话系统 */}
          <div className="flex flex-col justify-between overflow-y-auto lg:col-span-7 bg-[#07101d]/95 p-6 lg:p-8">
            <div className="space-y-4">
              {/* 一级分类选项卡切换 */}
              {!hasExecuted && !isDialoguePlaying && (
                <div className="flex items-center gap-2 rounded-2xl bg-black/40 p-1.5 border border-white/10">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveCategory("study");
                      setSelectedOption(null);
                    }}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition ${
                      activeCategory === "study"
                        ? "bg-gradient-to-r from-[#c9a84c]/25 to-[#c9a84c]/10 text-[#fde047] border border-[#c9a84c]/40 shadow-md"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <BookOpen size={15} />
                    <span>研习互助 · 战略与方案</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveCategory("romance");
                      setSelectedOption(null);
                    }}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition ${
                      activeCategory === "romance"
                        ? "bg-gradient-to-r from-rose-500/25 to-pink-500/10 text-rose-200 border border-rose-400/40 shadow-md"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <Flame size={15} className="text-rose-400" />
                    <span>私密心动 · 恋爱羁绊</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveCategory("profile");
                      setSelectedOption(null);
                    }}
                    className={`flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
                      activeCategory === "profile"
                        ? "bg-white/10 text-white border border-white/20 shadow-md"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <User size={14} />
                    <span>档案</span>
                  </button>
                </div>
              )}

              {/* 剧情播放器正在播放时展示：沉浸式多轮字幕 */}
              {isDialoguePlaying ? (
                <div className="rounded-2xl border border-sky-400/30 bg-[#0c172a]/90 p-5 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-300">
                  <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-rose-400 animate-ping" />
                      <span className="text-xs font-bold tracking-wider text-rose-200 uppercase">
                        {isFirstMeet ? "初次相遇剧情" : "情境剧情进行中"} · 第 {dialogueIndex + 1} / {dialogueSequence.length} 幕
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={skipDialogue}
                      className="text-xs text-slate-400 hover:text-amber-300 transition"
                    >
                      跳过剧情 ⏩
                    </button>
                  </div>

                  {(() => {
                    const turn = dialogueSequence[dialogueIndex];
                    if (!turn) return null;

                    if (turn.speaker === "narration") {
                      return (
                        <div
                          onClick={advanceDialogue}
                          className="cursor-pointer rounded-2xl border border-amber-400/20 bg-amber-950/20 p-4 text-[13px] leading-relaxed text-amber-100/90 italic shadow-inner"
                        >
                          <div className="mb-1 flex items-center gap-1.5 text-[10px] uppercase font-bold text-amber-300/70">
                            <Sparkles size={11} />
                            <span>场景叙述</span>
                          </div>
                          {turn.content}
                          <div className="mt-3 text-right text-[11px] font-sans not-italic text-amber-300/80 animate-pulse">
                            点击继续 ▶
                          </div>
                        </div>
                      );
                    }

                    const isPlayer = turn.speaker === "player";
                    return (
                      <div
                        onClick={advanceDialogue}
                        className="cursor-pointer flex items-start gap-3 p-2 rounded-2xl hover:bg-white/[0.02] transition"
                      >
                        <img
                          src={isPlayer ? "/assets/visuals/avatars/user-avatar.png" : profile.avatarImage}
                          alt="发言者头像"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = "none";
                          }}
                          className={`h-11 w-11 shrink-0 rounded-2xl border ${isPlayer ? "border-amber-400/40" : "border-rose-400/40"} object-cover shadow-md`}
                        />
                        <div className="flex-1 rounded-2xl p-4 text-sm leading-relaxed text-slate-100 shadow-lg bg-[#111e33] border border-white/10">
                          <p className={`font-bold text-xs mb-1 ${isPlayer ? "text-amber-300" : "text-rose-300"}`}>
                            {isPlayer ? "你" : profile.name}：
                          </p>
                          <p>{turn.content}</p>
                          <div className="mt-3 text-right text-[11px] text-sky-300/80 animate-pulse">
                            点击继续 ▶
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : hasExecuted && selectedOption ? (
                /* 剧情播放完毕后的结算与总结卡片 */
                <div className="space-y-4 rounded-2xl border border-emerald-500/30 bg-[#0c172a]/90 p-6 shadow-2xl backdrop-blur-xl animate-in fade-in duration-300">
                  <div className="flex items-center gap-2 text-emerald-300 font-bold text-sm border-b border-white/10 pb-3">
                    <CheckCircle2 size={18} className="text-emerald-400" />
                    <span>互动完成 · 本轮交流圆满结束</span>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-xs leading-relaxed text-slate-200">
                    <p className="font-semibold text-amber-300 mb-1">
                      {selectedOption.icon} {selectedOption.label}
                    </p>
                    <p className="text-slate-300">
                      {selectedOption.dialogueSequence?.slice().reverse().find((d) => d.speaker === "narration" || d.speaker === "peer")?.content || selectedOption.description}
                    </p>
                  </div>

                  {selectedOption.statDeltas && (
                    <div>
                      <p className="text-xs font-bold text-slate-400 mb-2">本次收获属性与好感：</p>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedOption.statDeltas.arch && (
                          <span className="rounded-lg bg-amber-500/15 border border-amber-400/30 px-2.5 py-1 text-xs text-amber-300 font-medium">
                            建筑底蕴 +{selectedOption.statDeltas.arch}
                          </span>
                        )}
                        {selectedOption.statDeltas.logic && (
                          <span className="rounded-lg bg-sky-500/15 border border-sky-400/30 px-2.5 py-1 text-xs text-sky-300 font-medium">
                            逻辑思维 +{selectedOption.statDeltas.logic}
                          </span>
                        )}
                        {selectedOption.statDeltas.expression && (
                          <span className="rounded-lg bg-purple-500/15 border border-purple-400/30 px-2.5 py-1 text-xs text-purple-300 font-medium">
                            表达能力 +{selectedOption.statDeltas.expression}
                          </span>
                        )}
                        {selectedOption.statDeltas.commercial && (
                          <span className="rounded-lg bg-amber-500/15 border border-amber-400/30 px-2.5 py-1 text-xs text-amber-300 font-medium">
                            商业嗅觉 +{selectedOption.statDeltas.commercial}
                          </span>
                        )}
                        {selectedOption.statDeltas.dataSense && (
                          <span className="rounded-lg bg-cyan-500/15 border border-cyan-400/30 px-2.5 py-1 text-xs text-cyan-300 font-medium">
                            数据分析 +{selectedOption.statDeltas.dataSense}
                          </span>
                        )}
                        {selectedOption.statDeltas.codeBasic && (
                          <span className="rounded-lg bg-emerald-500/15 border border-emerald-400/30 px-2.5 py-1 text-xs text-emerald-300 font-medium">
                            代码基础 +{selectedOption.statDeltas.codeBasic}
                          </span>
                        )}
                        {selectedOption.statDeltas.network && (
                          <span className="rounded-lg bg-emerald-500/15 border border-emerald-400/30 px-2.5 py-1 text-xs text-emerald-300 font-medium">
                            人脉/默契 +{selectedOption.statDeltas.network}
                          </span>
                        )}
                        {selectedOption.statDeltas.favorability && (
                          <span className="rounded-lg bg-rose-500/15 border border-rose-400/30 px-2.5 py-1 text-xs text-rose-300 font-medium">
                            好感度 +{selectedOption.statDeltas.favorability}
                          </span>
                        )}
                        {selectedOption.statDeltas.stress && selectedOption.statDeltas.stress < 0 && (
                          <span className="rounded-lg bg-teal-500/15 border border-teal-400/30 px-2.5 py-1 text-xs text-teal-300 font-medium">
                            压力 {selectedOption.statDeltas.stress}
                          </span>
                        )}
                        {selectedOption.statDeltas.selfDoubt && selectedOption.statDeltas.selfDoubt < 0 && (
                          <span className="rounded-lg bg-pink-500/15 border border-pink-400/30 px-2.5 py-1 text-xs text-pink-300 font-medium">
                            自信上升
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : activeCategory === "profile" ? (
                /* 个人档案详情 */
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="rounded-2xl border border-[#c9a84c]/30 bg-[#0c172a]/80 p-5">
                    <div className="flex items-center gap-4">
                      <img
                        src={profile.avatarImage}
                        alt={profile.name}
                        className="h-16 w-16 shrink-0 rounded-2xl border-2 border-[#c9a84c]/50 object-cover shadow-lg"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold text-white">{profile.name}</h3>
                          <span className="rounded-full bg-[#c9a84c]/20 border border-[#c9a84c]/40 px-2.5 py-0.5 text-[11px] font-semibold text-[#dec678]">
                            {profile.personalityTag}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-300">{profile.grade}</p>
                        <p className="mt-0.5 text-xs text-[#c9a84c]">{profile.locationName}</p>
                      </div>
                    </div>

                    <div className="mt-4 rounded-xl border border-[#c9a84c]/20 bg-[#c9a84c]/[0.06] p-3 text-xs leading-relaxed text-amber-200 italic">
                      <Quote size={13} className="inline mr-1 opacity-70" />
                      {profile.quote}
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                      <p className="text-xs font-bold text-slate-200 mb-2">擅长领域</p>
                      <div className="flex flex-wrap gap-1.5">
                        {profile.bio.specialties.map((s, idx) => (
                          <span key={idx} className="rounded-lg bg-white/5 border border-white/10 px-2 py-1 text-[11px] text-slate-300">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                      <p className="text-xs font-bold text-slate-200 mb-2">兴趣与日常</p>
                      <p className="text-xs text-slate-300 leading-relaxed">{profile.bio.interest}</p>
                    </div>
                  </div>
                </div>
              ) : (
                /* 选项列表 (研习互助 / 私密心动) */
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      {activeCategory === "study" ? "选择学术与求职研讨事项" : "选择亲密互动与情感升温"}
                    </h4>
                    <span className="text-xs text-amber-300/80">
                      {canChooseAction ? "可消耗本回合行动" : "本回合已有待处理事项"}
                    </span>
                  </div>

                  <div className="grid gap-2.5 sm:grid-cols-2">
                    {currentOptions.map((opt) => {
                      const isLocked = favorability < opt.unlockFavorability;
                      const isSelected = selectedOption?.id === opt.id;
                      const isRomance = opt.category === "romance";

                      return (
                        <button
                          key={opt.id}
                          type="button"
                          disabled={isLocked}
                          onClick={() => handleSelectOption(opt)}
                          className={`group relative flex flex-col justify-between rounded-2xl border p-4 text-left transition-all ${
                            isLocked
                              ? "border-white/5 bg-black/30 opacity-60 cursor-not-allowed"
                              : isSelected
                                ? isRomance
                                  ? "border-rose-400 bg-rose-500/20 ring-2 ring-rose-400/40 shadow-lg scale-[1.01]"
                                  : "border-[#c9a84c] bg-[#c9a84c]/15 ring-2 ring-[#c9a84c]/30 shadow-lg scale-[1.01]"
                                : isRomance
                                  ? "border-rose-500/20 bg-rose-950/10 hover:border-rose-400/40 hover:bg-rose-500/15"
                                  : "border-white/10 bg-white/[0.03] hover:border-[#c9a84c]/40 hover:bg-white/[0.06]"
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                                <span className="text-base">{opt.icon}</span>
                                {opt.label}
                              </span>
                              {isLocked ? (
                                <span className="flex items-center gap-1 rounded-full bg-red-950/50 border border-red-500/30 px-2 py-0.5 text-[10px] text-red-300 font-medium">
                                  <Lock size={10} /> 好感需 ≥{opt.unlockFavorability}
                                </span>
                              ) : (
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium border ${
                                  isRomance
                                    ? "bg-rose-500/20 text-rose-200 border-rose-400/30"
                                    : "bg-[#c9a84c]/20 text-[#dec678] border-[#c9a84c]/30"
                                }`}>
                                  {opt.tag}
                                </span>
                              )}
                            </div>
                            <p className="text-xs leading-relaxed text-slate-400 line-clamp-2">
                              {isLocked ? "与同门的好感度尚未达到该阶段，继续共同画图或交流可解锁亲密互动。" : opt.description}
                            </p>
                          </div>

                          {opt.statDeltas && !isLocked && (
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
                              {opt.statDeltas.expression && (
                                <span className="text-purple-300 font-medium">
                                  表达能力 +{opt.statDeltas.expression}
                                </span>
                              )}
                              {opt.statDeltas.commercial && (
                                <span className="text-amber-300 font-medium">
                                  商业嗅觉 +{opt.statDeltas.commercial}
                                </span>
                              )}
                              {opt.statDeltas.dataSense && (
                                <span className="text-cyan-300 font-medium">
                                  数据分析 +{opt.statDeltas.dataSense}
                                </span>
                              )}
                              {opt.statDeltas.codeBasic && (
                                <span className="text-emerald-300 font-medium">
                                  代码基础 +{opt.statDeltas.codeBasic}
                                </span>
                              )}
                              {opt.statDeltas.network && (
                                <span className="text-emerald-300 font-medium">
                                  人脉/默契 +{opt.statDeltas.network}
                                </span>
                              )}
                              {opt.statDeltas.favorability && (
                                <span className="text-rose-300 font-medium">
                                  好感度 +{opt.statDeltas.favorability}
                                </span>
                              )}
                              {opt.statDeltas.stress && opt.statDeltas.stress < 0 && (
                                <span className="text-teal-300 font-medium">
                                  压力 {opt.statDeltas.stress}
                                </span>
                              )}
                              {opt.statDeltas.selfDoubt && opt.statDeltas.selfDoubt < 0 && (
                                <span className="text-rose-300 font-medium">
                                  自信上升
                                </span>
                              )}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* 底部行动确认栏 */}
            <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-white/15 px-4 py-2.5 text-xs text-slate-400 transition hover:bg-white/5 hover:text-white"
              >
                {hasExecuted ? "完成交流 · 返回回合" : "稍后探讨 · 告辞离开"}
              </button>

              {!hasExecuted && !isDialoguePlaying && activeCategory !== "profile" && (
                <button
                  type="button"
                  disabled={!selectedOption}
                  onClick={handleConfirmAction}
                  className={`flex items-center gap-2 rounded-xl px-6 py-2.5 text-xs font-bold shadow-lg transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 ${
                    selectedOption?.category === "romance"
                      ? "border border-rose-400/60 bg-gradient-to-r from-rose-500 to-pink-400 text-white hover:brightness-110"
                      : "border border-[#c9a84c]/60 bg-gradient-to-r from-[#c9a84c] to-[#dec678] text-black hover:brightness-110"
                  }`}
                >
                  <span>{selectedOption?.category === "romance" ? "发起心动互动" : "确认发起该项交流"}</span>
                  <ChevronRight size={14} />
                </button>
              )}

              {hasExecuted && (
                <button
                  type="button"
                  onClick={onClose}
                  className="flex items-center gap-2 rounded-xl border border-emerald-400/60 bg-gradient-to-r from-emerald-500 to-teal-400 px-6 py-2.5 text-xs font-bold text-slate-950 shadow-lg hover:brightness-110"
                >
                  <span>确认结算并返回</span>
                  <ChevronRight size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
