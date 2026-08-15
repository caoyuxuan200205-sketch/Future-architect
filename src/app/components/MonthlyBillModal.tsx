import { useEffect } from "react";
import { X, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { formatYuan, balanceStatusLabel, balanceStatusColor, type MonthlySettlement } from "../economy/finance";

interface MonthlyBillModalProps {
  settlement: MonthlySettlement | null;
  onClose: () => void;
}

export function MonthlyBillModal({ settlement, onClose }: MonthlyBillModalProps) {
  // 按空格/回车关闭
  useEffect(() => {
    if (!settlement) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " " || e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [settlement, onClose]);

  if (!settlement) return null;

  const isPositive = settlement.net >= 0;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-[92vw] max-w-md overflow-hidden rounded-2xl border border-white/15 bg-[#0a1320] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5">
          <div className="flex items-center gap-2 text-sm text-slate-200">
            <Wallet size={16} className="text-amber-400" />
            <span className="font-semibold">本月账单</span>
            <span className="text-slate-500 text-xs">· {settlement.monthLabel}</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-slate-400 hover:bg-white/10 hover:text-white transition"
            aria-label="关闭"
          >
            <X size={16} />
          </button>
        </div>

        {/* 明细 */}
        <div className="px-5 py-4 space-y-2">
          {settlement.lines.map((line, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                {line.type === "in"
                  ? <TrendingUp size={14} className="text-emerald-400" />
                  : <TrendingDown size={14} className="text-rose-400" />}
                <span className={line.type === "in" ? "text-emerald-100" : "text-slate-300"}>
                  {line.label}
                </span>
              </div>
              <span className={`tabular-nums font-medium ${line.type === "in" ? "text-emerald-300" : "text-rose-300"}`}>
                {line.amount > 0 ? "+" : ""}{formatYuan(line.amount)}
              </span>
            </div>
          ))}
        </div>

        {/* 汇总 */}
        <div className="border-t border-white/10 px-5 py-4 bg-white/[0.02]">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-slate-400">本月净收支</span>
            <span className={`font-semibold tabular-nums ${isPositive ? "text-emerald-300" : "text-rose-300"}`}>
              {isPositive ? "+" : ""}{formatYuan(settlement.net)}
            </span>
          </div>
          <div className="flex items-center justify-between text-base">
            <span className="text-slate-200">当前余额</span>
            <div className="flex items-baseline gap-2">
              <span className="font-bold tabular-nums text-white">{formatYuan(settlement.newBalance)}</span>
              <span
                className="text-xs px-2 py-0.5 rounded-full border"
                style={{
                  color: balanceStatusColor(settlement.newBalance),
                  borderColor: `${balanceStatusColor(settlement.newBalance)}40`,
                  background: `${balanceStatusColor(settlement.newBalance)}15`,
                }}
              >
                {balanceStatusLabel(settlement.newBalance)}
              </span>
            </div>
          </div>
        </div>

        {/* 操作 */}
        <div className="border-t border-white/10 px-5 py-3 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg bg-[#c9a84c] px-5 py-2 text-sm font-medium text-[#07101d] hover:bg-[#dec678] transition"
          >
            知道了
          </button>
        </div>
      </div>
    </div>
  );
}

export default MonthlyBillModal;
