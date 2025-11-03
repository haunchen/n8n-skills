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
      info('開始更新網站資料...');

      // 1. 讀取資料來源
      info('讀取資料來源...');
      const { nodeCount, timestamp } = await this.readValidationReport();
      const n8nVersion = await this.readN8nVersion();
      const templateCount = await this.countTemplateFiles();

      info(`節點數量: ${nodeCount}`);
      info(`n8n 版本: ${n8nVersion}`);
      info(`工作流程範本: ${templateCount}`);
      info(`更新時間: ${timestamp}`);

      // 2. 更新 index.html
      info('更新 index.html...');
      await this.updateIndexHtml(nodeCount, n8nVersion, timestamp, templateCount);

      // 3. 更新 sitemap.xml
      info('更新 sitemap.xml...');
      await this.updateSitemap(timestamp);

      success('網站資料更新完成');
    } catch (err) {
      logError('網站資料更新失敗', err);
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
      throw new Error(`無法讀取 validation-report.json: ${err}`);
    }
  }

  private async readN8nVersion(): Promise<string> {
    try {
      const packagePath = path.join(process.cwd(), 'package.json');
      const content = await fs.readFile(packagePath, 'utf-8');
      const packageJson: PackageJson = JSON.parse(content);
      // 移除版本號前的 ^ 或 ~ 符號
      return packageJson.dependencies.n8n.replace(/^[\^~]/, '');
    } catch (err) {
      throw new Error(`無法讀取 package.json: ${err}`);
    }
  }

  private async countTemplateFiles(): Promise<number> {
    try {
      const templatesPath = path.join(this.outputDir, 'resources', 'templates');
      const count = await this.countMarkdownFiles(templatesPath);
      return count;
    } catch (err) {
      throw new Error(`無法計算範本檔案數量: ${err}`);
    }
  }

  private async countMarkdownFiles(dirPath: string): Promise<number> {
    let count = 0;
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        // 遞迴計算子目錄中的 .md 檔案
        count += await this.countMarkdownFiles(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.md') && entry.name !== 'README.md') {
        // 計算 .md 檔案，但排除 README.md
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

      // 格式化更新日期（從 ISO 格式轉換為 YYYY-MM-DD）
      const updateDate = timestamp.split('T')[0];

      // 1. 更新節點數量（8 處）
      // meta description (第 10 行)
      content = content.replace(
        /包含 \d+ 個節點的完整知識庫/g,
        `包含 ${nodeCount} 個節點的完整知識庫`
      );

      // Hero description (第 91 行)
      content = content.replace(
        /<p class="hero-description">\d+ 個節點的完整知識庫/,
        `<p class="hero-description">${nodeCount} 個節點的完整知識庫`
      );

      // 統計卡片 - n8n 節點 (第 110 行)
      content = content.replace(
        /(<div class="stat-number">)\d+(<\/div>\s*<div class="stat-label">n8n 節點<\/div>)/,
        `$1${nodeCount}$2`
      );

      // 功能說明 (第 137 行)
      content = content.replace(
        /包含 \d+ 個 n8n 節點的詳細文件/,
        `包含 ${nodeCount} 個 n8n 節點的詳細文件`
      );

      // 2. 更新工作流程範本數量（1 處）
      content = content.replace(
        /(<div class="stat-number">)\d+(<\/div>\s*<div class="stat-label">工作流程範本<\/div>)/,
        `$1${templateCount}$2`
      );

      // 3. 更新 n8n 版本號（2 處）
      // 功能說明 (第 137 行)
      content = content.replace(
        /支援最新的 n8n v[\d.]+/,
        `支援最新的 n8n v${n8nVersion}`
      );

      // Footer (第 231 行)
      content = content.replace(
        /支援 n8n v[\d.]+/,
        `支援 n8n v${n8nVersion}`
      );

      // 4. 更新最後更新日期（1 處）
      content = content.replace(
        /最後更新：\d{4}-\d{2}-\d{2}/,
        `最後更新：${updateDate}`
      );

      await fs.writeFile(indexPath, content, 'utf-8');
      info('index.html 更新完成');
    } catch (err) {
      throw new Error(`無法更新 index.html: ${err}`);
    }
  }

  private async updateSitemap(timestamp: string): Promise<void> {
    try {
      const sitemapPath = path.join(this.websiteDir, 'sitemap.xml');
      let content = await fs.readFile(sitemapPath, 'utf-8');

      // 格式化時間戳為 sitemap 格式 (YYYY-MM-DD)
      const lastmod = timestamp.split('T')[0];

      // 更新 lastmod
      content = content.replace(
        /<lastmod>[\d-]+<\/lastmod>/g,
        `<lastmod>${lastmod}</lastmod>`
      );

      await fs.writeFile(sitemapPath, content, 'utf-8');
      info('sitemap.xml 更新完成');
    } catch (err) {
      throw new Error(`無法更新 sitemap.xml: ${err}`);
    }
  }
}

// 執行更新
const updater = new WebsiteUpdater();
updater.run();
