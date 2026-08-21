import React, { Component, lazy, Suspense, type ReactNode } from "react";

const GamePage = lazy(() => import("./components/GamePage").then((module) => ({ default: module.GamePage })));

function GameLoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#050815] px-6 text-slate-100">
      <div className="w-full max-w-sm text-center">
        <p className="font-mono text-[11px] tracking-[0.3em] text-[#c9a84c]">SEU ARCHITECTURE CAREER</p>
        <h1 className="mt-3 font-serif text-2xl font-bold">正在整理你的建筑生涯档案</h1>
        <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-2/5 animate-pulse rounded-full bg-gradient-to-r from-[#9b7b2f] to-[#dec678]" />
        </div>
        <p className="mt-3 text-xs text-slate-500">首次进入需要片刻，之后访问会更快</p>
      </div>
    </div>
  );
}

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  handleClearCacheAndReset = () => {
    try {
      localStorage.removeItem("arch_sim_local_saves_v1");
      localStorage.removeItem("arch_career_achievements_unlocked_v1");
    } catch {}
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-[#070c18] px-6 text-slate-100">
          <div className="max-w-lg w-full rounded-2xl border border-red-500/30 bg-[#120a12]/90 p-6 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center gap-3 text-red-400">
              <span className="text-3xl">⚠️</span>
              <div>
                <h2 className="text-xl font-bold">程序加载遇到了一点小波折</h2>
                <p className="text-xs text-slate-400">别慌，你的游戏存档与数据依然完好</p>
              </div>
            </div>
            {this.state.error && (
              <div className="mt-4 rounded-xl border border-white/10 bg-black/50 p-3 font-mono text-xs text-red-300 overflow-x-auto max-h-40">
                {this.state.error.toString()}
              </div>
            )}
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={this.handleReset}
                className="flex-1 rounded-xl bg-[#c9a84c] py-2.5 text-xs font-bold text-[#070d1a] transition hover:bg-[#dec678]"
              >
                刷新页面重试
              </button>
              <button
                type="button"
                onClick={this.handleClearCacheAndReset}
                className="rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-xs text-slate-300 hover:bg-white/10"
              >
                清除缓存重载
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<GameLoadingScreen />}>
        <GamePage />
      </Suspense>
    </ErrorBoundary>
  );
}
