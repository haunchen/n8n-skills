# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 專案概述

這是一個 n8n Skill Pack 生成器，將 n8n 工作流程節點資訊轉換為 AI 助理可用的 Skill Pack 格式。專案從 n8n NPM 套件收集節點資訊、從 n8n.io API 收集使用統計、從 n8n-docs 收集文件，然後組織、排序並生成結構化的 Skill Pack。

## 常用開發指令

基本開發流程：
- `npm run build` - 編譯 TypeScript 到 dist/
- `npm run build:full` 或 `npm start` - 完整建置流程，執行收集、解析、組織和生成
- `npm run dev` - TypeScript watch 模式
- `npm run clean` - 清除 dist、output 和 data/cache 目錄
- `npm run rebuild` - 清除後重新建置

測試與驗證：
- `npm test` - 執行 Jest 測試
- `npm run test:watch` - Jest watch 模式
- `npm run test:coverage` - 測試覆蓋率報告
- `npm run lint` - ESLint 檢查
- `npm run typecheck` - TypeScript 型別檢查
- `npm run validate` - 驗證輸出檔案（執行 dist/scripts/validate-output.js）

更新 n8n 資料：
- `npm run update` - 更新 n8n 節點資料
- `npm run update:check` - 檢查更新但不實際執行（dry-run）

## 核心架構

專案採用模組化架構，分為五個主要層級：

### 1. Collectors（收集器）- src/collectors/

負責從不同來源收集原始資料：

- NpmCollector: 從 n8n NPM 套件載入節點類別和基本資訊
- ApiCollector: 從 n8n.io API 收集範本和使用統計
- DocsCollector: 從 n8n-docs GitHub 儲存庫收集節點文件

### 2. Parsers（解析器）- src/parsers/

解析和提取結構化資訊：

- NodeParser: 解析節點類別的 description 物件，提取 displayName、description、version 等
- PropertyParser: 解析節點的 properties 陣列，提取輸入欄位、operations、resources 等配置
- DocsParser: 解析 Markdown 文件，提取摘要、關鍵字、標籤和範例

### 3. Organizers（組織器）- src/organizers/

組織和排序節點：

- PriorityRanker: 使用多維度評分系統（使用次數、文件完整度、類別重要性）計算節點優先級
- CategoryOrganizer: 將節點分配到預定義類別（input、output、transform、trigger 等）
- NodeGrouper: 依據使用頻率和功能關係將節點分組

### 4. Generators（生成器）- src/generators/

生成最終輸出檔案：

- SkillGenerator: 生成主要的 Skill.md 檔案，包含前 N 個最重要的節點
- ResourceGenerator: 為每個節點生成獨立的詳細文件到 resources/ 目錄
- TemplateGenerator: 從收集的範本生成 templates/ 文件
- TemplateFormatter: 提供 Markdown 格式化工具

### 5. Scripts（建置腳本）- scripts/

編排完整的建置流程：

- build.ts: 主要建置編排腳本，依序執行收集、解析、組織和生成步驟，使用快取機制加速重複建置
- update-n8n-data.ts: 更新 n8n 節點資料的腳本
- validate-output.ts: 驗證輸出檔案完整性和正確性

## 建置流程

執行 `npm run build:full` 時的完整流程：

1. 收集節點資訊（npm-collector）：從 n8n-nodes-base 等套件載入所有節點
2. 收集節點詳細屬性（property-parser）：解析每個節點的 properties 配置
3. 收集使用統計（api-collector）：從 n8n.io API 取得範本和使用次數
4. 收集文件（docs-collector）：從 n8n-docs 儲存庫克隆並解析文件
5. 組織和排序（priority-ranker）：計算優先級分數，選出前 N 個主要節點
6. 生成資源檔案（resource-generator）：為每個節點生成詳細文件
7. 生成 templates 範本檔案（template-generator）：生成範本文件
8. 生成主 Skill 文件（skill-generator）：生成 Skill.md

快取機制：建置過程會將中間結果儲存到 data/cache/，加速後續建置。使用 `npm run clean` 清除快取。

## 設定檔

- config/skill-config.json: Skill Pack 主要配置（版本、節點數量限制、分類定義）
- config/priorities.json: 優先級評分權重和類別重要性設定
- config/categories.json: 節點類別定義和分類規則

## 輸出結構

執行建置後會在 output/ 目錄生成：

```
output/
├── Skill.md              # 主要技能檔案
└── resources/            # 詳細節點文件
    ├── input/            # 輸入類節點
    ├── output/           # 輸出類節點
    ├── transform/        # 轉換類節點
    ├── trigger/          # 觸發類節點
    ├── organization/     # 組織類節點
    ├── misc/             # 其他節點
    └── templates/        # 範本文件
```

## 重要技術細節

TypeScript 編譯：
- tsconfig.json 配置為編譯到 dist/，保持原始目錄結構
- 使用 Node.js >= 18.0.0
- 依賴 n8n 核心套件來存取節點型別定義

資料收集的挑戰：
- 節點載入使用動態 require，需處理不同套件的載入方式
- 部分節點可能缺少文件或統計資料，需要容錯處理
- Git clone n8n-docs 可能需要網路連線和較長時間

生成的 Skill Pack：
- 主 Skill.md 包含前 50 個（可設定）最重要節點的簡要資訊
- resources/ 下的詳細文件按類別組織，供 AI 按需載入
- 支援 Claude Code、Claude.ai Web 和 Claude Desktop
