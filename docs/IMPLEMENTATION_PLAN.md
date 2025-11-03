# n8n Workflow API 實作計畫

基於研究結果，這是完整的實作計畫和優先級排序。

## 研究成果總結

### 發現的 API

成功找到可獲取完整工作流程定義的 API endpoint:

```
GET https://api.n8n.io/api/workflows/templates/{id}
```

### API 功能對比

```
┌─────────────────────┬────────────────────────┬───────────────────────────┐
│ 功能                │ /templates/search      │ /workflows/templates/{id} │
├─────────────────────┼────────────────────────┼───────────────────────────┤
│ 批次查詢            │ ✅ 最多 100 個         │ ❌ 單一查詢                │
│ 節點基本資訊        │ ✅                     │ ✅                        │
│ 節點完整參數        │ ❌                     │ ✅                        │
│ 節點位置            │ ❌                     │ ✅                        │
│ 連接關係            │ ❌                     │ ✅                        │
│ 可匯入 n8n          │ ❌                     │ ✅                        │
└─────────────────────┴────────────────────────┴───────────────────────────┘
```

### 資料結構

回傳的完整結構包含：

- workflow.nodes[] - 節點陣列
  - id (UUID)
  - name (節點名稱)
  - type (節點類型)
  - position [x, y]
  - parameters (完整配置)
  - typeVersion (版本)
  
- workflow.connections - 連接關係
  - 源節點 → 目標節點
  - 連接類型 (main, ai_tool, ai_languageModel 等)
  - 輸出索引

## 實作階段

### 階段 1: 基礎 API 整合 (必要 - 優先級: 高)

時間估算: 4-5 小時

#### 任務 1.1: 擴充 ApiCollector

檔案: `src/collectors/api-collector.ts`

新增方法:
```typescript
// 1. 獲取單一工作流程定義
public async fetchWorkflowDefinition(templateId: number): Promise<WorkflowDefinition>

// 2. 批次獲取工作流程定義 (帶並行控制)
public async fetchMultipleWorkflows(
  templateIds: number[], 
  concurrency?: number
): Promise<WorkflowDefinition[]>
```

新增型別定義:
```typescript
export interface WorkflowNode { ... }
export interface WorkflowConnections { ... }
export interface WorkflowDefinition { ... }
```

注意事項:
- 加入請求延遲 (建議 1000ms)
- 錯誤處理和重試機制
- 並行控制 (建議每批 5 個)

#### 任務 1.2: 單元測試

檔案: `src/collectors/__tests__/api-collector.test.ts`

測試案例:
- 單一工作流程獲取
- 批次獲取
- 錯誤處理
- 重試機制

### 階段 2: 快取機制 (重要 - 優先級: 高)

時間估算: 2-3 小時

#### 任務 2.1: 快取實作

避免重複 API 請求，減少建置時間。

檔案: `scripts/build.ts`

功能:
- 檢查 data/cache/workflows/ 是否有快取
- 只請求未快取的工作流程
- 快取資料格式: `workflow-{id}.json`

快取策略:
- 快取有效期: 7 天
- 可用 --force 參數清除快取

### 階段 3: TemplateGenerator 擴充 (重要 - 優先級: 中)

時間估算: 5-6 小時

#### 任務 3.1: 生成工作流程視覺化

檔案: `src/generators/template-generator.ts`

新增方法:
```typescript
// 生成 Mermaid 流程圖
private generateWorkflowDiagram(workflow: WorkflowDefinition): string

// 生成節點詳細配置
private generateNodeDetails(workflow: WorkflowDefinition): string

// 生成連接關係說明
private generateConnectionDetails(workflow: WorkflowDefinition): string
```

輸出格式範例:
```markdown
## 工作流程架構

\`\`\`mermaid
graph LR
  N0[Example Chat] --> N1[AI Agent]
  N2[Get Weather] -->|ai_tool| N1
  N3[Get News] -->|ai_tool| N1
\`\`\`

## 節點配置

### Example Chat (chatTrigger)
- 版本: 1.1
- 位置: (-176, -64)
- 參數: public chat interface

### AI Agent (agent)
- 版本: 2.2
- 位置: (192, -64)
- 參數: system message, tools

## 連接關係

Example Chat → AI Agent (main)
Get Weather → AI Agent (ai_tool)
Get News → AI Agent (ai_tool)
```

#### 任務 3.2: 擴充 Template 介面

更新 Template 介面以包含完整工作流程：

```typescript
export interface TemplateWithWorkflow extends Template {
  workflowDefinition?: WorkflowDefinition;
}
```

### 階段 4: 安全與最佳化 (次要 - 優先級: 中)

時間估算: 3-4 小時

#### 任務 4.1: 敏感資訊過濾

新增工具函數:
```typescript
function sanitizeWorkflow(workflow: WorkflowDefinition): WorkflowDefinition
function detectSensitiveFields(workflow: WorkflowDefinition): string[]
```

過濾規則:
- 移除 credentials 欄位
- 檢查參數中的敏感關鍵字 (apiKey, password, token, secret)
- 標記包含敏感資訊的節點

#### 任務 4.2: 輸出大小最佳化

選項:
1. 生成獨立的 JSON 檔案而非嵌入 markdown
2. 提供下載連結指向 n8n.io
3. 僅嵌入結構化摘要，完整 JSON 另存

建議方案:
```
output/
└── templates/
    ├── ai-chatbots/
    │   ├── README.md
    │   ├── 6270-build-your-first-ai-agent.md  (包含視覺化和摘要)
    │   └── workflows/
    │       └── 6270.json  (完整工作流程定義)
    └── ...
```

### 階段 5: 整合與測試 (必要 - 優先級: 高)

時間估算: 3-4 小時

#### 任務 5.1: 整合到建置流程

檔案: `scripts/build.ts`

新增建置步驟:
```typescript
// 步驟 3.5: 抓取工作流程定義
async function fetchWorkflowDefinitions(
  templates: Template[]
): Promise<Map<number, WorkflowDefinition>> {
  // 1. 選擇前 50 個最受歡迎的範本
  // 2. 檢查快取
  // 3. 批次抓取未快取的
  // 4. 儲存快取
  // 5. 回傳結果
}
```

#### 任務 5.2: 端對端測試

測試案例:
- 完整建置流程 (npm run build:full)
- 快取機制驗證
- 生成的 markdown 格式正確
- Mermaid 圖表可正確渲染
- 敏感資訊已過濾

#### 任務 5.3: 文件更新

更新檔案:
- README.md - 加入新功能說明
- CLAUDE.md - 更新架構說明
- docs/ - 使用說明

## 時間總計

- 階段 1: 4-5 小時 (基礎 API)
- 階段 2: 2-3 小時 (快取)
- 階段 3: 5-6 小時 (生成器)
- 階段 4: 3-4 小時 (安全)
- 階段 5: 3-4 小時 (整合)

總計: 17-22 小時

## 優先級建議

### 第一優先 (MVP - 最小可行產品)

1. 階段 1: API 整合 (4-5h)
2. 階段 2: 快取機制 (2-3h)
3. 階段 5: 基礎整合 (2h)

MVP 總時間: 8-10 小時

功能:
- 可獲取完整工作流程定義
- 有快取避免重複請求
- 能正常執行建置

### 第二優先 (增強功能)

4. 階段 3: 視覺化生成 (5-6h)

功能:
- 生成 Mermaid 流程圖
- 顯示節點配置
- 連接關係說明

### 第三優先 (完善與安全)

5. 階段 4: 安全過濾 (3-4h)
6. 階段 5: 完整測試 (2-3h)

功能:
- 敏感資訊過濾
- 完整的測試覆蓋
- 文件更新

## 技術風險與緩解

### 風險 1: API Rate Limiting

機率: 中
影響: 高

緩解措施:
- 實作請求延遲 (1000ms)
- 並行控制 (最多 5 個)
- 使用快取減少請求
- 加入重試機制

### 風險 2: 資料太大

機率: 高
影響: 中

緩解措施:
- 生成獨立 JSON 檔案
- 只在 markdown 中包含摘要
- 限制範本數量 (前 50 個)

### 風險 3: 敏感資訊洩漏

機率: 中
影響: 高

緩解措施:
- 實作敏感欄位檢測
- 過濾 credentials
- 加入警告標記
- 建議使用者檢查

## 成功指標

實作完成後應達成:

1. 功能指標
   - ✅ 可獲取完整工作流程定義
   - ✅ 包含節點參數和連接關係
   - ✅ 生成視覺化流程圖
   - ✅ 快取機制運作正常

2. 效能指標
   - ⏱️ 建置時間 < 10 分鐘 (有快取)
   - ⏱️ API 請求 < 60 個 (50 個範本 + 重試)
   - 📦 輸出檔案總大小 < 50MB

3. 品質指標
   - 🔒 無敏感資訊洩漏
   - 📝 文件完整清晰
   - ✅ 測試覆蓋率 > 80%
   - 🎨 Markdown 格式正確

## 下一步

建議執行順序:

1. 先完成 MVP (階段 1 + 2 + 基礎整合)
2. 驗證可行性和效能
3. 再實作視覺化功能
4. 最後完善安全和測試

