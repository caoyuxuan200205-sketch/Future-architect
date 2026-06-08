import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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

// 初始化环境
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// 加载本地 .env
loadEnv(path.join(projectRoot, '.env'));

const apiKey = process.env.VITE_QWEN_API_KEY;
const baseUrl = process.env.VITE_QWEN_BASE_URL || 'https://api-inference.modelscope.cn/v1';
const embeddingModel = 'Qwen/Qwen3-Embedding-8B'; // 4096维向量模型

const KNOWLEDGE_BASE_DIR = 'C:/Users/24203/WorkBuddy/2026-06-08-12-15-48/.workbuddy/knowledge-base/';
const OUTPUT_SQL_FILE = path.join(projectRoot, 'insert_knowledge_chunks.sql');

if (!apiKey) {
  console.error('❌ 错误: 未配置 VITE_QWEN_API_KEY，无法生成向量。');
  process.exit(1);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// 生成向量 Embedding (带超时控制、自动重试和敏感词优雅过滤)
async function getEmbedding(text, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000); // 12秒无响应自动超时

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
        
        // 核心优化 1：如果是国内平台的敏感词安全拦截 (400)，没必要重试，直接跳过
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
      
      // 核心优化 2：超时自动重试
      if (error.name === 'AbortError') {
        console.warn(`      ⚠️ 请求超时 (第 ${attempt}/${retries} 次尝试)，正在自动重试...`);
      } else {
        console.warn(`      ⚠️ 请求失败 (第 ${attempt}/${retries} 次尝试): ${error.message}`);
      }
      
      if (attempt === retries) {
        throw error; // 超过重试上限，抛出错误
      }
      await sleep(1500); // 间隔 1.5s 后重试
    }
  }
}

// 切片 Markdown 文件
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
  if (!mainTitle) {
    mainTitle = fileName.replace('.md', '');
  }

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

function escapeSqlString(str) {
  return str.replace(/'/g, "''");
}

async function startGenerateSql() {
  console.log('🚀 开始生成知识库 SQL 导入文件 (使用魔搭 Qwen3-Embedding-8B)...');
  console.log(`📂 知识库路径: ${KNOWLEDGE_BASE_DIR}`);
  console.log(`📝 输出 SQL 文件: ${OUTPUT_SQL_FILE}`);
  
  if (!fs.existsSync(KNOWLEDGE_BASE_DIR)) {
    console.error(`❌ 错误: 知识库路径不存在!`);
    return;
  }

  // 核心优化 3：断点续传检测 (获取已成功处理的文件列表，避免重复消耗魔搭额度)
  const processedFiles = new Set();
  if (fs.existsSync(OUTPUT_SQL_FILE)) {
    const existingSql = fs.readFileSync(OUTPUT_SQL_FILE, 'utf8');
    const lines = existingSql.split('\n');
    lines.forEach(line => {
      if (line.startsWith('-- 数据来源: ')) {
        const name = line.replace('-- 数据来源: ', '').trim();
        processedFiles.add(name);
      }
    });
    console.log(`ℹ️ 检测到断点续传: 已有 SQL 包含 ${processedFiles.size} 个文件的生成记录。`);
  } else {
    // 首次运行，初始化写入 SQL 文件
    fs.writeFileSync(OUTPUT_SQL_FILE, `-- ==========================================\n-- 知识库数据导入 SQL (维度: 4096)\n-- 生成时间: ${new Date().toLocaleString()}\n-- ==========================================\n\n`);
  }

  const files = fs.readdirSync(KNOWLEDGE_BASE_DIR).filter(f => f.endsWith('.md'));
  console.log(`发现 ${files.length} 个 Markdown 文件。`);

  let totalProcessed = 0;

  for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
    const file = files[fileIndex];
    const filePath = path.join(KNOWLEDGE_BASE_DIR, file);
    
    // 如果已经处理过该文件，直接跳过，保护 Token 额度
    if (processedFiles.has(file)) {
      console.log(`📄 [${fileIndex + 1}/${files.length}] 已经处理过: ${file} (自动跳过)`);
      continue;
    }

    console.log(`\n📄 [${fileIndex + 1}/${files.length}] 正在解析: ${file}`);
    
    const chunks = chunkMarkdownFile(filePath);
    console.log(`   └─ 切分为 ${chunks.length} 个文本块。`);

    let category = '真实转行案例';
    if (file.includes('选导师')) {
      category = '选导师避坑';
    } else if (file.includes('赛道') || file.includes('方向')) {
      category = '转行赛道指南';
    }

    let fileSqlContent = `-- 数据来源: ${file}\n`;
    let fileHasSuccess = false;

    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
      const chunk = chunks[chunkIndex];
      const contextText = `【${chunk.title} - ${chunk.subtitle}】\n${chunk.content}`;
      
      try {
        console.log(`   👉 [${chunkIndex + 1}/${chunks.length}] 正在生成向量: "${chunk.subtitle.slice(0, 15)}..."`);
        
        const embedding = await getEmbedding(contextText);
        
        // 如果被敏感词过滤跳过，embedding 会是 null
        if (!embedding) {
          continue;
        }

        const sqlCategory = escapeSqlString(category);
        const sqlTitle = escapeSqlString(`${chunk.title} - ${chunk.subtitle}`);
        const sqlContent = escapeSqlString(chunk.content);
        const metadataJson = JSON.stringify({
          source_file: file,
          title: chunk.title,
          subtitle: chunk.subtitle,
          length: chunk.content.length
        });
        const sqlMetadata = escapeSqlString(metadataJson);
        const sqlEmbedding = `[${embedding.join(',')}]`;

        fileSqlContent += `INSERT INTO knowledge_chunks (category, title, content, metadata, embedding) VALUES ('${sqlCategory}', '${sqlTitle}', '${sqlContent}', '${sqlMetadata}', '${sqlEmbedding}');\n`;

        totalProcessed++;
        fileHasSuccess = true;
        await sleep(150); // 防限流
      } catch (err) {
        console.error(`   ❌ [${chunkIndex + 1}/${chunks.length}] 生成失败 (已跳过此分块): ${err.message}`);
        await sleep(2000);
      }
    }

    // 追加写入当前文件的 SQL 数据到文件末尾
    if (fileHasSuccess) {
      fs.appendFileSync(OUTPUT_SQL_FILE, fileSqlContent + '\n');
    }
  }

  console.log(`\n🎉 SQL 文件生成完成!`);
  console.log(`👉 您的项目根目录下已生成/更新了 [insert_knowledge_chunks.sql] 文件。`);
  console.log(`👉 接下来您只需将该文件内的 SQL 代码复制，粘贴到 Supabase 的 SQL Editor 中点击 Run 即可完成数据导入！`);
}

startGenerateSql();
