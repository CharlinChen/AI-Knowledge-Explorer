import { useEffect, useRef } from 'react';
import type { KnowledgePage, PageSummary } from '../types';
import HomePage from './HomePage';

interface ContentPanelProps {
  currentPage: KnowledgePage | null;
  pages: PageSummary[];
  loading: boolean;
  lastAction: 'new_page' | 'append' | 'modify' | null;
  onTermClick: (term: string) => void;
  onSelectPage: (id: string) => void;
  lang: string;
  t: (key: string, lang: string) => string;
  streamingContent?: string | null;
  isStreaming?: boolean;
  streamingTitle?: string | null;
  viewingStreamingTab?: boolean;
}

export default function ContentPanel({
  currentPage,
  pages,
  loading,
  lastAction,
  onTermClick,
  onSelectPage,
  lang,
  t,
  streamingContent,
  isStreaming,
  streamingTitle,
  viewingStreamingTab,
}: ContentPanelProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const prevContentLenRef = useRef<number>(0);
  const appendMarkerRef = useRef<HTMLDivElement>(null);

  // Bind click handler for marked-term elements via event delegation
  useEffect(() => {
    if (!contentRef.current || !currentPage) return;

    const handler = (e: Event) => {
      const target = e.target as HTMLElement;
      const termEl = target.closest('.marked-term');
      if (termEl) {
        e.preventDefault();
        const term = termEl.getAttribute('data-term');
        if (term) onTermClick(term);
      }
    };

    const el = contentRef.current;
    el.addEventListener('click', handler);
    return () => el.removeEventListener('click', handler);
  }, [currentPage, onTermClick]);

  // Scroll to top when navigating to a different page
  useEffect(() => {
    if (currentPage) {
      panelRef.current?.scrollTo(0, 0);
      prevContentLenRef.current = currentPage.content.length;
    }
  }, [currentPage?.id]);

  // Scroll to appended content when content grows on the same page,
  // or scroll to top when content is replaced (modify).
  useEffect(() => {
    if (!currentPage) return;
    const newLen = currentPage.content.length;
    const oldLen = prevContentLenRef.current;

    if (oldLen > 0 && newLen !== oldLen) {
      if (lastAction === 'modify') {
        // Content was replaced — scroll to top to show the updated page
        panelRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (newLen > oldLen) {
        // Content was appended — scroll the append marker into view
        appendMarkerRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    }
    prevContentLenRef.current = newLen;
  }, [currentPage?.content, lastAction]);

  // New page streaming: show in its own view only when the streaming tab is active
  const isStreamingNewPage = !!viewingStreamingTab && isStreaming;

  if (!currentPage) {
    // If a streaming tab is active, show the streaming content; otherwise show home
    if (isStreamingNewPage) {
      return (
        <div className="content-panel" ref={panelRef}>
          {streamingTitle && <h1 className="page-title">{streamingTitle}</h1>}
          <div
            className="page-content streaming-content"
            dangerouslySetInnerHTML={{ __html: streamingContent || '' }}
          />
          {isStreaming && <span className="streaming-cursor" />}
        </div>
      );
    }

    return (
      <div className="content-panel" ref={panelRef}>
        <HomePage pages={pages} onSelectPage={onSelectPage} lang={lang} t={t} />
      </div>
    );
  }

  return (
    <div className="content-panel" ref={panelRef}>
      {loading && !isStreaming && <div className="content-loading">{t('content.loading', lang)}</div>}
      <h1 className="page-title">{currentPage.title}</h1>
      <div
        ref={contentRef}
        className="page-content"
        dangerouslySetInnerHTML={{ __html: currentPage.content }}
      />
      {isStreaming && streamingContent && (
        <div className="page-content streaming-content" dangerouslySetInnerHTML={{ __html: streamingContent }} />
      )}
      {isStreaming && <span className="streaming-cursor" />}
      {/* Invisible marker used to scroll to appended content */}
      <div ref={appendMarkerRef} />
      {currentPage.linkedPageIds.length > 0 && (
        <section className="linked-pages">
          <h3>{t('content.linkedPages', lang)}</h3>
          <ul>
            {currentPage.linkedPageIds.map((id) => (
              <li key={id}>
                <button className="page-link" onClick={() => onSelectPage(id)}>
                  {pages.find((p) => p.id === id)?.title ?? id}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
