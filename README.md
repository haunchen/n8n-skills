# n8n Skills

> 支援 n8n 版本：v1.117.2

n8n 工作流程自動化技能套件，專為 AI 助理設計。

## 專案概述

本套件提供 AI 助理存取 n8n 節點資訊的能力，幫助 AI 理解與操作 n8n 工作流程。

### 主要功能

- 提供 n8n 節點的完整資訊
- 支援節點搜尋與探索
- 節點組態驗證
- 工作流程結構分析

### 技術架構

本專案基於 [n8n-mcp](https://github.com/czlonkowski/n8n-mcp) 架構開發，轉換為 Skill Pack 生成器並新增優先級排序、節點分組與文件整合功能。

## 使用 n8n Skills

本專案會生成 n8n Skills，讓你可以在 Claude Code、Claude.ai 或 Claude Desktop 中使用 n8n 工作流程知識。

### 下載 Skill Pack

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

根據你使用的 Claude 平台，選擇對應的安裝方式：

#### Claude Code（CLI 工具）

適合在終端機中使用 Claude Code 的開發者。

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
