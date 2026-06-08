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
