# 網站 SEO 多語言靜態化設計

> 日期：2026-03-31
> 狀態：已驗證

## 問題

現有網站使用 client-side i18n.js 動態替換文字和 meta tags，搜尋引擎爬蟲只看到初始 HTML（中文），英文內容無法被索引。另有 JSON-LD 錯誤、缺少 og:image、缺少 hreflang 等 SEO 問題。

## 設計決策

- 方案：建置腳本生成靜態多語言 HTML（方案 B + 選項 2）
- 預設語言：英文
- 網域：`n8n-skills.frankchen.tw`
- URL 結構：`/`（EN）、`/zh-TW/`（ZH-TW）

## 檔案結構

```
website/
├── template.html          # 新增：HTML 模板（含 {{placeholder}}）
├── index.html             # 生成：英文版（預設）
├── zh-TW/
│   └── index.html         # 生成：中文版
├── styles.css             # 不動
├── script.js              # 不動
├── i18n.js                # 改造：僅做語言切換導向
├── locales/               # 不動（作為模板資料來源）
├── robots.txt             # 更新 URL
├── sitemap.xml            # 更新：兩個 URL
└── assets/                # 不動
```

## 模板機制

### 佔位符

用 `{{key.path}}` 對應 locales JSON 結構。特殊變數：

| 變數 | 英文版 | 中文版 |
|------|--------|--------|
| `{{__lang__}}` | `en` | `zh-TW` |
| `{{__canonical__}}` | `https://n8n-skills.frankchen.tw/` | `https://n8n-skills.frankchen.tw/zh-TW/` |
| `{{__base_path__}}` | `./` | `../` |
| `{{__alt_lang_url__}}` | `https://n8n-skills.frankchen.tw/zh-TW/` | `https://n8n-skills.frankchen.tw/` |
| `{{__alt_lang_label__}}` | `中文` | `English` |

### 生成流程

對每個語言：
1. 讀取 template.html
2. 讀取 locales/{lang}.json
3. 計算特殊變數
4. 遞迴替換所有 `{{key.path}}` 佔位符
5. 注入社群套件卡片（維持 marker 機制）
6. 注入統計數字
7. 寫入目標路徑

### data-i18n 屬性

模板中移除所有 `data-i18n` 和 `data-i18n-aria` 屬性。文字由佔位符替換直接寫死，生成後的 HTML 是純靜態。

## SEO 修正

### hreflang（每頁都有）

```html
<link rel="alternate" hreflang="en" href="https://n8n-skills.frankchen.tw/">
<link rel="alternate" hreflang="zh-TW" href="https://n8n-skills.frankchen.tw/zh-TW/">
<link rel="alternate" hreflang="x-default" href="https://n8n-skills.frankchen.tw/">
```

### JSON-LD

- 移除 `aggregateRating`（僅 1 個評分，Google 視為可疑）
- 移除 `screenshot`（指向首頁非圖片）
- `description` 各語言版本直接寫在生成的 HTML 中

### 新增 meta 標籤

- `og:image` / `twitter:image`：使用 `assets/n8n-skills-icon.png`
- `<link rel="icon">`：使用 `assets/n8n-skills-icon.png`

### H1 改善

- 英文：`n8n Skills — Turn your AI assistant into an n8n workflow expert`
- 中文：`n8n Skills — 讓 AI 助理成為你的 n8n 工作流程專家`
- 用 hero.subtitle 佔位符：`<h1>n8n Skills — {{hero.subtitle}}</h1>`

### sitemap.xml

```xml
<url>
  <loc>https://n8n-skills.frankchen.tw/</loc>
  <lastmod>YYYY-MM-DD</lastmod>
  <changefreq>weekly</changefreq>
  <priority>1.0</priority>
</url>
<url>
  <loc>https://n8n-skills.frankchen.tw/zh-TW/</loc>
  <lastmod>YYYY-MM-DD</lastmod>
  <changefreq>weekly</changefreq>
  <priority>0.9</priority>
</url>
```

## i18n.js 改造

從 ~190 行縮減到 ~20 行，只做：
1. 語言切換按鈕綁定 — 點擊跳轉到另一語言頁面
2. 當前語言判斷 — 從 `window.location.pathname` 判斷

移除：`loadTranslations()`、`updatePageContent()`、`updateMetaTags()`、localStorage。

## update-website.ts 改動

### 新增方法

- `generateLocalizedPages()` — 讀模板 + locale JSON → 生成兩份 HTML

### 移除方法

- `updateIndexHtml()` — 被 `generateLocalizedPages()` 取代

### 保留方法

- `collectData()` — 不動
- `updateReadmeEn()` / `updateReadmeZhTW()` — 不動
- `updateLocaleEn()` / `updateLocaleZhTW()` — 保留，locale JSON 仍是模板資料來源
- `updateCommunityPackages()` — 拆成：生成卡片 HTML 字串 + 在生成頁面時注入
- `updateSitemap()` — 改為生成包含兩個 URL 的 sitemap

### 執行順序

```
1. collectData()
2. updateReadmeEn() + updateReadmeZhTW()
3. updateLocaleEn() + updateLocaleZhTW()     ← 先更新 locale JSON 數字
4. generateLocalizedPages()                    ← 再用更新後的 locale 生成 HTML
5. updateSitemap()
```

## CSS/JS 路徑

模板中用 `{{__base_path__}}` 前綴：
```html
<link rel="stylesheet" href="{{__base_path__}}styles.css">
<script src="{{__base_path__}}i18n.js"></script>
<script src="{{__base_path__}}script.js"></script>
<link rel="icon" href="{{__base_path__}}assets/n8n-skills-icon.png">
```

英文版 `./`，中文版 `../`。
