# Requirements Document

## Introduction

AI Knowledge Explorer 是一个前后端网站，用户通过右侧聊天窗口提问，系统调用大模型在左侧生成结构化的知识页面。页面中的专有名词会被标记为可点击链接，点击后生成新的知识页面。所有生成的页面会被保存，支持后续浏览。用户还可以通过聊天对当前页面内容进行追问、修改或创建新页面。

本次迭代重点解决以下问题：
1. 语言设置仅影响 AI 回复语种，未影响页面 UI 语言
2. API Key 等配置需要在设置页面填入，而非启动时设置环境变量
3. 顶部打开的 tab 页没有关闭选项，导致页面积压
4. 页面跳转未基于 title 匹配，导致已生成的页面重复生成
5. 点击 Marked_Term 生成新页面时，标题与 tag 名不一致，导致每次点击重新生成
6. 左侧页面内容生成需要流式展示

## Glossary

- **Explorer**: AI Knowledge Explorer 系统整体
- **Chat_Panel**: 网页右侧的聊天窗口组件
- **Content_Panel**: 网页左侧的知识内容展示区域
- **Knowledge_Page**: 由大模型生成的一个知识主题页面，包含标题、正文和标记的专有名词
- **Marked_Term**: 知识页面中被标记的专有名词，可点击以生成新的知识页面
- **LLM_Service**: 后端调用大模型的服务层
- **Page_Store**: 负责持久化保存所有生成的知识页面的存储层
- **User**: 使用系统的终端用户
- **Home_Page**: 系统主页，展示已生成页面列表和使用指南
- **Settings_Page**: 系统设置页面，用于配置 LLM 提供商、API Key、模型等参数
- **Tab_Bar**: 顶部标签栏，展示当前打开的 Knowledge_Page 标签，支持切换和关闭
- **UI_Locale**: 前端界面的本地化语言设置，影响所有 UI 文本的显示语言
- **Streaming_Response**: 后端以 Server-Sent Events 方式逐步返回 LLM 生成内容的机制

## Requirements

### Requirement 1: 通过聊天提问生成知识页面

**User Story:** As a User, I want to ask questions in the Chat_Panel, so that the Explorer generates a Knowledge_Page on the Content_Panel.

#### Acceptance Criteria

1. WHEN a User submits a question in the Chat_Panel, THE LLM_Service SHALL generate a Knowledge_Page containing structured content related to the question
2. WHEN the LLM_Service generates a Knowledge_Page, THE Content_Panel SHALL display the Knowledge_Page in the left area of the screen
3. WHEN the LLM_Service generates content, THE LLM_Service SHALL identify and mark domain-specific terms as Marked_Terms within the generated content
4. IF the LLM_Service fails to generate content, THEN THE Explorer SHALL display an error message in the Chat_Panel and maintain the current Content_Panel state

### Requirement 2: 专有名词标记与点击导航

**User Story:** As a User, I want to click on Marked_Terms in a Knowledge_Page, so that the Explorer generates a new Knowledge_Page explaining that term.

#### Acceptance Criteria

1. THE Content_Panel SHALL render each Marked_Term as a visually distinct clickable element within the Knowledge_Page
2. WHEN a User clicks a Marked_Term, THE Explorer SHALL first search the Page_Store for an existing Knowledge_Page whose title matches the Marked_Term text (case-insensitive)
3. WHEN a Knowledge_Page for a clicked Marked_Term already exists in the Page_Store, THE Content_Panel SHALL navigate to the existing page instead of generating a new one
4. WHEN no existing Knowledge_Page matches the Marked_Term, THE LLM_Service SHALL generate a new Knowledge_Page with its title set to the exact Marked_Term text
5. WHEN the LLM_Service generates a Knowledge_Page from a Marked_Term click, THE LLM_Service SHALL set the page title to match the Marked_Term text exactly

### Requirement 3: 知识页面持久化与浏览

**User Story:** As a User, I want all generated Knowledge_Pages to be saved, so that I can browse and revisit them later.

#### Acceptance Criteria

1. WHEN a Knowledge_Page is generated, THE Page_Store SHALL persist the Knowledge_Page immediately
2. THE Explorer SHALL provide a page list or navigation mechanism for the User to browse all saved Knowledge_Pages
3. WHEN a User selects a saved Knowledge_Page from the navigation, THE Content_Panel SHALL display that Knowledge_Page
4. THE Page_Store SHALL store each Knowledge_Page with its title, content, creation timestamp, and relationships to other pages

### Requirement 4: 基于当前页面的追问与内容追加

**User Story:** As a User, I want to ask follow-up questions about the current Knowledge_Page, so that related content is appended to the current page.

#### Acceptance Criteria

1. WHEN a User submits a question in the Chat_Panel while a Knowledge_Page is displayed, THE LLM_Service SHALL determine whether the question is related to the current Knowledge_Page topic
2. WHEN the question is related to the current Knowledge_Page topic, THE LLM_Service SHALL generate additional content and THE Content_Panel SHALL append it to the current Knowledge_Page
3. WHEN the question is unrelated to the current Knowledge_Page topic, THE LLM_Service SHALL generate a new Knowledge_Page and THE Content_Panel SHALL display the new page
4. WHEN a new Knowledge_Page is created from an unrelated question, THE Explorer SHALL add a link from the original Knowledge_Page to the new Knowledge_Page

### Requirement 5: 通过聊天修改页面内容

**User Story:** As a User, I want to instruct the LLM to modify the current Knowledge_Page content via the Chat_Panel, so that I can refine or correct the displayed information.

#### Acceptance Criteria

1. WHEN a User submits a modification request in the Chat_Panel, THE LLM_Service SHALL identify the request as a content modification intent
2. WHEN a modification intent is identified, THE LLM_Service SHALL generate updated content for the current Knowledge_Page
3. WHEN updated content is generated, THE Content_Panel SHALL replace the current Knowledge_Page content with the updated version
4. WHEN a Knowledge_Page is modified, THE Page_Store SHALL persist the updated version of the Knowledge_Page

### Requirement 6: UI 多语言本地化

**User Story:** As a User, I want the Explorer UI to display in my selected language, so that I can use the system comfortably in my preferred language.

#### Acceptance Criteria

1. WHEN a User selects a language in the Language_Selector, THE Explorer SHALL update all UI text elements (buttons, labels, headings, placeholders, guide text) to the selected language
2. THE Explorer SHALL support at least the following UI languages: 中文 (zh-CN), English (en), 日本語 (ja)
3. WHEN a User selects a language, THE Explorer SHALL persist the language preference in the browser local storage
4. WHEN a User revisits the Explorer, THE Explorer SHALL restore the previously selected UI language from local storage
5. WHEN a User selects a language, THE Explorer SHALL use the same language setting for both UI text and LLM content generation

### Requirement 7: 设置页面与运行时配置

**User Story:** As a User, I want to configure LLM provider and API key through a settings page, so that I can use the system without setting environment variables at startup.

#### Acceptance Criteria

1. THE Explorer SHALL provide a Settings_Page accessible from the main navigation
2. THE Settings_Page SHALL allow the User to select an LLM provider (OpenAI or Azure OpenAI)
3. WHEN the User selects OpenAI as the provider, THE Settings_Page SHALL display input fields for API Key, Base URL (optional), and Model name
4. WHEN the User selects Azure OpenAI as the provider, THE Settings_Page SHALL display input fields for API Key, Endpoint, Deployment name, and API Version
5. WHEN the User saves settings, THE Explorer SHALL persist the configuration on the server and use it for subsequent LLM calls
6. WHEN the server has no runtime configuration saved, THE Explorer SHALL fall back to environment variables for LLM configuration
7. WHEN the User submits a chat message and no LLM configuration is available (neither runtime settings nor environment variables), THE Explorer SHALL return an error instructing the User to configure settings

### Requirement 8: Tab 页管理

**User Story:** As a User, I want to close tabs in the Tab_Bar, so that I can manage my open pages and avoid tab accumulation.

#### Acceptance Criteria

1. WHEN a Knowledge_Page is opened, THE Tab_Bar SHALL display a tab for that page with the page title
2. THE Tab_Bar SHALL display a close button on each tab
3. WHEN a User clicks the close button on a tab, THE Tab_Bar SHALL remove that tab from the Tab_Bar
4. WHEN the currently active tab is closed, THE Explorer SHALL switch to the nearest remaining tab, or navigate to the Home_Page if no tabs remain
5. WHEN a User clicks on a tab, THE Content_Panel SHALL display the corresponding Knowledge_Page

### Requirement 9: 主页展示与使用指南

**User Story:** As a User, I want to see a Home_Page when I first visit the Explorer, so that I can view all generated Knowledge_Pages and understand how to use the system.

#### Acceptance Criteria

1. WHEN a User visits the Explorer without a specific page context, THE Content_Panel SHALL display the Home_Page
2. THE Home_Page SHALL display a list of all saved Knowledge_Page titles, each linking to the corresponding Knowledge_Page
3. WHEN no Knowledge_Pages exist in the Page_Store, THE Home_Page SHALL display a welcome message and usage instructions
4. THE Home_Page SHALL include a usage guide section explaining how to ask questions, click Marked_Terms, append content, and modify pages
5. WHEN a new Knowledge_Page is generated or an existing one is updated, THE Home_Page SHALL reflect the change when the User navigates back to it

### Requirement 10: 聊天交互与消息展示

**User Story:** As a User, I want to see my chat history and system responses in the Chat_Panel, so that I can track my interactions.

#### Acceptance Criteria

1. THE Chat_Panel SHALL display all User messages and system responses in chronological order
2. WHEN the LLM_Service is processing a request, THE Chat_Panel SHALL display a loading indicator
3. WHEN the LLM_Service completes a response, THE Chat_Panel SHALL display a summary of the action taken
4. THE Chat_Panel SHALL provide an input field and a submit mechanism for the User to enter questions or instructions

### Requirement 11: 流式内容生成展示

**User Story:** As a User, I want to see Knowledge_Page content appear progressively as it is generated, so that I can start reading without waiting for the full generation to complete.

#### Acceptance Criteria

1. WHEN the LLM_Service generates a Knowledge_Page, THE Content_Panel SHALL display content progressively as chunks arrive from the server
2. WHEN streaming content, THE server SHALL send content chunks via Server-Sent Events (SSE) to the client
3. WHEN streaming is in progress, THE Content_Panel SHALL render the partial HTML content in real-time
4. WHEN streaming completes, THE Page_Store SHALL persist the complete Knowledge_Page
5. WHEN streaming is in progress, THE Content_Panel SHALL display a visual indicator that content generation is ongoing
6. IF the streaming connection is interrupted, THEN THE Explorer SHALL display an error message and preserve any content already received
