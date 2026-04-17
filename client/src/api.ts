import type { ChatResponse, KnowledgePage, PageSummary, ByTermResponse } from './types';

const BASE = '/api';

export interface SettingsResponse {
  provider?: string;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  endpoint?: string;
  deployment?: string;
  apiVersion?: string;
}

export interface SaveSettingsPayload {
  provider: 'openai' | 'azure';
  apiKey: string;
  baseUrl?: string;
  model?: string;
  endpoint?: string;
  deployment?: string;
  apiVersion?: string;
}

export async function chat(message: string, currentPageId?: string, lang?: string): Promise<ChatResponse> {
  const res = await fetch(`${BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, currentPageId, lang }),
  });
  if (!res.ok) throw new Error(`Chat failed: ${res.status}`);
  return res.json();
}

export async function getPages(): Promise<PageSummary[]> {
  const res = await fetch(`${BASE}/pages`);
  if (!res.ok) throw new Error(`Get pages failed: ${res.status}`);
  const data = await res.json();
  return data.pages;
}

export async function getPageById(id: string): Promise<KnowledgePage> {
  const res = await fetch(`${BASE}/pages/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error(`Get page failed: ${res.status}`);
  const data = await res.json();
  return data.page;
}

export async function getPageByTerm(term: string, lang?: string): Promise<ByTermResponse> {
  const res = await fetch(`${BASE}/pages/by-term`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ term, lang }),
  });
  if (!res.ok) throw new Error(`By-term failed: ${res.status}`);
  return res.json();
}


export async function getSettings(): Promise<SettingsResponse> {
  const res = await fetch(`${BASE}/settings`);
  if (!res.ok) throw new Error(`Get settings failed: ${res.status}`);
  return res.json();
}

export async function saveSettings(payload: SaveSettingsPayload): Promise<{ success: boolean }> {
  const res = await fetch(`${BASE}/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: 'Save failed' }));
    throw new Error(data.error || `Save settings failed: ${res.status}`);
  }
  return res.json();
}

export interface SSECallbacks {
  onIntent?: (data: { action: string; pageId?: string }) => void;
  onMeta?: (data: { title: string; summary: string }) => void;
  onChunk?: (data: { content: string }) => void;
  onDone?: (data: { page: import('./types').KnowledgePage; chatMessage: string; action: string }) => void;
  onError?: (data: { error: string }) => void;
}

export async function chatStream(
  message: string,
  callbacks: SSECallbacks,
  currentPageId?: string,
  lang?: string,
): Promise<void> {
  const res = await fetch(`${BASE}/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, currentPageId, lang }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `Stream failed: ${res.status}` }));
    callbacks.onError?.({ error: err.error || `Stream failed: ${res.status}` });
    return;
  }

  const reader = res.body?.getReader();
  if (!reader) {
    callbacks.onError?.({ error: 'ReadableStream not supported' });
    return;
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let currentEvent = '';

  const processLines = (lines: string[]) => {
    for (const line of lines) {
      if (line.startsWith('event: ')) {
        currentEvent = line.slice(7).trim();
      } else if (line.startsWith('data: ')) {
        const dataStr = line.slice(6);
        try {
          const data = JSON.parse(dataStr);
          if (currentEvent === 'intent') callbacks.onIntent?.(data);
          else if (currentEvent === 'meta') callbacks.onMeta?.(data);
          else if (currentEvent === 'chunk') callbacks.onChunk?.(data);
          else if (currentEvent === 'done') callbacks.onDone?.(data);
          else if (currentEvent === 'error') callbacks.onError?.(data);
        } catch {
          // skip malformed JSON
        }
        currentEvent = '';
      }
    }
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Parse SSE events from buffer
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? ''; // keep incomplete line in buffer
      processLines(lines);
    }

    // Flush any remaining data in buffer after stream ends
    if (buffer.trim()) {
      const lines = buffer.split('\n');
      processLines(lines);
    }
  } catch (err) {
    callbacks.onError?.({ error: err instanceof Error ? err.message : 'Stream interrupted' });
  } finally {
    reader.releaseLock();
  }
}

export async function getPageByTermStream(
  term: string,
  callbacks: SSECallbacks,
  lang?: string,
): Promise<void> {
  const res = await fetch(`${BASE}/pages/by-term`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ term, lang, stream: true }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `By-term stream failed: ${res.status}` }));
    callbacks.onError?.({ error: err.error || `By-term stream failed: ${res.status}` });
    return;
  }

  const contentType = res.headers.get('content-type') || '';

  // If server returned JSON (existing page), handle directly
  if (contentType.includes('application/json')) {
    const data = await res.json();
    callbacks.onDone?.({ page: data.page, chatMessage: '', action: 'existing' });
    return;
  }

  // Otherwise parse SSE stream
  const reader = res.body?.getReader();
  if (!reader) {
    callbacks.onError?.({ error: 'ReadableStream not supported' });
    return;
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let currentEvent = '';

  const processLines = (lines: string[]) => {
    for (const line of lines) {
      if (line.startsWith('event: ')) {
        currentEvent = line.slice(7).trim();
      } else if (line.startsWith('data: ')) {
        const dataStr = line.slice(6);
        try {
          const data = JSON.parse(dataStr);
          if (currentEvent === 'chunk') callbacks.onChunk?.(data);
          else if (currentEvent === 'meta') callbacks.onMeta?.(data);
          else if (currentEvent === 'done') callbacks.onDone?.(data);
          else if (currentEvent === 'error') callbacks.onError?.(data);
        } catch {
          // skip malformed JSON
        }
        currentEvent = '';
      }
    }
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      processLines(lines);
    }

    // Flush any remaining data in buffer after stream ends
    if (buffer.trim()) {
      const lines = buffer.split('\n');
      processLines(lines);
    }
  } catch (err) {
    callbacks.onError?.({ error: err instanceof Error ? err.message : 'Stream interrupted' });
  } finally {
    reader.releaseLock();
  }
}
