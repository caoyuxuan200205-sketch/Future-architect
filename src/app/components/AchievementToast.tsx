/**
 * @file AchievementToast.tsx
 * @description 荣誉勋章解锁即时高光仪式弹窗（AAA/精品级别视觉与动效）
 */
import { useEffect, useState, useMemo } from "react";
import { Award, Sparkles, X, ChevronRight, CheckCircle2 } from "lucide-react";
import { type Achievement, TIER_META } from "../achievements/achievementRegistry";

interface AchievementToastProps {
  achievement: Achievement | null;
  onDismiss: () => void;
  onViewGallery?: () => void;
}

export function AchievementToast({ achievement, onDismiss, onViewGallery }: AchievementToastProps) {
  const [progress, setProgress] = useState(100);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (!achievement) return;
    setProgress(100);
    setIsClosing(false);

    // 进度条平滑递减动画 (5.5s 倒计时)
    const startTime = Date.now();
    const duration = 5500;

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);

      if (elapsed >= duration) {
        clearInterval(interval);
        handleClose();
      }
    }, 50);

    return () => clearInterval(interval);
  }, [achievement]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onDismiss();
      setIsClosing(false);
    }, 280);
  };

  const handleView = () => {
    if (onViewGallery) {
      onViewGallery();
    } else {
      handleClose();
    }
  };

  if (!achievement) return null;

  const tier = TIER_META[achievement.tier];

  return (
    <>
      <style>{`
        @keyframes sunburstSpin {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to { transform: translate(-50%, -50%) rotate(360deg); }
        }
        @keyframes badgePopIn {
          0% { transform: scale(0.4) rotate(-10deg); opacity: 0; }
          60% { transform: scale(1.12) rotate(4deg); opacity: 1; }
          80% { transform: scale(0.96) rotate(-2deg); }
          100% { transform: scale(1) rotate(0deg); }
        }
        @keyframes floatGentle {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-4px); }
        }
        @keyframes starTwinkle {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        @keyframes sweepGlow {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>

      {/* 仪式弹窗容器（顶部正中悬浮，兼顾不挡住核心操作区与极高视觉瞩目度） */}
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[300] w-[92vw] max-w-lg pointer-events-auto select-none">
        <div
          className={`relative overflow-hidden rounded-3xl border p-5 shadow-2xl backdrop-blur-2xl transition-all duration-300 ${
            isClosing
              ? "opacity-0 -translate-y-4 scale-95"
              : "animate-in fade-in slide-in-from-top-6 duration-300"
          }`}
          style={{
            background: "linear-gradient(135deg, rgba(12, 20, 38, 0.97) 0%, rgba(6, 11, 24, 0.98) 100%)",
            borderColor: tier.border,
            boxShadow: `0 20px 60px rgba(0, 0, 0, 0.7), 0 0 35px ${tier.color}30, 0 0 0 1px ${tier.border}`,
          }}
        >
          {/* 1. 背后旋转发散光晕 (Sunburst Aura) */}
          <div
            className="pointer-events-none absolute -left-10 -top-10 h-44 w-44 opacity-25"
            style={{
              background: `radial-gradient(circle, ${tier.color} 0%, transparent 70%)`,
              animation: "sunburstSpin 18s linear infinite",
            }}
          />

          {/* 2. 扫光特效线条 */}
          <div
            className="pointer-events-none absolute inset-0 opacity-15 overflow-hidden"
            style={{
              backgroundImage:
                "linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent)",
              animation: "sweepGlow 4s ease-in-out infinite",
            }}
          />

          {/* 3. 漂浮闪烁星芒 */}
          <div
            className="pointer-events-none absolute right-8 top-3 text-[14px] text-[#dec678]"
            style={{ animation: "starTwinkle 2s ease-in-out infinite" }}
          >
            ✦
          </div>
          <div
            className="pointer-events-none absolute left-1/3 bottom-3 text-[10px] text-[#dec678]"
            style={{ animation: "starTwinkle 2.5s ease-in-out infinite 0.7s" }}
          >
            ✧
          </div>

          <div className="relative z-10 flex items-start gap-4">
            {/* 核心勋章技术蓝图展架 (Elastic Bounce In Badge Frame) */}
            <div className="relative shrink-0">
              <div
                className={`relative flex h-20 w-20 items-center justify-center ${
                  achievement.imageSrc ? "" : "rounded-2xl border-2 shadow-2xl overflow-hidden"
                }`}
                style={achievement.imageSrc ? {
                  animation: "badgePopIn 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards, floatGentle 3s ease-in-out infinite 0.6s",
                } : {
                  background: `radial-gradient(circle, ${tier.color}25 0%, rgba(10,18,36,0.95) 75%)`,
                  borderColor: tier.color,
                  boxShadow: `0 0 25px ${tier.color}45, inset 0 0 15px ${tier.color}20`,
                  animation: "badgePopIn 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards, floatGentle 3s ease-in-out infinite 0.6s",
                }}
              >
                {/* 蓝图技术网格底纹 */}
                {!achievement.imageSrc && (
                  <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(45deg,transparent_45%,rgba(255,255,255,0.06)_45%,rgba(255,255,255,0.06)_55%,transparent_55%)] bg-[size:8px_8px]" />
                )}

                {/* 勋章图标 */}
                {achievement.imageSrc ? (
                  <img src={achievement.imageSrc} alt="" className="relative h-full w-full object-contain" />
                ) : (
                  <span className="text-4xl drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">
                    {achievement.iconEmoji}
                  </span>
                )}

                {/* 底部蓝图角标 */}
                {!achievement.imageSrc && (
                  <span className="pointer-events-none absolute bottom-0.5 text-[7px] font-mono text-slate-400 opacity-60">
                    [PROTO]
                  </span>
                )}
              </div>
            </div>

            {/* 文本内容区域 */}
            <div className="min-w-0 flex-1 pt-0.5">
              {/* 顶栏徽记 */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 rounded-full animate-ping shrink-0"
                    style={{ backgroundColor: tier.color }}
                  />
                  <span
                    className="text-[11px] font-mono tracking-[0.2em] uppercase font-bold text-[#dec678] flex items-center gap-1"
                  >
                    <Sparkles size={12} className="text-[#dec678]" />
                    HONOR UNLOCKED · 解锁新徽章
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-full p-1 text-slate-400 transition hover:bg-white/10 hover:text-white"
                  title="关闭"
                >
                  <X size={15} />
                </button>
              </div>

              {/* 勋章大标题 */}
              <div className="mt-1.5 flex items-baseline gap-2">
                <h3
                  className="text-lg sm:text-xl font-bold tracking-tight text-white font-serif"
                  style={{ textShadow: `0 0 20px ${tier.color}40` }}
                >
                  {achievement.title}
                </h3>
                <span className="rounded border border-white/10 bg-white/[0.05] px-1.5 py-0.2 text-[10px] text-slate-300 font-mono">
                  {achievement.tag}
                </span>
              </div>

              {/* 梗档案/描述故事 */}
              <p className="mt-1.5 text-[12px] leading-relaxed text-slate-300 line-clamp-2 font-serif">
                {achievement.description}
              </p>

              {/* 底部交互按钮栏 */}
              <div className="mt-3 flex items-center justify-between pt-2 border-t border-white/[0.06]">
                <span className="text-[10px] font-mono text-slate-500">
                  已收录至荣誉勋章展柜
                </span>

                <button
                  type="button"
                  onClick={handleView}
                  className="group flex items-center gap-1 rounded-xl px-3 py-1 text-[11px] font-semibold transition"
                  style={{
                    backgroundColor: `${tier.color}20`,
                    color: tier.color,
                    border: `1px solid ${tier.border}`,
                  }}
                >
                  <span>查看图鉴</span>
                  <ChevronRight size={12} className="transition-transform group-hover:translate-x-0.5" />
                </button>
              </div>
            </div>
          </div>

          {/* 4. 底部金色自动关闭进度条 (Auto Dismiss Progress Bar) */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/[0.06]">
            <div
              className="h-full transition-all duration-75 ease-linear"
              style={{
                width: `${progress}%`,
                background: `linear-gradient(90deg, ${tier.color}, #f5d77f)`,
                boxShadow: `0 0 8px ${tier.color}`,
              }}
            />
          </div>
        </div>
      </div>
    </>
  );
}
