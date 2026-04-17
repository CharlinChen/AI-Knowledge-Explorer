import type OpenAI from 'openai';
import type { Stream } from 'openai/streaming';
import type { KnowledgePage } from './pageStore.js';

export interface IntentClassification {
  action: 'new_page' | 'append' | 'modify';
  confidence: number;
  reasoning: string;
}

export interface GeneratedPage {
  title: string;
  content: string;
  summary: string;
}

export interface LLMClient {
  chat: {
    completions: {
      create(params: OpenAI.ChatCompletionCreateParamsNonStreaming): Promise<OpenAI.ChatCompletion>;
      create(params: OpenAI.ChatCompletionCreateParamsStreaming): Promise<Stream<OpenAI.ChatCompletionChunk>>;
    };
  };
}

const MARKED_TERM_INSTRUCTION = `在生成的 HTML 内容中，将重要的专有名词、技术术语或关键概念用以下格式标记：
<span class="marked-term" data-term="术语名">术语名</span>
确保 data-term 属性的值与标签内的文本内容一致。每个术语只需标记第一次出现。`;

export class LLMService {
  private client: LLMClient;
  private model: string;

  constructor(client: LLMClient, model: string = 'gpt-4o') {
    this.client = client;
    this.model = model;
  }

  private getLanguageInstruction(lang?: string): string {
    const targetLang = lang || 'zh-CN';
    return `你必须使用 ${targetLang} 语言生成所有内容（包括标题、正文和摘要）。`;
  }

  async generatePage(question: string, lang?: string): Promise<GeneratedPage> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: 'system',
          content: `你是一个知识百科助手。用户会提出一个问题或主题，你需要生成一个结构化的知识页面。

${this.getLanguageInstruction(lang)}

要求：
1. 返回 JSON 格式，包含 title、content 和 summary 三个字段
2. title: 简洁的页面标题
3. content: HTML 格式的详细内容，使用 <h2>、<p>、<ul>、<ol> 等标签组织内容
4. summary: 一句话摘要（不超过100字）
5. ${MARKED_TERM_INSTRUCTION}

返回格式示例：
{"title":"机器学习","content":"<h2>概述</h2><p>...</p>","summary":"机器学习是..."}

只返回 JSON，不要包含 markdown 代码块标记。`,
        },
        { role: 'user', content: question },
      ],
    });

    return this.parseGeneratedPage(response);
  }

  async generatePageByTerm(term: string, lang?: string): Promise<GeneratedPage> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: 'system',
          content: `你是一个知识百科助手。用户点击了一个专有名词链接，你需要为该术语生成一个结构化的知识页面。

${this.getLanguageInstruction(lang)}

**重要：页面标题（title 字段）必须严格等于用户提供的术语原文："${term}"，不得修改、翻译或扩展。**

要求：
1. 返回 JSON 格式，包含 title、content 和 summary 三个字段
2. title: 必须严格等于 "${term}"
3. content: HTML 格式的详细内容，使用 <h2>、<p>、<ul>、<ol> 等标签组织内容
4. summary: 一句话摘要（不超过100字）
5. ${MARKED_TERM_INSTRUCTION}

返回格式示例：
{"title":"${term}","content":"<h2>概述</h2><p>...</p>","summary":"..."}

只返回 JSON，不要包含 markdown 代码块标记。`,
        },
        { role: 'user', content: term },
      ],
    });

    return this.parseGeneratedPage(response);
  }

  async generateAppendContent(currentPage: KnowledgePage, question: string, lang?: string): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: 'system',
          content: `你是一个知识百科助手。用户正在阅读一个知识页面，并提出了追问。你需要生成补充内容追加到当前页面。

${this.getLanguageInstruction(lang)}

当前页面标题：${currentPage.title}
当前页面摘要：${currentPage.summary}

要求：
1. 只返回需要追加的 HTML 内容片段（不包含完整页面结构）
2. 内容应与当前页面主题相关
3. ${MARKED_TERM_INSTRUCTION}
4. 直接返回 HTML 内容，不要包含 JSON 或 markdown 标记`,
        },
        { role: 'user', content: question },
      ],
    });

    const content = response.choices[0]?.message?.content?.trim();
    if (!content) {
      throw new Error('LLM returned empty content for append operation');
    }
    return content;
  }

  async generateModifiedContent(currentPage: KnowledgePage, instruction: string, lang?: string): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: 'system',
          content: `你是一个知识百科助手。用户要求修改当前知识页面的内容。请根据用户的指令生成修改后的完整页面内容。

${this.getLanguageInstruction(lang)}

当前页面标题：${currentPage.title}
当前页面内容：
${currentPage.content}

要求：
1. 根据用户指令修改内容，返回修改后的完整 HTML 内容
2. 保持页面的整体结构和格式
3. ${MARKED_TERM_INSTRUCTION}
4. 直接返回修改后的完整 HTML 内容，不要包含 JSON 或 markdown 标记`,
        },
        { role: 'user', content: instruction },
      ],
    });

    const content = response.choices[0]?.message?.content?.trim();
    if (!content) {
      throw new Error('LLM returned empty content for modify operation');
    }
    return content;
  }

  async classifyIntent(message: string, currentPage?: KnowledgePage): Promise<IntentClassification> {
    if (!currentPage) {
      return { action: 'new_page', confidence: 1.0, reasoning: 'No current page context' };
    }

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: 'system',
          content: `你是一个意图分类器。根据用户消息和当前页面上下文，判断用户的意图。

当前页面标题：${currentPage.title}
当前页面摘要：${currentPage.summary}

意图类型：
- "new_page": 用户想了解一个与当前页面无关的新主题
- "append": 用户想对当前页面主题进行追问或补充
- "modify": 用户想修改当前页面的内容（如纠正错误、调整格式、增删某段内容）

返回 JSON 格式：{"action":"new_page|append|modify","confidence":0.0-1.0,"reasoning":"判断理由"}
只返回 JSON，不要包含 markdown 代码块标记。`,
        },
        { role: 'user', content: message },
      ],
    });

    return this.parseIntentClassification(response);
  }

  private parseGeneratedPage(response: OpenAI.ChatCompletion): GeneratedPage {
    const raw = response.choices[0]?.message?.content?.trim();
    if (!raw) {
      throw new Error('LLM returned empty response for page generation');
    }

    try {
      const parsed = JSON.parse(raw);
      const title = parsed.title;
      const content = parsed.content;
      const summary = parsed.summary;

      if (!title || !content || !summary) {
        throw new Error('Missing required fields in LLM response');
      }

      return { title: String(title), content: String(content), summary: String(summary) };
    } catch (e) {
      if (e instanceof SyntaxError) {
        throw new Error(`Failed to parse LLM response as JSON: ${raw.substring(0, 200)}`);
      }
      throw e;
    }
  }

  private parseIntentClassification(response: OpenAI.ChatCompletion): IntentClassification {
    const raw = response.choices[0]?.message?.content?.trim();
    if (!raw) {
      return { action: 'new_page', confidence: 0.5, reasoning: 'Empty LLM response, defaulting to new_page' };
    }

    try {
      const parsed = JSON.parse(raw);
      const action = parsed.action;
      if (action !== 'new_page' && action !== 'append' && action !== 'modify') {
        return { action: 'new_page', confidence: 0.5, reasoning: `Invalid action "${action}", defaulting to new_page` };
      }

      return {
        action,
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
        reasoning: typeof parsed.reasoning === 'string' ? parsed.reasoning : '',
      };
    } catch {
      return { action: 'new_page', confidence: 0.5, reasoning: `Failed to parse intent, defaulting to new_page` };
    }
  }

  async generatePageMeta(question: string, lang?: string): Promise<{ title: string; summary: string }> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: 'system',
          content: `你是一个知识百科助手。用户会提出一个问题或主题，你需要为即将生成的知识页面提供标题和摘要。

${this.getLanguageInstruction(lang)}

要求：
1. 返回 JSON 格式，包含 title 和 summary 两个字段
2. title: 简洁的页面标题
3. summary: 一句话摘要（不超过100字）

返回格式示例：
{"title":"机器学习","summary":"机器学习是..."}

只返回 JSON，不要包含 markdown 代码块标记。`,
        },
        { role: 'user', content: question },
      ],
    });

    const raw = response.choices[0]?.message?.content?.trim();
    if (!raw) throw new Error('LLM returned empty response for page meta');
    const parsed = JSON.parse(raw);
    if (!parsed.title || !parsed.summary) throw new Error('Missing title or summary in meta response');
    return { title: String(parsed.title), summary: String(parsed.summary) };
  }

  async *generatePageContentStream(question: string, title: string, lang?: string): AsyncIterable<string> {
    const stream = await this.client.chat.completions.create({
      model: this.model,
      stream: true,
      messages: [
        {
          role: 'system',
          content: `你是一个知识百科助手。用户会提出一个问题或主题，你需要生成知识页面的 HTML 内容。

${this.getLanguageInstruction(lang)}

页面标题：${title}

要求：
1. 直接返回 HTML 格式的详细内容，使用 <h2>、<p>、<ul>、<ol> 等标签组织内容
2. ${MARKED_TERM_INSTRUCTION}
3. 不要包含 JSON 包装，不要包含 markdown 代码块标记，直接输出 HTML`,
        },
        { role: 'user', content: question },
      ],
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) yield delta;
    }
  }

  async generatePageByTermMeta(term: string, lang?: string): Promise<{ title: string; summary: string }> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: 'system',
          content: `你是一个知识百科助手。用户点击了一个专有名词链接，你需要为该术语提供摘要。

${this.getLanguageInstruction(lang)}

**重要：页面标题必须严格等于用户提供的术语原文："${term}"，不得修改、翻译或扩展。**

要求：
1. 返回 JSON 格式，包含 title 和 summary 两个字段
2. title: 必须严格等于 "${term}"
3. summary: 一句话摘要（不超过100字）

返回格式示例：
{"title":"${term}","summary":"..."}

只返回 JSON，不要包含 markdown 代码块标记。`,
        },
        { role: 'user', content: term },
      ],
    });

    const raw = response.choices[0]?.message?.content?.trim();
    if (!raw) throw new Error('LLM returned empty response for term meta');
    const parsed = JSON.parse(raw);
    return { title: String(parsed.title || term), summary: String(parsed.summary || '') };
  }

  async *generatePageByTermContentStream(term: string, lang?: string): AsyncIterable<string> {
    const stream = await this.client.chat.completions.create({
      model: this.model,
      stream: true,
      messages: [
        {
          role: 'system',
          content: `你是一个知识百科助手。用户点击了一个专有名词链接，你需要为该术语生成知识页面的 HTML 内容。

${this.getLanguageInstruction(lang)}

术语：${term}

要求：
1. 直接返回 HTML 格式的详细内容，使用 <h2>、<p>、<ul>、<ol> 等标签组织内容
2. ${MARKED_TERM_INSTRUCTION}
3. 不要包含 JSON 包装，不要包含 markdown 代码块标记，直接输出 HTML`,
        },
        { role: 'user', content: term },
      ],
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) yield delta;
    }
  }

  async *generateAppendContentStream(currentPage: KnowledgePage, question: string, lang?: string): AsyncIterable<string> {
    const stream = await this.client.chat.completions.create({
      model: this.model,
      stream: true,
      messages: [
        {
          role: 'system',
          content: `你是一个知识百科助手。用户正在阅读一个知识页面，并提出了追问。你需要生成补充内容追加到当前页面。

${this.getLanguageInstruction(lang)}

当前页面标题：${currentPage.title}
当前页面摘要：${currentPage.summary}

要求：
1. 只返回需要追加的 HTML 内容片段（不包含完整页面结构）
2. 内容应与当前页面主题相关
3. ${MARKED_TERM_INSTRUCTION}
4. 直接返回 HTML 内容，不要包含 JSON 或 markdown 标记`,
        },
        { role: 'user', content: question },
      ],
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) yield delta;
    }
  }

  async *generateModifiedContentStream(currentPage: KnowledgePage, instruction: string, lang?: string): AsyncIterable<string> {
    const stream = await this.client.chat.completions.create({
      model: this.model,
      stream: true,
      messages: [
        {
          role: 'system',
          content: `你是一个知识百科助手。用户要求修改当前知识页面的内容。请根据用户的指令生成修改后的完整页面内容。

${this.getLanguageInstruction(lang)}

当前页面标题：${currentPage.title}
当前页面内容：
${currentPage.content}

要求：
1. 根据用户指令修改内容，返回修改后的完整 HTML 内容
2. 保持页面的整体结构和格式
3. ${MARKED_TERM_INSTRUCTION}
4. 直接返回修改后的完整 HTML 内容，不要包含 JSON 或 markdown 标记`,
        },
        { role: 'user', content: instruction },
      ],
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) yield delta;
    }
  }
}
