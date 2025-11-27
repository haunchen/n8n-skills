/**
 * Copyright (c) 2025 Frank Chen @ www.frankchen.tw/personal
 * SPDX-License-Identifier: MIT
 *
 * This file is part of n8n-skills project.
 *
 * Generate community node documentation from community-packages.json and cache.
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  CommunityPackage,
  CommunityCategory,
  CommunityCollectionResult,
  CommunityNodesCache,
  CommunityNodeDetails,
  CommunityNodeInfo,
} from '../collectors/community-collector';
import { CoreProperty, Operation } from '../parsers/property-parser';

// Category display information
const CATEGORY_INFO: Record<
  CommunityCategory,
  { name: string; description: string; icon: string }
> = {
  communication: {
    name: 'Communication & Messaging',
    description: 'WhatsApp, ChatWoot, and other messaging platform integrations',
    icon: '💬',
  },
  'ai-tools': {
    name: 'AI & Voice Tools',
    description: 'AI voice generation, search engines, and LLM integrations',
    icon: '🤖',
  },
  'web-scraping': {
    name: 'Web Scraping & Browser Automation',
    description: 'Web scraping, browser automation, and search API integrations',
    icon: '🕷️',
  },
  document: {
    name: 'Document Processing',
    description: 'PDF generation, document conversion, and file processing',
    icon: '📄',
  },
  'data-processing': {
    name: 'Data Processing',
    description: 'Text manipulation, data validation, and transformation tools',
    icon: '🔄',
  },
  utilities: {
    name: 'Utilities & Tools',
    description: 'General purpose utilities and helper tools',
    icon: '🔧',
  },
};

export interface CommunityGeneratorConfig {
  outputDir?: string;
  configPath?: string;
  cachePath?: string;
}

/**
 * Escape special markdown characters
 */
function escapeMarkdown(text: string): string {
  if (!text) return '';
  return text
    .replace(/\|/g, '\\|')
    .replace(/\n/g, ' ')
    .trim();
}


export class CommunityGenerator {
  private outputDir: string;
  private configPath: string;
  private cachePath: string;

  constructor(config: CommunityGeneratorConfig = {}) {
    this.outputDir = config.outputDir || path.join(process.cwd(), 'output', 'resources', 'community');
    this.configPath = config.configPath || path.join(process.cwd(), 'config', 'community-packages.json');
    this.cachePath = config.cachePath || path.join(process.cwd(), 'data', 'cache', 'community-nodes.json');
  }

  /**
   * Load community packages from config
   */
  private async loadConfig(): Promise<CommunityCollectionResult> {
    const content = await fs.promises.readFile(this.configPath, 'utf-8');
    return JSON.parse(content);
  }

  /**
   * Load community nodes cache
   */
  private async loadCache(): Promise<CommunityNodesCache | null> {
    try {
      const content = await fs.promises.readFile(this.cachePath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  /**
   * Group packages by category
   */
  private groupByCategory(
    packages: CommunityPackage[]
  ): Map<CommunityCategory, CommunityPackage[]> {
    const groups = new Map<CommunityCategory, CommunityPackage[]>();

    for (const pkg of packages) {
      const existing = groups.get(pkg.category) || [];
      existing.push(pkg);
      groups.set(pkg.category, existing);
    }

    return groups;
  }

  /**
   * Clean repository URL to proper GitHub URL
   */
  private cleanRepositoryUrl(url: string): string {
    if (!url) return '';
    let cleaned = url.replace(/^git\+/, '');
    cleaned = cleaned.replace(/\.git$/, '');
    return cleaned;
  }

  /**
   * Generate README.md (index file)
   */
  private generateReadme(result: CommunityCollectionResult, cache: CommunityNodesCache | null): string {
    const groups = this.groupByCategory(result.packages);

    let content = `# Popular Community Nodes

> Top ${result.limit} most popular n8n community nodes from npm registry.
> Last updated: ${new Date(result.lastUpdated).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })}

## Overview

| Metric | Value |
|--------|-------|
| Total Packages | ${result.packages.length} |
| Categories | ${groups.size} |

## Packages

| Rank | Package | Category | Nodes |
|------|---------|----------|-------|
`;

    result.packages.forEach((pkg, index) => {
      const categoryInfo = CATEGORY_INFO[pkg.category];
      const cachedDetails = cache?.nodes[pkg.name];
      const nodeCount = cachedDetails?.nodes?.length || 0;
      const hasDetails = nodeCount > 0;
      const packageLink = hasDetails ? `[${pkg.name}](./${this.sanitizeFilename(pkg.name)}.md)` : pkg.name;
      content += `| ${index + 1} | ${packageLink} | ${categoryInfo.icon} ${pkg.category} | ${nodeCount} |\n`;
    });

    content += `
## Categories

`;

    // Sort categories by package count
    const sortedCategories = Array.from(groups.entries()).sort(
      (a, b) => b[1].length - a[1].length
    );

    for (const [category, packages] of sortedCategories) {
      const info = CATEGORY_INFO[category];
      content += `### ${info.icon} ${info.name}

> ${info.description}

- Packages: ${packages.length}

`;
    }

    content += `## Installation

Community nodes can be installed via n8n's GUI:

1. Go to **Settings** > **Community Nodes**
2. Click **Install**
3. Enter the package name (e.g., \`n8n-nodes-evolution-api\`)
4. Click **Install**

> Note: Community nodes are only available on self-hosted n8n instances.
`;

    return content;
  }

  /**
   * Sanitize filename
   */
  private sanitizeFilename(name: string): string {
    return name.replace(/@/g, '').replace(/\//g, '-');
  }

  /**
   * Generate detailed documentation for a package
   */
  private generatePackageDoc(
    pkg: CommunityPackage,
    details: CommunityNodeDetails | undefined
  ): string {
    const lines: string[] = [];

    // Title
    lines.push(`# ${pkg.name}`);
    lines.push('');

    // Basic information
    lines.push('## Basic Information');
    lines.push('');
    lines.push(`- Package: \`${pkg.name}\``);
    lines.push(`- Category: ${CATEGORY_INFO[pkg.category].icon} ${CATEGORY_INFO[pkg.category].name}`);
    if (pkg.version) {
      lines.push(`- Version: ${pkg.version}`);
    }
    if (pkg.maintainer) {
      lines.push(`- Maintainer: ${pkg.maintainer}`);
    }
    lines.push(`- npm: [View Package](${pkg.npmUrl})`);
    if (pkg.repository) {
      lines.push(`- Repository: [View Source](${this.cleanRepositoryUrl(pkg.repository)})`);
    }
    lines.push('');

    // Description
    if (pkg.description) {
      lines.push('## Description');
      lines.push('');
      lines.push(escapeMarkdown(pkg.description));
      lines.push('');
    }

    // Installation
    lines.push('## Installation');
    lines.push('');
    lines.push('```');
    lines.push(pkg.name);
    lines.push('```');
    lines.push('');

    // Node details from cache
    if (details && details.nodes && details.nodes.length > 0) {
      lines.push(`## Nodes (${details.nodes.length})`);
      lines.push('');

      for (const node of details.nodes) {
        this.appendNodeDetails(lines, node);
      }
    } else if (details?.loadError) {
      lines.push('## Node Details');
      lines.push('');
      lines.push(`> Node details unavailable: ${details.loadError}`);
      lines.push('');
    }

    lines.push('---');
    lines.push('');
    lines.push('[← Back to Community Nodes Index](README.md)');
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Append details for a single node
   */
  private appendNodeDetails(lines: string[], node: CommunityNodeInfo): void {
    lines.push(`### ${node.displayName}`);
    lines.push('');

    // Basic info
    lines.push(`- Node Type: \`${node.nodeType}\``);
    lines.push(`- Version: ${node.version}`);
    if (node.properties?.hasCredentials) {
      lines.push(`- Requires Credentials: Yes`);
    }
    lines.push('');

    // Description
    if (node.description) {
      lines.push(escapeMarkdown(node.description));
      lines.push('');
    }

    // Operations
    if (node.properties?.operations && node.properties.operations.length > 0) {
      lines.push('#### Available Operations');
      lines.push('');
      this.appendOperations(lines, node.properties.operations);
    }

    // Core properties
    if (node.properties?.coreProperties && node.properties.coreProperties.length > 0) {
      this.appendProperties(lines, node.properties.coreProperties);
    }

    // Connection info
    if (node.ioInfo) {
      lines.push('#### Connection');
      lines.push('');
      lines.push(`- Input Types: ${node.ioInfo.inputTypes.map(t => `\`${t}\``).join(', ')}`);
      lines.push(`- Output Types: ${node.ioInfo.outputTypes.map(t => `\`${t}\``).join(', ')}`);
      if (node.ioInfo.outputCount > 1) {
        lines.push(`- Output Count: ${node.ioInfo.outputCount}`);
      }
      lines.push('');
    }

    // JSON example
    this.appendExample(lines, node);

    lines.push('---');
    lines.push('');
  }

  /**
   * Append operations list
   */
  private appendOperations(lines: string[], operations: Operation[]): void {
    // Limit to first 10 operations
    const displayOps = operations.slice(0, 10);

    for (const op of displayOps) {
      lines.push(`- **${op.name}** (\`${op.value}\`)`);
      if (op.description) {
        lines.push(`  ${escapeMarkdown(op.description)}`);
      }
    }

    if (operations.length > 10) {
      lines.push(`- ... and ${operations.length - 10} more operations`);
    }
    lines.push('');
  }

  /**
   * Append properties table
   */
  private appendProperties(lines: string[], properties: CoreProperty[]): void {
    lines.push('#### Core Properties');
    lines.push('');
    lines.push('| Property | Type | Required | Default |');
    lines.push('|----------|------|----------|---------|');

    for (const prop of properties) {
      const defaultValue = prop.default !== undefined ? `\`${JSON.stringify(prop.default)}\`` : '-';
      const required = prop.required ? 'Yes' : 'No';
      lines.push(`| \`${prop.name}\` | ${prop.type} | ${required} | ${defaultValue} |`);
    }
    lines.push('');
  }

  /**
   * Append JSON example
   */
  private appendExample(lines: string[], node: CommunityNodeInfo): void {
    lines.push('#### Example Configuration');
    lines.push('');
    lines.push('```json');

    const example: Record<string, any> = {
      name: node.displayName,
      type: node.nodeType,
      typeVersion: parseInt(node.version) || 1,
      position: [250, 300],
      parameters: {},
    };

    // Add default values for required properties
    if (node.properties?.coreProperties) {
      node.properties.coreProperties
        .filter(prop => prop.required)
        .slice(0, 5) // Limit to avoid overly long examples
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

    // Add first operation if available
    if (node.properties?.operations && node.properties.operations.length > 0) {
      const firstOp = node.properties.operations[0];
      if (firstOp.resource) {
        example.parameters.resource = firstOp.resource;
      }
      example.parameters.operation = firstOp.value;
    }

    lines.push(JSON.stringify(example, null, 2));
    lines.push('```');
    lines.push('');
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
   * Generate all documentation files
   */
  public async generate(): Promise<void> {
    console.log('Generating community node documentation...');

    // Load config and cache
    const result = await this.loadConfig();
    const cache = await this.loadCache();

    if (result.packages.length === 0) {
      console.log('No community packages found, skipping generation');
      return;
    }

    // Ensure output directory exists
    await fs.promises.mkdir(this.outputDir, { recursive: true });

    // Generate README.md
    const readmeContent = this.generateReadme(result, cache);
    await fs.promises.writeFile(
      path.join(this.outputDir, 'README.md'),
      readmeContent,
      'utf-8'
    );
    console.log(`  Generated: README.md`);

    // Generate detailed documentation for each package
    let detailedCount = 0;
    let basicCount = 0;

    for (const pkg of result.packages) {
      const details = cache?.nodes[pkg.name];
      const content = this.generatePackageDoc(pkg, details);
      const filename = `${this.sanitizeFilename(pkg.name)}.md`;

      await fs.promises.writeFile(
        path.join(this.outputDir, filename),
        content,
        'utf-8'
      );

      if (details?.nodes && details.nodes.length > 0) {
        detailedCount++;
      } else {
        basicCount++;
      }
    }

    console.log(`  Generated: ${result.packages.length} package files`);
    console.log(`    - With detailed node info: ${detailedCount}`);
    console.log(`    - Basic info only: ${basicCount}`);

    console.log(`\nCommunity documentation generated in: ${this.outputDir}`);
    console.log(`  Total files: ${result.packages.length + 1}`);
  }
}

// Convenience function
export async function generateCommunityDocs(
  config?: CommunityGeneratorConfig
): Promise<void> {
  const generator = new CommunityGenerator(config);
  await generator.generate();
}
