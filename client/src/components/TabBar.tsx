import type { TabItem } from '../tabManager';

interface TabBarProps {
  tabs: TabItem[];
  activeTabId: string | null;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  onGoHome: () => void;
  onOpenSettings: () => void;
  isHome: boolean;
  isSettings: boolean;
  lang: string;
  t: (key: string, lang: string) => string;
}

export default function TabBar({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onGoHome,
  onOpenSettings,
  isHome,
  isSettings,
  lang,
  t,
}: TabBarProps) {
  return (
    <div className="tab-bar" role="tablist" aria-label="Navigation tabs">
      {/* Fixed: Home */}
      <div
        className={`tab-item tab-item--fixed${isHome ? ' tab-item--active' : ''}`}
        role="tab"
        aria-selected={isHome}
      >
        <button className="tab-title" onClick={onGoHome}>
          🏠 {t('nav.home', lang)}
        </button>
      </div>
      {/* Fixed: Settings */}
      <div
        className={`tab-item tab-item--fixed${isSettings ? ' tab-item--active' : ''}`}
        role="tab"
        aria-selected={isSettings}
      >
        <button className="tab-title" onClick={onOpenSettings}>
          ⚙ {t('nav.settings', lang)}
        </button>
      </div>

      {/* Separator */}
      {tabs.length > 0 && <div className="tab-separator" />}

      {/* Closeable page tabs */}
      {tabs.map((tab) => (
        <div
          key={tab.id}
          className={`tab-item${tab.id === activeTabId ? ' tab-item--active' : ''}`}
          role="tab"
          aria-selected={tab.id === activeTabId}
        >
          <button className="tab-title" onClick={() => onSelectTab(tab.id)}>
            {tab.title}
          </button>
          <button
            className="tab-close"
            onClick={(e) => {
              e.stopPropagation();
              onCloseTab(tab.id);
            }}
            aria-label={`Close ${tab.title}`}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
