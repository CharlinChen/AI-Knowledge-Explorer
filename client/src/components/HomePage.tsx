import type { PageSummary } from '../types';

interface HomePageProps {
  pages: PageSummary[];
  onSelectPage: (id: string) => void;
  lang: string;
  t: (key: string, lang: string) => string;
}

export default function HomePage({ pages, onSelectPage, lang, t }: HomePageProps) {
  return (
    <div className="home-page">
      <h1>{t('home.title', lang)}</h1>

      {pages.length > 0 ? (
        <section className="page-list-section">
          <h2>{t('home.generatedPages', lang)}</h2>
          <ul className="page-list">
            {pages.map((p) => (
              <li key={p.id} className="page-list-item">
                <button className="page-link" onClick={() => onSelectPage(p.id)}>
                  {p.title}
                </button>
                <span className="page-date">
                  {new Date(p.updatedAt).toLocaleDateString('zh-CN')}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <section className="welcome-section">
          <h2>{t('home.welcome', lang)}</h2>
          <p>{t('home.welcomeText1', lang)}</p>
          <p>{t('home.welcomeText2', lang)}</p>
        </section>
      )}

      <section className="guide-section">
        <h2>{t('home.guide', lang)}</h2>
        <ul className="guide-list">
          <li>
            <strong>{t('home.guideAsk', lang)}</strong>{t('home.guideAskDesc', lang)}
          </li>
          <li>
            <strong>{t('home.guideTerm', lang)}</strong>{t('home.guideTermDesc', lang)}
          </li>
          <li>
            <strong>{t('home.guideAppend', lang)}</strong>{t('home.guideAppendDesc', lang)}
          </li>
          <li>
            <strong>{t('home.guideModify', lang)}</strong>{t('home.guideModifyDesc', lang)}
          </li>
        </ul>
      </section>

      <footer className="home-footer">
        <span className="version-label">v0.1.8</span>
      </footer>
    </div>
  );
}
