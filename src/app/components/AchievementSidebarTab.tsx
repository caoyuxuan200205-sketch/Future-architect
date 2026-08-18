/**
 * @file AchievementSidebarTab.tsx
 * @description 桌面端与移动端共用的「荣誉徽章 / 成就图鉴」面板
 * - 徽章美术资产未完成时采用高质感「技术蓝图 / 原型占位框 (Wireframe Prototype)」设计
 * - 支持分类筛选、已解锁/未解锁过滤、达成进度统计与详细成就弹窗
 */
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Award,
  Briefcase,
  Crown,
  GraduationCap,
  Heart,
  Lock,
  Sparkles,
  Search,
  Filter,
  CheckCircle2,
  X,
  Layers,
  ChevronRight,
  HelpCircle,
  ExternalLink,
} from "lucide-react";
import {
  ACHIEVEMENTS,
  ACHIEVEMENT_CATEGORIES,
  ACHIEVEMENT_TIER_SORT_INDEX,
  TIER_META,
  type Achievement,
  type AchievementCategory,
  type AchievementTier,
} from "../achievements/achievementRegistry";
import {
  loadAllUnlockedRecords,
  getAchievementStats,
  type UnlockedRecord,
} from "../achievements/achievementStore";

interface AchievementSidebarTabProps {
  onClose?: () => void;
  newlyUnlockedIds?: string[];
}

const CATEGORY_ICONS: Record<AchievementCategory, typeof Award> = {
  career: Briefcase,
  romance: Heart,
  academic: GraduationCap,
  meme: Sparkles,
  master: Crown,
};

function getTooltipAlignment(index: number) {
  const sm = [
    "sm:left-0 sm:right-auto sm:translate-x-0",
    "sm:left-1/2 sm:right-auto sm:-translate-x-1/2",
    "sm:left-auto sm:right-0 sm:translate-x-0",
  ][index % 3];
  const md = [
    "md:left-0 md:right-auto md:translate-x-0",
    "md:left-1/2 md:right-auto md:-translate-x-1/2",
    "md:left-1/2 md:right-auto md:-translate-x-1/2",
    "md:left-auto md:right-0 md:translate-x-0",
  ][index % 4];
  const lg = [
    "lg:left-0 lg:right-auto lg:translate-x-0",
    "lg:left-1/2 lg:right-auto lg:-translate-x-1/2",
    "lg:left-1/2 lg:right-auto lg:-translate-x-1/2",
    "lg:left-1/2 lg:right-auto lg:-translate-x-1/2",
    "lg:left-auto lg:right-0 lg:translate-x-0",
  ][index % 5];
  const xl = [
    "xl:left-0 xl:right-auto xl:translate-x-0",
    "xl:left-1/2 xl:right-auto xl:-translate-x-1/2",
    "xl:left-1/2 xl:right-auto xl:-translate-x-1/2",
    "xl:left-1/2 xl:right-auto xl:-translate-x-1/2",
    "xl:left-1/2 xl:right-auto xl:-translate-x-1/2",
    "xl:left-auto xl:right-0 xl:translate-x-0",
  ][index % 6];

  return `${sm} ${md} ${lg} ${xl}`;
}

export function AchievementSidebarTab({ onClose, newlyUnlockedIds = [] }: AchievementSidebarTabProps) {
  const [selectedCategory, setSelectedCategory] = useState<AchievementCategory | "all">("all");
  const [filterUnlockedOnly, setFilterUnlockedOnly] = useState<"all" | "unlocked" | "locked">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [inspectingAchievement, setInspectingAchievement] = useState<Achievement | null>(null);
  const detailDialogRef = useRef<HTMLDivElement>(null);

  // 图鉴以本周目 ID 为唯一解锁依据；本地记录仅补充解锁时间信息。
  const records = useMemo(() => {
    const storedRecords = loadAllUnlockedRecords();
    const fallbackUnlockedAt = new Date().toISOString();
    return Object.fromEntries(
      Array.from(new Set(newlyUnlockedIds)).map((id) => [
        id,
        storedRecords[id] ?? { id, unlockedAt: fallbackUnlockedAt },
      ]),
    ) as Record<string, UnlockedRecord>;
  }, [newlyUnlockedIds]);
  const stats = useMemo(() => getAchievementStats(newlyUnlockedIds), [newlyUnlockedIds]);

  const filteredAchievements = useMemo(() => {
    return ACHIEVEMENTS.filter((ach) => {
      // 分类筛选
      if (selectedCategory !== "all" && ach.category !== selectedCategory) return false;

      // 解锁状态筛选
      const isUnlocked = Boolean(records[ach.id]);
      if (filterUnlockedOnly === "unlocked" && !isUnlocked) return false;
      if (filterUnlockedOnly === "locked" && isUnlocked) return false;

      // 搜索筛选
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = ach.title.toLowerCase().includes(q);
        const matchTag = ach.tag.toLowerCase().includes(q);
        const matchDesc = ach.description.toLowerCase().includes(q);
        if (!matchTitle && !matchTag && !matchDesc) return false;
      }

      return true;
    }).sort((left, right) => {
      // 游戏内图鉴：已解锁优先；组内统一按金、紫、红、银排序。
      const leftUnlocked = Boolean(records[left.id]);
      const rightUnlocked = Boolean(records[right.id]);
      if (leftUnlocked !== rightUnlocked) return leftUnlocked ? -1 : 1;
      return ACHIEVEMENT_TIER_SORT_INDEX[left.tier] - ACHIEVEMENT_TIER_SORT_INDEX[right.tier];
    });
  }, [selectedCategory, filterUnlockedOnly, searchQuery, records]);

  useEffect(() => {
    if (!inspectingAchievement) return;

    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusFrame = window.requestAnimationFrame(() => detailDialogRef.current?.focus());
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setInspectingAchievement(null);
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [inspectingAchievement]);

  return (
    <div className="flex flex-col h-full w-full max-h-screen overflow-hidden bg-[#070d1a] text-slate-200 px-4 pt-4 sm:px-6 lg:px-8">
      {/* ── 顶部固定区域 (Header + Categories + Search) ── */}
      <div className="shrink-0 space-y-4 pb-3">
        {/* 顶部总览卡片 */}
        <div className="relative overflow-hidden rounded-2xl border border-[#c9a84c]/30 bg-gradient-to-br from-[#141b2d]/90 via-[#0a1020]/90 to-[#070c18]/90 p-4 sm:p-5 shadow-2xl backdrop-blur-xl">
          {/* 背景装饰网格 */}
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:24px_24px]" />
          <div className="relative z-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#c9a84c]/40 bg-gradient-to-br from-[#c9a84c]/20 to-[#f59e0b]/10 text-[#f5d77f] shadow-[0_0_20px_rgba(201,168,76,0.15)]">
                <Award size={26} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl font-serif">荣誉勋章图鉴</h1>
                  <span className="rounded-full border border-[#c9a84c]/30 bg-[#c9a84c]/10 px-2.5 py-0.5 text-[11px] font-semibold text-[#f5d77f]">
                    {stats.percentage}% 达成
                  </span>
                </div>
                <p className="mt-0.5 text-[12px] text-slate-400">
                  记录三年研究生生涯中的荒诞抉择、学术奇迹、心动羁绊与发疯名场面
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:self-center">
              <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-right">
                <p className="text-[10px] uppercase tracking-wider text-slate-500">本轮已点亮</p>
                <p className="text-base font-bold text-[#dec678] tabular-nums font-mono">
                  {stats.unlockedCount} <span className="text-xs font-normal text-slate-500">/ {stats.total}</span>
                </p>
              </div>
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-white/10 bg-white/[0.03] p-2.5 text-slate-400 transition hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c9a84c]"
                  aria-label="关闭全部成就图鉴"
                  title="关闭"
                >
                  <X size={18} />
                </button>
              )}
            </div>
          </div>

          {/* 进度条 */}
          <div className="relative z-10 mt-3">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.07]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#c9a84c] via-[#eab308] to-[#f59e0b] transition-all duration-700 shadow-[0_0_12px_rgba(201,168,76,0.5)]"
                style={{ width: `${Math.max(stats.percentage > 0 ? 3 : 0, stats.percentage)}%` }}
              />
            </div>
          </div>
        </div>

        {/* 搜索与分类导航 */}
        <div className="space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            {/* 分类 Pills */}
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedCategory("all")}
                className={`rounded-xl px-3.5 py-2 text-[14px] font-semibold tracking-tight transition-all ${
                  selectedCategory === "all"
                    ? "bg-[#c9a84c] text-[#070d18] shadow-md shadow-[#c9a84c]/20"
                    : "border border-white/10 bg-white/[0.03] text-slate-400 hover:bg-white/[0.08] hover:text-white"
                }`}
              >
                全部 ({stats.total})
              </button>
              {(Object.keys(ACHIEVEMENT_CATEGORIES) as AchievementCategory[]).map((catKey) => {
                const meta = ACHIEVEMENT_CATEGORIES[catKey];
                const catStat = stats.categoryStats[catKey];
                const isSelected = selectedCategory === catKey;
                const CategoryIcon = CATEGORY_ICONS[catKey];
                return (
                  <button
                    key={catKey}
                    type="button"
                    onClick={() => setSelectedCategory(catKey)}
                    className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-[14px] font-semibold tracking-tight transition-all ${
                      isSelected
                        ? "bg-[#c9a84c] text-[#070d18] shadow-md shadow-[#c9a84c]/20"
                        : "border border-white/10 bg-white/[0.03] text-slate-400 hover:bg-white/[0.08] hover:text-white"
                    }`}
                  >
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                        isSelected
                          ? "border-[#070d18]/15 bg-[#070d18]/10"
                          : "border-white/10 bg-white/[0.045]"
                      }`}
                      style={isSelected ? undefined : { color: meta.accentColor }}
                    >
                      <CategoryIcon size={13} strokeWidth={1.9} />
                    </span>
                    <span>{meta.shortLabel}</span>
                    <span className={`text-[11px] opacity-75 font-mono ${isSelected ? "text-[#070d18]" : "text-slate-500"}`}>
                      {catStat.unlocked}/{catStat.total}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* 解锁状态过滤 */}
            <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.02] p-1 text-[11px]">
              <button
                type="button"
                onClick={() => setFilterUnlockedOnly("all")}
                className={`rounded-lg px-2.5 py-1 transition ${
                  filterUnlockedOnly === "all" ? "bg-white/10 text-white font-medium" : "text-slate-500 hover:text-slate-300"
                }`}
              >
                全部
              </button>
              <button
                type="button"
                onClick={() => setFilterUnlockedOnly("unlocked")}
                className={`rounded-lg px-2.5 py-1 transition ${
                  filterUnlockedOnly === "unlocked" ? "bg-[#c9a84c]/20 text-[#dec678] font-medium" : "text-slate-500 hover:text-slate-300"
                }`}
              >
                已点亮 ({stats.unlockedCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterUnlockedOnly("locked")}
                className={`rounded-lg px-2.5 py-1 transition ${
                  filterUnlockedOnly === "locked" ? "bg-white/10 text-white font-medium" : "text-slate-500 hover:text-slate-300"
                }`}
              >
                待解锁 ({stats.total - stats.unlockedCount})
              </button>
            </div>
          </div>

          {/* 搜索框 */}
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索成就名称、梗、标签或线索关键字..."
              className="w-full rounded-xl border border-white/10 bg-white/[0.025] py-2 pl-9 pr-4 text-[13px] text-white placeholder-slate-500 outline-none transition focus:border-[#c9a84c]/50 focus:bg-white/[0.05]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── 下方可独立滚动的勋章卡片网格列表 (Scrollable Badges Grid) ── */}
      <div className="flex-1 min-h-0 overflow-x-hidden overflow-y-auto pr-1 pb-28 lg:pb-8 pt-1">
        {filteredAchievements.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 py-16 text-center">
            <HelpCircle size={32} className="mb-2 text-slate-600" />
            <p className="text-[14px] text-slate-400">没有找到匹配的荣誉勋章</p>
            <p className="mt-1 text-[12px] text-slate-600">尝试更换搜索词或清除筛选条件</p>
          </div>
        ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-3.5 pb-16 pt-4">
          {filteredAchievements.map((ach, index) => {
            const unlocked = Boolean(records[ach.id]);
            const tierInfo = TIER_META[ach.tier];
            const isNew = newlyUnlockedIds.includes(ach.id);

            return (
              <button
                type="button"
                key={ach.id}
                onClick={() => setInspectingAchievement(ach)}
                aria-label={`${ach.title}，${unlocked ? "已点亮" : "待解锁"}，查看详情`}
                className={`group relative flex w-full flex-col items-center justify-between rounded-2xl border p-3.5 sm:p-4 text-center transition-all duration-200 cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c9a84c] focus-visible:ring-offset-2 focus-visible:ring-offset-[#070d1a] ${
                  unlocked
                    ? "bg-gradient-to-b from-[#111827]/95 via-[#0b101e]/95 to-[#070c18]/95 hover:-translate-y-1 hover:shadow-xl hover:z-30"
                    : "bg-[#080d19]/80 border-white/[0.06] opacity-65 hover:opacity-100 hover:border-[#c9a84c]/50 hover:-translate-y-1 hover:z-30"
                }`}
                style={{
                  borderColor: unlocked ? tierInfo.border : "rgba(255,255,255,0.08)",
                  boxShadow: unlocked ? `0 4px 20px ${tierInfo.color}15` : undefined,
                }}
              >
                {/* 蓝图技术原型角标 */}
                <div className="pointer-events-none absolute left-2 top-2 text-[8px] font-mono text-slate-600 opacity-40">
                  +{ach.id.slice(0, 6)}
                </div>
                {!ach.imageSrc && (
                  <div className="pointer-events-none absolute right-2 top-2 text-[8px] font-mono text-slate-600 opacity-40">
                    [PROTO]
                  </div>
                )}

                {isNew && (
                  <span className="absolute -right-2 -top-1.5 rounded-full bg-red-500 px-2 py-0.5 text-center text-[8px] font-bold text-white shadow-md z-10">
                    NEW
                  </span>
                )}

                {/* 勋章技术蓝图放大占位框（Enlarged Prototype Wireframe Badge Frame） */}
                <div className="relative mt-2 mb-3 flex items-center justify-center">
                  <div
                    className={`relative flex h-20 w-20 sm:h-22 sm:w-22 md:h-24 md:w-24 shrink-0 items-center justify-center transition-transform duration-200 group-hover:scale-105 ${
                      ach.imageSrc
                        ? ""
                        : unlocked
                        ? "rounded-2xl border overflow-hidden shadow-inner"
                        : "rounded-2xl border border-dashed border-white/15 bg-white/[0.02] overflow-hidden"
                    }`}
                    style={ach.imageSrc ? undefined : {
                      borderColor: unlocked ? tierInfo.border : "rgba(255,255,255,0.12)",
                      background: unlocked ? tierInfo.bg : undefined,
                      boxShadow: unlocked ? `0 0 20px ${tierInfo.color}25` : undefined,
                    }}
                  >
                    {/* 技术网格背景水印 */}
                    {!ach.imageSrc && (
                      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(45deg,transparent_45%,rgba(255,255,255,0.05)_45%,rgba(255,255,255,0.05)_55%,transparent_55%)] bg-[size:10px_10px]" />
                    )}

                    {ach.imageSrc ? (
                      <>
                        <img
                          src={ach.imageSrc}
                          alt=""
                          className={`relative h-full w-full object-contain transition-all duration-200 ${
                            unlocked
                              ? ""
                              : "grayscale brightness-[0.38] contrast-75 opacity-75 group-hover:brightness-[0.52] group-hover:opacity-90"
                          }`}
                        />
                        {!unlocked && (
                          <span className="pointer-events-none absolute bottom-1 right-1 flex h-5 w-5 items-center justify-center rounded-full border border-white/15 bg-[#070c18]/85 text-slate-400 shadow-lg backdrop-blur-sm">
                            <Lock size={11} strokeWidth={1.8} />
                          </span>
                        )}
                      </>
                    ) : unlocked ? (
                        <span className="text-4xl sm:text-5xl drop-shadow-[0_0_12px_rgba(255,255,255,0.4)] select-none">
                          {ach.iconEmoji}
                        </span>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-500">
                        <Lock size={22} strokeWidth={1.7} />
                        <span className="mt-1 text-[8px] font-mono tracking-wider opacity-60">LOCKED</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 勋章标题 */}
                <div className="w-full flex-1 flex items-center justify-center min-h-[36px] px-1">
                  <h3
                    className={`text-[13px] sm:text-[14px] font-bold line-clamp-2 leading-snug tracking-tight font-serif ${
                      unlocked ? "text-slate-100 group-hover:text-white" : "text-slate-400 group-hover:text-slate-200"
                    }`}
                  >
                    {ach.title}
                  </h3>
                </div>

                {/* 悬浮气泡提示 (Hover Tooltip - 悬浮即时显示解锁条件 / 梗故事) */}
                <div className={`pointer-events-none absolute top-[calc(100%+6px)] left-1/2 z-50 hidden w-60 -translate-x-1/2 translate-y-1 opacity-0 drop-shadow-2xl transition-all duration-150 sm:block group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100 ${getTooltipAlignment(index)}`}>
                  <div
                    className="relative rounded-2xl border p-3 text-left backdrop-blur-2xl shadow-2xl"
                    style={{
                      backgroundColor: "rgba(9, 15, 30, 0.98)",
                      borderColor: unlocked ? tierInfo.border : "rgba(201, 168, 76, 0.5)",
                      boxShadow: `0 16px 40px rgba(0, 0, 0, 0.8), 0 0 20px ${tierInfo.color}25`,
                    }}
                  >
                    {/* 小三角尖角指向卡片 */}
                    <div
                      className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 border-t border-l"
                      style={{
                        backgroundColor: "rgba(9, 15, 30, 0.98)",
                        borderColor: unlocked ? tierInfo.border : "rgba(201, 168, 76, 0.5)",
                      }}
                    />

                    {/* 标题栏 */}
                    <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-white/[0.08]">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: tierInfo.color, boxShadow: `0 0 6px ${tierInfo.color}` }}
                        />
                        <span className="text-[12px] font-bold text-white font-serif tracking-tight">{ach.title}</span>
                      </div>
                      <span className={`text-[9px] font-mono font-semibold ${unlocked ? "text-emerald-400" : "text-[#dec678]"}`}>
                        {unlocked ? "✨ 已点亮" : "🔒 待探索"}
                      </span>
                    </div>

                    {/* 解锁线索 / 故事正文 */}
                    <div className="space-y-1">
                      <p className="text-[10px] font-mono uppercase tracking-wider text-[#dec678] font-bold">
                        {unlocked ? "📖 勋章梗档案：" : "🔍 解锁条件线索："}
                      </p>
                      <p className={`text-[11px] leading-relaxed ${unlocked ? "text-slate-200 font-serif" : "text-amber-100 font-sans"}`}>
                        {unlocked ? ach.description : ach.hint}
                      </p>
                    </div>

                    {/* 底部引导 */}
                    <div className="mt-2 pt-1.5 border-t border-white/[0.05] text-[9px] font-mono text-slate-400 flex items-center justify-between">
                      <span className="rounded bg-white/[0.04] px-1 py-0.2 border border-white/[0.06]">{ach.tag}</span>
                      <span className="text-[#c9a84c] flex items-center gap-0.5">点击查看详情 <ChevronRight size={10} /></span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
      </div>

      {/* 勋章详情弹窗 (Inspection Modal) */}
      {inspectingAchievement && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-150"
          onClick={() => setInspectingAchievement(null)}
        >
          <div
            ref={detailDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="achievement-detail-title"
            tabIndex={-1}
            className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-[#c9a84c]/35 bg-[#0a1122] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 顶栏 */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span
                  className="rounded-md px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider"
                  style={{
                    background: TIER_META[inspectingAchievement.tier].bg,
                    color: TIER_META[inspectingAchievement.tier].color,
                    border: `1px solid ${TIER_META[inspectingAchievement.tier].border}`,
                  }}
                >
                  {TIER_META[inspectingAchievement.tier].label} · {TIER_META[inspectingAchievement.tier].enLabel}
                </span>
                <span className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[11px] text-slate-300">
                  {ACHIEVEMENT_CATEGORIES[inspectingAchievement.category].label}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setInspectingAchievement(null)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
                aria-label="关闭勋章详情"
              >
                <X size={18} />
              </button>
            </div>

            {/* 核心展示区 */}
            <div className="my-6 flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
              {/* 大号技术原型勋章 */}
              <div
                className={`relative flex h-28 w-28 shrink-0 items-center justify-center ${
                  inspectingAchievement.imageSrc
                    ? ""
                    : "rounded-3xl border-2 shadow-2xl overflow-hidden"
                }`}
                style={inspectingAchievement.imageSrc ? undefined : {
                  borderColor: Boolean(records[inspectingAchievement.id])
                    ? TIER_META[inspectingAchievement.tier].color
                    : "rgba(255,255,255,0.2)",
                  background: Boolean(records[inspectingAchievement.id])
                    ? `radial-gradient(circle, ${TIER_META[inspectingAchievement.tier].color}25 0%, rgba(10,17,34,0.9) 70%)`
                    : "rgba(255,255,255,0.03)",
                }}
              >
                {/* 蓝图水印 */}
                {!inspectingAchievement.imageSrc && (
                  <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(45deg,transparent_45%,rgba(255,255,255,0.04)_45%,rgba(255,255,255,0.04)_55%,transparent_55%)] bg-[size:14px_14px]" />
                )}
                {!inspectingAchievement.imageSrc && (
                  <span className="pointer-events-none absolute bottom-1.5 text-[8px] font-mono text-slate-500 opacity-60">
                    [ PROTOTYPE_ASSET ]
                  </span>
                )}

                {inspectingAchievement.imageSrc ? (
                  <>
                    <img
                      src={inspectingAchievement.imageSrc}
                      alt=""
                      className={`relative h-full w-full object-contain ${
                        records[inspectingAchievement.id]
                          ? ""
                          : "grayscale brightness-[0.42] contrast-75 opacity-80"
                      }`}
                    />
                    {!records[inspectingAchievement.id] && (
                      <span className="pointer-events-none absolute bottom-1 right-1 flex h-7 w-7 items-center justify-center rounded-full border border-white/15 bg-[#070c18]/90 text-slate-400 shadow-lg backdrop-blur-sm">
                        <Lock size={15} strokeWidth={1.8} />
                      </span>
                    )}
                  </>
                ) : Boolean(records[inspectingAchievement.id]) ? (
                    <span className="text-6xl drop-shadow-[0_0_20px_rgba(255,255,255,0.5)]">
                      {inspectingAchievement.iconEmoji}
                    </span>
                ) : (
                  <Lock size={36} className="text-slate-600" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <h2 id="achievement-detail-title" className="text-2xl font-bold text-white font-serif">{inspectingAchievement.title}</h2>
                </div>
                <p className="mt-1 text-[12px] text-[#c9a84c] font-medium">
                  {inspectingAchievement.tag} · {Boolean(records[inspectingAchievement.id]) ? "✨ 已解锁达成" : "🔒 待解锁探索"}
                </p>
                {records[inspectingAchievement.id] && (
                  <p className="mt-1 text-[10px] text-slate-500 font-mono">
                    解锁时间：{new Date(records[inspectingAchievement.id].unlockedAt).toLocaleString()}
                  </p>
                )}
              </div>
            </div>

            {/* 描述与故事 */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-[13px] leading-relaxed">
              <p className="text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">
                {Boolean(records[inspectingAchievement.id]) ? "📖 故事与梗：" : "🔍 解锁线索："}
              </p>
              <p className={Boolean(records[inspectingAchievement.id]) ? "text-slate-200 font-serif leading-loose" : "text-slate-400 italic"}>
                {Boolean(records[inspectingAchievement.id]) ? inspectingAchievement.description : inspectingAchievement.hint}
              </p>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setInspectingAchievement(null)}
                className="rounded-xl border border-white/10 bg-white/[0.05] px-6 py-2.5 text-[13px] font-medium text-white hover:bg-white/10"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
