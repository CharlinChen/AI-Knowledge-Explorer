import { useState, useCallback, useEffect, useRef } from 'react';
import ChatPanel from './components/ChatPanel';
import ContentPanel from './components/ContentPanel';
import TabBar from './components/TabBar';
import SettingsPage from './components/SettingsPage';
import * as api from './api';
import type { KnowledgePage, PageSummary, ChatMessage } from './types';
import { t, getSavedLang, saveLang, isSupported } from './i18n';
import { addTab, closeTab } from './tabManager';
import type { TabItem } from './tabManager';

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback for non-secure contexts (HTTP)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function App() {
  const [currentPage, setCurrentPage] = useState<KnowledgePage | null>(null);
  const [pages, setPages] = useState<PageSummary[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastAction, setLastAction] = useState<'new_page' | 'append' | 'modify' | null>(null);
  const [lang, setLang] = useState<string>(getSavedLang);
  const [showSettings, setShowSettings] = useState(false);
  const [openTabs, setOpenTabs] = useState<TabItem[]>([]);
  const [streamingContent, setStreamingContent] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingTitle, setStreamingTitle] = useState<string | null>(null);
  const [streamingTabId, setStreamingTabId] = useState<string | null>(null);
  const [viewingStreamingTab, setViewingStreamingTab] = useState(false);
  const streamingContentRef = useRef<string>('');

  const handleLangChange = useCallback((newLang: string) => {
    setLang(newLang);
    if (isSupported(newLang)) {
      saveLang(newLang);
    }
  }, []);

  const refreshPages = useCallback(async () => {
    try {
      const list = await api.getPages();
      setPages(list);
    } catch {
      // silently fail on refresh
    }
  }, []);

  useEffect(() => {
    refreshPages();
  }, [refreshPages]);

  const addMessage = (role: 'user' | 'assistant', content: string, relatedPageId?: string) => {
    const msg: ChatMessage = {
      id: generateId(),
      role,
      content,
      timestamp: new Date().toISOString(),
      relatedPageId,
    };
    setMessages((prev) => [...prev, msg]);
  };

  /** Open a page and ensure it has a tab */
  const openPage = useCallback((page: KnowledgePage) => {
    setCurrentPage(page);
    setShowSettings(false);
    setOpenTabs((prev) => addTab(prev, { id: page.id, title: page.title }));
  }, []);

  const handleCloseTab = useCallback(
    (tabId: string) => {
      // If closing the streaming tab, stop viewing it
      if (streamingTabId && tabId === streamingTabId) {
        setViewingStreamingTab(false);
        setOpenTabs((prev) => prev.filter((tab) => tab.id !== tabId));
        return;
      }
      setOpenTabs((prev) => {
        const activeId = currentPage?.id ?? '';
        const result = closeTab(prev, tabId, activeId);
        if (tabId === activeId) {
          if (result.nextActiveId) {
            api.getPageById(result.nextActiveId).then((page) => {
              setCurrentPage(page);
              setShowSettings(false);
              setLastAction(null);
            }).catch(() => {
              setCurrentPage(null);
              setShowSettings(false);
              setLastAction(null);
            });
          } else {
            // No more tabs — go home
            setCurrentPage(null);
            setShowSettings(false);
            setLastAction(null);
          }
        }
        return result.tabs;
      });
    },
    [currentPage?.id, streamingTabId],
  );

  const handleSelectTab = useCallback(
    async (id: string) => {
      // If clicking the streaming tab, just switch view to it
      if (streamingTabId && id === streamingTabId) {
        setCurrentPage(null);
        setShowSettings(false);
        setViewingStreamingTab(true);
        return;
      }
      setViewingStreamingTab(false);
      try {
        const page = await api.getPageById(id);
        setLastAction(null);
        setCurrentPage(page);
        setShowSettings(false);
      } catch {
        addMessage('assistant', t('chat.loadPageFailed', lang));
      }
    },
    [lang, streamingTabId],
  );

  const handleSend = useCallback(
    async (message: string) => {
      addMessage('user', message, currentPage?.id);
      setLoading(true);
      setIsStreaming(true);
      streamingContentRef.current = '';
      setStreamingContent('');
      setStreamingTitle(null);
      setStreamingTabId(null);

      let streamAction: string | null = null;

      try {
        await api.chatStream(
          message,
          {
            onIntent: (data) => {
              streamAction = data.action;
            },
            onMeta: (data) => {
              // New page: create a temporary tab and switch to it immediately
              const tempId = '__streaming__' + Date.now();
              setStreamingTitle(data.title);
              setStreamingTabId(tempId);
              setViewingStreamingTab(true);
              setCurrentPage(null);
              setShowSettings(false);
              setOpenTabs((prev) => addTab(prev, { id: tempId, title: data.title }));
            },
            onChunk: (data) => {
              streamingContentRef.current += data.content;
              setStreamingContent(streamingContentRef.current);
            },
            onDone: (data) => {
              const action = data.action as 'new_page' | 'append' | 'modify';
              const finalPage = data.page;
              setLastAction(action);
              setIsStreaming(false);
              setStreamingContent(null);
              setStreamingTitle(null);
              setViewingStreamingTab(false);
              streamingContentRef.current = '';
              // Replace the temporary streaming tab with the real page tab
              setOpenTabs((prev) => {
                const tempId = prev.find((tab) => tab.id.startsWith('__streaming__'));
                if (tempId) {
                  return prev.map((tab) =>
                    tab.id === tempId.id ? { id: finalPage.id, title: finalPage.title } : tab,
                  );
                }
                return addTab(prev, { id: finalPage.id, title: finalPage.title });
              });
              setStreamingTabId(null);
              setCurrentPage(finalPage);
              addMessage('assistant', data.chatMessage, finalPage.id);
              refreshPages();
            },
            onError: (data) => {
              setIsStreaming(false);
              // Preserve any content already received
              if (streamingContentRef.current && (currentPage || streamingTabId)) {
                setStreamingContent(streamingContentRef.current);
              } else {
                setStreamingContent(null);
                setStreamingTitle(null);
                setViewingStreamingTab(false);
                // Remove temporary tab on error if no content
                setStreamingTabId((prevTempId) => {
                  if (prevTempId) {
                    setOpenTabs((prev) => prev.filter((tab) => tab.id !== prevTempId));
                  }
                  return null;
                });
              }
              addMessage('assistant', data.error || t('chat.requestFailed', lang));
            },
          },
          currentPage?.id,
          lang,
        );
      } catch {
        setIsStreaming(false);
        setStreamingContent(null);
        setStreamingTitle(null);
        setViewingStreamingTab(false);
        setStreamingTabId((prevTempId) => {
          if (prevTempId) {
            setOpenTabs((prev) => prev.filter((tab) => tab.id !== prevTempId));
          }
          return null;
        });
        addMessage('assistant', t('chat.requestFailed', lang));
      } finally {
        setLoading(false);
      }
    },
    [currentPage, refreshPages, lang, openPage],
  );

  const handleTermClick = useCallback(
    async (term: string) => {
      setLoading(true);
      setIsStreaming(true);
      streamingContentRef.current = '';
      setStreamingContent('');
      setStreamingTitle(null);
      setStreamingTabId(null);

      try {
        await api.getPageByTermStream(
          term,
          {
            onMeta: (data) => {
              const tempId = '__streaming__' + Date.now();
              setStreamingTitle(data.title);
              setStreamingTabId(tempId);
              setViewingStreamingTab(true);
              setCurrentPage(null);
              setShowSettings(false);
              setOpenTabs((prev) => addTab(prev, { id: tempId, title: data.title }));
            },
            onChunk: (data) => {
              streamingContentRef.current += data.content;
              setStreamingContent(streamingContentRef.current);
            },
            onDone: (data) => {
              const finalPage = data.page;
              setLastAction('new_page');
              setIsStreaming(false);
              setStreamingContent(null);
              setStreamingTitle(null);
              setViewingStreamingTab(false);
              streamingContentRef.current = '';
              // Replace the temporary streaming tab with the real page tab
              setOpenTabs((prev) => {
                const tempTab = prev.find((tab) => tab.id.startsWith('__streaming__'));
                if (tempTab) {
                  return prev.map((tab) =>
                    tab.id === tempTab.id ? { id: finalPage.id, title: finalPage.title } : tab,
                  );
                }
                return addTab(prev, { id: finalPage.id, title: finalPage.title });
              });
              setStreamingTabId(null);
              setCurrentPage(finalPage);
              if ((data as { isNew?: boolean }).isNew !== false) {
                addMessage('assistant', t('chat.termGenerated', lang).replace('{title}', finalPage.title), finalPage.id);
                refreshPages();
              }
            },
            onError: (data) => {
              setIsStreaming(false);
              setStreamingContent(null);
              setStreamingTitle(null);
              setViewingStreamingTab(false);
              setStreamingTabId((prevTempId) => {
                if (prevTempId) {
                  setOpenTabs((prev) => prev.filter((tab) => tab.id !== prevTempId));
                }
                return null;
              });
              addMessage('assistant', data.error || t('chat.termFailed', lang).replace('{term}', term));
            },
          },
          lang,
        );
      } catch {
        setIsStreaming(false);
        setStreamingContent(null);
        setStreamingTitle(null);
        setViewingStreamingTab(false);
        setStreamingTabId((prevTempId) => {
          if (prevTempId) {
            setOpenTabs((prev) => prev.filter((tab) => tab.id !== prevTempId));
          }
          return null;
        });
        addMessage('assistant', t('chat.termFailed', lang).replace('{term}', term));
      } finally {
        setLoading(false);
      }
    },
    [refreshPages, lang, openPage],
  );

  const handleSelectPage = useCallback(
    async (id: string) => {
      try {
        const page = await api.getPageById(id);
        setLastAction(null);
        openPage(page);
      } catch {
        addMessage('assistant', t('chat.loadPageFailed', lang));
      }
    },
    [lang, openPage],
  );

  const handleGoHome = useCallback(() => {
    setCurrentPage(null);
    setLastAction(null);
    setShowSettings(false);
    setViewingStreamingTab(false);
    refreshPages();
  }, [refreshPages]);

  const handleOpenSettings = useCallback(() => {
    setCurrentPage(null);
    setShowSettings(true);
    setViewingStreamingTab(false);
  }, []);

  return (
    <div className="app-layout">
      <div className="app-left">
        <TabBar
          tabs={openTabs}
          activeTabId={viewingStreamingTab && streamingTabId ? streamingTabId : currentPage?.id ?? null}
          onSelectTab={handleSelectTab}
          onCloseTab={handleCloseTab}
          onGoHome={handleGoHome}
          onOpenSettings={handleOpenSettings}
          isHome={!currentPage && !showSettings && !viewingStreamingTab}
          isSettings={showSettings}
          lang={lang}
          t={t}
        />
        {showSettings ? (
          <SettingsPage lang={lang} t={t} onBack={() => setShowSettings(false)} />
        ) : (
          <ContentPanel
            currentPage={currentPage}
            pages={pages}
            loading={loading}
            lastAction={lastAction}
            onTermClick={handleTermClick}
            onSelectPage={handleSelectPage}
            lang={lang}
            t={t}
            streamingContent={streamingContent}
            isStreaming={isStreaming}
            streamingTitle={streamingTitle}
            viewingStreamingTab={viewingStreamingTab}
          />
        )}
      </div>
      <div className="app-right">
        <ChatPanel messages={messages} loading={loading} onSend={handleSend} lang={lang} onLangChange={handleLangChange} t={t} />
      </div>
    </div>
  );
}

export default App;
