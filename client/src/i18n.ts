export type SupportedLang = 'zh-CN' | 'en' | 'ja';

export const SUPPORTED_UI_LANGS: { code: SupportedLang; name: string }[] = [
  { code: 'zh-CN', name: '中文' },
  { code: 'en', name: 'English' },
  { code: 'ja', name: '日本語' },
];

const LANG_STORAGE_KEY = 'explorer-lang';

export function getSavedLang(): SupportedLang {
  try {
    const saved = localStorage.getItem(LANG_STORAGE_KEY);
    if (saved && isSupported(saved)) return saved;
  } catch {
    // localStorage unavailable
  }
  return 'zh-CN';
}

export function saveLang(lang: SupportedLang): void {
  try {
    localStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch {
    // localStorage unavailable
  }
}

export function isSupported(code: string): code is SupportedLang {
  return SUPPORTED_UI_LANGS.some((l) => l.code === code);
}

type TranslationDict = Record<string, string>;

const zhCN: TranslationDict = {
  // Chat panel
  'chat.title': '聊天',
  'chat.empty': '在下方输入问题，开始探索知识。',
  'chat.roleUser': '你',
  'chat.roleSystem': '系统',
  'chat.thinking': '正在思考中...',
  'chat.placeholder': '输入问题或指令...',
  'chat.inputLabel': '聊天输入',
  'chat.send': '发送',
  'chat.requestFailed': '请求失败，请稍后重试。',
  'chat.termGenerated': '已生成术语页面：{title}',
  'chat.termFailed': '获取术语「{term}」页面失败。',
  'chat.loadPageFailed': '加载页面失败。',

  // Home page
  'home.title': 'AI Knowledge Explorer',
  'home.generatedPages': '已生成的知识页面',
  'home.welcome': '欢迎使用',
  'home.welcomeText1': '欢迎使用 AI Knowledge Explorer！这是一个 AI 驱动的知识探索工具。在右侧聊天窗口输入您感兴趣的问题，系统将为您生成结构化的知识页面。',
  'home.welcomeText2': '页面中的专有名词会被高亮标记，点击即可深入了解相关概念，逐步构建您的知识网络。',
  'home.guide': '使用指南',
  'home.guideAsk': '提问：',
  'home.guideAskDesc': '在右侧聊天窗口输入问题，系统会生成对应的知识页面。',
  'home.guideTerm': '点击标记词：',
  'home.guideTermDesc': '页面中高亮的术语可点击，自动生成该术语的知识页面。',
  'home.guideAppend': '追加内容：',
  'home.guideAppendDesc': '在查看某个页面时继续提问，相关内容会追加到当前页面。',
  'home.guideModify': '修改页面：',
  'home.guideModifyDesc': '发送修改指令（如"请补充更多细节"），系统会更新当前页面内容。',

  // Page navigator
  'nav.label': '页面导航',
  'nav.home': '🏠 主页',
  'nav.savedPages': '已保存页面',
  'nav.empty': '暂无已保存页面',

  // Content panel
  'content.loading': '内容加载中...',
  'content.linkedPages': '关联页面',

  // Language selector
  'lang.label': '选择语言',

  // Settings page
  'settings.title': '设置',
  'settings.provider': 'LLM 提供商',
  'settings.openai': 'OpenAI',
  'settings.azure': 'Azure OpenAI',
  'settings.apiKey': 'API Key',
  'settings.baseUrl': 'Base URL（可选）',
  'settings.model': '模型名称',
  'settings.endpoint': 'Endpoint',
  'settings.deployment': 'Deployment 名称',
  'settings.apiVersion': 'API 版本',
  'settings.save': '保存',
  'settings.saving': '保存中...',
  'settings.saveSuccess': '配置已保存',
  'settings.saveFailed': '保存失败：{error}',
  'settings.loadFailed': '加载配置失败',
  'settings.notConfigured': '未配置',
  'settings.back': '← 返回',
  'nav.settings': '⚙ 设置',
};

const en: TranslationDict = {
  // Chat panel
  'chat.title': 'Chat',
  'chat.empty': 'Type a question below to start exploring knowledge.',
  'chat.roleUser': 'You',
  'chat.roleSystem': 'System',
  'chat.thinking': 'Thinking...',
  'chat.placeholder': 'Enter a question or instruction...',
  'chat.inputLabel': 'Chat input',
  'chat.send': 'Send',
  'chat.requestFailed': 'Request failed. Please try again later.',
  'chat.termGenerated': 'Generated term page: {title}',
  'chat.termFailed': 'Failed to load term "{term}" page.',
  'chat.loadPageFailed': 'Failed to load page.',

  // Home page
  'home.title': 'AI Knowledge Explorer',
  'home.generatedPages': 'Generated Knowledge Pages',
  'home.welcome': 'Welcome',
  'home.welcomeText1': 'Welcome to AI Knowledge Explorer! This is an AI-powered knowledge exploration tool. Enter a question in the chat panel on the right, and the system will generate a structured knowledge page for you.',
  'home.welcomeText2': 'Domain-specific terms in the pages are highlighted. Click on them to dive deeper into related concepts and build your knowledge network.',
  'home.guide': 'User Guide',
  'home.guideAsk': 'Ask:',
  'home.guideAskDesc': 'Type a question in the chat panel on the right to generate a knowledge page.',
  'home.guideTerm': 'Click terms:',
  'home.guideTermDesc': 'Highlighted terms in pages are clickable and will generate a knowledge page for that term.',
  'home.guideAppend': 'Append content:',
  'home.guideAppendDesc': 'Ask follow-up questions while viewing a page to append related content.',
  'home.guideModify': 'Modify page:',
  'home.guideModifyDesc': 'Send modification instructions (e.g. "add more details") to update the current page.',

  // Page navigator
  'nav.label': 'Page navigation',
  'nav.home': '🏠 Home',
  'nav.savedPages': 'Saved Pages',
  'nav.empty': 'No saved pages yet',

  // Content panel
  'content.loading': 'Loading content...',
  'content.linkedPages': 'Linked Pages',

  // Language selector
  'lang.label': 'Select language',

  // Settings page
  'settings.title': 'Settings',
  'settings.provider': 'LLM Provider',
  'settings.openai': 'OpenAI',
  'settings.azure': 'Azure OpenAI',
  'settings.apiKey': 'API Key',
  'settings.baseUrl': 'Base URL (optional)',
  'settings.model': 'Model Name',
  'settings.endpoint': 'Endpoint',
  'settings.deployment': 'Deployment Name',
  'settings.apiVersion': 'API Version',
  'settings.save': 'Save',
  'settings.saving': 'Saving...',
  'settings.saveSuccess': 'Settings saved',
  'settings.saveFailed': 'Save failed: {error}',
  'settings.loadFailed': 'Failed to load settings',
  'settings.notConfigured': 'Not configured',
  'settings.back': '← Back',
  'nav.settings': '⚙ Settings',
};

const ja: TranslationDict = {
  // Chat panel
  'chat.title': 'チャット',
  'chat.empty': '下に質問を入力して、知識の探索を始めましょう。',
  'chat.roleUser': 'あなた',
  'chat.roleSystem': 'システム',
  'chat.thinking': '考え中...',
  'chat.placeholder': '質問や指示を入力...',
  'chat.inputLabel': 'チャット入力',
  'chat.send': '送信',
  'chat.requestFailed': 'リクエストに失敗しました。後でもう一度お試しください。',
  'chat.termGenerated': '用語ページを生成しました：{title}',
  'chat.termFailed': '用語「{term}」のページ取得に失敗しました。',
  'chat.loadPageFailed': 'ページの読み込みに失敗しました。',

  // Home page
  'home.title': 'AI Knowledge Explorer',
  'home.generatedPages': '生成されたナレッジページ',
  'home.welcome': 'ようこそ',
  'home.welcomeText1': 'AI Knowledge Explorerへようこそ！これはAI駆動のナレッジ探索ツールです。右側のチャットパネルに質問を入力すると、構造化されたナレッジページが生成されます。',
  'home.welcomeText2': 'ページ内の専門用語はハイライト表示されます。クリックすると関連する概念を深く掘り下げ、知識ネットワークを構築できます。',
  'home.guide': '使い方ガイド',
  'home.guideAsk': '質問する：',
  'home.guideAskDesc': '右側のチャットパネルに質問を入力すると、ナレッジページが生成されます。',
  'home.guideTerm': '用語をクリック：',
  'home.guideTermDesc': 'ページ内のハイライトされた用語をクリックすると、その用語のナレッジページが自動生成されます。',
  'home.guideAppend': '内容を追加：',
  'home.guideAppendDesc': 'ページを閲覧中に追加の質問をすると、関連する内容が現在のページに追加されます。',
  'home.guideModify': 'ページを修正：',
  'home.guideModifyDesc': '修正指示（例：「もっと詳しく」）を送信すると、現在のページの内容が更新されます。',

  // Page navigator
  'nav.label': 'ページナビゲーション',
  'nav.home': '🏠 ホーム',
  'nav.savedPages': '保存済みページ',
  'nav.empty': '保存済みページはありません',

  // Content panel
  'content.loading': 'コンテンツを読み込み中...',
  'content.linkedPages': '関連ページ',

  // Language selector
  'lang.label': '言語を選択',

  // Settings page
  'settings.title': '設定',
  'settings.provider': 'LLM プロバイダー',
  'settings.openai': 'OpenAI',
  'settings.azure': 'Azure OpenAI',
  'settings.apiKey': 'API Key',
  'settings.baseUrl': 'Base URL（任意）',
  'settings.model': 'モデル名',
  'settings.endpoint': 'エンドポイント',
  'settings.deployment': 'デプロイメント名',
  'settings.apiVersion': 'API バージョン',
  'settings.save': '保存',
  'settings.saving': '保存中...',
  'settings.saveSuccess': '設定を保存しました',
  'settings.saveFailed': '保存に失敗しました：{error}',
  'settings.loadFailed': '設定の読み込みに失敗しました',
  'settings.notConfigured': '未設定',
  'settings.back': '← 戻る',
  'nav.settings': '⚙ 設定',
};

const dictionaries: Record<SupportedLang, TranslationDict> = {
  'zh-CN': zhCN,
  en,
  ja,
};

/**
 * Translate a UI text key for the given language.
 * Returns the key itself if no translation is found.
 */
export function t(key: string, lang: string): string {
  const dict = dictionaries[lang as SupportedLang];
  if (dict && key in dict) return dict[key];
  // Fallback to zh-CN, then key
  if (key in zhCN) return zhCN[key];
  return key;
}

/** Get all translation keys (useful for testing completeness). */
export function getAllKeys(): string[] {
  return Object.keys(zhCN);
}

/** Get all supported language codes. */
export function getSupportedLangCodes(): SupportedLang[] {
  return SUPPORTED_UI_LANGS.map((l) => l.code);
}
