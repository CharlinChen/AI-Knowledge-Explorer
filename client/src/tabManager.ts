export interface TabItem {
  id: string;
  title: string;
}

/**
 * Add a tab to the list. If a tab with the same id already exists, return the list unchanged.
 */
export function addTab(tabs: TabItem[], page: { id: string; title: string }): TabItem[] {
  if (tabs.some((tab) => tab.id === page.id)) return tabs;
  return [...tabs, { id: page.id, title: page.title }];
}

/**
 * Close a tab by id. Returns the new tab list and the next active tab id.
 * If the closed tab was active, pick the right neighbor, then left, then null.
 */
export function closeTab(
  tabs: TabItem[],
  tabId: string,
  activeTabId: string,
): { tabs: TabItem[]; nextActiveId: string | null } {
  const idx = tabs.findIndex((tab) => tab.id === tabId);
  if (idx === -1) return { tabs, nextActiveId: activeTabId };

  const newTabs = tabs.filter((tab) => tab.id !== tabId);

  if (tabId !== activeTabId) {
    return { tabs: newTabs, nextActiveId: activeTabId };
  }

  // Closed the active tab — pick neighbor
  if (newTabs.length === 0) {
    return { tabs: newTabs, nextActiveId: null };
  }
  // Prefer right neighbor (same index in new array), else left
  const nextIdx = idx < newTabs.length ? idx : newTabs.length - 1;
  return { tabs: newTabs, nextActiveId: newTabs[nextIdx].id };
}
