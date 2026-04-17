# Requirements Document

## Introduction

本功能为 AI Knowledge Explorer 增加两项能力：（1）多语言支持——用户可以通过选择语言代码（langcode）指定 AI 生成内容的语种；（2）Azure OpenAI API 支持——后端 LLM_Service 除了支持现有的 OpenAI 兼容 API，还需支持 Azure OpenAI 的 API 端点和认证方式。

## Glossary

- **Explorer**: AI Knowledge Explorer 系统整体
- **Chat_Panel**: 网页右侧的聊天窗口组件
- **Content_Panel**: 网页左侧的知识内容展示区域
- **LLM_Service**: 后端调用大模型的服务层
- **Language_Selector**: 前端语言选择组件，允许用户选择 AI 生成内容的目标语言
- **Langcode**: BCP 47 语言标签（如 "zh-CN"、"en"、"ja"、"ko"），用于指定 AI 输出语种
- **Azure_OpenAI_Provider**: 通过 Azure OpenAI Service 端点调用大模型的后端适配层
- **OpenAI_Provider**: 通过标准 OpenAI 兼容 API 调用大模型的后端适配层
- **LLM_Provider**: Azure_OpenAI_Provider 或 OpenAI_Provider 的统称

## Requirements

### Requirement 1: 用户选择 AI 生成内容的语言

**User Story:** As a User, I want to select a language for AI-generated content, so that Knowledge_Pages are generated in my preferred language.

#### Acceptance Criteria

1. THE Explorer SHALL display a Language_Selector component in the Chat_Panel header area
2. THE Language_Selector SHALL provide a list of supported languages with their display names (e.g., "中文", "English", "日本語", "한국어")
3. WHEN a User selects a language from the Language_Selector, THE Explorer SHALL store the selected Langcode in the application state
4. WHEN a User submits a question in the Chat_Panel, THE Explorer SHALL include the selected Langcode in the API request to the backend
5. WHEN the LLM_Service receives a request with a Langcode, THE LLM_Service SHALL instruct the LLM to generate content in the language specified by the Langcode
6. WHEN no Langcode is provided in the request, THE LLM_Service SHALL default to generating content in Chinese (zh-CN)
7. THE Language_Selector SHALL persist the selected language across page navigations within the same session

### Requirement 2: 多语言内容生成

**User Story:** As a User, I want all AI-generated content (including appended and modified content) to respect my language selection, so that the entire Knowledge_Page remains in a consistent language.

#### Acceptance Criteria

1. WHEN the LLM_Service generates a new Knowledge_Page, THE LLM_Service SHALL produce the title, content, and summary in the language specified by the Langcode
2. WHEN the LLM_Service generates append content, THE LLM_Service SHALL produce the appended content in the language specified by the Langcode
3. WHEN the LLM_Service generates modified content, THE LLM_Service SHALL produce the modified content in the language specified by the Langcode
4. WHEN the LLM_Service generates content for a Marked_Term click, THE LLM_Service SHALL produce the term page in the language specified by the Langcode

### Requirement 3: 多语言 API 接口扩展

**User Story:** As a developer, I want the backend API to accept a language parameter, so that the LLM_Service can generate content in the requested language.

#### Acceptance Criteria

1. THE POST /api/chat endpoint SHALL accept an optional `lang` field in the request body
2. THE POST /api/pages/by-term endpoint SHALL accept an optional `lang` field in the request body
3. WHEN a valid Langcode is provided, THE LLM_Service SHALL use the Langcode to set the output language in all LLM prompts
4. IF an unsupported or invalid Langcode is provided, THEN THE LLM_Service SHALL fall back to the default language (zh-CN) and proceed normally

### Requirement 4: 支持 Azure OpenAI API

**User Story:** As a system administrator, I want to configure the Explorer to use Azure OpenAI Service, so that I can leverage my organization's Azure OpenAI deployment.

#### Acceptance Criteria

1. THE LLM_Service SHALL support two provider modes: OpenAI_Provider and Azure_OpenAI_Provider
2. WHEN the environment variable `LLM_PROVIDER` is set to "azure", THE LLM_Service SHALL use the Azure_OpenAI_Provider
3. WHEN the environment variable `LLM_PROVIDER` is not set or set to "openai", THE LLM_Service SHALL use the OpenAI_Provider
4. THE Azure_OpenAI_Provider SHALL authenticate using the `AZURE_OPENAI_API_KEY` environment variable
5. THE Azure_OpenAI_Provider SHALL connect to the endpoint specified by the `AZURE_OPENAI_ENDPOINT` environment variable
6. THE Azure_OpenAI_Provider SHALL use the deployment name specified by the `AZURE_OPENAI_DEPLOYMENT` environment variable
7. THE Azure_OpenAI_Provider SHALL use the API version specified by the `AZURE_OPENAI_API_VERSION` environment variable, defaulting to "2024-08-01-preview" when not set

### Requirement 5: LLM Provider 统一接口

**User Story:** As a developer, I want a unified interface for LLM providers, so that the rest of the application does not need to know which provider is being used.

#### Acceptance Criteria

1. THE LLM_Service SHALL use the same LLMClient interface for both OpenAI_Provider and Azure_OpenAI_Provider
2. WHEN the LLM_Provider is switched via environment variables, THE LLM_Service SHALL function identically from the perspective of the API routes
3. IF the configured LLM_Provider fails to initialize (e.g., missing required environment variables for Azure), THEN THE Explorer SHALL log a descriptive error and fail to start

### Requirement 6: Azure OpenAI 配置验证

**User Story:** As a system administrator, I want the system to validate Azure OpenAI configuration at startup, so that I am notified of misconfigurations before the system accepts requests.

#### Acceptance Criteria

1. WHEN `LLM_PROVIDER` is set to "azure", THE Explorer SHALL verify that `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_ENDPOINT`, and `AZURE_OPENAI_DEPLOYMENT` environment variables are all set
2. IF any required Azure environment variable is missing, THEN THE Explorer SHALL log an error message identifying the missing variable and exit with a non-zero status code
