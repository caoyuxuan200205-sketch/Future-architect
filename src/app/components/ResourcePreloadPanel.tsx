import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Download, Pause, Play, WifiOff } from "lucide-react";
import { assetPreloader, type AssetPreloadState } from "../services/assetPreloader";

function useAssetPreloadState(): AssetPreloadState {
  const [state, setState] = useState(assetPreloader.getState());
  useEffect(() => assetPreloader.subscribe(setState), []);
  return state;
}

function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 MB";
  return `${(bytes / 1024 / 1024).toFixed(bytes >= 10 * 1024 * 1024 ? 1 : 2)} MB`;
}

function useProgress(state: AssetPreloadState): number {
  return useMemo(() => {
    if (state.totalBytes <= 0) return 0;
    return Math.min(100, Math.round((state.completedBytes / state.totalBytes) * 100));
  }, [state.completedBytes, state.totalBytes]);
}

export function ResourcePreloadStatus() {
  const state = useAssetPreloadState();
  const progress = useProgress(state);
  if (state.status === "idle" || state.status === "loading") return null;

  return (
    <div className="mt-3 rounded-xl border border-white/[0.07] bg-black/20 px-3 py-2.5 text-left">
      <div className="flex items-center gap-2 text-[10px] text-slate-400">
        {state.status === "complete" ? <CheckCircle2 size={12} className="text-emerald-400" /> : state.isAutoPaused ? <WifiOff size={12} /> : <Download size={12} className="text-[#dec678]" />}
        <span className="min-w-0 flex-1 truncate">{state.message}</span>
        {state.totalFiles > 0 && <span className="tabular-nums text-slate-500">{progress}%</span>}
      </div>
      {state.totalFiles > 0 && state.status !== "complete" && (
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/[0.07]">
          <div className="h-full rounded-full bg-[#c9a84c] transition-[width] duration-300" style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  );
}

export function ResourcePreloadPanel() {
  const state = useAssetPreloadState();
  const progress = useProgress(state);
  const isCompleteBundle = state.isFullBundleCached;
  const isFullBundleInProgress = state.mode === "all"
    && (state.status === "downloading" || (state.status === "paused" && !state.isAutoPaused));

  return (
    <section className="mt-5 rounded-xl border border-white/10 bg-black/15 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Download size={14} className="text-[#dec678]" />
            <h3 className="text-[12px] font-semibold text-slate-200">游戏资源预载</h3>
          </div>
          <p className="mt-1.5 text-[10px] leading-4 text-slate-500">
            进入游戏即在后台下载约 51 MB 完整资源包；不会阻塞操作，完成后重复游玩更流畅。
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          {state.status === "downloading" && (
            <button type="button" onClick={() => assetPreloader.pause()} className="flex items-center gap-1 rounded-lg border border-white/10 px-3 py-2 text-[10px] text-slate-300 transition hover:bg-white/5">
              <Pause size={11} />暂停
            </button>
          )}
          {state.status === "paused" && !state.isAutoPaused && (
            <button type="button" onClick={() => assetPreloader.resume()} className="flex items-center gap-1 rounded-lg border border-white/10 px-3 py-2 text-[10px] text-slate-300 transition hover:bg-white/5">
              <Play size={11} />继续
            </button>
          )}
          {!isCompleteBundle && !isFullBundleInProgress && (
            <button type="button" onClick={() => assetPreloader.downloadAll()} className="flex items-center gap-1 rounded-lg bg-[#c9a84c] px-3 py-2 text-[10px] font-semibold text-[#07101d] transition hover:bg-[#dec678]">
              <Download size={11} />{state.isAutoPaused ? "仍然下载" : "下载完整包"}
            </button>
          )}
        </div>
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between gap-3 text-[9px] text-slate-500">
          <span className="truncate">{state.message}</span>
          <span className="shrink-0 tabular-nums">
            {formatBytes(state.completedBytes)} / {formatBytes(state.totalBytes)} · {progress}%
          </span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
          <div
            className={`h-full rounded-full transition-[width] duration-300 ${state.status === "error" ? "bg-red-400" : state.status === "complete" ? "bg-emerald-400" : "bg-[#c9a84c]"}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        {state.isAutoPaused && (
          <p className="mt-2 flex items-center gap-1.5 text-[9px] text-amber-200/70">
            <WifiOff size={10} />已保护移动流量；连接高速网络后刷新，或手动选择“仍然下载”。
          </p>
        )}
      </div>
    </section>
  );
}
