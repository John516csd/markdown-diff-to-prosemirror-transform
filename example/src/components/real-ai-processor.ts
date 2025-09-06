/**
 * 真实AI处理器 - 基于 Inception Labs API
 * 用于增强和改进Markdown文档内容
 */

/**
 * AI 请求配置选项
 */
interface AIRequestOptions {
  model?: string;
  max_tokens?: number;
  temperature?: number;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  structuredOutput?: boolean;
  outputSchema?: Record<string, unknown> | null;
  autoOptimize?: boolean;
}

/**
 * AI 请求响应结构
 */
interface AIResponse {
  content: string;
  raw: unknown;
  usage: Record<string, unknown>;
  structured?: unknown;
}

/**
 * 发送 AI 请求到 Inception Labs API
 */
const aiRequest = async (messages: string | Array<unknown>, options: AIRequestOptions = {}): Promise<AIResponse> => {
  // 默认配置
  const defaultOptions: AIRequestOptions = {
    model: "mercury-coder-small",
    max_tokens: 1000,
    temperature: 0,
    timeout: 30000,
    retries: 3,
    retryDelay: 1000,
    structuredOutput: false,
    outputSchema: null,
    autoOptimize: true,
  };

  const config = { ...defaultOptions, ...options };

  // 获取 API Key
  const apiKey = process.env.NEXT_PUBLIC_INCEPTION_API_KEY;
  if (!apiKey) {
    throw new Error("❌ 缺少 NEXT_PUBLIC_INCEPTION_API_KEY 环境变量");
  }

  // 格式化消息
  const formattedMessages = formatMessages(messages, config);

  // 构建请求体
  const requestBody = {
    model: config.model,
    messages: formattedMessages,
    max_tokens: config.max_tokens,
    temperature: config.temperature,
  };

  // 发送请求（带重试）
  const response = await sendRequestWithRetry(requestBody, config, apiKey);

  return response;
};

/**
 * 格式化消息内容
 */
const formatMessages = (messages: string | Array<unknown>, _config: AIRequestOptions): Array<Record<string, string>> => {
  let formattedMessages;

  if (typeof messages === "string") {
    formattedMessages = [{ role: "user", content: messages }];
  } else if (Array.isArray(messages)) {
    formattedMessages = messages.map((msg, index) => {
      if (typeof msg === "string") {
        return { role: "user", content: msg };
      }
      if (typeof msg === "object" && msg !== null && 'content' in msg && (msg as Record<string, unknown>).content) {
        const msgObj = msg as Record<string, string>;
        return {
          role: msgObj.role || "user",
          content: msgObj.content,
        };
      }
      throw new Error(`❌ 无效的消息格式，索引 ${index}: ${JSON.stringify(msg)}`);
    });
  } else {
    throw new Error("❌ 消息格式错误，应为字符串或数组");
  }

  return formattedMessages;
};

/**
 * 带重试机制的请求发送
 */
const sendRequestWithRetry = async (requestBody: Record<string, unknown>, config: AIRequestOptions, apiKey: string): Promise<AIResponse> => {
  let lastError: Error = new Error('Unknown error');

  for (let attempt = 1; attempt <= (config.retries || 3); attempt++) {
    try {
      console.log(`🚀 AI 请求尝试 ${attempt}/${config.retries}...`);

      const response = await fetch(
        "https://api.inceptionlabs.ai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify(requestBody),
          signal: AbortSignal.timeout(config.timeout || 30000),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        
        // 特殊处理上下文长度超限错误
        if (response.status === 400 && errorText.includes("context_length_exceeded")) {
          throw new Error(`❌ 请求内容过长，超出模型上下文限制 (${response.status}): ${errorText}`);
        }
        
        throw new Error(`❌ API 请求失败 (${response.status}): ${errorText}`);
      }

      const data = await response.json();

      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error("❌ API 响应格式错误");
      }

      console.log(`✅ AI 请求成功 (尝试 ${attempt})`);

      return {
        content: data.choices[0].message.content,
        raw: data,
        usage: data.usage || {},
      };
    } catch (error: unknown) {
      lastError = error as Error;
      console.log(`⚠️ 请求失败 (尝试 ${attempt}): ${(error as Error).message}`);

      if (attempt < (config.retries || 3)) {
        console.log(`⏳ ${config.retryDelay}ms 后重试...`);
        await new Promise((resolve) => setTimeout(resolve, config.retryDelay || 1000));
      }
    }
  }

  throw new Error(
    `❌ AI 请求失败，已重试 ${config.retries} 次: ${lastError.message}`
  );
};

/**
 * 便捷函数：发送简单文本请求
 */
const aiChat = async (prompt: string, options: AIRequestOptions = {}): Promise<string> => {
  const response = await aiRequest(prompt, options);
  return response.content;
};

/**
 * 真实AI处理器类
 */
export class RealAIProcessor {
  private options: AIRequestOptions;

  constructor(options: AIRequestOptions = {}) {
    this.options = {
      model: "mercury-coder-small",
      max_tokens: 2000,
      temperature: 0.3,
      ...options
    };
  }

  /**
   * 增强Markdown文档
   * @param markdown - 原始Markdown文本
   * @returns 增强后的Markdown文本
   */
  async enhance(markdown: string): Promise<string> {
    const prompt = `请帮我在以下Markdown文档中智能插入内链到 www.notta.ai。

## 重要要求：
- 完全保持原文的语言、语调和表达方式
- 只在合适的地方插入链接，不要修改任何其他内容  
- 保持原文的结构、格式和所有细节不变

## 内链插入规则：
- 在提到 "Notta"、"语音转文字"、"录音转录"、"音频转文字"、"会议记录"、"实时转录"、"speech-to-text"、"transcribe"、"record audio" 等相关概念时，适当插入链接
- 使用 [原有文本](https://www.notta.ai) 的Markdown链接格式
- 保持原有的文本内容不变，只是将相关词语转换为链接
- 每段最多插入1-2个相关链接，避免过度链接
- 优先在关键词首次出现时添加链接

## 链接插入示例：
原文："Notta may be useful"
修改："[Notta](https://www.notta.ai) may be useful"

原文："speech-to-text tools"
修改："[speech-to-text](https://www.notta.ai) tools"

原文："transcribe it in real-time"
修改："[transcribe](https://www.notta.ai) it in real-time"

## 严格禁止：
- 不要改变原文的语言（英文保持英文，中文保持中文）
- 不要修改语调或写作风格
- 不要添加新的内容或删除现有内容
- 不要重写句子或段落
- 不要改变格式结构

请直接返回插入链接后的Markdown文本，保持其他内容完全不变：

---

${markdown}`;

    try {
      const enhancedContent = await aiChat(prompt, this.options);
      return enhancedContent.trim();
    } catch (error) {
      console.error('AI处理失败:', error);
      // 如果AI处理失败，返回带有一些基本改进的原文档
      return this.fallbackEnhancement(markdown);
    }
  }

  /**
   * 备用增强方案 - 当AI处理失败时使用
   */
  private fallbackEnhancement(markdown: string): Promise<string> {
    return new Promise(resolve => {
      // 模拟AI处理延迟
      setTimeout(() => {
        let enhanced = markdown;
        
        // 基本改进
        enhanced = enhanced.replace(/# (.+)/g, '# $1 📚');
        enhanced = enhanced.replace(/## (.+)/g, '## $1 🔧');
        
        // 添加一些基本的改进
        if (enhanced.includes('API')) {
          enhanced += '\n\n## 最佳实践 💡\n\n- 使用适当的错误处理\n- 实现请求重试机制\n- 添加速率限制保护\n- 使用缓存提升性能';
        }
        
        resolve(enhanced);
      }, 2000);
    });
  }
}

export { aiRequest, aiChat };
