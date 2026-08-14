# 建筑转行模拟器 — NPC 联系人解锁系统策划文档（学校线）

> 范围：聚焦**学校线 NPC**，把电脑 - 联系人页面从「导师 + 占位」升级为真实的人际网络。本期不实现完整对话树，只把「解锁条件 + 角色卡 + 轻量互动」跑通。实习线角色（mentor / leader / +1 / +2 / HR）本期仅作二期预留，不设计解锁与互动。

---

## 一、目标与范围

### 1.1 现状

当前 `DesktopGameSidebar.tsx` 的联系人 Tab 里：

| 状态 | 说明 |
|------|------|
| 导师 | 真实 NPC，已接入 `NPC_REGISTRY`（id 为 `mentor`），可发消息、回复 |
| 5 个占位 | 写死的静态数组，始终灰色锁死，不可点击 |

### 1.2 术语澄清

| 原称呼 | 新称呼 | 说明 |
|--------|--------|------|
| mentor（当前代码） | **professor** | 学校里的研究生导师 |
| mentor（后续实习线） | work_mentor | 实习期间公司里的带教人，**本期不做** |
| leader / +1 / +2 | — | 互联网职级角色，**本期不做** |
| 大厂 HR | — | 求职线 NPC，**本期不做** |
| AI 公司 CTO | — | 副业 / 转行线 NPC，**本期不做** |

### 1.3 本期目标

让学校线 4 个角色具备：

1. **真实档案**：名字、身份、性格、口头禅、关系定位
2. **解锁条件**：基于学期 / 回合 / 属性 / 事件状态判断
3. **解锁后可见**：从灰色锁图标变成可点开的角色卡
4. **轻量互动**：解锁后显示当前关系状态，可「打招呼」触发一条问候消息
5. **预留对话接口**：本期不展开多轮对话，但数据结构支持后续接入

### 1.4 本期角色名单

| 角色 | id | 定位 |
|------|-----|------|
| Professor | `professor` | 学校导师（原 `mentor` 重命名） |
| 实验室学姐 | `lab_senior` | 师门前辈，信息源 + 陪伴 |
| 同门 | `peer` | 同届入学，竞争 + 同盟 |
| 本科好友 | `college_friend` | 校外视角，情绪锚 |

### 1.5 不做的事

- 不实现 4 个学校线 NPC 的完整对话树
- 不实现约见 / 送礼 / 表白系统
- 不新增行动类型（保持现有 8 行动不变）
- 不设计实习线角色的解锁条件与互动

---

## 二、解锁条件设计

所有解锁条件读取现有 GameState，**不新增额外状态**。

### 2.1 解锁条件总表

| NPC | 解锁条件 | 触发时机 | 解锁提示文案 |
|-----|---------|---------|------------|
| **Professor** | 游戏开始时默认解锁 | 选导师后 | "你的导师已经加入联系人。" |
| **实验室学姐** | `totalRound >= 3`（研一上第 3 回合后） | 回合推进时检查 | "实验室里多了一个愿意带你的学姐。" |
| **同门** | `totalRound >= 2`（研一上第 2 回合后） | 回合推进时检查 | "你发现同届入学的 TA 和你选了同一门课。" |
| **本科好友** | `totalRound >= 5`（研一上第 5 回合后） | 回合推进时检查 | "本科好友发来消息：最近还好吗？" |

### 2.2 解锁条件的 GameState 来源

| 条件 | 对应字段 | 备注 |
|------|---------|------|
| 学期 / 回合 | `semester`, `round` | `totalRound = (semester - 1) * 4 + round` |

### 2.3 解锁检查时机

在 `nextRound()` 执行后触发 `checkNpcUnlocks()`。未来若加入事件触发解锁，可在 `chooseEventBranch()` 后追加。

---

## 三、NPC 角色档案

### 3.1 Professor — 你的导师

| 字段 | 内容 |
|------|------|
| id | `professor` |
| name | 运行时根据玩家选择的导师类型显示（齐廷宝 / 钱晓茜 / 程恺 / 常彤） |
| role | 你的导师 |
| emoji | 🏛️ |
| 性格 | 因导师类型而异：学术大牛冷峻、放养型散漫、实践型直接、海归温和 |
| 口头禅 | 沿用当前导师人设的口头禅池 |
| 关系定位 | 学业权威 + 转行路上最重要的阻力 / 助力 |
| 解锁状态 | 默认解锁 |
| 阶段映射 | 0-19 冷淡 / 20-39 公事公办 / 40-59 客气 / 60-79 热络 / 80-100 推心置腹 |

### 3.2 实验室学姐 — 王晓楠

| 字段 | 内容 |
|------|------|
| id | `lab_senior` |
| name | 王晓楠 |
| role | 实验室学姐 |
| emoji | 🎓 |
| 性格 | 热情、八卦、消息灵通，实验室里的「民间情报站」 |
| 口头禅 | "我跟你说个八卦，你别往外传。" / "我们组那个谁……算了不说了。" / "导师今天心情好像不太好。" |
| 关系定位 | 同盟 + 信息源 |
| 解锁后问候 | "终于有人愿意听我说话了。你想知道啥？" |
| 阶段映射 | 0-30 陌生 / 31-50 熟悉 / 51-80 信任 / 81-100 密友 |

### 3.3 同门 — 张一帆

| 字段 | 内容 |
|------|------|
| id | `peer` |
| name | 张一帆 |
| role | 同门 |
| emoji | 📐 |
| 性格 | 和你同届入学，表面随和，暗中较劲；会做 PPT、会卷，但也愿意借你笔记 |
| 口头禅 | "你论文写到哪了？" / "这组会我一个字都没听懂。" / "要不我们一起熬？" |
| 关系定位 | 竞争 + 同盟 + 对照组 |
| 解锁后问候 | "你也在这组？那以后一起混吧。" |
| 阶段映射 | 0-30 认识 / 31-50 混熟 / 51-80 战友 / 81-100 挚友 |

### 3.4 本科好友 — 顾小北

| 字段 | 内容 |
|------|------|
| id | `college_friend` |
| name | 顾小北 |
| role | 本科好友 |
| emoji | 🌳 |
| 性格 | 不读研、已工作，是你和「社会」之间的对照组 |
| 口头禅 | "你还在学校里卷啊？" / "周末出来喝一杯。" / "你开心吗？" |
| 关系定位 | 情绪锚 + outsider 视角 |
| 解锁后问候 | "听说你读研了。忙吗？出来吃饭。" |
| 阶段映射 | 0-30 陌生 / 31-50 常联系 / 51-80 懂你的人 / 81-100 死党 |

---

## 四、数据结构扩展

### 4.1 扩展现有 `NPC` 类型

在 `src/app/npc/types.ts` 中给 `NPC` 增加解锁相关字段：

```typescript
export interface NPC {
  id: string;
  name: string;
  role: string;
  emoji: string;
  personality: string;
  catchphrases: string[];
  awayText: string;
  /** 是否默认解锁 */
  unlockedByDefault?: boolean;
  /** 解锁条件描述（UI 展示用） */
  unlockHint: string;
  /** 解锁后的首条问候语 */
  greeting: string;
  /** 关系阶段标签（按好感度区间） */
  stageLabels: { min: number; label: string }[];
}
```

### 4.2 解锁检查上下文

```typescript
export interface UnlockContext {
  semester: number;
  round: number;
  totalRound: number;
  stats: Stats;
  socialState: SocialState;
}
```

### 4.3 解锁检查函数签名

```typescript
export function checkNpcUnlock(
  npcId: string,
  ctx: UnlockContext,
): boolean;

export function checkAllUnlocks(
  ctx: UnlockContext,
): string[]; // 返回本次新解锁的 npcId 列表
```

---

## 五、代码层面的命名迁移

当前代码里学校导师的 id 是 `mentor`，需要统一改为 `professor`，避免与后续实习 mentor 混淆。

### 5.1 需要改动的命名

| 文件 | 当前 | 改为 |
|------|------|------|
| `src/app/npc/types.ts` | 注释中 `mentor` 示例 | `professor` |
| `src/app/npc/npcRegistry.ts` | `NPC_REGISTRY.mentor` | `NPC_REGISTRY.professor` |
| `src/app/npc/npcRegistry.ts` | `setMentorDisplayName` | `setProfessorDisplayName` |
| `src/app/npc/socialStore.ts` | 内部引用 `"mentor"` | `"professor"` |
| `src/app/components/GamePage.tsx` | 所有 `"mentor"` 字符串字面量 | `"professor"` |
| `src/app/components/GamePage.tsx` | `MENTOR_OPENING_DIALOGUE` | `PROFESSOR_OPENING_DIALOGUE` |
| `src/app/components/GamePage.tsx` | `MENTOR_FOLLOWUP_POOL` | `PROFESSOR_FOLLOWUP_POOL` |
| `src/app/components/GamePage.tsx` | `setMentorDisplayName` | `setProfessorDisplayName` |
| `src/app/components/DesktopGameSidebar.tsx` | 引用 `NPC_REGISTRY.mentor` | `NPC_REGISTRY.professor` |

### 5.2 兼容性说明

`mentorFavorability` 作为 `Stats` 字段可以保留（语义上仍指学校导师好感），但代码注释中应明确其含义。后续实习 mentor 的好感度会另起字段名，如 `workMentorFavorability`。

---

## 六、联系人 Tab UI 改造

### 6.1 状态变化

| 状态 | 视觉 |
|------|------|
| 未解锁 | 灰色头像、锁图标、显示解锁 hint、不可点击 |
| 刚解锁 | 头像恢复颜色、右上角闪烁小红点（持续 1 回合） |
| 已解锁 | 可点击展开角色卡、显示关系阶段和问候语 |

### 6.2 角色卡展开内容

点击已解锁 NPC 后展开：

```
┌─────────────────────────────────┐
│ 🎓  王晓楠                       │
│     实验室学姐 · 熟悉              │
├─────────────────────────────────┤
│ 性格：热情、八卦、消息灵通           │
│ 口头禅："我跟你说个八卦，你别往外传。" │
├─────────────────────────────────┤
│ 关系：熟悉                        │
│ 互动：                            │
│ [打招呼] [问八卦] [约咖啡]        │
│                                 │
│ （本期仅 [打招呼] 可点击，其余占位）  │
└─────────────────────────────────┘
```

### 6.3 打招呼交互

点击「打招呼」后：

1. 在消息 Tab 给该 NPC 推送一条 NPC 问候消息
2. 显示一句固定回复（玩家不可选回复选项，仅作反馈）
3. 好感度 +1（上限 30，防止刷好感）
4. 引导玩家："更多对话内容将在后续版本开放"

### 6.4 实习线占位

联系人列表底部保留一个「实习线角色」折叠区，显示：

```
┌─────────────────────────────────┐
│  实习线角色（后续解锁）            │
│  💼 mentor · 进入实习后解锁        │
│  📊 leader (+1) · 进入实习后解锁   │
│  🏢 +2 · 进入实习后解锁            │
│  🤝 HR · 投递简历后解锁            │
└─────────────────────────────────┘
```

这些角色本期不解锁、不可点击，仅作预告。

---

## 七、技术实现路径

### 7.1 文件改动清单

| 文件 | 改动 |
|------|------|
| `src/app/npc/types.ts` | 扩展 `NPC` 接口，新增 `UnlockContext` |
| `src/app/npc/npcRegistry.ts` | `mentor` → `professor`；注册 `lab_senior` / `peer` / `college_friend`；补充解锁 hint / greeting / stageLabels |
| `src/app/npc/socialStore.ts` | 新增 `checkNpcUnlock` / `checkAllUnlocks` / `unlockNpc` / `greetNpc`；内部引用 `professor` |
| `src/app/components/DesktopGameSidebar.tsx` | 联系人 Tab 从静态占位改为读取 `NPC_REGISTRY`，支持展开角色卡；消息 Tab 支持切换 NPC |
| `src/app/components/GamePage.tsx` | `mentor` → `professor`；在 `nextRound` 调用 `checkAllUnlocks`；把新解锁 NPC 问候推入 `socialState` |

### 7.2 GamePage 接入点

```typescript
// 放在 nextRound 或回合推进后
const newlyUnlocked = checkAllUnlocks({
  semester, round, totalRound,
  stats, socialState,
});

if (newlyUnlocked.length > 0) {
  newlyUnlocked.forEach((npcId) => {
    setSocialState((prev) => greetNpc(prev, npcId, totalRound));
  });
  // 可选：弹出一个轻量 toast："解锁新联系人：王晓楠"
}
```

### 7.3 开发顺序

| 步骤 | 内容 | 产出 |
|------|------|------|
| 1 | mentor → professor 全代码重命名 | 术语统一 |
| 2 | 扩展类型 + 注册 4 个学校线 NPC | 数据层面角色实体化 |
| 3 | 实现解锁检查函数 | 解锁逻辑可运行 |
| 4 | 改造联系人 Tab UI + 消息 Tab NPC 切换 | 未解锁 / 已解锁状态可视化 |
| 5 | 接入 GamePage 检查点 + 打招呼 | 玩家能实际解锁并互动 |
| 6 | build + 测试 | 验证无回归问题 |

---

## 八、与后续实习线系统的衔接

本期为实习线预留了清晰的扩展位置：

| 本期工作 | 后续复用方式 |
|---------|------------|
| `NPC` 数据结构 | 直接复用，实习线角色同样注册进 `NPC_REGISTRY` |
| `checkAllUnlocks` | 增加实习相关 context 字段即可 |
| 联系人 Tab 分区 | 新增「实习线角色」独立分区 |
| 消息 Tab NPC 切换 | 已支持多 NPC，接入实习角色即可 |
| `mentorFavorability` | 明确为学校导师好感；实习 mentor 新增 `workMentorFavorability` |

---

## 九、验收标准

- [ ] 代码中所有学校导师相关 id 已从 `mentor` 改为 `professor`
- [ ] 进入游戏后，联系人 Tab 显示 Professor + 3 个灰色占位 + 实习线折叠区
- [ ] 研一上第 2 回合后，「同门」自动解锁
- [ ] 研一上第 3 回合后，「实验室学姐」自动解锁
- [ ] 研一上第 5 回合后，「本科好友」自动解锁
- [ ] 已解锁角色可点击展开角色卡，显示性格、口头禅、关系阶段
- [ ] 点击「打招呼」可在消息 Tab 看到一条该 NPC 的问候
- [ ] 未解锁角色仍显示锁图标和解锁条件 hint
- [ ] 消息 Tab 支持在多个已解锁 NPC 之间切换查看
- [ ] build 通过，无白屏、无运行时错误

---

_下一步：确认这个学校线方案后，我按步骤 1-6 实现。如果你希望调整某个角色的人设或解锁时机，现在告诉我。_
