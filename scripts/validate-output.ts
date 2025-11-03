import { promises as fs } from 'fs';
import path from 'path';
import { info, warn, error, success } from '../src/utils/logger';

interface ValidationIssue {
  severity: 'error' | 'warning' | 'info';
  file: string;
  message: string;
  line?: number;
}

interface FileStats {
  path: string;
  size: number;
  lines: number;
}

interface ValidationReport {
  timestamp: string;
  totalFiles: number;
  totalSize: number;
  nodeCount: number;
  categoryCount: number;
  issues: ValidationIssue[];
  fileStats: FileStats[];
  passed: boolean;
}

interface SkillConfig {
  max_nodes_in_main_skill: number;
  categories: Record<string, { name: string; priority: number; max_nodes: number }>;
}

class OutputValidator {
  private outputPath: string;
  private configPath: string;
  private config: SkillConfig | null = null;
  private issues: ValidationIssue[] = [];
  private fileStats: FileStats[] = [];

  // 驗證規則設定
  private readonly MAX_FILE_SIZE = 1024 * 1024; // 1MB
  private readonly MAX_LINE_LENGTH = 200;
  private readonly REQUIRED_FILES = [
    'Skill.md',
  ];

  constructor() {
    this.outputPath = path.join(process.cwd(), 'output');
    this.configPath = path.join(process.cwd(), 'config', 'skill-config.json');
  }

  async run(): Promise<void> {
    try {
      info('開始驗證輸出檔案...\n');

      // 載入設定檔
      await this.loadConfig();

      // 執行各項驗證
      await this.validateFileStructure();
      await this.validateMarkdownFiles();
      await this.validateInternalLinks();
      await this.collectStatistics();

      // 生成報告
      const report = this.generateReport();

      // 顯示報告
      this.printReport(report);

      // 儲存報告
      await this.saveReport(report);

      // 根據結果決定退出碼
      if (!report.passed) {
        error('驗證失敗，發現錯誤');
        process.exit(1);
      } else {
        success('驗證通過');
      }
    } catch (err) {
      error('驗證過程發生錯誤', err);
      process.exit(1);
    }
  }

  private async loadConfig(): Promise<void> {
    try {
      const content = await fs.readFile(this.configPath, 'utf-8');
      this.config = JSON.parse(content);
      info('已載入設定檔');
    } catch (err) {
      this.addIssue('error', 'config', '無法載入設定檔');
      throw err;
    }
  }

  private async validateFileStructure(): Promise<void> {
    info('[1/4] 驗證檔案結構...');

    // 檢查輸出目錄是否存在
    const outputExists = await this.pathExists(this.outputPath);
    if (!outputExists) {
      this.addIssue('error', 'output', '輸出目錄不存在');
      return;
    }

    // 檢查必要檔案
    for (const requiredFile of this.REQUIRED_FILES) {
      const filePath = path.join(this.outputPath, requiredFile);
      const exists = await this.pathExists(filePath);

      if (!exists) {
        this.addIssue('error', requiredFile, '必要檔案不存在');
      } else {
        info(`  找到: ${requiredFile}`);
      }
    }

    // 檢查 resources 目錄下的節點檔案
    const resourcesPath = path.join(this.outputPath, 'resources');
    if (await this.pathExists(resourcesPath)) {
      const files = await this.getAllMarkdownFiles(resourcesPath);
      info(`  找到 ${files.length} 個資源檔案`);
    }
  }

  private async validateMarkdownFiles(): Promise<void> {
    info('\n[2/4] 驗證 Markdown 格式...');

    const allFiles = await this.getAllMarkdownFiles(this.outputPath);

    for (const filePath of allFiles) {
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const relativePath = path.relative(this.outputPath, filePath);

        // 檢查檔案大小
        const stats = await fs.stat(filePath);
        if (stats.size > this.MAX_FILE_SIZE) {
          this.addIssue(
            'warning',
            relativePath,
            `檔案大小 ${this.formatSize(stats.size)} 超過建議上限 ${this.formatSize(this.MAX_FILE_SIZE)}`
          );
        }

        // 檢查行長度
        const lines = content.split('\n');
        lines.forEach((line, index) => {
          if (line.length > this.MAX_LINE_LENGTH) {
            this.addIssue(
              'warning',
              relativePath,
              `第 ${index + 1} 行過長 (${line.length} 字元)`,
              index + 1
            );
          }
        });

        // 檢查 Markdown 語法
        this.validateMarkdownSyntax(content, relativePath);

        // 收集檔案統計
        this.fileStats.push({
          path: relativePath,
          size: stats.size,
          lines: lines.length,
        });

        info(`  已驗證: ${relativePath}`);
      } catch (err) {
        this.addIssue('error', path.relative(this.outputPath, filePath), '無法讀取檔案');
      }
    }
  }

  private validateMarkdownSyntax(content: string, filePath: string): void {
    const lines = content.split('\n');

    // 檢查標題層級
    let lastHeadingLevel = 0;
    lines.forEach((line, index) => {
      const headingMatch = line.match(/^(#{1,6})\s/);
      if (headingMatch) {
        const level = headingMatch[1].length;

        // 檢查是否跳過標題層級
        if (level > lastHeadingLevel + 1 && lastHeadingLevel > 0) {
          this.addIssue(
            'warning',
            filePath,
            `第 ${index + 1} 行: 標題層級跳躍 (從 ${lastHeadingLevel} 跳到 ${level})`,
            index + 1
          );
        }

        lastHeadingLevel = level;
      }
    });

    // 檢查程式碼區塊是否正確關閉
    const codeBlockMatches = content.match(/```/g);
    if (codeBlockMatches && codeBlockMatches.length % 2 !== 0) {
      this.addIssue('error', filePath, '程式碼區塊未正確關閉');
    }

    // 檢查連結格式
    const brokenLinkPattern = /\[([^\]]+)\]\(\s*\)/g;
    const brokenLinks = content.match(brokenLinkPattern);
    if (brokenLinks) {
      this.addIssue('warning', filePath, `發現 ${brokenLinks.length} 個空連結`);
    }

    // 檢查是否有未轉義的特殊字元
    const unescapedChars = content.match(/(?<!\\)[<>]/g);
    if (unescapedChars && unescapedChars.length > 10) {
      this.addIssue(
        'info',
        filePath,
        `發現 ${unescapedChars.length} 個可能未轉義的特殊字元`
      );
    }
  }

  private async validateInternalLinks(): Promise<void> {
    info('\n[3/4] 驗證內部連結...');

    const allFiles = await this.getAllMarkdownFiles(this.outputPath);
    const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;

    for (const filePath of allFiles) {
      const content = await fs.readFile(filePath, 'utf-8');
      const relativePath = path.relative(this.outputPath, filePath);
      const fileDir = path.dirname(filePath);

      let match;
      while ((match = linkPattern.exec(content)) !== null) {
        const linkUrl = match[2];

        // 檢查是否為特殊嵌入語法（前面有 @ 符號）
        const matchIndex = match.index;
        const beforeChar = matchIndex > 0 ? content[matchIndex - 1] : '';
        const isEmbedSyntax = beforeChar === '@';

        // 如果是嵌入語法，跳過驗證
        if (isEmbedSyntax) {
          continue;
        }

        // 只檢查內部連結（排除 http/https）
        if (!linkUrl.startsWith('http://') && !linkUrl.startsWith('https://')) {
          // 移除錨點
          const linkPath = linkUrl.split('#')[0];

          if (linkPath) {
            // 解析相對路徑
            const targetPath = path.resolve(fileDir, linkPath);
            const exists = await this.pathExists(targetPath);

            if (!exists) {
              this.addIssue('error', relativePath, `找不到連結目標: ${linkUrl}`);
            }
          }
        }
      }
    }

    info('  內部連結驗證完成');
  }

  private async collectStatistics(): Promise<void> {
    info('\n[4/4] 收集統計資訊...');

    // 統計節點數量
    const resourcesPath = path.join(this.outputPath, 'resources');
    const nodeFiles = await this.getAllMarkdownFiles(resourcesPath);
    const nodeCount = nodeFiles.filter((f) => !f.includes('index.md')).length;

    // 統計分類數量
    const categoryCount = this.config
      ? Object.keys(this.config.categories).length
      : 0;

    info(`  節點數量: ${nodeCount}`);
    info(`  分類數量: ${categoryCount}`);

    // 不再驗證節點數量上限，僅作為資訊記錄
    if (this.config && nodeCount > this.config.max_nodes_in_main_skill) {
      info(`  注意: 節點數量 (${nodeCount}) 超過設定建議值 (${this.config.max_nodes_in_main_skill})`);
    }
  }

  private generateReport(): ValidationReport {
    const totalSize = this.fileStats.reduce((sum, stat) => sum + stat.size, 0);
    const hasErrors = this.issues.some((issue) => issue.severity === 'error');

    return {
      timestamp: new Date().toISOString(),
      totalFiles: this.fileStats.length,
      totalSize,
      nodeCount: this.fileStats.filter((f) => !f.path.includes('index.md')).length,
      categoryCount: this.config ? Object.keys(this.config.categories).length : 0,
      issues: this.issues,
      fileStats: this.fileStats,
      passed: !hasErrors,
    };
  }

  private printReport(report: ValidationReport): void {
    info('\n========================================');
    info('驗證報告');
    info('========================================');

    info(`\n時間: ${new Date(report.timestamp).toLocaleString('zh-TW')}`);
    info(`總檔案數: ${report.totalFiles}`);
    info(`總大小: ${this.formatSize(report.totalSize)}`);
    info(`節點數量: ${report.nodeCount}`);
    info(`分類數量: ${report.categoryCount}`);

    // 問題統計
    const errorCount = report.issues.filter((i) => i.severity === 'error').length;
    const warningCount = report.issues.filter((i) => i.severity === 'warning').length;
    const infoCount = report.issues.filter((i) => i.severity === 'info').length;

    info('\n問題統計:');
    if (errorCount > 0) {
      error(`  錯誤: ${errorCount}`);
    } else {
      success('  錯誤: 0');
    }

    if (warningCount > 0) {
      warn(`  警告: ${warningCount}`);
    } else {
      info(`  警告: ${warningCount}`);
    }

    info(`  資訊: ${infoCount}`);

    // 顯示問題詳情
    if (report.issues.length > 0) {
      info('\n問題詳情:');
      info('----------------------------------------');

      // 按嚴重程度分組顯示
      const errors = report.issues.filter((i) => i.severity === 'error');
      const warnings = report.issues.filter((i) => i.severity === 'warning');
      const infos = report.issues.filter((i) => i.severity === 'info');

      // 優先顯示錯誤
      if (errors.length > 0) {
        info('\n錯誤 (必須修復):');
        for (const issue of errors) {
          const location = issue.line ? `:${issue.line}` : '';
          error(`[錯誤] ${issue.file}${location} - ${issue.message}`);
        }
      }

      // 顯示警告（限制顯示數量）
      if (warnings.length > 0) {
        info(`\n警告 (共 ${warnings.length} 個，顯示前 10 個):`);
        const displayWarnings = warnings.slice(0, 10);
        for (const issue of displayWarnings) {
          const location = issue.line ? `:${issue.line}` : '';
          warn(`[警告] ${issue.file}${location} - ${issue.message}`);
        }
        if (warnings.length > 10) {
          info(`  ... 還有 ${warnings.length - 10} 個警告未顯示`);
        }
      }

      // 顯示資訊（限制顯示數量）
      if (infos.length > 0) {
        info(`\n資訊 (共 ${infos.length} 個，顯示前 10 個):`);
        const displayInfos = infos.slice(0, 10);
        for (const issue of displayInfos) {
          const location = issue.line ? `:${issue.line}` : '';
          info(`[資訊] ${issue.file}${location} - ${issue.message}`);
        }
        if (infos.length > 10) {
          info(`  ... 還有 ${infos.length - 10} 個資訊未顯示`);
        }
      }
    }

    // 檔案大小排名（前 10）
    if (report.fileStats.length > 0) {
      info('\n最大檔案 (前 10):');
      info('----------------------------------------');

      const sortedFiles = [...report.fileStats]
        .sort((a, b) => b.size - a.size)
        .slice(0, 10);

      for (const file of sortedFiles) {
        info(`  ${this.formatSize(file.size).padStart(8)} - ${file.path}`);
      }
    }

    info('\n========================================');

    if (report.passed) {
      success('驗證結果: 通過');
    } else {
      error('驗證結果: 失敗');
    }

    info('========================================\n');
  }

  private async saveReport(report: ValidationReport): Promise<void> {
    try {
      const reportPath = path.join(this.outputPath, 'validation-report.json');
      await fs.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf-8');
      success(`驗證報告已儲存至: ${reportPath}`);
    } catch (err) {
      warn('無法儲存驗證報告');
    }
  }

  private async getAllMarkdownFiles(dir: string): Promise<string[]> {
    const files: string[] = [];

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          const subFiles = await this.getAllMarkdownFiles(fullPath);
          files.push(...subFiles);
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          files.push(fullPath);
        }
      }
    } catch (err) {
      // 忽略無法讀取的目錄
    }

    return files;
  }

  private async pathExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private addIssue(
    severity: 'error' | 'warning' | 'info',
    file: string,
    message: string,
    line?: number
  ): void {
    this.issues.push({ severity, file, message, line });
  }

  private formatSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }
}

// CLI 執行
if (require.main === module) {
  const validator = new OutputValidator();
  validator.run().catch((err) => {
    error('執行失敗', err);
    process.exit(1);
  });
}

export { OutputValidator, ValidationReport, ValidationIssue };
