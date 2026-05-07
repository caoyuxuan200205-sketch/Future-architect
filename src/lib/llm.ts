import { KnowledgeChunk } from "./knowledgeBase";

// 这是一个简易的 LLM 调用服务，已配置兼容火山引擎(豆包) API 格式
// 在实际部署中，API Key 不应该硬编码在前端，这里仅作演示
// 你可以在根目录创建 .env 文件并配置 VITE_DOUBAO_API_KEY 和 VITE_DOUBAO_MODEL_EP

// 动态获取 API_KEY 和 MODEL
function getConfig() {
  const customKey = localStorage.getItem("doubao_api_key");
  const customModel = localStorage.getItem("doubao_model_ep");
  
  return {
    apiKey: customKey || import.meta.env.VITE_DOUBAO_API_KEY || "",
    model: customModel || import.meta.env.VITE_DOUBAO_MODEL_EP || "",
    baseUrl: import.meta.env.VITE_DOUBAO_BASE_URL || "https://ark.cn-beijing.volces.com/api/v3"
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
  chatHistory: ChatMessage[] = []
): Promise<string> {
  const { apiKey, model, baseUrl } = getConfig();

  if (!apiKey || !model) {
    return "系统提示：您尚未配置火山引擎（豆包）的 API Key 或接入点 ID。请点击右上角设置图标进行配置。但在正常情况下，我会根据以下知识回答您：\n" + 
           knowledgeContext.map(k => `- ${k.content}`).join("\n");
  }

  const systemPrompt = `
你是一个名为"建哥"的资深产品经理/前建筑学长。你现在是《我是一个"建"人》转行模拟器游戏里的专属AI攻略助手。
你的任务是根据提供的【游戏知识库】和玩家当前的【游戏状态】来回答玩家的疑问。
语气要像一个懂行、接地气、有点毒舌但很关心学弟学妹的学长。经常用些互联网黑话或者建筑圈的自嘲。

【当前玩家状态】
${JSON.stringify(gameContext, null, 2)}

【检索到的相关游戏机制】
${knowledgeContext.map(k => k.content).join("\n")}

请结合以上信息，简明扼要地回答玩家的问题。如果检索到的信息中没有答案，请委婉地表示游戏机制里似乎没有明确规定，或者根据常理给出建议。
绝不捏造游戏里不存在的属性和机制。
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
        max_tokens: 800
      })
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error("LLM API calling failed:", error);
    return "哎呀，学长的脑机接口好像断线了（API调用失败）。你再试一次或者检查下网络和API配置？";
  }
}
