type StatusKey = "arch" | "logic" | "expression" | "english" | "structured" | "stress" | "network" | "money" | "selfDoubt" | "ageAnxiety" | "mentorFavorability";

import { moneyToBalance, formatYuan } from "../economy/finance";

type StatusStats = Record<StatusKey, number>;

const META: Record<StatusKey, { label: string; color: string; positive: boolean }> = {
  arch: { label: "建筑专业力", color: "#64b5f6", positive: true },
  logic: { label: "逻辑力", color: "#4a9eff", positive: true },
  expression: { label: "表达力", color: "#81c784", positive: true },
  english: { label: "英语能力", color: "#4dd0e1", positive: true },
  structured: { label: "结构化思维", color: "#7986cb", positive: true },
  stress: { label: "抗压值", color: "#4caf50", positive: true },
  network: { label: "人脉值", color: "#ffb74d", positive: true },
  money: { label: "金钱", color: "#ffd54f", positive: true },
  selfDoubt: { label: "自我怀疑", color: "#ef5350", positive: false },
  ageAnxiety: { label: "年龄焦虑", color: "#e53935", positive: false },
  mentorFavorability: { label: "导师好感度", color: "#f0c040", positive: true },
};

const CORE_KEYS: StatusKey[] = ["arch", "logic", "expression", "english", "structured"];
const ROUTES: Array<{ name: string; accent: string; requirements: Partial<Record<StatusKey, { min?: number; max?: number }>> }> = [
  { name: "大厂产品", accent: "#6f8cff", requirements: { logic: { min: 68 }, structured: { min: 63 }, expression: { min: 63 }, selfDoubt: { max: 58 } } },
  { name: "外企科技", accent: "#80c9dc", requirements: { english: { min: 75 }, logic: { min: 70 }, structured: { min: 65 }, expression: { min: 65 } } },
  { name: "咨询", accent: "#d6b54c", requirements: { logic: { min: 75 }, structured: { min: 75 }, expression: { min: 70 } } },
  { name: "造车新势力", accent: "#82d49c", requirements: { logic: { min: 75 }, structured: { min: 70 }, expression: { min: 65 } } },
  { name: "传统建筑", accent: "#aab6cc", requirements: { arch: { min: 65 }, selfDoubt: { max: 78 } } },
];

function AbilityRadar({ stats }: { stats: StatusStats }) {
  const center = 110;
  const radius = 72;
  const point = (index: number, value: number) => {
    const angle = -Math.PI / 2 + index * Math.PI * 2 / CORE_KEYS.length;
    const length = radius * Math.max(0, Math.min(100, value)) / 100;
    return [center + Math.cos(angle) * length, center + Math.sin(angle) * length];
  };
  const polygon = (value: number) => CORE_KEYS.map((_, index) => point(index, value).join(",")).join(" ");
  return <svg viewBox="0 0 220 220" className="mx-auto w-full max-w-[280px] overflow-visible" role="img" aria-label="五项核心能力雷达图">
    {[25, 50, 75, 100].map((value) => <polygon key={value} points={polygon(value)} fill="none" stroke="rgba(148,163,184,.13)" />)}
    {CORE_KEYS.map((key, index) => {
      const [x, y] = point(index, 100); const [lx, ly] = point(index, 126);
      return <g key={key}><line x1={center} y1={center} x2={x} y2={y} stroke="rgba(148,163,184,.12)" /><text x={lx} y={ly} textAnchor={lx < center - 8 ? "end" : lx > center + 8 ? "start" : "middle"} dominantBaseline="middle" fill="#8490aa" fontSize="9">{META[key].label}</text></g>;
    })}
    <polygon points={CORE_KEYS.map((key, index) => point(index, stats[key]).join(",")).join(" ")} fill="rgba(222,198,120,.16)" stroke="#dec678" strokeWidth="2" />
    {CORE_KEYS.map((key, index) => { const [x, y] = point(index, stats[key]); return <circle key={key} cx={x} cy={y} r="3" fill={META[key].color} stroke="#07101d" strokeWidth="1.5" />; })}
  </svg>;
}

export function StatusAnalysisPanel({ stats, phase, actionDelta, eventDelta }: { stats: StatusStats; phase: string; actionDelta: Partial<StatusStats>; eventDelta: Partial<StatusStats> }) {
  const delta = phase === "action_result" ? { ...eventDelta, ...actionDelta } : eventDelta;
  const recent = (Object.entries(delta) as Array<[StatusKey, number]>).filter(([, value]) => value !== 0).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 5);
  const targetData: Array<{ key: StatusKey; target: number; inverse?: boolean }> = [
    { key: "structured", target: 60 }, { key: "logic", target: 65 }, { key: "expression", target: 60 }, { key: "arch", target: 60 },
    { key: "english", target: 65 }, { key: "network", target: 50 }, { key: "stress", target: 50 }, { key: "mentorFavorability", target: 45 },
    { key: "selfDoubt", target: 55, inverse: true }, { key: "ageAnxiety", target: 50, inverse: true },
  ];
  const weaknesses = targetData.map((item) => ({ ...item, value: stats[item.key], gap: item.inverse ? Math.max(0, stats[item.key] - item.target) : Math.max(0, item.target - stats[item.key]) })).filter((item) => item.gap > 0).sort((a, b) => b.gap - a.gap);
  const routes = ROUTES.map((route) => {
    const details = Object.entries(route.requirements).map(([rawKey, requirement]) => {
      const key = rawKey as StatusKey; const value = stats[key];
      const gap = requirement?.min !== undefined ? Math.max(0, requirement.min - value) : Math.max(0, value - (requirement?.max ?? 100));
      const ratio = requirement?.min !== undefined ? Math.min(1, value / requirement.min) : Math.min(1, (100 - value) / Math.max(1, 100 - (requirement?.max ?? 100)));
      return { key, gap, ratio };
    });
    return { ...route, match: Math.round(details.reduce((sum, item) => sum + item.ratio, 0) / details.length * 100), gaps: details.filter((item) => item.gap > 0).sort((a, b) => b.gap - a.gap) };
  }).sort((a, b) => b.match - a.match);
  const strongest = [...CORE_KEYS].sort((a, b) => stats[b] - stats[a])[0];
  const weakest = weaknesses[0];
  const risks = [
    { label: "导师关系", severity: Math.max(0, 45 - stats.mentorFavorability), copy: `好感度 ${stats.mentorFavorability}` },
    { label: "自我怀疑", severity: Math.max(0, stats.selfDoubt - 55), copy: `${stats.selfDoubt}，偏高` },
    { label: "年龄焦虑", severity: Math.max(0, stats.ageAnxiety - 50), copy: `${stats.ageAnxiety}，偏高` },
    { label: "抗压状态", severity: Math.max(0, 50 - stats.stress), copy: `${stats.stress}，偏低` },
  ].sort((a, b) => b.severity - a.severity);
  const risk = risks[0].severity > 0 ? risks[0] : null;

  return <div className="w-full">
    <header className="mb-5 flex flex-col gap-3 border-b border-[#c9a84c]/20 pb-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[10px] uppercase tracking-[.3em] text-[#c9a84c]">CAREER DIAGNOSTICS</p><h2 className="mt-2 text-2xl font-semibold text-slate-100">能力诊断中心</h2><p className="mt-1 text-[12px] text-slate-500">识别短板、判断风险，并找到最接近的职业路线。</p></div><span className="w-fit rounded-full border border-[#c9a84c]/20 bg-[#c9a84c]/[.06] px-3 py-1 text-[10px] text-[#d8bd69]">当前阶段建议线</span></header>
    <div className="grid gap-3 sm:grid-cols-3">
      <SummaryCard eyebrow="当前优势" title={META[strongest].label} value={String(stats[strongest])} tone="emerald" />
      <SummaryCard eyebrow="首要短板" title={weakest ? META[weakest.key].label : "暂无明显短板"} value={weakest ? `差 ${weakest.gap}` : "已达线"} tone="amber" />
      <SummaryCard eyebrow="状态风险" title={risk?.label ?? "状态稳定"} value={risk?.copy ?? "无警报"} tone={risk ? "red" : "blue"} />
    </div>
    <div className="mt-4 rounded-xl border border-[#c9a84c]/15 bg-[#c9a84c]/[.035] px-4 py-3 text-[12px] leading-relaxed text-slate-300"><span className="mr-2 text-[#dec678]">诊断</span>{weakest ? `你的${META[strongest].label}较突出，但${META[weakest.key].label}距离建议线仍差 ${weakest.gap} 点。` : "核心能力结构比较均衡，可以开始围绕目标 Offer 做定向强化。"}</div>
    <div className="mt-5 grid gap-5 2xl:grid-cols-[.9fr_1.1fr]">
      <Panel eyebrow="ABILITY SHAPE" title="核心能力画像"><AbilityRadar stats={stats} /><div className="grid grid-cols-5 gap-1 border-t border-white/[.06] pt-3">{CORE_KEYS.map((key) => <div key={key} className="text-center"><p className="font-mono text-[13px]" style={{ color: META[key].color }}>{stats[key]}</p><p className="mt-0.5 truncate text-[9px] text-slate-600">{META[key].label.replace("能力", "")}</p></div>)}</div></Panel>
      <Panel eyebrow="PRIORITY QUEUE" title="薄弱项优先级"><div className="space-y-3">{weaknesses.slice(0, 4).map((item, index) => <WeaknessRow key={item.key} index={index} item={item} />)}{weaknesses.length === 0 && <p className="rounded-xl border border-emerald-400/15 bg-emerald-400/[.04] p-4 text-[12px] text-emerald-200">暂未发现明显短板，保持当前节奏。</p>}</div></Panel>
    </div>
    <div className="mt-5 grid gap-5 2xl:grid-cols-[1.25fr_.75fr]">
      <Panel eyebrow="OFFER PROXIMITY" title="最接近的职业路线" aside="展示前三名"><div className="space-y-4">{routes.slice(0, 3).map((route, index) => <div key={route.name}><div className="flex items-center justify-between"><span className="text-[12px] text-slate-200"><i className="mr-2 not-italic font-mono text-[10px] text-slate-600">0{index + 1}</i>{route.name}</span><span className="font-mono text-[12px]" style={{ color: route.accent }}>{route.match}%</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[.06]"><div className="h-full rounded-full" style={{ width: `${route.match}%`, background: route.accent }} /></div><p className="mt-1.5 text-[10px] text-slate-600">{route.gaps.length ? `主要缺口：${route.gaps.slice(0, 2).map((gap) => `${META[gap.key].label} ${gap.gap}`).join(" · ")}` : "当前能力已达到基础门槛"}</p></div>)}</div></Panel>
      <Panel eyebrow="LATEST SIGNAL" title="本回合动向">{recent.length ? <div className="space-y-2.5">{recent.map(([key, value]) => <div key={key} className="flex items-center justify-between rounded-lg bg-white/[.025] px-3 py-2"><span className="text-[11px] text-slate-400">{META[key].label}</span><span className={`font-mono text-[12px] ${(value > 0) === META[key].positive ? "text-emerald-300" : "text-red-300"}`}>{key === "money" ? (value > 0 ? "+" : "") + formatYuan(value) : (value > 0 ? "+" : "") + value}</span></div>)}</div> : <div className="flex min-h-28 items-center justify-center rounded-xl border border-dashed border-white/[.08] px-4 text-center text-[11px] leading-relaxed text-slate-600">完成本回合选择后，这里会显示最新变化。</div>}</Panel>
    </div>
  </div>;
}

function SummaryCard({ eyebrow, title, value, tone }: { eyebrow: string; title: string; value: string; tone: "emerald" | "amber" | "red" | "blue" }) {
  const tones = { emerald: "border-emerald-400/15 bg-emerald-400/[.045] text-emerald-300", amber: "border-amber-300/15 bg-amber-300/[.045] text-amber-200", red: "border-red-400/15 bg-red-400/[.045] text-red-300", blue: "border-blue-300/15 bg-blue-300/[.045] text-blue-300" };
  return <div className={`rounded-xl border p-4 ${tones[tone]}`}><p className="text-[10px] uppercase tracking-[.18em] opacity-70">{eyebrow}</p><div className="mt-2 flex items-end justify-between gap-3"><span className="text-[16px] font-semibold text-slate-100">{title}</span><span className="shrink-0 font-mono text-sm">{value}</span></div></div>;
}

function Panel({ eyebrow, title, aside, children }: { eyebrow: string; title: string; aside?: string; children: React.ReactNode }) {
  return <section className="rounded-2xl border border-white/[.08] bg-[#0b1120]/70 p-5"><div className="mb-4 flex items-end justify-between"><div><p className="text-[10px] uppercase tracking-[.22em] text-slate-500">{eyebrow}</p><h3 className="mt-1 text-[15px] font-semibold text-slate-100">{title}</h3></div>{aside && <span className="text-[10px] text-slate-600">{aside}</span>}</div>{children}</section>;
}

function WeaknessRow({ index, item }: { index: number; item: { key: StatusKey; target: number; inverse?: boolean; value: number; gap: number } }) {
  const urgency = item.gap >= 20 ? "紧急" : item.gap >= 10 ? "优先" : "留意";
  const badge = item.gap >= 20 ? "text-red-300 bg-red-400/10" : item.gap >= 10 ? "text-amber-200 bg-amber-300/10" : "text-blue-300 bg-blue-300/10";
  const position = item.inverse ? Math.max(0, 100 - item.value) : item.value;
  return <div className="rounded-xl border border-white/[.06] bg-white/[.018] p-3"><div className="flex items-center gap-3"><span className="w-4 font-mono text-[11px] text-slate-600">0{index + 1}</span><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-3"><span className="text-[12px] text-slate-200">{META[item.key].label}</span><div className="flex items-center gap-2"><span className={`rounded px-1.5 py-0.5 text-[9px] ${badge}`}>{urgency}</span><span className="font-mono text-[11px] text-slate-400">差 {item.gap}</span></div></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[.06]"><div className="h-full rounded-full" style={{ width: `${position}%`, background: META[item.key].color }} /></div><p className="mt-1.5 text-[9px] text-slate-600">当前 {item.value} · 建议线 {item.inverse ? "≤" : "≥"} {item.target}</p></div></div></div>;
}