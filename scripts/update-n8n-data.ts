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
      info('Starting n8n data update check...');
      if (this.dryRun) {
        warn('Execution mode: Check only, no actual update');
      }

      // Load config file
      await this.loadConfig();

      const result: UpdateResult = {
        packages: [],
        docsUpdated: false,
        templatesUpdated: false,
        timestamp: new Date().toISOString(),
      };

      // 1. Check npm package updates
      info('\n[1/3] Checking npm package updates...');
      result.packages = await this.checkNpmPackages();

      // 2. Check docs repository updates
      info('\n[2/3] Checking n8n-docs repository updates...');
      result.docsUpdated = await this.checkDocsRepository();

      // 3. Check template updates
      info('\n[3/3] Checking n8n.io template updates...');
      result.templatesUpdated = await this.checkTemplates();

      // Display summary
      this.printSummary(result);

      // If not dry run, apply updates
      if (!this.dryRun) {
        await this.applyUpdates(result);
      }

      success('Data check completed');
    } catch (err) {
      error('Data update failed', err);
      process.exit(1);
    }
  }

  private async loadConfig(): Promise<void> {
    try {
      const content = await fs.readFile(this.configPath, 'utf-8');
      this.config = JSON.parse(content);
      info(`Loaded config file (n8n version: ${this.config?.n8n_version})`);
    } catch (err) {
      error('Failed to load config file', err);
      throw err;
    }
  }

  private async checkNpmPackages(): Promise<PackageInfo[]> {
    const packages = ['n8n-nodes-base', '@n8n/n8n-nodes-langchain'];
    const results: PackageInfo[] = [];

    for (const pkgName of packages) {
      try {
        info(`Checking package: ${pkgName}...`);

        // Get current installed version
        const currentVersion = this.getCurrentVersion(pkgName);

        // Get latest version
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
          info(`  ${pkgName}: ${currentVersion} (latest)`);
        }
      } catch (err) {
        error(`Failed to check package ${pkgName}`, err);
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
      return 'Not installed';
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
      warn(`Failed to get latest version of ${packageName}`);
      return 'Unknown';
    }
  }

  private async checkDocsRepository(): Promise<boolean> {
    try {
      const exists = await this.pathExists(this.docsPath);

      if (!exists) {
        info('n8n-docs repository not yet downloaded');
        return true; // Need to download
      }

      // Check for remote updates
      const git = simpleGit(this.docsPath);

      info('Checking remote updates...');
      await git.fetch();

      const status = await git.status();
      const hasUpdates = status.behind > 0;

      if (hasUpdates) {
        warn(`  n8n-docs: ${status.behind} new commits on remote`);
      } else {
        info('  n8n-docs: already up to date');
      }

      return hasUpdates;
    } catch (err) {
      error('Failed to check docs repository', err);
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
      // Check if template data file exists
      const templateDataPath = path.join(process.cwd(), 'data', 'templates.json');
      const exists = await this.pathExists(templateDataPath);

      if (!exists) {
        info('Template data not yet downloaded');
        return true;
      }

      // Check file modification time
      const stats = await fs.stat(templateDataPath);
      const ageInDays = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);

      if (ageInDays > 7) {
        warn(`  Template data not updated for ${Math.floor(ageInDays)} days`);
        return true;
      }

      info(`  Template data last updated: ${Math.floor(ageInDays)} days ago`);
      return false;
    } catch (err) {
      error('Failed to check template data', err);
      return false;
    }
  }

  private printSummary(result: UpdateResult): void {
    info('\n========================================');
    info('Update Check Summary');
    info('========================================');

    info('\nNPM Packages:');
    for (const pkg of result.packages) {
      if (pkg.hasUpdate) {
        warn(`  [UPDATE] ${pkg.name}: ${pkg.currentVersion} -> ${pkg.latestVersion}`);
      } else {
        info(`  [LATEST] ${pkg.name}: ${pkg.currentVersion}`);
      }
    }

    info('\nDocs Repository:');
    if (result.docsUpdated) {
      warn('  [UPDATE] n8n-docs has new commits');
    } else {
      info('  [LATEST] n8n-docs is up to date');
    }

    info('\nTemplate Data:');
    if (result.templatesUpdated) {
      warn('  [UPDATE] Template data update recommended');
    } else {
      info('  [LATEST] Template data is up to date');
    }

    info('\n========================================');
  }

  private async applyUpdates(result: UpdateResult): Promise<void> {
    const hasUpdates =
      result.packages.some((p) => p.hasUpdate) ||
      result.docsUpdated ||
      result.templatesUpdated;

    if (!hasUpdates) {
      info('\nAll data is up to date, no updates needed');
      return;
    }

    info('\nApplying updates...');

    // Update npm packages
    const packagesToUpdate = result.packages.filter((p) => p.hasUpdate);
    if (packagesToUpdate.length > 0) {
      info('\nUpdating npm packages...');
      for (const pkg of packagesToUpdate) {
        try {
          info(`  Installing ${pkg.name}@${pkg.latestVersion}...`);
          execSync(`npm install ${pkg.name}@${pkg.latestVersion}`, {
            stdio: 'inherit',
          });
          success(`  ${pkg.name} update completed`);
        } catch (err) {
          error(`Failed to update ${pkg.name}`, err);
        }
      }
    }

    // Update docs repository
    if (result.docsUpdated) {
      info('\nUpdating n8n-docs repository...');
      try {
        const exists = await this.pathExists(this.docsPath);
        if (exists) {
          const git = simpleGit(this.docsPath);
          await git.pull();
          success('  n8n-docs update completed');
        } else {
          const git = simpleGit();
          await fs.mkdir(path.dirname(this.docsPath), { recursive: true });
          await git.clone(
            'https://github.com/n8n-io/n8n-docs.git',
            this.docsPath,
            ['--depth', '1']
          );
          success('  n8n-docs download completed');
        }
      } catch (err) {
        error('Failed to update n8n-docs', err);
      }
    }

    // Update template data
    if (result.templatesUpdated) {
      info('\nUpdating template data...');
      try {
        // Use ApiCollector to fetch latest templates
        const { ApiCollector } = await import('../src/collectors/api-collector');
        const collector = new ApiCollector({
          limit: this.config?.max_template_examples || 100,
        });

        const templateResult = await collector.fetchTemplates();

        // Save template data
        const dataPath = path.join(process.cwd(), 'data');
        await fs.mkdir(dataPath, { recursive: true });

        const templateDataPath = path.join(dataPath, 'templates.json');
        await fs.writeFile(
          templateDataPath,
          JSON.stringify(templateResult, null, 2),
          'utf-8'
        );

        success(`  Template data update completed (${templateResult.templates.length} templates)`);
      } catch (err) {
        error('Failed to update template data', err);
      }
    }

    // Update config file
    if (this.config && packagesToUpdate.some((p) => p.name === 'n8n-nodes-base')) {
      const latestN8nVersion = packagesToUpdate.find((p) => p.name === 'n8n-nodes-base')?.latestVersion;
      if (latestN8nVersion) {
        this.config.n8n_version = latestN8nVersion;
        this.config.build_date = new Date().toISOString();
        await fs.writeFile(this.configPath, JSON.stringify(this.config, null, 2), 'utf-8');
        success('\nConfig file updated');
      }
    }
  }
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  const updater = new N8nDataUpdater(dryRun);
  updater.run().catch((err) => {
    error('Execution failed', err);
    process.exit(1);
  });
}

export { N8nDataUpdater };
