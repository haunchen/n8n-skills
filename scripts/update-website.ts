import { promises as fs } from 'fs';
import path from 'path';
import { info, success, error as logError } from '../src/utils/logger';

interface ValidationReport {
  timestamp: string;
  nodeCount: number;
  categoryCount: number;
  totalFiles: number;
  totalSize: number;
}

interface UpdateData {
  actualNodeCount: number;  // Real node count from nodes.json
  outputFileCount: number;   // Output file count from validation report
  templateCount: number;
  communityPackageCount: number;  // Community packages count
  n8nVersion: string;
  timestamp: string;
  totalSize: string;         // Formatted as "X.X MB"
}

interface CommunityPackage {
  name: string;
  description: string;
  category: string;
  npmUrl: string;
  version?: string;
  maintainer?: string;
  repository?: string;
}

interface CommunityPackagesConfig {
  version: string;
  lastUpdated: string;
  limit: number;
  packages: CommunityPackage[];
}

interface PackageJson {
  dependencies: {
    n8n: string;
  };
}

class WebsiteUpdater {
  private outputDir: string;
  private websiteDir: string;

  constructor() {
    this.outputDir = path.join(process.cwd(), 'output');
    this.websiteDir = path.join(process.cwd(), 'website');
  }

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

      // 2. Update all files
      info('Updating README.md (English)...');
      await this.updateReadmeEn(data);

      info('Updating README.zh-TW.md (Traditional Chinese)...');
      await this.updateReadmeZhTW(data);

      info('Updating website/locales/en.json...');
      await this.updateLocaleEn(data);

      info('Updating website/locales/zh-TW.json...');
      await this.updateLocaleZhTW(data);

      info('Updating website/index.html...');
      await this.updateIndexHtml(data);

      info('Updating community packages list...');
      await this.updateCommunityPackages();

      info('Updating website/sitemap.xml...');
      await this.updateSitemap(data.timestamp);

      success('Website data update completed');
    } catch (err) {
      logError('Website data update failed', err);
      process.exit(1);
    }
  }

  private async collectData(): Promise<UpdateData> {
    const report = await this.readValidationReport();
    const actualNodeCount = await this.readActualNodeCount();
    const n8nVersion = await this.readN8nVersion();
    const templateCount = await this.countTemplateFiles();
    const communityConfig = await this.readCommunityPackages();

    // Format total size as MB with 1 decimal place
    const totalSizeMB = (report.totalSize / (1024 * 1024)).toFixed(1);

    return {
      actualNodeCount,
      outputFileCount: report.totalFiles,
      templateCount,
      communityPackageCount: communityConfig.packages.length,
      n8nVersion,
      timestamp: report.timestamp,
      totalSize: `${totalSizeMB} MB`,
    };
  }

  private async readValidationReport(): Promise<ValidationReport> {
    try {
      const reportPath = path.join(this.outputDir, 'validation-report.json');
      const content = await fs.readFile(reportPath, 'utf-8');
      const report: ValidationReport = JSON.parse(content);
      return report;
    } catch (err) {
      throw new Error(`Failed to read validation-report.json: ${err}`);
    }
  }

  private async readActualNodeCount(): Promise<number> {
    try {
      const nodesPath = path.join(process.cwd(), 'data', 'cache', 'nodes.json');
      const content = await fs.readFile(nodesPath, 'utf-8');
      const nodes = JSON.parse(content);
      return Array.isArray(nodes) ? nodes.length : 0;
    } catch (err) {
      throw new Error(`Failed to read nodes.json: ${err}`);
    }
  }

  private async readN8nVersion(): Promise<string> {
    try {
      const packagePath = path.join(process.cwd(), 'package.json');
      const content = await fs.readFile(packagePath, 'utf-8');
      const packageJson: PackageJson = JSON.parse(content);
      // Remove ^ or ~ prefix from version number
      return packageJson.dependencies.n8n.replace(/^[\^~]/, '');
    } catch (err) {
      throw new Error(`Failed to read package.json: ${err}`);
    }
  }

  private async countTemplateFiles(): Promise<number> {
    try {
      const templatesPath = path.join(this.outputDir, 'resources', 'templates');
      const count = await this.countMarkdownFiles(templatesPath);
      return count;
    } catch (err) {
      throw new Error(`Failed to count template files: ${err}`);
    }
  }

  private async countMarkdownFiles(dirPath: string): Promise<number> {
    let count = 0;
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        // Recursively count .md files in subdirectories
        count += await this.countMarkdownFiles(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.md') && entry.name !== 'README.md') {
        // Count .md files, but exclude README.md
        count++;
      }
    }

    return count;
  }

  private async updateReadmeEn(data: UpdateData): Promise<void> {
    try {
      const readmePath = path.join(process.cwd(), 'README.md');
      let content = await fs.readFile(readmePath, 'utf-8');

      // Format date as "Month YYYY" (e.g., "November 2025")
      const date = new Date(data.timestamp);
      const monthYear = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

      // Update version in header (line 5)
      content = content.replace(
        /> Supported n8n version: v[\d.]+/,
        `> Supported n8n version: v${data.n8nVersion}`
      );

      // Update node count and template count in intro (line 7)
      content = content.replace(
        /covering comprehensive information on \d+ nodes and \d+ curated templates/,
        `covering comprehensive information on ${data.actualNodeCount} nodes and ${data.templateCount} curated templates`
      );

      // Update node count in features section (line 13)
      content = content.replace(
        /- Covers detailed documentation and usage guides for \d+ n8n nodes/,
        `- Covers detailed documentation and usage guides for ${data.actualNodeCount} n8n nodes`
      );

      // Update template count in features section (line 14)
      content = content.replace(
        /- Provides \d+ curated workflow templates/,
        `- Provides ${data.templateCount} curated workflow templates`
      );

      // Update node count in features section (line 24)
      content = content.replace(
        /- Explore unlimited application possibilities with \d+ nodes/,
        `- Explore unlimited application possibilities with ${data.actualNodeCount} nodes`
      );

      // Update version in Project Information section (line 270)
      content = content.replace(
        /- Supported n8n Version: v[\d.]+/,
        `- Supported n8n Version: v${data.n8nVersion}`
      );

      // Update last updated date (line 271)
      content = content.replace(
        /- Last Updated: [A-Za-z]+ \d{4}/,
        `- Last Updated: ${monthYear}`
      );

      // Update Project Statistics section (lines 276-279)
      content = content.replace(
        /- Node Coverage: \d+ nodes/,
        `- Node Coverage: ${data.actualNodeCount} nodes`
      );

      content = content.replace(
        /- Curated Templates: \d+ templates/,
        `- Curated Templates: ${data.templateCount} templates`
      );

      content = content.replace(
        /- Output Files: \d+ files/,
        `- Output Files: ${data.outputFileCount} files`
      );

      content = content.replace(
        /- Total Documentation Size: [\d.]+ MB/,
        `- Total Documentation Size: ${data.totalSize}`
      );

      await fs.writeFile(readmePath, content, 'utf-8');
      info('README.md update completed');
    } catch (err) {
      throw new Error(`Failed to update README.md: ${err}`);
    }
  }

  private async updateReadmeZhTW(data: UpdateData): Promise<void> {
    try {
      const readmePath = path.join(process.cwd(), 'README.zh-TW.md');
      let content = await fs.readFile(readmePath, 'utf-8');

      // Format date as "YYYY 年 MM 月" (e.g., "2025 年 11 月")
      const date = new Date(data.timestamp);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;

      // Update version in header (line 5)
      content = content.replace(
        /> 支援 n8n 版本：v[\d.]+/,
        `> 支援 n8n 版本：v${data.n8nVersion}`
      );

      // Update node count and template count in intro (line 7)
      content = content.replace(
        /涵蓋 \d+ 個節點的完整資訊和 \d+ 個精選範本/,
        `涵蓋 ${data.actualNodeCount} 個節點的完整資訊和 ${data.templateCount} 個精選範本`
      );

      // Update node count in features section (line 13)
      content = content.replace(
        /- 涵蓋 \d+ 個 n8n 節點的詳細文件和使用指南/,
        `- 涵蓋 ${data.actualNodeCount} 個 n8n 節點的詳細文件和使用指南`
      );

      // Update template count in features section (line 14)
      content = content.replace(
        /- 提供 \d+ 個精選工作流程範本/,
        `- 提供 ${data.templateCount} 個精選工作流程範本`
      );

      // Update node count in features section (line 24)
      content = content.replace(
        /- 探索 \d+ 個節點的無限應用可能性/,
        `- 探索 ${data.actualNodeCount} 個節點的無限應用可能性`
      );

      // Update version in Project Information section (line 270)
      content = content.replace(
        /- 支援 n8n 版本：v[\d.]+/,
        `- 支援 n8n 版本：v${data.n8nVersion}`
      );

      // Update last updated date (line 271)
      content = content.replace(
        /- 最後更新：\d{4} 年 \d{1,2} 月/,
        `- 最後更新：${year} 年 ${month} 月`
      );

      // Update Project Statistics section (lines 276-279)
      content = content.replace(
        /- 涵蓋節點數：\d+ 個/,
        `- 涵蓋節點數：${data.actualNodeCount} 個`
      );

      content = content.replace(
        /- 精選範本數：\d+ 個/,
        `- 精選範本數：${data.templateCount} 個`
      );

      content = content.replace(
        /- 輸出檔案數：\d+ 個/,
        `- 輸出檔案數：${data.outputFileCount} 個`
      );

      content = content.replace(
        /- 總文件大小：[\d.]+ MB/,
        `- 總文件大小：${data.totalSize}`
      );

      await fs.writeFile(readmePath, content, 'utf-8');
      info('README.zh-TW.md update completed');
    } catch (err) {
      throw new Error(`Failed to update README.zh-TW.md: ${err}`);
    }
  }

  private async updateLocaleEn(data: UpdateData): Promise<void> {
    try {
      const localePath = path.join(this.websiteDir, 'locales', 'en.json');
      const content = await fs.readFile(localePath, 'utf-8');
      const locale = JSON.parse(content);

      // Format date as YYYY-MM-DD
      const updateDate = data.timestamp.split('T')[0];

      // Update meta description
      locale.meta.description = locale.meta.description.replace(
        /\d+ nodes/,
        `${data.actualNodeCount} nodes`
      );

      // Update hero description
      locale.hero.description = locale.hero.description.replace(
        /\d+ nodes/,
        `${data.actualNodeCount} nodes`
      );

      // Update features.comprehensive.description
      locale.features.comprehensive.description = locale.features.comprehensive.description
        .replace(/\d+ n8n nodes/, `${data.actualNodeCount} n8n nodes`)
        .replace(/n8n v[\d.]+/, `n8n v${data.n8nVersion}`);

      // Update footer version
      locale.footer.version = `Supports n8n v${data.n8nVersion} | Last updated: ${updateDate}`;

      await fs.writeFile(localePath, JSON.stringify(locale, null, 2) + '\n', 'utf-8');
      info('en.json update completed');
    } catch (err) {
      throw new Error(`Failed to update en.json: ${err}`);
    }
  }

  private async updateLocaleZhTW(data: UpdateData): Promise<void> {
    try {
      const localePath = path.join(this.websiteDir, 'locales', 'zh-TW.json');
      const content = await fs.readFile(localePath, 'utf-8');
      const locale = JSON.parse(content);

      // Format date as YYYY-MM-DD
      const updateDate = data.timestamp.split('T')[0];

      // Update meta description
      locale.meta.description = locale.meta.description.replace(
        /\d+ 個節點/,
        `${data.actualNodeCount} 個節點`
      );

      // Update hero description
      locale.hero.description = locale.hero.description.replace(
        /\d+ 個節點/,
        `${data.actualNodeCount} 個節點`
      );

      // Update features.comprehensive.description
      locale.features.comprehensive.description = locale.features.comprehensive.description
        .replace(/\d+ 個 n8n 節點/, `${data.actualNodeCount} 個 n8n 節點`)
        .replace(/n8n v[\d.]+/, `n8n v${data.n8nVersion}`);

      // Update footer version
      locale.footer.version = `支援 n8n v${data.n8nVersion} | 最後更新：${updateDate}`;

      await fs.writeFile(localePath, JSON.stringify(locale, null, 2) + '\n', 'utf-8');
      info('zh-TW.json update completed');
    } catch (err) {
      throw new Error(`Failed to update zh-TW.json: ${err}`);
    }
  }

  private async updateIndexHtml(data: UpdateData): Promise<void> {
    try {
      const indexPath = path.join(this.websiteDir, 'index.html');
      let content = await fs.readFile(indexPath, 'utf-8');

      const updateDate = data.timestamp.split('T')[0];

      // Update statistics cards - these are hardcoded numbers, not i18n
      // Note: Most text content is handled by i18n (locale JSON files),
      // but the stat numbers are direct HTML content
      // We match using data-i18n attributes since the actual text is loaded dynamically

      // 1. Update node count in statistics card (data-i18n="stats.nodes")
      content = content.replace(
        /(<div class="stat-number">)\d+(<\/div>\s*<div class="stat-label"[^>]*data-i18n="stats\.nodes")/s,
        `$1${data.actualNodeCount}$2`
      );

      // 2. Update template count in statistics card (data-i18n="stats.templates")
      content = content.replace(
        /(<div class="stat-number">)\d+(<\/div>\s*<div class="stat-label"[^>]*data-i18n="stats\.templates")/s,
        `$1${data.templateCount}$2`
      );

      // 3. Update fallback content for i18n elements (optional, will be overridden by i18n)
      // These provide default text before i18n loads

      // Update meta descriptions
      content = content.replace(
        /包含 \d+ 個節點的完整知識庫/g,
        `包含 ${data.actualNodeCount} 個節點的完整知識庫`
      );

      content = content.replace(
        /Complete knowledge base with \d+ nodes/g,
        `Complete knowledge base with ${data.actualNodeCount} nodes`
      );

      // Update hero description
      content = content.replace(
        />\d+ 個節點的完整知識庫，定期更新/,
        `>${data.actualNodeCount} 個節點的完整知識庫，定期更新`
      );

      // Update feature descriptions
      content = content.replace(
        /包含 \d+ 個 n8n 節點的詳細文件/,
        `包含 ${data.actualNodeCount} 個 n8n 節點的詳細文件`
      );

      content = content.replace(
        /Detailed documentation for \d+ n8n nodes/,
        `Detailed documentation for ${data.actualNodeCount} n8n nodes`
      );

      content = content.replace(
        /支援最新的 n8n v[\d.]+/,
        `支援最新的 n8n v${data.n8nVersion}`
      );

      content = content.replace(
        /supports the latest n8n v[\d.]+/i,
        `supports the latest n8n v${data.n8nVersion}`
      );

      // Update footer
      content = content.replace(
        /支援 n8n v[\d.]+ \| 最後更新：\d{4}-\d{2}-\d{2}/,
        `支援 n8n v${data.n8nVersion} | 最後更新：${updateDate}`
      );

      content = content.replace(
        /Supports n8n v[\d.]+ \| Last updated: \d{4}-\d{2}-\d{2}/,
        `Supports n8n v${data.n8nVersion} | Last updated: ${updateDate}`
      );

      await fs.writeFile(indexPath, content, 'utf-8');
      info('index.html update completed');
    } catch (err) {
      throw new Error(`Failed to update index.html: ${err}`);
    }
  }

  private async updateSitemap(timestamp: string): Promise<void> {
    try {
      const sitemapPath = path.join(this.websiteDir, 'sitemap.xml');
      let content = await fs.readFile(sitemapPath, 'utf-8');

      // Format timestamp for sitemap format (YYYY-MM-DD)
      const lastmod = timestamp.split('T')[0];

      // Update lastmod
      content = content.replace(
        /<lastmod>[\d-]+<\/lastmod>/g,
        `<lastmod>${lastmod}</lastmod>`
      );

      await fs.writeFile(sitemapPath, content, 'utf-8');
      info('sitemap.xml update completed');
    } catch (err) {
      throw new Error(`Failed to update sitemap.xml: ${err}`);
    }
  }

  private async readCommunityPackages(): Promise<CommunityPackagesConfig> {
    try {
      const configPath = path.join(process.cwd(), 'config', 'community-packages.json');
      const content = await fs.readFile(configPath, 'utf-8');
      return JSON.parse(content);
    } catch (err) {
      throw new Error(`Failed to read community-packages.json: ${err}`);
    }
  }

  private escapeHtml(text: string): string {
    const htmlEntities: { [key: string]: string } = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    return text.replace(/[&<>"']/g, char => htmlEntities[char]);
  }

  private generatePackageCardHtml(pkg: CommunityPackage): string {
    // Truncate description if too long
    const maxDescLength = 120;
    const description = pkg.description.length > maxDescLength
      ? pkg.description.substring(0, maxDescLength) + '...'
      : pkg.description;

    return `            <div class="community-package-card" data-category="${pkg.category}">
                <div class="package-header">
                    <span class="package-name">${this.escapeHtml(pkg.name)}</span>
                    <span class="package-category" data-category="${pkg.category}">${pkg.category}</span>
                </div>
                <p class="package-description">${this.escapeHtml(description)}</p>
                <a href="${pkg.npmUrl}" class="package-npm-link" target="_blank" rel="noopener noreferrer">
                    <svg class="npm-icon" viewBox="0 0 24 24" width="16" height="16">
                        <path fill="currentColor" d="M0 0v24h24V0H0zm19.2 19.2H12V7.2h3.6v8.4h3.6V4.8H4.8v14.4h14.4v-4.8z"/>
                    </svg>
                    npm
                </a>
            </div>`;
  }

  private async updateCommunityPackages(): Promise<void> {
    try {
      const indexPath = path.join(this.websiteDir, 'index.html');
      let content = await fs.readFile(indexPath, 'utf-8');

      const communityConfig = await this.readCommunityPackages();
      const packages = communityConfig.packages;

      // Generate package cards HTML
      const packagesHtml = packages
        .map(pkg => this.generatePackageCardHtml(pkg))
        .join('\n');

      const gridHtml = `        <div class="community-packages-grid">
${packagesHtml}
        </div>`;

      // Replace content between markers
      const listPattern = /<!-- BEGIN COMMUNITY_PACKAGES_LIST -->[\s\S]*?<!-- END COMMUNITY_PACKAGES_LIST -->/;
      const replacement = `<!-- BEGIN COMMUNITY_PACKAGES_LIST -->\n${gridHtml}\n                    <!-- END COMMUNITY_PACKAGES_LIST -->`;

      content = content.replace(listPattern, replacement);

      // Update community packages count in stats card
      content = content.replace(
        /(<div class="stat-number">)\d+(<\/div>\s*<div class="stat-label"[^>]*data-i18n="stats\.communityPackages")/s,
        `$1${packages.length}$2`
      );

      await fs.writeFile(indexPath, content, 'utf-8');
      info('Community packages list update completed');
    } catch (err) {
      throw new Error(`Failed to update community packages: ${err}`);
    }
  }
}

// Execute update
const updater = new WebsiteUpdater();
updater.run();
