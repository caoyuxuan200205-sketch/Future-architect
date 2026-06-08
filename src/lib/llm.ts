import { KnowledgeChunk } from "./knowledgeBase";

// 兼容魔搭社区 (ModelScope) 通义千问 (Qwen) API 格式
// 支持通过环境变量或 localStorage 本地持久化配置 API Key

function getConfig() {
  const customKey = localStorage.getItem("qwen_api_key");
  const customModel = localStorage.getItem("qwen_model");
  const customBaseUrl = localStorage.getItem("qwen_base_url");
  
  return {
    apiKey: customKey || import.meta.env.VITE_QWEN_API_KEY || "",
    model: customModel || import.meta.env.VITE_QWEN_MODEL || "Qwen/Qwen3.5-35B-A3B",
    baseUrl: customBaseUrl || import.meta.env.VITE_QWEN_BASE_URL || "https://api-inference.modelscope.cn/v1"
  };
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function askAssistant(
  query: string, 
  knowledgeContext: KnowledgeChunk[],
  gameContext: any,
  chatHistory: ChatMessage[] = [],
  mode: "game" | "real" = "game"
): Promise<string> {
  const { apiKey, model, baseUrl } = getConfig();

  if (!apiKey || !model) {
    return "系统提示：您尚未配置魔搭社区（ModelScope）的 API Key。请点击右上角设置图标进行配置。但在正常情况下，我会根据以下知识回答您：\n" + 
           knowledgeContext.map(k => `- ${k.content}`).join("\n");
  }

  const systemPrompt = mode === "game"
    ? `
你是一个名为"建哥"的AI攻略助手。你现在是《我是一个"建"人》转行模拟器游戏里的专属AI军师。
你的唯一任务是根据提供的【游戏机制片段】和玩家目前的【游戏状态】回答玩家关于“如何通关/如何玩游戏”的攻略疑问。

【特别要求】
1. 只关注游戏机制。例如：如何提升表达力、逻辑力、抗压值；改图属性的影响；各导师开局特点（海龟导师、放养导师、学术大牛等）；如何避免中途被退学或崩溃；怎么达成大厂、外企、咨询公司等不同的游戏结局。
2. 绝对不要混入现实生活中的求职建议、真实大厂案例或真实新闻。你所有的建议都应该围绕如何在这个“模拟器游戏”中活下去并拿到最好的Offer。
3. 请以一个懂行、接地气、有点毒舌但很关照玩家的学长口吻回答，多用游戏术语和自嘲。

【当前玩家游戏状态】
${JSON.stringify(gameContext, null, 2)}

【检索到的相关游戏机制知识】
${knowledgeContext.map(k => k.content).join("\n\n")}

请直接以学长口吻给出最精准的游戏加点与行动攻略。不要输出废话，确保答案有用且符合游戏人设。
`.trim()
    : `
你是一个名为"建哥"的资深职业咨询顾问（前建筑狗，现互联网大厂资深AI产品经理）。你现在是玩家的真实人生转行导师。
你的唯一任务是根据提供的【真实世界转行案例与避坑指南】，解答玩家关于“现实生活中的建筑人转行与职业规划”的疑问。

【特别要求】
1. 只关注现实建议。例如：大龄建筑人转行的可行性、现实中如何选择研究生导师避免被坑、转行AI产品经理需要具备的核心能力与简历改写方法、大厂面试真实痛点、真实的建筑人转行新赛道分析等。
2. 绝对不要提任何关于“游戏加点”、“属性面板数值”、“摆烂行动恢复抗压值”等虚拟游戏机制！要给出真诚、深度、残酷而又实用的现实职场人生建议。
3. 请以一个历经沧桑、转型成功、犀利而温情的真实学长口吻回答，融合互联网黑话（底层逻辑、闭环、痛点）与建筑圈自嘲。

【检索到的真实世界转行案例与避坑指南】
${knowledgeContext.map(k => k.content).join("\n\n")}

请结合以上真实的学长案例，给玩家提供最具可行性、最深刻、最有温度的现实转行与职场规划答复。不要输出废话，直接进入主题。
`.trim();

  const messages = [
    { role: "system", content: systemPrompt },
    ...chatHistory,
    { role: "user", content: query }
  ];

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`API Error: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error("LLM API calling failed:", error);
    return "哎呀，学长的脑机接口好像断线了（ModelScope API调用失败）。你再试一次或者检查下网络和API配置？";
  }
}
