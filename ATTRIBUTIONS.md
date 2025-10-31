# 資料來源授權聲明

本文件列出 n8n-skills 使用的第三方資源與其授權資訊。

## 第三方資源

### 1. n8n - 工作流程自動化平台

n8n 是一個開源的工作流程自動化工具，允許使用者建立複雜的自動化流程。

- 專案名稱: n8n
- 版權所有: Copyright (c) 2024 n8n GmbH
- 授權: Sustainable Use License
- 官方網站: https://n8n.io
- GitHub: https://github.com/n8n-io/n8n
- 授權條款: https://github.com/n8n-io/n8n/blob/master/LICENSE.md

#### 使用範圍

本專案使用 n8n 的節點型別定義與元資料，用於教學目的。不包含 n8n 的原始碼。

#### 授權要求

- n8n 採用 Sustainable Use License
- 使用 n8n 軟體時，使用者必須遵守 n8n 的授權條款
- 詳細資訊請參考 n8n 官方授權條款：https://github.com/n8n-io/n8n/blob/master/LICENSE.md

---

### 2. n8n-docs - n8n 官方文件

n8n 官方文件提供完整的節點說明、使用指南與範例。

- 專案名稱: n8n-docs
- 版權所有: Copyright (c) 2024 n8n GmbH
- 授權: MIT License
- GitHub: https://github.com/n8n-io/n8n-docs
- 授權條款: https://github.com/n8n-io/n8n-docs/blob/master/LICENSE.md

#### 使用範圍

本專案參考 n8n-docs 的文件內容，用於提供節點說明與範例。

#### MIT License 條款

```
MIT License

Copyright (c) 2024 n8n GmbH

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

### 3. n8n-mcp - n8n Model Context Protocol 整合

n8n-mcp 是一個整合 n8n 與 Model Context Protocol (MCP) 的專案，提供 AI 助理存取 n8n 節點資訊的能力。

- 專案名稱: n8n-mcp
- 作者: Romuald Czlonkowski @ www.aiadvisors.pl/en
- 版權所有: Copyright (c) 2024 Romuald Czlonkowski
- 授權: MIT License
- GitHub: https://github.com/czlonkowski/n8n-mcp
- 授權條款: https://github.com/czlonkowski/n8n-mcp/blob/main/LICENSE

#### 使用範圍

本專案基於 n8n-mcp 的架構與方法論開發，包括：

- 資料庫架構設計
- 節點解析邏輯
- MCP 工具定義
- 驗證機制

#### 致謝

本專案建立於 n8n-mcp 的基礎之上，由 Romuald Czlonkowski @ [www.aiadvisors.pl/en](https://www.aiadvisors.pl/en) 創建。

如您在專案中使用本套件，建議包含以下致謝：

```
Built with n8n-mcp (https://github.com/czlonkowski/n8n-mcp)
Created by Romuald Czlonkowski @ www.aiadvisors.pl/en
```

---

## 其他依賴套件

本專案使用以下 npm 套件：

### 執行時期依賴

- n8n-workflow - n8n 工作流程核心功能
  - 授權: Sustainable Use License
  - 版權: (c) 2024 n8n GmbH

- n8n-core - n8n 核心功能
  - 授權: Sustainable Use License
  - 版權: (c) 2024 n8n GmbH

### 開發依賴

- TypeScript - 由 Microsoft 維護
  - 授權: Apache License 2.0

- Jest - 測試框架
  - 授權: MIT License

- ESLint - 程式碼檢查工具
  - 授權: MIT License

詳細的依賴套件授權資訊請參考各套件的 LICENSE 檔案。

---

## 商標聲明

- n8n 是 n8n GmbH 的註冊商標
- 其他提及的商標均歸其各自擁有者所有
- 本專案與 n8n GmbH 無關，未經其認可或贊助

---

## 聯絡資訊

如對授權資訊有任何疑問，請聯絡：

- n8n 官方: https://n8n.io/contact
- n8n-mcp 作者: Romuald Czlonkowski @ www.aiadvisors.pl/en

---

## 授權遵循

本專案致力於遵守所有相關授權條款。如發現任何授權問題，請立即通知我們。

最後更新: 2025-10-31
