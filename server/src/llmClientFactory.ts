import OpenAI, { AzureOpenAI } from 'openai';
import type { LLMSettings } from './configStore.js';

export interface LLMClientConfig {
  client: OpenAI;
  model: string;
}

export function createLLMClient(): LLMClientConfig {
  const provider = (process.env.LLM_PROVIDER || 'openai').toLowerCase();

  if (provider === 'azure') {
    return createAzureClient();
  }
  return createOpenAIClient();
}

export function createLLMClientFromConfig(config: LLMSettings): LLMClientConfig {
  if (config.provider === 'azure') {
    const client = new AzureOpenAI({
      apiKey: config.apiKey,
      endpoint: config.endpoint,
      deployment: config.deployment,
      apiVersion: config.apiVersion || '2024-08-01-preview',
    });
    return { client, model: config.deployment || 'gpt-4o' };
  }

  const client = new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseUrl || undefined,
  });
  return { client, model: config.model || 'gpt-4o' };
}

function createAzureClient(): LLMClientConfig {
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT;
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-08-01-preview';

  const missing = [
    !apiKey && 'AZURE_OPENAI_API_KEY',
    !endpoint && 'AZURE_OPENAI_ENDPOINT',
    !deployment && 'AZURE_OPENAI_DEPLOYMENT',
  ].filter(Boolean);

  if (missing.length > 0) {
    throw new Error(`Missing required Azure OpenAI environment variables: ${missing.join(', ')}`);
  }

  const client = new AzureOpenAI({
    apiKey,
    endpoint,
    deployment,
    apiVersion,
  });

  return { client, model: deployment! };
}

function createOpenAIClient(): LLMClientConfig {
  const client = new OpenAI({
    baseURL: process.env.OPENAI_BASE_URL || undefined,
  });
  return { client, model: process.env.OPENAI_MODEL || 'gpt-4o' };
}
