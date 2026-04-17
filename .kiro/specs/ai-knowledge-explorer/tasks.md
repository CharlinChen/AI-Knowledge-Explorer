# Implementation Plan: AI Knowledge Explorer (迭代 2)

## Overview

基于现有代码库，增量实现 6 个改进：i18n 本地化、设置页面、Tab 关闭、title 匹配去重、term 标题一致性、流式生成。每个功能模块独立实现并测试，最后集成。

## Tasks

- [x] 1. 实现 i18n 本地化模块
  - [x] 1.1 创建 i18n 翻译模块
    - 创建 `client/src/i18n.ts`，定义翻译字典类型和 `t(key, lang)` 函数
    - 实现 zh-CN、en、ja 三套翻译，覆盖所有 UI 文本（按钮、标签、标题、占位符、指南文本）
    - 实现 localStorage 读写语言偏好（key: `explorer-lang`）
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [ ]* 1.2 编写 i18n 翻译完整性属性测试
    - **Property 9: Translation completeness**
    - **Validates: Requirements 6.1**

  - [ ]* 1.3 编写语言偏好持久化属性测试
    - **Property 10: Language preference persistence round-trip**
    - **Validates: Requirements 6.3, 6.4**

  - [x] 1.4 将 i18n 集成到所有前端组件
    - 修改 `App.tsx`：初始化时从 localStorage 读取语言，将 lang 和 t 传递给子组件
    - 修改 `ChatPanel.tsx`：替换所有硬编码中文为 `t()` 调用
    - 修改 `HomePage.tsx`：替换所有硬编码中文为 `t()` 调用
    - 修改 `PageNavigator.tsx`：替换所有硬编码中文为 `t()` 调用
    - 修改 `ContentPanel.tsx`：替换所有硬编码中文为 `t()` 调用
    - 修改 `LanguageSelector.tsx`：使用 `t()` 获取 aria-label
    - 语言切换同时影响 UI 文本和 LLM 内容生成语言
    - _Requirements: 6.1, 6.5_

- [x] 2. 实现设置页面与运行时配置
  - [x] 2.1 创建后端 Config_Store 模块
    - 创建 `server/src/configStore.ts`，实现 `getSettings()` 和 `saveSettings()` 方法
    - 在 `server/src/db.ts` 中添加 `app_config` 表的创建
    - API Key 加密存储（AES-256-GCM，密钥从 `CONFIG_ENCRYPTION_KEY` 环境变量读取）
    - _Requirements: 7.5, 7.6_

  - [ ]* 2.2 编写设置持久化属性测试
    - **Property 11: Settings persistence round-trip**
    - **Validates: Requirements 7.5**

  - [x] 2.3 创建设置 API 路由
    - 在 `server/src/routes.ts` 中添加 `GET /api/settings` 和 `PUT /api/settings` 端点
    - GET 返回当前配置（API Key 脱敏显示）
    - PUT 验证并保存配置，重新创建 LLM 客户端
    - 无配置时返回空对象，前端显示未配置状态
    - _Requirements: 7.1, 7.2, 7.5, 7.7_

  - [x] 2.4 修改 LLM Client Factory 支持运行时配置
    - 修改 `server/src/llmClientFactory.ts`，新增 `createLLMClientFromConfig(config)` 方法
    - 修改 `server/src/app.ts`，启动时优先从 Config_Store 加载配置，无配置时回退到环境变量
    - 聊天端点在无可用配置时返回 HTTP 503 错误提示
    - _Requirements: 7.6, 7.7_

  - [x] 2.5 创建前端 Settings_Page 组件
    - 创建 `client/src/components/SettingsPage.tsx`
    - 实现提供商选择（OpenAI / Azure OpenAI）和对应配置字段
    - 实现保存和加载逻辑
    - 在 `client/src/api.ts` 中添加 `getSettings()` 和 `saveSettings()` API 调用
    - 在 `App.tsx` 中添加设置页面路由（通过状态切换，非 router）
    - 在顶部导航添加设置按钮
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 3. Checkpoint - 确保 i18n 和设置功能测试通过
  - 确保所有测试通过，如有问题请询问用户。

- [x] 4. 实现 Tab 页管理
  - [x] 4.1 创建 Tab 管理逻辑和 TabBar 组件
    - 创建 `client/src/tabManager.ts`，实现纯函数 `addTab()` 和 `closeTab()`
    - 创建 `client/src/components/TabBar.tsx` 组件，渲染 tab 列表、关闭按钮、点击切换
    - 修改 `App.tsx`：添加 `openTabs` 状态，集成 TabBar，打开页面时自动添加 tab
    - 关闭当前活动 tab 时切换到相邻 tab 或回到 Home_Page
    - 替换现有 PageNavigator 顶部 tab 展示为 TabBar 组件
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [ ]* 4.2 编写 Tab 管理属性测试
    - **Property 12: Tab management correctness**
    - **Validates: Requirements 8.3, 8.4**

- [x] 5. 修复 Marked_Term 标题匹配与去重
  - [x] 5.1 修改 by-term 端点和 LLM prompt 确保标题一致性
    - 修改 `server/src/routes.ts` 中 `POST /api/pages/by-term`：查找时使用 title 精确匹配（case-insensitive），无匹配时再尝试 LIKE 模糊匹配
    - 修改 `server/src/llmService.ts`：新增 `generatePageByTerm(term, lang)` 方法，prompt 中强制要求 title 必须等于传入的 term 原文
    - 修改 `server/src/pageStore.ts` 中 `findPageByTerm`：增加模糊匹配 fallback（`LIKE '%' || ? || '%'`）
    - _Requirements: 2.2, 2.3, 2.4, 2.5_

  - [ ]* 5.2 编写术语去重属性测试
    - **Property 5: Term deduplication and title matching**
    - **Validates: Requirements 2.2, 2.3, 2.4, 2.5**

- [x] 6. Checkpoint - 确保 Tab 和 term 匹配功能测试通过
  - 确保所有测试通过，如有问题请询问用户。

- [x] 7. 实现流式内容生成
  - [x] 7.1 后端实现 SSE 流式端点
    - 修改 `server/src/llmService.ts`：新增 `generatePageStream(question, lang)` 方法，使用 OpenAI SDK `stream: true`，返回 AsyncIterable
    - 修改 `server/src/llmService.ts`：新增 `generateAppendContentStream()` 和 `generateModifiedContentStream()` 流式方法
    - 在 `server/src/routes.ts` 中添加 `POST /api/chat/stream` SSE 端点
    - SSE 事件格式：intent（意图分类结果）、chunk（内容片段）、done（完成，含完整页面）、error（错误）
    - 流式完成后将完整内容保存到 Page_Store
    - _Requirements: 11.1, 11.2, 11.4_

  - [x] 7.2 前端实现流式内容渲染
    - 修改 `client/src/api.ts`：新增 `chatStream()` 方法，使用 `fetch` + `ReadableStream` 解析 SSE 事件
    - 修改 `client/src/components/ContentPanel.tsx`：支持流式渲染，逐步更新 innerHTML
    - 修改 `App.tsx`：`handleSend` 改为调用流式 API，逐步更新 currentPage 的 content
    - 流式进行中显示闪烁光标指示器
    - 流式中断时保留已接收内容并显示错误提示
    - _Requirements: 11.1, 11.3, 11.5, 11.6_

  - [x] 7.3 修改 by-term 端点支持流式生成
    - 修改 `POST /api/pages/by-term` 为 SSE 流式端点（当需要生成新页面时）
    - 修改 `client/src/api.ts` 中 `getPageByTerm` 支持流式响应
    - 修改 `App.tsx` 中 `handleTermClick` 使用流式 API
    - 已有页面直接返回 JSON（非流式）
    - _Requirements: 2.4, 11.1, 11.2_

- [x] 8. 样式更新与集成
  - [x] 8.1 更新 CSS 样式
    - 添加 TabBar 样式（tab 按钮、关闭按钮、活动状态、溢出滚动）
    - 添加 Settings_Page 样式（表单布局、输入框、按钮）
    - 添加流式渲染光标指示器样式
    - 更新顶部导航栏样式（设置按钮、语言选择器位置调整）
    - _Requirements: 8.1, 8.2, 7.1, 11.5_

- [x] 9. Final Checkpoint - 确保所有测试通过
  - 确保所有测试通过，如有问题请询问用户。

## Notes

- 标记 `*` 的任务为可选任务，可跳过以加快 MVP 开发
- 每个任务引用了具体的需求编号以便追溯
- Checkpoint 任务确保增量验证
- 属性测试验证通用正确性属性
- 单元测试验证具体示例和边界情况
- LLM 调用在测试中通过依赖注入替换为可控的 mock
- Tab 管理和 i18n 为纯函数模块，可直接属性测试
