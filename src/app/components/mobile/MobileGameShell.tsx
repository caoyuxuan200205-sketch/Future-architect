import { useState } from "react";

import {
  Activity,
  Bell,
  FileText,
  Map,
  Monitor,
  Settings,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { ActionBadgeIcon } from "../ActionIcon";
import type { DesktopGameSection } from "../DesktopGameSidebar";

type NavigationItem = {
  id: DesktopGameSection;
  label: string;
  icon: LucideIcon;
};

const NAVIGATION_ITEMS: NavigationItem[] = [
  { id: "map", label: "地图", icon: Map },
  { id: "computer", label: "电脑", icon: Monitor },
  { id: "round", label: "回合", icon: Sparkles },
  { id: "status", label: "状态", icon: Activity },
];

interface MobileGameShellProps {
  active: DesktopGameSection;
  onChange: (section: DesktopGameSection) => void;
  onOpenSettings: () => void;
  semesterLabel: string;
  round: number;
  progress: number;
  computerBadge?: number;
  statusAlert?: boolean;
  roundAlert?: boolean;
}

export function MobileGameShell({
  active,
  onChange,
  onOpenSettings,
  semesterLabel,
  round,
  progress,
  computerBadge = 0,
  statusAlert = false,
  roundAlert = false,
}: MobileGameShellProps) {
  return (
    <>
      <header className="mobile-safe-top sticky top-0 z-40 flex items-center gap-3 border-b border-[#c9a84c]/15 bg-[#060b16]/92 px-4 pb-3 pt-3 shadow-[0_10px_30px_rgba(0,0,0,0.22)] backdrop-blur-xl lg:hidden">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-[13px] font-semibold text-slate-100">{semesterLabel}</p>
            <span className="rounded-full border border-[#c9a84c]/20 bg-[#c9a84c]/10 px-2 py-0.5 text-[10px] text-[#dec678]">
              第 {round} 回合
            </span>
          </div>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/[0.07]" aria-label={`游戏进度 ${Math.round(progress)}%`}>
            <div className="h-full rounded-full bg-[#c9a84c] transition-[width] duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <button
          type="button"
          onClick={onOpenSettings}
          aria-label="打开设置与存档"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.035] text-slate-400 transition active:scale-95 active:bg-white/[0.08]"
        >
          <Settings size={19} />
        </button>
      </header>

      <nav
        className="mobile-safe-bottom fixed inset-x-0 bottom-0 z-[70] grid grid-cols-5 border-t border-[#c9a84c]/18 bg-[#060b16]/96 px-1 pt-1.5 shadow-[0_-12px_36px_rgba(0,0,0,0.38)] backdrop-blur-xl lg:hidden"
        aria-label="游戏主导航"
      >
        {NAVIGATION_ITEMS.map(({ id, label, icon: Icon }) => {
          const selected = active === id;
          const badge = id === "computer" ? computerBadge : 0;
          const hasAlert = (id === "status" && statusAlert) || (id === "round" && roundAlert);
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              aria-current={selected ? "page" : undefined}
              className={`relative flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] transition active:scale-95 ${selected ? "bg-[#c9a84c]/12 text-[#dec678]" : "text-slate-500"}`}
            >
              <span className="relative">
                <Icon size={20} strokeWidth={selected ? 2.2 : 1.7} />
                {badge > 0 && (
                  <span className="absolute -right-3 -top-2 min-w-4 rounded-full bg-red-500 px-1 text-center text-[9px] font-bold leading-4 text-white">
                    {badge > 9 ? "9+" : badge}
                  </span>
                )}
                {hasAlert && badge === 0 && <Bell size={9} className="absolute -right-2 -top-1 fill-red-500 text-red-500" />}
              </span>
              <span>{label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}

export type MobileMapAction = {
  id: string;
  label: string;
  emoji: string;
  description: string;
};

const MOBILE_LOCATIONS = [
  { name: "建筑学院", emoji: "🏛️", description: "专业基本盘、学术论文与作品集", actionIds: ["revise", "thesis", "portfolio"] },
  { name: "图书馆", emoji: "📚", description: "产品PRD、行研建模、代码、数据与英语", actionIds: ["product", "industry_research", "code_learning", "data_analysis", "ielts"] },
  { name: "就业中心", emoji: "💼", description: "投递实习、模拟群面与秋招宣讲", actionIds: ["internship", "mock_interview", "campus"] },
  { name: "咖啡馆", emoji: "☕", description: "商业副业、校友猎头局与挖内推", actionIds: ["sidejob", "networking", "insider_intel"] },
  { name: "导师办公室", emoji: "🎓", description: "拜访导师与改善关系", actionIds: ["gifts"] },
  { name: "宿舍", emoji: "🛏️", description: "健身长跑排毒或彻底摆烂休整", actionIds: ["fitness", "slack"] },
];

interface MobileMapViewProps {
  actions: MobileMapAction[];
  canChooseAction: boolean;
  notice?: { title: string; description: string; urgent?: boolean } | null;
  onOpenRound: () => void;
  onChooseAction: (actionId: string) => void;
  onOpenMentorOffice?: () => void;
}

export function MobileMapView({ actions, canChooseAction, notice, onOpenRound, onChooseAction, onOpenMentorOffice }: MobileMapViewProps) {
  const [selectedLocationName, setSelectedLocationName] = useState<string | null>(null);
  const selectedLocation = MOBILE_LOCATIONS.find((location) => location.name === selectedLocationName) ?? null;
  const selectedActions = selectedLocation ? actions.filter((action) => selectedLocation.actionIds.includes(action.id)) : [];
  return (
    <section className="mx-auto w-full max-w-2xl px-4 pb-28 pt-5 lg:hidden">
      <div className="mb-5">
        <p className="text-[10px] uppercase tracking-[0.24em] text-[#c9a84c]">Campus Map</p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-100">今天要去哪里？</h1>
        <p className="mt-1.5 text-[13px] leading-5 text-slate-500">选择地点快速开始行动，也可以回到本回合处理剧情。</p>
      </div>

      {notice && (
        <button
          type="button"
          onClick={onOpenRound}
          className={`mb-4 flex min-h-16 w-full items-start gap-3 rounded-2xl border p-4 text-left active:scale-[0.99] ${notice.urgent ? "border-red-400/25 bg-red-400/[0.07]" : "border-blue-400/20 bg-blue-400/[0.06]"}`}
        >
          <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${notice.urgent ? "animate-pulse bg-red-400" : "bg-blue-400"}`} />
          <span>
            <span className="block text-[14px] font-medium text-slate-100">{notice.title}</span>
            <span className="mt-1 block text-[12px] leading-5 text-slate-500">{notice.description}</span>
          </span>
        </button>
      )}

      <div className="grid grid-cols-2 gap-3">
        {MOBILE_LOCATIONS.map((location) => {
          const locationActions = actions.filter((action) => location.actionIds.includes(action.id));
          const disabled = !canChooseAction || locationActions.length === 0;
          return (
            <button
              key={location.name}
              type="button"
              disabled={disabled}
              onClick={() => setSelectedLocationName(location.name)}
              className="min-h-36 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4 text-left transition active:scale-[0.98] enabled:active:border-[#c9a84c]/40 disabled:opacity-45"
            >
              <span className="text-2xl" aria-hidden="true">{location.emoji}</span>
              <span className="mt-3 block text-[15px] font-semibold text-slate-100">{location.name}</span>
              <span className="mt-1 block text-[11px] leading-4 text-slate-500">{location.description}</span>
              <span className="mt-3 block truncate text-[11px] text-[#cdb768]">
                {canChooseAction && locationActions.length > 0 ? `${locationActions.length} 个可选行动` : "完成当前回合后开放"}
              </span>
            </button>
          );
        })}
      </div>

      {selectedLocation && (
        <div className="fixed inset-0 z-[80] flex items-end bg-black/65 px-3 pt-16 backdrop-blur-sm lg:hidden" role="presentation" onClick={() => setSelectedLocationName(null)}>
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-location-title"
            className="mobile-safe-bottom w-full rounded-t-3xl border border-white/10 bg-[#08101e] p-4 pb-4 shadow-[0_-24px_70px_rgba(0,0,0,0.55)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/15" />
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-[#c9a84c]">选择行动</p>
                <h2 id="mobile-location-title" className="mt-1 text-xl font-semibold text-slate-100">{selectedLocation.emoji} {selectedLocation.name}</h2>
              </div>
              <button type="button" onClick={() => setSelectedLocationName(null)} className="flex h-11 min-w-11 items-center justify-center rounded-xl bg-white/[0.05] text-sm text-slate-400">关闭</button>
            </div>
            <div className="space-y-2">
              {selectedLocation.name === "导师办公室" && onOpenMentorOffice && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedLocationName(null);
                    onOpenMentorOffice();
                  }}
                  className="flex min-h-16 w-full items-start gap-3 rounded-xl border border-[#c9a84c]/50 bg-gradient-to-r from-[#c9a84c]/20 to-[#c9a84c]/5 p-3 text-left active:scale-[0.99] active:border-[#c9a84c]"
                >
                  <span className="text-xl">🏛️</span>
                  <span className="min-w-0">
                    <span className="block text-[14px] font-bold text-[#fde047]">进入办公室面谈（AVG 沉浸式交流）</span>
                    <span className="mt-1 block text-[11px] leading-4 text-amber-200/80">展开学术请教、探讨近代建筑史课题与心声</span>
                  </span>
                </button>
              )}
              {selectedActions.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => { setSelectedLocationName(null); onChooseAction(action.id); }}
                  className="flex min-h-16 w-full items-start gap-3 rounded-xl border border-white/[0.08] bg-white/[0.025] p-3 text-left active:scale-[0.99] active:border-[#c9a84c]/40"
                >
                  <ActionBadgeIcon id={action.id} size={16} containerClass="h-8 w-8 mt-0.5" />
                  <span className="min-w-0">
                    <span className="block text-[14px] font-medium text-slate-100">{action.label}</span>
                    <span className="mt-1 block text-[11px] leading-4 text-slate-500">{action.description}</span>
                  </span>
                </button>
              ))}
            </div>
          </section>
        </div>
      )}

      <button
        type="button"
        onClick={onOpenRound}
        className="mt-4 flex min-h-12 w-full items-center justify-center rounded-xl border border-[#c9a84c]/30 bg-[#c9a84c]/12 px-4 text-[14px] font-medium text-[#dec678] active:scale-[0.99]"
      >
        查看本回合详情
      </button>
    </section>
  );
}
