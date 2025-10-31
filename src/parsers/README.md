# Parsers 模組

提供解析 n8n 節點資訊的工具。

## 模組說明

### 1. NodeParser (node-parser.ts)

解析節點結構，提取基本資訊和分類。

功能：
- 提取 nodeType, displayName, description, category
- 判斷節點類型（trigger/action/webhook/ai）
- 提取版本資訊
- 處理版本化節點（nodeVersions）

使用範例：

```typescript
import { NodeParser } from './parsers';

const parser = new NodeParser();
const nodeInfo = parser.parse(nodeClass, '@n8n/n8n-nodes-base');

console.log(nodeInfo);
// {
//   nodeType: 'base.HttpRequest',
//   displayName: 'HTTP Request',
//   description: 'Makes an HTTP request',
//   category: 'core',
//   nodeCategory: 'action',
//   version: '2',
//   packageName: '@n8n/n8n-nodes-base'
// }
```

### 2. PropertyParser (property-parser.ts)

解析節點屬性，只保留核心屬性（最多 10 個）。

功能：
- 提取屬性名稱、類型、描述
- 識別必填屬性
- 限制輸出最多 10 個核心屬性
- 提取操作列表（operations）
- 偵測憑證需求

使用範例：

```typescript
import { PropertyParser } from './parsers';

const parser = new PropertyParser();
const props = parser.parse(nodeClass);

console.log(props);
// {
//   coreProperties: [
//     {
//       name: 'method',
//       displayName: 'Method',
//       type: 'options',
//       required: true,
//       options: [
//         { name: 'GET', value: 'GET' },
//         { name: 'POST', value: 'POST' }
//       ]
//     }
//   ],
//   operations: [
//     {
//       name: 'Get User',
//       value: 'getUser',
//       description: 'Retrieve user information',
//       resource: 'user'
//     }
//   ],
//   hasCredentials: true,
//   totalPropertyCount: 15
// }
```

### 3. DocsParser (docs-parser.ts)

解析文件內容，提取關鍵資訊。

功能：
- 提取描述、使用說明、範例
- 清理 Markdown 格式
- 提取關鍵字和標籤
- 生成官方文件連結

使用範例：

```typescript
import { parseDocumentation } from './parsers';

const docs = parseDocumentation(markdownContent, 'HttpRequest', {
  maxSummaryLength: 300,
  maxExamples: 3,
  extractKeywords: true
});

console.log(docs);
// {
//   description: 'Makes HTTP requests to external APIs...',
//   usage: 'Configure the method, URL, and headers...',
//   examples: ['GET request example...', 'POST with JSON...'],
//   keywords: ['http', 'request', 'api', 'rest'],
//   tags: ['api', 'rest', 'http'],
//   officialUrl: 'https://docs.n8n.io/integrations/...'
// }
```

## 型別定義

### NodeClass

```typescript
type NodeClass =
  | (new () => any)
  | { description?: any; nodeVersions?: any };
```

### ParsedNode

```typescript
interface ParsedNode {
  nodeType: string;
  displayName: string;
  description?: string;
  category?: string;
  nodeCategory: 'trigger' | 'action' | 'webhook' | 'ai';
  version: string;
  packageName: string;
}
```

### CoreProperty

```typescript
interface CoreProperty {
  name: string;
  displayName: string;
  type: string;
  description?: string;
  required: boolean;
  default?: any;
  options?: Array<{
    name: string;
    value: string;
    description?: string;
  }>;
}
```

### Operation

```typescript
interface Operation {
  name: string;
  value: string;
  description?: string;
  resource?: string;
}
```

## 設計原則

1. 精簡輸出：只保留 AI 需要的核心資訊
2. 智慧選擇：自動優先選擇必填和重要屬性
3. 版本支援：正確處理版本化節點
4. 型別安全：提供完整的 TypeScript 型別定義
