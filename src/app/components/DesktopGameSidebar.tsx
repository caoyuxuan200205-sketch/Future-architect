import { useState } from "react";
import {
  Activity,
  Bot,
  BriefcaseBusiness,
  Building2,
  Coffee,
  FileText,
  GraduationCap,
  House,
  Library,
  Landmark,
  LockKeyhole,
  Map,
  MapPinned,
  MessageCircle,
  Settings,
  Monitor,
  Sparkles,
} from "lucide-react";

export type DesktopGameSection = "round" | "computer" | "map" | "status" | "resume";

interface DesktopGameSidebarProps {
  active: DesktopGameSection;
  onChange: (section: DesktopGameSection) => void;
  statusAlert?: boolean;
  resumeUpdated?: boolean;
  schoolName: string;
  schoolTier: string;
}

const PRIMARY_ITEMS = [
  { id: "round", label: "本回合", icon: Sparkles },
  { id: "computer", label: "电脑", icon: Monitor, badge: 3 },
  { id: "map", label: "地图", icon: Map, dot: true },
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
};

export function DesktopGameSidebar({ active, onChange, statusAlert, resumeUpdated, schoolName, schoolTier }: DesktopGameSidebarProps) {
  const schoolLogo = SCHOOL_LOGOS[schoolName];
  const renderItem = ({ id, label, icon: Icon, badge, dot }: { id: DesktopGameSection; label: string; icon: typeof Activity; badge?: number; dot?: boolean }) => {
    const selected = active === id;
    const showDot = dot || (id === "status" && statusAlert) || (id === "resume" && resumeUpdated);
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
          {showDot && !badge && <span className={`absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full ${id === "status" && statusAlert ? "bg-red-500" : "bg-amber-400"} ring-2 ring-[#080d18]`} />}
        </span>
        <span className="hidden truncate text-[13px] font-medium tracking-wide xl:block">{label}</span>
      </button>
    );
  };

  return (
    <aside className="sticky top-0 z-30 hidden h-screen w-[76px] shrink-0 flex-col border-r border-[#c9a84c]/18 bg-[#070c17]/96 px-2 py-4 shadow-[14px_0_35px_rgba(0,0,0,0.2)] backdrop-blur-xl lg:flex xl:w-[212px] xl:px-3">
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
        {PRIMARY_ITEMS.map((item) => renderItem(item))}
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
        <button type="button" className="flex h-11 w-full items-center gap-3 rounded-xl px-3 text-slate-500 transition-colors hover:bg-white/[0.04] hover:text-slate-300">
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
  actions: DesktopMapAction[];
  onChooseAction: (actionId: string) => void;
}

export function DesktopMapPreview({ semesterLabel, semester, round, canChooseAction, actions, onChooseAction }: DesktopMapPreviewProps) {
  const [selectedLocationName, setSelectedLocationName] = useState<string | null>(null);
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

          {LOCATIONS.map(({ name, description, icon: Icon, color, actionIds, x, y }) => {
            const selected = selectedLocationName === name;
            const availableCount = actionIds.filter((actionId) => actionId !== "campus" || semester >= 5).length;
            return (
              <button
                key={name}
                type="button"
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

          {selectedLocation && (
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
              {!canChooseAction && <p className="mt-3 border-t border-white/10 pt-3 text-[10px] text-amber-300/80">请先处理本回合事件，或进入下一回合后再选择行动。</p>}
            </div>
          )}

          <div className="absolute bottom-4 left-4 right-4 z-20 flex items-center justify-between text-[10px]">
            <span className="rounded-full border border-white/10 bg-[#07101d]/72 px-3 py-1.5 text-slate-300 backdrop-blur-md">选择地点执行行动 · 与“本回合”共享结算</span>
            <span className="rounded-full border border-[#c9a84c]/20 bg-[#07101d]/72 px-3 py-1.5 text-[#d7bb66] backdrop-blur-md">校园 · 职业探索区</span>
          </div>
        </div>
      </div>
    </section>
  );
}
type ComputerConversation = {
  id: string;
  name: string;
  role: string;
  initials: string;
  preview: string;
  time: string;
  unread?: number;
  accent: string;
  messages: Array<{ from: "them" | "me"; text: string; time: string }>;
};

const COMPUTER_CONVERSATIONS: ComputerConversation[] = [
  {
    id: "mentor",
    name: "导师",
    role: "当前导师 · 在线",
    initials: "导",
    preview: "明天上午把最新方案带来，我们需要重新讨论动线。",
    time: "刚刚",
    unread: 2,
    accent: "#d8bd69",
    messages: [
      { from: "them", text: "我看过你昨晚发来的方案了，空间关系有进步，但主入口的动线还不够清晰。", time: "10:12" },
      { from: "me", text: "收到。我今晚会重新梳理入口、展厅和中庭之间的关系。", time: "10:18" },
      { from: "them", text: "明天上午把最新方案带来，我们需要重新讨论动线。别只改图，先把你的判断写下来。", time: "10:24" },
    ],
  },
  {
    id: "senior",
    name: "产品学姐",
    role: "互联网产品经理 · 在线",
    initials: "产",
    preview: "周末有个产品工作坊，要不要一起去看看？",
    time: "20分钟前",
    unread: 1,
    accent: "#72a7ff",
    messages: [
      { from: "them", text: "上次聊到你想了解产品经理，我这周末正好参加一个用户研究工作坊。", time: "09:42" },
      { from: "them", text: "周末有个产品工作坊，要不要一起去看看？建筑训练里的调研能力其实很有用。", time: "10:04" },
      { from: "me", text: "听起来很适合我，可以把时间和地点发给我吗？", time: "10:07" },
    ],
  },
  {
    id: "classmate",
    name: "同门学长",
    role: "研三 · 建筑设计方向",
    initials: "研",
    preview: "作品集别只放结果，推导过程才是你的优势。",
    time: "昨天",
    accent: "#73cbbd",
    messages: [
      { from: "them", text: "你发来的作品集我粗看了一遍，图面挺完整，但现在更像课程作业合集。", time: "昨天 22:18" },
      { from: "me", text: "我也觉得缺少主线，但还不知道应该从哪里删。", time: "昨天 22:26" },
      { from: "them", text: "作品集别只放结果，推导过程才是你的优势。先选三个最能说明你思考方式的项目。", time: "昨天 22:31" },
    ],
  },
];

export function DesktopComputerPreview() {
  const [activeConversationId, setActiveConversationId] = useState(COMPUTER_CONVERSATIONS[0].id);
  const activeConversation = COMPUTER_CONVERSATIONS.find(({ id }) => id === activeConversationId) ?? COMPUTER_CONVERSATIONS[0];

  return (
    <section className="relative hidden min-h-screen w-full flex-1 overflow-hidden lg:block">
      <header className="absolute left-8 right-8 top-7 z-20 flex items-end justify-between">
        <div>
          <p className="mb-1 text-[11px] tracking-[0.28em] text-[#c9a84c]">PERSONAL TERMINAL</p>
          <div className="flex items-baseline gap-3">
            <h2 className="text-3xl font-semibold text-slate-100">个人电脑</h2>
            <span className="text-xs text-slate-500">你的建筑生涯指挥中心</span>
          </div>
        </div>
        <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[10px] text-emerald-300">在线</span>
      </header>

      <div className="absolute inset-0 overflow-hidden bg-[#050914]">
        <img
          src="/assets/visuals/backgrounds/personal-terminal-background.png"
          alt="夜间建筑工作室中的个人电脑"
          className="pointer-events-none absolute inset-0 h-full w-full scale-[1.15] object-cover"
        />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_51%_38%,transparent_0%,rgba(3,7,14,0.04)_45%,rgba(3,7,14,0.36)_100%)]" />

        <div className="absolute left-[14.5%] top-[13.8%] h-[51.7%] w-[73%] overflow-hidden rounded-[1.4%] border border-blue-300/10 bg-[#06101c]/96 text-slate-200 shadow-[inset_0_0_28px_rgba(40,100,180,0.08)]">
          <div className="flex h-[14%] min-h-11 items-center border-b border-white/8 bg-[#081321]/95 px-[3%]">
            <div>
              <p className="text-[clamp(18px,1.35vw,25px)] font-light tabular-nums text-slate-100">10:24</p>
              <p className="text-[clamp(10px,0.66vw,12px)] text-slate-500">2026/08/01 · 周六</p>
            </div>
            <div className="ml-auto flex items-center gap-2 text-[clamp(11px,0.72vw,13px)] text-slate-400">
              <span>南京 · 18°</span>
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
            </div>
          </div>

          <div className="grid h-[86%] grid-cols-[34%_1fr]">
            <aside className="min-w-0 border-r border-white/8 bg-[#07111e]/96 p-[4%]">
              <div className="mb-[5%] flex items-center justify-between">
                <div className="flex items-center gap-2 text-[#d8bd69]">
                  <MessageCircle className="h-4 w-4" strokeWidth={1.8} />
                  <p className="text-[clamp(13px,0.9vw,16px)] font-semibold">消息中心</p>
                </div>
                <span className="rounded-full bg-red-500/90 px-1.5 text-[10px] font-bold leading-5 text-white">3</span>
              </div>

              <div className="space-y-2">
                {COMPUTER_CONVERSATIONS.map((conversation) => {
                  const selected = conversation.id === activeConversation.id;
                  return (
                    <button
                      key={conversation.id}
                      type="button"
                      onClick={() => setActiveConversationId(conversation.id)}
                      aria-pressed={selected}
                      className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-all ${selected ? "border-[#c9a84c]/35 bg-[#c9a84c]/10" : "border-white/5 bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.04]"}`}
                    >
                      <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border bg-[#0b1726] text-[13px] font-semibold" style={{ borderColor: conversation.accent + "80", color: conversation.accent }}>
                        {conversation.initials}
                        {conversation.unread && <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-red-500 px-1 text-center text-[9px] font-bold leading-4 text-white">{conversation.unread}</span>}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-[clamp(12px,0.82vw,15px)] font-medium text-slate-100">{conversation.name}</span>
                          <span className="ml-auto shrink-0 text-[clamp(9px,0.6vw,11px)] text-slate-600">{conversation.time}</span>
                        </span>
                        <span className="mt-1 block truncate text-[clamp(10px,0.68vw,12px)] text-slate-500">{conversation.preview}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </aside>

            <section className="flex min-w-0 flex-col bg-[#081321]/94">
              <header className="flex min-h-[18%] items-center border-b border-white/8 px-[4%] py-2">
                <span className="mr-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border bg-[#0b1726] text-[14px] font-semibold" style={{ borderColor: activeConversation.accent + "80", color: activeConversation.accent }}>
                  {activeConversation.initials}
                </span>
                <div className="min-w-0">
                  <h3 className="text-[clamp(15px,1vw,18px)] font-semibold text-slate-100">{activeConversation.name}</h3>
                  <p className="mt-0.5 text-[clamp(10px,0.66vw,12px)] text-slate-500">{activeConversation.role}</p>
                </div>
                <span className="ml-auto flex items-center gap-1.5 text-[clamp(10px,0.66vw,12px)] text-emerald-400/80"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />可联系</span>
              </header>

              <div className="flex min-h-0 flex-1 flex-col justify-end gap-2 overflow-y-auto px-[4%] py-[3%]">
                {activeConversation.messages.map((message, index) => (
                  <div key={message.time + index} className={`flex ${message.from === "me" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[78%] rounded-xl px-3 py-2 ${message.from === "me" ? "rounded-br-sm bg-blue-500/16 text-blue-50" : "rounded-bl-sm border border-white/7 bg-white/[0.045] text-slate-200"}`}>
                      <p className="text-[clamp(11px,0.76vw,14px)] leading-[1.55]">{message.text}</p>
                      <p className={`mt-1 text-right text-[clamp(8px,0.54vw,10px)] ${message.from === "me" ? "text-blue-300/50" : "text-slate-600"}`}>{message.time}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex min-h-[16%] items-center gap-2 border-t border-white/8 px-[4%] py-2">
                <div className="flex min-w-0 flex-1 items-center rounded-lg border border-white/10 bg-black/10 px-3 py-2 text-[clamp(11px,0.72vw,13px)] text-slate-600">输入消息……</div>
                <button type="button" className="shrink-0 rounded-lg bg-[#c9a84c] px-4 py-2 text-[clamp(11px,0.72vw,13px)] font-semibold text-[#07101d] transition-colors hover:bg-[#ddc46c]">发送</button>
              </div>
            </section>
          </div>
        </div>

        <div className="absolute bottom-4 left-4 rounded-full border border-white/10 bg-[#07101d]/72 px-3 py-1.5 text-[10px] text-slate-300 backdrop-blur-md">
          消息中心原型 · 联系人与对话事件将在玩法版本接入
        </div>
      </div>
    </section>
  );
}