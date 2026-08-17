/**
 * 方案 B：月度现金流系统
 * 核心：在保留 Stats.money 抽象层（0-100）的前提下，外挂一层"现实锚点"映射 + 月度结算节奏
 */

// ============================================================================
// 一、类型定义
// ============================================================================

export type CityKey = "nanjing" | "shanghai" | "beijing" | "hangzhou" | "shenzhen" | "guangzhou" | "changsha" | "hefei" | "zhengzhou" | "overseas";

export interface FinanceState {
  balance: number;              // 银行卡余额（元）
  monthlyIncome: number;        // 月收入（元，实习/正职工资）
  monthlyExpense: number;       // 月固定支出（元，房租 + 生活费）
  rent: number;                 // 房租（元/月）
  livingCost: number;           // 生活费（元/月）
  city: CityKey;                // 当前所在城市
  sideJobIncome: number;        // 副业本月收入（一次性，结算后清零）
  trainingInstallment: number;  // 培训班月供（雅思等）
  trainingMonthsLeft: number;   // 月供剩余期数
  scholarshipPending: number;   // 待领取奖学金（学期初一次性）
  internshipCompanyName?: string; // 当前实习公司名（账单显示用）
}

export interface SettlementLine {
  label: string;
  amount: number;   // 正数表示收入，负数表示支出
  type: "in" | "out";
}

export interface MonthlySettlement {
  lines: SettlementLine[];
  income: number;     // 总收入（正数）
  expense: number;    // 总支出（正数）
  net: number;        // 净收支 = income - expense
  newBalance: number;
  newMoney: number;   // 写回 Stats.money 的抽象值
  monthLabel: string; // 形如「第 3 月」
}

// ============================================================================
// 二、城市生活成本（参考 2025-2026 一线城市合租 + 普通饮食水平）
// ============================================================================

export const CITY_COSTS: Record<CityKey, { rent: number; living: number; label: string }> = {
  nanjing:   { rent: 2200, living: 1800, label: "南京" },
  shanghai:  { rent: 3800, living: 2200, label: "上海" },
  beijing:   { rent: 3800, living: 2200, label: "北京" },
  hangzhou:  { rent: 3200, living: 2000, label: "杭州" },
  shenzhen:  { rent: 3500, living: 2200, label: "深圳" },
  guangzhou: { rent: 3000, living: 1900, label: "广州" },
  changsha:  { rent: 2200, living: 1700, label: "长沙" },
  hefei:     { rent: 2200, living: 1700, label: "合肥" },
  zhengzhou: { rent: 2200, living: 1700, label: "郑州" },
  overseas:  { rent: 6500, living: 3000, label: "海外" },
};

// ============================================================================
// 三、公司 → 城市映射（按实习公司所在城市动态切换）
// ============================================================================

export const COMPANY_CITY: Record<string, CityKey> = {
  // 北京
  bytedance: "beijing",  baidu: "beijing",  kuaishou: "beijing",  jd: "beijing",
  keep: "beijing",       xueersi: "beijing", zuoyebang: "beijing", yuanfudao: "beijing",
  beike: "beijing",      didi: "beijing",    baidu_ai: "beijing",
  // 上海
  pdd: "shanghai",       xiaohongshu: "shanghai", mckinsey: "shanghai",
  bcg: "shanghai",       bain: "shanghai",  deloitte: "shanghai",  nike: "shanghai",
  loreal: "shanghai",    cbre: "shanghai",  cushman: "shanghai",   jll: "shanghai",
  ecadi: "shanghai",     vanke: "shanghai", longfor: "shanghai",
  cadg: "beijing",       // 中国院在北京
  // 深圳/广州
  tencent: "shenzhen",   tencent_music: "shenzhen",
  netease: "hangzhou",   netease_music: "hangzhou",   // 网易在杭州
  // 杭州
  alibaba: "hangzhou",   antgroup: "hangzhou",
  // 海外
  google: "overseas",    microsoft: "overseas",  amazon: "overseas",
  apple: "overseas",     meta: "overseas",       tesla: "overseas",
  goldman: "overseas",   morgan: "overseas",     cicc: "beijing",
  citic: "beijing",      // 中信证券北京
  // 其他
  meituan: "beijing",    iqiyi: "beijing",      bilibili: "shanghai",
  boss: "beijing",       fanka: "beijing",      ctrip: "shanghai",
  chayan: "changsha",    mixue: "zhengzhou",    // 茶颜长沙、蜜雪郑州
  iflytek: "hefei",      // 科大讯飞合肥
  dewu: "shanghai",      soul: "shanghai",      moji: "beijing",
  // 建筑设计 / 高校
  seu_design: "nanjing", gad: "shanghai",       // gad 杭州？常见说法上海/杭州都有
  xpeng: "guangzhou",    nio: "shanghai",       li: "beijing",  byd: "shenzhen",
};

// 兜底：未登记的公司按公司名关键词推测
export function inferCompanyCity(companyId: string | undefined, companyName: string): CityKey {
  if (companyId && COMPANY_CITY[companyId]) return COMPANY_CITY[companyId];
  const n = companyName.toLowerCase();
  if (n.includes("北京") || n.includes("北大") || n.includes("清华")) return "beijing";
  if (n.includes("上海") || n.includes("华东")) return "shanghai";
  if (n.includes("深圳") || n.includes("腾讯")) return "shenzhen";
  if (n.includes("杭州") || n.includes("阿里") || n.includes("网易")) return "hangzhou";
  if (n.includes("南京") || n.includes("东南")) return "nanjing";
  if (n.includes("广州")) return "guangzhou";
  if (/google|microsoft|amazon|meta|tesla|goldman|morgan/i.test(n)) return "overseas";
  return "beijing"; // 互联网默认北上
}

// ============================================================================
// 四、抽象层 ↔ 现实层映射
// ============================================================================

/**
 * money = 50 时 balance ≈ 20,000（基准线）
 * money = 100 时 balance ≈ 50,000
 * money = 0 时 balance ≈ 0
 * 即 1 分抽象值 ≈ 500 元
 */
export const MONEY_SCALE = 500;

export function moneyToBalance(money: number): number {
  return Math.round(money * MONEY_SCALE);
}

export function balanceToMoney(balance: number): number {
  return Math.max(0, Math.min(100, Math.round(balance / MONEY_SCALE)));
}

// ============================================================================
// 五、薪资格式解析
// ============================================================================

/** "400 元/天 · 住房补贴" → 400 * 22 = 8800 */
export function stipendToMonthly(stipend: string): number {
  const m = stipend.match(/(\d+)\s*元\s*\/\s*天/);
  if (!m) return 0;
  return parseInt(m[1], 10) * 22; // 月工作日按 22 天估算
}

/** stipend 原文里直接拿"元/天"数字，方便 UI 展示 */
export function stipendPerDay(stipend: string): number {
  const m = stipend.match(/(\d+)\s*元\s*\/\s*天/);
  return m ? parseInt(m[1], 10) : 0;
}

/** 正职 offer "25k·14（月）" → 月薪 25000 */
export function offerSalaryToMonthly(salary: string): number {
  const m = salary.match(/(\d+(?:\.\d+)?)\s*k/i);
  return m ? Math.round(parseFloat(m[1]) * 1000) : 0;
}

// ============================================================================
// 六、奖学金（按建筑专业能力 arch 判定档位）
// ============================================================================

/**
 * 国家级奖学金按 arch（建筑专业力）从高到低分档：
 *   ≥85 → 国奖 8000
 *   ≥70 → 一等 5000
 *   ≥55 → 二等 3000
 *   ≥40 → 三等 1500
 *   <40 → 无
 */
export function scholarshipByArch(arch: number): number {
  if (arch >= 85) return 8000;
  if (arch >= 70) return 5000;
  if (arch >= 55) return 3000;
  if (arch >= 40) return 1500;
  return 0;
}

export function scholarshipLabel(amount: number): string {
  if (amount >= 8000) return "国家奖学金";
  if (amount >= 5000) return "一等学业奖学金";
  if (amount >= 3000) return "二等学业奖学金";
  if (amount >= 1500) return "三等学业奖学金";
  return "无";
}

// ============================================================================
// 七、月度结算
// ============================================================================

export function settleMonth(
  finance: FinanceState,
  currentMoney: number,
  monthIndex: number,
  partnerIncomes?: SettlementLine[]
): MonthlySettlement {
  const lines: SettlementLine[] = [];

  // —— 收入项 ——
  if (finance.monthlyIncome > 0) {
    const company = finance.internshipCompanyName ?? "实习";
    lines.push({ label: `${company} 工资`, amount: finance.monthlyIncome, type: "in" });
  }
  if (finance.sideJobIncome > 0) {
    lines.push({ label: "副业兼职", amount: finance.sideJobIncome, type: "in" });
  }
  if (finance.scholarshipPending > 0) {
    lines.push({ label: scholarshipLabel(finance.scholarshipPending), amount: finance.scholarshipPending, type: "in" });
  }
  if (partnerIncomes && partnerIncomes.length > 0) {
    partnerIncomes.forEach((p) => {
      lines.push(p);
    });
  }

  // —— 支出项 ——
  const cityLabel = CITY_COSTS[finance.city]?.label ?? "本地";
  lines.push({ label: `房租（${cityLabel}）`, amount: -finance.rent, type: "out" });
  lines.push({ label: "生活费", amount: -finance.livingCost, type: "out" });
  if (finance.trainingInstallment > 0 && finance.trainingMonthsLeft > 0) {
    lines.push({ label: `培训班月供（剩 ${finance.trainingMonthsLeft} 月）`, amount: -finance.trainingInstallment, type: "out" });
  }

  const income = lines.filter(l => l.type === "in").reduce((s, l) => s + l.amount, 0);
  const expense = lines.filter(l => l.type === "out").reduce((s, l) => s + l.amount, 0);
  const net = income + expense; // expense 已是负数

  const prevBalance = moneyToBalance(currentMoney);
  const newBalance = Math.max(0, prevBalance + net);
  const newMoney = balanceToMoney(newBalance);

  return {
    lines,
    income,
    expense: Math.abs(expense),
    net,
    newBalance,
    newMoney,
    monthLabel: `第 ${monthIndex} 月`,
  };
}

/** 余额状态文案 */
export function balanceStatusLabel(balance: number): string {
  if (balance >= 40000) return "宽裕";
  if (balance >= 20000) return "紧巴巴";
  if (balance >= 10000) return "吃紧";
  return "见底了";
}

/** 余额状态颜色 */
export function balanceStatusColor(balance: number): string {
  if (balance >= 40000) return "#4caf50"; // 绿
  if (balance >= 20000) return "#ffd54f"; // 黄
  if (balance >= 10000) return "#ff9800"; // 橙
  return "#ef5350"; // 红
}

/** 创建默认 FinanceState（角色开局时用） */
export function createInitialFinance(initialMoney: number, isOverseas: boolean = false): FinanceState {
  const city: CityKey = isOverseas ? "overseas" : "nanjing";
  const costs = CITY_COSTS[city];
  return {
    balance: moneyToBalance(initialMoney),
    monthlyIncome: 0,
    monthlyExpense: costs.rent + costs.living,
    rent: costs.rent,
    livingCost: costs.living,
    city,
    sideJobIncome: 0,
    trainingInstallment: 0,
    trainingMonthsLeft: 0,
    scholarshipPending: 0,
  };
}

/** 按新城市更新房租/生活费 */
export function applyCityToFinance(finance: FinanceState, city: CityKey): FinanceState {
  const costs = CITY_COSTS[city];
  return {
    ...finance,
    city,
    rent: costs.rent,
    livingCost: costs.living,
    monthlyExpense: costs.rent + costs.living,
  };
}

/** 格式化金额：18500 → "¥18,500" */
export function formatYuan(amount: number): string {
  const sign = amount < 0 ? "-" : "";
  return `${sign}¥${Math.abs(amount).toLocaleString("zh-CN")}`;
}
