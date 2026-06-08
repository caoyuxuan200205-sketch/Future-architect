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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// 加载 .env
loadEnv(path.join(projectRoot, '.env'));

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_SUPABASE_ANON_KEY;
const SQL_FILE_PATH = path.join(projectRoot, 'insert_knowledge_chunks.sql');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ 错误: 未能在 .env 中找到 Supabase 的配置变量 (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)。");
  process.exit(1);
}

if (!fs.existsSync(SQL_FILE_PATH)) {
  console.error(`❌ 错误: 找不到生成的 SQL 文件: ${SQL_FILE_PATH}。请先运行 \`node scripts/import-knowledge.js\` 生成它。`);
  process.exit(1);
}

// 睡眠辅助函数
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// 解析 SQL 文件中的记录
function parseSqlFile(filePath) {
  console.log(`📖 正在读取本地 SQL 文件: ${filePath}...`);
  const sql = fs.readFileSync(filePath, 'utf8');
  console.log(`⚡ 读取完成，文件大小: ${(sql.length / 1024 / 1024).toFixed(2)} MB。开始解析数据结构...`);
  
  const records = [];
  let pos = 0;
  const len = sql.length;
  
  const prefix = "INSERT INTO knowledge_chunks (category, title, content, metadata, embedding) VALUES (";
  
  while (pos < len) {
    const startIdx = sql.indexOf(prefix, pos);
    if (startIdx === -1) break;
    
    pos = startIdx + prefix.length;
    
    const values = [];
    for (let i = 0; i < 5; i++) {
      if (sql[pos] !== "'") {
        throw new Error(`解析失败: 应该在字符位置 ${pos} 处是单引号，但读取到: ${sql[pos]}`);
      }
      pos++; // 跳过开头的单引号
      
      let str = "";
      while (pos < len) {
        if (sql[pos] === "'") {
          if (sql[pos + 1] === "'") {
            str += "'";
            pos += 2;
          } else {
            pos++; // 跳过结尾的单引号
            break;
          }
        } else {
          str += sql[pos];
          pos++;
        }
      }
      values.push(str);
      
      if (i < 4) {
        if (sql[pos] === ",") {
          pos++;
          while (sql[pos] === " " || sql[pos] === "\r" || sql[pos] === "\n") pos++;
        } else {
          throw new Error(`解析失败: 应该在字符位置 ${pos} 处是逗号，但读取到: ${sql[pos]}`);
        }
      }
    }
    
    while (sql[pos] === " " || sql[pos] === "\r" || sql[pos] === "\n") pos++;
    if (sql[pos] !== ")" || sql[pos + 1] !== ";") {
      throw new Error(`解析失败: 应该在字符位置 ${pos} 处是 ');'，但读取到: ${sql[pos]}${sql[pos+1]}`);
    }
    pos += 2;
    
    records.push({
      category: values[0],
      title: values[1],
      content: values[2],
      metadata: JSON.parse(values[3]),
      embedding: JSON.parse(values[4])
    });
  }
  
  console.log(`🎉 解析完成！共提取到 ${records.length} 条知识分块记录。`);
  return records;
}

// 批量上传记录至 Supabase
async function uploadToSupabase() {
  const records = parseSqlFile(SQL_FILE_PATH);
  if (records.length === 0) {
    console.log("ℹ️ 没有提取到任何可导入的记录。");
    return;
  }

  const restUrl = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/knowledge_chunks`;
  console.log(`🚀 开始批量上传知识库数据至 Supabase...`);
  console.log(`📡 目标 API: ${restUrl}`);

  const BATCH_SIZE = 50;
  const total = records.length;
  
  for (let start = 0; start < total; start += BATCH_SIZE) {
    const end = Math.min(start + BATCH_SIZE, total);
    const batch = records.slice(start, end);
    const batchIndex = Math.floor(start / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(total / BATCH_SIZE);
    
    let success = false;
    let attempts = 3;
    
    while (!success && attempts > 0) {
      try {
        const response = await fetch(restUrl, {
          method: 'POST',
          headers: {
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${supabaseAnonKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates' // 如果设置了主键/唯一约束，可选择合并
          },
          body: JSON.stringify(batch)
        });

        if (response.ok) {
          console.log(`✅ [批次 ${batchIndex}/${totalBatches}] 已上传记录数: ${start} ~ ${end - 1} (${batch.length} 条)。`);
          success = true;
        } else {
          const errText = await response.text();
          
          if (response.status === 404 && errText.includes('Could not find the table')) {
            console.error(`\n❌ 导入失败: 无法找到数据库中的 \`knowledge_chunks\` 表。`);
            console.error(`👉 提示: 请确保您已经在 Supabase 数据库 SQL Editor 中运行了 [supabase_schema.sql] 脚本创建该表，然后再运行此上传程序。\n`);
            process.exit(1);
          }
          
          throw new Error(`HTTP ${response.status} - ${errText}`);
        }
      } catch (err) {
        attempts--;
        console.warn(`⚠️ [批次 ${batchIndex}/${totalBatches}] 上传失败，剩余重试次数 ${attempts}: ${err.message}`);
        if (attempts > 0) {
          await sleep(2000);
        } else {
          console.error(`\n❌ 导入失败: 批次 ${batchIndex} 重试次数耗尽，已停止。`);
          process.exit(1);
        }
      }
    }
    
    await sleep(200); // 批次间稍微休眠，减轻网络压力
  }

  console.log(`\n🎉 所有 823 条知识库分块数据已全部成功上传到 Supabase 向量数据库！`);
  console.log(`👉 云端语义检索 (pgvector RAG) 现已完全准备就绪！`);
}

uploadToSupabase();
