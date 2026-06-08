import React, { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Bot, User, Loader2, Settings, Key } from "lucide-react";
import { searchKnowledge, localSearch } from "../../lib/knowledgeBase";
import { askAssistant, ChatMessage } from "../../lib/llm";
import { supabase } from "../../lib/supabase";

interface LocalChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
  retrievedSources?: any[];
}

interface AIAssistantProps {
  gameContext: any; // 传入当前的属性、进度等状态
}

export function AIAssistant({ gameContext }: AIAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"game" | "real">("game");
  const [gameMessages, setGameMessages] = useState<LocalChatMessage[]>([
    { role: "assistant", content: "哈喽！我是建哥，你的转行领路人。游戏攻略这块，有什么不懂的游戏机制或者选错的加点，尽管问我。" }
  ]);
  const [realMessages, setRealMessages] = useState<LocalChatMessage[]>([
    { role: "assistant", content: "这里是现实转行讨论区。想聊聊真实的建筑狗转行方向、想挑选个靠谱的现实研究生导师，还是准备跳槽转大厂？直接向我提问吧！" }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [qwenKeyInput, setQwenKeyInput] = useState(() => localStorage.getItem("qwen_api_key") || "");
  const [qwenModelInput, setQwenModelInput] = useState(() => localStorage.getItem("qwen_model") || "");
  const [qwenBaseUrlInput, setQwenBaseUrlInput] = useState(() => localStorage.getItem("qwen_base_url") || "");
  const [doubaoApiKeyInput, setDoubaoApiKeyInput] = useState(() => localStorage.getItem("doubao_api_key") || "");
  const [doubaoEmbeddingEpInput, setDoubaoEmbeddingEpInput] = useState(() => localStorage.getItem("doubao_embedding_ep") || "");
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 自动滚动到最新消息
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [gameMessages, realMessages, activeTab, isOpen]);

  const handleImportData = async () => {
    if (isImporting) return;
    setIsImporting(true);
    setImportStatus("正在从开发服务器读取 SQL 向量文件...");
    
    try {
      const response = await fetch("/insert_knowledge_chunks.sql");
      if (!response.ok) {
        throw new Error(`无法获取 SQL 文件: ${response.status} ${response.statusText}`);
      }
      
      const sql = await response.text();
      setImportStatus("文件读取完成，正在解析数据...");
      
      // 解析 SQL 记录
      const records: any[] = [];
      let pos = 0;
      const len = sql.length;
      const prefix = "INSERT INTO knowledge_chunks (category, title, content, metadata, embedding) VALUES (";
      
      while (pos < len) {
        const startIdx = sql.indexOf(prefix, pos);
        if (startIdx === -1) break;
        
        pos = startIdx + prefix.length;
        
        const values: string[] = [];
        for (let i = 0; i < 5; i++) {
          if (sql[pos] !== "'") {
            throw new Error(`解析失败: 应该在位置 ${pos} 处是单引号，但读取到: ${sql[pos]}`);
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
              throw new Error(`解析失败: 应该在位置 ${pos} 处是逗号，但读取到: ${sql[pos]}`);
            }
          }
        }
        
        while (pos < len && (sql[pos] === " " || sql[pos] === "\r" || sql[pos] === "\n")) pos++;
        if (sql[pos] !== ")" || sql[pos + 1] !== ";") {
          throw new Error(`解析失败: 应该在位置 ${pos} 处是 ');'，但读取到: ${sql[pos]}${sql[pos+1]}`);
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
      
      setImportStatus(`解析完成，共 ${records.length} 条记录。正在上传至 Supabase...`);
      
      // 批量上传
      const BATCH_SIZE = 50;
      const total = records.length;
      
      for (let start = 0; start < total; start += BATCH_SIZE) {
        const end = Math.min(start + BATCH_SIZE, total);
        const batch = records.slice(start, end);
        const batchIndex = Math.floor(start / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(total / BATCH_SIZE);
        
        setImportStatus(`正在上传: 批次 ${batchIndex}/${totalBatches} (${start} ~ ${end} 条)...`);
        
        const { error } = await supabase.from("knowledge_chunks").insert(batch);
        
        if (error) {
          throw new Error(`Supabase 写入失败: ${error.message}`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 150));
      }
      
      setImportStatus("🎉 823 条向量数据成功导入到 Supabase！");
      alert("🎉 向量数据导入成功！可以开始检索了。");
    } catch (err: any) {
      console.error(err);
      setImportStatus(`❌ 导入失败: ${err.message || err}`);
    } finally {
      setIsImporting(false);
    }
  };

  const renderMarkdown = (text: string) => {
    // 1. 转义 HTML 字符，防止 XSS
    let html = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // 2. 加粗 **bold**
    html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

    // 3. 行内代码 `code`
    html = html.replace(/`(.*?)`/g, "<code class='bg-[#13141a] px-1 py-0.5 rounded text-red-400 font-mono text-[11px]'>$1</code>");

    // 4. 标题 (## 和 ###)
    html = html.replace(/^(#{1,6})\s+(.*)$/gm, (match, hashes, content) => {
      const level = hashes.length;
      const classes = level === 1 
        ? "text-base font-bold text-blue-400 mt-2 mb-1" 
        : level === 2 
          ? "text-sm font-bold text-blue-400 mt-2 mb-1" 
          : "text-[13px] font-semibold text-blue-400 mt-1.5 mb-0.5";
      return `<div class="${classes}">${content}</div>`;
    });

    // 5. 引用块 > quote
    html = html.replace(/^\>\s+(.*)$/gm, "<blockquote class='border-l-2 border-blue-500 pl-2 text-gray-400 italic my-1'>$1</blockquote>");

    // 6. 无序列表 (支持 •, -, *)
    html = html.replace(/^[•\-\*]\s*(.*)$/gm, "<li class='list-disc list-inside ml-2 text-gray-300'>$1</li>");

    // 7. 换行与段落
    html = html.replace(/\n\n/g, "<div class='h-2'></div>");
    html = html.replace(/\n/g, "<br />");

    return <div dangerouslySetInnerHTML={{ __html: html }} className="leading-relaxed" />;
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userQuery = input.trim();
    setInput("");
    
    const currentMessages = activeTab === "game" ? gameMessages : realMessages;
    const setMessages = activeTab === "game" ? setGameMessages : setRealMessages;

    const newMessages: LocalChatMessage[] = [...currentMessages, { role: "user", content: userQuery }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      let retrievedChunks = [];
      if (activeTab === "game") {
        setLoadingText("建哥正在整理加点攻略...");
        retrievedChunks = localSearch(userQuery, 4);
      } else {
        setLoadingText("正在云端向量库检索避坑经验...");
        retrievedChunks = await searchKnowledge(userQuery, 4);
        setLoadingText("建哥正在梳理真实的转行案例...");
      }
      
      // 2. 截取最近的几条历史记录传给大模型，避免上下文过长
      const chatHistoryForLLM = newMessages.slice(-5).map(m => ({
        role: m.role as "system" | "user" | "assistant",
        content: m.content
      }));

      // 3. 请求大模型 (传入对应的 mode/tab)
      const response = await askAssistant(userQuery, retrievedChunks, gameContext, chatHistoryForLLM, activeTab);
      
      setMessages(prev => [...prev, { role: "assistant", content: response, retrievedSources: retrievedChunks }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: "assistant", content: "啊这...学长脑子突然短路了，稍后再试一下吧。" }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSaveSettings = () => {
    localStorage.setItem("qwen_api_key", qwenKeyInput.trim());
    localStorage.setItem("qwen_model", qwenModelInput.trim());
    localStorage.setItem("qwen_base_url", qwenBaseUrlInput.trim());
    localStorage.setItem("doubao_api_key", doubaoApiKeyInput.trim());
    localStorage.setItem("doubao_embedding_ep", doubaoEmbeddingEpInput.trim());
    setShowSettings(false);
    
    // 如果之前有关于未配置的提示，可以用一条新消息告知已更新
    const setMessages = activeTab === "game" ? setGameMessages : setRealMessages;
    setMessages(prev => [...prev, { role: "system", content: "已更新魔搭与向量 API 配置，快问我问题试试吧！" }]);
  };

  const currentMessages = activeTab === "game" ? gameMessages : realMessages;

  return (
    <>
      {/* 悬浮按钮 */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-xl hover:bg-blue-700 transition-transform hover:scale-105 z-50 group"
          title="召唤建哥 (AI攻略助手)"
        >
          <MessageSquare size={24} />
          {/* 未读提示小红点 */}
          <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
        </button>
      )}

      {/* 聊天窗口 */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-80 md:w-96 h-[500px] max-h-[80vh] bg-[#1a1c23] border border-gray-700 rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden font-sans">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-900 to-indigo-900 border-b border-gray-700">
            <div className="flex items-center gap-2">
              <div className="bg-blue-500 p-1.5 rounded-full text-white">
                <Bot size={18} />
              </div>
              <div>
                <h3 className="text-white font-medium text-sm font-semibold">建哥 AI 军师</h3>
                <p className="text-blue-200 text-[10px] opacity-80">{activeTab === "game" ? "游戏攻略助手" : "真实人生顾问"}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setShowSettings(!showSettings)}
                className={`transition-colors p-1.5 rounded ${showSettings ? "bg-blue-800 text-white" : "text-blue-300 hover:text-white hover:bg-white/10"}`}
                title="设置 API Key"
              >
                <Settings size={16} />
              </button>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-gray-300 hover:text-white transition-colors p-1.5 rounded hover:bg-white/10"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Tab Selector */}
          <div className="flex border-b border-gray-750 bg-gray-900/60 font-sans text-xs shrink-0 select-none">
            <button
              onClick={() => setActiveTab("game")}
              className={`flex-1 py-2 text-center font-medium transition-colors ${
                activeTab === "game"
                  ? "text-blue-400 border-b-2 border-blue-500 bg-[#1a1c23]/40 font-semibold"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              🎮 游戏攻略
            </button>
            <button
              onClick={() => setActiveTab("real")}
              className={`flex-1 py-2 text-center font-medium transition-colors ${
                activeTab === "real"
                  ? "text-blue-400 border-b-2 border-blue-500 bg-[#1a1c23]/40 font-semibold"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              💼 现实避坑
            </button>
          </div>

          {/* Settings Overlay */}
          {showSettings && (
            <div className="absolute inset-0 top-[60px] bg-[#1a1c23]/95 backdrop-blur-sm z-10 p-5 flex flex-col font-sans overflow-y-auto scrollbar-thin">
              <div className="flex items-center gap-2 mb-4 text-blue-400">
                <Key size={18} />
                <h4 className="font-medium text-sm">配置大模型 (魔搭 & 向量)</h4>
              </div>
              <p className="text-[10px] text-gray-400 mb-4 leading-relaxed">
                为了实现20w字 RAG，我们使用魔搭进行文本生成，火山引擎进行向量化。配置仅保存在本地浏览器。
              </p>
              
              <div className="space-y-3 flex-1 text-left">
                {/* Qwen Key */}
                <div>
                  <label className="block text-[10px] text-gray-300 mb-1">魔搭 ModelScope API Key</label>
                  <input 
                    type="password"
                    value={qwenKeyInput}
                    onChange={e => setQwenKeyInput(e.target.value)}
                    placeholder="输入 ms-xxx API Key"
                    className="w-full bg-[#13141a] text-gray-200 text-xs rounded-lg py-2 px-3 border border-gray-700 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
                {/* Qwen Model */}
                <div>
                  <label className="block text-[10px] text-gray-300 mb-1">魔搭 Model ID</label>
                  <input 
                    type="text"
                    value={qwenModelInput}
                    onChange={e => setQwenModelInput(e.target.value)}
                    placeholder="例如 Qwen/Qwen3.5-35B-A3B"
                    className="w-full bg-[#13141a] text-gray-200 text-xs rounded-lg py-2 px-3 border border-gray-700 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
                {/* Qwen Base URL */}
                <div>
                  <label className="block text-[10px] text-gray-300 mb-1">魔搭 Base URL (可选)</label>
                  <input 
                    type="text"
                    value={qwenBaseUrlInput}
                    onChange={e => setQwenBaseUrlInput(e.target.value)}
                    placeholder="https://api-inference.modelscope.cn/v1"
                    className="w-full bg-[#13141a] text-gray-200 text-xs rounded-lg py-2 px-3 border border-gray-700 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
                
                <hr className="border-gray-700 my-2" />
                
                {/* Doubao Key */}
                <div>
                  <label className="block text-[10px] text-gray-300 mb-1">火山引擎 (豆包) API Key (用于向量)</label>
                  <input 
                    type="password"
                    value={doubaoApiKeyInput}
                    onChange={e => setDoubaoApiKeyInput(e.target.value)}
                    placeholder="输入 ark-xxx API Key"
                    className="w-full bg-[#13141a] text-gray-200 text-xs rounded-lg py-2 px-3 border border-gray-700 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
                {/* Doubao Embedding EP */}
                <div>
                  <label className="block text-[10px] text-gray-300 mb-1">火山引擎向量接入点 ID (EP-ID)</label>
                  <input 
                    type="text"
                    value={doubaoEmbeddingEpInput}
                    onChange={e => setDoubaoEmbeddingEpInput(e.target.value)}
                    placeholder="输入 ep-2026xxx 向量推理端点"
                    className="w-full bg-[#13141a] text-gray-200 text-xs rounded-lg py-2 px-3 border border-gray-700 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
                
                <hr className="border-gray-700 my-2" />
                
                {/* Importer tool */}
                <div className="bg-blue-950/20 border border-blue-900/40 rounded-lg p-3">
                  <span className="block text-[10px] font-semibold text-blue-400 mb-1">⚙️ 开发者工具 (向量库导入)</span>
                  <p className="text-[9px] text-gray-400 mb-2 leading-relaxed">
                    若本地终端因代理问题无法连接 Supabase，可在此处通过浏览器（借用浏览器系统代理环境）一键导入本地 SQL 向量文件。
                  </p>
                  <button
                    onClick={handleImportData}
                    disabled={isImporting}
                    className="w-full py-1.5 rounded bg-blue-700 hover:bg-blue-600 disabled:bg-gray-700 text-white text-xs font-medium transition-colors"
                  >
                    {isImporting ? "正在导入中..." : "一键导入本地 823 条向量"}
                  </button>
                  {importStatus && (
                    <p className="text-[9px] text-blue-300 mt-2 text-center break-all whitespace-pre-wrap">{importStatus}</p>
                  )}
                </div>
              </div>
              
              <div className="mt-4 pt-2 flex gap-3">
                <button 
                  onClick={() => setShowSettings(false)}
                  className="flex-1 py-2 rounded-lg text-xs bg-gray-700 text-gray-200 hover:bg-gray-600 transition-colors"
                >
                  取消
                </button>
                <button 
                  onClick={handleSaveSettings}
                  className="flex-1 py-2 rounded-lg text-xs bg-blue-600 text-white hover:bg-blue-500 transition-colors"
                >
                  保存配置
                </button>
              </div>
            </div>
          )}

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
            {currentMessages.map((msg, idx) => (
              <div key={idx} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${msg.role === "user" ? "bg-gray-700" : "bg-blue-600"}`}>
                  {msg.role === "user" ? <User size={16} className="text-gray-300" /> : <Bot size={16} className="text-white" />}
                </div>
                <div className="max-w-[75%] flex flex-col gap-1">
                  <div className={`rounded-2xl px-4 py-2 text-sm ${
                    msg.role === "user" 
                      ? "bg-gray-700 text-gray-100 rounded-tr-sm" 
                      : "bg-blue-900/40 border border-blue-800/50 text-gray-200 rounded-tl-sm"
                  }`}>
                    {renderMarkdown(msg.content)}
                  </div>

                  {/* Collapsible references panel */}
                  {msg.role === "assistant" && msg.retrievedSources && msg.retrievedSources.length > 0 && (
                    <details className="text-[10px] border border-gray-700 bg-gray-900/40 rounded-lg overflow-hidden transition-all duration-200 mt-1 max-w-full">
                      <summary className="cursor-pointer py-1 px-2 bg-gray-800/60 hover:bg-gray-800 text-blue-400 font-medium select-none flex items-center justify-between">
                        <span>📚 查阅了 {msg.retrievedSources.length} 篇参考资料</span>
                        <span className="text-[9px] text-gray-500 hover:text-gray-400">点击展开</span>
                      </summary>
                      <div className="p-2 space-y-1.5 max-h-32 overflow-y-auto text-gray-300 border-t border-gray-800 leading-relaxed scrollbar-thin">
                        {msg.retrievedSources.map((source, sIdx) => (
                          <div key={sIdx} className="bg-[#13141a]/60 p-1.5 rounded border border-gray-800/40 text-[10px]">
                            <div className="font-semibold text-blue-300 mb-0.5 flex items-center justify-between gap-2">
                              <span className="truncate">{source.title || "参考片段"}</span>
                              {source.similarity !== undefined && (
                                <span className="shrink-0 text-[8px] bg-blue-900/40 text-blue-400 px-1 py-0.2 rounded font-mono">
                                  匹配度: {(source.similarity * 100).toFixed(1)}%
                                </span>
                              )}
                            </div>
                            <p className="text-gray-450 leading-relaxed">{source.content.replace(/^【.*?】\n/, '')}</p>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3">
                <div className="shrink-0 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                  <Bot size={16} className="text-white" />
                </div>
                <div className="bg-blue-900/40 border border-blue-800/50 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
                  <Loader2 size={16} className="text-blue-400 animate-spin" />
                  <span className="text-xs text-gray-400">{loadingText}</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-3 bg-gray-800/50 border-t border-gray-700">
            <div className="relative flex items-center">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="问问这个机制啥意思..."
                className="w-full bg-[#13141a] text-gray-200 text-sm rounded-full py-3 pl-4 pr-12 border border-gray-700 focus:outline-none focus:border-blue-500 transition-colors"
                disabled={isLoading}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="absolute right-2 p-1.5 bg-blue-600 text-white rounded-full disabled:bg-gray-600 disabled:text-gray-400 transition-colors hover:bg-blue-500"
              >
                <Send size={16} className="ml-0.5" />
              </button>
            </div>
            <div className="text-center mt-2">
              <p className="text-[10px] text-gray-500">AI 学长可能胡说八道，仅供参考</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
