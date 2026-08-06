import React, { useState, useRef, useEffect } from "react";
import { X, Send, Bot, User, Loader2, Settings, Key, Monitor, MapPinned, BookOpenCheck, BriefcaseBusiness } from "lucide-react";
import { searchKnowledge, localSearch } from "../../lib/knowledgeBase";
import { askAssistant, ChatMessage } from "../../lib/llm";
import { ENABLE_DESKTOP_GAME_SIDEBAR } from "../gameUiFlags";

interface LocalChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
  retrievedSources?: any[];
}

interface AIAssistantProps {
  gameContext: any; // 传入当前的属性、进度等状态
  tutorialActive?: boolean;
}

export function AIAssistant({ gameContext, tutorialActive = false }: AIAssistantProps) {
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
  const [utilityNotice, setUtilityNotice] = useState<"computer" | "map" | null>(null);
  const [qwenKeyInput, setQwenKeyInput] = useState(() => localStorage.getItem("qwen_api_key") || "");
  const [qwenModelInput, setQwenModelInput] = useState(() => localStorage.getItem("qwen_model") || "");
  const [qwenBaseUrlInput, setQwenBaseUrlInput] = useState(() => localStorage.getItem("qwen_base_url") || "");
  const [doubaoApiKeyInput, setDoubaoApiKeyInput] = useState(() => localStorage.getItem("doubao_api_key") || "");
  const [doubaoEmbeddingEpInput, setDoubaoEmbeddingEpInput] = useState(() => localStorage.getItem("doubao_embedding_ep") || "");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 电脑端拉伸大小逻辑
  const [width, setWidth] = useState(460); // 默认电脑端宽度 460px
  const [height, setHeight] = useState(660); // 默认电脑端高度 660px
  const [isMobile, setIsMobile] = useState(true);
  const resizeRef = useRef<{ active: boolean; dir: "w" | "h" | "both"; startX: number; startY: number; startW: number; startH: number } | null>(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (!utilityNotice) return;
    const timer = window.setTimeout(() => setUtilityNotice(null), 2200);
    return () => window.clearTimeout(timer);
  }, [utilityNotice]);
  const handleMouseDown = (e: React.MouseEvent, dir: "w" | "h" | "both") => {
    e.preventDefault();
    resizeRef.current = {
      active: true,
      dir,
      startX: e.clientX,
      startY: e.clientY,
      startW: width,
      startH: height,
    };
    document.body.style.cursor = dir === "w" ? "ew-resize" : dir === "h" ? "ns-resize" : "nwse-resize";
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!resizeRef.current || !resizeRef.current.active) return;
    const { dir, startX, startY, startW, startH } = resizeRef.current;
    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;

    if (dir === "w" || dir === "both") {
      const newWidth = Math.max(340, Math.min(window.innerWidth * 0.9, startW - deltaX));
      setWidth(newWidth);
    }
    if (dir === "h" || dir === "both") {
      const newHeight = Math.max(450, Math.min(window.innerHeight * 0.9, startH - deltaY));
      setHeight(newHeight);
    }
  };

  const handleMouseUp = () => {
    if (resizeRef.current) {
      resizeRef.current.active = false;
    }
    document.body.style.cursor = "";
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  };

  useEffect(() => {
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  // 自动滚动到最新消息
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [gameMessages, realMessages, activeTab, isOpen]);

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
        retrievedChunks = localSearch(userQuery, 10);
      } else {
        setLoadingText("正在云端向量库检索避坑经验...");
        retrievedChunks = await searchKnowledge(userQuery, 10);
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
  const showUtilityEntrances = ["event_view", "action_choice", "action_result"].includes(gameContext?.phase);

  return (
    <>
      {/* 悬浮入口 */}
      {!isOpen && (
        <div className={`fixed bottom-4 right-4 flex items-end gap-2.5 sm:bottom-6 sm:right-6 ${tutorialActive ? "z-[221] rounded-full ring-2 ring-[#dec678]/80 shadow-[0_0_0_8px_rgba(201,168,76,0.08)]" : "z-50"}`}>
          {utilityNotice && (
            <div className="absolute bottom-[calc(100%+12px)] right-0 whitespace-nowrap rounded-lg border border-white/10 bg-[#0b1020]/95 px-3 py-2 text-xs text-slate-200 shadow-xl backdrop-blur-md">
              {utilityNotice === "computer" ? "电脑功能正在规划中" : "地图功能正在规划中"}
            </div>
          )}

          {showUtilityEntrances && (
            <>
              <button
                type="button"
                onClick={() => setUtilityNotice("computer")}
                className={`${ENABLE_DESKTOP_GAME_SIDEBAR ? "flex lg:hidden" : "flex"} group relative h-12 w-12 items-center justify-center rounded-full border border-[#c9a84c]/45 bg-[#0b1020]/90 text-[#d8bd69] shadow-lg backdrop-blur-md transition-all hover:-translate-y-1 hover:border-[#c9a84c]/80 hover:bg-[#171a22]`}
                aria-label="电脑（功能开发中）"
                title="电脑（功能开发中）"
              >
                <Monitor size={21} strokeWidth={1.8} />
                <span className="pointer-events-none absolute bottom-full mb-2 rounded bg-black/80 px-2 py-1 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">电脑</span>
              </button>
              <button
                type="button"
                onClick={() => setUtilityNotice("map")}
                className={`${ENABLE_DESKTOP_GAME_SIDEBAR ? "flex lg:hidden" : "flex"} group relative h-12 w-12 items-center justify-center rounded-full border border-blue-400/40 bg-[#0b1020]/90 text-blue-300 shadow-lg backdrop-blur-md transition-all hover:-translate-y-1 hover:border-blue-300/75 hover:bg-[#111a2b]`}
                aria-label="地图（功能开发中）"
                title="地图（功能开发中）"
              >
                <MapPinned size={21} strokeWidth={1.8} />
                <span className="pointer-events-none absolute bottom-full mb-2 rounded bg-black/80 px-2 py-1 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">地图</span>
              </button>
            </>
          )}

          <button
            onClick={() => setIsOpen(true)}
            className="group relative flex h-14 w-14 items-center justify-center rounded-full border border-blue-300/35 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 text-white shadow-[0_12px_32px_rgba(37,99,235,0.42)] transition-all duration-300 hover:-translate-y-1 hover:scale-105 hover:shadow-[0_16px_38px_rgba(37,99,235,0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#070c17]"
            title="召唤建哥 (AI攻略助手)"
            aria-label="召唤建哥，AI 助手在线"
          >
            <span className="absolute inset-1 rounded-full border border-white/10 transition-transform duration-500 group-hover:rotate-6" />
            <Bot size={27} strokeWidth={1.9} className="relative z-10 transition-transform duration-300 group-hover:scale-110" />
            <span className="absolute right-0 top-0 flex h-3.5 w-3.5" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-55" />
              <span className="relative inline-flex h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)]" />
            </span>
          </button>
        </div>
      )}

      {/* 聊天窗口 */}
      {isOpen && (
        <div 
          className="fixed bottom-6 right-6 w-80 h-[500px] max-h-[80vh] md:w-auto md:h-auto md:max-h-[90vh] bg-[#1a1c23] border border-gray-700 rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden font-sans"
          style={isMobile ? undefined : { width: `${width}px`, height: `${height}px`, maxWidth: "90vw" }}
        >
          {/* 电脑端拉伸大小手柄 */}
          {!isMobile && (
            <>
              {/* 左边缘拉伸 */}
              <div 
                className="absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize hover:bg-blue-500/20 z-50 transition-colors" 
                onMouseDown={e => handleMouseDown(e, "w")}
              />
              {/* 上边缘拉伸 */}
              <div 
                className="absolute top-0 left-0 right-0 h-1.5 cursor-ns-resize hover:bg-blue-500/20 z-50 transition-colors" 
                onMouseDown={e => handleMouseDown(e, "h")}
              />
              {/* 左上角对角线拉伸 */}
              <div 
                className="absolute top-0 left-0 w-3 h-3 cursor-nwse-resize hover:bg-blue-500/30 z-50 transition-colors" 
                onMouseDown={e => handleMouseDown(e, "both")}
              />
            </>
          )}
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
              className={`flex flex-1 items-center justify-center gap-2 py-2 font-medium transition-colors ${
                activeTab === "game"
                  ? "text-blue-400 border-b-2 border-blue-500 bg-[#1a1c23]/40 font-semibold"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              <BookOpenCheck size={16} strokeWidth={1.8} aria-hidden="true" />
              <span>游戏攻略</span>
            </button>
            <button
              onClick={() => setActiveTab("real")}
              className={`flex flex-1 items-center justify-center gap-2 py-2 font-medium transition-colors ${
                activeTab === "real"
                  ? "text-blue-400 border-b-2 border-blue-500 bg-[#1a1c23]/40 font-semibold"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              <BriefcaseBusiness size={16} strokeWidth={1.8} aria-hidden="true" />
              <span>现实避坑</span>
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
                随机事件 AI 只需填写魔搭 API Key，模型和 Base URL 留空即可使用默认值。火山引擎仅用于现实知识库检索。配置只保存在本地浏览器。
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
                  <label className="block text-[10px] text-gray-300 mb-1">魔搭 Model ID（可选）</label>
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
