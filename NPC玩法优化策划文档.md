# NPC 玩法优化策划文档

> 基于 2026-08-14 对当前 NPC 系统的诊断，提出的系统性优化方案。
> 设计哲学：**从"装饰性社交"转向"叙事驱动社交"**——让 NPC 对话成为驱动游戏进程的二级引擎，而非可有可无的点缀。

---

## 一、当前问题诊断（一句话回顾）

| # | 问题 | 严重度 | 根因 |
|---|------|--------|------|
| 1 | 回复选项永远相同，对话死循环 | 🔴 致命 | replyOptions 硬编码取开场白 |
| 2 | 3 个非 professor NPC 只有 1 句台词 | 🔴 致命 | 只配了 greeting/awayText |
| 3 | 好感度只是数字，不驱动内容 | 🟡 严重 | 缺里程碑触发 |
| 4 | NPC 不会主动找玩家 | 🟡 严重 | 缺主动消息机制 |
| 5 | 社交与核心玩法完全断裂 | 🟡 严重 | 结局/事件不读社交状态 |
| 6 | 打招呼鸡肋（锁死 30 上限） | 🟢 次要 | 上限设计不合理 |
| 7 | 无对话状态指示 | 🟢 次要 | UI 反馈缺失 |

---

## 二、优化总目标

**一句话：让玩家觉得"去找学姐聊一聊"是有价值的行动，而不是任务清单上的格子。**

三个具体目标：

1. **对话有起承转合** —— 每段对话是一个微型剧本，有开头、有分支、有结局，不是无限循环
2. **NPC 有自己的生命** —— 他们会主动找你，会因为你的选择记住你，会在关键时刻影响你的命运
3. **社交影响结局** —— professor 好感度低 → 被退学；学姐好感高 → 内推机会；好友理解你 → 降低自我怀疑

---

## 三、核心架构改造

### 3.1 从"硬编码选项"到"对话树节点"

**现状：**
```
replyOptions = PROFESSOR_OPENING_DIALOGUE.options  // 永远是这 3 个
```

**改造后：**
```
replyOptions = 当前对话节点的 options  // 按对话进度动态切换
```

**数据结构升级：**

```typescript
// 新增：对话树（每个 NPC 拥有多棵对话树，按触发条件挂载）
export interface DialogueTree {
  id: string;                          // "professor_career_talk"
  npcId: string;                       // "professor"
  trigger: DialogueTrigger;            // 何时触发
  startNodeId: string;                 // 入口节点
  nodes: Record<string, DialogueTreeNode>;  // 节点表
  oneShot?: boolean;                   // 是否一次性剧情（默认 true）
  cooldownRounds?: number;             // 冷却回合（仅非 oneShot 时生效）
}

export interface DialogueTrigger {
  type: "unlock"           // 解锁时自动挂载
       | "milestone"       // 好感度跨阈值
       | "round"           // 指定回合
       | "stat"            // 属性达到值
       | "action_count"    // 行为次数（如投简历≥3）
       | "manual";         // 玩家主动发起
  // 各类型的参数
  milestoneFavor?: number;             // type=milestone 时
  round?: number;                      // type=round 时
  statKey?: string;                    // type=stat 时
  statMin?: number;
  actionKey?: string;                  // type=action_count 时
  actionMin?: number;
}

export interface DialogueTreeNode {
  npcMessage: string;                  // NPC 发言
  tone?: ToneTier;                     // 语气（用于气泡色）
  options: DialogueOption[];           // 玩家可选项
}

export interface DialogueOption {
  text: string;
  favorDelta?: number;                 // 好感度变化
  statEffects?: Partial<Stats>;        // 直接属性影响（如 +selfDoubt）
  nextNodeId?: string;                 // 进入下一节点（undefined 表示对话结束）
  anchorFlag?: string;                 // 设置剧情锚点
  endingUnlocks?: string[];            // 解锁某些结局的触发权
  cooldownAfterRounds?: number;        // 这段对话结束后冷却多少回合
}
```

**关键变化：**
- `nextNodeId` 实现真正的分支对话树（不是线性列表）
- 每个 NPC 拥有**多棵对话树**，按条件挂载
- `oneShot` 保证剧情对话不会重复触发
- `statEffects` 让对话直接影响属性，不再是单纯数字游戏

---

### 3.2 NPC 运行时状态扩展

**现状的 NPCBondStatus：**
```typescript
{
  favorability: 30,
  messageIds: [],
  anchorFlags: [],
  lastInteractionRound: 0
}
```

**升级后：**
```typescript
export interface NPCBondStatus {
  favorability: number;
  messageIds: string[];
  anchorFlags: string[];               // 玩家走过的剧情锚点
  lastInteractionRound: number;
  // —— 新增字段 ——
  completedTreeIds: string[];          // 已完成的对话树（防止重复触发）
  activeTreeId: string | null;         // 当前挂载的对话树（null 表示空闲）
  activeNodeId: string | null;         // 当前对话进度到的节点
  pendingTriggerTreeIds: string[];     // 已满足触发条件但玩家还没看的对话（红点提示）
  chatsThisRound: number;              // 本回合已聊次数（限制刷好感）
  milestoneFlags: number[];            // 已跨过的里程碑（40/60/80），防止重复触发
}
```

**关键设计：**
- `activeTreeId / activeNodeId` —— 让对话可以跨回合暂停续聊
- `pendingTriggerTreeIds` —— NPC 主动发起的消息在这里排队，红点提示玩家
- `chatsThisRound` —— 防止刷好感（每回合上限 3 次）
- `milestoneFlags` —— 好感度跨阈值时触发里程碑剧情，只触发一次

---

## 四、对话内容设计

### 4.1 每个 NPC 的对话树清单（一期最小集）

#### 🏛️ Professor（学校导师）

| 对话树 ID | 触发条件 | 主题 | 节点数 | 影响 |
|----------|---------|------|-------|------|
| `prof_opening` | 解锁时 | 第一次见面（现有） | 1 | 基础好感 |
| `prof_midterm_review` | 研一上第 4 回合 | 期中谈话：你最近状态如何 | 3 | 影响 selfDoubt |
| `prof_career_direction` | 研一下第 2 回合 | 问你毕业打算 | 4 | 设置关键 anchorFlag，影响结局分支 |
| `prof_favor_60` | 好感≥60（一次性） | 主动约你办公室喝咖啡 | 3 | 解锁"导师推荐你读博"结局线索 |
| `prof_favor_80` | 好感≥80（一次性） | 推心置腹：我跟你说个事 | 2 | 解锁隐藏结局 |
| `prof_low_warning` | 好感≤15（一次性） | 最后通牒 | 2 | 不改善则走向退学结局 |

#### 🎓 Lab Senior（实验室学姐）

| 对话树 ID | 触发条件 | 主题 | 节点数 | 影响 |
|----------|---------|------|-------|------|
| `senior_gossip_1` | 解锁后第 1 回合 | 八卦：听说 XX 公司在招人 | 2 | 解锁一个实习投递机会 |
| `senior_advice_career` | 研一上第 5 回合 | 询问你想做啥 | 3 | 影响 selfDoubt |
| `senior_favor_60` | 好感≥60 | 内推机会 | 2 | 直接给你一个保底 offer 线索 |
| `senior_warning_job` | 投简历≥3 次 | 提醒你别只盯着大厂 | 2 | 影响结局倾向 |

#### 📐 Peer（同门张一帆）

| 对话树 ID | 触发条件 | 主题 | 节点数 | 影响 |
|----------|---------|------|-------|------|
| `peer_first_meet` | 解锁时 | 第一次见面（升级版 greeting） | 2 | 立人设 |
| `peer_comparison` | 研一上第 3 回合 | 暗示他论文写得比你快 | 3 | +selfDoubt 但 +logic |
| `peer_late_night` | 研一上第 6 回合 | 邀你一起熬夜 | 2 | 选择影响 arch 和 stress |
| `peer_favor_60_confess` | 好感≥60 | 坦白：其实我一直把你当对手 | 2 | 解锁"学术伙伴"结局线索 |

#### 🌳 College Friend（本科好友顾小北）

| 对话树 ID | 触发条件 | 主题 | 节点数 | 影响 |
|----------|---------|------|-------|------|
| `friend_catch_up` | 解锁时 | 叙旧（升级版 greeting） | 2 | 立人设 |
| `friend_advice_pivot` | 研一上第 7 回合 | 问你转行决心 | 3 | 影响 selfDoubt，设置 anchorFlag |
| `friend_reality_check` | 研一下第 3 回合 | 他加班崩溃了 | 2 | 选择影响你对工作的态度 |
| `friend_favor_60_emotional` | 好感≥60 | 深夜长谈 | 2 | 大幅降 selfDoubt |

---

### 4.2 对话剧本示例（prof_career_direction 完整展开）

这是最重要的一个对话树——决定结局走向的关键剧情。

```
节点 A（入口）
─────────────────
NPC: "坐。我问你个正经事——毕业之后，你到底想干嘛？"
语气: polite

选项:
├─ A1「我想去互联网做产品」 (+0 好感, anchorFlag="wants_pivot", → B1)
├─ A2「我想读博深造」      (+3 好感, anchorFlag="wants_phd", → B2)
├─ A3「我想回设计院」      (-1 好感, → B3)
└─ A4「老师，我还没想好」  (-2 好感, → B4)


节点 B1（玩家选了转行）
─────────────────
NPC: "互联网？你凭什么？你最近半年做了什么和产品有关的事？"
语气: neutral

选项:
├─ B1a「我做了 XX 项目，学了 YY」 (+2 好感, statEffects: {logic:+3}, → C)
├─ B1b「我还在准备阶段」          (-1 好感, statEffects: {selfDoubt:+5}, → C)
└─ B1c「老师您觉得我不行？」      (-3 好感, anchorFlag="prof_doubt_conflict", → C)


节点 B2（玩家选了读博）
─────────────────
NPC: "读博？你这股劲头我看得出来。但你得想清楚，这是七年的事。"
语气: warm

选项:
├─ B2a「我想清楚了」 (+3 好感, endingUnlocks: ["phd_track"], → C)
└─ B2b「其实我也在犹豫」 (-1 好感, → C)


节点 B3（玩家选了回设计院）
─────────────────
NPC: "行。那你的逻辑、表达，这些年的努力都白费了？"
语气: cold

选项:
├─ B3a「不算白费，是积累」 (0 好感, → C)
└─ B3b「我也不知道算不算白费」 (+2 selfDoubt, → C)


节点 B4（玩家没想好）
─────────────────
NPC: "没想好就回去想。但我告诉你——等到研三才想，就晚了。"
语气: neutral
statEffects: { selfDoubt: +3 }


节点 C（收束）
─────────────────
NPC: "行，我知道了。你回去再想想，下个月组会我要听到更具体的。"
语气: neutral
（对话结束）
```

**为什么这样设计：**
- **A 节点的选择直接设置 anchorFlag**，这些 flag 会在结局判定时被读取
- **B 节点根据 A 的选择分支**，让玩家感到"我的选择被记住了"
- **每个选项都有具体后果**（好感 / 属性 / anchorFlag），不是空对话
- **最终收束到 C**，对话有明确终点，不会无限循环

---

## 五、里程碑触发机制

### 5.1 好感度跨阈值时触发专属剧情

**触发逻辑（伪代码）：**

```typescript
function checkMilestone(bond: NPCBondStatus, npcId: string): string | null {
  const MILESTONES = [40, 60, 80];
  for (const m of MILESTONES) {
    if (bond.favorability >= m && !bond.milestoneFlags.includes(m)) {
      // 找到对应 NPC + 阈值的对话树
      const treeId = `${npcId}_favor_${m}`;
      if (DIALOGUE_TREES[treeId]) return treeId;
    }
  }
  return null;
}
```

### 5.2 里程碑对话示例（professor 好感≥60）

```
对话树: prof_favor_60
触发: professor 好感首次≥60
一次性: 是

节点 1:
NPC: "你最近状态不错。下周三下午有空吗？我在想，要不要给你推荐个读博的机会。"
语气: warm

选项:
├─「老师，我愿意听」 (+1 好感, anchorFlag="professor_phd_offer", 结束)
├─「老师，我其实想去业界」 (0 好感, anchorFlag="professor_understand_pivot", 结束)
└─「老师，我还没决定毕业方向」 (0 好感, 结束)
```

**后果：**
- 设置 `professor_phd_offer` → 结局判定时解锁"博士深造"结局
- 设置 `professor_understand_pivot` → professor 后续对话会更支持你的转行选择

---

## 六、NPC 主动消息机制

### 6.1 每回合触发检查

在 `nextRound` 里新增一段逻辑：

```typescript
// 1. 检查里程碑（好感跨阈值）
for (const npcId of unlockedNpcIds) {
  const treeId = checkMilestone(bond, npcId);
  if (treeId) {
    next = triggerDialogueTree(next, npcId, treeId, round);
    // 推送一条"主动消息"到消息 Tab，红点提示
  }
}

// 2. 检查按回合触发的对话树
for (const tree of DIALOGUE_TREES) {
  if (tree.trigger.type === "round" && tree.trigger.round === nextTotalRound) {
    next = triggerDialogueTree(next, tree.npcId, tree.id, round);
  }
}

// 3. 检查按行为触发的对话树（如投简历≥3 次）
for (const tree of DIALOGUE_TREES) {
  if (tree.trigger.type === "action_count" && 
      actionMemory[tree.trigger.actionKey] >= tree.trigger.actionMin) {
    next = triggerDialogueTree(next, tree.npcId, tree.id, round);
  }
}
```

### 6.2 主动消息的 UI 表现

- 消息 Tab 红点 +1
- 进入消息 Tab 后，顶部显示「📚 有新话题」提示
- 玩家点开就有完整的对话节点（不是单条文本）
- 对话结束后进入冷却（`cooldownRounds` 控制）

---

## 七、社交影响核心玩法

### 7.1 结局判定加入 NPC 好感度

**现状结局判定只看 stats。改造后：**

```typescript
// 结局判定函数新增 socialState 参数
function checkEnding(stats: Stats, social: SocialState): Ending {
  // ... 现有逻辑 ...
  
  // 新增：professor 好感≤0 触发退学（已有）
  if (stats.mentorFavorability <= 0) return ENDINGS.expelled;
  
  // 新增：professor 好感≥80 且设置了 phd_offer anchor → 博士结局
  if (social.bonds.professor?.favorability >= 80 && 
      social.bonds.professor?.anchorFlags.includes("professor_phd_offer")) {
    return ENDINGS.phd_track;
  }
  
  // 新增：学姐好感≥60 且设置了 inner_push anchor → 学姐内推结局加成
  if (social.bonds.lab_senior?.favorability >= 60 &&
      social.bonds.lab_senior?.anchorFlags.includes("senior_inner_push")) {
    // 提升 bigtech_pm 结局的优先级
  }
  
  // 新增：本科好友好感≥80 → 大幅降低 selfDoubt，可能扭转"自我怀疑退却"结局
  if (social.bonds.college_friend?.favorability >= 80) {
    stats = { ...stats, selfDoubt: Math.max(0, stats.selfDoubt - 30) };
  }
}
```

### 7.2 因果事件系统接入社交状态

在 `eventMeta.ts` 的 `getCausalEvent()` 因子中新增"社交修饰"：

```typescript
// 新增第五因子：社交锚点修饰
function socialModifier(event: EventMeta, social: SocialState): number {
  if (event.requiresAnchor && !hasAnchor(social, event.requiresAnchor)) {
    return 0;  // 没有对应剧情锚点，事件不触发
  }
  if (event.boostedByAnchor && hasAnchor(social, event.boostedByAnchor)) {
    return 1.5;  // 有锚点的事件权重加成
  }
  return 1;
}
```

**示例：** 玩家和 professor 聊过"想读博"（设置了 anchorFlag）→ 解锁"导师推荐学术会议"事件。

### 7.3 新增"社交资本"二级属性（可选）

如果不想侵入现有结局系统，可以新增一个汇总字段：

```typescript
interface Stats {
  // ... 现有 11 个属性 ...
  socialCapital: number;  // 新增：所有 NPC 好感度加权平均
}
```

**计算方式：**
```
socialCapital = (professor_favor * 0.4) 
              + (lab_senior_favor * 0.25)
              + (peer_favor * 0.15)
              + (college_friend_favor * 0.2)
```

**用途：**
- 影响"人脉型"结局（如咨询、金融）的判定
- 在简历页展示"研究生期间积累的人脉"
- 作为某些事件的前置条件

---

## 八、对话节奏与限制

### 8.1 防止刷好感

| 限制项 | 值 | 理由 |
|--------|-----|------|
| 每回合每个 NPC 最多聊 | 3 次 | 避免一轮刷满 |
| 打招呼好感上限 | 提高到 50（原 30） | 让打招呼在中段也有意义 |
| 里程碑触发后冷却 | 5 回合 | 防止连续触发 |
| oneShot 剧情 | 终身 1 次 | 关键抉择不能反悔 |

### 8.2 对话状态指示（UI 优化）

在消息 Tab 顶部增加状态条：

```
┌──────────────────────────────────────────┐
│ 🏛️ 你的导师 · 客气 · ❤️ 45               │
│ 当前话题：期中谈话（2/3 节点）             │
│ [继续对话]                                │
└──────────────────────────────────────────┘

或

┌──────────────────────────────────────────┐
│ 🏛️ 你的导师 · 客气 · ❤️ 45               │
│ ✅ 当前没有待回复话题                     │
│ 💬 等待下回合 NPC 主动发起                │
└──────────────────────────────────────────┘
```

---

## 九、实施路线图

### Phase 1（P0，必做）：让对话成立

**目标：** 解决死循环 + 空壳 NPC 问题

| 任务 | 工作量 | 产出 |
|------|--------|------|
| 升级 types.ts（新增 DialogueTree 相关类型） | 小 | 数据结构就绪 |
| 升级 socialStore.ts（新增对话树挂载/推进函数） | 中 | 引擎就绪 |
| professor 配置 5 棵对话树（见 §4.1） | 大 | 导师有完整剧情 |
| 3 个非 professor NPC 各配置 2 棵对话树 | 大 | 4 个 NPC 都能聊 |
| 改造 GamePage.tsx（replyOptions 动态读取当前节点） | 小 | 死循环修复 |
| UI 增加对话状态指示 | 小 | 体验改善 |

**验证：** 进游戏聊一轮，对话有开头有结尾，4 个 NPC 都能聊出内容。

---

### Phase 2（P1）：里程碑 + 主动消息

**目标：** 让 NPC "活起来"

| 任务 | 工作量 | 产出 |
|------|--------|------|
| 实现 checkMilestone + 跨阈值触发 | 中 | 好感爬升有奖励 |
| 实现 nextRound 主动消息检查 | 中 | NPC 会主动找你 |
| 为每个 NPC 补充里程碑对话树 | 大 | 内容填充 |
| UI 增加红点 + "有新话题"提示 | 小 | 玩家知道有新内容 |

**验证：** 推进几个回合后，能收到 NPC 主动发起的带选项消息。

---

### Phase 3（P1）：社交影响核心玩法

**目标：** 让社交产生实质后果

| 任务 | 工作量 | 产出 |
|------|--------|------|
| 结局判定函数加入 socialState | 中 | NPC 影响结局 |
| 新增 2-3 个社交驱动的结局（博士深造、学术伙伴等） | 中 | 结局更丰富 |
| 因果事件系统接入社交锚点 | 中 | 社交解锁新事件 |
| 简历/结算页展示 NPC 关系总结 | 小 | 成就感 |

**验证：** 不同的 NPC 互动策略能导向不同结局。

---

### Phase 4（P2）：打磨与扩展

| 任务 | 说明 |
|------|------|
| NPC 语气实时映射 | 好感变化时气泡颜色渐变 |
| 对话历史回看 | 消息 Tab 支持翻阅过往关键对话 |
| 实习线 NPC 占位 | 为后续实习玩法预留接口 |
| 成就系统 | "和所有 NPC 都达到推心置腹" 等成就 |

---

## 十、风险与取舍

### 10.1 内容工作量

**最大风险：** 4 个 NPC × 平均 4 棵对话树 × 平均 3 个节点 = **48 个节点要写**。

**缓解策略：**
- 一期只做 Phase 1，即 professor 5 棵 + 其他 3 人各 2 棵 = 11 棵树 ≈ 30 节点
- 用模板化写作（每个节点的 NPC 发言 + 3 选项）
- 可以批量生成草稿，再人工打磨关键剧情（如 prof_career_direction）

### 10.2 状态管理复杂度

**风险：** `activeTreeId / activeNodeId / pendingTriggerTreeIds` 等字段增加了 state 复杂度。

**缓解：**
- 所有状态变更走 socialStore.ts 的纯函数
- 为每个函数写单元测试
- 持久化时检查 schema 兼容性

### 10.3 与现有系统的耦合

**风险：** 结局判定、因果事件接入社交后，改动范围扩大。

**缓解：**
- Phase 3 才做核心玩法接入，前两期保持现有系统不变
- 用 anchorFlag 作为松耦合媒介（社交系统设置标记，结局系统读取标记）

---

## 十一、成功指标

| 指标 | 现状 | 目标 |
|------|------|------|
| 玩家平均查看消息 Tab 次数 | 未知（建议加埋点） | 每回合 ≥ 1 次 |
| NPC 对话完成率 | 0%（因为死循环没人聊完） | ≥ 70% |
| NPC 好感度达到 60 的玩家比例 | 接近 0% | ≥ 40% |
| 因社交锚点触发的结局比例 | 0% | ≥ 25% |

---

## 附：与现有 NPC 系统的兼容性

| 现有模块 | 改造影响 |
|---------|---------|
| `socialStore.ts` 纯函数 | 大改：新增对话树相关函数，现有函数保留 |
| `npcRegistry.ts` NPC 定义 | 中改：新增 `dialogueTrees` 字段挂载对话树 |
| `types.ts` | 大改：新增 DialogueTree 相关 8 个接口 |
| `DesktopGameSidebar.tsx` UI | 小改：replyOptions 改为读取 activeNode.options，加状态指示 |
| `GamePage.tsx` 接入 | 中改：nextRound 加触发检查，结局判定加 social 参数 |
| 因果事件系统 `eventMeta.ts` | 小改：新增 socialModifier 因子 |
| 结局表 `ENDINGS` | 中改：新增 2-3 个社交驱动结局 |

**关键原则：** 所有改动都是**加法**，不删现有字段，保证存档兼容。

---

*文档版本：v1.0 · 2026-08-14 · 基于当前代码诊断制定*
