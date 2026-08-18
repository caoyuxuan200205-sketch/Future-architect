/**
 * @file achievementStore.ts
 * @description 成就持久化存储、跨周目解锁管理与状态查询
 */
import {
  ACHIEVEMENTS,
  type Achievement,
  type AchievementCategory,
  type AchievementTier,
} from "./achievementRegistry";

const STORAGE_KEY = "arch_career_achievements_unlocked_v1";
const STORAGE_RUN_KEY = "arch_career_achievements_run_history_v1";

export interface UnlockedRecord {
  id: string;
  unlockedAt: string; // ISO String
  semester?: number;
  runIndex?: number;
}

/** 读取全局已解锁成就记录字典 (id -> record) */
export function loadAllUnlockedRecords(): Record<string, UnlockedRecord> {
  if (typeof window === "undefined" || !window.localStorage) return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      return parsed;
    }
    return {};
  } catch (e) {
    console.error("加载成就存档失败", e);
    return {};
  }
}

/** 保存新解锁的成就（持久化到 LocalStorage） */
export function persistUnlockedAchievements(
  newAchievements: Achievement[],
  metadata?: { semester?: number; runIndex?: number }
): Record<string, UnlockedRecord> {
  if (typeof window === "undefined" || !window.localStorage || newAchievements.length === 0) {
    return loadAllUnlockedRecords();
  }

  try {
    const existing = loadAllUnlockedRecords();
    const now = new Date().toISOString();
    for (const ach of newAchievements) {
      // 成就按单周目计算；同名旧记录不应保留上一周目的解锁时间。
      existing[ach.id] = {
        id: ach.id,
        unlockedAt: now,
        semester: metadata?.semester,
        runIndex: metadata?.runIndex,
      };
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    // 触发跨组件事件广播
    window.dispatchEvent(new CustomEvent("arch_achievements_updated", { detail: existing }));

    return existing;
  } catch (e) {
    console.error("保存成就失败", e);
    return loadAllUnlockedRecords();
  }
}

/** 检查某项成就是否已在历史中解锁 */
export function isAchievementUnlocked(id: string): boolean {
  const records = loadAllUnlockedRecords();
  return Boolean(records[id]);
}

/** 获取全部成就数量与已解锁统计 */
export function getAchievementStats(unlockedIdsOverride?: Iterable<string>) {
  const unlockedIds = unlockedIdsOverride
    ? Array.from(new Set(unlockedIdsOverride))
    : Object.keys(loadAllUnlockedRecords());
  const unlockedSet = new Set(unlockedIds);
  const total = ACHIEVEMENTS.length;
  const unlockedCount = ACHIEVEMENTS.reduce((count, achievement) => count + (unlockedSet.has(achievement.id) ? 1 : 0), 0);
  const percentage = total > 0 ? Math.round((unlockedCount / total) * 100) : 0;

  const categoryStats: Record<AchievementCategory, { total: number; unlocked: number }> = {
    career: { total: 0, unlocked: 0 },
    romance: { total: 0, unlocked: 0 },
    academic: { total: 0, unlocked: 0 },
    meme: { total: 0, unlocked: 0 },
    master: { total: 0, unlocked: 0 },
  };

  const tierStats: Record<AchievementTier, { total: number; unlocked: number }> = {
    bronze: { total: 0, unlocked: 0 },
    silver: { total: 0, unlocked: 0 },
    gold: { total: 0, unlocked: 0 },
    diamond: { total: 0, unlocked: 0 },
  };

  for (const ach of ACHIEVEMENTS) {
    categoryStats[ach.category].total += 1;
    tierStats[ach.tier].total += 1;

    if (unlockedSet.has(ach.id)) {
      categoryStats[ach.category].unlocked += 1;
      tierStats[ach.tier].unlocked += 1;
    }
  }

  return {
    total,
    unlockedCount,
    percentage,
    categoryStats,
    tierStats,
  };
}

/** 重置所有成就（用于测试/重玩） */
export function clearAllAchievements(): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent("arch_achievements_updated", { detail: {} }));
}
