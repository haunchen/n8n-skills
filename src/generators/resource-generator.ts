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
 * Node position information (for nodes in merged files)
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
 * Merged file information
 */
export interface MergedFileInfo {
  filename: string;
  category: string;
  nodeCount: number;
  nodes: NodePositionInfo[];
}

/**
 * Resource generator configuration
 */
export interface ResourceGeneratorConfig {
  outputDir: string;
  overwrite?: boolean;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Required<ResourceGeneratorConfig> = {
  outputDir: path.join(process.cwd(), 'output/resources'),
  overwrite: true,
};

/**
 * Resource generator
 * Generate detailed Markdown files for each node, organized by category
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
   * Batch generate all resource files
   * Organize nodes by category and generate corresponding files and indexes
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

    // Ensure output directory exists
    await this.ensureDirectory(this.config.outputDir);

    // Group nodes by category
    for (const node of nodes) {
      const category = node.category || 'misc';
      if (!categorizedNodes.has(category)) {
        categorizedNodes.set(category, []);
      }
      categorizedNodes.get(category)!.push(node);
    }

    // Generate files for each category
    for (const [category, categoryNodes] of categorizedNodes) {
      const categoryDir = path.join(this.config.outputDir, category);
      await this.ensureDirectory(categoryDir);

      // Generate node files for this category
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
          // Ignore individual file generation errors, continue processing other files
          console.warn(`Failed to generate resource file: ${node.displayName}`, error);
        }
      }

      // Generate index file for this category
      await this.generateCategoryIndex(category, categoryNodes);
    }

    return resourceFiles;
  }

  /**
   * Generate resource files using tiered merge strategy
   * High-priority nodes generate individual files, low-priority nodes are merged into category files
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

    // Clean old node resource files (preserve templates directory)
    await this.cleanNodeResources();

    // Ensure output directory exists
    await this.ensureDirectory(this.config.outputDir);

    // Generate individual files for high-priority nodes
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
          console.warn(`Failed to generate high-priority resource file: ${node.displayName}`, error);
        }
      }
    }

    // Generate merged files for low-priority nodes
    const lowPriorityCategorized = new Map<string, EnrichedNodeInfo[]>();
    for (const node of lowPriorityNodes) {
      const category = node.category || 'misc';
      if (!lowPriorityCategorized.has(category)) {
        lowPriorityCategorized.set(category, []);
      }
      lowPriorityCategorized.get(category)!.push(node);
    }

    // Collect all merged file information
    const allMergedFileInfo: MergedFileInfo[] = [];

    for (const [category, categoryNodes] of lowPriorityCategorized) {
      const { resourceFiles: mergedResources, mergedFileInfo } = await this.generateMergedCategoryFile(
        category,
        categoryNodes
      );
      resourceFiles.push(...mergedResources);
      allMergedFileInfo.push(...mergedFileInfo);
    }

    // Generate index files for each category（including high-priority and low-priority nodes）
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

    // Generate unified index
    await this.generateMasterIndex(highPriorityNodes, lowPriorityNodes, allMergedFileInfo);

    return resourceFiles;
  }

  /**
   * Generate unified index (INDEX.md)
   * Provides quick access to all nodes, including line number location information
   */
  private async generateMasterIndex(
    highPriorityNodes: EnrichedNodeInfo[],
    lowPriorityNodes: EnrichedNodeInfo[],
    mergedFileInfo: MergedFileInfo[]
  ): Promise<void> {
    const lines: string[] = [];

    // Category name mapping
    const categoryNames: Record<string, string> = {
      transform: 'Data Transformation Nodes',
      input: 'Input Nodes',
      output: 'Output Nodes',
      trigger: 'Trigger Nodes',
      organization: 'Organization Nodes',
      misc: 'Miscellaneous Nodes',
      community: 'Community Packages',
    };

    // Load community packages config
    let communityPackages: Array<{
      name: string;
      description: string;
      category: string;
      npmUrl?: string;
      version?: string;
      maintainer?: string;
    }> = [];
    try {
      const communityConfigPath = path.resolve(process.cwd(), 'config/community-packages.json');
      const communityConfigContent = await fs.readFile(communityConfigPath, 'utf-8');
      const communityConfig = JSON.parse(communityConfigContent);
      communityPackages = communityConfig.packages || [];
    } catch {
      // Community packages config not found, skip
    }

    // Title
    lines.push('# n8n Node Resource Index');
    lines.push('');
    const builtInNodeCount = highPriorityNodes.length + lowPriorityNodes.length;
    const communityPackageCount = communityPackages.length;
    if (communityPackageCount > 0) {
      lines.push(`This index provides quick access to all ${builtInNodeCount} built-in n8n nodes and ${communityPackageCount} community packages.`);
    } else {
      lines.push(`This index provides quick access to all ${builtInNodeCount} n8n nodes.`);
    }
    lines.push('');

    // Usage guide
    lines.push('## Usage Guide');
    lines.push('');
    lines.push('This index contains two ways to search:');
    lines.push('');
    lines.push('1. Find by Category: Browse nodes by functional category');
    lines.push('2. Template Index: Browse popular workflow templates');
    lines.push('');
    lines.push('### Instructions for AI Assistants');
    lines.push('');
    lines.push('For nodes in merged files, use line number ranges for precise reading:');
    lines.push('');
    lines.push('```');
    lines.push('Read(file_path, offset=starting_line, limit=line_count)');
    lines.push('```');
    lines.push('');
    lines.push('Example: Read Azure Cosmos DB node (starting line 110, line count 64)');
    lines.push('```');
    lines.push('Read("resources/transform/transform-merged-1.md", offset=110, limit=64)');
    lines.push('```');
    lines.push('');

    // Quick navigation
    lines.push('## Quick Navigation');
    lines.push('');
    lines.push('- [Find by Category](#find-by-category)');
    if (communityPackageCount > 0) {
      lines.push('- [Community Packages](#community-packages)');
    }
    lines.push('- [Template Index](#template-index)');
    lines.push('- [Statistics](#statistics)');
    lines.push('');
    lines.push('---');
    lines.push('');

    // Find by category
    lines.push('## Find by Category');
    lines.push('');

    // Organize nodes by category
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

    // Output by category order
    const categories = ['transform', 'input', 'output', 'trigger', 'organization', 'misc'];

    for (const category of categories) {
      const highNodes = categorizedHigh.get(category) || [];
      const lowNodes = categorizedLow.get(category) || [];
      const totalCount = highNodes.length + lowNodes.length;

      if (totalCount === 0) continue;

      const categoryName = categoryNames[category] || category;
      lines.push(`### ${categoryName} - ${totalCount} nodes`);
      lines.push('');

      // High-priority nodes (individual files)
      if (highNodes.length > 0) {
        lines.push(`#### High-Priority Nodes (${highNodes.length} individual files)`);
        lines.push('');
        lines.push('| Node Name | nodeType | File Path | Description |');
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

      // Low-priority nodes (merged files)
      if (lowNodes.length > 0) {
        lines.push(`#### Other Nodes (${lowNodes.length} nodes in merged files)`);
        lines.push('');
        lines.push('| Node Name | nodeType | File Path | Start Line | Line Count | Description |');
        lines.push('|---------|---------|---------|---------|-----|------|');

        // Find merged file information for this category
        const categoryMergedFiles = mergedFileInfo.filter(f => f.category === category);

        lowNodes
          .sort((a, b) => a.displayName.localeCompare(b.displayName, 'en'))
          .forEach(node => {
            // Find the position of this node in merged files
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

    // Community packages section
    if (communityPackageCount > 0) {
      lines.push('## Community Packages');
      lines.push('');
      lines.push(`Popular community-developed node packages (${communityPackageCount} packages).`);
      lines.push('');
      lines.push('| Package Name | Category | File Path | Description |');
      lines.push('|--------------|----------|-----------|-------------|');

      // Community package category mapping
      const communityCategoryNames: Record<string, string> = {
        'communication': 'Communication',
        'ai-tools': 'AI Tools',
        'utilities': 'Utilities',
        'document': 'Document',
        'data-processing': 'Data Processing',
        'web-scraping': 'Web Scraping',
      };

      communityPackages.forEach(pkg => {
        const categoryDisplay = communityCategoryNames[pkg.category] || pkg.category;
        const desc = (pkg.description || '').substring(0, 50);
        const descEscaped = escapeTableCell(desc);
        // Generate filename from package name (remove @ and / characters)
        const filename = pkg.name.replace(/^@/, '').replace(/\//g, '-') + '.md';
        lines.push(
          `| ${pkg.name} | ${categoryDisplay} | community/${filename} | ${descEscaped} |`
        );
      });
      lines.push('');
      lines.push('For detailed information, see [community/README.md](community/README.md).');
      lines.push('');
      lines.push('---');
      lines.push('');
    }

    // Template index
    lines.push('## Template Index');
    lines.push('');
    lines.push('Popular workflow templates are located in the `templates/` directory, categorized by functionality:');
    lines.push('');
    lines.push('- [AI & Chatbots](templates/ai-chatbots/) - AI agents, chatbot-related templates');
    lines.push('- [Social Media](templates/social-media/) - Social media automation templates');
    lines.push('- [Data Processing](templates/data-processing/) - Data transformation and processing templates');
    lines.push('- [Communication](templates/communication/) - Communication tool integration templates');
    lines.push('');
    lines.push('For detailed template lists, please refer to the README.md file in each subdirectory.');
    lines.push('');
    lines.push('---');
    lines.push('');

    // Statistics
    lines.push('## Statistics');
    lines.push('');
    lines.push(`- Total built-in nodes: ${builtInNodeCount}`);
    lines.push(`- High-priority nodes: ${highPriorityNodes.length} (individual files)`);
    lines.push(`- Low-priority nodes: ${lowPriorityNodes.length} (merged files)`);
    lines.push(`- Merged file count: ${mergedFileInfo.length}`);
    if (communityPackageCount > 0) {
      lines.push(`- Community packages: ${communityPackageCount}`);
    }
    lines.push('');

    // Statistics by category
    lines.push('### Nodes by Category');
    lines.push('');
    for (const category of categories) {
      const highNodes = categorizedHigh.get(category) || [];
      const lowNodes = categorizedLow.get(category) || [];
      const total = highNodes.length + lowNodes.length;
      if (total > 0) {
        const categoryName = categoryNames[category] || category;
        lines.push(`- ${categoryName}: ${total} nodes (high-priority: ${highNodes.length}, other: ${lowNodes.length})`);
      }
    }
    lines.push('');

    const currentDate = new Date().toISOString().split('T')[0];
    lines.push(`- Last updated: ${currentDate}`);
    lines.push('');

    // Write file
    const indexPath = path.join(this.config.outputDir, 'INDEX.md');
    await fs.writeFile(indexPath, lines.join('\n'), 'utf-8');

    console.log(`✓ Generated unified index: INDEX.md`);
  }

  /**
   * Generate merged files for low-priority nodes in a category
   * If node count exceeds 100, split into multiple files
   * Return resource file list and node position information
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
      // Split into multiple files
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
          name: `${category} - Node Collection (Part ${partNumber})`,
          path: `resources/${category}/${filename}`,
          description: `Contains ${partNodes.length} nodes`,
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
      // Generate single merged file
      const filename = `${category}-merged.md`;
      const filepath = path.join(categoryDir, filename);
      const { content, nodePositions } = this.buildMergedContent(category, nodes);

      await fs.writeFile(filepath, content, 'utf-8');

      resourceFiles.push({
        name: `${category} - Node Collection`,
        path: `resources/${category}/${filename}`,
        description: `Contains ${nodes.length} nodes`,
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
   * Build content for merged file
   * Includes TOC and complete content for all nodes
   * Also calculates line number positions for each node
   */
  private buildMergedContent(
    category: string,
    nodes: EnrichedNodeInfo[],
    partNumber?: number
  ): { content: string; nodePositions: NodePositionInfo[] } {
    const lines: string[] = [];
    const nodePositions: NodePositionInfo[] = [];

    // Category name mapping
    const categoryNames: Record<string, string> = {
      transform: 'Data Transformation Nodes',
      input: 'Input Nodes',
      output: 'Output Nodes',
      trigger: 'Trigger Nodes',
      organization: 'Organization Nodes',
      misc: 'Miscellaneous Nodes',
    };

    const categoryName = categoryNames[category] || category;
    const title = partNumber
      ? `${categoryName} - Node Collection (Part ${partNumber})`
      : `${categoryName} - Node Collection`;

    // Title
    lines.push(`# ${title}`);
    lines.push('');
    lines.push(`This file contains complete information for ${nodes.length} nodes.`);
    lines.push('');

    // Generate TOC
    lines.push('## Table of Contents');
    lines.push('');

    // Sort nodes alphabetically for TOC
    const sortedNodes = [...nodes].sort((a, b) =>
      a.displayName.localeCompare(b.displayName, 'en')
    );

    sortedNodes.forEach(node => {
      // Generate anchor: Convert node name to lowercase, spaces and special characters to hyphens
      const anchor = node.displayName
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9\u4e00-\u9fa5-]/g, '');
      lines.push(`- [${node.displayName}](#${anchor})`);
    });
    lines.push('');
    lines.push('---');
    lines.push('');

    // Record current line number after TOC ends (for calculating node starting line numbers)
    let currentLine = lines.length + 1; // +1 because line numbers start from 1

    // Generate complete content for each node and record line numbers
    sortedNodes.forEach((node, index) => {
      const nodeStartLine = currentLine;
      const nodeLinesStart = lines.length;

      if (index > 0) {
        lines.push('---');
        lines.push('');
      }

      // Use secondary headings for node titles
      lines.push(`## ${node.displayName}`);
      lines.push('');

      // Basic information
      this.appendBasicInfo(lines, node);

      // Description
      if (node.description) {
        lines.push('### Description');
        lines.push('');
        lines.push(escapeMarkdown(node.description));
        lines.push('');
      }

      // Operations list
      if (node.properties?.operations && node.properties.operations.length > 0) {
        lines.push('### Available Operations');
        lines.push('');
        this.appendOperations(lines, node.properties.operations);
      }

      // Core properties
      if (node.properties?.coreProperties && node.properties.coreProperties.length > 0) {
        this.appendPropertiesForMerged(lines, node.properties.coreProperties);
      }

      // Connection guide
      if (this.compatibilityMatrix && this.nodeConnectionInfoList) {
        const connectionGuide = this.generateConnectionGuide(node);
        if (connectionGuide) {
          // Adjust Connection guide heading level to three levels
          const adjustedGuide = connectionGuide.replace(/^## /gm, '### ');
          lines.push(adjustedGuide);
        }
      }

      // JSON configuration examples
      this.appendExamplesForMerged(lines, node);

      // Calculate line count for node content
      const nodeLineCount = lines.length - nodeLinesStart;
      const nodeEndLine = nodeStartLine + nodeLineCount - 1;

      // Generate anchor
      const anchor = node.displayName
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9\u4e00-\u9fa5-]/g, '');

      // Record node position
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

      // Update current line number
      currentLine = nodeEndLine + 1;
    });

    return {
      content: lines.join('\n'),
      nodePositions,
    };
  }

  /**
   * Append properties list for merged files (adjust heading levels)
   */
  private appendPropertiesForMerged(lines: string[], properties: CoreProperty[]): void {
    lines.push('### Core Properties');
    lines.push('');
    lines.push('| Property Name | Type | Required | Default | Description |');
    lines.push('|---------|------|------|--------|------|');

    properties.forEach(prop => {
      const defaultValue = prop.default !== undefined ? `\`${JSON.stringify(prop.default)}\`` : '-';
      const description = escapeTableCell(prop.description || '-');
      const required = prop.required ? 'Yes' : 'No';
      lines.push(`| \`${prop.name}\` | ${prop.type} | ${required} | ${defaultValue} | ${description} |`);
    });
    lines.push('');

    // Detail properties with options
    const propsWithOptions = properties.filter(p => p.options && p.options.length > 0);
    if (propsWithOptions.length > 0) {
      lines.push('#### Property Details');
      lines.push('');
      propsWithOptions.forEach(prop => {
        lines.push(`##### ${prop.displayName} (\`${prop.name}\`)`);
        lines.push('');
        if (prop.description) {
          lines.push(escapeMarkdown(prop.description));
          lines.push('');
        }
        lines.push('Optional values:');
        prop.options!.forEach(opt => {
          const desc = opt.description ? ` - ${escapeMarkdown(opt.description)}` : '';
          lines.push(`- \`${opt.value}\`: ${opt.name}${desc}`);
        });
        lines.push('');
      });
    }
  }

  /**
   * Append JSON examples for merged files (adjust heading levels)
   */
  private appendExamplesForMerged(lines: string[], node: EnrichedNodeInfo): void {
    lines.push('### JSON Configuration Examples');
    lines.push('');

    const operations = node.properties?.operations || [];
    const hasOperations = operations.length > 0;

    // Always generate basic example
    lines.push('#### Basic Configuration');
    lines.push('```json');
    lines.push(JSON.stringify(this.generateBasicExample(node), null, 2));
    lines.push('```');
    lines.push('');

    // If operations exist, generate operation examples (up to 2)
    if (hasOperations) {
      const exampleOperations = operations.slice(0, 2);
      exampleOperations.forEach(operation => {
        lines.push(`#### ${operation.name} Example`);
        lines.push('```json');
        lines.push(JSON.stringify(this.generateOperationExample(node, operation), null, 2));
        lines.push('```');
        lines.push('');
      });
    }
  }

  /**
   * Generate category index file
   * Supports distinguishing high-priority individual files and low-priority merged files
   */
  private async generateCategoryIndex(
    category: string,
    highPriorityNodes?: EnrichedNodeInfo[],
    lowPriorityNodes?: EnrichedNodeInfo[]
  ): Promise<void> {
    const lines: string[] = [];

    // Category name mapping
    const categoryNames: Record<string, string> = {
      transform: 'Data Transformation Nodes',
      input: 'Input Nodes',
      output: 'Output Nodes',
      trigger: 'Trigger Nodes',
      organization: 'Organization Nodes',
      misc: 'Miscellaneous Nodes',
    };

    const categoryName = categoryNames[category] || category;

    // Compatibility with old single-parameter usage (generateAll method)
    if (highPriorityNodes === undefined && lowPriorityNodes === undefined) {
      // This should not happen, but return for backward compatibility
      return;
    }

    // If only highPriorityNodes passed (treated as all nodes), use old generateAll usage
    if (lowPriorityNodes === undefined && highPriorityNodes !== undefined) {
      const allNodes = highPriorityNodes;
      lines.push(`# ${categoryName}`);
      lines.push('');
      lines.push(`Total: ${allNodes.length} nodes`);
      lines.push('');

      // Sort alphabetically
      const sortedNodes = [...allNodes].sort((a, b) =>
        a.displayName.localeCompare(b.displayName, 'en')
      );

      // Generate node list
      lines.push('## Node List');
      lines.push('');
      sortedNodes.forEach(node => {
        const filename = `${node.nodeType}.md`;
        const description = escapeMarkdown(node.description || '');
        lines.push(`- [${node.displayName}](./${filename}) - ${description}`);
      });
      lines.push('');
    } else {
      // New tiered usage (generateTiered method)
      const high = highPriorityNodes || [];
      const low = lowPriorityNodes || [];
      const totalCount = high.length + low.length;

      lines.push(`# ${categoryName}`);
      lines.push('');
      lines.push(`Total: ${totalCount} nodes (high-priority: ${high.length}, other: ${low.length})`);
      lines.push('');

      // High-priority nodes (individual files)
      if (high.length > 0) {
        lines.push('## High-Priority Nodes');
        lines.push('');
        lines.push('The following nodes have individual detailed documentation:');
        lines.push('');

        const sortedHigh = [...high].sort((a, b) =>
          a.displayName.localeCompare(b.displayName, 'en')
        );

        sortedHigh.forEach(node => {
          const filename = `${node.nodeType}.md`;
          const description = escapeMarkdown(node.description || '');
          lines.push(`- [${node.displayName}](./${filename}) - ${description}`);
        });
        lines.push('');
      }

      // Low-priority nodes (merged files)
      if (low.length > 0) {
        lines.push('## Other Nodes');
        lines.push('');

        const NODES_PER_FILE = 100;
        if (low.length > NODES_PER_FILE) {
          // Multiple merged files
          const numParts = Math.ceil(low.length / NODES_PER_FILE);
          lines.push(`The following ${low.length} nodes are merged into ${numParts} files:`);
          lines.push('');

          for (let i = 0; i < numParts; i++) {
            const startIdx = i * NODES_PER_FILE;
            const endIdx = Math.min(startIdx + NODES_PER_FILE, low.length);
            const partNodes = low.slice(startIdx, endIdx);
            const partNumber = i + 1;

            lines.push(`- [Part ${partNumber}](./${category}-merged-${partNumber}.md) - Contains ${partNodes.length} nodes`);
          }
          lines.push('');

          // List all node names
          lines.push('### Complete Node List');
          lines.push('');
          const sortedLow = [...low].sort((a, b) =>
            a.displayName.localeCompare(b.displayName, 'en')
          );
          sortedLow.forEach(node => {
            lines.push(`- ${node.displayName}`);
          });
          lines.push('');
        } else {
          // Single merged file
          lines.push('The following nodes are merged into a single file:');
          lines.push('');
          lines.push(`- [View Complete List](./${category}-merged.md) - Contains ${low.length} nodes`);
          lines.push('');

          // List all node names
          lines.push('### Complete Node List');
          lines.push('');
          const sortedLow = [...low].sort((a, b) =>
            a.displayName.localeCompare(b.displayName, 'en')
          );
          sortedLow.forEach(node => {
            lines.push(`- ${node.displayName}`);
          });
          lines.push('');
        }
      }
    }

    // Write index file
    const indexPath = path.join(this.config.outputDir, category, 'README.md');
    await fs.writeFile(indexPath, lines.join('\n'), 'utf-8');
  }

  /**
   * Build complete resource file content
   */
  private buildContent(node: EnrichedNodeInfo): string {
    const lines: string[] = [];

    // Title
    lines.push(`# ${node.displayName}`);
    lines.push('');

    // Basic information
    this.appendBasicInfo(lines, node);

    // Description
    if (node.description) {
      lines.push('## Description');
      lines.push('');
      lines.push(escapeMarkdown(node.description));
      lines.push('');
    }

    // Operations list
    if (node.properties?.operations && node.properties.operations.length > 0) {
      lines.push('## Available Operations');
      lines.push('');
      this.appendOperations(lines, node.properties.operations);
    }

    // Core properties
    if (node.properties?.coreProperties && node.properties.coreProperties.length > 0) {
      this.appendProperties(lines, node.properties.coreProperties);
    }

    // Connection guide (if compatibility data available)
    if (this.compatibilityMatrix && this.nodeConnectionInfoList) {
      const connectionGuide = this.generateConnectionGuide(node);
      if (connectionGuide) {
        lines.push(connectionGuide);
      }
    }

    // JSON configuration examples (enhanced: 1-3 examples)
    this.appendExamples(lines, node);

    return lines.join('\n');
  }

  /**
   * Generate connection guide
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
   * Append basic information
   */
  private appendBasicInfo(lines: string[], node: EnrichedNodeInfo): void {
    lines.push('## Basic Information');
    lines.push('');
    lines.push(`- Node Type: \`${node.nodeType}\``);
    lines.push(`- Category: ${node.category}`);
    lines.push(`- Package: ${node.packageName}`);

    if (node.usageCount !== undefined && node.usageCount > 0) {
      lines.push(`- Usage Count: ${node.usageCount}`);
    }
    if (node.usagePercentage !== undefined && node.usagePercentage > 0) {
      lines.push(`- Usage Rate: ${node.usagePercentage.toFixed(2)}%`);
    }
    if (node.properties?.hasCredentials) {
      lines.push(`- Requires Credentials: Yes`);
    }

    lines.push('');
  }

  /**
   * Append operations list
   */
  private appendOperations(lines: string[], operations: Operation[]): void {
    operations.forEach(op => {
      lines.push(`### ${op.name}`);
      if (op.description) {
        lines.push(`${escapeMarkdown(op.description)}`);
      }
      lines.push(`- Value: \`${op.value}\``);
      if (op.resource) {
        lines.push(`- Resource: \`${op.resource}\``);
      }
      lines.push('');
    });
  }

  /**
   * Append properties list
   */
  private appendProperties(lines: string[], properties: CoreProperty[]): void {
    lines.push('## Core Properties');
    lines.push('');
    lines.push('| Property Name | Type | Required | Default | Description |');
    lines.push('|---------|------|------|--------|------|');

    properties.forEach(prop => {
      const defaultValue = prop.default !== undefined ? `\`${JSON.stringify(prop.default)}\`` : '-';
      const description = escapeTableCell(prop.description || '-');
      const required = prop.required ? 'Yes' : 'No';
      lines.push(`| \`${prop.name}\` | ${prop.type} | ${required} | ${defaultValue} | ${description} |`);
    });
    lines.push('');

    // Detail properties with options
    const propsWithOptions = properties.filter(p => p.options && p.options.length > 0);
    if (propsWithOptions.length > 0) {
      lines.push('### Property Details');
      lines.push('');
      propsWithOptions.forEach(prop => {
        lines.push(`#### ${prop.displayName} (\`${prop.name}\`)`);
        lines.push('');
        if (prop.description) {
          lines.push(escapeMarkdown(prop.description));
          lines.push('');
        }
        lines.push('Optional values:');
        prop.options!.forEach(opt => {
          const desc = opt.description ? ` - ${escapeMarkdown(opt.description)}` : '';
          lines.push(`- \`${opt.value}\`: ${opt.name}${desc}`);
        });
        lines.push('');
      });
    }
  }

  /**
   * Append enhanced JSON examples (1-3 examples)
   */
  private appendExamples(lines: string[], node: EnrichedNodeInfo): void {
    lines.push('## JSON Configuration Examples');
    lines.push('');

    const operations = node.properties?.operations || [];
    const hasOperations = operations.length > 0;

    // Always generate basic example
    lines.push('### Basic Configuration');
    lines.push('```json');
    lines.push(JSON.stringify(this.generateBasicExample(node), null, 2));
    lines.push('```');
    lines.push('');

    // If operations exist, generate operation examples (up to 2)
    if (hasOperations) {
      const exampleOperations = operations.slice(0, 2);
      exampleOperations.forEach(operation => {
        lines.push(`### ${operation.name} Example`);
        lines.push('```json');
        lines.push(JSON.stringify(this.generateOperationExample(node, operation), null, 2));
        lines.push('```');
        lines.push('');
      });
    }
  }

  /**
   * Generate basic example
   */
  private generateBasicExample(node: EnrichedNodeInfo): Record<string, any> {
    const example: Record<string, any> = {
      name: node.displayName,
      type: node.nodeType,
      typeVersion: 1,
      position: [250, 300],
      parameters: {}
    };

    // Add default values for required properties
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
   * Generate operation example
   */
  private generateOperationExample(node: EnrichedNodeInfo, operation: Operation): Record<string, any> {
    const example = this.generateBasicExample(node);

    // Set operation
    if (operation.resource) {
      example.parameters.resource = operation.resource;
    }
    example.parameters.operation = operation.value;

    return example;
  }

  /**
   * Get default value by type
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
   * Ensure directory exists
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
   * Get processed file count
   */
  public getProcessedCount(): number {
    return this.processedCount;
  }

  /**
   * Get output directory
   */
  public getOutputDir(): string {
    return this.config.outputDir;
  }

  /**
   * Clean node resource directory (preserve templates directory)
   */
  private async cleanNodeResources(): Promise<void> {
    const categories = ['transform', 'input', 'output', 'trigger', 'organization', 'misc'];
    for (const category of categories) {
      const categoryDir = path.join(this.config.outputDir, category);
      try {
        await fs.rm(categoryDir, { recursive: true, force: true });
      } catch (error) {
        // Ignore non-existent directory
      }
    }
  }

  /**
   * Clean all generated files
   */
  public async cleanAll(): Promise<void> {
    try {
      await fs.rm(this.config.outputDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore non-existent directory
    }
  }
}

/**
 * Create resource generator instance
 */
export function createResourceGenerator(config: ResourceGeneratorConfig): ResourceGenerator {
  return new ResourceGenerator(config);
}
