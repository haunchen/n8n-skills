# n8n Workflow API 範例

這個目錄包含使用 n8n.io API 的範例程式碼。

## 快速測試

### 1. 測試單一工作流程 API

```bash
# 直接使用 curl 測試
curl -s "https://api.n8n.io/api/workflows/templates/6270" | jq '.name'

# 查看節點數量
curl -s "https://api.n8n.io/api/workflows/templates/6270" | jq '.workflow.nodes | length'

# 查看連接關係
curl -s "https://api.n8n.io/api/workflows/templates/6270" | jq '.workflow.connections | keys'
```

### 2. 執行 TypeScript 範例

```bash
# 安裝依賴
npm install

# 執行簡單測試
npx ts-node examples/api-test.ts

# 執行完整範例 (待實作)
# npx ts-node examples/workflow-api-example.ts
```

## API Endpoint 說明

### 獲取範本列表

```
GET https://api.n8n.io/api/templates/search
參數:
  - page: 頁碼
  - rows: 每頁數量 (最多 100)
  - category: 分類 (可選)
  - search: 搜尋關鍵字 (可選)
```

### 獲取完整工作流程定義

```
GET https://api.n8n.io/api/workflows/templates/{id}
```

回傳包含：
- 完整節點配置
- 連接關係
- 參數設定
- 可直接匯入 n8n

## 實用命令

```bash
# 獲取熱門範本列表
curl -s "https://api.n8n.io/api/templates/search?page=1&rows=10" | jq '.workflows[] | {id, name, totalViews}'

# 獲取特定範本的完整定義
curl -s "https://api.n8n.io/api/workflows/templates/6270" | jq '.' > workflow-6270.json

# 查看工作流程中使用的節點類型
curl -s "https://api.n8n.io/api/workflows/templates/6270" | jq '.workflow.nodes[].type' | sort -u
```

## 相關文件

- [完整研究報告](../docs/workflow-api-research.md)
- [快速總結](../docs/workflow-api-summary.md)

