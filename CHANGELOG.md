# 變更記錄

本檔案記錄本專案的所有重要變更。

格式基於 [Keep a Changelog](https://keepachangelog.com/zh-TW/1.0.0/)，
版本號遵循 [語義化版本](https://semver.org/lang/zh-TW/)。

## [Unreleased]

### Changed
- 重構網站更新腳本以支援完整雙語自動更新
  - 新增 README.md 和 README.zh-TW.md 自動更新功能
  - 新增 website/locales/en.json 和 zh-TW.json 自動更新功能
  - 改進 index.html 更新邏輯，使用 data-i18n 屬性匹配，移除硬編碼中文依賴
  - 區分實際節點數（從 nodes.json）和輸出檔案數（從 validation-report.json）
  - 統一管理所有更新資料（節點數、範本數、版本號、更新日期、檔案統計）
  - 確保中英文文件內容自動同步，降低維護成本

## [1.2.0] - 2025-11-04

### Changed
- 實作節點分層合併策略，大幅減少輸出檔案數量
- 優化 Skill.md 內容，讓 Claude 更好理解及搜尋檔案

## [1.1.0] - 2025-11-03

### Added
- 完整的開源專案文件（CONTRIBUTING.md、CODE_OF_CONDUCT.md、SECURITY.md）
- package.json 中加入完整的專案元資料
- README.md 加入醒目的授權警告標示
- 原始碼中加入版權聲明

### Changed
- 調整 GitHub Actions 架構：update workflow 只更新源碼，release workflow 負責建置
- .gitignore 排除 data/ 和 output/ 目錄（build 產物）

### Fixed
- 修正 workflow 職責分工，避免重複建置

## [1.0.0] - 2025-10-31

### Added
- 初始發布
- 從 n8n npm 套件收集節點資訊（540+ 個節點）
- 從 n8n.io Templates API 收集使用統計
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

### Documentation
- 完整的 README.md
- LICENSE（MIT）和 ATTRIBUTIONS.md（第三方授權聲明）
- PROJECT_STATUS.md（專案狀態報告）
- CLAUDE.md（Claude Code 開發指南）
- 各模組的詳細文件（USAGE.md、ORGANIZERS_QUICKSTART.md 等）

### Technical
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

- `Added`：新功能
- `Changed`：既有功能的變更
- `Deprecated`：即將移除的功能
- `Removed`：已移除的功能
- `Fixed`：錯誤修復
- `Security`：安全性相關修復
