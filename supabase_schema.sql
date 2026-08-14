-- ==========================================
-- Supabase 初始化 SQL 脚本 (pgvector RAG)
-- 适配模型：ModelScope Qwen/Qwen3-Embedding-8B (4096维向量)
-- 请在 Supabase 控制台的 SQL Editor 中执行此脚本
-- ==========================================

-- 1. 开启 pgvector 扩展
create extension if not exists vector;

-- 2. 删除旧表（如果存在）
drop table if exists knowledge_chunks;

-- 3. 创建知识库分块表
create table knowledge_chunks (
  id bigserial primary key,
  category text not null,       -- 类别：如 "选导师避坑", "转行案例", "属性解析"
  title text not null,          -- 段落标题或文件名
  content text not null,        -- 真实文本内容
  metadata jsonb,               -- 存储源文件等附加元数据
  embedding vector(4096)        -- 向量维度：4096 (重要！已适配 Qwen3-Embedding-8B)
);

-- 4. 创建相似度匹配 RPC 函数 (Cosine Similarity)
create or replace function match_knowledge_chunks (
  query_embedding vector(4096), -- 必须与表中的 4096 维一致
  match_threshold float,        -- 匹配阈值 (例如 0.3 到 0.5)
  match_count int,              -- 返回最大数量
  filter_category text default null
)
returns table (
  id bigint,
  category text,
  title text,
  content text,
  metadata jsonb,
  similarity float
)
language sql stable
as $$
  select
    id,
    category,
    title,
    content,
    metadata,
    1 - (knowledge_chunks.embedding <=> query_embedding) as similarity
  from knowledge_chunks
  where 
    (1 - (knowledge_chunks.embedding <=> query_embedding) > match_threshold)
    and (filter_category is null or category = filter_category)
  order by knowledge_chunks.embedding <=> query_embedding
  limit match_count;
$$;

-- ==========================================
-- 5. 游戏行为埋点表 game_events
-- ==========================================
-- 用于记录玩家在游戏中的每一个关键行为（行动选择、事件分支、结局等）
-- 由 src/app/services/tracker.ts 自动写入
-- 事件字典见项目文档「数据埋点规划方案」

create table if not exists game_events (
  id bigserial primary key,
  anonymous_id varchar(64) not null,    -- 跨 session 稳定的匿名用户 ID
  session_id varchar(64) not null,      -- 单次会话 ID
  game_id varchar(64) not null,         -- 单局游戏 ID

  event_name varchar(64) not null,      -- 事件名：action_choose / round_complete / ending_reach ...
  turn_index smallint,                  -- 全局回合序号 0-23（null = 游戏外阶段）
  semester smallint,                    -- 学期 1-6
  round smallint,                       -- 学期内回合 1-4
  phase varchar(32),                    -- 游戏阶段：intro / chargen / action_choice / event_view / ending ...

  event_params jsonb,                   -- 事件特有参数（每个事件不同）
  stats_snapshot jsonb,                 -- 当前 11 项属性快照（可选）

  client_ts timestamptz not null,       -- 客户端事件时间
  client_tz varchar(32),                -- 客户端时区
  platform varchar(16),                 -- web / mp
  is_desktop_layout boolean,            -- 是否桌面侧边栏布局

  created_at timestamptz default now()  -- 入库时间
);

-- 关键索引（分析查询高频路径）
create index if not exists idx_events_game       on game_events(game_id);
create index if not exists idx_events_session    on game_events(session_id);
create index if not exists idx_events_anon       on game_events(anonymous_id);
create index if not exists idx_events_name_ts    on game_events(event_name, client_ts);
create index if not exists idx_events_turn       on game_events(game_id, turn_index);
