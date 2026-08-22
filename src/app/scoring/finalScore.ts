export const FINAL_SCORE_VERSION = 1;
export const FINAL_SCORE_SEASON_ID = "2026-S1";

export const ABILITY_STAT_KEYS = [
  "arch", "logic", "expression", "english", "structured", "dataSense",
  "codeBasic", "visualTaste", "writingDepth", "aestheticTheory", "commercial",
  "industryResearch", "negotiation", "leadership", "empathy", "execution",
  "fastLearning", "alignment",
] as const;

export type AbilityStatKey = (typeof ABILITY_STAT_KEYS)[number];
export type ScoreStats = Partial<Record<AbilityStatKey | "stress" | "health" | "selfDoubt" | "ageAnxiety" | "mentorFavorability" | "money" | "reputation" | "network" | "thesisScore", number>>;

export interface ScoreOffer {
  id: string;
  name: string;
  category: string;
  salary: string;
  thresholds: Record<string, number>;
}

export interface ScoreInternship {
  id: string;
  scoreValue: number;
}

export type ScoreAchievementTier = "silver" | "bronze" | "gold" | "diamond";

export interface ScoreAchievement {
  id: string;
  tier: ScoreAchievementTier;
}

export interface FinalScoreInput {
  finalStats: ScoreStats;
  initialStats: ScoreStats;
  selectedOffer: ScoreOffer | null;
  allOffers: ScoreOffer[];
  internships: ScoreInternship[];
  achievements: ScoreAchievement[];
  turnsCompleted: number;
  isEarlyEnding: boolean;
}

export interface FinalScoreBreakdown {
  career: number;
  ability: number;
  thesis: number;
  survival: number;
  experience: number;
  offerValue: number;
  jobMatch: number;
  finalAbility: number;
  growth: number;
  internship: number;
  achievement: number;
  completion: number;
  earlyEndingMultiplier: number;
  rawTotal: number;
  finalTotal: number;
}

export interface FinalScoreResult {
  total: number;
  preciseTotal: number;
  grade: "S+" | "S" | "A+" | "A" | "B" | "C" | "D" | "E";
  title: string;
  breakdown: FinalScoreBreakdown;
  scoreVersion: number;
  seasonId: string;
}

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
const stat = (stats: ScoreStats, key: keyof ScoreStats) => clamp(Number(stats[key] ?? 0), 0, 100);
const round2 = (value: number) => Math.round(value * 100) / 100;
const average = (values: number[]) => values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
const topAverage = (values: number[], count: number) => average([...values].sort((a, b) => b - a).slice(0, count));

export function parseAnnualSalary(salary: string): number {
  const monthly = Number(salary.match(/(\d+(?:\.\d+)?)\s*k/i)?.[1] ?? 0);
  const months = Number(salary.match(/[·x×]\s*(\d+(?:\.\d+)?)/i)?.[1] ?? 12);
  return monthly * 1000 * months;
}

export function calculateCompanyDifficulty(thresholds: Record<string, number>): number {
  const values = Object.values(thresholds).filter(Number.isFinite);
  if (values.length === 0) return 0;
  return clamp((average(values) - 45) / 40 + 0.04 * (values.length - 1));
}

export function calculateSalaryPercentile(selected: ScoreOffer, allOffers: ScoreOffer[]): number {
  const current = parseAnnualSalary(selected.salary);
  const salaries = allOffers.map((offer) => parseAnnualSalary(offer.salary)).filter((value) => value > 0);
  if (current <= 0 || salaries.length === 0) return 0;
  return salaries.filter((value) => value <= current).length / salaries.length;
}

export function calculateCareerScore(finalStats: ScoreStats, selectedOffer: ScoreOffer | null, allOffers: ScoreOffer[]) {
  if (!selectedOffer) return { total: 0, offerValue: 0, jobMatch: 0 };

  const difficulty = calculateCompanyDifficulty(selectedOffer.thresholds);
  const salaryPercentile = calculateSalaryPercentile(selectedOffer, allOffers);
  const offerValue = 220 * (0.65 * difficulty + 0.35 * salaryPercentile);
  const thresholdEntries = Object.entries(selectedOffer.thresholds);
  const matches = thresholdEntries.map(([key, threshold]) => clamp((stat(finalStats, key as keyof ScoreStats) - threshold + 10) / 20));
  const jobMatch = 100 * average(matches);
  return { total: round2(offerValue + jobMatch), offerValue: round2(offerValue), jobMatch: round2(jobMatch) };
}

export function calculateAbilityScore(finalStats: ScoreStats, initialStats: ScoreStats) {
  const finalValues = ABILITY_STAT_KEYS.map((key) => stat(finalStats, key));
  const finalAbility = 160 * (0.65 * topAverage(finalValues, 6) / 100 + 0.35 * average(finalValues) / 100);
  const growthRates = ABILITY_STAT_KEYS.map((key) => clamp((stat(finalStats, key) - stat(initialStats, key)) / 30));
  const growth = 100 * (0.6 * topAverage(growthRates, 6) + 0.4 * average(growthRates));
  return { total: round2(finalAbility + growth), finalAbility: round2(finalAbility), growth: round2(growth) };
}

const THESIS_ANCHORS = [[0, 0], [45, 50], [60, 100], [70, 125], [85, 160], [100, 180]] as const;

export function calculateThesisScore(rawScore: number): number {
  const score = clamp(rawScore, 0, 100);
  for (let index = 1; index < THESIS_ANCHORS.length; index += 1) {
    const [endRaw, endScore] = THESIS_ANCHORS[index];
    if (score > endRaw) continue;
    const [startRaw, startScore] = THESIS_ANCHORS[index - 1];
    return round2(startScore + ((score - startRaw) / (endRaw - startRaw)) * (endScore - startScore));
  }
  return 180;
}

export function calculateSurvivalScore(stats: ScoreStats): number {
  const survivalIndex =
    0.20 * stat(stats, "stress") +
    0.18 * stat(stats, "health") +
    0.16 * (100 - stat(stats, "selfDoubt")) +
    0.16 * (100 - stat(stats, "ageAnxiety")) +
    0.12 * stat(stats, "mentorFavorability") +
    0.08 * stat(stats, "money") +
    0.05 * stat(stats, "reputation") +
    0.05 * stat(stats, "network");
  return round2(140 * survivalIndex / 100);
}

const ACHIEVEMENT_POINTS: Record<ScoreAchievementTier, number> = {
  silver: 1,
  bronze: 2,
  gold: 4,
  diamond: 6,
};

export function calculateExperienceScore(internships: ScoreInternship[], achievements: ScoreAchievement[], turnsCompleted: number) {
  const internship = Math.min(50, [...internships].sort((a, b) => b.scoreValue - a.scoreValue).slice(0, 3).reduce((sum, item) => sum + clamp(item.scoreValue, 0, 22), 0));
  const achievement = Math.min(30, achievements.reduce((sum, item) => sum + ACHIEVEMENT_POINTS[item.tier], 0));
  const completion = 20 * clamp(turnsCompleted / 24);
  return { total: round2(internship + achievement + completion), internship: round2(internship), achievement: round2(achievement), completion: round2(completion) };
}

export function getFinalScoreGrade(total: number): Pick<FinalScoreResult, "grade" | "title"> {
  if (total >= 850) return { grade: "S+", title: "建筑生传说" };
  if (total >= 780) return { grade: "S", title: "人生赢家" };
  if (total >= 700) return { grade: "A+", title: "顶尖毕业生" };
  if (total >= 620) return { grade: "A", title: "优秀毕业生" };
  if (total >= 520) return { grade: "B", title: "稳健上岸" };
  if (total >= 400) return { grade: "C", title: "普通结局" };
  if (total >= 250) return { grade: "D", title: "生存挣扎" };
  return { grade: "E", title: "惨痛收场" };
}

export function calculateFinalScore(input: FinalScoreInput): FinalScoreResult {
  const career = calculateCareerScore(input.finalStats, input.selectedOffer, input.allOffers);
  const ability = calculateAbilityScore(input.finalStats, input.initialStats);
  const thesis = calculateThesisScore(stat(input.finalStats, "thesisScore"));
  const survival = calculateSurvivalScore(input.finalStats);
  const experience = calculateExperienceScore(input.internships, input.achievements, input.turnsCompleted);
  const rawTotal = round2(career.total + ability.total + thesis + survival + experience.total);
  const earlyEndingMultiplier = input.isEarlyEnding ? round2(0.5 + 0.5 * clamp(input.turnsCompleted / 24)) : 1;
  const preciseTotal = round2(clamp(rawTotal * earlyEndingMultiplier, 0, 1000));
  const total = Math.round(preciseTotal);
  const grade = getFinalScoreGrade(total);

  return {
    total,
    preciseTotal,
    ...grade,
    scoreVersion: FINAL_SCORE_VERSION,
    seasonId: FINAL_SCORE_SEASON_ID,
    breakdown: {
      career: career.total,
      ability: ability.total,
      thesis,
      survival,
      experience: experience.total,
      offerValue: career.offerValue,
      jobMatch: career.jobMatch,
      finalAbility: ability.finalAbility,
      growth: ability.growth,
      internship: experience.internship,
      achievement: experience.achievement,
      completion: experience.completion,
      earlyEndingMultiplier,
      rawTotal,
      finalTotal: preciseTotal,
    },
  };
}
