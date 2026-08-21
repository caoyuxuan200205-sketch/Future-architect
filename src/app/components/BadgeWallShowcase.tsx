/**
 * @file BadgeWallShowcase.tsx
 * @description 结局页「中大院发疯荣誉勋章墙」展示组件
 * - 兼顾网页端交互与 html-to-image 截图导出
 * - 采用技术蓝图 / 原型占位框风格，支持高亮展示本局新解锁成就
 */
import { useMemo, useState } from "react";
import { Award, ChevronRight } from "lucide-react";
import {
  ACHIEVEMENTS,
  ACHIEVEMENT_TIER_DISPLAY_ORDER,
  ACHIEVEMENT_TIER_SORT_INDEX,
  TIER_META,
} from "../achievements/achievementRegistry";
import { AchievementSidebarTab } from "./AchievementSidebarTab";

interface BadgeWallShowcaseProps {
  /** 本局刚刚解锁的成就 ID 列表 */
  currentRunUnlockedIds?: string[];
  isExporting?: boolean;
}

export function BadgeWallShowcase({
  currentRunUnlockedIds = [],
  isExporting = false,
}: BadgeWallShowcaseProps) {
  const [showAllAchievements, setShowAllAchievements] = useState(false);

  // 只展示本周目获得的成就；优先展示高稀有度，同档保留实际解锁顺序。
  const currentRunAchievements = useMemo(() => {
    const achievementById = new Map(ACHIEVEMENTS.map((achievement) => [achievement.id, achievement]));
    return Array.from(new Set(currentRunUnlockedIds))
      .map((id) => achievementById.get(id))
      .filter((achievement): achievement is NonNullable<typeof achievement> => Boolean(achievement))
      .sort((left, right) => ACHIEVEMENT_TIER_SORT_INDEX[left.tier] - ACHIEVEMENT_TIER_SORT_INDEX[right.tier]);
  }, [currentRunUnlockedIds]);

  const currentRunCount = currentRunAchievements.length;

  return (
    <>
      <div
        className="rounded-2xl p-6 sm:p-7 mb-8 overflow-visible relative"
        style={{
          background: "linear-gradient(145deg, rgba(20,27,45,0.92), rgba(7,12,25,0.95))",
          border: "1px solid rgba(201,168,76,0.32)",
          boxShadow: "0 18px 50px rgba(0,0,0,0.35)",
        }}
      >
      {/* 装饰水印 */}
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-20"
        style={{
          backgroundImage: "linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      />

      {/* 标题栏与火漆印章 */}
      <div className="relative z-10 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-mono tracking-[0.25em] uppercase text-[#c9a84c]">
              GRADUATE HONORS · 荣誉勋章墙
            </span>
          </div>
          <h2
            className="mt-1 text-2xl sm:text-3xl font-bold text-white tracking-tight"
            style={{ fontFamily: "'Playfair Display', 'Noto Serif SC', serif" }}
          >
            三年发疯与高光成就展柜
          </h2>
          <p className="mt-1 text-[13px] text-slate-400">
            你在这段充满荒诞、心动与破壁的求学生涯中铭刻的专属徽记
          </p>
        </div>

        <div className="flex items-end gap-3 sm:flex-col">
          {!isExporting && (
            <button
              type="button"
              data-export-hidden="true"
              onClick={() => setShowAllAchievements(true)}
              className="group flex items-center gap-1 text-[11px] text-slate-400 transition hover:text-[#dec678] focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c9a84c]"
            >
              查看全部成就
              <ChevronRight size={12} className="transition-transform group-hover:translate-x-0.5" />
            </button>
          )}
          <div
            className="flex items-center gap-2 rounded-xl px-3.5 py-2 border"
            style={{
              background: "rgba(201,168,76,0.08)",
              borderColor: "rgba(201,168,76,0.25)",
            }}
          >
            <Award size={20} className="text-[#dec678]" />
            <div>
              <p className="text-[10px] uppercase font-mono tracking-wider text-slate-400">本轮获得</p>
              <p className="text-[16px] font-bold text-[#dec678] font-mono tabular-nums leading-none mt-0.5">
                {currentRunCount} <span className="text-[11px] font-normal text-slate-400">枚</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 本周目获得的荣誉勋章矩阵 */}
      <div className="relative z-10">
        <p className="text-[11px] font-mono uppercase tracking-widest text-slate-400 mb-3">
          THIS RUN TROPHIES · 本轮成就 ({currentRunCount})
        </p>

        {currentRunAchievements.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 py-8 text-center text-slate-500 text-[13px]">
            本轮尚未获得成就勋章，下一周目继续探索吧！
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
              {currentRunAchievements.map((ach) => {
                const tier = TIER_META[ach.tier];
                return (
                  <div
                    key={ach.id}
                    className="group relative flex min-h-[180px] flex-col items-center justify-center rounded-2xl border bg-[#0a1122]/80 p-4 text-center transition-all duration-200 hover:-translate-y-1 hover:z-30"
                    style={{
                      borderColor: tier.border,
                      boxShadow: `0 4px 18px ${tier.color}12`,
                    }}
                  >
                  {/* 原型占位框 */}
                  <div
                    className={`relative mb-3 flex h-20 w-20 items-center justify-center transition-transform duration-200 group-hover:scale-105 sm:h-24 sm:w-24 ${
                      ach.imageSrc ? "" : "overflow-hidden rounded-2xl border shadow-inner"
                    }`}
                    style={ach.imageSrc ? undefined : {
                      background: tier.bg,
                      borderColor: tier.border,
                      boxShadow: `0 0 20px ${tier.color}20`,
                    }}
                  >
                    {!ach.imageSrc && (
                      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(45deg,transparent_45%,rgba(255,255,255,0.06)_45%,rgba(255,255,255,0.06)_55%,transparent_55%)] bg-[size:8px_8px]" />
                    )}
                    {ach.imageSrc ? (
                      <img
                        src={ach.imageSrc}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="relative h-full w-full object-contain"
                      />
                    ) : (
                      <>
                        <span className="text-4xl drop-shadow sm:text-5xl">{ach.iconEmoji}</span>
                        <span className="pointer-events-none absolute bottom-0.5 text-[7px] font-mono text-slate-500 opacity-60">
                          [PROTO]
                        </span>
                      </>
                    )}
                  </div>

                  {/* 标题 */}
                  <div className="mb-1 flex min-h-10 w-full items-center justify-center">
                    <h5 className="line-clamp-2 text-[13px] font-bold leading-snug text-slate-100 font-serif sm:text-[15px]" title={ach.title}>
                      {ach.title}
                    </h5>
                  </div>
                  <p className="truncate w-full text-[10px] text-slate-400 font-mono">
                    {ach.tag}
                  </p>

                  {/* 与完整图鉴一致的悬浮详情气泡 */}
                  <div className="pointer-events-none absolute left-1/2 top-[calc(100%+8px)] z-50 hidden w-64 -translate-x-1/2 translate-y-1 opacity-0 drop-shadow-2xl transition-all duration-150 sm:block group-hover:translate-y-0 group-hover:opacity-100">
                    <div
                      className="relative rounded-2xl border p-3 text-left backdrop-blur-2xl"
                      style={{
                        backgroundColor: "rgba(9, 15, 30, 0.98)",
                        borderColor: tier.border,
                        boxShadow: `0 16px 40px rgba(0, 0, 0, 0.8), 0 0 20px ${tier.color}25`,
                      }}
                    >
                      <div
                        className="absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-l border-t"
                        style={{ backgroundColor: "rgba(9, 15, 30, 0.98)", borderColor: tier.border }}
                      />
                      <div className="mb-1.5 flex items-center justify-between gap-2 border-b border-white/[0.08] pb-1.5">
                        <span className="text-[12px] font-bold text-white font-serif">{ach.title}</span>
                        <span className="shrink-0 text-[9px] font-mono font-semibold text-emerald-400">✨ 本轮点亮</span>
                      </div>
                      <p className="mb-1 text-[10px] font-mono font-bold uppercase tracking-wider text-[#dec678]">
                        📖 勋章梗档案：
                      </p>
                      <p className="text-[11px] leading-relaxed text-slate-200 font-serif">{ach.description}</p>
                      <div className="mt-2 border-t border-white/[0.05] pt-1.5 text-[9px] font-mono text-slate-400">
                        <span className="rounded border border-white/[0.06] bg-white/[0.04] px-1 py-0.5">{ach.tag}</span>
                      </div>
                    </div>
                  </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-white/[0.07] pt-3 text-[10px] text-slate-500 font-mono">
              <span className="mr-1 uppercase tracking-wider text-slate-600">颜色代表稀有度</span>
              {ACHIEVEMENT_TIER_DISPLAY_ORDER.map((tierKey) => {
                const tier = TIER_META[tierKey];
                return (
                  <span key={tierKey} className="flex items-center gap-1.5">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: tier.color, boxShadow: `0 0 6px ${tier.color}` }}
                    />
                    <span style={{ color: tier.color }}>{tier.label}</span>
                    <span className="text-slate-600">· {tier.enLabel}</span>
                  </span>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* 底部印章 */}
      <div className="relative z-10 mt-6 flex items-center justify-between border-t border-white/10 pt-4 text-[11px] text-slate-400 font-mono">
        <span>SEU ARCH CAREER SIMULATOR · ACHIEVEMENTS WALL</span>
        <span className="text-[#dec678]">中大院发疯认证 ✓</span>
      </div>
      </div>

      {showAllAchievements && (
        <div
          className="fixed inset-0 z-[400] bg-[#030712]/90 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-label="全部成就图鉴"
          data-export-hidden="true"
        >
          <AchievementSidebarTab
            newlyUnlockedIds={currentRunUnlockedIds}
            onClose={() => setShowAllAchievements(false)}
          />
        </div>
      )}
    </>
  );
}
