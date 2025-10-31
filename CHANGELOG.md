# 變更記錄

本檔案記錄本專案的所有重要變更。

格式基於 [Keep a Changelog](https://keepachangelog.com/zh-TW/1.0.0/)，
版本號遵循 [語義化版本](https://semver.org/lang/zh-TW/)。

## [Unreleased]

### 新增
- 完整的開源專案文件（CONTRIBUTING.md、CODE_OF_CONDUCT.md、SECURITY.md）
- package.json 中加入完整的專案元資料
- README.md 加入醒目的授權警告標示
- 原始碼中加入版權聲明

### 變更
- 調整 GitHub Actions 架構：update workflow 只更新源碼，release workflow 負責建置
- .gitignore 排除 data/ 和 output/ 目錄（build 產物）

### 修復
- 修正 workflow 職責分工，避免重複建置

## [1.0.0] - 2024-10-31

### 新增
- 初始發布
- 從 n8n npm 套件收集節點資訊（540+ 個節點）
- 從 n8n.io Templates API 收集使用統計
- 從 n8n-docs 儲存庫收集文件摘要
- 優先級排序系統（依使用頻率、文件完整度、社群受歡迎度）
- 類別組織器（core、app、trigger、ai、database、utility）
- 節點分組器（依功能群組和使用頻率）
- Skill.md 主檔案生成器
- 資源檔案生成器（resources/*.md）
- 驗證器（Skill 格式驗證、完整性檢查）
- 支援 n8n v1.117.2

### GitHub Actions
- 自動更新 workflow（每週檢查 n8n 更新）
- 建置驗證 workflow（PR 和 push 時執行）
- Release workflow（自動建立 GitHub Release）

### 文件
- 完整的 README.md
- LICENSE（MIT）和 ATTRIBUTIONS.md（第三方授權聲明）
- PROJECT_STATUS.md（專案狀態報告）
- CLAUDE.md（Claude Code 開發指南）
- 各模組的詳細文件（USAGE.md、ORGANIZERS_QUICKSTART.md 等）

### 技術架構
- TypeScript 5.3+（strict mode）
- 模組化設計（collectors、parsers、organizers、generators、validators）
- 完整的型別定義
- Jest 測試框架
- ESLint 程式碼檢查

---

## 版本說明

### 版本號規則

- MAJOR（主版本）：不相容的 API 變更，或 n8n 主版本升級
- MINOR（次版本）：向下相容的功能新增，或 n8n 次版本升級
- PATCH（修訂版本）：向下相容的問題修復，或資料更新

### 標籤說明

- `新增`：新功能
- `變更`：既有功能的變更
- `棄用`：即將移除的功能
- `移除`：已移除的功能
- `修復`：錯誤修復
- `安全性`：安全性相關修復

---

## 授權資訊

本專案採用 MIT License。使用了來自 n8n 的型別定義（受 n8n Sustainable Use License 約束）。

- 本專案程式碼：MIT License
- n8n 型別定義：Sustainable Use License
- 使用 n8n 軟體時需遵循 n8n 的授權條款

詳見 [LICENSE](./LICENSE) 和 [ATTRIBUTIONS.md](./ATTRIBUTIONS.md)。

---

[Unreleased]: https://github.com/haunchen/n8n-skill/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/haunchen/n8n-skill/releases/tag/v1.0.0
