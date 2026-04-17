import express from 'express';
import cors from 'cors';
import path from 'path';
import { createDatabase } from './db.js';
import { PageStore } from './pageStore.js';
import { LLMService } from './llmService.js';
import { createRouter } from './routes.js';
import { createLLMClient, createLLMClientFromConfig } from './llmClientFactory.js';
import { ConfigStore } from './configStore.js';

export function createApp(dbPath?: string) {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());

  // Initialize dependencies
  const db = createDatabase(dbPath);
  const pageStore = new PageStore(db);
  const configStore = new ConfigStore(db);

  // Try to create LLM service: runtime config first, then env vars
  let llmService: LLMService | null = null;

  const savedSettings = configStore.getSettings();
  if (savedSettings) {
    try {
      const { client, model } = createLLMClientFromConfig(savedSettings);
      llmService = new LLMService(client, model);
    } catch (err) {
      console.warn('Failed to create LLM client from saved config, trying env vars:', err);
    }
  }

  if (!llmService) {
    try {
      const { client, model } = createLLMClient();
      llmService = new LLMService(client, model);
    } catch {
      console.warn('No LLM configuration available. Configure via settings page.');
    }
  }

  const setLLMService = (service: LLMService) => { llmService = service; };
  const getLLMService = () => llmService;

  // API routes
  const router = createRouter(
    pageStore,
    llmService!,
    configStore,
    setLLMService,
    getLLMService,
  );
  app.use(router);

  // Serve static files from client build (production)
  const clientDist = path.join(process.cwd(), 'client', 'dist');
  app.use(express.static(clientDist));

  // SPA fallback — serve index.html for non-API routes
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });

  return app;
}
