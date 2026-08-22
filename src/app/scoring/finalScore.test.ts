import assert from "node:assert/strict";
import {
  ABILITY_STAT_KEYS,
  calculateFinalScore,
  calculateThesisScore,
  type ScoreStats,
} from "./finalScore.ts";

const abilities = (value: number): ScoreStats => Object.fromEntries(
  ABILITY_STAT_KEYS.map((key) => [key, value]),
) as ScoreStats;

const healthyStats: ScoreStats = {
  ...abilities(70),
  stress: 70,
  health: 75,
  selfDoubt: 25,
  ageAnxiety: 30,
  mentorFavorability: 70,
  money: 55,
  reputation: 50,
  network: 60,
  thesisScore: 70,
};

assert.equal(calculateThesisScore(0), 0);
assert.equal(calculateThesisScore(60), 100);
assert.equal(calculateThesisScore(85), 160);
assert.equal(calculateThesisScore(100), 180);

const noOffer = calculateFinalScore({
  finalStats: healthyStats,
  initialStats: abilities(40),
  selectedOffer: null,
  allOffers: [],
  internships: [],
  achievements: [],
  turnsCompleted: 24,
  isEarlyEnding: false,
});
assert.equal(noOffer.breakdown.career, 0);
assert.ok(noOffer.total >= 0 && noOffer.total <= 1000);

const fullRun = calculateFinalScore({
  finalStats: healthyStats,
  initialStats: abilities(40),
  selectedOffer: { id: "test", name: "测试公司", category: "外企科技", salary: "50k·14（月）", thresholds: { logic: 70, english: 70 } },
  allOffers: [{ id: "test", name: "测试公司", category: "外企科技", salary: "50k·14（月）", thresholds: { logic: 70, english: 70 } }],
  internships: [{ id: "a", scoreValue: 22 }, { id: "b", scoreValue: 18 }, { id: "c", scoreValue: 18 }, { id: "d", scoreValue: 18 }],
  achievements: [{ id: "a", tier: "diamond" }, { id: "b", tier: "gold" }],
  turnsCompleted: 24,
  isEarlyEnding: false,
});
assert.equal(fullRun.breakdown.internship, 50);
assert.equal(fullRun.breakdown.earlyEndingMultiplier, 1);

const earlyRun = calculateFinalScore({
  finalStats: healthyStats,
  initialStats: abilities(40),
  selectedOffer: null,
  allOffers: [],
  internships: [],
  achievements: [],
  turnsCompleted: 12,
  isEarlyEnding: true,
});
assert.equal(earlyRun.breakdown.earlyEndingMultiplier, 0.75);
assert.equal(earlyRun.preciseTotal, Math.round(earlyRun.breakdown.rawTotal * 0.75 * 100) / 100);

console.log("finalScore: all fixed cases passed");
