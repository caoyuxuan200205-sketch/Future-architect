import React, { Component, type ReactNode } from "react";
import { GamePage } from "./components/GamePage";

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
      <GamePage />
    </ErrorBoundary>
  );
}
