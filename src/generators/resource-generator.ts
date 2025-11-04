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
import { escapeMarkdown, escapeTableCell } from './template-formatter';
import type { CompatibilityMatrix, NodeConnectionInfo } from '../models/connection';
import { ConnectionRuleGenerator } from './connection-rule-generator';

/**
 * 節點位置資訊（用於合併檔案中的節點）
 */
export interface NodePositionInfo {
  nodeType: string;
  displayName: string;
  startLine: number;
  endLine: number;
  lineCount: number;
  anchor: string;
  description?: string;
  usagePercentage?: number;
}

/**
 * 合併檔案資訊
 */
export interface MergedFileInfo {
  filename: string;
  category: string;
  nodeCount: number;
  nodes: NodePositionInfo[];
}

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
  private compatibilityMatrix?: CompatibilityMatrix;
  private nodeConnectionInfoList?: NodeConnectionInfo[];

  constructor(config: ResourceGeneratorConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 批次生成所有資源檔案
   * 按分類組織節點並生成對應的文件和索引
   */
  public async generateAll(
    nodes: EnrichedNodeInfo[],
    compatibilityMatrix?: CompatibilityMatrix,
    nodeConnectionInfoList?: NodeConnectionInfo[]
  ): Promise<ResourceFile[]> {
    this.compatibilityMatrix = compatibilityMatrix;
    this.nodeConnectionInfoList = nodeConnectionInfoList;

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
   * 使用分層合併策略生成資源檔案
   * 高優先級節點生成獨立檔案，低優先級節點合併到分類檔案中
   */
  public async generateTiered(
    highPriorityNodes: EnrichedNodeInfo[],
    lowPriorityNodes: EnrichedNodeInfo[],
    compatibilityMatrix?: CompatibilityMatrix,
    nodeConnectionInfoList?: NodeConnectionInfo[]
  ): Promise<ResourceFile[]> {
    this.compatibilityMatrix = compatibilityMatrix;
    this.nodeConnectionInfoList = nodeConnectionInfoList;

    const resourceFiles: ResourceFile[] = [];
    this.processedCount = 0;

    // 清理舊的節點資源檔案（保留 templates 目錄）
    await this.cleanNodeResources();

    // 確保輸出目錄存在
    await this.ensureDirectory(this.config.outputDir);

    // 為高優先級節點生成獨立檔案
    const highPriorityCategorized = new Map<string, EnrichedNodeInfo[]>();
    for (const node of highPriorityNodes) {
      const category = node.category || 'misc';
      if (!highPriorityCategorized.has(category)) {
        highPriorityCategorized.set(category, []);
      }
      highPriorityCategorized.get(category)!.push(node);
    }

    for (const [category, categoryNodes] of highPriorityCategorized) {
      const categoryDir = path.join(this.config.outputDir, category);
      await this.ensureDirectory(categoryDir);

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
          console.warn(`生成高優先級資源檔案失敗: ${node.displayName}`, error);
        }
      }
    }

    // 為低優先級節點生成合併檔案
    const lowPriorityCategorized = new Map<string, EnrichedNodeInfo[]>();
    for (const node of lowPriorityNodes) {
      const category = node.category || 'misc';
      if (!lowPriorityCategorized.has(category)) {
        lowPriorityCategorized.set(category, []);
      }
      lowPriorityCategorized.get(category)!.push(node);
    }

    // 收集所有合併檔案資訊
    const allMergedFileInfo: MergedFileInfo[] = [];

    for (const [category, categoryNodes] of lowPriorityCategorized) {
      const { resourceFiles: mergedResources, mergedFileInfo } = await this.generateMergedCategoryFile(
        category,
        categoryNodes
      );
      resourceFiles.push(...mergedResources);
      allMergedFileInfo.push(...mergedFileInfo);
    }

    // 為每個分類生成索引檔案（包含高優先級和低優先級節點）
    const allCategorized = new Map<string, { high: EnrichedNodeInfo[]; low: EnrichedNodeInfo[] }>();

    for (const [category, nodes] of highPriorityCategorized) {
      if (!allCategorized.has(category)) {
        allCategorized.set(category, { high: [], low: [] });
      }
      allCategorized.get(category)!.high = nodes;
    }

    for (const [category, nodes] of lowPriorityCategorized) {
      if (!allCategorized.has(category)) {
        allCategorized.set(category, { high: [], low: [] });
      }
      allCategorized.get(category)!.low = nodes;
    }

    for (const [category, { high, low }] of allCategorized) {
      await this.generateCategoryIndex(category, high, low);
    }

    // 生成統一索引表
    await this.generateMasterIndex(highPriorityNodes, lowPriorityNodes, allMergedFileInfo);

    return resourceFiles;
  }

  /**
   * 生成統一索引表 (INDEX.md)
   * 提供所有節點的快速查找，包含行號定位資訊
   */
  private async generateMasterIndex(
    highPriorityNodes: EnrichedNodeInfo[],
    lowPriorityNodes: EnrichedNodeInfo[],
    mergedFileInfo: MergedFileInfo[]
  ): Promise<void> {
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

    // 標題
    lines.push('# n8n 節點資源索引');
    lines.push('');
    lines.push(`本索引提供所有 ${highPriorityNodes.length + lowPriorityNodes.length} 個 n8n 節點的快速查找。`);
    lines.push('');

    // 使用指南
    lines.push('## 使用指南');
    lines.push('');
    lines.push('本索引包含兩種查找方式：');
    lines.push('');
    lines.push('1. 按分類查找：依據節點功能分類瀏覽');
    lines.push('2. 範本索引：瀏覽熱門工作流程範本');
    lines.push('');
    lines.push('### AI 助理使用說明');
    lines.push('');
    lines.push('對於合併檔案中的節點，可以使用行號範圍精準讀取：');
    lines.push('');
    lines.push('```');
    lines.push('Read(file_path, offset=起始行號, limit=行數)');
    lines.push('```');
    lines.push('');
    lines.push('範例：讀取 Azure Cosmos DB 節點（開始行號 110，行數 64）');
    lines.push('```');
    lines.push('Read("resources/transform/transform-merged-1.md", offset=110, limit=64)');
    lines.push('```');
    lines.push('');

    // 快速導航
    lines.push('## 快速導航');
    lines.push('');
    lines.push('- [按分類查找](#按分類查找)');
    lines.push('- [範本索引](#範本索引)');
    lines.push('- [統計資訊](#統計資訊)');
    lines.push('');
    lines.push('---');
    lines.push('');

    // 按分類查找
    lines.push('## 按分類查找');
    lines.push('');

    // 整理各分類的節點
    const categorizedHigh = new Map<string, EnrichedNodeInfo[]>();
    const categorizedLow = new Map<string, EnrichedNodeInfo[]>();

    highPriorityNodes.forEach(node => {
      const category = node.category || 'misc';
      if (!categorizedHigh.has(category)) {
        categorizedHigh.set(category, []);
      }
      categorizedHigh.get(category)!.push(node);
    });

    lowPriorityNodes.forEach(node => {
      const category = node.category || 'misc';
      if (!categorizedLow.has(category)) {
        categorizedLow.set(category, []);
      }
      categorizedLow.get(category)!.push(node);
    });

    // 按分類順序輸出
    const categories = ['transform', 'input', 'output', 'trigger', 'organization', 'misc'];

    for (const category of categories) {
      const highNodes = categorizedHigh.get(category) || [];
      const lowNodes = categorizedLow.get(category) || [];
      const totalCount = highNodes.length + lowNodes.length;

      if (totalCount === 0) continue;

      const categoryName = categoryNames[category] || category;
      lines.push(`### ${categoryName} - ${totalCount} 個節點`);
      lines.push('');

      // 高優先級節點（獨立檔案）
      if (highNodes.length > 0) {
        lines.push(`#### 高優先級節點（${highNodes.length} 個獨立檔案）`);
        lines.push('');
        lines.push('| 節點名稱 | nodeType | 檔案路徑 | 描述 |');
        lines.push('|---------|---------|---------|------|');

        highNodes
          .sort((a, b) => (b.usagePercentage || 0) - (a.usagePercentage || 0))
          .forEach(node => {
            const desc = (node.description || '').substring(0, 50);
            const descEscaped = escapeTableCell(desc);
            lines.push(
              `| ${node.displayName} | \`${node.nodeType}\` | ${category}/${node.nodeType}.md | ${descEscaped} |`
            );
          });
        lines.push('');
      }

      // 低優先級節點（合併檔案）
      if (lowNodes.length > 0) {
        lines.push(`#### 其他節點（${lowNodes.length} 個，位於合併檔案）`);
        lines.push('');
        lines.push('| 節點名稱 | nodeType | 檔案路徑 | 開始行號 | 行數 | 描述 |');
        lines.push('|---------|---------|---------|---------|-----|------|');

        // 找到該分類的合併檔案資訊
        const categoryMergedFiles = mergedFileInfo.filter(f => f.category === category);

        lowNodes
          .sort((a, b) => a.displayName.localeCompare(b.displayName, 'zh-TW'))
          .forEach(node => {
            // 在合併檔案中找到該節點的位置
            let positionInfo: NodePositionInfo | undefined;
            let mergedFilename = '';

            for (const fileInfo of categoryMergedFiles) {
              positionInfo = fileInfo.nodes.find(n => n.nodeType === node.nodeType);
              if (positionInfo) {
                mergedFilename = fileInfo.filename;
                break;
              }
            }

            if (positionInfo) {
              const desc = (node.description || '').substring(0, 40);
              const descEscaped = escapeTableCell(desc);
              lines.push(
                `| ${node.displayName} | \`${node.nodeType}\` | ${category}/${mergedFilename} | ${positionInfo.startLine} | ${positionInfo.lineCount} | ${descEscaped} |`
              );
            }
          });
        lines.push('');
      }
    }

    lines.push('---');
    lines.push('');

    // 範本索引
    lines.push('## 範本索引');
    lines.push('');
    lines.push('熱門工作流程範本位於 `templates/` 目錄，依據功能分類：');
    lines.push('');
    lines.push('- [AI 與聊天機器人](templates/ai-chatbots/) - AI 代理、聊天機器人相關範本');
    lines.push('- [社群媒體](templates/social-media/) - 社群媒體自動化範本');
    lines.push('- [資料處理](templates/data-processing/) - 資料轉換與處理範本');
    lines.push('- [通訊整合](templates/communication/) - 通訊工具整合範本');
    lines.push('');
    lines.push('詳細範本列表請參考各子目錄的 README.md 檔案。');
    lines.push('');
    lines.push('---');
    lines.push('');

    // 統計資訊
    lines.push('## 統計資訊');
    lines.push('');
    lines.push(`- 總節點數：${highPriorityNodes.length + lowPriorityNodes.length}`);
    lines.push(`- 高優先級節點：${highPriorityNodes.length}（獨立檔案）`);
    lines.push(`- 低優先級節點：${lowPriorityNodes.length}（合併檔案）`);
    lines.push(`- 合併檔案數：${mergedFileInfo.length}`);
    lines.push('');

    // 各分類統計
    lines.push('### 各分類節點數');
    lines.push('');
    for (const category of categories) {
      const highNodes = categorizedHigh.get(category) || [];
      const lowNodes = categorizedLow.get(category) || [];
      const total = highNodes.length + lowNodes.length;
      if (total > 0) {
        const categoryName = categoryNames[category] || category;
        lines.push(`- ${categoryName}：${total} 個（高優先級 ${highNodes.length}，其他 ${lowNodes.length}）`);
      }
    }
    lines.push('');

    const currentDate = new Date().toISOString().split('T')[0];
    lines.push(`- 最後更新：${currentDate}`);
    lines.push('');

    // 寫入檔案
    const indexPath = path.join(this.config.outputDir, 'INDEX.md');
    await fs.writeFile(indexPath, lines.join('\n'), 'utf-8');

    console.log(`✓ 已生成統一索引表: INDEX.md`);
  }

  /**
   * 為一個分類的低優先級節點生成合併檔案
   * 如果節點數超過 100，則分割成多個檔案
   * 返回資源檔案列表和節點位置資訊
   */
  private async generateMergedCategoryFile(
    category: string,
    nodes: EnrichedNodeInfo[]
  ): Promise<{ resourceFiles: ResourceFile[]; mergedFileInfo: MergedFileInfo[] }> {
    const categoryDir = path.join(this.config.outputDir, category);
    await this.ensureDirectory(categoryDir);

    const resourceFiles: ResourceFile[] = [];
    const mergedFileInfo: MergedFileInfo[] = [];
    const NODES_PER_FILE = 100;

    if (nodes.length > NODES_PER_FILE) {
      // 分割成多個檔案
      const numParts = Math.ceil(nodes.length / NODES_PER_FILE);

      for (let i = 0; i < numParts; i++) {
        const startIdx = i * NODES_PER_FILE;
        const endIdx = Math.min(startIdx + NODES_PER_FILE, nodes.length);
        const partNodes = nodes.slice(startIdx, endIdx);
        const partNumber = i + 1;

        const filename = `${category}-merged-${partNumber}.md`;
        const filepath = path.join(categoryDir, filename);
        const { content, nodePositions } = this.buildMergedContent(category, partNodes, partNumber);

        await fs.writeFile(filepath, content, 'utf-8');

        resourceFiles.push({
          name: `${category} - 節點合集 (Part ${partNumber})`,
          path: `resources/${category}/${filename}`,
          description: `包含 ${partNodes.length} 個節點`,
          category,
        });

        mergedFileInfo.push({
          filename,
          category,
          nodeCount: partNodes.length,
          nodes: nodePositions,
        });

        this.processedCount += partNodes.length;
      }
    } else {
      // 生成單一合併檔案
      const filename = `${category}-merged.md`;
      const filepath = path.join(categoryDir, filename);
      const { content, nodePositions } = this.buildMergedContent(category, nodes);

      await fs.writeFile(filepath, content, 'utf-8');

      resourceFiles.push({
        name: `${category} - 節點合集`,
        path: `resources/${category}/${filename}`,
        description: `包含 ${nodes.length} 個節點`,
        category,
      });

      mergedFileInfo.push({
        filename,
        category,
        nodeCount: nodes.length,
        nodes: nodePositions,
      });

      this.processedCount += nodes.length;
    }

    return { resourceFiles, mergedFileInfo };
  }

  /**
   * 建立合併檔案的內容
   * 包含 TOC 和所有節點的完整內容
   * 同時計算每個節點的行號位置
   */
  private buildMergedContent(
    category: string,
    nodes: EnrichedNodeInfo[],
    partNumber?: number
  ): { content: string; nodePositions: NodePositionInfo[] } {
    const lines: string[] = [];
    const nodePositions: NodePositionInfo[] = [];

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
    const title = partNumber
      ? `${categoryName} - 節點合集 (Part ${partNumber})`
      : `${categoryName} - 節點合集`;

    // 標題
    lines.push(`# ${title}`);
    lines.push('');
    lines.push(`本文件包含 ${nodes.length} 個節點的完整資訊。`);
    lines.push('');

    // 生成 TOC
    lines.push('## 目錄');
    lines.push('');

    // 按字母順序排序節點用於 TOC
    const sortedNodes = [...nodes].sort((a, b) =>
      a.displayName.localeCompare(b.displayName, 'zh-TW')
    );

    sortedNodes.forEach(node => {
      // 生成錨點：將節點名稱轉換為小寫，空格和特殊字元轉換為連字符
      const anchor = node.displayName
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9\u4e00-\u9fa5-]/g, '');
      lines.push(`- [${node.displayName}](#${anchor})`);
    });
    lines.push('');
    lines.push('---');
    lines.push('');

    // 記錄 TOC 結束後的當前行數（用於計算節點起始行號）
    let currentLine = lines.length + 1; // +1 因為行號從 1 開始

    // 為每個節點生成完整內容並記錄行號
    sortedNodes.forEach((node, index) => {
      const nodeStartLine = currentLine;
      const nodeLinesStart = lines.length;

      if (index > 0) {
        lines.push('---');
        lines.push('');
      }

      // 使用二級標題作為節點標題
      lines.push(`## ${node.displayName}`);
      lines.push('');

      // 基本資訊
      this.appendBasicInfo(lines, node);

      // 描述
      if (node.description) {
        lines.push('### 描述');
        lines.push('');
        lines.push(escapeMarkdown(node.description));
        lines.push('');
      }

      // 操作列表
      if (node.properties?.operations && node.properties.operations.length > 0) {
        lines.push('### 可用操作');
        lines.push('');
        this.appendOperations(lines, node.properties.operations);
      }

      // 核心屬性
      if (node.properties?.coreProperties && node.properties.coreProperties.length > 0) {
        this.appendPropertiesForMerged(lines, node.properties.coreProperties);
      }

      // 連接指南
      if (this.compatibilityMatrix && this.nodeConnectionInfoList) {
        const connectionGuide = this.generateConnectionGuide(node);
        if (connectionGuide) {
          // 將連接指南的標題層級調整為三級
          const adjustedGuide = connectionGuide.replace(/^## /gm, '### ');
          lines.push(adjustedGuide);
        }
      }

      // JSON 配置範例
      this.appendExamplesForMerged(lines, node);

      // 計算節點內容的行數
      const nodeLineCount = lines.length - nodeLinesStart;
      const nodeEndLine = nodeStartLine + nodeLineCount - 1;

      // 生成錨點
      const anchor = node.displayName
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9\u4e00-\u9fa5-]/g, '');

      // 記錄節點位置
      nodePositions.push({
        nodeType: node.nodeType,
        displayName: node.displayName,
        startLine: nodeStartLine,
        endLine: nodeEndLine,
        lineCount: nodeLineCount,
        anchor,
        description: node.description,
        usagePercentage: node.usagePercentage,
      });

      // 更新當前行號
      currentLine = nodeEndLine + 1;
    });

    return {
      content: lines.join('\n'),
      nodePositions,
    };
  }

  /**
   * 為合併檔案附加屬性列表（調整標題層級）
   */
  private appendPropertiesForMerged(lines: string[], properties: CoreProperty[]): void {
    lines.push('### 核心屬性');
    lines.push('');
    lines.push('| 屬性名稱 | 類型 | 必填 | 預設值 | 描述 |');
    lines.push('|---------|------|------|--------|------|');

    properties.forEach(prop => {
      const defaultValue = prop.default !== undefined ? `\`${JSON.stringify(prop.default)}\`` : '-';
      const description = escapeTableCell(prop.description || '-');
      const required = prop.required ? '是' : '否';
      lines.push(`| \`${prop.name}\` | ${prop.type} | ${required} | ${defaultValue} | ${description} |`);
    });
    lines.push('');

    // 詳細說明有選項的屬性
    const propsWithOptions = properties.filter(p => p.options && p.options.length > 0);
    if (propsWithOptions.length > 0) {
      lines.push('#### 屬性詳細說明');
      lines.push('');
      propsWithOptions.forEach(prop => {
        lines.push(`##### ${prop.displayName} (\`${prop.name}\`)`);
        lines.push('');
        if (prop.description) {
          lines.push(escapeMarkdown(prop.description));
          lines.push('');
        }
        lines.push('可選值:');
        prop.options!.forEach(opt => {
          const desc = opt.description ? ` - ${escapeMarkdown(opt.description)}` : '';
          lines.push(`- \`${opt.value}\`: ${opt.name}${desc}`);
        });
        lines.push('');
      });
    }
  }

  /**
   * 為合併檔案附加 JSON 範例（調整標題層級）
   */
  private appendExamplesForMerged(lines: string[], node: EnrichedNodeInfo): void {
    lines.push('### JSON 配置範例');
    lines.push('');

    const operations = node.properties?.operations || [];
    const hasOperations = operations.length > 0;

    // 總是生成基本範例
    lines.push('#### 基本配置');
    lines.push('```json');
    lines.push(JSON.stringify(this.generateBasicExample(node), null, 2));
    lines.push('```');
    lines.push('');

    // 如果有操作，生成操作範例（最多 2 個）
    if (hasOperations) {
      const exampleOperations = operations.slice(0, 2);
      exampleOperations.forEach(operation => {
        lines.push(`#### ${operation.name}範例`);
        lines.push('```json');
        lines.push(JSON.stringify(this.generateOperationExample(node, operation), null, 2));
        lines.push('```');
        lines.push('');
      });
    }
  }

  /**
   * 生成分類索引檔案
   * 支援區分高優先級獨立檔案和低優先級合併檔案
   */
  private async generateCategoryIndex(
    category: string,
    highPriorityNodes?: EnrichedNodeInfo[],
    lowPriorityNodes?: EnrichedNodeInfo[]
  ): Promise<void> {
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

    // 兼容舊的單一參數用法（generateAll 方法）
    if (highPriorityNodes === undefined && lowPriorityNodes === undefined) {
      // 這種情況不應該發生，但為了向後兼容，返回
      return;
    }

    // 如果只傳入 highPriorityNodes（當作所有節點），則是舊的 generateAll 用法
    if (lowPriorityNodes === undefined && highPriorityNodes !== undefined) {
      const allNodes = highPriorityNodes;
      lines.push(`# ${categoryName}`);
      lines.push('');
      lines.push(`共 ${allNodes.length} 個節點`);
      lines.push('');

      // 按字母順序排序
      const sortedNodes = [...allNodes].sort((a, b) =>
        a.displayName.localeCompare(b.displayName, 'zh-TW')
      );

      // 生成節點列表
      lines.push('## 節點列表');
      lines.push('');
      sortedNodes.forEach(node => {
        const filename = `${node.nodeType}.md`;
        const description = escapeMarkdown(node.description || '');
        lines.push(`- [${node.displayName}](./${filename}) - ${description}`);
      });
      lines.push('');
    } else {
      // 新的分層用法（generateTiered 方法）
      const high = highPriorityNodes || [];
      const low = lowPriorityNodes || [];
      const totalCount = high.length + low.length;

      lines.push(`# ${categoryName}`);
      lines.push('');
      lines.push(`共 ${totalCount} 個節點（高優先級: ${high.length}，其他: ${low.length}）`);
      lines.push('');

      // 高優先級節點（獨立檔案）
      if (high.length > 0) {
        lines.push('## 高優先級節點');
        lines.push('');
        lines.push('以下節點具有獨立的詳細文件：');
        lines.push('');

        const sortedHigh = [...high].sort((a, b) =>
          a.displayName.localeCompare(b.displayName, 'zh-TW')
        );

        sortedHigh.forEach(node => {
          const filename = `${node.nodeType}.md`;
          const description = escapeMarkdown(node.description || '');
          lines.push(`- [${node.displayName}](./${filename}) - ${description}`);
        });
        lines.push('');
      }

      // 低優先級節點（合併檔案）
      if (low.length > 0) {
        lines.push('## 其他節點');
        lines.push('');

        const NODES_PER_FILE = 100;
        if (low.length > NODES_PER_FILE) {
          // 多個合併檔案
          const numParts = Math.ceil(low.length / NODES_PER_FILE);
          lines.push(`以下 ${low.length} 個節點已合併到 ${numParts} 個文件中：`);
          lines.push('');

          for (let i = 0; i < numParts; i++) {
            const startIdx = i * NODES_PER_FILE;
            const endIdx = Math.min(startIdx + NODES_PER_FILE, low.length);
            const partNodes = low.slice(startIdx, endIdx);
            const partNumber = i + 1;

            lines.push(`- [Part ${partNumber}](./${category}-merged-${partNumber}.md) - 包含 ${partNodes.length} 個節點`);
          }
          lines.push('');

          // 列出所有節點名稱
          lines.push('### 完整節點列表');
          lines.push('');
          const sortedLow = [...low].sort((a, b) =>
            a.displayName.localeCompare(b.displayName, 'zh-TW')
          );
          sortedLow.forEach(node => {
            lines.push(`- ${node.displayName}`);
          });
          lines.push('');
        } else {
          // 單一合併檔案
          lines.push('以下節點已合併到單一文件中：');
          lines.push('');
          lines.push(`- [查看完整列表](./${category}-merged.md) - 包含 ${low.length} 個節點`);
          lines.push('');

          // 列出所有節點名稱
          lines.push('### 完整節點列表');
          lines.push('');
          const sortedLow = [...low].sort((a, b) =>
            a.displayName.localeCompare(b.displayName, 'zh-TW')
          );
          sortedLow.forEach(node => {
            lines.push(`- ${node.displayName}`);
          });
          lines.push('');
        }
      }
    }

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
      lines.push(escapeMarkdown(node.description));
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

    // 連接指南（如果有相容性資料）
    if (this.compatibilityMatrix && this.nodeConnectionInfoList) {
      const connectionGuide = this.generateConnectionGuide(node);
      if (connectionGuide) {
        lines.push(connectionGuide);
      }
    }

    // JSON 配置範例（增強版：1-3 個範例）
    this.appendExamples(lines, node);

    return lines.join('\n');
  }

  /**
   * 生成連接指南
   */
  private generateConnectionGuide(node: EnrichedNodeInfo): string | null {
    if (!this.compatibilityMatrix || !this.nodeConnectionInfoList) {
      return null;
    }

    const nodeInfo = this.nodeConnectionInfoList.find(n => n.nodeType === node.nodeType);
    if (!nodeInfo) {
      return null;
    }

    const ruleGenerator = new ConnectionRuleGenerator();
    return ruleGenerator.generateNodeConnectionGuide(
      nodeInfo,
      this.compatibilityMatrix,
      this.nodeConnectionInfoList,
      10
    );
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
        lines.push(`${escapeMarkdown(op.description)}`);
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
      const description = escapeTableCell(prop.description || '-');
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
          lines.push(escapeMarkdown(prop.description));
          lines.push('');
        }
        lines.push('可選值:');
        prop.options!.forEach(opt => {
          const desc = opt.description ? ` - ${escapeMarkdown(opt.description)}` : '';
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
   * 清理節點資源目錄（保留 templates 目錄）
   */
  private async cleanNodeResources(): Promise<void> {
    const categories = ['transform', 'input', 'output', 'trigger', 'organization', 'misc'];
    for (const category of categories) {
      const categoryDir = path.join(this.config.outputDir, category);
      try {
        await fs.rm(categoryDir, { recursive: true, force: true });
      } catch (error) {
        // 忽略不存在的目錄
      }
    }
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
