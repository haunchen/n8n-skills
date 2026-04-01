# Website SEO Multilingual Static Generation — Implementation Plan

Goal: Convert client-side i18n to build-time static HTML generation with proper SEO (hreflang, JSON-LD, og:image)

Architecture: Create `template.html` with `{{key.path}}` placeholders. `update-website.ts` reads template + locale JSONs → generates `index.html` (EN) and `zh-TW/index.html` (ZH-TW). i18n.js reduced to URL-based language redirector. Domain changed to `n8n-skills.frankchen.tw`.

Tech Stack: TypeScript (build script), vanilla HTML/CSS/JS (website)

---

### Task 1: Update locale JSONs — add aria keys

Files:
- Modify: `website/locales/en.json`
- Modify: `website/locales/zh-TW.json`

Step 1: Add `aria` section to `website/locales/en.json`

Add after the `"nav"` section:

```json
"aria": {
  "githubProject": "Visit n8n Skills GitHub repository",
  "downloadLatest": "Download the latest version of n8n Skills"
},
```

Step 2: Add `aria` section to `website/locales/zh-TW.json`

Add after the `"nav"` section:

```json
"aria": {
  "githubProject": "前往 n8n Skills GitHub 專案",
  "downloadLatest": "下載最新版本的 n8n Skills"
},
```

Step 3: Commit

```bash
git add website/locales/en.json website/locales/zh-TW.json
git commit -m "feat(website): add aria keys to locale JSONs for template system"
```

---

### Task 2: Create template.html from index.html

Files:
- Create: `website/template.html`

This is the core task. Transform `website/index.html` into a template with `{{key.path}}` placeholders.

Step 1: Copy `website/index.html` to `website/template.html`

Step 2: Apply the following transformations to `website/template.html`:

**A. HTML lang and resource paths:**
- `<html lang="zh-TW">` → `<html lang="{{__lang__}}">`
- `href="styles.css"` → `href="{{__base_path__}}styles.css"`
- `src="i18n.js"` → `src="{{__base_path__}}i18n.js"`
- `src="script.js"` → `src="{{__base_path__}}script.js"`
- `src="assets/n8n-skills-icon.png"` → `src="{{__base_path__}}assets/n8n-skills-icon.png"`

**B. Meta tags — replace entire `<head>` meta block (lines 8-33) with:**
```html
    <!-- Primary Meta Tags -->
    <title>{{meta.title}}</title>
    <meta name="title" content="{{meta.title}}">
    <meta name="description" content="{{meta.description}}">
    <meta name="keywords" content="{{meta.keywords}}">
    <meta name="author" content="Frank Chen">
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="{{__canonical__}}">
    <link rel="icon" href="{{__base_path__}}assets/n8n-skills-icon.png">

    <!-- Hreflang -->
    <link rel="alternate" hreflang="en" href="https://n8n-skills.frankchen.tw/">
    <link rel="alternate" hreflang="zh-TW" href="https://n8n-skills.frankchen.tw/zh-TW/">
    <link rel="alternate" hreflang="x-default" href="https://n8n-skills.frankchen.tw/">

    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website">
    <meta property="og:url" content="{{__canonical__}}">
    <meta property="og:title" content="{{meta.title}}">
    <meta property="og:description" content="{{meta.description}}">
    <meta property="og:locale" content="{{__og_locale__}}">
    <meta property="og:image" content="https://n8n-skills.frankchen.tw/assets/n8n-skills-icon.png">

    <!-- Twitter -->
    <meta property="twitter:card" content="summary_large_image">
    <meta property="twitter:url" content="{{__canonical__}}">
    <meta property="twitter:title" content="{{meta.title}}">
    <meta property="twitter:description" content="{{meta.description}}">
    <meta property="twitter:image" content="https://n8n-skills.frankchen.tw/assets/n8n-skills-icon.png">
```

Note: `{{__og_locale__}}` is a new special variable — `en_US` for EN, `zh_TW` for ZH-TW.

**C. JSON-LD — replace entire script block (lines 44-69) with:**
```html
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "n8n Skills",
      "applicationCategory": "DeveloperApplication",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD"
      },
      "operatingSystem": "Cross-platform",
      "description": "{{meta.description}}",
      "author": {
        "@type": "Person",
        "name": "Frank Chen"
      },
      "url": "https://n8n-skills.frankchen.tw/"
    }
    </script>
```

(Removed `aggregateRating` and `screenshot`)

**D. Language toggle button — replace (lines 74-77) with:**
```html
    <button id="lang-toggle" class="lang-toggle-fixed" onclick="window.location.href='{{__alt_lang_url__}}'">
        <span class="lang-icon">🌐</span>
        <span class="lang-text">{{__alt_lang_label__}}</span>
    </button>
```

**E. Navbar — replace data-i18n attributes with placeholders:**
- `data-i18n-aria="aria.githubProject"` → `aria-label="{{aria.githubProject}}"`
- `data-i18n="nav.getStarted" data-i18n-aria="aria.downloadLatest"` on the "開始使用" link → remove both data-i18n attrs, set text to `{{nav.getStarted}}` and add `aria-label="{{aria.downloadLatest}}"`

**F. Hero section:**
- Replace `<h1 class="hero-title">n8n Skills</h1>` with `<h1 class="hero-title">n8n Skills<span class="hero-title-separator"> — </span><span class="hero-title-sub">{{hero.subtitle}}</span></h1>`
- Replace `<p class="hero-subtitle" data-i18n="hero.subtitle">讓 AI 助理成為你的 n8n 工作流程專家</p>` — remove this element entirely (subtitle is now in H1)
- Replace `<p class="hero-description" data-i18n="hero.description">545 個節點的完整知識庫，定期更新，智慧排序</p>` → `<p class="hero-description">{{hero.description}}</p>`
- Hero buttons: same pattern as navbar — remove `data-i18n`/`data-i18n-aria`, use `{{key}}` for text and `aria-label="{{key}}"` for aria

**G. Stats section — replace all `data-i18n` with placeholders:**
- `<div class="stat-label" data-i18n="stats.nodes">n8n 節點</div>` → `<div class="stat-label">{{stats.nodes}}</div>`
- Same for stats.categories, stats.templates, stats.communityPackages, stats.clickToExpand

**H. Community section:**
- `<h3 ... data-i18n="community.title">社群套件推薦</h3>` → `<h3 ...>{{community.title}}</h3>`
- Keep the `<!-- BEGIN COMMUNITY_PACKAGES_LIST -->...<!-- END COMMUNITY_PACKAGES_LIST -->` markers intact

**I. Features section — all data-i18n → placeholders:**
- `data-i18n="features.title"` → text `{{features.title}}`
- `data-i18n="features.comprehensive.title"` → text `{{features.comprehensive.title}}`
- `data-i18n="features.comprehensive.description"` → text `{{features.comprehensive.description}}`
- Same pattern for all other feature cards (integration, priority, updates, structure)

**J. How It Works section — all data-i18n → placeholders:**
- `data-i18n="howItWorks.title"` → text `{{howItWorks.title}}`
- `data-i18n="howItWorks.step1.title"` → text `{{howItWorks.step1.title}}`
- Same for step1.description, step2.title, step2.description, step3.title, step3.description

**K. Installation section — all data-i18n → placeholders:**
- `data-i18n="installation.title"` → text `{{installation.title}}`
- `data-i18n="installation.subtitle"` → text `{{installation.subtitle}}`
- `data-i18n="installation.plugin.title"` → text `{{installation.plugin.title}}`
- `data-i18n="installation.plugin.description"` → text `{{installation.plugin.description}}`
- `data-i18n="installation.plugin.badge"` → text `{{installation.plugin.badge}}`
- `data-i18n="installation.manual.title"` → text `{{installation.manual.title}}`
- `data-i18n="installation.manual.description"` → text `{{installation.manual.description}}`
- `<span data-i18n="installation.manual.button">下載 ZIP</span>` → `<span>{{installation.manual.button}}</span>`

**L. Categories section — all data-i18n → placeholders:**
- `data-i18n="categories.title"` → text `{{categories.title}}`
- All category cards: same pattern (core, apps, triggers, ai, database, tools)

**M. Footer — all data-i18n → placeholders + fix asset path:**
- `src="assets/n8n-skills-icon.png"` → `src="{{__base_path__}}assets/n8n-skills-icon.png"`
- `data-i18n="footer.brandName"` → text `{{footer.brandName}}`
- `data-i18n="footer.slogan"` → text `{{footer.slogan}}`
- `data-i18n="footer.productInfo"` → text `{{footer.productInfo}}`
- `data-i18n="footer.features"` → text `{{footer.features}}`
- `data-i18n="footer.howToUse"` → text `{{footer.howToUse}}`
- `data-i18n="footer.otherResources"` → text `{{footer.otherResources}}`
- `data-i18n="footer.home"` → text `{{footer.home}}`
- `data-i18n="footer.n8nTutorial"` → text `{{footer.n8nTutorial}}`
- `data-i18n="footer.aboutMe"` → text `{{footer.aboutMe}}`
- `data-i18n="footer.contactMe"` → text `{{footer.contactMe}}`
- `data-i18n="footer.copyright"` → text `{{footer.copyright}}`

**N. Verify: No `data-i18n` attributes remain in template.html:**
```bash
grep -c 'data-i18n' website/template.html
# Expected: 0
```

Step 3: Commit

```bash
git add website/template.html
git commit -m "feat(website): create template.html with i18n placeholders and SEO fixes"
```

---

### Task 3: Rewrite i18n.js as URL-based language redirector

Files:
- Modify: `website/i18n.js`

Step 1: Replace entire `website/i18n.js` with:

```javascript
// Language switcher — detects current language from URL path
(function() {
  function getCurrentLang() {
    return window.location.pathname.includes('/zh-TW') ? 'zh-TW' : 'en';
  }

  function getAltUrl() {
    const loc = window.location;
    if (getCurrentLang() === 'zh-TW') {
      // Remove /zh-TW/ from path
      return loc.origin + loc.pathname.replace(/\/zh-TW\/?/, '/') + loc.search + loc.hash;
    } else {
      // Add /zh-TW/ before trailing path
      const base = loc.pathname.replace(/\/$/, '');
      return loc.origin + base + '/zh-TW/' + loc.search + loc.hash;
    }
  }

  window.i18nLang = getCurrentLang();
  window.i18nGetAltUrl = getAltUrl;
})();
```

Step 2: Commit

```bash
git add website/i18n.js
git commit -m "refactor(website): simplify i18n.js to URL-based language detection"
```

---

### Task 4: Update script.js — remove i18n initialization

Files:
- Modify: `website/script.js`

Step 1: Replace the DOMContentLoaded handler and related functions.

Remove all i18n initialization code (lines 7-31: `window.i18n = new I18n()`, `await window.i18n.init()`, language toggle setup, `updateLangToggleButton`).

Remove the `updateCategoryLabels` function and its event listener (lines 94-132).

The resulting `script.js` should only contain:
1. DOMContentLoaded handler with navbar IntersectionObserver logic
2. `initCommunityPackages()` — but remove the `updateCategoryLabels` call and event listener (lines 95-99)
3. Copy button functionality (unchanged)

Step 2: Commit

```bash
git add website/script.js
git commit -m "refactor(website): remove client-side i18n from script.js"
```

---

### Task 5: Update update-website.ts — add generateLocalizedPages()

Files:
- Modify: `scripts/update-website.ts`

Step 1: Add `SITE_DOMAIN` constant and `LocaleConfig` interface at the top of the class:

```typescript
private readonly SITE_DOMAIN = 'https://n8n-skills.frankchen.tw';

private readonly localeConfigs: Array<{
  lang: string;
  outputPath: string;
  basePath: string;
  ogLocale: string;
  altLangLabel: string;
}> = [
  {
    lang: 'en',
    outputPath: 'index.html',
    basePath: './',
    ogLocale: 'en_US',
    altLangLabel: '中文',
  },
  {
    lang: 'zh-TW',
    outputPath: 'zh-TW/index.html',
    basePath: '../',
    ogLocale: 'zh_TW',
    altLangLabel: 'English',
  },
];
```

Step 2: Add `generateLocalizedPages()` method:

```typescript
private async generateLocalizedPages(): Promise<void> {
  const templatePath = path.join(this.websiteDir, 'template.html');
  const template = await fs.readFile(templatePath, 'utf-8');

  for (const config of this.localeConfigs) {
    const localePath = path.join(this.websiteDir, 'locales', `${config.lang}.json`);
    const localeContent = await fs.readFile(localePath, 'utf-8');
    const locale = JSON.parse(localeContent);

    // Build special variables
    const canonical = config.lang === 'en'
      ? `${this.SITE_DOMAIN}/`
      : `${this.SITE_DOMAIN}/zh-TW/`;
    const altLangUrl = config.lang === 'en'
      ? `${this.SITE_DOMAIN}/zh-TW/`
      : `${this.SITE_DOMAIN}/`;

    const specialVars: Record<string, string> = {
      '__lang__': config.lang,
      '__canonical__': canonical,
      '__base_path__': config.basePath,
      '__og_locale__': config.ogLocale,
      '__alt_lang_url__': altLangUrl,
      '__alt_lang_label__': config.altLangLabel,
    };

    // Replace placeholders
    let html = template;

    // Replace special variables first
    for (const [key, value] of Object.entries(specialVars)) {
      html = html.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    }

    // Replace locale variables (supports nested keys like {{meta.title}})
    html = html.replace(/\{\{([a-zA-Z][a-zA-Z0-9_.]*)\}\}/g, (_match, keyPath: string) => {
      const keys = keyPath.split('.');
      let value: unknown = locale;
      for (const k of keys) {
        if (value && typeof value === 'object') {
          value = (value as Record<string, unknown>)[k];
        } else {
          return `{{${keyPath}}}`; // Keep unresolved
        }
      }
      return typeof value === 'string' ? value : `{{${keyPath}}}`;
    });

    // Ensure output directory exists
    const outputPath = path.join(this.websiteDir, config.outputPath);
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, html, 'utf-8');
    info(`Generated ${config.outputPath} (${config.lang})`);
  }
}
```

Step 3: Update `updateSitemap()` to generate both URLs with new domain:

```typescript
private async updateSitemap(timestamp: string): Promise<void> {
  const sitemapPath = path.join(this.websiteDir, 'sitemap.xml');
  const lastmod = timestamp.split('T')[0];

  const content = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
        <loc>${this.SITE_DOMAIN}/</loc>
        <lastmod>${lastmod}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>1.0</priority>
    </url>
    <url>
        <loc>${this.SITE_DOMAIN}/zh-TW/</loc>
        <lastmod>${lastmod}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.9</priority>
    </url>
</urlset>
`;

  await fs.writeFile(sitemapPath, content, 'utf-8');
  info('sitemap.xml update completed');
}
```

Step 4: Update `updateCommunityPackages()` — change it to inject into template instead of index.html.

The community packages are injected via `<!-- BEGIN/END COMMUNITY_PACKAGES_LIST -->` markers which are already in the template. The `updateCommunityPackages()` method currently reads/writes `index.html`. Change it to read/write `template.html` instead, and remove the stats card count update (that will be a separate stat number injection in the template).

Change `const indexPath = path.join(this.websiteDir, 'index.html');` to `const templatePath = path.join(this.websiteDir, 'template.html');` in `updateCommunityPackages()`.

Remove the stats card count update block at the end of `updateCommunityPackages()` (lines 586-589 that update `stat-number` for communityPackages).

Step 5: Update `updateIndexHtml()` — rename to `updateTemplateStats()` and change to update `template.html` instead.

This method needs to update the hardcoded stat numbers in the template (the `<div class="stat-number">545</div>` etc). It should:
- Read/write `template.html` instead of `index.html`
- Only update the stat-number divs (node count, template count, community package count)
- Remove all the meta/feature/footer text updates (those are now handled by locale JSONs + placeholders)

```typescript
private async updateTemplateStats(data: UpdateData): Promise<void> {
  const templatePath = path.join(this.websiteDir, 'template.html');
  let content = await fs.readFile(templatePath, 'utf-8');

  // Update node count stat card
  content = content.replace(
    /(<div class="stat-number">)\d+(<\/div>\s*<div class="stat-label">{{stats\.nodes}})/s,
    `$1${data.actualNodeCount}$2`
  );

  // Update template count stat card
  content = content.replace(
    /(<div class="stat-number">)\d+(<\/div>\s*<div class="stat-label">{{stats\.templates}})/s,
    `$1${data.templateCount}$2`
  );

  // Update community packages count stat card
  content = content.replace(
    /(<div class="stat-number">)\d+(<\/div>\s*<div class="stat-label">{{stats\.communityPackages}})/s,
    `$1${data.communityPackageCount}$2`
  );

  await fs.writeFile(templatePath, content, 'utf-8');
  info('template.html stats update completed');
}
```

Step 6: Update `run()` method — change execution order:

```typescript
async run(): Promise<void> {
  try {
    info('Starting website data update...');

    // 1. Collect all data
    info('Reading data sources...');
    const data = await this.collectData();

    info(`Actual node count: ${data.actualNodeCount}`);
    info(`Output file count: ${data.outputFileCount}`);
    info(`Template count: ${data.templateCount}`);
    info(`Community package count: ${data.communityPackageCount}`);
    info(`n8n version: ${data.n8nVersion}`);
    info(`Total size: ${data.totalSize}`);
    info(`Update time: ${data.timestamp}`);

    // 2. Update READMEs
    info('Updating README.md (English)...');
    await this.updateReadmeEn(data);

    info('Updating README.zh-TW.md (Traditional Chinese)...');
    await this.updateReadmeZhTW(data);

    // 3. Update locale JSONs (data source for template)
    info('Updating website/locales/en.json...');
    await this.updateLocaleEn(data);

    info('Updating website/locales/zh-TW.json...');
    await this.updateLocaleZhTW(data);

    // 4. Update template stats and community packages
    info('Updating template stats...');
    await this.updateTemplateStats(data);

    info('Updating community packages in template...');
    await this.updateCommunityPackages();

    // 5. Generate localized HTML pages from template
    info('Generating localized pages...');
    await this.generateLocalizedPages();

    // 6. Update sitemap
    info('Updating website/sitemap.xml...');
    await this.updateSitemap(data.timestamp);

    success('Website data update completed');
  } catch (err) {
    logError('Website data update failed', err);
    process.exit(1);
  }
}
```

Step 7: Commit

```bash
git add scripts/update-website.ts
git commit -m "feat(website): add static multilingual page generation to update-website"
```

---

### Task 6: Update robots.txt

Files:
- Modify: `website/robots.txt`

Step 1: Update `website/robots.txt`:

```
User-agent: *
Allow: /

Sitemap: https://n8n-skills.frankchen.tw/sitemap.xml
```

Step 2: Commit

```bash
git add website/robots.txt
git commit -m "chore(website): update robots.txt with new domain"
```

---

### Task 7: Add hero-title-sub CSS and verify

Files:
- Modify: `website/styles.css`

Step 1: Add CSS for the new H1 structure. Find the `.hero-title` rule and add after it:

```css
.hero-title-separator {
    font-weight: 300;
}

.hero-title-sub {
    font-size: 0.5em;
    font-weight: 400;
    display: block;
}
```

Step 2: Build and verify

```bash
npm run build && npm run update:website
```

Expected: No errors. Check generated files:
```bash
# Verify English version exists and has correct lang
head -5 website/index.html
# Expected: <html lang="en">

# Verify Chinese version exists
head -5 website/zh-TW/index.html
# Expected: <html lang="zh-TW">

# Verify no unresolved placeholders
grep -c '{{' website/index.html
# Expected: 0

grep -c '{{' website/zh-TW/index.html
# Expected: 0

# Verify no data-i18n attributes in generated files
grep -c 'data-i18n' website/index.html
# Expected: 0

# Verify hreflang tags
grep 'hreflang' website/index.html
# Expected: 3 lines (en, zh-TW, x-default)

# Verify sitemap has 2 URLs
grep -c '<loc>' website/sitemap.xml
# Expected: 2
```

Step 3: Commit

```bash
git add website/styles.css website/index.html website/zh-TW/index.html website/sitemap.xml
git commit -m "feat(website): generate static multilingual pages with SEO improvements"
```
