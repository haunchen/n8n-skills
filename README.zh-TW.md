[English](README.md) | [繁體中文](README.zh-TW.md)

# n8n Skills

> 支援 n8n 版本：v1.121.3

n8n Skills 是一款讓 AI 助理能直接理解與操作 n8n 工作流程的自動化技能套件，涵蓋 542 個節點的完整資訊和 20 個精選範本。透過 n8n Skills，AI 助理可以幫助你快速設計工作流程、探索節點功能，讓工作流程自動化更直觀、更智能，大幅節省開發時間。

## 為什麼選擇 n8n Skills

n8n Skills 為 AI 助理工作流程整合提供完整的 n8n Skill Pack 解決方案：

- 涵蓋 542 個 n8n 節點的詳細文件和使用指南
- 提供 20 個精選工作流程範本，涵蓋 AI 聊天機器人、資料處理、通訊等常見場景
- 多維度優先級排名系統，確保最實用的資訊優先呈現
- 節點相容性分析，協助設計正確的工作流程連接
- 支援 Claude Code、Claude.ai Web 和 Claude Desktop 三大平台
- 持續更新維護，跟隨 n8n 最新版本

使用 n8n Skills，你可以：
- 快速查詢任何節點的功能、參數和配置方式
- 讓 AI 助理推薦適合特定任務的節點組合
- 學習工作流程設計最佳實踐和常見模式
- 探索 542 個節點的無限應用可能性

## 適合誰使用

n8n Skills 專為以下使用者設計：

AI 助理開發者
- 使用 Claude Code CLI 工具進行開發的工程師
- 在 Claude.ai 網頁版中尋求 n8n 知識的使用者
- Claude Desktop 桌面應用的愛好者

n8n 工作流程使用者
- 想透過 AI 輔助設計工作流程的自動化工程師
- 需要快速查詢節點功能的 n8n 開發者
- 希望探索節點最佳實踐的學習者

自動化愛好者
- 想要整合 AI 與工作流程自動化的創新者
- 尋求提升生產力的效率追求者

## 專案概述

本套件提供 AI 助理存取 n8n 節點資訊的能力，幫助 AI 理解與操作 n8n 工作流程。

### 主要功能

- 提供 n8n 節點的完整資訊
- 支援節點搜尋與探索
- 節點組態驗證
- 工作流程結構分析

### 技術架構

本專案基於 [n8n-mcp](https://github.com/czlonkowski/n8n-mcp) 架構開發，轉換為 n8n Skill Pack 生成器並新增優先級排序、節點分組與文件整合功能。n8n Skills 採用五層模組化架構（收集器、解析器、組織器、生成器、建置腳本），自動從 n8n NPM 套件、API 和文件中收集資訊，並透過智能排序生成最適合 AI 助理使用的技能套件。

## 使用 n8n Skills

本專案會生成 n8n Skills 自動化技能套件，讓你可以在 Claude Code、Claude.ai 或 Claude Desktop 中使用完整的 n8n 工作流程知識。

### 下載 n8n Skill Pack

1. 前往本專案的 [GitHub Releases](https://github.com/haunc/n8n-skill/releases) 頁面
2. 下載最新版本的 `n8n-skills-{版本號}.zip` 檔案
3. 解壓縮後會得到以下檔案結構：
   ```
   n8n-skills/
   ├── Skill.md              # 主要技能檔案
   └── resources/            # 詳細節點文件
       ├── input/            # 輸入類節點
       ├── output/           # 輸出類節點
       ├── transform/        # 轉換類節點
       ├── trigger/          # 觸發類節點
       ├── organization/     # 組織類節點
       └── misc/             # 其他節點
   ```

### 安裝方式

根據你使用的 Claude 平台，選擇對應的 n8n Skills 安裝方式：

#### Claude Code（CLI 工具）

適合在終端機中使用 Claude Code 的開發者，透過本地 skills 目錄載入 n8n Skills。

1. 在你的專案根目錄建立 `.claude/skills/` 目錄：
   ```bash
   mkdir -p .claude/skills/n8n-skills
   ```

2. 將解壓縮的 `Skill.md` 和 `resources/` 目錄複製到該目錄：
   ```bash
   cp -r n8n-skills/* .claude/skills/n8n-skills/
   ```

3. 目錄結構應如下：
   ```
   你的專案/
   └── .claude/
       └── skills/
           └── n8n-skills/
               ├── Skill.md
               └── resources/
   ```

4. 驗證安裝：在 Claude Code 中詢問「列出可用的 n8n 節點」，若能正確調用 Skill 即表示安裝成功。

#### Claude.ai Web（網頁版）

適合一般使用者在瀏覽器中使用。

1. 登入 [Claude.ai](https://claude.ai)
2. 進入「Settings」頁面，找到「Capabilities」分類
3. 點選「Upload skill」
4. 選擇下載的 `n8n-skills-{版本號}.zip` 檔案上傳
5. 上傳完成後，在底下可以看到「n8n-skills」，如未啟用就點擊啟用。
6. 回到對話視窗，詢問有關 n8n 的問題，有成功使用 n8n-skills 代表安裝成功

#### Claude Desktop（桌面應用程式）

適合使用 Claude Desktop 應用的使用者。

1. 開啟 「Claude」 桌面程式
2. 進入「Settings」頁面，找到「Capabilities」分類
3. 找到「Skills」區塊，點擊「Upload skill」
4. 選擇下載的 `n8n-skills-{版本號}.zip` 檔案上傳
5. 上傳完成後，在底下可以看到「n8n-skills」，如未啟用就點擊啟用。
6. 回到對話視窗，詢問有關 n8n 的問題，有成功使用 n8n-skills 代表安裝成功

### 基本使用範例

安裝完成後，你可以這樣使用：

查詢特定節點資訊：
```
「HTTP Request 節點有哪些主要功能？」
「如何使用 Gmail 節點發送郵件？」
「Code 節點支援哪些程式語言？」
```

探索工作流程模式：
```
「如何建立一個定時執行的工作流程？」
「資料轉換常用的節點組合有哪些？」
「如何處理 API 錯誤和重試？」
```

搜尋特定功能：
```
「哪些節點可以連接 Google Sheets？」
「有哪些 AI 相關的節點？」
「觸發類節點有哪些選擇？」
```

### 實際應用案例

以下是使用 n8n Skills 的真實場景範例：

案例 1：AI 輔助設計自動化工作流程

使用情境：你想建立一個「每日自動寄送營運報表」的工作流程。

使用 n8n Skills 前：需要手動查閱 n8n 文件，逐一研究各個節點功能，反覆試錯才能找到正確的節點組合。

使用 n8n Skills 後：直接詢問 AI 助理「如何建立定時寄送 Email 報表的工作流程？」，AI 會根據 n8n Skills 的知識推薦：
1. Schedule Trigger（定時觸發）
2. HTTP Request 或 Google Sheets（取得資料）
3. Code 或 Item Lists（資料處理）
4. Gmail 或 Send Email（寄送郵件）

節省時間：從數小時研究縮短到數分鐘完成設計。

案例 2：探索最適合的節點組合

使用情境：你想整合 Slack 通知到現有工作流程，但不確定有哪些相關節點可用。

透過 n8n Skills：詢問「有哪些節點可以發送 Slack 訊息？」，AI 會告訴你：
- Slack 節點（官方整合，功能最完整）
- HTTP Request（使用 Slack API，彈性最高）
- Webhook（接收 Slack 事件）

並說明各節點的優缺點、適用場景和設定方式。

效益：快速找到最適合需求的解決方案，避免走冤枉路。

案例 3：學習工作流程最佳實踐

使用情境：新手想學習如何處理 API 錯誤和重試機制。

透過 n8n Skills：詢問「如何處理 HTTP Request 的錯誤和重試？」，AI 會參考 20 個精選範本和 542 個節點知識，分享：
- Error Trigger 節點的使用方式
- HTTP Request 的內建重試設定
- If 節點搭配 Stop and Error 的錯誤處理模式
- 真實範例工作流程參考

學習加速：從零基礎到掌握最佳實踐，有系統地提升技能。

### 常見問題

Skill 無法載入怎麼辦？

- 確認 `Skill.md` 檔案在正確的位置
- 檢查檔案名稱是否正確（區分大小寫）
- 確認 `resources/` 目錄結構完整
- 重新啟動 Claude 應用程式或重新整理網頁

檔案結構錯誤

- 確保 `Skill.md` 和 `resources/` 在同一層目錄
- 不要修改 `resources/` 目錄內的檔案結構
- 如果解壓縮後有多層目錄，請將內容物移到正確位置

版本相容性

- 較新版本的 n8n 可能有新增節點，但大部分功能仍可使用
- 建議定期更新 Skill Pack 以獲得最新節點資訊

如何更新到新版本

1. 從 GitHub Releases 下載最新版本
2. 刪除舊的 Skill 檔案
3. 按照安裝步驟重新安裝新版本
4. 重新啟動 Claude 應用程式

### 參考資源

- [Claude Skills 官方文件](https://support.claude.com/en/articles/12580051-teach-claude-your-way-of-working-using-skills)
- [n8n 官方文件](https://docs.n8n.io)
- [問題回報](https://github.com/haunc/n8n-skill/issues)

## 開發環境安裝

```bash
npm install
```

## 開發指令

```bash
# 建置專案
npm run build

# 開發模式
npm run dev

# 執行測試
npm test

# 型別檢查
npm run typecheck
```

## 技術需求

- Node.js >= 18.0.0
- TypeScript >= 5.3.0

## 專案資訊

維護者

- Frank Chen ([@haunchen](https://github.com/haunchen))
- 專案主頁：https://github.com/haunchen/n8n-skill

版本資訊

- 目前版本：1.2.0
- 支援 n8n 版本：v1.121.3
- 最後更新：2025 年 11 月
- 發佈頻率：跟隨 n8n 主要版本更新

專案統計

- 涵蓋節點數：542 個
- 精選範本數：20 個
- 輸出檔案數：92 個
- 總文件大小：2.7 MB
- 支援平台：Claude Code、Claude.ai Web、Claude Desktop

技術特色

- 多維度優先級評分系統（使用頻率、文件品質、社群受歡迎度）
- 節點分層合併策略，優化檔案結構
- 自動化 CI/CD 流程，確保品質
- 快取機制加速建置過程
- 節點相容性矩陣分析

## 致謝

本專案使用以下資源建立：

- 基於由 Romuald Czlonkowski @ [www.aiadvisors.pl/en](https://www.aiadvisors.pl/en) 創建的 [n8n-mcp](https://github.com/czlonkowski/n8n-mcp) 專案架構
- 使用 n8n 節點型別定義與元資料
- 參考 n8n 官方文件

感謝所有貢獻者與開源社群的支援。

## 相關連結

- n8n 官方網站: https://n8n.io
- n8n GitHub: https://github.com/n8n-io/n8n
- n8n 文件: https://docs.n8n.io
- n8n-mcp 專案: https://github.com/czlonkowski/n8n-mcp

## 社群與支援

我們歡迎你的參與和回饋！

問題回報與功能建議

- 遇到問題？請到 [GitHub Issues](https://github.com/haunchen/n8n-skill/issues) 回報
- 有功能建議？歡迎開啟新的 Issue 討論
- 發現錯誤？請提供詳細的重現步驟

參與貢獻

- 查看 [CONTRIBUTING.md](./CONTRIBUTING.md) 了解如何貢獻
- Fork 專案並提交 Pull Request
- 改善文件、修正錯誤、新增功能都很歡迎
- 協助翻譯成其他語言

保持聯繫

- 追蹤專案的 [GitHub Releases](https://github.com/haunchen/n8n-skill/releases) 獲得最新版本通知
- Star 本專案以支持我們的開發工作
- 分享給需要的朋友和同事

技術支援

- 使用問題：請先查閱「常見問題」段落
- 技術討論：歡迎在 Issues 中發起討論
- n8n 相關問題：請參考 [n8n 官方文件](https://docs.n8n.io)或 [n8n 社群論壇](https://community.n8n.io)

## 授權資訊

本專案採用 MIT License，但包含以下第三方資源：

1. n8n-mcp - n8n Model Context Protocol 整合
   - 授權: MIT License
   - 來源: https://github.com/czlonkowski/n8n-mcp
   - 作者: Romuald Czlonkowski @ www.aiadvisors.pl/en

詳細授權資訊請參閱 [ATTRIBUTIONS.md](./ATTRIBUTIONS.md) 與 [LICENSE](./LICENSE)。

## 授權條款

MIT License - 詳見 [LICENSE](./LICENSE)

所有商標與版權歸其各自擁有者所有。

---

## 立即開始使用 n8n Skills

準備好讓 AI 助理幫助你設計 n8n 工作流程了嗎？

立即下載

前往 [GitHub Releases](https://github.com/haunchen/n8n-skill/releases) 下載最新版本的 n8n Skills，開始體驗 AI 輔助的工作流程設計！

加入社群

- 在 [GitHub](https://github.com/haunchen/n8n-skill) 上 Star 本專案，支持我們的開發
- 追蹤 [Releases](https://github.com/haunchen/n8n-skill/releases) 獲得最新版本通知
- 到 [Issues](https://github.com/haunchen/n8n-skill/issues) 分享你的使用經驗或提出建議

貢獻你的想法

n8n Skills 是開源專案，我們歡迎任何形式的貢獻：
- 回報問題或建議新功能
- 改善文件或翻譯
- 提交程式碼改進
- 分享你的使用案例

立即前往 [GitHub](https://github.com/haunchen/n8n-skill)，開始你的 n8n 自動化技能之旅！
