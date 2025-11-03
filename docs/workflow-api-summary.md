# n8n.io Workflow API 研究總結

研究日期: 2025-11-03

## 重要發現

成功找到 n8n.io 提供的完整工作流程定義 API！

### 關鍵 API Endpoint

```
GET https://api.n8n.io/api/workflows/templates/{id}
```

此 API 回傳完整的工作流程定義，包括：
- 所有節點的完整配置
- 節點之間的連接關係
- 節點參數設定
- 可直接匯入 n8n 的 JSON 格式

## 快速測試

```bash
# 測試獲取工作流程定義
curl https://api.n8n.io/api/workflows/templates/6270 | jq '.'

# 查看節點數量
curl -s https://api.n8n.io/api/workflows/templates/6270 | jq '.workflow.nodes | length'

# 查看連接關係
curl -s https://api.n8n.io/api/workflows/templates/6270 | jq '.workflow.connections'
```

## API 比較

| 功能 | /templates/search | /workflows/templates/{id} |
|------|-------------------|---------------------------|
| 批次查詢 | ✅ 可取得多個 | ❌ 單一查詢 |
| 節點列表 | ✅ 簡化版 | ✅ 完整版 |
| 節點參數 | ❌ | ✅ |
| 連接關係 | ❌ | ✅ |
| 可匯入 n8n | ❌ | ✅ |

## 回傳資料結構

```typescript
{
  id: number,
  name: string,
  workflow: {
    meta: {
      instanceId: string,
      templateCredsSetupCompleted: boolean
    },
    nodes: [
      {
        id: string,              // 節點 UUID
        name: string,            // 節點名稱
        type: string,            // 節點類型
        position: [x, y],        // 畫布位置
        parameters: {...},       // 完整參數配置
        typeVersion: number      // 節點版本
      }
    ],
    connections: {
      "源節點名稱": {
        "輸出類型": [[
          {
            node: "目標節點名稱",
            type: "連接類型",
            index: 0
          }
        ]]
      }
    }
  }
}
```

## 實作建議

### 1. 擴充 ApiCollector (優先級: 高)

在 `src/collectors/api-collector.ts` 新增方法：

```typescript
public async fetchWorkflowDefinition(templateId: number) {
  const response = await this.client.get(
    `/workflows/templates/${templateId}`
  );
  return response.data;
}
```

### 2. 批次獲取控制 (優先級: 高)

由於只能單一查詢，需要實作：
- 批次請求控制 (建議每批 5 個)
- 請求間延遲 (建議 1000ms)
- 錯誤處理和重試機制

### 3. 擴充 TemplateGenerator (優先級: 中)

在生成的 markdown 中加入：
- 工作流程視覺化 (Mermaid 圖表)
- 節點詳細配置說明
- 連接關係圖
- 可選：完整 workflow JSON

### 4. 安全檢查 (優先級: 中)

- 檢查並過濾敏感資訊 (API keys, tokens)
- 憑證欄位脫敏處理
- 警告標記

## 實作時間估算

- 基礎 API 呼叫: 2-3 小時
- 批次控制與快取: 2 小時
- 生成器擴充: 3-4 小時
- 測試與除錯: 2 小時
- 總計: 約 9-11 小時

## 範例檔案

- 研究報告: `docs/workflow-api-research.md`
- API 測試: `examples/api-test.ts`
- 完整範例: `examples/workflow-api-example.ts` (待完成)

## 注意事項

1. Rate Limiting
   - API 可能有請求頻率限制
   - 建議加入延遲和重試機制
   - 使用快取避免重複請求

2. 資料大小
   - 完整 workflow JSON 可能很大
   - 考慮提供下載連結而非直接嵌入
   - 或生成獨立的 JSON 檔案

3. 敏感資訊
   - workflow 可能包含憑證配置
   - 需要檢查和過濾敏感欄位
   - 不應儲存實際的 API keys 或 tokens

## 下一步行動

1. ✅ 確認 API 可用性和資料結構
2. ⬜ 實作 fetchWorkflowDefinition 方法
3. ⬜ 實作批次獲取和快取機制
4. ⬜ 擴充 TemplateGenerator 生成完整文件
5. ⬜ 加入安全檢查和敏感資訊過濾
6. ⬜ 整合到主建置流程
7. ⬜ 測試和文件更新

