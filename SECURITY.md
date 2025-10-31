# 安全政策

## 支援的版本

目前支援安全更新的版本：

| 版本 | 支援狀態 |
| --- | --- |
| 1.x.x | :white_check_mark: |
| < 1.0 | :x: |

## 回報安全漏洞

我們非常重視安全問題。如果你發現了安全漏洞，請協助我們負責任地披露。

### 請勿公開回報

請不要在公開的 GitHub Issues 中回報安全漏洞。

### 如何回報

請透過以下方式私下回報安全漏洞：

1. 在 GitHub 上使用 [Security Advisories](https://github.com/haunchen/n8n-skill/security/advisories/new) 功能
2. 或是直接聯繫專案維護者

### 回報內容應包含

為了幫助我們更快理解和修復問題，請在回報中包含：

- 漏洞類型（例如：XSS、SQL injection、遠端程式碼執行等）
- 受影響的檔案和程式碼位置
- 重現漏洞的步驟
- 概念驗證（Proof of Concept）或範例程式碼
- 潛在影響的說明
- 可能的修復建議（如果有）

### 我們的承諾

- 在 48 小時內確認收到你的回報
- 在 7 天內提供初步評估
- 在合理的時間內修復漏洞
- 在修復發布後，會在 Release Notes 中致謝回報者（如果你希望）

## 安全最佳實踐

### 使用本專案時的安全建議

1. 依賴更新
   - 定期執行 `npm audit` 檢查已知漏洞
   - 保持依賴套件為最新版本
   - 訂閱 GitHub 的安全通知

2. 環境安全
   - 不要在程式碼中硬編碼敏感資訊
   - 使用環境變數管理設定
   - 確保 .env 檔案不被提交到版本控制

3. 執行環境
   - 使用支援的 Node.js 版本（>= 18.0.0）
   - 定期更新作業系統和執行環境
   - 限制專案的檔案系統存取權限

## 已知的安全考量

### 依賴套件

本專案依賴 n8n 相關套件，這些套件可能有自己的安全考量：

- n8n-workflow
- n8n-core
- n8n-nodes-base

請參考 n8n 官方的安全政策：https://docs.n8n.io/hosting/security/

### 資料處理

- 本專案會從 npm 套件載入 n8n 節點類別
- 本專案會從 n8n.io API 獲取公開資料
- 本專案會 clone n8n-docs Git 儲存庫

這些操作都是唯讀的，不涉及寫入外部系統。

## 授權與責任聲明

- 本專案按「現狀」提供，不提供任何明示或暗示的擔保
- 使用者應自行評估安全風險
- 本專案採用 MIT License
- 詳見 [LICENSE](./LICENSE) 檔案

## 安全更新訂閱

想要接收安全更新通知：

1. 在 GitHub 上 Watch 本專案
2. 選擇「Custom」→ 勾選「Security alerts」
3. 訂閱 Release notifications

## 參考資源

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [npm Security](https://docs.npmjs.com/about-security-audits)
- [GitHub Security](https://docs.github.com/en/code-security)

感謝你協助維護本專案的安全！
