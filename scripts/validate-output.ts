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
  communityPackageCount: number;
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

  // Validation rule settings
  private readonly MAX_FILE_SIZE = 1024 * 1024; // 1MB
  private readonly REQUIRED_FILES = [
    'SKILL.md',
  ];

  constructor() {
    this.outputPath = path.join(process.cwd(), 'output');
    this.configPath = path.join(process.cwd(), 'config', 'skill-config.json');
  }

  async run(): Promise<void> {
    try {
      info('Starting output file validation...\n');

      // Load config file
      await this.loadConfig();

      // Execute validations
      await this.validateFileStructure();
      await this.validateMarkdownFiles();
      await this.validateInternalLinks();
      await this.collectStatistics();

      // Generate report
      const report = this.generateReport();

      // Display report
      this.printReport(report);

      // Save report
      await this.saveReport(report);

      // Determine exit code based on result
      if (!report.passed) {
        error('Validation failed, errors found');
        process.exit(1);
      } else {
        success('Validation passed');
      }
    } catch (err) {
      error('Error occurred during validation', err);
      process.exit(1);
    }
  }

  private async loadConfig(): Promise<void> {
    try {
      const content = await fs.readFile(this.configPath, 'utf-8');
      this.config = JSON.parse(content);
      info('Config file loaded');
    } catch (err) {
      this.addIssue('error', 'config', 'Failed to load config file');
      throw err;
    }
  }

  private async validateFileStructure(): Promise<void> {
    info('[1/4] Validating file structure...');

    // Check if output directory exists
    const outputExists = await this.pathExists(this.outputPath);
    if (!outputExists) {
      this.addIssue('error', 'output', 'Output directory does not exist');
      return;
    }

    // Check required files
    for (const requiredFile of this.REQUIRED_FILES) {
      const filePath = path.join(this.outputPath, requiredFile);
      const exists = await this.pathExists(filePath);

      if (!exists) {
        this.addIssue('error', requiredFile, 'Required file does not exist');
      } else {
        info(`  Found: ${requiredFile}`);
      }
    }

    // Check node files in resources directory
    const resourcesPath = path.join(this.outputPath, 'resources');
    if (await this.pathExists(resourcesPath)) {
      const files = await this.getAllMarkdownFiles(resourcesPath);
      info(`  Found ${files.length} resource files`);
    }
  }

  private async validateMarkdownFiles(): Promise<void> {
    info('\n[2/4] Validating Markdown format...');

    const allFiles = await this.getAllMarkdownFiles(this.outputPath);

    for (const filePath of allFiles) {
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const relativePath = path.relative(this.outputPath, filePath);

        // Check file size
        const stats = await fs.stat(filePath);
        if (stats.size > this.MAX_FILE_SIZE) {
          this.addIssue(
            'warning',
            relativePath,
            `File size ${this.formatSize(stats.size)} exceeds recommended limit ${this.formatSize(this.MAX_FILE_SIZE)}`
          );
        }

        // Check Markdown syntax
        this.validateMarkdownSyntax(content, relativePath);

        // Collect file statistics
        const lines = content.split('\n');
        this.fileStats.push({
          path: relativePath,
          size: stats.size,
          lines: lines.length,
        });

        info(`  Validated: ${relativePath}`);
      } catch (err) {
        this.addIssue('error', path.relative(this.outputPath, filePath), 'Failed to read file');
      }
    }
  }

  private validateMarkdownSyntax(content: string, filePath: string): void {
    const lines = content.split('\n');

    // Check heading levels
    let lastHeadingLevel = 0;
    lines.forEach((line, index) => {
      const headingMatch = line.match(/^(#{1,6})\s/);
      if (headingMatch) {
        const level = headingMatch[1].length;

        // Check if heading level is skipped
        if (level > lastHeadingLevel + 1 && lastHeadingLevel > 0) {
          this.addIssue(
            'warning',
            filePath,
            `Line ${index + 1}: Heading level jump (from ${lastHeadingLevel} to ${level})`,
            index + 1
          );
        }

        lastHeadingLevel = level;
      }
    });

    // Check if code blocks are properly closed (exclude templates directory)
    const isTemplateFile = filePath.includes('templates/');
    if (!isTemplateFile) {
      const codeBlockMatches = content.match(/```/g);
      if (codeBlockMatches && codeBlockMatches.length % 2 !== 0) {
        this.addIssue('error', filePath, 'Code block not properly closed');
      }
    }

    // Check link format
    const brokenLinkPattern = /\[([^\]]+)\]\(\s*\)/g;
    const brokenLinks = content.match(brokenLinkPattern);
    if (brokenLinks) {
      this.addIssue('warning', filePath, `Found ${brokenLinks.length} empty links`);
    }

    // Check for unescaped special characters
    const unescapedChars = content.match(/(?<!\\)[<>]/g);
    if (unescapedChars && unescapedChars.length > 10) {
      this.addIssue(
        'info',
        filePath,
        `Found ${unescapedChars.length} potentially unescaped special characters`
      );
    }
  }

  private async validateInternalLinks(): Promise<void> {
    info('\n[3/4] Validating internal links...');

    const allFiles = await this.getAllMarkdownFiles(this.outputPath);
    const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;

    for (const filePath of allFiles) {
      const content = await fs.readFile(filePath, 'utf-8');
      const relativePath = path.relative(this.outputPath, filePath);
      const fileDir = path.dirname(filePath);

      let match;
      while ((match = linkPattern.exec(content)) !== null) {
        const linkUrl = match[2];

        // Check if it's special embed syntax (preceded by @ symbol)
        const matchIndex = match.index;
        const beforeChar = matchIndex > 0 ? content[matchIndex - 1] : '';
        const isEmbedSyntax = beforeChar === '@';

        // Skip validation if it's embed syntax
        if (isEmbedSyntax) {
          continue;
        }

        // Only check internal links (exclude http/https)
        if (!linkUrl.startsWith('http://') && !linkUrl.startsWith('https://')) {
          // Remove anchor
          const linkPath = linkUrl.split('#')[0];

          if (linkPath) {
            // Resolve relative path
            const targetPath = path.resolve(fileDir, linkPath);
            const exists = await this.pathExists(targetPath);

            if (!exists) {
              this.addIssue('error', relativePath, `Link target not found: ${linkUrl}`);
            }
          }
        }
      }
    }

    info('  Internal link validation completed');
  }

  private async collectStatistics(): Promise<void> {
    info('\n[4/4] Collecting statistics...');

    // Count nodes
    const resourcesPath = path.join(this.outputPath, 'resources');
    const nodeFiles = await this.getAllMarkdownFiles(resourcesPath);
    const nodeCount = nodeFiles.filter((f) => !f.includes('index.md')).length;

    // Count categories
    const categoryCount = this.config
      ? Object.keys(this.config.categories).length
      : 0;

    // Count community packages
    const communityPath = path.join(resourcesPath, 'community');
    let communityPackageCount = 0;
    if (await this.pathExists(communityPath)) {
      const communityFiles = await this.getAllMarkdownFiles(communityPath);
      // Exclude README.md and category summary files
      communityPackageCount = communityFiles.filter((f) => {
        const filename = path.basename(f);
        return !filename.includes('README') && !['ai-tools.md', 'communication.md', 'utilities.md', 'document.md', 'data-processing.md', 'web-scraping.md'].includes(filename);
      }).length;
      info(`  Community packages: ${communityPackageCount}`);
    }

    info(`  Node count: ${nodeCount}`);
    info(`  Category count: ${categoryCount}`);

    // Store community package count for report
    (this as any).communityPackageCount = communityPackageCount;

    // No longer validate node count limit, just record as info
    if (this.config && nodeCount > this.config.max_nodes_in_main_skill) {
      info(`  Note: Node count (${nodeCount}) exceeds config recommendation (${this.config.max_nodes_in_main_skill})`);
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
      communityPackageCount: (this as any).communityPackageCount || 0,
      issues: this.issues,
      fileStats: this.fileStats,
      passed: !hasErrors,
    };
  }

  private printReport(report: ValidationReport): void {
    info('\n========================================');
    info('Validation Report');
    info('========================================');

    info(`\nTime: ${new Date(report.timestamp).toLocaleString('en-US')}`);
    info(`Total files: ${report.totalFiles}`);
    info(`Total size: ${this.formatSize(report.totalSize)}`);
    info(`Node count: ${report.nodeCount}`);
    info(`Category count: ${report.categoryCount}`);
    if (report.communityPackageCount > 0) {
      info(`Community packages: ${report.communityPackageCount}`);
    }

    // Issue statistics
    const errorCount = report.issues.filter((i) => i.severity === 'error').length;
    const warningCount = report.issues.filter((i) => i.severity === 'warning').length;
    const infoCount = report.issues.filter((i) => i.severity === 'info').length;

    info('\nIssue Statistics:');
    if (errorCount > 0) {
      error(`  Errors: ${errorCount}`);
    } else {
      success('  Errors: 0');
    }

    if (warningCount > 0) {
      warn(`  Warnings: ${warningCount}`);
    } else {
      info(`  Warnings: ${warningCount}`);
    }

    info(`  Info: ${infoCount}`);

    // Display issue details
    if (report.issues.length > 0) {
      info('\nIssue Details:');
      info('----------------------------------------');

      // Group by severity
      const errors = report.issues.filter((i) => i.severity === 'error');
      const warnings = report.issues.filter((i) => i.severity === 'warning');
      const infos = report.issues.filter((i) => i.severity === 'info');

      // Display errors first
      if (errors.length > 0) {
        info('\nErrors (must fix):');
        for (const issue of errors) {
          const location = issue.line ? `:${issue.line}` : '';
          error(`[ERROR] ${issue.file}${location} - ${issue.message}`);
        }
      }

      // Display warnings (limit display count)
      if (warnings.length > 0) {
        info(`\nWarnings (${warnings.length} total, showing first 10):`);
        const displayWarnings = warnings.slice(0, 10);
        for (const issue of displayWarnings) {
          const location = issue.line ? `:${issue.line}` : '';
          warn(`[WARNING] ${issue.file}${location} - ${issue.message}`);
        }
        if (warnings.length > 10) {
          info(`  ... ${warnings.length - 10} more warnings not shown`);
        }
      }

      // Display info (limit display count)
      if (infos.length > 0) {
        info(`\nInfo (${infos.length} total, showing first 10):`);
        const displayInfos = infos.slice(0, 10);
        for (const issue of displayInfos) {
          const location = issue.line ? `:${issue.line}` : '';
          info(`[INFO] ${issue.file}${location} - ${issue.message}`);
        }
        if (infos.length > 10) {
          info(`  ... ${infos.length - 10} more info items not shown`);
        }
      }
    }

    // File size ranking (top 10)
    if (report.fileStats.length > 0) {
      info('\nLargest Files (top 10):');
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
      success('Validation Result: Passed');
    } else {
      error('Validation Result: Failed');
    }

    info('========================================\n');
  }

  private async saveReport(report: ValidationReport): Promise<void> {
    try {
      const reportPath = path.join(this.outputPath, 'validation-report.json');
      await fs.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf-8');
      success(`Validation report saved to: ${reportPath}`);
    } catch (err) {
      warn('Failed to save validation report');
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
      // Ignore directories that cannot be read
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

// CLI execution
if (require.main === module) {
  const validator = new OutputValidator();
  validator.run().catch((err) => {
    error('Execution failed', err);
    process.exit(1);
  });
}

export { OutputValidator, ValidationReport, ValidationIssue };
