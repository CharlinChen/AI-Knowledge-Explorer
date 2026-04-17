import { useState, useRef, useEffect } from 'react';
import type { ChatMessage } from '../types';
import LanguageSelector from './LanguageSelector';

interface ChatPanelProps {
  messages: ChatMessage[];
  loading: boolean;
  onSend: (message: string) => void;
  lang: string;
  onLangChange: (lang: string) => void;
  t: (key: string, lang: string) => string;
}

export default function ChatPanel({ messages, loading, onSend, lang, onLangChange, t }: ChatPanelProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || loading) return;
    onSend(trimmed);
    setInput('');
  };

  return (
    <div className="chat-panel">
      <div className="chat-header">
        <h2>{t('chat.title', lang)}</h2>
        <LanguageSelector selectedLang={lang} onLangChange={onLangChange} t={t} />
      </div>
      <div className="chat-messages">
        {messages.length === 0 && !loading && (
          <div className="chat-empty">
            <p>{t('chat.empty', lang)}</p>
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`chat-message chat-message--${msg.role}`}>
            <span className="chat-role">{msg.role === 'user' ? t('chat.roleUser', lang) : t('chat.roleSystem', lang)}</span>
            <p className="chat-content">{msg.content}</p>
            <time className="chat-time">
              {new Date(msg.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
            </time>
          </div>
        ))}
        {loading && (
          <div className="chat-message chat-message--assistant">
            <span className="chat-role">{t('chat.roleSystem', lang)}</span>
            <p className="chat-content loading-indicator">{t('chat.thinking', lang)}</p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <form className="chat-input-form" onSubmit={handleSubmit}>
        <input
          type="text"
          className="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t('chat.placeholder', lang)}
          disabled={loading}
          aria-label={t('chat.inputLabel', lang)}
        />
        <button type="submit" className="chat-send-btn" disabled={loading || !input.trim()}>
          {t('chat.send', lang)}
        </button>
      </form>
    </div>
  );
}
