import React from "react";
import {
  PenTool,
  ScrollText,
  Palette,
  Lightbulb,
  LineChart,
  Code2,
  Database,
  Globe,
  Send,
  Users2,
  Building2,
  Coins,
  Handshake,
  Radar,
  Activity,
  Moon,
  Gift,
  Zap,
} from "lucide-react";

export interface ActionIconProps {
  id: string;
  className?: string;
  size?: number;
}

export function ActionIcon({ id, className = "w-4 h-4", size }: ActionIconProps) {
  switch (id) {
    case "revise":
      return <PenTool size={size} className={className} />;
    case "thesis":
      return <ScrollText size={size} className={className} />;
    case "portfolio":
      return <Palette size={size} className={className} />;
    case "product":
      return <Lightbulb size={size} className={className} />;
    case "industry_research":
      return <LineChart size={size} className={className} />;
    case "code_learning":
      return <Code2 size={size} className={className} />;
    case "data_analysis":
      return <Database size={size} className={className} />;
    case "ielts":
      return <Globe size={size} className={className} />;
    case "internship":
      return <Send size={size} className={className} />;
    case "mock_interview":
      return <Users2 size={size} className={className} />;
    case "campus":
      return <Building2 size={size} className={className} />;
    case "sidejob":
      return <Coins size={size} className={className} />;
    case "networking":
      return <Handshake size={size} className={className} />;
    case "insider_intel":
      return <Radar size={size} className={className} />;
    case "fitness":
      return <Activity size={size} className={className} />;
    case "slack":
      return <Moon size={size} className={className} />;
    case "gifts":
      return <Gift size={size} className={className} />;
    default:
      return <Zap size={size} className={className} />;
  }
}

/** 简约配色标签组件 */
export function ActionBadgeIcon({ id, size = 15, containerClass = "h-7 w-7" }: { id: string; size?: number; containerClass?: string }) {
  // 配色方案：温润微透的高级低饱和色系
  const colorMap: Record<string, { bg: string; border: string; text: string }> = {
    revise:            { bg: "bg-sky-500/10", border: "border-sky-500/25", text: "text-sky-400" },
    thesis:            { bg: "bg-indigo-500/10", border: "border-indigo-500/25", text: "text-indigo-400" },
    portfolio:         { bg: "bg-pink-500/10", border: "border-pink-500/25", text: "text-pink-400" },
    product:           { bg: "bg-amber-500/10", border: "border-amber-500/25", text: "text-amber-400" },
    industry_research: { bg: "bg-cyan-500/10", border: "border-cyan-500/25", text: "text-cyan-400" },
    code_learning:     { bg: "bg-emerald-500/10", border: "border-emerald-500/25", text: "text-emerald-400" },
    data_analysis:     { bg: "bg-blue-500/10", border: "border-blue-500/25", text: "text-blue-400" },
    ielts:             { bg: "bg-teal-500/10", border: "border-teal-500/25", text: "text-teal-400" },
    internship:        { bg: "bg-violet-500/10", border: "border-violet-500/25", text: "text-violet-400" },
    mock_interview:    { bg: "bg-purple-500/10", border: "border-purple-500/25", text: "text-purple-400" },
    campus:            { bg: "bg-amber-400/10", border: "border-amber-400/25", text: "text-amber-300" },
    sidejob:           { bg: "bg-yellow-500/10", border: "border-yellow-500/25", text: "text-yellow-400" },
    networking:        { bg: "bg-orange-500/10", border: "border-orange-500/25", text: "text-orange-400" },
    insider_intel:     { bg: "bg-emerald-500/10", border: "border-emerald-500/25", text: "text-emerald-400" },
    fitness:           { bg: "bg-lime-500/10", border: "border-lime-500/25", text: "text-lime-400" },
    slack:             { bg: "bg-slate-500/10", border: "border-slate-500/25", text: "text-slate-400" },
    gifts:             { bg: "bg-rose-500/10", border: "border-rose-500/25", text: "text-rose-400" },
  };

  const scheme = colorMap[id] || { bg: "bg-white/5", border: "border-white/10", text: "text-[#c9a84c]" };

  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-lg border ${scheme.border} ${scheme.bg} ${scheme.text} ${containerClass}`}>
      <ActionIcon id={id} size={size} className="shrink-0" />
    </span>
  );
}
