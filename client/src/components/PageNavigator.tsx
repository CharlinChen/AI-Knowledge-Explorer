import type { PageSummary } from '../types';

interface PageNavigatorProps {
  pages: PageSummary[];
  currentPageId: string | null;
  onSelectPage: (id: string) => void;
  onGoHome: () => void;
  lang: string;
  t: (key: string, lang: string) => string;
  onOpenSettings?: () => void;
}

export default function PageNavigator({
  pages,
  currentPageId,
  onSelectPage,
  onGoHome,
  lang,
  t,
  onOpenSettings,
}: PageNavigatorProps) {
  return (
    <nav className="page-navigator" aria-label={t('nav.label', lang)}>
      <button className="nav-home-btn" onClick={onGoHome}>
        {t('nav.home', lang)}
      </button>
      {onOpenSettings && (
        <button className="nav-settings-btn" onClick={onOpenSettings}>
          {t('nav.settings', lang)}
        </button>
      )}
      {pages.length > 0 ? (
        <>
          <h3 className="nav-heading">{t('nav.savedPages', lang)} ({pages.length})</h3>
          <ul className="nav-page-list">
            {pages.map((p) => (
              <li key={p.id} className={p.id === currentPageId ? 'active' : ''}>
                <button onClick={() => onSelectPage(p.id)}>{p.title}</button>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="nav-empty">{t('nav.empty', lang)}</p>
      )}
    </nav>
  );
}
