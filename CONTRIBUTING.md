# 貢獻指南

感謝你考慮為 n8n Skill Pack 專案做出貢獻！

## 重要聲明

在貢獻之前，請確保你了解並同意遵守：

- 本專案的 MIT License
- n8n 的 Sustainable Use License（使用 n8n 軟體時適用）
- 所有貢獻將以 MIT License 授權

## 如何貢獻

### 回報問題（Issues）

如果你發現了 bug 或有功能建議：

1. 先搜尋現有的 Issues，確認問題尚未被回報
2. 建立新的 Issue，並提供：
   - 清楚的標題
   - 詳細的問題描述或功能需求
   - 重現步驟（如果是 bug）
   - 預期行為與實際行為
   - 你的環境資訊（Node.js 版本、作業系統等）

### 提交程式碼（Pull Requests）

1. Fork 本專案到你的 GitHub 帳號
2. Clone 你的 fork 到本機
3. 建立新分支：`git checkout -b feature/your-feature-name`
4. 進行修改並確保：
   - 程式碼符合專案風格
   - 通過所有測試：`npm test`
   - 通過型別檢查：`npm run typecheck`
   - 通過 lint 檢查：`npm run lint`
5. Commit 你的變更：`git commit -m "描述你的變更"`
6. Push 到你的 fork：`git push origin feature/your-feature-name`
7. 在 GitHub 上建立 Pull Request

### Pull Request 準則

- PR 標題應該清楚描述變更內容
- 在 PR 描述中說明：
  - 變更的動機和目的
  - 主要的技術實作方式
  - 相關的 Issue 編號（如果有）
- 確保 CI 檢查全部通過
- 保持 PR 的範圍合理，避免過大的變更
- 回應 code review 的建議

## 開發環境設定

### 必要條件

- Node.js >= 18.0.0
- npm >= 9.0.0
- Git

### 安裝步驟

```bash
# Clone 你的 fork
git clone https://github.com/YOUR_USERNAME/n8n-skill.git
cd n8n-skill

# 安裝依賴
npm install

# 建置專案
npm run build

# 執行測試
npm test
```

### 開發流程

```bash
# 開發模式（watch mode）
npm run dev

# 型別檢查
npm run typecheck

# Lint 檢查
npm run lint

# 執行完整建置
npm run build:full

# 驗證輸出
npm run validate
```

## 程式碼風格

本專案使用以下工具維持程式碼品質：

- TypeScript（strict mode）
- ESLint
- Prettier（如果有配置）

請確保你的程式碼：
- 遵循 TypeScript 嚴格模式規範
- 通過 ESLint 檢查
- 有適當的註釋說明複雜邏輯
- 函數和變數命名清楚有意義

## 測試

- 新功能應該包含測試
- Bug 修復應該包含防止回歸的測試
- 執行 `npm test` 確保所有測試通過
- 測試覆蓋率可以用 `npm run test:coverage` 檢查

## 提交訊息規範

建議使用清楚的提交訊息：

```
類型: 簡短描述（50 字以內）

更詳細的說明（如果需要）
- 說明變更的原因
- 說明影響範圍
- 相關的 Issue 編號

Closes #123
```

類型範例：
- `feat`: 新功能
- `fix`: Bug 修復
- `docs`: 文件更新
- `style`: 程式碼格式調整
- `refactor`: 重構
- `test`: 測試相關
- `chore`: 建置工具或輔助工具變更

## 專案架構

請參考以下文件了解專案架構：

- `CLAUDE.md` - Claude Code 開發指南
- `PROJECT_STATUS.md` - 專案狀態報告
- `README.md` - 專案概述

主要目錄結構：

```
src/
├── collectors/    # 資料收集器
├── parsers/       # 資料解析器
├── organizers/    # 資料組織器
├── generators/    # 文件生成器
├── validators/    # 驗證器
└── utils/         # 工具函數
```

## 授權

提交貢獻即表示你同意你的程式碼以 MIT License 授權。

所有貢獻者必須遵守本專案的行為準則（CODE_OF_CONDUCT.md）。

## 需要幫助？

如果你有任何問題：

- 建立 Issue 詢問
- 查看現有的文件和程式碼註釋
- 參考 n8n 官方文件：https://docs.n8n.io

感謝你的貢獻！
