# Design Document: 多语言支持与 Azure OpenAI 集成

## Overview

本设计为 AI Knowledge Explorer 增加两项功能：

1. **多语言支持**：在前端 Chat_Panel 头部增加语言选择器，用户选择目标语言后，所有 API 请求携带 `lang` 参数，后端 LLM_Service 在所有 prompt 中注入语言指令，使 LLM 以指定语言生成内容。
2. **Azure OpenAI 集成**：通过工厂函数根据环境变量创建对应的 OpenAI 客户端实例。由于 `openai` npm 包原生支持 Azure OpenAI（通过 `AzureOpenAI` 类），无需引入额外依赖，只需在应用启动时根据 `LLM_PROVIDER` 环境变量选择实例化 `OpenAI` 或 `AzureOpenAI`。

核心设计原则：最小改动，复用现有架构。LLM_Service 的 `LLMClient` 接口不变，仅在客户端创建层做分支。

## Architecture

```mermaid
graph TB
    subgraph Frontend [前端变更]
        LS[Language_Selector<br/>语言选择器]
        CP[Chat_Panel<br/>聊天面板]
    end

    subgraph Backend [后端变更]
        CF[createLLMClient<br/>工厂函数]
        LLM[LLM_Service<br/>大模型服务]
    end

    subgraph Providers [LLM Providers]
        OP[OpenAI Client]
        AZ[AzureOpenAI Client]
    end

    LS -->|lang 参数| CP
    CP -->|POST /api/chat {lang}| LLM
    CF -->|LLM_PROVIDER=openai| OP
    CF -->|LLM_PROVIDER=azure| AZ
    OP --> LLM
    AZ --> LLM
    LLM -->|prompt 含语言指令| Providers
```

### 变更范围

**前端**：
- 新增 `Language_Selector` 组件
- 修改 `ChatPanel` 传递 lang 参数
- 修改 `App.tsx` 管理语言状态
- 修改 `api.ts` 在请求中携带 lang 参数

**后端**：
- 新增 `server/src/llmClientFactory.ts` 工厂函数
- 修改 `LLMService` 所有生成方法接受 `lang` 参数并注入到 prompt
- 修改 `routes.ts` 从请求中提取 `lang` 参数并传递给 LLMService
- 修改 `app.ts` 使用工厂函数创建 LLM 客户端

## Components and Interfaces

### 前端组件

#### Language_Selector

位于 Chat_Panel 头部区域的下拉选择器。

```typescript
// client/src/components/LanguageSelector.tsx
interface LanguageSelectorProps {
  selectedLang: string;
  onLangChange: (lang: string) => void;
}

const SUPPORTED_LANGUAGES = [
  { code: 'zh-CN', name: '中文' },
  { code: 'en', name: 'English' },
  { code: 'ja', name: '日本語' },
  { code: 'ko', name: '한국어' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'es', name: 'Español' },
];
```

#### 修改后的 API 客户端

```typescript
// client/src/api.ts 变更
export async function chat(message: string, currentPageId?: string, lang?: string): Promise<ChatResponse> {
  const res = await fetch(`${BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, currentPageId, lang }),
  });
  // ...
}

export async function getPageByTerm(term: string, lang?: string): Promise<ByTermResponse> {
  const res = await fetch(`${BASE}/pages/by-term`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ term, lang }),
  });
  // ...
}
```

### 后端服务

#### LLM Client Factory

```typescript
// server/src/llmClientFactory.ts
import OpenAI, { AzureOpenAI } from 'openai';

export interface LLMClientConfig {
  client: OpenAI;  // AzureOpenAI extends OpenAI
  model: string;
}

export function createLLMClient(): LLMClientConfig {
  const provider = (process.env.LLM_PROVIDER || 'openai').toLowerCase();

  if (provider === 'azure') {
    return createAzureClient();
  }
  return createOpenAIClient();
}

function createAzureClient(): LLMClientConfig {
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT;
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-08-01-preview';

  if (!apiKey || !endpoint || !deployment) {
    const missing = [
      !apiKey && 'AZURE_OPENAI_API_KEY',
      !endpoint && 'AZURE_OPENAI_ENDPOINT',
      !deployment && 'AZURE_OPENAI_DEPLOYMENT',
    ].filter(Boolean);
    throw new Error(`Missing required Azure OpenAI environment variables: ${missing.join(', ')}`);
  }

  const client = new AzureOpenAI({
    apiKey,
    endpoint,
    deployment,
    apiVersion,
  });

  return { client, model: deployment };
}

function createOpenAIClient(): LLMClientConfig {
  const client = new OpenAI({
    baseURL: process.env.OPENAI_BASE_URL || undefined,
  });
  return { client, model: process.env.OPENAI_MODEL || 'gpt-4o' };
}
```

#### 修改后的 LLM_Service 接口

LLM_Service 的所有生成方法增加可选的 `lang` 参数：

```typescript
// server/src/llmService.ts 变更
class LLMService {
  // 语言指令生成
  private getLanguageInstruction(lang?: string): string {
    const targetLang = lang || 'zh-CN';
    return `你必须使用 ${targetLang} 语言生成所有内容（包括标题、正文和摘要）。`;
  }

  async generatePage(question: string, lang?: string): Promise<GeneratedPage> { ... }
  async generateAppendContent(currentPage: KnowledgePage, question: string, lang?: string): Promise<string> { ... }
  async generateModifiedContent(currentPage: KnowledgePage, instruction: string, lang?: string): Promise<string> { ... }
}
```

#### 修改后的 Routes

```typescript
// server/src/routes.ts 变更
// POST /api/chat body 增加 lang 字段
const { message, currentPageId, lang } = req.body;
// 传递给 LLMService 方法
const generated = await llmService.generatePage(message, lang);

// POST /api/pages/by-term body 增加 lang 字段
const { term, lang } = req.body;
const generated = await llmService.generatePage(term.trim(), lang);
```

## Data Models

### 支持的语言列表

```typescript
const SUPPORTED_LANGUAGES: { code: string; name: string }[] = [
  { code: 'zh-CN', name: '中文' },
  { code: 'en', name: 'English' },
  { code: 'ja', name: '日本語' },
  { code: 'ko', name: '한국어' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'es', name: 'Español' },
];
```

语言列表定义在前端，后端不做语言代码白名单校验（LLM 能处理大多数 BCP 47 标签）。如果传入不支持的 langcode，LLM 会尽力处理或回退到默认行为，系统不会报错。

### 环境变量配置

| 变量名 | 用途 | 默认值 | 必需 |
|--------|------|--------|------|
| `LLM_PROVIDER` | LLM 提供商选择 | `"openai"` | 否 |
| `OPENAI_BASE_URL` | OpenAI 兼容 API 地址 | OpenAI 官方 | 否 |
| `OPENAI_MODEL` | OpenAI 模型名 | `"gpt-4o"` | 否 |
| `AZURE_OPENAI_API_KEY` | Azure OpenAI API 密钥 | - | Azure 模式必需 |
| `AZURE_OPENAI_ENDPOINT` | Azure OpenAI 端点 URL | - | Azure 模式必需 |
| `AZURE_OPENAI_DEPLOYMENT` | Azure OpenAI 部署名 | - | Azure 模式必需 |
| `AZURE_OPENAI_API_VERSION` | Azure OpenAI API 版本 | `"2024-08-01-preview"` | 否 |

### 请求/响应变更

现有的 `ChatResponse`、`KnowledgePage` 等数据模型不变。仅在请求 body 中增加可选的 `lang` 字段：

```typescript
// POST /api/chat 请求体
interface ChatRequest {
  message: string;
  currentPageId?: string;
  lang?: string;  // 新增
}

// POST /api/pages/by-term 请求体
interface ByTermRequest {
  term: string;
  lang?: string;  // 新增
}
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Language instruction injection across all generation methods

*For any* valid langcode string and *for any* LLM generation method (generatePage, generateAppendContent, generateModifiedContent), the prompt sent to the LLM SHALL contain a language instruction that references the provided langcode.

**Validates: Requirements 1.5, 2.1, 2.2, 2.3, 2.4, 3.3**

### Property 2: Default language fallback

*For any* call to an LLM generation method where no langcode is provided (undefined or null), the prompt sent to the LLM SHALL contain a language instruction referencing "zh-CN".

**Validates: Requirements 1.6, 3.4**

### Property 3: LLM client factory provider selection

*For any* provider string value, the createLLMClient factory SHALL return an OpenAI client instance when the provider is "openai" or unset, and an AzureOpenAI client instance when the provider is "azure".

**Validates: Requirements 4.1, 4.2, 4.3**

### Property 4: Azure configuration validation completeness

*For any* non-empty subset of required Azure environment variables (`AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_DEPLOYMENT`) that is missing, the createLLMClient factory SHALL throw an error whose message contains the name of each missing variable.

**Validates: Requirements 6.1, 6.2**

## Error Handling

### LLM Provider 初始化错误
- Azure 模式下缺少必需环境变量时，`createLLMClient` 抛出包含缺失变量名的 Error
- 应用启动代码（`app.ts`）捕获该错误，记录日志并退出进程

### 语言参数处理
- `lang` 参数为可选字段，缺失时使用默认值 `"zh-CN"`
- 不对 langcode 做白名单校验，LLM 能处理大多数语言标签
- 如果 LLM 无法识别某个 langcode，它会尽力处理，系统不会报错

### 现有错误处理不变
- LLM API 调用失败、超时、格式错误等错误处理逻辑保持不变
- 输入验证（空消息、长度限制）保持不变

## Testing Strategy

### 技术栈

沿用现有技术栈：
- **测试框架**: Vitest
- **Property-Based Testing**: fast-check
- **语言**: TypeScript

### 单元测试

- LLM Client Factory 的 provider 选择逻辑
- Azure 配置验证（缺失变量场景）
- API 路由中 lang 参数的提取和传递
- Language_Selector 组件渲染

### Property-Based Testing

使用 fast-check 库，每个属性测试运行至少 100 次迭代。

每个测试用注释标注对应的设计属性：
- 格式: `// Feature: multilang-azure-openai, Property N: [property text]`

属性测试覆盖：
- Property 1: 语言指令注入 — 生成随机 langcode 字符串，验证所有 LLM 方法的 prompt 包含该 langcode
- Property 2: 默认语言回退 — 验证 undefined/null lang 时 prompt 包含 "zh-CN"
- Property 3: Provider 选择 — 验证工厂函数根据 provider 字符串返回正确的客户端类型
- Property 4: Azure 配置验证 — 生成缺失变量的随机子集，验证错误消息包含所有缺失变量名

### 测试策略说明

- 单元测试和属性测试互为补充
- LLM 调用通过依赖注入的 mock 客户端测试，验证 prompt 构建逻辑而非 LLM 行为
- 工厂函数测试通过临时设置环境变量实现
- 每个 correctness property 对应一个独立的 property-based test
