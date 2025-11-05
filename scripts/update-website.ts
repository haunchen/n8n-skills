import { promises as fs } from 'fs';
import path from 'path';
import { info, success, error as logError } from '../src/utils/logger';

interface ValidationReport {
  timestamp: string;
  nodeCount: number;
  categoryCount: number;
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

      // 1. Read data sources
      info('Reading data sources...');
      const { nodeCount, timestamp } = await this.readValidationReport();
      const n8nVersion = await this.readN8nVersion();
      const templateCount = await this.countTemplateFiles();

      info(`Node count: ${nodeCount}`);
      info(`n8n version: ${n8nVersion}`);
      info(`Workflow templates: ${templateCount}`);
      info(`Update time: ${timestamp}`);

      // 2. Update index.html
      info('Updating index.html...');
      await this.updateIndexHtml(nodeCount, n8nVersion, timestamp, templateCount);

      // 3. Update sitemap.xml
      info('Updating sitemap.xml...');
      await this.updateSitemap(timestamp);

      success('Website data update completed');
    } catch (err) {
      logError('Website data update failed', err);
      process.exit(1);
    }
  }

  private async readValidationReport(): Promise<{ nodeCount: number; timestamp: string }> {
    try {
      const reportPath = path.join(this.outputDir, 'validation-report.json');
      const content = await fs.readFile(reportPath, 'utf-8');
      const report: ValidationReport = JSON.parse(content);
      return {
        nodeCount: report.nodeCount,
        timestamp: report.timestamp,
      };
    } catch (err) {
      throw new Error(`Failed to read validation-report.json: ${err}`);
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

  private async updateIndexHtml(
    nodeCount: number,
    n8nVersion: string,
    timestamp: string,
    templateCount: number
  ): Promise<void> {
    try {
      const indexPath = path.join(this.websiteDir, 'index.html');
      let content = await fs.readFile(indexPath, 'utf-8');

      // Format update date (convert from ISO format to YYYY-MM-DD)
      const updateDate = timestamp.split('T')[0];

      // 1. Update node count (8 locations)
      // meta description (line 10)
      content = content.replace(
        /包含 \d+ 個節點的完整知識庫/g,
        `包含 ${nodeCount} 個節點的完整知識庫`
      );

      // Hero description (line 91)
      content = content.replace(
        /<p class="hero-description">\d+ 個節點的完整知識庫/,
        `<p class="hero-description">${nodeCount} 個節點的完整知識庫`
      );

      // Statistics card - n8n nodes (line 110)
      content = content.replace(
        /(<div class="stat-number">)\d+(<\/div>\s*<div class="stat-label">n8n 節點<\/div>)/,
        `$1${nodeCount}$2`
      );

      // Feature description (line 137)
      content = content.replace(
        /包含 \d+ 個 n8n 節點的詳細文件/,
        `包含 ${nodeCount} 個 n8n 節點的詳細文件`
      );

      // 2. Update workflow template count (1 location)
      content = content.replace(
        /(<div class="stat-number">)\d+(<\/div>\s*<div class="stat-label">工作流程範本<\/div>)/,
        `$1${templateCount}$2`
      );

      // 3. Update n8n version number (2 locations)
      // Feature description (line 137)
      content = content.replace(
        /支援最新的 n8n v[\d.]+/,
        `支援最新的 n8n v${n8nVersion}`
      );

      // Footer (line 231)
      content = content.replace(
        /支援 n8n v[\d.]+/,
        `支援 n8n v${n8nVersion}`
      );

      // 4. Update last update date (1 location)
      content = content.replace(
        /最後更新：\d{4}-\d{2}-\d{2}/,
        `最後更新：${updateDate}`
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
}

// Execute update
const updater = new WebsiteUpdater();
updater.run();
