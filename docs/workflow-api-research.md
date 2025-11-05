# n8n.io Workflow API 研究報告

中文版 | [English](./workflow-api-research.en.md)

作成日期: 2025-11-03

## 執行摘要

經過研究，我們成功找到了 n8n.io 提供的完整工作流程定義 API。這個 API 能夠提供包含節點配置、連接關係、參數設定等完整的 workflow JSON 定義。

## 1. 目前使用的 API Endpoint

### 1.1 現有實作 (src/collectors/api-collector.ts)

目前使用的 endpoint:

```
GET https://api.n8n.io/api/templates/search
參數:
- page: 頁碼
- rows: 每頁數量
- category: 分類篩選 (可選)
- search: 搜尋關鍵字 (可選)
```

回傳資料結構:

```typescript
interface TemplateApiResponse {
  totalWorkflows: number;
  workflows: Template[];
}

interface Template {
  id: number;
  name: string;
  description: string;
  totalViews: number;
  createdAt: string;
  user: TemplateUser;
  nodes: TemplateNode[];  // 只包含節點的基本資訊 (id, name, displayName)
}
```

### 1.2 問題分析

現有的 `/templates/search` endpoint 回傳的資料有以下限制:

- nodes 陣列只包含節點的基本資訊 (id, name, displayName, icon)
- 缺少節點之間的連接關係 (connections)
- 缺少節點的完整參數配置 (parameters)
- 缺少節點的位置資訊 (position)
- 無法獲取完整可執行的 workflow JSON

## 2. 發現的完整 Workflow API

### 2.1 API Endpoint

```
GET https://api.n8n.io/api/workflows/templates/{id}
```

範例:
```bash
curl https://api.n8n.io/api/workflows/templates/6270
```

### 2.2 回傳資料結構

```typescript
interface WorkflowDetailResponse {
  id: number;                    // Template ID
  name: string;                  // Template 名稱
  workflow: {
    meta: {
      instanceId: string;
      templateCredsSetupCompleted: boolean;
    };
    nodes: WorkflowNode[];       // 完整的節點定義
    connections: WorkflowConnections;  // 節點連接關係
    pinData: Record<string, any>;      // 固定資料
  };
}

interface WorkflowNode {
  id: string;                    // 節點 UUID
  name: string;                  // 節點名稱
  type: string;                  // 節點類型 (例如: "n8n-nodes-base.httpRequest")
  position: [number, number];    // 節點位置 [x, y]
  parameters: Record<string, any>;  // 節點參數配置
  typeVersion: number;           // 節點版本
  credentials?: Record<string, any>;  // 憑證配置
  notes?: string;                // 節點備註
  cid?: string;                  // 創建者 ID
  creator?: string;              // 創建者名稱
}

interface WorkflowConnections {
  [sourceNodeName: string]: {
    [outputType: string]: Array<Array<{
      node: string;              // 目標節點名稱
      type: string;              // 連接類型 (main, ai_tool, ai_languageModel 等)
      index: number;             // 輸出索引
    }>>;
  };
}
```

### 2.3 實際資料範例

以 Template ID 6270 ("Build Your First AI Agent") 為例:

```json
{
  "id": 6270,
  "name": "Build Your First AI Agent",
  "workflow": {
    "meta": {
      "instanceId": "e409ea34548a2afe2dffba31130cd1cf2e98ebe2afaeed2a63caf2a0582d1da0",
      "templateCredsSetupCompleted": true
    },
    "nodes": [
      {
        "id": "95421925-c5ad-48bd-9638-c84ff5b5e3c6",
        "name": "Example Chat",
        "type": "@n8n/n8n-nodes-langchain.chatTrigger",
        "position": [-176, -64],
        "parameters": {
          "public": true,
          "options": {
            "title": "Your first AI Agent 🚀",
            "subtitle": "This is for demo purposes. Try me out !"
          }
        },
        "typeVersion": 1.1
      },
      {
        "id": "332af12a-45ab-4e5d-8dab-da21ba2111f9",
        "name": "Your First AI Agent",
        "type": "@n8n/n8n-nodes-langchain.agent",
        "position": [192, -64],
        "parameters": {
          "options": {
            "systemMessage": "You are an AI assistant..."
          }
        },
        "typeVersion": 2.2
      }
    ],
    "connections": {
      "Example Chat": {
        "main": [
          [
            {
              "node": "Your First AI Agent",
              "type": "main",
              "index": 0
            }
          ]
        ]
      },
      "Get Weather": {
        "ai_tool": [
          [
            {
              "node": "Your First AI Agent",
              "type": "ai_tool",
              "index": 0
            }
          ]
        ]
      }
    }
  }
}
```

## 3. API 功能比較

| 功能 | /templates/search | /workflows/templates/{id} |
|------|-------------------|---------------------------|
| 批次查詢 | ✅ (最多 100 個) | ❌ (單一查詢) |
| 基本資訊 | ✅ | ✅ |
| 節點列表 | ✅ (簡化版) | ✅ (完整版) |
| 節點參數 | ❌ | ✅ |
| 節點位置 | ❌ | ✅ |
| 連接關係 | ❌ | ✅ |
| 可匯入 n8n | ❌ | ✅ |

## 4. 實作建議

### 4.1 擴充 ApiCollector 類別

在 `src/collectors/api-collector.ts` 中新增方法:

```typescript
/**
 * 取得完整的工作流程定義
 */
public async fetchWorkflowDefinition(templateId: number): Promise<WorkflowDefinition> {
  try {
    console.log(`抓取 Template ID ${templateId} 的完整工作流程定義...`);

    const response = await this.withRetry(async () => {
      return await this.client.get<WorkflowDefinition>(
        `/workflows/templates/${templateId}`
      );
    });

    console.log(`成功抓取工作流程: ${response.data.name}`);
    console.log(`- 節點數量: ${response.data.workflow.nodes.length}`);
    console.log(`- 連接數量: ${Object.keys(response.data.workflow.connections).length}`);

    return response.data;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`抓取工作流程定義失敗: ${error.message}`);
    }
    throw new Error('抓取工作流程定義時發生未知錯誤');
  }
}

/**
 * 批次抓取多個工作流程定義
 */
public async fetchMultipleWorkflows(
  templateIds: number[],
  concurrency: number = 5
): Promise<WorkflowDefinition[]> {
  const results: WorkflowDefinition[] = [];
  
  // 使用並行控制避免過多請求
  for (let i = 0; i < templateIds.length; i += concurrency) {
    const batch = templateIds.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(id => this.fetchWorkflowDefinition(id))
    );
    results.push(...batchResults);
    
    // 批次之間加入延遲
    if (i + concurrency < templateIds.length) {
      await this.delay(1000);
    }
  }
  
  return results;
}
```

### 4.2 新增型別定義

```typescript
export interface WorkflowNode {
  id: string;
  name: string;
  type: string;
  position: [number, number];
  parameters: Record<string, any>;
  typeVersion: number;
  credentials?: Record<string, any>;
  notes?: string;
  cid?: string;
  creator?: string;
}

export interface WorkflowConnection {
  node: string;
  type: string;
  index: number;
}

export interface WorkflowConnections {
  [sourceNodeName: string]: {
    [outputType: string]: WorkflowConnection[][];
  };
}

export interface WorkflowDefinition {
  id: number;
  name: string;
  workflow: {
    meta: {
      instanceId: string;
      templateCredsSetupCompleted: boolean;
    };
    nodes: WorkflowNode[];
    connections: WorkflowConnections;
    pinData: Record<string, any>;
  };
}
```

### 4.3 擴充 TemplateGenerator

在 `src/generators/template-generator.ts` 中擴充功能:

```typescript
/**
 * 生成包含完整工作流程定義的 markdown
 */
generateTemplateMarkdownWithWorkflow(
  template: Template, 
  workflow: WorkflowDefinition,
  category: TemplateCategory
): string {
  const sections = [
    // ... 原有的基本資訊 ...
    
    '## 工作流程架構',
    '',
    this.generateWorkflowDiagram(workflow),
    '',
    '## 節點詳細配置',
    '',
    this.generateNodeDetails(workflow),
    '',
    '## 連接關係',
    '',
    this.generateConnectionDetails(workflow),
    '',
    '## 完整工作流程 JSON',
    '',
    '```json',
    JSON.stringify(workflow.workflow, null, 2),
    '```',
    ''
  ];
  
  return sections.join('\n');
}

/**
 * 生成工作流程圖表
 */
private generateWorkflowDiagram(workflow: WorkflowDefinition): string {
  const lines = ['```mermaid', 'graph LR'];
  
  // 生成節點
  workflow.workflow.nodes.forEach((node, index) => {
    const nodeId = `N${index}`;
    const label = node.name.replace(/"/g, '\\"');
    lines.push(`  ${nodeId}["${label}<br/>${node.type}"]`);
  });
  
  // 生成連接
  const nodeNameToId = new Map<string, string>();
  workflow.workflow.nodes.forEach((node, index) => {
    nodeNameToId.set(node.name, `N${index}`);
  });
  
  Object.entries(workflow.workflow.connections).forEach(([source, outputs]) => {
    const sourceId = nodeNameToId.get(source);
    Object.entries(outputs).forEach(([outputType, targets]) => {
      targets.flat().forEach(target => {
        const targetId = nodeNameToId.get(target.node);
        if (sourceId && targetId) {
          lines.push(`  ${sourceId} -->|${outputType}| ${targetId}`);
        }
      });
    });
  });
  
  lines.push('```');
  return lines.join('\n');
}

/**
 * 生成節點詳細資訊
 */
private generateNodeDetails(workflow: WorkflowDefinition): string {
  const lines: string[] = [];
  
  workflow.workflow.nodes.forEach((node) => {
    lines.push(`### ${node.name}`);
    lines.push('');
    lines.push(`- 類型: \`${node.type}\``);
    lines.push(`- 版本: ${node.typeVersion}`);
    lines.push(`- 位置: (${node.position[0]}, ${node.position[1]})`);
    
    if (node.notes) {
      lines.push(`- 備註: ${node.notes}`);
    }
    
    if (Object.keys(node.parameters).length > 0) {
      lines.push('- 參數配置:');
      lines.push('```json');
      lines.push(JSON.stringify(node.parameters, null, 2));
      lines.push('```');
    }
    
    lines.push('');
  });
  
  return lines.join('\n');
}

/**
 * 生成連接關係詳細資訊
 */
private generateConnectionDetails(workflow: WorkflowDefinition): string {
  const lines: string[] = [];
  
  Object.entries(workflow.workflow.connections).forEach(([source, outputs]) => {
    lines.push(`**${source}**`);
    Object.entries(outputs).forEach(([outputType, targets]) => {
      targets.flat().forEach(target => {
        lines.push(`  - ${outputType} → ${target.node} (索引: ${target.index})`);
      });
    });
    lines.push('');
  });
  
  return lines.join('\n');
}
```

### 4.4 整合到建置流程

在 `scripts/build.ts` 中新增步驟:

```typescript
// 步驟 3.5: 抓取完整工作流程定義
async function fetchWorkflowDefinitions(
  templates: Template[]
): Promise<Map<number, WorkflowDefinition>> {
  const collector = new ApiCollector();
  const definitions = new Map<number, WorkflowDefinition>();
  
  // 選擇前 N 個最受歡迎的範本
  const topTemplates = templates
    .sort((a, b) => b.totalViews - a.totalViews)
    .slice(0, 50);  // 限制數量避免過多 API 請求
  
  const templateIds = topTemplates.map(t => t.id);
  const workflows = await collector.fetchMultipleWorkflows(templateIds);
  
  workflows.forEach(workflow => {
    definitions.set(workflow.id, workflow);
  });
  
  return definitions;
}
```

## 5. 實作難度評估

### 5.1 技術難度

- 難度: ⭐⭐☆☆☆ (中低)
- API 已經提供完整資料，只需要新增呼叫邏輯
- 主要工作是解析和格式化輸出

### 5.2 時間估算

- 擴充 ApiCollector: 2-3 小時
- 新增型別定義: 1 小時
- 擴充 TemplateGenerator: 3-4 小時
- 整合測試: 2 小時
- 總計: 8-10 小時

### 5.3 注意事項

1. API 請求限制
   - 單一範本 API 每次只能查詢一個，需要批次處理
   - 建議加入請求延遲避免觸發 rate limit
   - 建議快取結果避免重複請求

2. 資料大小
   - 完整的 workflow JSON 可能很大 (包含所有參數)
   - 建議在 markdown 中提供摺疊或連結而非完整嵌入
   - 可考慮生成獨立的 JSON 檔案

3. 隱私與安全
   - workflow 中可能包含敏感資訊 (API keys, credentials)
   - 需要檢查並過濾敏感欄位
   - 建議只保存結構而非實際憑證

## 6. 替代方案

如果 API 方案不可行，可考慮以下替代方案:

### 6.1 從 n8n GitHub 範例

n8n 官方 GitHub 儲存庫可能包含範例工作流程:
- https://github.com/n8n-io/n8n
- https://github.com/n8n-io/n8n-docs

### 6.2 從社群資源

- n8n 社群論壇的分享
- Reddit r/n8n
- n8n Discord 社群

### 6.3 手動策劃

- 選擇代表性的工作流程
- 手動建立和測試
- 確保品質和可用性

## 7. 建議的實作優先級

### 階段 1: 基礎實作 (必要)

✅ 擴充 ApiCollector 加入 `fetchWorkflowDefinition()` 方法
✅ 新增完整的型別定義
✅ 測試 API 呼叫和資料結構

### 階段 2: 生成器擴充 (重要)

- 擴充 TemplateGenerator 支援完整 workflow
- 生成結構化的 markdown 文件
- 加入工作流程視覺化 (mermaid 圖表)

### 階段 3: 整合最佳化 (次要)

- 實作批次請求和快取機制
- 最佳化輸出格式
- 加入敏感資訊過濾

### 階段 4: 進階功能 (可選)

- 生成獨立的 workflow JSON 檔案供匯入
- 加入互動式工作流程預覽
- 支援從 workflow 自動生成說明文件

## 8. 結論

n8n.io API 提供了完整的工作流程定義存取能力，包含節點配置、連接關係和所有必要資訊。透過 `/workflows/templates/{id}` endpoint，我們可以獲取可直接匯入 n8n 的完整 workflow JSON。

實作此功能的主要挑戰在於:
1. 需要對每個範本進行單獨 API 呼叫 (無批次 endpoint)
2. 需要適當的請求速率控制
3. 需要設計良好的輸出格式以呈現複雜的工作流程結構

建議先實作基礎的 API 呼叫功能，然後逐步擴充生成器以提供更豐富的文件格式。

## 9. 範例程式碼

完整的實作範例請參考:
- `/Users/haunchenchen/Documents/GitHub/n8n-skills/examples/workflow-api-example.ts`
