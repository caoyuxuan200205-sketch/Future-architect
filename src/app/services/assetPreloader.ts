export type AssetPreloadMode = "none" | "visuals" | "route" | "all";
export type AssetPreloadStatus = "idle" | "loading" | "downloading" | "paused" | "complete" | "error";

type AssetEntry = {
  url: string;
  size: number;
};

type AssetManifest = {
  version: string;
  groups: {
    visuals: AssetEntry[];
    audio: AssetEntry[];
  };
};

export type AssetPreloadState = {
  status: AssetPreloadStatus;
  mode: AssetPreloadMode;
  completedFiles: number;
  totalFiles: number;
  completedBytes: number;
  totalBytes: number;
  currentUrl: string;
  message: string;
  isAutoPaused: boolean;
  isFullBundleCached: boolean;
};

type NetworkInformationLike = {
  effectiveType?: string;
  saveData?: boolean;
};

const ASSET_CACHE = "architecture-simulator-assets-v1";
const STORAGE_KEY = "arch_asset_preload_progress_v1";
const INITIAL_STATE: AssetPreloadState = {
  status: "idle",
  mode: "none",
  completedFiles: 0,
  totalFiles: 0,
  completedBytes: 0,
  totalBytes: 0,
  currentUrl: "",
  message: "等待后台预热",
  isAutoPaused: false,
  isFullBundleCached: false,
};

function normalizeMentorId(mentorId: string): string {
  if (mentorId === "global_scholar") return "overseas";
  if (mentorId === "industry") return "practice";
  return mentorId;
}

function getConnection(): NetworkInformationLike | undefined {
  if (typeof navigator === "undefined") return undefined;
  return (navigator as Navigator & { connection?: NetworkInformationLike }).connection;
}

function autoDownloadAllowed(): boolean {
  const connection = getConnection();
  if (!connection) return true;
  if (connection.saveData) return false;
  return !connection.effectiveType || connection.effectiveType === "4g";
}

function preferredConcurrency(): number {
  const connection = getConnection();
  if (connection?.saveData) return 1;
  if (connection?.effectiveType === "3g") return 2;
  return 4;
}

class AssetPreloader {
  private state: AssetPreloadState = INITIAL_STATE;
  private listeners = new Set<(state: AssetPreloadState) => void>();
  private manifestPromise: Promise<AssetManifest> | null = null;
  private manifestVersion = "";
  private manifestEntries = new Map<string, AssetEntry>();
  private completedUrls = new Set<string>();
  private targetEntries = new Map<string, AssetEntry>();
  private queuedUrls = new Set<string>();
  private queue: AssetEntry[] = [];
  private activeWorkers = 0;
  private paused = false;
  private failures = new Map<string, number>();

  public getState(): AssetPreloadState {
    return this.state;
  }

  public subscribe(listener: (state: AssetPreloadState) => void): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  public warmVisuals(): void {
    void this.enqueueFromManifest("visuals", false);
  }

  public warmMentorRoute(mentorId: string): void {
    void this.loadManifest().then((manifest) => {
      const normalizedId = normalizeMentorId(mentorId);
      const routeAudio = manifest.groups.audio.filter((entry) => (
        entry.url.includes("/assets/audio/bgm/")
        || entry.url.includes(`/assets/audio/npc/${normalizedId}/`)
        || entry.url.includes("/assets/audio/npc/zhang_yifan/")
      ));
      this.enqueue(routeAudio, "route", false);
    }).catch((error) => this.reportManifestError(error));
  }

  public downloadAll(): void {
    void this.loadManifest().then((manifest) => {
      this.enqueue([...manifest.groups.visuals, ...manifest.groups.audio], "all", true);
    }).catch((error) => this.reportManifestError(error));
  }

  public warmRemaining(): void {
    void this.loadManifest().then((manifest) => {
      this.enqueue([...manifest.groups.visuals, ...manifest.groups.audio], "all", false);
    }).catch((error) => this.reportManifestError(error));
  }

  public pause(): void {
    if (this.state.status !== "downloading") return;
    this.paused = true;
    this.updateState({ status: "paused", message: "已暂停，可随时继续", isAutoPaused: false });
  }

  public resume(): void {
    if (this.queue.length === 0 && this.failures.size > 0) {
      for (const failedUrl of this.failures.keys()) {
        const entry = this.targetEntries.get(failedUrl);
        if (entry && !this.queuedUrls.has(failedUrl)) {
          this.queue.push(entry);
          this.queuedUrls.add(failedUrl);
        }
      }
    }
    if (this.queue.length === 0) return;
    this.paused = false;
    this.updateState({ status: "downloading", message: "正在继续下载", isAutoPaused: false });
    this.startWorkers();
  }

  private async enqueueFromManifest(group: "visuals", force: boolean): Promise<void> {
    try {
      const manifest = await this.loadManifest();
      this.enqueue(manifest.groups[group], group, force);
    } catch (error) {
      this.reportManifestError(error);
    }
  }

  private async loadManifest(): Promise<AssetManifest> {
    if (this.manifestPromise) return this.manifestPromise;
    this.updateState({ status: "loading", message: "正在读取资源清单" });
    this.manifestPromise = fetch(this.resolveUrl("/assets/asset-manifest.json"), { cache: "no-cache" })
      .then(async (response) => {
        if (!response.ok) throw new Error(`资源清单请求失败：${response.status}`);
        const manifest = await response.json() as AssetManifest;
        if (!manifest.version || !Array.isArray(manifest.groups?.visuals) || !Array.isArray(manifest.groups?.audio)) {
          throw new Error("资源清单格式无效");
        }
        this.manifestVersion = manifest.version;
        this.manifestEntries = new Map(
          [...manifest.groups.visuals, ...manifest.groups.audio].map((entry) => [entry.url, entry]),
        );
        await this.restoreProgress(manifest);
        return manifest;
      });
    return this.manifestPromise;
  }

  private enqueue(entries: AssetEntry[], mode: Exclude<AssetPreloadMode, "none">, force: boolean): void {
    for (const entry of entries) this.targetEntries.set(entry.url, entry);
    this.refreshProgress();

    const nextMode: AssetPreloadMode = this.state.mode === "all" || mode === "all"
      ? "all"
      : this.state.mode === "route" || mode === "route"
        ? "route"
        : mode;
    const missingEntries = entries.filter((entry) => (
      !this.completedUrls.has(entry.url) && !this.queuedUrls.has(entry.url)
    ));

    // 已经存在于持久缓存时直接判定完成，不能再被弱网提醒覆盖。
    if (missingEntries.length === 0 && this.queue.length === 0 && this.activeWorkers === 0) {
      this.paused = false;
      this.updateState({ status: "complete", mode: nextMode, message: this.getCompletionMessage(nextMode), isAutoPaused: false });
      return;
    }

    if (!force && !autoDownloadAllowed()) {
      this.paused = true;
      this.updateState({
        status: "paused",
        mode,
        message: "检测到省流量或较慢网络，已暂停自动预热",
        isAutoPaused: true,
      });
      return;
    }

    for (const entry of missingEntries) {
      this.queue.push(entry);
      this.queuedUrls.add(entry.url);
    }
    this.paused = false;

    if (this.queue.length === 0 && this.activeWorkers === 0) {
      this.updateState({ status: "complete", mode: nextMode, message: this.getCompletionMessage(nextMode), isAutoPaused: false });
      return;
    }

    this.updateState({ status: "downloading", mode: nextMode, message: this.getDownloadMessage(nextMode), isAutoPaused: false });
    this.startWorkers();
  }

  private startWorkers(): void {
    if (this.paused) return;
    const concurrency = preferredConcurrency();
    while (this.activeWorkers < concurrency && this.queue.length > 0) {
      this.activeWorkers += 1;
      void this.runWorker().finally(() => {
        this.activeWorkers -= 1;
        if (!this.paused && this.queue.length > 0) this.startWorkers();
        if (this.activeWorkers === 0 && this.queue.length === 0 && !this.paused) {
          const hasFailures = Array.from(this.targetEntries.keys()).some((url) => !this.completedUrls.has(url));
          this.updateState({
            status: hasFailures ? "error" : "complete",
            message: hasFailures ? "部分资源下载失败，点击继续可重试" : this.getCompletionMessage(this.state.mode),
          });
          this.persistProgress();
        }
      });
    }
  }

  private async runWorker(): Promise<void> {
    while (!this.paused) {
      const entry = this.queue.shift();
      if (!entry) return;
      this.queuedUrls.delete(entry.url);
      this.updateState({ currentUrl: entry.url });

      try {
        await this.cacheAsset(entry.url);
        this.completedUrls.add(entry.url);
        this.failures.delete(entry.url);
        this.refreshProgress();
        if (this.completedUrls.size % 10 === 0) this.persistProgress();
      } catch (error) {
        console.warn("[AssetPreloader] 资源预热失败：", entry.url, error);
        const attempts = (this.failures.get(entry.url) ?? 0) + 1;
        this.failures.set(entry.url, attempts);
        if (attempts < 2) {
          this.queue.push(entry);
          this.queuedUrls.add(entry.url);
        }
      }
    }
  }

  private async cacheAsset(assetUrl: string): Promise<void> {
    const request = new Request(this.resolveUrl(assetUrl), { credentials: "same-origin" });
    const response = await fetch(request, { cache: "force-cache" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    if ("caches" in window) {
      const cache = await caches.open(ASSET_CACHE);
      await cache.put(request, response.clone());
    }
    await response.blob();
  }

  private resolveUrl(assetUrl: string): string {
    const base = import.meta.env.BASE_URL || "./";
    const cleanBase = base.endsWith("/") ? base : `${base}/`;
    return new URL(`${cleanBase}${assetUrl.replace(/^\.?\//, "")}`, window.location.href).href;
  }

  private refreshProgress(): void {
    const targets = Array.from(this.targetEntries.values());
    const completed = targets.filter((entry) => this.completedUrls.has(entry.url));
    this.updateState({
      totalFiles: targets.length,
      completedFiles: completed.length,
      totalBytes: targets.reduce((sum, entry) => sum + entry.size, 0),
      completedBytes: completed.reduce((sum, entry) => sum + entry.size, 0),
      isFullBundleCached: this.manifestEntries.size > 0
        && Array.from(this.manifestEntries.keys()).every((url) => this.completedUrls.has(url)),
    });
  }

  private async restoreProgress(manifest: AssetManifest): Promise<void> {
    const manifestUrls = new Set(
      [...manifest.groups.visuals, ...manifest.groups.audio].map((entry) => entry.url),
    );
    let recordedUrls = new Set<string>();
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as { version?: string; urls?: string[] };
        if (saved.version === manifest.version && Array.isArray(saved.urls)) {
          recordedUrls = new Set(saved.urls.filter((url) => manifestUrls.has(url)));
        }
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }

    // Cache Storage 才是资源是否真实存在的依据；同时可修复本地进度记录丢失。
    if (typeof window !== "undefined" && "caches" in window) {
      try {
        const cache = await caches.open(ASSET_CACHE);
        const cachedRequests = await cache.keys();
        const cachedAssetUrls = new Set(cachedRequests.map((request) => {
          const pathname = new URL(request.url).pathname;
          const assetsIndex = pathname.indexOf("/assets/");
          return assetsIndex >= 0 ? pathname.slice(assetsIndex) : pathname;
        }));
        this.completedUrls = new Set(Array.from(manifestUrls).filter((url) => cachedAssetUrls.has(url)));
      } catch {
        this.completedUrls = recordedUrls;
      }
    } else {
      this.completedUrls = recordedUrls;
    }

    this.persistProgress();
  }

  private persistProgress(): void {
    if (!this.manifestVersion) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: this.manifestVersion, urls: Array.from(this.completedUrls) }));
    } catch {
      // 存储空间不足不会影响当前会话继续下载。
    }
  }

  private reportManifestError(error: unknown): void {
    console.error("[AssetPreloader] 无法加载资源清单：", error);
    this.manifestPromise = null;
    this.updateState({ status: "error", message: "资源清单加载失败，稍后可重试" });
  }

  private getDownloadMessage(mode: AssetPreloadMode): string {
    if (mode === "all") return "正在后台下载完整资源包";
    if (mode === "route") return "正在优先准备当前导师路线";
    return "正在后台准备常用画面";
  }

  private getCompletionMessage(mode: AssetPreloadMode): string {
    if (mode === "all") return "完整资源包已准备好";
    if (mode === "route") return "当前导师路线已准备好";
    return "开局常用画面已准备好";
  }

  private updateState(patch: Partial<AssetPreloadState>): void {
    this.state = { ...this.state, ...patch };
    for (const listener of this.listeners) listener(this.state);
  }
}

export const assetPreloader = new AssetPreloader();
