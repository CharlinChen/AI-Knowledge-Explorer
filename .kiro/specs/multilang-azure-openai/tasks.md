# Implementation Plan: 多语言支持与 Azure OpenAI 集成

## Overview

先实现后端变更（LLM Client Factory、LLMService 多语言支持、路由变更），再实现前端变更（LanguageSelector 组件、API 客户端、状态管理）。每个阶段包含对应的测试任务。

## Tasks

- [-] 1. 实现 LLM Client Factory
  - [x] 1.1 创建 `server/src/llmClientFactory.ts`
    - 实现 `createLLMClient()` 工厂函数
    - 根据 `LLM_PROVIDER` 环境变量选择创建 `OpenAI` 或 `AzureOpenAI` 客户端
    - Azure 模式下验证必需环境变量（`AZURE_OPENAI_API_KEY`、`AZURE_OPENAI_ENDPOINT`、`AZURE_OPENAI_DEPLOYMENT`），缺失时抛出包含变量名的错误
    - Azure 模式下 `AZURE_OPENAI_API_VERSION` 默认为 `"2024-08-01-preview"`
    - 返回 `{ client, model }` 配置对象
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 5.1, 6.1, 6.2_

  - [ ]* 1.2 编写 LLM Client Factory 属性测试 - Provider 选择
    - **Property 3: LLM client factory provider selection**
    - **Validates: Requirements 4.1, 4.2, 4.3**

  - [ ]* 1.3 编写 LLM Client Factory 属性测试 - Azure 配置验证
    - **Property 4: Azure configuration validation completeness**
    - **Validates: Requirements 6.1, 6.2**

- [-] 2. 修改 LLMService 支持多语言
  - [x] 2.1 修改 `server/src/llmService.ts` 增加语言参数
    - 添加 `getLanguageInstruction(lang?: string)` 私有方法，生成语言指令字符串
    - 修改 `generatePage(question, lang?)` 在 system prompt 中注入语言指令
    - 修改 `generateAppendContent(currentPage, question, lang?)` 在 system prompt 中注入语言指令
    - 修改 `generateModifiedContent(currentPage, instruction, lang?)` 在 system prompt 中注入语言指令
    - 无 lang 参数时默认使用 "zh-CN"
    - _Requirements: 1.5, 1.6, 2.1, 2.2, 2.3, 3.3, 3.4_

  - [ ]* 2.2 编写 LLMService 语言指令注入属性测试
    - **Property 1: Language instruction injection across all generation methods**
    - **Validates: Requirements 1.5, 2.1, 2.2, 2.3, 2.4, 3.3**

  - [ ]* 2.3 编写 LLMService 默认语言回退属性测试
    - **Property 2: Default language fallback**
    - **Validates: Requirements 1.6, 3.4**

- [x] 3. 修改后端路由和应用入口
  - [x] 3.1 修改 `server/src/routes.ts` 支持 lang 参数
    - POST /api/chat: 从 request body 提取 `lang` 字段，传递给 LLMService 的 generatePage、generateAppendContent、generateModifiedContent 方法
    - POST /api/pages/by-term: 从 request body 提取 `lang` 字段，传递给 LLMService 的 generatePage 方法
    - _Requirements: 3.1, 3.2, 2.4_

  - [x] 3.2 修改 `server/src/app.ts` 使用 LLM Client Factory
    - 引入 `createLLMClient` 替换现有的直接 `new OpenAI()` 调用
    - 使用工厂返回的 `client` 和 `model` 创建 LLMService
    - _Requirements: 4.1, 5.1, 5.3_

- [x] 4. Checkpoint - 确保后端变更正确
  - 确保所有测试通过，如有问题请询问用户。

- [x] 5. 实现前端多语言选择
  - [x] 5.1 创建 `client/src/components/LanguageSelector.tsx`
    - 实现语言选择下拉组件，包含支持的语言列表（zh-CN, en, ja, ko, fr, de, es）
    - 接收 `selectedLang` 和 `onLangChange` props
    - 显示语言的本地名称（如 "中文"、"English"）
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 5.2 修改 `client/src/api.ts` 支持 lang 参数
    - `chat()` 函数增加可选 `lang` 参数，包含在请求 body 中
    - `getPageByTerm()` 函数增加可选 `lang` 参数，包含在请求 body 中
    - _Requirements: 1.4, 3.1, 3.2_

  - [x] 5.3 修改 `client/src/App.tsx` 集成语言选择
    - 添加 `lang` 状态，默认值 "zh-CN"
    - 将 `lang` 状态传递给 ChatPanel 和 ContentPanel
    - 在调用 `chat()` 和 `getPageByTerm()` 时传递 `lang` 参数
    - _Requirements: 1.3, 1.4, 1.7_

  - [x] 5.4 修改 `client/src/components/ChatPanel.tsx` 集成 LanguageSelector
    - 在聊天面板头部区域添加 LanguageSelector 组件
    - 接收并传递 `lang` 和 `onLangChange` props
    - _Requirements: 1.1_

- [x] 6. Final Checkpoint - 确保所有变更正确
  - 确保所有测试通过，如有问题请询问用户。

## Notes

- 标记 `*` 的任务为可选任务，可跳过以加快 MVP 开发
- 每个任务引用了具体的需求编号以便追溯
- 后端变更先于前端，确保 API 就绪后再对接前端
- LLM 调用在测试中通过依赖注入替换为 mock 客户端
- 属性测试使用 fast-check 库，每个 property 对应一个独立测试
