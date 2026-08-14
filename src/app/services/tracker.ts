/**
 * ============================================================
 * tracker.ts — 游戏数据埋点服务（单例）
 * ============================================================
 *
 * 设计目标：
 *  1. 统一入口 track(eventName, params)，自动注入公共字段
 *  2. localStorage 离线队列，断网/失败不丢数据，下次打开自动补传
 *  3. 批量上报到 Supabase game_events 表，降低请求频次
 *  4. 三层 ID 体系：anonymous_id（跨局）/ session_id（单次）/ game_id（单局）
 *
 * 用法：
 *   import { tracker } from '@/app/services/tracker';
 *   tracker.track('action_choose', { action_id: 'revise', ... });
 *
 * 对应数据库表：game_events（见 supabase_schema.sql）
 * ============================================================
 */

import { supabase } from "../../lib/supabase";

// -------------------- 类型 --------------------

export interface TrackParams {
  [key: string]: unknown;
}

interface QueuedEvent {
  event_name: string;
  anonymous_id: string;
  session_id: string;
  game_id: string;
  turn_index: number | null;
  semester: number | null;
  round: number | null;
  phase: string | null;
  event_params: Record<string, unknown>;
  stats_snapshot: Record<string, unknown> | null;
  client_ts: string; // ISO8601
  client_tz: string;
  platform: string;
  is_desktop_layout: boolean;
}

// -------------------- 常量 --------------------

const QUEUE_KEY = "tracker_queue";
const ANON_ID_KEY = "tracker_anonymous_id";
const FLUSH_BATCH_SIZE = 20;       // 每次最多上报 20 条
const FLUSH_INTERVAL_MS = 15000;   // 每 15 秒尝试 flush 一次
const MAX_QUEUE = 500;             // 队列上限，防止 localStorage 爆掉

// -------------------- 工具函数 --------------------

function uuid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // 兜底
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function getOrCreateAnonId(): string {
  let id = localStorage.getItem(ANON_ID_KEY);
  if (!id) {
    id = uuid();
    localStorage.setItem(ANON_ID_KEY, id);
  }
  return id;
}

function detectPlatform(): string {
  const ua = navigator.userAgent.toLowerCase();
  if (/miniprogram/.test(ua)) return "mp";
  return "web";
}

function detectDesktopLayout(): boolean {
  // 与 GamePage 的 ENABLE_DESKTOP_GAME_SIDEBAR 保持一致逻辑
  // 桌面端布局通常在宽屏启用，这里用窗口宽度近似判断
  return typeof window !== "undefined" && window.innerWidth >= 1024;
}

// -------------------- Tracker 单例 --------------------

class Tracker {
  private anonymousId: string;
  private sessionId: string;
  private gameId: string;
  private queue: QueuedEvent[];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private isFlushing = false;
  private unloadedHook = false;

  // 运行时上下文（由 GamePage 通过 setContext 更新）
  private ctx: {
    turnIndex: number | null;
    semester: number | null;
    round: number | null;
    phase: string | null;
  } = { turnIndex: null, semester: null, round: null, phase: null };

  constructor() {
    this.anonymousId = getOrCreateAnonId();
    this.sessionId = uuid();
    this.gameId = uuid(); // 默认 gameId，startGame 时会重置
    this.queue = this.loadQueue();

    if (typeof window !== "undefined") {
      this.startAutoFlush();
      this.bindUnload();
    }
  }

  // -------------------- 公开 API --------------------

  /**
   * 上报一个事件（核心入口）
   * @param eventName 事件名，如 'action_choose'
   * @param params    事件特有参数
   * @param options   可选：手动覆盖 turn_index 等，或附带 stats 快照
   */
  track(
    eventName: string,
    params: TrackParams = {},
    options: {
      statsSnapshot?: Record<string, unknown> | null;
      turnIndex?: number;
      semester?: number;
      round?: number;
      phase?: string;
    } = {}
  ): void {
    const statsSnapshot = options.statsSnapshot ?? this.extractStats(params) ?? null;

    const evt: QueuedEvent = {
      event_name: eventName,
      anonymous_id: this.anonymousId,
      session_id: this.sessionId,
      game_id: this.gameId,
      turn_index: options.turnIndex ?? this.ctx.turnIndex,
      semester: options.semester ?? this.ctx.semester,
      round: options.round ?? this.ctx.round,
      phase: options.phase ?? this.ctx.phase,
      event_params: this.sanitize(params),
      stats_snapshot: statsSnapshot ? this.sanitize(statsSnapshot) : null,
      client_ts: new Date().toISOString(),
      client_tz: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      platform: detectPlatform(),
      is_desktop_layout: detectDesktopLayout(),
    };

    this.queue.push(evt);

    // 队列超限时丢弃最旧的，保最新
    if (this.queue.length > MAX_QUEUE) {
      this.queue = this.queue.slice(-MAX_QUEUE);
    }

    this.saveQueue();

    // 重要事件（如 ending / quit）立即 flush
    const immediateFlush = ["game_start", "ending_reach", "game_quit", "game_reset"];
    if (immediateFlush.includes(eventName)) {
      this.flush();
    }
  }

  /**
   * 更新运行时上下文（GamePage 在每次回合/阶段切换时调用）
   */
  setContext(ctx: Partial<{
    turnIndex: number | null;
    semester: number | null;
    round: number | null;
    phase: string | null;
  }>): void {
    this.ctx = { ...this.ctx, ...ctx };
  }

  /**
   * 开始新的一局游戏（重置 game_id）
   */
  startNewGame(): void {
    this.gameId = uuid();
  }

  /**
   * 主动 flush（如页面切换前）
   */
  async flush(): Promise<void> {
    if (this.isFlushing || this.queue.length === 0) return;
    this.isFlushing = true;
    try {
      const batch = this.queue.slice(0, FLUSH_BATCH_SIZE);
      const { error } = await supabase.from("game_events").insert(batch);
      if (error) {
        // 上报失败：保留队列，下次重试（不打日志避免刷屏，开发时取消注释调试）
        // console.warn("[tracker] flush failed:", error.message);
      } else {
        // 成功：从队列里移除已上报的
        this.queue = this.queue.slice(batch.length);
        this.saveQueue();
        // 如果还有积压，继续 flush
        if (this.queue.length > 0) {
          this.isFlushing = false;
          this.flush();
          return;
        }
      }
    } catch (e) {
      // 网络错误等，静默保留队列
      // console.warn("[tracker] flush exception:", e);
    } finally {
      this.isFlushing = false;
    }
  }

  // -------------------- 内部方法 --------------------

  private loadQueue(): QueuedEvent[] {
    try {
      const raw = localStorage.getItem(QUEUE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private saveQueue(): void {
    try {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(this.queue));
    } catch {
      // localStorage 满了或其他问题，静默
    }
  }

  private startAutoFlush(): void {
    if (this.flushTimer) clearInterval(this.flushTimer);
    this.flushTimer = setInterval(() => {
      if (this.queue.length > 0) this.flush();
    }, FLUSH_INTERVAL_MS);
  }

  private bindUnload(): void {
    if (this.unloadedHook) return;
    this.unloadedHook = true;
    // 页面关闭前尽力上报（sendBeacon 在 fetch 不可用时备用，这里直接 flush）
    const handler = () => {
      // 用 visibilitychange 更可靠，记录退出事件由调用方决定
      if (document.visibilityState === "hidden") {
        this.flush();
      }
    };
    document.addEventListener("visibilitychange", handler);
    window.addEventListener("pagehide", () => this.flush());
  }

  /**
   * 从 params 里提取 stats 快照（如果调用方把 stats 放在 params 里）
   */
  private extractStats(params: TrackParams): Record<string, unknown> | null {
    const s = params.stats_before ?? params.stats_after ?? params.stats_snapshot ?? params.final_stats;
    if (s && typeof s === "object") {
      return s as Record<string, unknown>;
    }
    return null;
  }

  /**
   * 清理不可序列化的值（如 Set / Map / 函数），避免 JSON.stringify 报错或入库失败
   */
  private sanitize(obj: Record<string, unknown>): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v === undefined || typeof v === "function") continue;
      if (v instanceof Set) {
        out[k] = Array.from(v);
      } else if (v instanceof Map) {
        out[k] = Object.fromEntries(v);
      } else {
        out[k] = v;
      }
    }
    return out;
  }
}

// -------------------- 导出单例 --------------------

export const tracker = new Tracker();
