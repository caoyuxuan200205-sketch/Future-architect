import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

// 自定义轻量级 .env 文件加载逻辑
function loadEnv(envPath) {
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach(line => {
      if (line.trim().startsWith('#') || !line.trim()) return;
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
        process.env[key] = value.trim();
      }
    });
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

loadEnv(path.join(projectRoot, '.env'));

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_SUPABASE_ANON_KEY;

// 魔搭 ModelScope 相关配置
const apiKey = process.env.VITE_QWEN_API_KEY;
const baseUrl = process.env.VITE_QWEN_BASE_URL || 'https://api-inference.modelscope.cn/v1';
const embeddingModel = 'Qwen/Qwen3-Embedding-8B';

// 本地知识库路径
const KNOWLEDGE_BASE_DIR = 'C:/Users/24203/WorkBuddy/2026-06-08-12-15-48/.workbuddy/knowledge-base/';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ 错误: 未能在 .env 中找到 Supabase 配置 (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)。");
  process.exit(1);
}

if (!apiKey) {
  console.error("❌ 错误: 未能在 .env 中找到 ModelScope API Key (VITE_QWEN_API_KEY)。");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function getEmbedding(text, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    try {
      const response = await fetch(`${baseUrl}/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: embeddingModel,
          input: text,
          encoding_format: 'float'
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        if (response.status === 400 && errorText.includes('inappropriate content')) {
          console.warn(`      ⚠️ 安全拦截: 该段落包含魔搭敏感词过滤，已自动跳过生成。`);
          return null;
        }
        throw new Error(`Embedding API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      return data.data[0].embedding;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        console.warn(`      ⚠️ 请求超时 (第 ${attempt}/${retries} 次尝试)...`);
      } else {
        console.warn(`      ⚠️ 请求失败 (第 ${attempt}/${retries} 次尝试): ${error.message}`);
      }
      if (attempt === retries) throw error;
      await sleep(1500);
    }
  }
}

function chunkMarkdownFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const fileName = path.basename(filePath);
  const lines = content.split('\n');

  let mainTitle = '';
  for (const line of lines) {
    if (line.startsWith('# ')) {
      mainTitle = line.replace('# ', '').trim();
      break;
    }
  }
  if (!mainTitle) mainTitle = fileName.replace('.md', '');

  const chunks = [];
  let currentHeader = '';
  let currentParagraph = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('## ') || line.startsWith('### ')) {
      if (currentParagraph.length > 0) {
        const text = currentParagraph.join('\n').trim();
        if (text.length > 30) {
          chunks.push({
            title: mainTitle,
            subtitle: currentHeader || '前言/导言',
            content: text
          });
        }
        currentParagraph = [];
      }
      currentHeader = line.replace(/^##+\s+/, '').trim();
    } else {
      currentParagraph.push(line);
    }
  }

  if (currentParagraph.length > 0) {
    const text = currentParagraph.join('\n').trim();
    if (text.length > 30) {
      chunks.push({
        title: mainTitle,
        subtitle: currentHeader || '总结',
        content: text
      });
    }
  }

  return chunks;
}

async function startImport() {
  console.log(`🚀 开始生成知识库向量并直接上传至 Supabase (ModelScope Qwen3-Embedding-8B)...`);
  console.log(`📂 知识库路径: ${KNOWLEDGE_BASE_DIR}`);

  if (!fs.existsSync(KNOWLEDGE_BASE_DIR)) {
    console.error(`❌ 错误: 知识库路径不存在!`);
    return;
  }

  const files = fs.readdirSync(KNOWLEDGE_BASE_DIR).filter(f => f.endsWith('.md'));
  console.log(`发现 ${files.length} 个 Markdown 文件。`);

  const { data: existingData, error: fetchError } = await supabase
    .from('knowledge_chunks')
    .select('metadata');

  const processedFiles = new Set();
  if (!fetchError && existingData) {
    existingData.forEach(row => {
      if (row.metadata && row.metadata.source_file) {
        processedFiles.add(row.metadata.source_file);
      }
    });
    console.log(`ℹ️ Supabase 中已有 ${processedFiles.size} 个文件的记录，这些文件将被跳过。`);
  }

  let totalUploaded = 0;

  for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
    const file = files[fileIndex];

    if (processedFiles.has(file)) {
      console.log(`📄 [${fileIndex + 1}/${files.length}] 已经处理过: ${file} (跳过)`);
      continue;
    }

    const filePath = path.join(KNOWLEDGE_BASE_DIR, file);
    console.log(`\n📄 [${fileIndex + 1}/${files.length}] 正在解析并上传: ${file}`);

    const chunks = chunkMarkdownFile(filePath);
    console.log(`   └─ 切分为 ${chunks.length} 个文本块。`);

    let category = '真实转行案例';
    if (file.includes('选导师')) {
      category = '选导师避坑';
    } else if (file.includes('赛道') || file.includes('方向')) {
      category = '转行赛道指南';
    }

    const recordsToInsert = [];

    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
      const chunk = chunks[chunkIndex];
      const contextText = `【${chunk.title} - ${chunk.subtitle}】\n${chunk.content}`;

      try {
        process.stdout.write(`   👉 [${chunkIndex + 1}/${chunks.length}] 向量化... `);

        const embedding = await getEmbedding(contextText);

        if (!embedding) {
          console.log(`跳过 ⚠️`);
          continue;
        }

        recordsToInsert.push({
          category: category,
          title: `${chunk.title} - ${chunk.subtitle}`,
          content: chunk.content,
          metadata: {
            source_file: file,
            title: chunk.title,
            subtitle: chunk.subtitle,
            length: chunk.content.length
          },
          embedding: embedding
        });

        process.stdout.write(`完成 ✅\n`);
        await sleep(150); // 防限流
      } catch (err) {
        console.error(`❌ 失败: ${err.message}`);
        await sleep(2000);
      }
    }

    if (recordsToInsert.length > 0) {
      console.log(`   ⬆️ 正在批量插入 Supabase (${recordsToInsert.length}条)...`);
      const { error } = await supabase.from('knowledge_chunks').insert(recordsToInsert);

      if (error) {
        console.error(`   ❌ 插入 Supabase 失败:`, error);
      } else {
        console.log(`   ✅ 插入成功!`);
        totalUploaded += recordsToInsert.length;
      }
    }
  }

  console.log(`\n🎉 任务完成！共成功处理并上传 ${totalUploaded} 条知识分块到 Supabase。`);
}

startImport();