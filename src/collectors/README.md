# Collectors 模組

這個目錄包含用於收集 n8n 相關資料的收集器。

## DocsCollector

從 n8n-docs 儲存庫收集節點文件摘要。

### 功能特點

1. 自動 clone 或更新 n8n-docs 儲存庫
2. 支援多個文件分類（core-nodes, app-nodes, trigger-nodes, cluster-nodes）
3. 只提取文件摘要（預設前 300 字），遵守授權要求
4. 建立節點名稱到文件的映射
5. 包含版權聲明和原始連結

### 使用範例

```typescript
import { createDocsCollector } from './collectors/docs-collector';

const collector = createDocsCollector({
  summaryLength: 200, // 可選，預設 300 字
});

// 收集所有節點文件摘要
const summaries = await collector.collectDocsSummaries();

// 搜尋特定節點
const httpNode = await collector.getNodeDocSummary('http-request');
if (httpNode) {
  console.log(httpNode.summary);
  console.log(httpNode.url);
}

// 清理快取
await collector.clearCache();
```

### 配置選項

```typescript
interface DocsCollectorConfig {
  repoUrl?: string;        // 預設: 'https://github.com/n8n-io/n8n-docs.git'
  localPath?: string;      // 預設: '.cache/n8n-docs'
  summaryLength?: number;  // 預設: 300
  categories?: string[];   // 預設: ['core-nodes', 'app-nodes', 'trigger-nodes', 'cluster-nodes']
}
```

### 資料結構

```typescript
interface NodeDocSummary {
  nodeName: string;      // 節點名稱
  summary: string;       // 文件摘要（前 N 字）
  url: string;          // 線上文件連結
  category: string;     // 文件分類
  copyright: string;    // 版權聲明
}
```

### 授權說明

DocsCollector 遵守 n8n-docs 儲存庫的授權要求：

- 只提取文件摘要，不完整複製內容
- 包含原始文件連結
- 保留版權聲明
- 符合 Fair Use 原則

### 注意事項

1. 首次執行會 clone n8n-docs 儲存庫，可能需要幾分鐘
2. 後續執行會自動更新儲存庫以獲取最新文件
3. 快取儲存在 `.cache/n8n-docs` 目錄
4. 可以使用 `clearCache()` 方法清理快取

## ApiCollector

從 n8n.io API 收集工作流程範本和節點資訊。

### 功能特點

1. 抓取熱門範本列表
2. 統計節點使用頻率
3. 依分類抓取範本
4. 搜尋範本
5. 取得特定範本詳細資訊
6. 自動重試機制（最多 3 次）
7. 指數退避延遲
8. 完整的錯誤處理
9. 請求逾時保護

### 使用範例

```typescript
import { ApiCollector, fetchPopularTemplates } from './collectors/api-collector';

// 方式 1: 使用類別
const collector = new ApiCollector({
  limit: 100,          // 抓取數量
  timeout: 30000,      // 請求逾時時間（毫秒）
  maxRetries: 3,       // 最大重試次數
  retryDelay: 1000,    // 重試延遲（毫秒）
});

// 抓取熱門範本
const result = await collector.fetchTemplates();
console.log(`抓取了 ${result.templates.length} 個範本`);
console.log(`總範本數量: ${result.totalTemplates}`);

// 顯示節點使用統計
collector.printNodeUsageStats(result.nodeUsageStats, 20);

// 搜尋範本
const searchResults = await collector.searchTemplates('slack', 10);

// 依分類抓取範本
const categoryResults = await collector.fetchTemplatesByCategory('AI', 20);

// 取得特定範本
const template = await collector.fetchTemplateById(6270);

// 方式 2: 使用便利函數
const popularTemplates = await fetchPopularTemplates(100);
```

### 配置選項

```typescript
interface ApiCollectorConfig {
  baseUrl?: string;      // 預設: 'https://api.n8n.io/api'
  maxRetries?: number;   // 預設: 3
  retryDelay?: number;   // 預設: 1000ms
  timeout?: number;      // 預設: 30000ms
  limit?: number;        // 預設: 100
}
```

### 回傳資料結構

```typescript
interface TemplateCollectionResult {
  templates: Template[];           // 範本列表
  nodeUsageStats: NodeUsageStats;  // 節點使用統計
  totalTemplates: number;          // 總範本數量
  collectedAt: string;             // 收集時間（ISO 8601）
}

interface Template {
  id: number;                      // 範本 ID
  name: string;                    // 範本名稱
  description: string;             // 範本描述
  totalViews: number;              // 瀏覽次數
  createdAt: string;               // 建立時間
  user: TemplateUser;              // 作者資訊
  nodes: TemplateNode[];           // 節點列表
}

interface NodeUsageStats {
  [nodeType: string]: {
    count: number;                 // 使用次數
    percentage: number;            // 使用百分比
  };
}
```

### API 端點

使用 n8n.io 官方 API：

- 基礎 URL: `https://api.n8n.io/api/`
- 範本搜尋: `/templates/search`
- 範本詳情: `/templates/{id}`

### 注意事項

1. API 請求受到速率限制，建議在請求之間加入適當的延遲
2. 大量抓取範本時請考慮使用較小的 limit 值並進行分頁
3. 重試機制使用指數退避策略，避免對 API 造成過大負擔
4. 節點統計會自動按使用頻率排序
