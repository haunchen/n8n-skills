import { execSync } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import simpleGit from 'simple-git';
import { info, warn, error, success } from '../src/utils/logger';

interface PackageInfo {
  name: string;
  currentVersion: string;
  latestVersion: string;
  hasUpdate: boolean;
}

interface UpdateResult {
  packages: PackageInfo[];
  docsUpdated: boolean;
  templatesUpdated: boolean;
  timestamp: string;
}

interface SkillConfig {
  version: string;
  n8n_version: string;
  build_date: string;
  max_template_examples: number;
}

class N8nDataUpdater {
  private configPath: string;
  private config: SkillConfig | null = null;
  private dryRun: boolean;
  private docsPath: string;

  constructor(dryRun: boolean = false) {
    this.configPath = path.join(process.cwd(), 'config', 'skill-config.json');
    this.dryRun = dryRun;
    this.docsPath = path.join(process.cwd(), '.cache', 'n8n-docs');
  }

  async run(): Promise<void> {
    try {
      info('開始檢查 n8n 資料更新...');
      if (this.dryRun) {
        warn('執行模式: 僅檢查，不實際更新');
      }

      // 載入設定檔
      await this.loadConfig();

      const result: UpdateResult = {
        packages: [],
        docsUpdated: false,
        templatesUpdated: false,
        timestamp: new Date().toISOString(),
      };

      // 1. 檢查 npm 套件更新
      info('\n[1/3] 檢查 npm 套件更新...');
      result.packages = await this.checkNpmPackages();

      // 2. 檢查文件儲存庫更新
      info('\n[2/3] 檢查 n8n-docs 儲存庫更新...');
      result.docsUpdated = await this.checkDocsRepository();

      // 3. 檢查範本更新
      info('\n[3/3] 檢查 n8n.io 範本更新...');
      result.templatesUpdated = await this.checkTemplates();

      // 顯示摘要
      this.printSummary(result);

      // 如果不是 dry run，詢問是否更新
      if (!this.dryRun) {
        await this.applyUpdates(result);
      }

      success('資料檢查完成');
    } catch (err) {
      error('資料更新失敗', err);
      process.exit(1);
    }
  }

  private async loadConfig(): Promise<void> {
    try {
      const content = await fs.readFile(this.configPath, 'utf-8');
      this.config = JSON.parse(content);
      info(`已載入設定檔 (n8n 版本: ${this.config?.n8n_version})`);
    } catch (err) {
      error('無法載入設定檔', err);
      throw err;
    }
  }

  private async checkNpmPackages(): Promise<PackageInfo[]> {
    const packages = ['n8n-nodes-base', '@n8n/n8n-nodes-langchain'];
    const results: PackageInfo[] = [];

    for (const pkgName of packages) {
      try {
        info(`檢查套件: ${pkgName}...`);

        // 取得目前安裝的版本
        const currentVersion = this.getCurrentVersion(pkgName);

        // 取得最新版本
        const latestVersion = this.getLatestVersion(pkgName);

        const hasUpdate = currentVersion !== latestVersion;

        results.push({
          name: pkgName,
          currentVersion,
          latestVersion,
          hasUpdate,
        });

        if (hasUpdate) {
          warn(`  ${pkgName}: ${currentVersion} -> ${latestVersion}`);
        } else {
          info(`  ${pkgName}: ${currentVersion} (最新版本)`);
        }
      } catch (err) {
        error(`檢查套件 ${pkgName} 失敗`, err);
      }
    }

    return results;
  }

  private getCurrentVersion(packageName: string): string {
    try {
      const packageJsonPath = require.resolve(`${packageName}/package.json`);
      const packageJson = require(packageJsonPath);
      return packageJson.version;
    } catch {
      return '未安裝';
    }
  }

  private getLatestVersion(packageName: string): string {
    try {
      const output = execSync(`npm view ${packageName} version`, {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      return output.trim();
    } catch (err) {
      warn(`無法取得 ${packageName} 的最新版本`);
      return '未知';
    }
  }

  private async checkDocsRepository(): Promise<boolean> {
    try {
      const exists = await this.pathExists(this.docsPath);

      if (!exists) {
        info('n8n-docs 儲存庫尚未下載');
        return true; // 需要下載
      }

      // 檢查遠端是否有更新
      const git = simpleGit(this.docsPath);

      info('檢查遠端更新...');
      await git.fetch();

      const status = await git.status();
      const hasUpdates = status.behind > 0;

      if (hasUpdates) {
        warn(`  n8n-docs: 遠端有 ${status.behind} 個新提交`);
      } else {
        info('  n8n-docs: 已是最新版本');
      }

      return hasUpdates;
    } catch (err) {
      error('檢查文件儲存庫失敗', err);
      return false;
    }
  }

  private async pathExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private async checkTemplates(): Promise<boolean> {
    try {
      // 檢查範本資料檔案是否存在
      const templateDataPath = path.join(process.cwd(), 'data', 'templates.json');
      const exists = await this.pathExists(templateDataPath);

      if (!exists) {
        info('範本資料尚未下載');
        return true;
      }

      // 檢查檔案修改時間
      const stats = await fs.stat(templateDataPath);
      const ageInDays = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);

      if (ageInDays > 7) {
        warn(`  範本資料已超過 ${Math.floor(ageInDays)} 天未更新`);
        return true;
      }

      info(`  範本資料最後更新: ${Math.floor(ageInDays)} 天前`);
      return false;
    } catch (err) {
      error('檢查範本資料失敗', err);
      return false;
    }
  }

  private printSummary(result: UpdateResult): void {
    info('\n========================================');
    info('更新檢查摘要');
    info('========================================');

    info('\nNPM 套件:');
    for (const pkg of result.packages) {
      if (pkg.hasUpdate) {
        warn(`  [更新] ${pkg.name}: ${pkg.currentVersion} -> ${pkg.latestVersion}`);
      } else {
        info(`  [最新] ${pkg.name}: ${pkg.currentVersion}`);
      }
    }

    info('\n文件儲存庫:');
    if (result.docsUpdated) {
      warn('  [更新] n8n-docs 有新的提交');
    } else {
      info('  [最新] n8n-docs 已是最新版本');
    }

    info('\n範本資料:');
    if (result.templatesUpdated) {
      warn('  [更新] 建議更新範本資料');
    } else {
      info('  [最新] 範本資料為最新');
    }

    info('\n========================================');
  }

  private async applyUpdates(result: UpdateResult): Promise<void> {
    const hasUpdates =
      result.packages.some((p) => p.hasUpdate) ||
      result.docsUpdated ||
      result.templatesUpdated;

    if (!hasUpdates) {
      info('\n所有資料都是最新版本，無需更新');
      return;
    }

    info('\n開始套用更新...');

    // 更新 npm 套件
    const packagesToUpdate = result.packages.filter((p) => p.hasUpdate);
    if (packagesToUpdate.length > 0) {
      info('\n更新 npm 套件...');
      for (const pkg of packagesToUpdate) {
        try {
          info(`  安裝 ${pkg.name}@${pkg.latestVersion}...`);
          execSync(`npm install ${pkg.name}@${pkg.latestVersion}`, {
            stdio: 'inherit',
          });
          success(`  ${pkg.name} 更新完成`);
        } catch (err) {
          error(`更新 ${pkg.name} 失敗`, err);
        }
      }
    }

    // 更新文件儲存庫
    if (result.docsUpdated) {
      info('\n更新 n8n-docs 儲存庫...');
      try {
        const exists = await this.pathExists(this.docsPath);
        if (exists) {
          const git = simpleGit(this.docsPath);
          await git.pull();
          success('  n8n-docs 更新完成');
        } else {
          const git = simpleGit();
          await fs.mkdir(path.dirname(this.docsPath), { recursive: true });
          await git.clone(
            'https://github.com/n8n-io/n8n-docs.git',
            this.docsPath,
            ['--depth', '1']
          );
          success('  n8n-docs 下載完成');
        }
      } catch (err) {
        error('更新 n8n-docs 失敗', err);
      }
    }

    // 更新範本資料
    if (result.templatesUpdated) {
      info('\n更新範本資料...');
      try {
        // 使用 ApiCollector 抓取最新範本
        const { ApiCollector } = await import('../src/collectors/api-collector');
        const collector = new ApiCollector({
          limit: this.config?.max_template_examples || 100,
        });

        const templateResult = await collector.fetchTemplates();

        // 儲存範本資料
        const dataPath = path.join(process.cwd(), 'data');
        await fs.mkdir(dataPath, { recursive: true });

        const templateDataPath = path.join(dataPath, 'templates.json');
        await fs.writeFile(
          templateDataPath,
          JSON.stringify(templateResult, null, 2),
          'utf-8'
        );

        success(`  範本資料更新完成 (${templateResult.templates.length} 個範本)`);
      } catch (err) {
        error('更新範本資料失敗', err);
      }
    }

    // 更新設定檔
    if (this.config && packagesToUpdate.some((p) => p.name === 'n8n-nodes-base')) {
      const latestN8nVersion = packagesToUpdate.find((p) => p.name === 'n8n-nodes-base')?.latestVersion;
      if (latestN8nVersion) {
        this.config.n8n_version = latestN8nVersion;
        this.config.build_date = new Date().toISOString();
        await fs.writeFile(this.configPath, JSON.stringify(this.config, null, 2), 'utf-8');
        success('\n設定檔已更新');
      }
    }
  }
}

// CLI 執行
if (require.main === module) {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  const updater = new N8nDataUpdater(dryRun);
  updater.run().catch((err) => {
    error('執行失敗', err);
    process.exit(1);
  });
}

export { N8nDataUpdater };
