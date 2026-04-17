import { Router, type Request, type Response } from 'express';
import type { PageStore } from './pageStore.js';
import { LLMService } from './llmService.js';
import { ConfigStore, maskApiKey, type LLMSettings } from './configStore.js';
import { createLLMClientFromConfig } from './llmClientFactory.js';

export interface RouterDeps {
  pageStore: PageStore;
  llmService: LLMService;
  configStore: ConfigStore;
  setLLMService: (service: LLMService) => void;
  getLLMService: () => LLMService | null;
}

export function createRouter(pageStore: PageStore, llmService: LLMService, configStore?: ConfigStore, setLLMService?: (service: LLMService) => void, getLLMService?: () => LLMService | null): Router {
  const router = Router();

  // POST /api/chat - 接收消息，分类意图，执行对应操作
  router.post('/api/chat', async (req: Request, res: Response) => {
    try {
      const currentLLM = getLLMService ? getLLMService() : llmService;
      if (!currentLLM) {
        res.status(503).json({ error: 'LLM 未配置。请先在设置页面配置 API Key。' });
        return;
      }

      const { message, currentPageId, lang } = req.body;

      // 输入验证
      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        res.status(400).json({ error: '消息不能为空' });
        return;
      }
      if (message.length > 2000) {
        res.status(400).json({ error: '消息长度不能超过2000字符' });
        return;
      }

      // 获取当前页面上下文（如果有）
      let currentPage = currentPageId
        ? pageStore.getPageById(currentPageId)
        : null;

      // 意图分类
      const intent = await currentLLM.classifyIntent(message, currentPage ?? undefined);

      if (intent.action === 'new_page' || !currentPage) {
        // 生成新页面
        const generated = await currentLLM.generatePage(message, lang);
        const page = pageStore.createPage(generated.title, generated.content, generated.summary);

        // 如果有当前页面且问题无关，添加跨页面链接
        if (currentPage && intent.action === 'new_page') {
          pageStore.addPageLink(currentPage.id, page.id);
        }

        res.json({
          action: 'new_page' as const,
          page,
          chatMessage: `已生成新页面：${page.title}`,
        });
      } else if (intent.action === 'append') {
        // 追加内容到当前页面
        const appendContent = await currentLLM.generateAppendContent(currentPage, message, lang);
        const newContent = currentPage.content + '\n' + appendContent;
        const updatedPage = pageStore.updatePage(currentPage.id, newContent);

        if (!updatedPage) {
          res.status(500).json({ error: '更新页面失败' });
          return;
        }

        res.json({
          action: 'append' as const,
          page: updatedPage,
          chatMessage: `已追加内容到当前页面：${updatedPage.title}`,
        });
      } else {
        // 修改当前页面内容
        const modifiedContent = await currentLLM.generateModifiedContent(currentPage, message, lang);
        const updatedPage = pageStore.updatePage(currentPage.id, modifiedContent);

        if (!updatedPage) {
          res.status(500).json({ error: '更新页面失败' });
          return;
        }

        res.json({
          action: 'modify' as const,
          page: updatedPage,
          chatMessage: `已修改页面：${updatedPage.title}`,
        });
      }
    } catch (err) {
      console.error('Chat API error:', err);
      res.status(500).json({ error: '处理请求时发生错误' });
    }
  });

  // GET /api/pages - 返回所有页面摘要列表
  router.get('/api/pages', (_req: Request, res: Response) => {
    try {
      const pages = pageStore.getAllPages();
      res.json({ pages });
    } catch (err) {
      console.error('Get pages error:', err);
      res.status(500).json({ error: '获取页面列表失败' });
    }
  });

  // GET /api/pages/:id - 返回指定页面详情
  router.get('/api/pages/:id', (req: Request<{ id: string }>, res: Response) => {
    try {
      const page = pageStore.getPageById(req.params.id);
      if (!page) {
        res.status(404).json({ error: '页面不存在' });
        return;
      }
      res.json({ page });
    } catch (err) {
      console.error('Get page error:', err);
      res.status(500).json({ error: '获取页面详情失败' });
    }
  });

  // POST /api/pages/by-term - 查找或生成术语页面（支持流式）
  router.post('/api/pages/by-term', async (req: Request, res: Response) => {
    try {
      const currentLLM = getLLMService ? getLLMService() : llmService;
      if (!currentLLM) {
        res.status(503).json({ error: 'LLM 未配置。请先在设置页面配置 API Key。' });
        return;
      }

      const { term, lang, stream: useStream } = req.body;

      if (!term || typeof term !== 'string' || term.trim().length === 0) {
        res.status(400).json({ error: '术语不能为空' });
        return;
      }

      // 先查找已有页面
      const existing = pageStore.findPageByTerm(term.trim());
      if (existing) {
        res.json({ page: existing, isNew: false });
        return;
      }

      // If stream requested, use SSE
      if (useStream) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        res.flushHeaders();

        const sendSSE = (event: string, data: unknown) => {
          res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
        };

        try {
          // Phase 1: Generate title & summary first
          const meta = await currentLLM.generatePageByTermMeta(term.trim(), lang);
          sendSSE('meta', { title: meta.title, summary: meta.summary });

          // Phase 2: Stream HTML content directly
          let fullContent = '';
          for await (const chunk of currentLLM.generatePageByTermContentStream(term.trim(), lang)) {
            fullContent += chunk;
            sendSSE('chunk', { content: chunk });
          }

          const page = pageStore.createPage(meta.title, fullContent, meta.summary);
          sendSSE('done', { page, isNew: true });
        } catch (err) {
          console.error('By-term stream error:', err);
          sendSSE('error', { error: '处理术语请求时发生错误' });
        } finally {
          res.end();
        }
        return;
      }

      // 不存在则生成新页面（非流式 fallback）
      const generated = await currentLLM.generatePageByTerm(term.trim(), lang);
      const page = pageStore.createPage(generated.title, generated.content, generated.summary);
      res.json({ page, isNew: true });
    } catch (err) {
      console.error('By-term API error:', err);
      res.status(500).json({ error: '处理术语请求时发生错误' });
    }
  });

  // POST /api/chat/stream - SSE 流式聊天端点
  router.post('/api/chat/stream', async (req: Request, res: Response) => {
    const currentLLM = getLLMService ? getLLMService() : llmService;
    if (!currentLLM) {
      res.status(503).json({ error: 'LLM 未配置。请先在设置页面配置 API Key。' });
      return;
    }

    const { message, currentPageId, lang } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      res.status(400).json({ error: '消息不能为空' });
      return;
    }
    if (message.length > 2000) {
      res.status(400).json({ error: '消息长度不能超过2000字符' });
      return;
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const sendSSE = (event: string, data: unknown) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    try {
      let currentPage = currentPageId
        ? pageStore.getPageById(currentPageId)
        : null;

      // Intent classification
      const intent = await currentLLM.classifyIntent(message, currentPage ?? undefined);
      const action = (!currentPage) ? 'new_page' : intent.action;

      sendSSE('intent', { action, pageId: currentPage?.id });

      if (action === 'new_page' || !currentPage) {
        // Phase 1: Generate title & summary first
        const meta = await currentLLM.generatePageMeta(message, lang);
        sendSSE('meta', { title: meta.title, summary: meta.summary });

        // Phase 2: Stream HTML content directly
        let fullContent = '';
        for await (const chunk of currentLLM.generatePageContentStream(message, meta.title, lang)) {
          fullContent += chunk;
          sendSSE('chunk', { content: chunk });
        }

        const page = pageStore.createPage(meta.title, fullContent, meta.summary);

        if (currentPage && intent.action === 'new_page') {
          pageStore.addPageLink(currentPage.id, page.id);
        }

        sendSSE('done', { page, chatMessage: `已生成新页面：${page.title}`, action: 'new_page' });
      } else if (action === 'append') {
        let appendContent = '';
        for await (const chunk of currentLLM.generateAppendContentStream(currentPage, message, lang)) {
          appendContent += chunk;
          sendSSE('chunk', { content: chunk });
        }

        const newContent = currentPage.content + '\n' + appendContent;
        const updatedPage = pageStore.updatePage(currentPage.id, newContent);
        if (!updatedPage) throw new Error('更新页面失败');

        sendSSE('done', { page: updatedPage, chatMessage: `已追加内容到当前页面：${updatedPage.title}`, action: 'append' });
      } else {
        // modify
        let modifiedContent = '';
        for await (const chunk of currentLLM.generateModifiedContentStream(currentPage, message, lang)) {
          modifiedContent += chunk;
          sendSSE('chunk', { content: chunk });
        }

        const updatedPage = pageStore.updatePage(currentPage.id, modifiedContent);
        if (!updatedPage) throw new Error('更新页面失败');

        sendSSE('done', { page: updatedPage, chatMessage: `已修改页面：${updatedPage.title}`, action: 'modify' });
      }
    } catch (err) {
      console.error('Stream chat error:', err);
      sendSSE('error', { error: '处理请求时发生错误' });
    } finally {
      res.end();
    }
  });

  // GET /api/settings - 返回当前配置（API Key 脱敏）
  router.get('/api/settings', (_req: Request, res: Response) => {
    try {
      if (!configStore) {
        res.json({});
        return;
      }
      const settings = configStore.getSettings();
      if (!settings) {
        res.json({});
        return;
      }
      res.json({
        provider: settings.provider,
        apiKey: maskApiKey(settings.apiKey),
        baseUrl: settings.baseUrl || '',
        model: settings.model || '',
        endpoint: settings.endpoint || '',
        deployment: settings.deployment || '',
        apiVersion: settings.apiVersion || '',
      });
    } catch (err) {
      console.error('Get settings error:', err);
      res.status(500).json({ error: '获取配置失败' });
    }
  });

  // PUT /api/settings - 保存配置并重新创建 LLM 客户端
  router.put('/api/settings', (req: Request, res: Response) => {
    try {
      if (!configStore || !setLLMService) {
        res.status(500).json({ error: '配置功能未启用' });
        return;
      }

      const { provider, apiKey, baseUrl, model, endpoint, deployment, apiVersion } = req.body;

      if (!provider || (provider !== 'openai' && provider !== 'azure')) {
        res.status(400).json({ error: '无效的提供商，必须为 openai 或 azure' });
        return;
      }
      if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0) {
        res.status(400).json({ error: 'API Key 不能为空' });
        return;
      }

      if (provider === 'azure') {
        if (!endpoint || typeof endpoint !== 'string' || endpoint.trim().length === 0) {
          res.status(400).json({ error: 'Azure Endpoint 不能为空' });
          return;
        }
        if (!deployment || typeof deployment !== 'string' || deployment.trim().length === 0) {
          res.status(400).json({ error: 'Azure Deployment 不能为空' });
          return;
        }
      }

      const settings: LLMSettings = {
        provider,
        apiKey: apiKey.trim(),
        baseUrl: baseUrl?.trim() || undefined,
        model: model?.trim() || undefined,
        endpoint: endpoint?.trim() || undefined,
        deployment: deployment?.trim() || undefined,
        apiVersion: apiVersion?.trim() || undefined,
      };

      configStore.saveSettings(settings);

      // Recreate LLM client with new config
      try {
        const { client, model: resolvedModel } = createLLMClientFromConfig(settings);
        const newService = new LLMService(client, resolvedModel);
        setLLMService(newService);
      } catch (clientErr) {
        console.error('Failed to create LLM client from new config:', clientErr);
        // Settings are saved but client creation failed
        res.status(500).json({ error: '配置已保存，但创建 LLM 客户端失败' });
        return;
      }

      res.json({ success: true });
    } catch (err) {
      console.error('Save settings error:', err);
      res.status(500).json({ error: '保存配置失败' });
    }
  });

  return router;
}
