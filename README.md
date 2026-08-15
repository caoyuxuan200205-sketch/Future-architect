# 我是一个"建"人

> 一款关于建筑学研究生三年转行生涯的文字养成模拟器。你需要在导师、论文、实习、校招和心理状态之间做出取舍，并为自己的选择承担后果。

![游戏主视觉](public/assets/visuals/hero/architecture-career-hero.webp)

## 项目简介

《我是一个"建"人》使用数值系统和分支叙事模拟建筑学研究生的三年求职经历。玩家会经历角色生成、导师选择、课程与实习、随机事件、校园招聘、Offer 选择和最终结局。

游戏既保留了预设的 A/B/C 分支，也提供 AI 自由行动：玩家可以输入自己的处理方式，由模型结合事件背景和当前属性推演可能的剧情与数值影响。

## 核心体验

| 模块 | 内容 |
| --- | --- |
| 三年养成 | 6 个学期、24 个主要回合，在学业、能力、金钱和心理状态之间分配时间 |
| 属性系统 | **24 项**属性（11 核心 + 13 扩展），覆盖专业力、逻辑、表达、抗压、金钱、导师好感度、数据分析、审美、商业嗅觉等 |
| 分支事件 | **67 条**分支事件，每条 3-4 个预设选择，选择前隐藏影响，结算后展示具体变化 |
| AI 自由行动 | 每个分支事件都可以输入自己的做法，由 AI 判断结果与属性影响 |
| 行动系统 | **17 项**日常行动（改图 / 写论文 / 作品集 / PRD / 实习 / 社交 …），决定每回合属性成长方向 |
| 导师系统 | **4 类导师**（学术派 / 放养派 / 实践派 / 海归派），每类含多位重组自真实学者名的角色，附完整简历、办公室会面与送礼剧情 |
| 实习与校招 | **69 个实习岗位** + **54 家校招公司**（互联网大厂 / 外企科技 / 咨询 / 车企 / 投行 / 中厂 / 小厂 / 传统建筑），包含岗位匹配、投递渠道、延迟筛选、面试和 Offer 决策 |
| 天赋 Perk | **10 个天赋**（空间产品经理 / 咨询脑 / 设计复合体 / AI PM …），属性达标自动激活，给特定公司或结局分支加 buff |
| NPC 社交 | **7 位 NPC**（导师 / 学姐 / 同门 / 校友 …），好感度分级解锁对话与情报 |
| 经济系统 | **10 个城市**差异化生活成本，按公司自动推算工作城市，每月结算房租 / 生活费 / 奖学金 |
| 多种结局 | **14 种**生涯结局，并支持查看全服结局与 Offer 分布 |
| 本地存档 | 自动保存 + **3 个手动存档槽**，刷新页面后可以继续游戏 |
| 结局分享 | 生成并下载结局长图，便于分享自己的职业路线 |
| 建哥 AI | 提供游戏攻略和现实转行问答两个模式，可结合本地知识或 Supabase RAG 检索 |

## 游戏玩法循环

```text
角色创建 → 选择导师 → [ 每学期 N 回合 ]
                              ↓
              ┌──────────────┼──────────────┐
              ↓              ↓              ↓
         随机事件       日常行动        导师办公室
        (67 条分支)    (17 项可选)     (会面 / 送礼 / 拒收剧情)
              └──────┬───────┘
                     ↓
              属性结算 + 月度账单
                     ↓
           实习投递 → 面试 → Offer
                     ↓
              校招 → 结局（14 种）
```

## AI 自由行动

随机事件的 D 选项会把以下信息提交给模型：

- 当前事件及其背景；
- 玩家输入的行动；
- 当前角色属性与学期；
- A/B/C 选项的效果尺度。

模型返回行动概括、评价标签、结果叙事和属性变化。客户端还会执行二次校验：最多修改 3 项属性，单项变化限制在 `-6` 到 `6`，总绝对变化不超过 `10`，未知属性会被忽略。

推演期间会按等待时间展示过程状态：

- `0–6 秒`：理解行动与当前处境；
- `6–15 秒`：评估可行性、风险与代价；
- `15–26 秒`：生成结果并计算属性影响；
- `超过 26 秒`：明确提示仍在等待模型生成，不显示虚假百分比。

玩家可以随时取消推演，输入内容不会丢失。

## 导师办公室与送礼剧情

每位导师都有独立的办公室场景与会面系统：

- **会面互动**：学术请教 / 闲聊 / 送礼 / 机会求助四类选项，按好感度解锁；
- **送礼拒收机制**：按「导师类型 × 好感区间」概率表判定（学术派高好感拒收率高达 60%，海归派更高）；
- **剧情对话序列**：送礼被收下 / 被拒收都会播放一段多回合的横向长气泡剧情，借鉴视觉小说风格；
- **拒收不消耗回合**：被拒收后礼物退还，不影响本回合行动次数。

## 快速开始

### 环境要求

- Node.js 20 或更高版本
- npm

### 本地运行

```bash
git clone https://github.com/caoyuxuan200205-sketch/Future-architect.git
cd Future-architect
npm install
npm run dev
```

Vite 会在终端中显示本地访问地址。

### 生产构建

```bash
npm run build
```

构建产物位于 `dist/`。

## 配置 AI

运行游戏后，打开右下角的"建哥 AI 军师"，点击齿轮按钮，在设置中填写 **ModelScope API Key** 即可。Model ID 和 Base URL 可以留空，项目会使用默认值：

```text
Model: Qwen/Qwen3.5-35B-A3B
Base URL: https://api-inference.modelscope.cn/v1
```

也可以通过 `.env` 配置：

```env
VITE_QWEN_API_KEY=你的_ModelScope_API_Key
VITE_QWEN_MODEL=Qwen/Qwen3.5-35B-A3B
VITE_QWEN_BASE_URL=https://api-inference.modelscope.cn/v1
```

> API Key 默认保存在当前浏览器的 `localStorage` 中，模型请求由浏览器直接发出。公开部署时不要内置个人或高权限密钥；正式生产环境建议改用后端代理。

## 配置 Supabase（可选）

不配置 Supabase 也可以运行主体游戏。Supabase 用于全服结局统计和现实转行知识库检索。

在 `.env` 中配置：

```env
VITE_SUPABASE_URL=你的_Supabase_URL
VITE_SUPABASE_ANON_KEY=你的_Supabase_Anon_Key
```

相关文件：

- [`supabase_schema.sql`](supabase_schema.sql)：知识库表、向量字段和检索函数；
- [`scripts/supabase-ending-distribution.sql`](scripts/supabase-ending-distribution.sql)：结局与 Offer 聚合统计函数；
- `scripts/`：知识库导入与上传脚本。

请先在 Supabase SQL Editor 中执行所需 SQL，再运行对应导入脚本。

## 项目结构

```text
.
├─ public/assets/visuals/             # 学校、导师、公司、结局、背景、地图等美术素材
│  ├─ backgrounds/  companies/  endings/
│  ├─ hero/  maps/  mentors/  npcs/
│  └─ schools/  share/
├─ scripts/                           # Supabase 与知识库导入脚本
├─ src/
│  ├─ main.tsx                        # 应用入口
│  ├─ app/
│  │  ├─ App.tsx                      # 根组件
│  │  ├─ gameUiFlags.ts               # UI 开关（桌面侧栏等）
│  │  ├─ eventMeta.ts                 # 事件元数据
│  │  ├─ eventBranches.ts             # 67 条随机事件 A/B/C/D 分支数据
│  │  ├─ components/
│  │  │  ├─ GamePage.tsx              # 主游戏页面（8000+ 行核心循环）
│  │  │  ├─ DetailedStatsPanel.tsx    # FM 式 24 属性矩阵 + Perk 徽章
│  │  │  ├─ MentorOfficeModal.tsx     # 导师办公室 / 送礼剧情序列
│  │  │  ├─ DesktopGameSidebar.tsx    # 桌面端 FM 风格侧栏 + 时间轴
│  │  │  ├─ AIAssistant.tsx           # 建哥 AI 军师
│  │  │  ├─ MonthlyBillModal.tsx      # 月度账单
│  │  │  ├─ ActionIcon.tsx            # 行动图标徽章
│  │  │  └─ mobile/MobileGameShell.tsx
│  │  ├─ economy/finance.ts           # 10 城经济系统 / 月度结算
│  │  ├─ npc/
│  │  │  ├─ npcRegistry.ts            # 7 位 NPC 注册表
│  │  │  ├─ mentorEncounterData.ts    # 导师会面 / 送礼拒收概率 / 剧情
│  │  │  ├─ dialogueTrees.ts          # 对话树
│  │  │  ├─ socialStore.ts            # 社交关系存储
│  │  │  └─ types.ts
│  │  ├─ perks/perkRegistry.ts        # 10 个天赋 Perk 定义
│  │  └─ services/tracker.ts          # 行为埋点
│  └─ lib/
│     ├─ llm.ts                       # 对话与自由行动模型调用
│     ├─ knowledgeBase.ts             # 本地知识和 Supabase RAG 检索
│     └─ supabase.ts                  # Supabase 客户端
├─ supabase_schema.sql                # pgvector 数据结构
├─ vite.config.ts                     # Vite 与 GitHub Pages 构建配置
└─ .github/workflows/deploy.yml       # GitHub Pages 自动部署
```

## 技术栈

- **React 18 + TypeScript**
- **Vite 6**（构建工具，`base: './'` 适配 GitHub Pages）
- **Tailwind CSS 4**
- **Lucide React**（图标）
- **Supabase + pgvector**（全服统计与知识库 RAG 检索，可选）
- **ModelScope / Qwen**（AI 自由行动与建哥军师）
- **html-to-image**（结局长图生成）
- **Vercel Analytics**（可选埋点）

## 部署到 GitHub Pages

仓库已经提供 [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)。推送到 `main` 后，GitHub Actions 会自动安装依赖、构建并发布 `dist/`。

首次部署需要在仓库中完成以下设置：

1. 打开 **Settings → Pages**；
2. 将 Source 设置为 **GitHub Actions**；
3. 如需全服统计，在 **Settings → Secrets and variables → Actions → Variables** 中配置 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_ANON_KEY`；
4. 推送到 `main`，等待 Deploy workflow 完成。

## 数据与隐私

- 游戏自动存档、手动存档和模型配置默认保存在浏览器本地；
- 未配置 Supabase 时，全服统计与云端知识检索不可用，但不影响主体玩法；
- AI 自由行动会向所配置的模型服务发送事件内容、玩家行动和当前游戏属性；
- 仓库不应提交 `.env`、真实 API Key 或其他私密凭据。

## 致敬

导师角色名均为重组自东南大学建筑学院与建筑学界院士级学者（例如"齐廷宝" = 齐康 × 杨廷宝、"童敦桢" = 童寯 × 刘敦桢），仅作游戏化叙事使用，不指向真实人物。向所有在建筑学术与教育一线坚守的前辈致敬。
