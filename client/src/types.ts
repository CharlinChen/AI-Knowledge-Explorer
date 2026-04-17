export interface KnowledgePage {
  id: string;
  title: string;
  content: string;
  summary: string;
  createdAt: string;
  updatedAt: string;
  linkedPageIds: string[];
}

export interface PageSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  relatedPageId?: string;
}

export interface ChatResponse {
  action: 'new_page' | 'append' | 'modify';
  page: KnowledgePage;
  chatMessage: string;
}

export interface ByTermResponse {
  page: KnowledgePage;
  isNew: boolean;
}
