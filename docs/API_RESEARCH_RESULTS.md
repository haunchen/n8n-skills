# n8n.io API 研究結果

中文版 | [English](./API_RESEARCH_RESULTS.en.md)

研究人員: Claude Code
研究日期: 2025-11-03
專案: n8n-skills

---

## 執行摘要

成功研究並驗證了從 n8n.io 獲取完整工作流程定義的方法。發現 n8n.io 提供公開 API endpoint，可獲取包含節點配置、連接關係和完整參數的 workflow JSON，可直接匯入 n8n 使用。

關鍵發現:
- ✅ API endpoint 已確認可用
- ✅ 回傳完整的工作流程定義
- ✅ 包含所有必要資訊 (節點、連接、參數)
- ✅ 可直接用於生成完整的範本文件
- ⚠️ 需要單獨請求每個範本 (無批次 endpoint)
- ⚠️ 需要注意敏感資訊過濾

## 研究問題

原始需求:
> 如何從 n8n.io 獲取完整的工作流程定義（包含節點連接和配置），以便在模板檔案中提供完整的工作流程結構。

## 研究方法

1. 分析現有程式碼 (src/collectors/api-collector.ts)
2. 測試現有 API endpoint (/templates/search)
3. 探索其他可能的 endpoint
4. 實際呼叫並驗證資料結構
5. 評估實作可行性

## 研究結果

### 1. 目前使用的 API

檔案: `src/collectors/api-collector.ts`

```typescript
// 現有實作
GET https://api.n8n.io/api/templates/search
參數:
  - page: 頁碼
  - rows: 每頁數量 (最多 100)
  - category: 分類 (可選)
  - search: 關鍵字 (可選)
```

回傳資料:
- ✅ 範本基本資訊 (id, name, description, views)
- ✅ 使用的節點列表 (簡化版)
- ❌ 節點參數配置
- ❌ 節點連接關係
- ❌ 可執行的 workflow JSON

結論: 現有 API 不足以獲取完整工作流程定義。

### 2. 發現的完整 Workflow API

經過測試，發現以下 endpoint:

```bash
GET https://api.n8n.io/api/workflows/templates/{id}

# 範例
curl https://api.n8n.io/api/workflows/templates/6270
```

回傳資料結構:

```json
{
  "id": 6270,
  "name": "Build Your First AI Agent",
  "workflow": {
    "meta": {
      "instanceId": "...",
      "templateCredsSetupCompleted": true
    },
    "nodes": [
      {
        "id": "uuid",
        "name": "Example Chat",
        "type": "@n8n/n8n-nodes-langchain.chatTrigger",
        "position": [-176, -64],
        "parameters": {
          "public": true,
          "options": { ... }
        },
        "typeVersion": 1.1
      }
    ],
    "connections": {
      "Example Chat": {
        "main": [[
          {
            "node": "AI Agent",
            "type": "main",
            "index": 0
          }
        ]]
      }
    },
    "pinData": {}
  }
}
```

驗證結果:
- ✅ 包含完整節點陣列
- ✅ 每個節點包含完整參數
- ✅ 包含節點位置資訊
- ✅ 包含完整連接關係
- ✅ 可直接匯入 n8n
- ✅ 回傳 JSON 格式正確

實際測試:

```bash
# 測試 1: 獲取工作流程名稱
$ curl -s "https://api.n8n.io/api/workflows/templates/6270" | jq '.name'
"Build Your First AI Agent"

# 測試 2: 計算節點數量
$ curl -s "https://api.n8n.io/api/workflows/templates/6270" | jq '.workflow.nodes | length'
13

# 測試 3: 查看連接關係
$ curl -s "https://api.n8n.io/api/workflows/templates/6270" | jq '.workflow.connections | keys'
[
  "Connect Gemini",
  "Conversation Memory",
  "Example Chat",
  "Get News",
  "Get Weather"
]
```

結論: 此 API 完全滿足需求，可獲取完整工作流程定義。

### 3. API 功能對比

| 功能 | /templates/search | /workflows/templates/{id} |
|------|-------------------|---------------------------|
| 批次查詢 | ✅ 最多 100 個 | ❌ 單一查詢 |
| 範本基本資訊 | ✅ | ✅ |
| 節點列表 | ✅ 簡化版 | ✅ 完整版 |
| 節點參數 | ❌ | ✅ |
| 節點位置 | ❌ | ✅ |
| 連接關係 | ❌ | ✅ |
| 完整 workflow | ❌ | ✅ |
| 可匯入 n8n | ❌ | ✅ |

建議: 使用兩個 API 配合
1. 用 /templates/search 獲取範本列表
2. 用 /workflows/templates/{id} 獲取完整定義

### 4. 資料結構分析

#### WorkflowNode 結構

```typescript
interface WorkflowNode {
  id: string;                    // UUID，節點唯一識別
  name: string;                  // 顯示名稱
  type: string;                  // 節點類型 (完整路徑)
  position: [number, number];    // 畫布座標 [x, y]
  parameters: Record<string, any>;  // 節點參數配置
  typeVersion: number;           // 節點版本號
  credentials?: any;             // 憑證配置 (可能包含敏感資訊)
  notes?: string;                // 節點說明
  cid?: string;                  // 創建者 ID
  creator?: string;              // 創建者名稱
  webhookId?: string;            // Webhook ID (觸發節點)
}
```

#### WorkflowConnections 結構

```typescript
interface WorkflowConnections {
  [sourceNodeName: string]: {
    [outputType: string]: Array<Array<{
      node: string;      // 目標節點名稱
      type: string;      // 連接類型
      index: number;     // 輸出索引
    }>>;
  };
}
```

連接類型包括:
- `main` - 主要輸出
- `ai_tool` - AI 工具連接
- `ai_languageModel` - 語言模型連接
- `ai_memory` - 記憶體連接
- 其他自定義類型

### 5. 實作可行性評估

#### 優點
- ✅ API 公開可用，無需認證
- ✅ 回傳完整資料，滿足所有需求
- ✅ JSON 格式標準，易於解析
- ✅ 可直接用於生成文件
- ✅ 支援匯入 n8n

#### 挑戰
- ⚠️ 只能單一查詢，需要多次請求
- ⚠️ 可能有 rate limiting
- ⚠️ 回傳資料可能包含敏感資訊
- ⚠️ workflow JSON 可能很大

#### 緩解方案
- 實作批次請求控制 (並行限制 + 延遲)
- 使用快取機制減少請求
- 實作敏感資訊過濾
- 生成獨立檔案而非嵌入 markdown

結論: 完全可行，預估實作時間 17-22 小時。

## 解決方案

### 方案 1: 完整實作 (建議)

在專案中整合完整 workflow 定義：

1. 擴充 ApiCollector
   - 新增 fetchWorkflowDefinition() 方法
   - 新增 fetchMultipleWorkflows() 批次方法
   - 新增型別定義

2. 實作快取機制
   - 快取工作流程定義到 data/cache/workflows/
   - 避免重複 API 請求

3. 擴充 TemplateGenerator
   - 生成 Mermaid 流程圖
   - 生成節點配置說明
   - 生成連接關係圖
   - 生成獨立 JSON 檔案

4. 安全處理
   - 過濾敏感資訊
   - 檢測憑證欄位
   - 加入警告標記

優點:
- 提供完整的工作流程資訊
- 使用者可直接匯入 n8n
- 視覺化幫助理解

缺點:
- 開發時間較長 (17-22h)
- 增加建置時間
- 需要管理快取

### 方案 2: 最小實作 (MVP)

只實作基礎功能:

1. 擴充 ApiCollector (4-5h)
2. 實作快取機制 (2-3h)
3. 基礎整合 (2h)

優點:
- 快速完成 (8-10h)
- 低風險
- 可驗證可行性

缺點:
- 功能不完整
- 缺少視覺化
- 使用者體驗較差

### 方案 3: 混合方案 (替代)

使用外部連結而非完整嵌入:

在範本文件中加入:
```markdown
## 工作流程定義

完整的工作流程定義可從以下來源獲取:
- [在 n8n.io 上查看](https://n8n.io/workflows/6270)
- [下載 JSON](https://api.n8n.io/api/workflows/templates/6270)
```

優點:
- 實作簡單 (1h)
- 無 API 請求負擔
- 資料永遠最新

缺點:
- 缺少視覺化
- 需要網路連線
- 使用體驗較差

## 建議

根據研究結果，建議採用方案 1 (完整實作)，分階段執行:

### 階段 1: MVP (8-10 小時)
- 實作基礎 API 呼叫
- 實作快取機制
- 驗證可行性

### 階段 2: 增強功能 (5-6 小時)
- 生成視覺化流程圖
- 顯示節點配置
- 連接關係說明

### 階段 3: 完善 (5-6 小時)
- 敏感資訊過濾
- 完整測試
- 文件更新

總時間: 18-22 小時

## 技術文件

已建立以下文件:

1. 完整研究報告
   - 檔案: `docs/workflow-api-research.md` (14KB)
   - 內容: 詳細的 API 文件、資料結構、實作範例

2. 快速總結
   - 檔案: `docs/workflow-api-summary.md` (3.6KB)
   - 內容: 重點摘要、實作建議、行動計畫

3. 實作計畫
   - 檔案: `docs/IMPLEMENTATION_PLAN.md`
   - 內容: 分階段實作計畫、時間估算、風險評估

4. 程式碼範例
   - 檔案: `examples/api-test.ts`
   - 內容: 簡單的 API 測試程式碼
   
   - 檔案: `examples/api-response-sample.json`
   - 內容: 實際 API 回應範例

5. 使用說明
   - 檔案: `examples/README.md`
   - 內容: 快速測試指令和使用範例

## 立即可用的測試指令

```bash
# 1. 測試 API 可用性
curl -s "https://api.n8n.io/api/workflows/templates/6270" | jq '.name'

# 2. 查看完整結構
curl -s "https://api.n8n.io/api/workflows/templates/6270" | jq '.' | head -100

# 3. 統計節點數量
curl -s "https://api.n8n.io/api/workflows/templates/6270" | jq '.workflow.nodes | length'

# 4. 列出節點類型
curl -s "https://api.n8n.io/api/workflows/templates/6270" | jq '.workflow.nodes[].type' | sort -u

# 5. 查看連接關係
curl -s "https://api.n8n.io/api/workflows/templates/6270" | jq '.workflow.connections'

# 6. 下載完整 JSON
curl -s "https://api.n8n.io/api/workflows/templates/6270" > workflow-6270.json
```

## 結論

研究成功完成，所有研究目標均已達成:

1. ✅ 找到可獲取完整工作流程定義的 API
2. ✅ 驗證資料結構包含所有必要資訊
3. ✅ 確認實作可行性
4. ✅ 提供具體的實作方案
5. ✅ 評估實作難度和時間
6. ✅ 建立完整的技術文件

下一步: 根據實作計畫開始開發，建議先完成 MVP 階段驗證可行性。

---

研究報告完成日期: 2025-11-03
