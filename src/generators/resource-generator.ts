/**
 * Copyright (c) 2025 Frank Chen @ www.frankchen.tw/personal
 * SPDX-License-Identifier: MIT
 *
 * This file is part of n8n-skills project.
 */

import { promises as fs } from 'fs';
import path from 'path';
import type { EnrichedNodeInfo, ResourceFile } from './skill-generator';
import type { Operation, CoreProperty } from '../parsers/property-parser';

/**
 * 資源生成器配置
 */
export interface ResourceGeneratorConfig {
  outputDir: string;
  overwrite?: boolean;
}

/**
 * 預設配置
 */
const DEFAULT_CONFIG: Required<ResourceGeneratorConfig> = {
  outputDir: path.join(process.cwd(), 'output/resources'),
  overwrite: true,
};

/**
 * 資源生成器
 * 為每個節點生成詳細的 Markdown 文件，按分類組織
 */
export class ResourceGenerator {
  private config: Required<ResourceGeneratorConfig>;
  private processedCount: number = 0;

  constructor(config: ResourceGeneratorConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 批次生成所有資源檔案
   * 按分類組織節點並生成對應的文件和索引
   */
  public async generateAll(nodes: EnrichedNodeInfo[]): Promise<ResourceFile[]> {
    const resourceFiles: ResourceFile[] = [];
    const categorizedNodes = new Map<string, EnrichedNodeInfo[]>();
    this.processedCount = 0;

    // 確保輸出目錄存在
    await this.ensureDirectory(this.config.outputDir);

    // 按分類分組節點
    for (const node of nodes) {
      const category = node.category || 'misc';
      if (!categorizedNodes.has(category)) {
        categorizedNodes.set(category, []);
      }
      categorizedNodes.get(category)!.push(node);
    }

    // 為每個分類生成檔案
    for (const [category, categoryNodes] of categorizedNodes) {
      const categoryDir = path.join(this.config.outputDir, category);
      await this.ensureDirectory(categoryDir);

      // 生成該分類的節點檔案
      for (const node of categoryNodes) {
        try {
          const filename = `${node.nodeType}.md`;
          const filepath = path.join(categoryDir, filename);
          const content = this.buildContent(node);

          await fs.writeFile(filepath, content, 'utf-8');

          resourceFiles.push({
            name: node.displayName,
            path: `resources/${category}/${filename}`,
            description: node.description,
            category: node.category,
          });

          this.processedCount++;
        } catch (error) {
          // 忽略個別檔案生成錯誤，繼續處理其他檔案
          console.warn(`生成資源檔案失敗: ${node.displayName}`, error);
        }
      }

      // 生成該分類的索引檔案
      await this.generateCategoryIndex(category, categoryNodes);
    }

    return resourceFiles;
  }

  /**
   * 生成分類索引檔案
   */
  private async generateCategoryIndex(category: string, nodes: EnrichedNodeInfo[]): Promise<void> {
    const lines: string[] = [];

    // 分類名稱對照
    const categoryNames: Record<string, string> = {
      transform: '資料轉換節點',
      input: '輸入節點',
      output: '輸出節點',
      trigger: '觸發器節點',
      organization: '組織節點',
      misc: '其他節點',
    };

    const categoryName = categoryNames[category] || category;

    lines.push(`# ${categoryName}`);
    lines.push('');
    lines.push(`共 ${nodes.length} 個節點`);
    lines.push('');

    // 按字母順序排序
    const sortedNodes = [...nodes].sort((a, b) =>
      a.displayName.localeCompare(b.displayName, 'zh-TW')
    );

    // 生成節點列表
    lines.push('## 節點列表');
    lines.push('');
    sortedNodes.forEach(node => {
      const filename = `${node.nodeType}.md`;
      const description = node.description || '';
      lines.push(`- [${node.displayName}](./${filename}) - ${description}`);
    });
    lines.push('');

    // 寫入索引檔案
    const indexPath = path.join(this.config.outputDir, category, 'README.md');
    await fs.writeFile(indexPath, lines.join('\n'), 'utf-8');
  }

  /**
   * 建立完整資源檔案內容
   */
  private buildContent(node: EnrichedNodeInfo): string {
    const lines: string[] = [];

    // 標題
    lines.push(`# ${node.displayName}`);
    lines.push('');

    // 基本資訊
    this.appendBasicInfo(lines, node);

    // 描述
    if (node.description) {
      lines.push('## 描述');
      lines.push('');
      lines.push(node.description);
      lines.push('');
    }

    // 操作列表
    if (node.properties?.operations && node.properties.operations.length > 0) {
      lines.push('## 可用操作');
      lines.push('');
      this.appendOperations(lines, node.properties.operations);
    }

    // 核心屬性
    if (node.properties?.coreProperties && node.properties.coreProperties.length > 0) {
      this.appendProperties(lines, node.properties.coreProperties);
    }

    // JSON 配置範例（增強版：1-3 個範例）
    this.appendExamples(lines, node);

    // 文件資訊
    if (node.documentation) {
      if (node.documentation.description) {
        lines.push('## 詳細說明');
        lines.push('');
        lines.push(node.documentation.description);
        lines.push('');
      }

      if (node.documentation.officialUrl) {
        lines.push('## 更多資訊');
        lines.push('');
        lines.push(`[官方文件](${node.documentation.officialUrl})`);
        lines.push('');
      }
    }

    return lines.join('\n');
  }

  /**
   * 附加基本資訊
   */
  private appendBasicInfo(lines: string[], node: EnrichedNodeInfo): void {
    lines.push('## 基本資訊');
    lines.push('');
    lines.push(`- 節點類型: \`${node.nodeType}\``);
    lines.push(`- 分類: ${node.category}`);
    lines.push(`- 套件: ${node.packageName}`);

    if (node.usageCount !== undefined && node.usageCount > 0) {
      lines.push(`- 使用次數: ${node.usageCount}`);
    }
    if (node.usagePercentage !== undefined && node.usagePercentage > 0) {
      lines.push(`- 使用率: ${node.usagePercentage.toFixed(2)}%`);
    }
    if (node.properties?.hasCredentials) {
      lines.push(`- 需要憑證: 是`);
    }

    lines.push('');
  }

  /**
   * 附加操作列表
   */
  private appendOperations(lines: string[], operations: Operation[]): void {
    operations.forEach(op => {
      lines.push(`### ${op.name}`);
      if (op.description) {
        lines.push(`${op.description}`);
      }
      lines.push(`- 值: \`${op.value}\``);
      if (op.resource) {
        lines.push(`- 資源: \`${op.resource}\``);
      }
      lines.push('');
    });
  }

  /**
   * 附加屬性列表
   */
  private appendProperties(lines: string[], properties: CoreProperty[]): void {
    lines.push('## 核心屬性');
    lines.push('');
    lines.push('| 屬性名稱 | 類型 | 必填 | 預設值 | 描述 |');
    lines.push('|---------|------|------|--------|------|');

    properties.forEach(prop => {
      const defaultValue = prop.default !== undefined ? `\`${JSON.stringify(prop.default)}\`` : '-';
      const description = prop.description || '-';
      const required = prop.required ? '是' : '否';
      lines.push(`| \`${prop.name}\` | ${prop.type} | ${required} | ${defaultValue} | ${description} |`);
    });
    lines.push('');

    // 詳細說明有選項的屬性
    const propsWithOptions = properties.filter(p => p.options && p.options.length > 0);
    if (propsWithOptions.length > 0) {
      lines.push('### 屬性詳細說明');
      lines.push('');
      propsWithOptions.forEach(prop => {
        lines.push(`#### ${prop.displayName} (\`${prop.name}\`)`);
        lines.push('');
        if (prop.description) {
          lines.push(prop.description);
          lines.push('');
        }
        lines.push('可選值:');
        prop.options!.forEach(opt => {
          const desc = opt.description ? ` - ${opt.description}` : '';
          lines.push(`- \`${opt.value}\`: ${opt.name}${desc}`);
        });
        lines.push('');
      });
    }
  }

  /**
   * 附加增強的 JSON 範例（1-3 個）
   */
  private appendExamples(lines: string[], node: EnrichedNodeInfo): void {
    lines.push('## JSON 配置範例');
    lines.push('');

    const operations = node.properties?.operations || [];
    const hasOperations = operations.length > 0;

    // 總是生成基本範例
    lines.push('### 基本配置');
    lines.push('```json');
    lines.push(JSON.stringify(this.generateBasicExample(node), null, 2));
    lines.push('```');
    lines.push('');

    // 如果有操作，生成操作範例（最多 2 個）
    if (hasOperations) {
      const exampleOperations = operations.slice(0, 2);
      exampleOperations.forEach(operation => {
        lines.push(`### ${operation.name}範例`);
        lines.push('```json');
        lines.push(JSON.stringify(this.generateOperationExample(node, operation), null, 2));
        lines.push('```');
        lines.push('');
      });
    }
  }

  /**
   * 生成基本範例
   */
  private generateBasicExample(node: EnrichedNodeInfo): Record<string, any> {
    const example: Record<string, any> = {
      name: node.displayName,
      type: node.nodeType,
      typeVersion: 1,
      position: [250, 300],
      parameters: {}
    };

    // 加入必填屬性的預設值
    if (node.properties?.coreProperties) {
      node.properties.coreProperties
        .filter(prop => prop.required)
        .forEach(prop => {
          if (prop.default !== undefined) {
            example.parameters[prop.name] = prop.default;
          } else if (prop.options && prop.options.length > 0) {
            example.parameters[prop.name] = prop.options[0].value;
          } else {
            example.parameters[prop.name] = this.getDefaultValueForType(prop.type);
          }
        });
    }

    return example;
  }

  /**
   * 生成操作範例
   */
  private generateOperationExample(node: EnrichedNodeInfo, operation: Operation): Record<string, any> {
    const example = this.generateBasicExample(node);

    // 設定操作
    if (operation.resource) {
      example.parameters.resource = operation.resource;
    }
    example.parameters.operation = operation.value;

    return example;
  }

  /**
   * 根據類型取得預設值
   */
  private getDefaultValueForType(type: string): any {
    switch (type) {
      case 'string':
        return '';
      case 'number':
        return 0;
      case 'boolean':
        return false;
      case 'json':
      case 'object':
        return {};
      case 'array':
        return [];
      default:
        return '';
    }
  }

  /**
   * 確保目錄存在
   */
  private async ensureDirectory(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
        throw error;
      }
    }
  }

  /**
   * 取得已處理的檔案數量
   */
  public getProcessedCount(): number {
    return this.processedCount;
  }

  /**
   * 取得輸出目錄
   */
  public getOutputDir(): string {
    return this.config.outputDir;
  }

  /**
   * 清理所有生成的檔案
   */
  public async cleanAll(): Promise<void> {
    try {
      await fs.rm(this.config.outputDir, { recursive: true, force: true });
    } catch (error) {
      // 忽略不存在的目錄
    }
  }
}

/**
 * 建立資源生成器實例
 */
export function createResourceGenerator(config: ResourceGeneratorConfig): ResourceGenerator {
  return new ResourceGenerator(config);
}
