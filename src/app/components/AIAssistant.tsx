import React, { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Bot, User, Loader2, Settings, Key } from "lucide-react";
import { searchKnowledge } from "../../lib/knowledgeBase";
import { askAssistant, ChatMessage } from "../../lib/llm";

interface AIAssistantProps {
  gameContext: any; // 传入当前的属性、进度等状态
}

export function AIAssistant({ gameContext }: AIAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: "哈喽！我是建哥，你的转行领路人。有什么不懂的机制或者选错的坑，都可以问我。" }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(() => localStorage.getItem("doubao_api_key") || "");
  const [modelInput, setModelInput] = useState(() => localStorage.getItem("doubao_model_ep") || "");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 自动滚动到最新消息
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userQuery = input.trim();
    setInput("");
    
    // 更新本地聊天记录
    const newMessages: ChatMessage[] = [...messages, { role: "user", content: userQuery }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      // 1. RAG 检索知识库
      const retrievedChunks = searchKnowledge(userQuery, 3);
      
      // 2. 截取最近的几条历史记录传给大模型，避免上下文过长
      const chatHistoryForLLM = newMessages.slice(-5);

      // 3. 请求大模型
      const response = await askAssistant(userQuery, retrievedChunks, gameContext, chatHistoryForLLM);
      
      setMessages(prev => [...prev, { role: "assistant", content: response }]);
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
    localStorage.setItem("doubao_api_key", apiKeyInput.trim());
    localStorage.setItem("doubao_model_ep", modelInput.trim());
    setShowSettings(false);
    
    // 如果之前有关于未配置的提示，可以用一条新消息告知已更新
    setMessages(prev => [...prev, { role: "system", content: "已更新 API 配置，快问我问题试试吧！" }]);
  };

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
                <h3 className="text-white font-medium text-sm">建哥 AI</h3>
                <p className="text-blue-200 text-xs opacity-80">游戏攻略 & 陪聊</p>
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

          {/* Settings Overlay */}
          {showSettings && (
            <div className="absolute inset-0 top-[60px] bg-[#1a1c23]/95 backdrop-blur-sm z-10 p-5 flex flex-col font-sans">
              <div className="flex items-center gap-2 mb-4 text-blue-400">
                <Key size={18} />
                <h4 className="font-medium text-sm">配置你自己的大模型 (豆包)</h4>
              </div>
              <p className="text-xs text-gray-400 mb-4 leading-relaxed">
                为了数据安全与稳定，请填写你自己的火山引擎(豆包) API 信息。这些信息将仅保存在你的浏览器本地。
              </p>
              
              <div className="space-y-4 flex-1">
                <div>
                  <label className="block text-xs text-gray-300 mb-1.5">API Key (例如: ark-...)</label>
                  <input 
                    type="password"
                    value={apiKeyInput}
                    onChange={e => setApiKeyInput(e.target.value)}
                    placeholder="输入你的 API Key"
                    className="w-full bg-[#13141a] text-gray-200 text-xs rounded-lg py-2.5 px-3 border border-gray-700 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-300 mb-1.5">推理接入点 ID (例如: ep-...)</label>
                  <input 
                    type="text"
                    value={modelInput}
                    onChange={e => setModelInput(e.target.value)}
                    placeholder="输入 Endpoint ID"
                    className="w-full bg-[#13141a] text-gray-200 text-xs rounded-lg py-2.5 px-3 border border-gray-700 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>
              
              <div className="mt-auto pt-4 flex gap-3">
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
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${msg.role === "user" ? "bg-gray-700" : "bg-blue-600"}`}>
                  {msg.role === "user" ? <User size={16} className="text-gray-300" /> : <Bot size={16} className="text-white" />}
                </div>
                <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                  msg.role === "user" 
                    ? "bg-gray-700 text-gray-100 rounded-tr-sm" 
                    : "bg-blue-900/40 border border-blue-800/50 text-gray-200 rounded-tl-sm whitespace-pre-wrap"
                }`}>
                  {msg.content}
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
                  <span className="text-xs text-gray-400">建哥正在翻阅攻略...</span>
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
