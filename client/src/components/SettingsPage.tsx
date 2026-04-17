import { useState, useEffect } from 'react';
import * as api from '../api';

interface SettingsPageProps {
  lang: string;
  t: (key: string, lang: string) => string;
  onBack: () => void;
}

export default function SettingsPage({ lang, t, onBack }: SettingsPageProps) {
  const [provider, setProvider] = useState<'openai' | 'azure'>('openai');
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [model, setModel] = useState('');
  const [endpoint, setEndpoint] = useState('');
  const [deployment, setDeployment] = useState('');
  const [apiVersion, setApiVersion] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    api.getSettings().then((data) => {
      if (data.provider) {
        setProvider(data.provider as 'openai' | 'azure');
        setApiKey(data.apiKey || '');
        setBaseUrl(data.baseUrl || '');
        setModel(data.model || '');
        setEndpoint(data.endpoint || '');
        setDeployment(data.deployment || '');
        setApiVersion(data.apiVersion || '');
      }
    }).catch(() => {
      setMessage({ type: 'error', text: t('settings.loadFailed', lang) });
    });
  }, [lang, t]);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await api.saveSettings({
        provider,
        apiKey,
        baseUrl: baseUrl || undefined,
        model: model || undefined,
        endpoint: endpoint || undefined,
        deployment: deployment || undefined,
        apiVersion: apiVersion || undefined,
      });
      setMessage({ type: 'success', text: t('settings.saveSuccess', lang) });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setMessage({ type: 'error', text: t('settings.saveFailed', lang).replace('{error}', errMsg) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="settings-page">
      <button className="settings-back-btn" onClick={onBack}>{t('settings.back', lang)}</button>
      <h1>{t('settings.title', lang)}</h1>

      {message && (
        <div className={`settings-message settings-message--${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="settings-form">
        <label className="settings-label">
          {t('settings.provider', lang)}
          <select value={provider} onChange={(e) => setProvider(e.target.value as 'openai' | 'azure')}>
            <option value="openai">{t('settings.openai', lang)}</option>
            <option value="azure">{t('settings.azure', lang)}</option>
          </select>
        </label>

        <label className="settings-label">
          {t('settings.apiKey', lang)}
          <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
        </label>

        {provider === 'openai' && (
          <>
            <label className="settings-label">
              {t('settings.baseUrl', lang)}
              <input type="text" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://api.openai.com/v1" />
            </label>
            <label className="settings-label">
              {t('settings.model', lang)}
              <input type="text" value={model} onChange={(e) => setModel(e.target.value)} placeholder="gpt-4o" />
            </label>
          </>
        )}

        {provider === 'azure' && (
          <>
            <label className="settings-label">
              {t('settings.endpoint', lang)}
              <input type="text" value={endpoint} onChange={(e) => setEndpoint(e.target.value)} />
            </label>
            <label className="settings-label">
              {t('settings.deployment', lang)}
              <input type="text" value={deployment} onChange={(e) => setDeployment(e.target.value)} />
            </label>
            <label className="settings-label">
              {t('settings.apiVersion', lang)}
              <input type="text" value={apiVersion} onChange={(e) => setApiVersion(e.target.value)} placeholder="2024-08-01-preview" />
            </label>
          </>
        )}

        <button className="settings-save-btn" onClick={handleSave} disabled={saving || !apiKey.trim()}>
          {saving ? t('settings.saving', lang) : t('settings.save', lang)}
        </button>
      </div>
    </div>
  );
}
