import { useState } from "react";
import {
  Activity,
  Bot,
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  Camera,
  CheckCircle2,
  ChevronRight,
  Coffee,
  FileText,
  GraduationCap,
  House,
  Library,
  Landmark,
  LockKeyhole,
  Mail,
  Map,
  Settings,
  Mic,
  Monitor,
  Sparkles,
  Video,
  Wifi,
  X,
} from "lucide-react";

export type DesktopGameSection = "round" | "computer" | "map" | "status" | "resume";

interface DesktopGameSidebarProps {
  active: DesktopGameSection;
  onChange: (section: DesktopGameSection) => void;
  statusAlert?: boolean;
  resumeUpdated?: boolean;
  computerBadge?: number;
  roundAlert?: boolean;
  schoolName: string;
  schoolTier: string;
  onOpenSettings: () => void;
  tutorialActive?: boolean;
}

const PRIMARY_ITEMS = [
  { id: "map", label: "地图", icon: Map },
  { id: "computer", label: "电脑", icon: Monitor },
  { id: "round", label: "本回合", icon: Sparkles },
] as const;

const GROWTH_ITEMS = [
  { id: "status", label: "状态", icon: Activity },
  { id: "resume", label: "简历", icon: FileText },
] as const;

const SCHOOL_LOGOS: Record<string, string> = {
  "AA 建筑联盟学院": "/assets/visuals/schools/architectural-association-school-of-architecture.jpg",
  "AA建筑联盟学院": "/assets/visuals/schools/architectural-association-school-of-architecture.jpg",
  "北京大学": "/assets/visuals/schools/peking-university.jpg",
  "北京工业大学": "/assets/visuals/schools/beijing-university-of-technology.png",
  "北京建筑大学": "/assets/visuals/schools/beijing-university-of-civil-engineering-and-architecture.jpg",
  "大连理工大学": "/assets/visuals/schools/dalian-university-of-technology.jpg",
  "东南大学": "/assets/visuals/schools/southeast-university.jpeg",
  "哥伦比亚大学": "/assets/visuals/schools/columbia-university.jpeg",
  "哈佛大学": "/assets/visuals/schools/harvard-university.png",
  "哈尔滨工业大学": "/assets/visuals/schools/harbin-institute-of-technology.png",
  "合肥工业大学": "/assets/visuals/schools/hefei-university-of-technology.jpg",
  "湖南大学": "/assets/visuals/schools/hunan-university.png",
  "华南理工大学": "/assets/visuals/schools/south-china-university-of-technology.png",
  "华中科技大学": "/assets/visuals/schools/huazhong-university-of-science-and-technology.webp",
  "加泰罗尼亚理工大学": "/assets/visuals/schools/polytechnic-university-of-catalonia.jpg",
  "东京大学": "/assets/visuals/schools/university-of-tokyo.png",
  "剑桥大学": "/assets/visuals/schools/university-of-cambridge.png",
  "昆明理工大学": "/assets/visuals/schools/kunming-university-of-science-and-technology.jpeg",
  "麻省理工大学": "/assets/visuals/schools/massachusetts-institute-of-technology.png",
  "米兰理工大学": "/assets/visuals/schools/politecnico-di-milano.png",
  "南京大学": "/assets/visuals/schools/nanjing-university.jpg",
  "南京工业大学": "/assets/visuals/schools/nanjing-tech-university.jpeg",
  "牛津大学": "/assets/visuals/schools/university-of-oxford.jpeg",
  "清华大学": "/assets/visuals/schools/tsinghua-university.png",
  "瑞典皇家理工学院": "/assets/visuals/schools/kth-royal-institute-of-technology.png",
  "青岛理工大学": "/assets/visuals/schools/qingdao-university-of-technology.png",
  "上海交通大学": "/assets/visuals/schools/shanghai-jiao-tong-university.jpg",
  "深圳大学": "/assets/visuals/schools/shenzhen-university.jpg",
  "苏州大学": "/assets/visuals/schools/soochow-university.jpg",
  "苏黎世联邦理工": "/assets/visuals/schools/eth-zurich.png",
  "苏黎世联邦理工大学": "/assets/visuals/schools/eth-zurich.png",
  "天津大学": "/assets/visuals/schools/tianjin-university.jpeg",
  "西安建筑科技大学": "/assets/visuals/schools/xian-university-of-architecture-and-technology.jpg",
  "香港大学": "/assets/visuals/schools/university-of-hong-kong.png",
  "香港中文大学": "/assets/visuals/schools/chinese-university-of-hong-kong.jpg",
  "浙江大学": "/assets/visuals/schools/zhejiang-university.png",
  "浙江工业大学": "/assets/visuals/schools/zhejiang-university-of-technology.jpg",
  "郑州大学": "/assets/visuals/schools/zhengzhou-university.jpeg",
  "中央美术学院": "/assets/visuals/schools/central-academy-of-fine-arts.png",
  "重庆大学": "/assets/visuals/schools/chongqing-university.png",
  "安徽建筑大学": "/assets/visuals/schools/anhui-jianzhu-university.png",
  "代尔夫特理工大学": "/assets/visuals/schools/delft-university-of-technology.webp",
  "河北工业大学": "/assets/visuals/schools/hebei-university-of-technology.jpg",
  "华侨大学": "/assets/visuals/schools/huaqiao-university.png",
  "墨尔本大学": "/assets/visuals/schools/university-of-melbourne.jpeg",
  "沈阳建筑大学": "/assets/visuals/schools/shenyang-jianzhu-university.jpg",
  "同济大学": "/assets/visuals/schools/tongji-university.jpg",
  "UCL Bartlett": "/assets/visuals/schools/ucl-bartlett.webp",
  "西南交通大学": "/assets/visuals/schools/southwest-jiaotong-university.jpg",
  "新加坡国立大学": "/assets/visuals/schools/national-university-of-singapore.png",
  "烟台大学": "/assets/visuals/schools/yantai-university.png",
};

export function DesktopGameSidebar({ active, onChange, statusAlert, resumeUpdated, computerBadge = 0, roundAlert = false, schoolName, schoolTier, onOpenSettings, tutorialActive = false }: DesktopGameSidebarProps) {
  const schoolLogo = SCHOOL_LOGOS[schoolName];
  const renderItem = ({ id, label, icon: Icon, badge, dot }: { id: DesktopGameSection; label: string; icon: typeof Activity; badge?: number; dot?: boolean }) => {
    const selected = active === id;
    const showDot = dot || (id === "round" && roundAlert) || (id === "status" && statusAlert) || (id === "resume" && resumeUpdated);
    return (
      <button
        key={id}
        type="button"
        onClick={() => onChange(id)}
        className={`group relative flex h-12 w-full items-center gap-3 rounded-xl px-3 outline-none transition-all focus-visible:ring-2 focus-visible:ring-[#c9a84c]/55 ${selected ? "bg-[#c9a84c]/13 text-[#dec678]" : "text-slate-400 hover:bg-white/[0.045] hover:text-slate-100"}`}
        aria-current={selected ? "page" : undefined}
      >
        {selected && <span className="absolute -left-2 top-2 h-8 w-0.5 rounded-r bg-[#c9a84c] xl:-left-3" />}
        <span className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${selected ? "bg-[#c9a84c]/12" : "bg-white/[0.025]"}`}>
          <Icon size={19} strokeWidth={selected ? 2.1 : 1.7} />
          {badge && <span className="absolute -right-1.5 -top-1.5 min-w-4 rounded-full bg-red-500 px-1 text-center text-[9px] font-bold leading-4 text-white">{badge}</span>}
          {showDot && !badge && <span className={`absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full ${(id === "status" && statusAlert) || (id === "round" && roundAlert) ? "bg-red-500" : "bg-amber-400"} ring-2 ring-[#080d18]`} />}
        </span>
        <span className="hidden truncate text-[13px] font-medium tracking-wide xl:block">{label}</span>
      </button>
    );
  };

  return (
    <aside className={`sticky top-0 hidden h-screen w-[76px] shrink-0 flex-col border-r border-[#c9a84c]/18 bg-[#070c17]/96 px-2 py-4 shadow-[14px_0_35px_rgba(0,0,0,0.2)] backdrop-blur-xl lg:flex xl:w-[212px] xl:px-3 ${tutorialActive ? "z-[221] ring-2 ring-inset ring-[#dec678]/80" : "z-30"}`}>
      <div className="mb-5 flex min-h-14 items-center gap-3 rounded-xl border border-[#c9a84c]/12 bg-white/[0.018] px-2 py-2">
        <span className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#c9a84c]/40 bg-white/95 text-[#d7bb66] shadow-[0_0_18px_rgba(201,168,76,0.12)]">
          {schoolLogo ? (
            <img src={schoolLogo} alt={schoolName + "校徽"} className="h-full w-full object-contain p-0.5" />
          ) : (
            <Landmark size={20} strokeWidth={1.6} />
          )}
          <span className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-inset ring-white/10" />
        </span>
        <div className="hidden min-w-0 xl:block">
          <p className="truncate text-[13px] font-semibold text-slate-100" title={schoolName}>{schoolName}</p>
          <p className="mt-0.5 truncate text-[9px] tracking-[0.16em] text-[#c9a84c]/70">{schoolTier}</p>
        </div>
      </div>

      <nav className="space-y-1" aria-label="游戏模块">
        {PRIMARY_ITEMS.map((item) => renderItem(item.id === "computer" ? { ...item, badge: computerBadge || undefined } : item))}
      </nav>

      <div className="my-4 h-px bg-gradient-to-r from-transparent via-[#c9a84c]/20 to-transparent" />
      <nav className="space-y-1" aria-label="角色成长">
        {GROWTH_ITEMS.map((item) => renderItem(item))}
        <button type="button" disabled className="group relative flex h-12 w-full cursor-not-allowed items-center gap-3 rounded-xl px-3 text-slate-600">
          <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.02]"><BriefcaseBusiness size={18} strokeWidth={1.6} /><LockKeyhole size={9} className="absolute -right-0.5 -top-0.5" /></span>
          <span className="hidden text-[13px] font-medium xl:block">机会</span>
          <span className="ml-auto hidden rounded border border-white/5 px-1.5 py-0.5 text-[8px] xl:block">规划中</span>
        </button>
      </nav>

      <div className="mt-auto space-y-1">
        <div className="mx-2 mb-3 hidden rounded-xl border border-blue-400/10 bg-blue-400/[0.045] p-3 xl:block">
          <div className="mb-1 flex items-center gap-2 text-xs text-blue-200"><Bot size={14} /><span>建哥 AI 在线</span><span className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-400" /></div>
          <p className="text-[9px] leading-relaxed text-slate-500">右下角随时召唤你的转行军师</p>
        </div>
        <button type="button" onClick={onOpenSettings} className="flex h-11 w-full items-center gap-3 rounded-xl px-3 text-slate-500 transition-colors hover:bg-white/[0.04] hover:text-slate-300">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center"><Settings size={18} /></span>
          <span className="hidden text-[12px] xl:block">设置与存档</span>
        </button>
      </div>
    </aside>
  );
}

export type DesktopMapAction = {
  id: string;
  label: string;
  emoji: string;
  description: string;
};

const LOCATIONS = [
  { name: "建筑学院", description: "回到专业基本盘，完成本轮改图", icon: Building2, color: "#d5ad47", actionIds: ["revise"], x: 27, y: 28 },
  { name: "图书馆", description: "集中学习产品、英语或经营副业", icon: Library, color: "#72a7ff", actionIds: ["product", "ielts", "sidejob"], x: 69, y: 24 },
  { name: "就业中心", description: "投递实习，并在研三参加校招", icon: BriefcaseBusiness, color: "#f59e5b", actionIds: ["internship", "campus"], x: 86, y: 48 },
  { name: "咖啡馆", description: "接外包、做副业，补充生活资金", icon: Coffee, color: "#d8bd69", actionIds: ["sidejob"], x: 49, y: 47 },
  { name: "导师办公室", description: "送礼献殷勤，尝试改善导师关系", icon: GraduationCap, color: "#aab4c5", actionIds: ["gifts"], x: 57, y: 74 },
  { name: "宿舍", description: "暂时摆烂，恢复抗压但承担心理代价", icon: House, color: "#76c7b7", actionIds: ["slack"], x: 24, y: 68 },
];

interface DesktopMapPreviewProps {
  semesterLabel: string;
  semester: number;
  round: number;
  canChooseAction: boolean;
  roundNotice?: { title: string; description: string; urgent?: boolean } | null;
  onOpenRound: () => void;
  actions: DesktopMapAction[];
  onChooseAction: (actionId: string) => void;
}

export function DesktopMapPreview({ semesterLabel, semester, round, canChooseAction, roundNotice, onOpenRound, actions, onChooseAction }: DesktopMapPreviewProps) {
  const [selectedLocationName, setSelectedLocationName] = useState<string | null>(null);
  const isUrgentNotice = roundNotice?.urgent === true;
  const selectedLocation = LOCATIONS.find((location) => location.name === selectedLocationName) ?? null;
  const selectedActions = selectedLocation
    ? selectedLocation.actionIds
        .filter((actionId) => actionId !== "campus" || semester >= 5)
        .map((actionId) => actions.find((action) => action.id === actionId))
        .filter((action): action is DesktopMapAction => Boolean(action))
    : [];

  return (
    <section className="mx-auto hidden w-full max-w-6xl flex-1 p-5 pb-24 xl:p-8 lg:block">
      <header className="mb-5 flex items-end justify-between">
        <div>
          <p className="mb-1 text-[11px] tracking-[0.28em] text-[#c9a84c]">CITY BLUEPRINT</p>
          <h2 className="text-3xl font-semibold text-slate-100">职业探索地图</h2>
        </div>
        <div className="text-right text-xs leading-relaxed text-slate-500"><p>{semesterLabel}</p><p>第 {round} 回合</p></div>
      </header>

      <div className="overflow-hidden rounded-3xl border border-[#c9a84c]/25 bg-[#07101d] shadow-[0_24px_70px_rgba(0,0,0,0.42)]">
        <div className="relative aspect-[16/9] min-h-[430px] w-full overflow-hidden">
          <img src="/assets/visuals/maps/career-campus-map.png" alt="校园职业探索地图" className="absolute inset-0 h-full w-full object-cover" />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(4,9,18,0.18),rgba(4,9,18,0.05)_52%,rgba(4,9,18,0.48))]" />
          <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_80px_rgba(3,7,15,0.58)]" />

          <div className="absolute left-4 right-4 top-4 z-20 flex items-center justify-between rounded-xl border border-white/15 bg-[#07101d]/76 px-4 py-3 shadow-lg backdrop-blur-md">
            <span className="text-xs text-slate-200">本回合可探索区域</span>
            <span className="flex items-center gap-2 text-xs text-amber-300"><span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />6 个地点可探索</span>
          </div>
          {roundNotice && (
            <button type="button" onClick={onOpenRound} className={`absolute left-1/2 top-[76px] z-40 flex w-[min(560px,calc(100%-2rem))] -translate-x-1/2 items-center gap-3 rounded-xl px-4 py-3 text-left backdrop-blur-xl transition ${isUrgentNotice ? "border border-red-500/60 bg-[#270b12]/96 shadow-[0_15px_45px_rgba(239,68,68,0.3)] hover:border-red-400 hover:bg-[#351018]" : "border border-amber-400/30 bg-[#0a1320]/94 shadow-[0_15px_40px_rgba(0,0,0,0.45)] hover:border-amber-300/55 hover:bg-[#111b29]"}`}>
              <span className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${isUrgentNotice ? "bg-red-500/15 text-red-300 ring-1 ring-inset ring-red-400/25" : "bg-amber-400/10 text-amber-300"}`}><Sparkles size={17} /><span className={`absolute -right-0.5 -top-0.5 h-2 w-2 animate-pulse rounded-full ${isUrgentNotice ? "bg-red-400 shadow-[0_0_10px_rgba(248,113,113,0.9)]" : "bg-red-400"}`} /></span>
              <span className="min-w-0 flex-1"><span className={`block text-[12px] font-semibold ${isUrgentNotice ? "text-red-100" : "text-white"}`}>{roundNotice.title}</span><span className={`mt-0.5 block text-[10px] ${isUrgentNotice ? "text-red-200/65" : "text-slate-400"}`}>{roundNotice.description}</span></span>
              <span className={`flex items-center gap-1 text-[10px] font-medium ${isUrgentNotice ? "text-red-300" : "text-amber-300"}`}>前往处理<ChevronRight size={12} /></span>
            </button>
          )}
          {LOCATIONS.map(({ name, description, icon: Icon, color, actionIds, x, y }) => {
            const selected = selectedLocationName === name;
            const availableCount = actionIds.filter((actionId) => actionId !== "campus" || semester >= 5).length;
            return (
              <button
                key={name}
                type="button"
                disabled={isUrgentNotice}
                onClick={() => setSelectedLocationName(selected ? null : name)}
                aria-label={`${name}，${availableCount} 项行动`}
                aria-expanded={selected}
                className={`group absolute z-10 -translate-x-1/2 -translate-y-1/2 text-left outline-none transition-transform hover:z-30 hover:scale-105 focus-visible:z-30 focus-visible:scale-105 ${selected ? "z-30 scale-105" : ""}`}
                style={{ left: x + "%", top: y + "%" }}
              >
                {canChooseAction && <span className="absolute left-1/2 top-5 h-12 w-12 -translate-x-1/2 -translate-y-1/2 animate-ping rounded-full opacity-20" style={{ background: color }} />}
                <span className={`relative mx-auto flex h-11 w-11 items-center justify-center rounded-full border-2 bg-[#07101d]/92 shadow-[0_5px_18px_rgba(0,0,0,0.55)] backdrop-blur ${selected ? "ring-4 ring-white/25" : ""}`} style={{ borderColor: color, color }}>
                  <Icon size={20} strokeWidth={1.9} />
                  <span className="absolute -bottom-1 h-2 w-2 rotate-45 border-b border-r bg-[#07101d]" style={{ borderColor: color }} />
                </span>
                <span className="mt-2 block min-w-28 rounded-lg border border-white/15 bg-[#07101d]/88 px-2.5 py-1.5 text-center shadow-lg backdrop-blur-md">
                  <span className="block whitespace-nowrap text-[12px] font-semibold text-white">{name}</span>
                  <span className={`mt-0.5 block whitespace-nowrap text-[9px] ${canChooseAction ? "text-amber-300" : "text-slate-400"}`}>{availableCount} 项行动</span>
                  <span className="hidden pt-1 text-[9px] leading-relaxed text-slate-300 group-hover:block group-focus-visible:block">{description}</span>
                </span>
              </button>
            );
          })}

          {selectedLocation && !isUrgentNotice && (
            <div className="absolute bottom-14 left-1/2 z-40 w-[min(720px,calc(100%-2rem))] -translate-x-1/2 rounded-2xl border border-[#c9a84c]/30 bg-[#07101d]/95 p-4 shadow-[0_20px_55px_rgba(0,0,0,0.6)] backdrop-blur-xl">
              <div className="mb-3 flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] tracking-[0.2em] text-[#c9a84c]">选择地点行动</p>
                  <h3 className="mt-1 text-lg font-semibold text-white">{selectedLocation.name}</h3>
                  <p className="mt-0.5 text-[11px] text-slate-400">{selectedLocation.description}</p>
                </div>
                <button type="button" onClick={() => setSelectedLocationName(null)} className="rounded-lg border border-white/10 px-2.5 py-1 text-[11px] text-slate-400 hover:bg-white/5 hover:text-white">关闭</button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {selectedActions.map((action) => (
                  <button key={action.id} type="button" disabled={!canChooseAction} onClick={() => onChooseAction(action.id)} className="group/action rounded-xl border border-white/10 bg-white/[0.035] p-3 text-left transition hover:border-[#c9a84c]/45 hover:bg-[#c9a84c]/10 disabled:cursor-not-allowed disabled:opacity-45">
                    <span className="flex items-center gap-2 text-sm font-semibold text-slate-100"><span>{action.emoji}</span>{action.label}</span>
                    <span className="mt-1.5 block line-clamp-2 text-[10px] leading-relaxed text-slate-400">{action.description}</span>
                  </button>
                ))}
                {selectedLocation.actionIds.includes("campus") && semester < 5 && (
                  <div className="rounded-xl border border-white/10 bg-black/15 p-3 opacity-60">
                    <span className="flex items-center gap-2 text-sm font-semibold text-slate-300"><LockKeyhole size={14} />参加校招</span>
                    <span className="mt-1.5 block text-[10px] text-slate-500">研三（第 5 学期）开放</span>
                  </div>
                )}
              </div>
              {!canChooseAction && <p className="mt-3 border-t border-white/10 pt-3 text-[10px] text-amber-300/80">当前有待处理事项。请点击地图上方提醒进入“本回合”，处理后即可继续行动。</p>}
            </div>
          )}

          <div className="absolute bottom-4 left-4 right-4 z-20 flex items-center justify-between text-[10px]">
            <span className="rounded-full border border-white/10 bg-[#07101d]/72 px-3 py-1.5 text-slate-300 backdrop-blur-md">地图负责发起行动 · “本回合”用于快速操作与结算</span>
            <span className="rounded-full border border-[#c9a84c]/20 bg-[#07101d]/72 px-3 py-1.5 text-[#d7bb66] backdrop-blur-md">校园 · 职业探索区</span>
          </div>
        </div>
      </div>
    </section>
  );
}
export type ComputerInterviewStage = "invited" | "preparing" | "in_progress" | "waiting_result";
export type ComputerApplicationStatus = "submitted" | "interview" | "interview_pending" | "offered" | "rejected" | "silent" | "accepted" | "declined";
export type ComputerInterviewPreparation = "company" | "story" | "rest";
export type ComputerInterviewAnswer = "structured" | "honest" | "evidence";

export interface ComputerInterviewQuestion {
  prompt: string;
  context: string;
  options: Array<{ id: ComputerInterviewAnswer; label: string; hint: string }>;
}

export interface ComputerInterviewItem {
  id: string;
  company: string;
  role: string;
  channelLabel: string;
  stipend: string;
  message: string;
  status: ComputerApplicationStatus;
  stage: ComputerInterviewStage;
  preparation?: ComputerInterviewPreparation;
  questionIndex: number;
  answers: ComputerInterviewAnswer[];
  questions: ComputerInterviewQuestion[];
  mindsetFeedback?: string;
}

interface DesktopComputerPreviewProps {
  interviews: ComputerInterviewItem[];
  activeInterviewId: string | null;
  onSelectInterview: (applicationId: string) => void;
  onAttendInterview: (applicationId: string) => void;
  onDeclineInterview: (applicationId: string) => void;
  onChoosePreparation: (applicationId: string, preparation: ComputerInterviewPreparation) => void;
  onAnswer: (applicationId: string, answer: ComputerInterviewAnswer) => void;
  onAcceptOffer: (applicationId: string) => void;
  onDeclineOffer: (applicationId: string) => void;
  onClose: () => void;
}

const PREPARATION_OPTIONS: Array<{
  id: ComputerInterviewPreparation;
  title: string;
  description: string;
  effect: string;
}> = [
  { id: "company", title: "研究公司与岗位", description: "梳理业务、用户与岗位职责。", effect: "提升岗位理解" },
  { id: "story", title: "整理 STAR 案例", description: "准备一段有行动和结果的项目经历。", effect: "提升回答证据" },
  { id: "rest", title: "短暂休息调整", description: "停止临时抱佛脚，让表达更稳定。", effect: "降低临场压力" },
];

function isComputerApplicationEnded(item: ComputerInterviewItem) {
  return item.status === "accepted" || item.status === "declined" || item.status === "rejected";
}
function getComputerApplicationLabel(item: ComputerInterviewItem) {
  if (item.status === "offered") return "Offer 待确认";
  if (item.status === "accepted") return "Offer 已接受";
  if (item.status === "declined") return "流程已放弃";
  if (item.status === "rejected") return "申请未通过";
  if (item.status === "silent") return "暂无回应";
  if (item.status === "submitted") return "简历已投递";
  if (item.status === "interview_pending" || item.stage === "waiting_result") return "等待面试结果";
  if (item.stage === "in_progress") return "面试进行中";
  return "待参加视频面试";
}

function getComputerApplicationColor(item: ComputerInterviewItem) {
  if (item.status === "offered" || item.status === "accepted") return "text-emerald-300";
  if (item.status === "rejected") return "text-rose-300";
  if (item.status === "interview_pending") return "text-amber-300";
  if (item.status === "interview") return "text-blue-300";
  return "text-slate-500";
}
function InterviewWorkspace({ interview, onAttendInterview, onDeclineInterview, onChoosePreparation, onAnswer, onAcceptOffer, onDeclineOffer }: {
  interview: ComputerInterviewItem;
  onAttendInterview: DesktopComputerPreviewProps["onAttendInterview"];
  onDeclineInterview: DesktopComputerPreviewProps["onDeclineInterview"];
  onChoosePreparation: DesktopComputerPreviewProps["onChoosePreparation"];
  onAnswer: DesktopComputerPreviewProps["onAnswer"];
  onAcceptOffer: DesktopComputerPreviewProps["onAcceptOffer"];
  onDeclineOffer: DesktopComputerPreviewProps["onDeclineOffer"];
}) {
  const currentQuestion = interview.questions[interview.questionIndex];
  if (interview.status === "offered") {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-y-auto px-[6%] py-[5%]">
        <div className="flex items-start gap-3 border-b border-white/8 pb-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-emerald-400/25 bg-emerald-400/10 text-emerald-300"><BriefcaseBusiness size={22} /></span>
          <div>
            <p className="text-[10px] tracking-[0.2em] text-emerald-300">OFFER LETTER</p>
            <h3 className="mt-1 text-[clamp(17px,1.2vw,22px)] font-semibold text-white">{interview.company} 实习录用通知</h3>
            <p className="mt-1 text-[11px] text-slate-500">{interview.role} · 招聘团队</p>
          </div>
        </div>
        <p className="mt-5 text-[12px] leading-6 text-slate-300">你好，感谢你参与我们的招聘流程。我们很高兴正式向你发出 <span className="text-white">{interview.role}</span> 的实习 Offer。</p>
        {interview.mindsetFeedback && <p className="mt-3 rounded-xl border border-[#c9a84c]/18 bg-[#c9a84c]/[0.06] px-4 py-3 text-[10px] leading-5 text-[#d8c57f]">{interview.mindsetFeedback}</p>}
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <div className="rounded-xl border border-white/8 bg-white/[0.025] p-3"><p className="text-[9px] text-slate-600">实习待遇</p><p className="mt-1 text-[12px] text-[#dec678]">{interview.stipend}</p></div>
          <div className="rounded-xl border border-white/8 bg-white/[0.025] p-3"><p className="text-[9px] text-slate-600">回复期限</p><p className="mt-1 text-[12px] text-slate-300">本回合内确认</p></div>
        </div>
        <p className="mt-4 rounded-xl border border-amber-400/15 bg-amber-400/[0.05] px-4 py-3 text-[10px] leading-5 text-amber-100/70">接受后，这段经历会加入简历，其他仍在进行的实习流程将自动放弃。</p>
        <div className="mt-auto flex justify-end gap-2 pt-5">
          <button type="button" onClick={() => onDeclineOffer(interview.id)} className="rounded-lg px-4 py-2 text-[11px] text-slate-400 transition hover:bg-white/5 hover:text-white">婉拒 Offer</button>
          <button type="button" onClick={() => onAcceptOffer(interview.id)} className="rounded-lg border border-emerald-400/25 bg-emerald-400/12 px-5 py-2 text-[11px] font-medium text-emerald-200 transition hover:bg-emerald-400/20">接受 Offer</button>
        </div>
      </div>
    );
  }

  if (["accepted", "declined", "rejected", "silent", "submitted"].includes(interview.status)) {
    const meta = interview.status === "accepted"
      ? { title: "Offer 已接受", kicker: "CONFIRMED", color: "text-emerald-300", icon: <CheckCircle2 size={28} /> }
      : interview.status === "declined"
        ? { title: "流程已结束", kicker: "DECLINED", color: "text-slate-400", icon: <X size={28} /> }
        : interview.status === "rejected"
          ? { title: "本次申请未通过", kicker: "APPLICATION UPDATE", color: "text-rose-300", icon: <X size={28} /> }
          : interview.status === "silent"
            ? { title: "暂时没有回应", kicker: "NO UPDATE", color: "text-slate-400", icon: <Mail size={28} /> }
            : { title: "申请已经投递", kicker: "APPLICATION RECEIVED", color: "text-blue-300", icon: <Mail size={28} /> };
    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center overflow-y-auto px-6 text-center">
        <span className={`flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/[0.035] ${meta.color}`}>{meta.icon}</span>
        <p className={`mt-5 text-[10px] tracking-[0.2em] ${meta.color}`}>{meta.kicker}</p>
        <h3 className="mt-2 text-xl font-semibold text-white">{meta.title}</h3>
        <p className="mt-3 max-w-lg text-[12px] leading-6 text-slate-400">{interview.message}</p>
        {interview.mindsetFeedback && <p className="mt-3 rounded-xl border border-[#c9a84c]/18 bg-[#c9a84c]/[0.06] px-4 py-2.5 text-[10px] leading-5 text-[#d8c57f]">{interview.mindsetFeedback}</p>}
        <p className="mt-4 text-[10px] text-slate-600">{interview.company} · {interview.role} · {interview.channelLabel}</p>
      </div>
    );
  }

  if (interview.stage === "waiting_result") {
    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center px-6 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full border border-emerald-400/25 bg-emerald-400/10 text-emerald-300"><CheckCircle2 size={30} /></span>
        <p className="mt-5 text-[10px] tracking-[0.22em] text-emerald-300/80">INTERVIEW COMPLETED</p>
        <h3 className="mt-2 text-xl font-semibold text-white">面试已经结束</h3>
        <p className="mt-3 max-w-md text-[12px] leading-6 text-slate-400">感谢信已经自动发送。面试官正在整理评价，结果会在你进入下一回合后通过求职邮箱送达。</p>
        <div className="mt-5 rounded-xl border border-white/8 bg-white/[0.025] px-4 py-3 text-left text-[11px] leading-5 text-slate-500">
          <p>现场信号：面试官针对你的经历进行了追问，并记录了几次关键回答。</p>
          <p className="mt-1">不要在这里等待刷新，先继续处理本回合的学习与生活。</p>
        </div>
      </div>
    );
  }

  if (interview.stage === "invited" || interview.stage === "preparing") {
    return (
      <div className="h-full min-h-0 overflow-y-auto px-[5%] py-[4%]">
        <div className="flex items-start gap-3 border-b border-white/8 pb-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-blue-400/25 bg-blue-400/10 text-blue-300"><Mail size={20} /></span>
          <div>
            <p className="text-[10px] tracking-[0.18em] text-blue-300">面试邀请</p>
            <h3 className="mt-1 text-[clamp(16px,1.1vw,20px)] font-semibold text-white">{interview.company} · {interview.role}</h3>
            <p className="mt-1 text-[11px] text-slate-500">招聘团队 · 视频一面 · 本回合内可参加</p>
          </div>
        </div>
        <p className="mt-4 text-[12px] leading-6 text-slate-300">你好，我们看过你的申请，希望邀请你参加线上面试。请先确认是否参加；确认参加后，再选择本次面试的准备策略。</p>
        {interview.mindsetFeedback && <p className="mt-3 rounded-xl border border-[#c9a84c]/18 bg-[#c9a84c]/[0.06] px-4 py-2.5 text-[10px] leading-5 text-[#d8c57f]">{interview.mindsetFeedback}</p>}
        {interview.stage === "invited" ? (
          <div className="mt-6 rounded-xl border border-white/8 bg-black/15 p-4">
            <p className="text-[11px] leading-5 text-slate-400">这场面试需要在本回合内处理。拒绝邀请将结束该岗位的招聘流程。</p>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => onDeclineInterview(interview.id)} className="rounded-lg px-4 py-2 text-[11px] text-slate-400 transition hover:bg-white/5 hover:text-white">拒绝面试邀请</button>
              <button type="button" onClick={() => onAttendInterview(interview.id)} className="rounded-lg border border-blue-400/25 bg-blue-400/12 px-5 py-2 text-[11px] font-medium text-blue-200 transition hover:bg-blue-400/20">确认参加面试</button>
            </div>
          </div>
        ) : (
          <>
            <p className="mb-3 mt-5 text-[11px] font-medium text-slate-400">选择一项面试前准备</p>
            <div className="grid gap-2 sm:grid-cols-3">
              {PREPARATION_OPTIONS.map((option) => (
                <button key={option.id} type="button" onClick={() => onChoosePreparation(interview.id, option.id)} className="group rounded-xl border border-white/10 bg-white/[0.025] p-3 text-left transition hover:border-[#c9a84c]/45 hover:bg-[#c9a84c]/8">
                  <span className="text-[12px] font-semibold text-slate-100">{option.title}</span>
                  <span className="mt-1.5 block text-[10px] leading-4 text-slate-500">{option.description}</span>
                  <span className="mt-3 block text-[9px] text-[#d8bd69]">{option.effect} <ChevronRight className="inline h-3 w-3" /></span>
                </button>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-4 rounded-xl border border-white/8 bg-black/15 px-4 py-3 text-[10px] text-slate-500">
              <span className="flex items-center gap-1.5"><Camera size={13} className="text-emerald-400" />摄像头正常</span>
              <span className="flex items-center gap-1.5"><Mic size={13} className="text-emerald-400" />麦克风正常</span>
              <span className="flex items-center gap-1.5"><Wifi size={13} className="text-emerald-400" />网络良好</span>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="grid h-full min-h-0 grid-rows-[42%_1fr]">
      <div className="relative overflow-hidden border-b border-white/8 bg-[radial-gradient(circle_at_50%_30%,rgba(62,100,145,0.2),rgba(3,8,16,0.9))]">
        <div className="absolute left-4 top-3 flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[9px] text-slate-300"><span className="h-1.5 w-1.5 rounded-full bg-red-400" />面试进行中 · {interview.questionIndex + 1}/{interview.questions.length}</div>
        <div className="flex h-full flex-col items-center justify-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full border border-blue-300/25 bg-blue-400/10 text-xl font-semibold text-blue-200">面</span>
          <p className="mt-3 text-[13px] font-medium text-white">业务面试官</p>
          <p className="mt-1 text-[10px] text-slate-500">{interview.company} · {interview.role}</p>
        </div>
        <div className="absolute bottom-3 right-3 flex items-center gap-2 rounded-lg border border-white/10 bg-[#07111e]/90 px-2.5 py-1.5 text-[9px] text-slate-400"><Video size={12} />你 · 在线</div>
      </div>
      <div className="min-h-0 overflow-y-auto px-[5%] py-[3%]">
        <p className="text-[9px] tracking-[0.18em] text-blue-300">QUESTION {interview.questionIndex + 1}</p>
        <h3 className="mt-1.5 text-[clamp(14px,1vw,18px)] font-medium leading-relaxed text-white">“{currentQuestion?.prompt}”</h3>
        <p className="mt-1 text-[10px] text-slate-500">{currentQuestion?.context}</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {currentQuestion?.options.map((option, index) => (
            <button key={option.id} type="button" onClick={() => onAnswer(interview.id, option.id)} className="rounded-xl border border-white/10 bg-white/[0.025] p-3 text-left transition hover:border-blue-400/40 hover:bg-blue-400/[0.07]">
              <span className="text-[10px] text-blue-300">{String.fromCharCode(65 + index)}</span>
              <span className="mt-1 block text-[11px] font-medium leading-4 text-slate-100">{option.label}</span>
              <span className="mt-1 block text-[9px] leading-4 text-slate-500">{option.hint}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function DesktopComputerPreview({ interviews, activeInterviewId, onSelectInterview, onAttendInterview, onDeclineInterview, onChoosePreparation, onAnswer, onAcceptOffer, onDeclineOffer, onClose }: DesktopComputerPreviewProps) {
  const activeInterview = interviews.find((item) => item.id === activeInterviewId) ?? null;
  const actionableCount = interviews.filter((item) => item.status === "interview" || item.status === "offered").length;

  return (
    <section className="fixed inset-0 z-[240] block min-h-screen w-full flex-1 overflow-hidden bg-[#050914] lg:relative lg:z-auto">
      <header className="absolute left-5 right-5 top-4 z-20 flex items-end justify-between lg:left-8 lg:right-8 lg:top-7">
        <div>
          <p className="mb-1 text-[10px] tracking-[0.28em] text-[#c9a84c]">CAREER TERMINAL</p>
          <div className="flex items-baseline gap-3"><h2 className="text-2xl font-semibold text-slate-100 lg:text-3xl">求职电脑</h2><span className="hidden text-xs text-slate-500 sm:inline">邮箱、面试与求职文件</span></div>
        </div>
        <button type="button" onClick={onClose} className="flex items-center gap-2 rounded-full border border-white/10 bg-black/25 px-3 py-1.5 text-[10px] text-slate-400 hover:bg-white/5 hover:text-white"><X size={13} /><span className="lg:hidden">返回</span><span className="hidden lg:inline">返回本回合</span></button>
      </header>

      <img src="/assets/visuals/backgrounds/personal-terminal-background.png" alt="夜间建筑工作室中的个人电脑" className="pointer-events-none absolute inset-0 hidden h-full w-full scale-[1.15] object-cover lg:block" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_51%_38%,transparent_0%,rgba(3,7,14,0.1)_45%,rgba(3,7,14,0.55)_100%)]" />

      <div className="absolute bottom-4 left-3 right-3 top-24 overflow-hidden rounded-2xl border border-blue-300/15 bg-[#06101c]/98 text-slate-200 shadow-2xl lg:bottom-auto lg:left-[14.5%] lg:right-auto lg:top-[13.8%] lg:h-[51.7%] lg:w-[73%] lg:rounded-[1.4%]">
        <div className="flex h-12 items-center border-b border-white/8 bg-[#081321]/95 px-4">
          <div className="flex items-center gap-2 text-[#d8bd69]"><Mail size={15} /><span className="text-[12px] font-semibold">求职邮箱</span></div>
          {actionableCount > 0 && <span className="ml-3 rounded-full bg-red-500/90 px-1.5 text-[9px] font-bold leading-4 text-white">{actionableCount}</span>}
          <div className="ml-auto flex items-center gap-3 text-[9px] text-slate-500"><span className="hidden sm:inline">2026/08/01</span><span className="flex items-center gap-1 text-emerald-400"><Wifi size={11} />在线</span></div>
        </div>

        <div className="grid h-[calc(100%-3rem)] grid-cols-1 sm:grid-cols-[34%_1fr]">
          <aside className={`${activeInterview ? "hidden sm:block" : "block"} min-w-0 overflow-y-auto border-r border-white/8 bg-[#07111e]/96 p-3`}>
            <p className="mb-2 text-[9px] tracking-[0.18em] text-slate-600">全部申请</p>
            {interviews.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/10 p-5 text-center"><Mail className="mx-auto text-slate-600" size={22} /><p className="mt-3 text-[11px] text-slate-400">暂无求职邮件</p><p className="mt-1 text-[9px] leading-4 text-slate-600">完成实习投递后，申请进度会出现在这里。</p></div>
            ) : interviews.map((interview) => (
              <button key={interview.id} type="button" onClick={() => onSelectInterview(interview.id)} className={`mb-2 w-full rounded-xl border p-3 text-left transition ${isComputerApplicationEnded(interview) ? "border-slate-700/25 bg-slate-900/20 opacity-50 grayscale hover:opacity-65" : activeInterview?.id === interview.id ? "border-[#c9a84c]/35 bg-[#c9a84c]/10" : "border-white/6 bg-white/[0.02] hover:border-white/15"}`}>
                <div className="flex items-start gap-2"><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${isComputerApplicationEnded(interview) ? "bg-slate-700/10 text-slate-600" : "bg-blue-400/10 text-blue-300"}`}><CalendarClock size={15} /></span><span className="min-w-0"><span className={`block truncate text-[11px] font-medium ${isComputerApplicationEnded(interview) ? "text-slate-500" : "text-white"}`}>{interview.company}</span><span className={`mt-0.5 block truncate text-[9px] ${isComputerApplicationEnded(interview) ? "text-slate-700" : "text-slate-500"}`}>{interview.role}</span></span></div>
                <span className={`mt-2 block text-[9px] ${getComputerApplicationColor(interview)}`}>{getComputerApplicationLabel(interview)}</span>
              </button>
            ))}
          </aside>

          <main className={`${activeInterview ? "block" : "hidden sm:block"} min-h-0 bg-[#081321]/94`}>
            {activeInterview ? (
              <div className="h-full">
                <button type="button" onClick={() => onSelectInterview("")} className="m-3 mb-0 text-[10px] text-slate-500 sm:hidden">← 返回邮箱</button>
                <div className="h-[calc(100%-2rem)] sm:h-full"><InterviewWorkspace interview={activeInterview} onAttendInterview={onAttendInterview} onDeclineInterview={onDeclineInterview} onChoosePreparation={onChoosePreparation} onAnswer={onAnswer} onAcceptOffer={onAcceptOffer} onDeclineOffer={onDeclineOffer} /></div>
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-center"><Monitor size={28} className="text-slate-600" /><p className="mt-3 text-[12px] text-slate-400">选择一封求职邮件</p><p className="mt-1 text-[9px] text-slate-600">面试邀请、招聘结果和 Offer 都会保留在这里。</p></div>
            )}
          </main>
        </div>
      </div>
    </section>
  );
}