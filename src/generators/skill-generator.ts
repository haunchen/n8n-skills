/**
 * Copyright (c) 2025 Frank Chen @ www.frankchen.tw/personal
 * SPDX-License-Identifier: MIT
 *
 * This file is part of n8n-skills project.
 */

/**
 * Skill Generator
 * Generate the main SKILL.md file
 *
 * This generator combines all collected and processed data to generate a structured Markdown file
 */

import type { SimplifiedNodeInfo } from '../collectors/npm-collector';
import type { NodeUsageStats } from '../collectors/api-collector';
import type { ParsedProperties } from '../parsers/property-parser';
import type { PriorityTier } from '../organizers/priority-ranker';
import { escapeMarkdown } from './template-formatter';

/**
 * Skill file configuration
 */
export interface SkillConfig {
  name: string;
  version: string;
  description: string;
  author?: string;
  license?: string;
  maxLines?: number;
  topNodesCount?: number;
}

/**
 * Node information (combined)
 */
export interface EnrichedNodeInfo extends SimplifiedNodeInfo {
  usageCount?: number;
  usagePercentage?: number;
  properties?: ParsedProperties;
  examples?: {
    minimal?: Record<string, any>;
    common?: Record<string, any>;
    advanced?: Record<string, any>;
  };
  // Priority-related fields (for tiered merge strategy)
  score?: number;
  rank?: number;
  tier?: PriorityTier;
}

/**
 * Resource file information
 */
export interface ResourceFile {
  name: string;
  path: string;
  description: string;
  category?: string;
}

/**
 * Skill generator input data
 */
export interface SkillGeneratorInput {
  nodes: EnrichedNodeInfo[];
  nodeUsageStats: NodeUsageStats;
  resourceFiles: ResourceFile[];
  config: SkillConfig;
  templateCount?: number;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Required<SkillConfig> = {
  name: 'n8n-skills',
  version: '1.0.0',
  description: 'n8n workflow automation knowledge base. Provides n8n node information, node functionality details, workflow patterns, and configuration examples. Covers triggers, data transformation, data input/output, AI integration, and more. Keywords: n8n, workflow, automation, node, trigger, webhook, http request, database, ai agent.',
  author: 'n8n-skill',
  license: 'MIT',
  maxLines: 5000,
  topNodesCount: 50,
};

/**
 * Common workflow patterns
 */
const COMMON_PATTERNS = [
  {
    name: 'HTTP Data Fetching',
    description: 'Fetch data from APIs and process it',
    nodes: ['HTTP Request', 'Set', 'IF'],
    example: 'Use HTTP Request node to fetch data from external APIs, Set node to transform formats, and IF node for conditional logic'
  },
  {
    name: 'Email Automation',
    description: 'Monitor emails and auto-respond or forward',
    nodes: ['Email Trigger (IMAP)', 'Gmail', 'IF'],
    example: 'Use Email Trigger to monitor inbox, IF node to filter specific conditions, and Gmail node to auto-reply or forward'
  },
  {
    name: 'Database Synchronization',
    description: 'Sync data between different systems',
    nodes: ['Schedule Trigger', 'HTTP Request', 'Postgres', 'MySQL'],
    example: 'Scheduled trigger to read data from one database, transform it, and write to another database'
  },
  {
    name: 'Webhook Processing',
    description: 'Receive external webhooks and trigger actions',
    nodes: ['Webhook', 'Set', 'HTTP Request', 'Slack'],
    example: 'Receive webhook events, process data, and send notifications to Slack or other systems'
  },
  {
    name: 'AI Assistant Integration',
    description: 'Use AI models to process and generate content',
    nodes: ['AI Agent', 'OpenAI', 'Vector Store', 'Embeddings OpenAI'],
    example: 'Build AI assistants to handle user queries, integrate vector databases for semantic search'
  },
  {
    name: 'File Processing',
    description: 'Automatically process and transform files',
    nodes: ['Google Drive Trigger', 'Extract from File', 'Move Binary Data', 'Dropbox'],
    example: 'Monitor Google Drive for new files, extract and process content, then upload to Dropbox'
  },
];

/**
 * SKILL.md generator
 */
export class SkillGenerator {
  private config: Required<SkillConfig>;

  constructor(config: Partial<SkillConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Generate complete SKILL.md content
   */
  generate(input: SkillGeneratorInput): string {
    const totalNodes = input.nodes.length;
    const templateCount = input.templateCount || 20;
    const sections: string[] = [
      this.generateFrontmatter(totalNodes),
      this.generateOverview(),
      this.generateTableOfContents(),
      this.generateWorkflowPatterns(templateCount),
      this.generateLicense(),
    ];

    const content = sections.filter(Boolean).join('\n\n');

    // Check line count limit
    const actualLines = content.split('\n').length;
    if (actualLines > this.config.maxLines) {
      console.warn(
        `Warning: Generated content exceeds limit (${actualLines} > ${this.config.maxLines} lines)`
      );
    }

    return content;
  }

  /**
   * Generate YAML frontmatter
   */
  private generateFrontmatter(totalNodes: number): string {
    const description = this.config.description.replace(
      'and more',
      `covering ${totalNodes} nodes`
    );

    // Escape double quotes in description for valid YAML
    const escapedDescription = description.replace(/"/g, '\\"');

    // Read package.json for version and license
    // Path is relative to compiled dist/src/generators/
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const packageJson = require('../../../package.json');
    const version = packageJson.version;
    const license = packageJson.license;

    return [
      '---',
      `name: ${this.config.name}`,
      `description: "${escapedDescription}"`,
      `license: ${license}`,
      'metadata:',
      '  author: Frank Chen',
      `  version: "${version}"`,
      '---',
    ].join('\n');
  }

  /**
   * Generate overview section
   */
  private generateOverview(): string {
    return [
      '# n8n Workflow Automation Skill Pack',
      '',
      '## Overview',
      '',
      'This skill helps with:',
      '- Understanding n8n node functionality and usage',
      '- Finding nodes suitable for specific tasks',
      '- Learning common workflow patterns',
      '- Getting node configuration examples',
      '- Solving workflow design problems',
      '',
      'This skill includes:',
      `- Detailed information on the ${this.config.topNodesCount} most commonly used built-in n8n nodes`,
      '- 30+ popular community packages for extended functionality',
      '- Node configuration examples and best practices',
      '- Common workflow patterns',
      '- Node categorization and indexing for both built-in and community nodes',
    ].join('\n');
  }

  /**
   * Generate table of contents
   */
  private generateTableOfContents(): string {
    return [
      '## Table of Contents',
      '',
      '- [Overview](#overview)',
      '- [Common Workflow Patterns](#common-workflow-patterns)',
      '- [How to Find Nodes](resources/guides/how-to-find-nodes.md)',
      '- [Usage Guide](resources/guides/usage-guide.md)',
      '- [License and Attribution](#license-and-attribution)',
    ].join('\n');
  }


  /**
   * Generate node finding guide file (for separate file)
   */
  generateHowToFindNodesFile(
    _nodes: EnrichedNodeInfo[],
    _stats: NodeUsageStats
  ): string {
    const sections = [
      '# How to Find Nodes',
      '',
      'This skill contains complete information for 542 n8n nodes. As an AI assistant, you can use the following tools to efficiently find and read node information.',
      '',
      '## 1. Using the Unified Index (INDEX.md)',
      '',
      'INDEX.md is the master index for all nodes, providing two ways to search:',
      '',
      '### Read Complete Index',
      '```',
      'Read("resources/INDEX.md")',
      '```',
      '',
      'Index contents include:',
      '- Find by category: 6 built-in categories (Transform, Input, Output, Trigger, Organization, Misc)',
      '- Community packages: 30+ popular community node packages',
      '- Template index: workflow templates',
      '',
      '### Read Specific Sections of the Index',
      '',
      'INDEX.md contains location information (starting line number and line count) for all 542 nodes, allowing you to read precisely:',
      '',
      'Example: Finding nodes in the "Data Transformation" category',
      '```',
      '# First read the index to understand category contents',
      'Read("resources/INDEX.md", offset=1, limit=100)',
      '```',
      '',
      '## 2. Using Read Tool to Precisely Read Node Documentation',
      '',
      '### Read High-Priority Nodes (Individual Files)',
      '',
      'The top 50 most commonly used nodes have individual files, which can be read directly:',
      '',
      '```',
      '# Example: Read Gmail node',
      'Read("resources/output/nodes-base.gmail.md")',
      '',
      '# Example: Read Code node',
      'Read("resources/transform/nodes-base.code.md")',
      '```',
      '',
      '### Read Low-Priority Nodes (Specific Nodes in Merged Files)',
      '',
      'The other 492 nodes are merged in category files. INDEX.md will tell you the starting line number and line count for each node:',
      '',
      '```',
      '# Step 1: Find the node\'s location information from INDEX.md',
      '# Example: Azure Cosmos DB is at line 110 in transform-merged-1.md with 64 lines',
      '',
      '# Step 2: Use starting line number and line count to read precisely',
      'Read("resources/transform/transform-merged-1.md", offset=110, limit=64)',
      '```',
      '',
      '## 3. Using Glob Tool to Search Files',
      '',
      'When you know part of a node name, use Glob to quickly locate files:',
      '',
      '```',
      '# Search for node files containing "gmail"',
      'Glob("resources/**/*gmail*.md")',
      '',
      '# Search all output-type nodes',
      'Glob("resources/output/*.md")',
      '',
      '# Search all trigger nodes',
      'Glob("resources/trigger/*.md")',
      '',
      '# Search merged files',
      'Glob("resources/**/*-merged-*.md")',
      '```',
      '',
      '## 4. Using Grep Tool to Search Keywords',
      '',
      'Search for functional keywords in all resource files:',
      '',
      '```',
      '# Search for nodes containing "send email"',
      'Grep("send email", path="resources", output_mode="files_with_matches")',
      '',
      '# Search for database-related nodes',
      'Grep("database", path="resources", output_mode="files_with_matches")',
      '',
      '# Search webhook-related functionality (show matching content)',
      'Grep("webhook", path="resources", output_mode="content", -n=true, -C=2)',
      '',
      '# Search for AI-related nodes',
      'Grep("AI|artificial intelligence", path="resources", output_mode="files_with_matches")',
      '```',
      '',
      '## 5. Searching Community Nodes',
      '',
      'Community nodes are organized in a dedicated directory:',
      '',
      '### Read Community Index',
      '```',
      'Read("resources/community/README.md")',
      '```',
      '',
      '### Search Community Packages',
      '```',
      '# Search for WhatsApp-related community nodes',
      'Glob("resources/community/*evolution*.md")',
      'Glob("resources/community/*whatsapp*.md")',
      '',
      '# Search for AI-related community nodes',
      'Glob("resources/community/*elevenlabs*.md")',
      'Glob("resources/community/*perplexity*.md")',
      'Glob("resources/community/*tavily*.md")',
      '',
      '# Search by keyword in community packages',
      'Grep("voice generation", path="resources/community", output_mode="files_with_matches")',
      '```',
      '',
      '## Search Strategy Recommendations',
      '',
      'Choose the best search method for different scenarios:',
      '',
      '1. User asks about specific services (e.g., "Gmail", "Slack"):',
      '   → Use Glob search: `Glob("resources/**/*gmail*.md")`',
      '',
      '2. User asks about functional requirements (e.g., "send email", "database query"):',
      '   → Use Grep to search keywords: `Grep("send email", path="resources")`',
      '',
      '3. User asks about node categories (e.g., "what triggers are available"):',
      '   → Read category table in INDEX.md: `Read("resources/INDEX.md", offset=<category_start_line>, limit=<line_count>)`',
      '',
      '4. User wants to learn about popular nodes:',
      '   → Read the priority ranking table in INDEX.md',
      '',
      '5. User needs workflow examples:',
      '   → Reference the "Common Workflow Patterns" section or resources/templates/ directory',
      '',
      '6. User asks about community packages:',
      '   → Read community index: `Read("resources/community/README.md")`',
      '   → Search community packages: `Glob("resources/community/*keyword*.md")`',
      '',
    ];

    return sections.join('\n');
  }

  /**
   * Generate workflow patterns section
   */
  private generateWorkflowPatterns(templateCount: number): string {
    const sections = [
      '# Common Workflow Patterns',
      '',
      'Here are some common workflow patterns you can use as a starting point:',
      '',
    ];

    COMMON_PATTERNS.forEach((pattern, index) => {
      sections.push(
        `## ${index + 1}. ${pattern.name}`,
        '',
        escapeMarkdown(pattern.description),
        '',
        'Nodes used:',
        ...pattern.nodes.map(node => `- ${node}`),
        '',
        `Example: ${escapeMarkdown(pattern.example)}`,
        ''
      );
    });

    sections.push(
      '## Complete Template Library',
      '',
      `We have collected ${templateCount} popular workflow templates from n8n.io, categorized by use case:`,
      '',
      '- [AI & Chatbots](resources/templates/ai-chatbots/README.md) - AI Agents, RAG systems, intelligent conversations',
      '- [Social Media & Video](resources/templates/social-media/README.md) - TikTok, Instagram, YouTube automation',
      '- [Data Processing & Analysis](resources/templates/data-processing/README.md) - Google Sheets, database integration',
      '- [Communication & Collaboration](resources/templates/communication/README.md) - Email, WhatsApp, Telegram automation',
      '',
      'See the [complete template index](resources/templates/README.md) for all available templates.',
      ''
    );

    return sections.join('\n');
  }

  /**
   * Generate usage guide file (for separate file)
   */
  generateUsageGuideFile(resourceFiles: ResourceFile[]): string {
    const categoryCounts = new Map<string, number>();

    resourceFiles.forEach(file => {
      const category = file.category || 'misc';
      categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
    });

    const sections = [
      '# Usage Guide',
      '',
      '## 1. File Structure Navigation',
      '',
      '### Directory Structure',
      '',
      '```',
      'resources/',
      '├── INDEX.md                     # Unified index (contains line number info for all nodes)',
      '├── compatibility-matrix.md      # Node compatibility matrix',
      '├── transform/                   # Data transformation nodes',
      `│   ├── README.md                # ${categoryCounts.get('transform') || 0} nodes overview`,
      '│   ├── nodes-base.code.md       # High-priority individual files',
      '│   ├── nodes-base.function.md',
      '│   └── transform-merged-*.md    # Low-priority merged files',
      '├── input/                       # Data input nodes',
      `│   ├── README.md                # ${categoryCounts.get('input') || 0} nodes`,
      '│   └── ...',
      '├── output/                      # Data output nodes',
      `│   ├── README.md                # ${categoryCounts.get('output') || 0} nodes`,
      '│   └── ...',
      '├── trigger/                     # Trigger nodes',
      `│   ├── README.md                # ${categoryCounts.get('trigger') || 0} nodes`,
      '│   └── ...',
      '├── organization/                # Organization management nodes',
      `│   ├── README.md                # ${categoryCounts.get('organization') || 0} nodes`,
      '│   └── ...',
      '├── misc/                        # Miscellaneous nodes',
      `│   ├── README.md                # ${categoryCounts.get('misc') || 0} nodes`,
      '│   └── ...',
      '├── community/                   # Community package nodes',
      '│   ├── README.md                # Community packages index (30+ packages)',
      '│   ├── ai-tools.md              # AI tools category',
      '│   ├── communication.md         # Communication category',
      '│   └── *.md                     # Individual package files',
      '└── templates/                   # Workflow templates',
      '    ├── README.md                # Templates overview',
      '    ├── ai-chatbots/             # AI & chatbot templates',
      '    ├── social-media/            # Social media templates',
      '    ├── data-processing/         # Data processing templates',
      '    └── communication/           # Communication & collaboration templates',
      '```',
      '',
      '### High-Priority vs Low-Priority Nodes',
      '',
      '- High-priority (top 50): Individual files, filename format `nodes-base.{nodeType}.md`',
      '  - Example: `resources/transform/nodes-base.code.md`',
      '  - Read the complete file directly using the Read tool',
      '',
      '- Low-priority (other 492): Merged in `*-merged-*.md` files',
      '  - Example: `resources/transform/transform-merged-1.md`',
      '  - Use INDEX.md to find line numbers, then use Read tool\'s offset/limit parameters to read specific ranges',
      '',
      '## 2. Complete Tool Usage Instructions',
      '',
      '### Read Tool',
      '',
      'Purpose: Read file contents',
      '',
      'Complete read:',
      '```',
      'Read("resources/INDEX.md")',
      'Read("resources/transform/nodes-base.code.md")',
      '```',
      '',
      'Precise read (using starting line number and line count):',
      '```',
      'Read("resources/transform/transform-merged-1.md", offset=110, limit=64)',
      '```',
      '',
      '### Glob Tool',
      '',
      'Purpose: Search for files matching a pattern',
      '',
      'Common patterns:',
      '```',
      'Glob("resources/**/*{keyword}*.md")    # Search for files containing keyword',
      'Glob("resources/transform/*.md")      # Search all files in a specific category',
      'Glob("resources/**/*-merged-*.md")    # Search all merged files',
      '```',
      '',
      '### Grep Tool',
      '',
      'Purpose: Search for keywords in file contents',
      '',
      'Basic search:',
      '```',
      'Grep("{keyword}", path="resources", output_mode="files_with_matches")',
      '```',
      '',
      'Advanced search:',
      '```',
      '# Show matching content and line numbers',
      'Grep("{keyword}", path="resources", output_mode="content", -n=true, -C=2)',
      '',
      '# Use regular expressions',
      'Grep("email|mail", path="resources", output_mode="files_with_matches")',
      '',
      '# Limit search to specific category',
      'Grep("{keyword}", path="resources/transform", output_mode="files_with_matches")',
      '```',
      '',
      '### INDEX.md Query Method',
      '',
      'INDEX.md is the most important navigation tool, recommended to use first:',
      '',
      '1. First read INDEX.md to understand overall structure',
      '2. Find target nodes based on categories',
      '3. Record node\'s file path, starting line number, and line count',
      '4. Use Read tool to precisely read node content',
      '',
      '## 3. Decision Flow Guide',
      '',
      '### Scenario 1: User Asks About a Specific Service Node',
      '',
      'Example: "How do I use the Gmail node?"',
      '',
      'Decision flow:',
      '```',
      '1. Use Glob for quick location',
      '   Glob("resources/**/*gmail*.md")',
      '',
      '2. If an individual file is found, read it directly',
      '   Read("resources/output/nodes-base.gmail.md")',
      '',
      '3. If in a merged file, check INDEX.md first',
      '   → Find starting line number and line count',
      '   → Use offset/limit to read',
      '```',
      '',
      '### Scenario 2: User Asks About Functional Requirements',
      '',
      'Example: "I need a node to send emails"',
      '',
      'Decision flow:',
      '```',
      '1. Use Grep to search keywords',
      '   Grep("send email|send mail", path="resources", output_mode="files_with_matches")',
      '',
      '2. Get a list of candidate nodes',
      '   → Gmail, SendGrid, SMTP, etc.',
      '',
      '3. Read detailed documentation for relevant nodes',
      '   → Compare functional differences',
      '   → Recommend the most suitable node',
      '```',
      '',
      '### Scenario 3: User Asks About Node Categories',
      '',
      'Example: "What trigger nodes are available?"',
      '',
      'Decision flow:',
      '```',
      '1. Read the trigger category section in INDEX.md',
      '   Read("resources/INDEX.md")',
      '   → Find "## Find by Category" > "### Trigger"',
      '',
      '2. Or directly read the category README',
      '   Read("resources/trigger/README.md")',
      '',
      '3. Provide node list and brief descriptions',
      '```',
      '',
      '### Scenario 4: User Needs Workflow Examples',
      '',
      'Example: "How do I build an AI chatbot?"',
      '',
      'Decision flow:',
      '```',
      '1. First check the "Common Workflow Patterns" section',
      '   → Look for relevant patterns',
      '',
      '2. Check the template library',
      '   Read("resources/templates/ai-chatbots/README.md")',
      '',
      '3. Combine with node documentation',
      '   → AI Agent node',
      '   → OpenAI node',
      '   → Vector Store node',
      '```',
      '',
      '### Scenario 5: User Asks About Community Packages',
      '',
      'Example: "What community nodes are available for WhatsApp?"',
      '',
      'Decision flow:',
      '```',
      '1. Read community nodes index',
      '   Read("resources/community/README.md")',
      '',
      '2. Search for specific packages',
      '   Glob("resources/community/*whatsapp*.md")',
      '   Glob("resources/community/*evolution*.md")',
      '   Grep("whatsapp", path="resources/community", output_mode="files_with_matches")',
      '',
      '3. Read detailed package documentation',
      '   Read("resources/community/n8n-nodes-evolution-api.md")',
      '   Read("resources/community/n8n-nodes-megaapi.md")',
      '```',
      '',
      '## 4. Best Practices and Considerations',
      '',
      '### Search Strategy',
      '',
      '1. Prioritize using INDEX.md for a global view',
      '   - Understand node categorization and priorities',
      '   - Quickly locate target nodes',
      '',
      '2. Leverage Grep for function-oriented searches',
      '   - When users describe needs rather than specific node names',
      '   - Keyword searches can quickly find candidate nodes',
      '',
      '3. Use Glob for filename searches',
      '   - When you know part of a node name',
      '   - Faster than Grep',
      '',
      '4. Leverage starting line number and line count reading',
      '   - Merged files can be very large (thousands of lines)',
      '   - Use offset/limit to read only the needed portions',
      '   - Save token usage',
      '',
      '### Node Selection Recommendations',
      '',
      '1. Prioritize recommending high-priority nodes',
      '   - High usage = more stable, more complete documentation',
      '   - Better community support',
      '',
      '2. Check node compatibility',
      '   - Read resources/compatibility-matrix.md',
      '   - Or check the "Connection Guide" section in node documentation',
      '',
      '3. Reference actual templates',
      '   - The templates/ directory contains real-world use cases',
      '   - Learn how nodes are combined',
      '',
      '### Common Pitfalls',
      '',
      '1. Don\'t always read complete merged files',
      '   - Merged files can have thousands of lines',
      '   - Should use INDEX.md to find line numbers, then read precisely',
      '',
      '2. Pay attention to node naming format',
      '   - File format: `nodes-base.{nodeType}.md`',
      '   - nodeType is usually lowercase with hyphens',
      '   - Example: `nodes-base.httpRequest.md` (not `http-request`)',
      '',
      '3. Distinguish between trigger and action nodes',
      '   - Triggers can only be placed at the beginning of workflows',
      '   - Webhook nodes are also a type of trigger',
      '',
      '4. Check node versions',
      '   - Some nodes have multiple versions',
      '   - Documentation will note version numbers and differences',
      '',
    ];

    return sections.join('\n');
  }

  /**
   * Generate license statement
   */
  private generateLicense(): string {
    return [
      '---',
      '',
      '# License and Attribution',
      '',
      '## This Skill Pack License',
      '',
      'This skill pack project is licensed under the MIT License.',
      'See: https://github.com/haunchen/n8n-skills/blob/main/LICENSE',
      '',
      '## Important Notice',
      '',
      'This is an unofficial educational project and is not affiliated with n8n GmbH.',
      '',
      'This skill content is generated based on the following resources:',
      '- n8n node type definitions (Sustainable Use License)',
      '- n8n official documentation (MIT License)',
      '- n8n-mcp project architecture (MIT License)',
      '',
      'For detailed attribution information, please refer to the ATTRIBUTIONS.md file in the project.',
      '',
      '## About n8n',
      '',
      'n8n is an open-source workflow automation platform developed and maintained by n8n GmbH.',
      '',
      '- Official website: https://n8n.io',
      '- Documentation: https://docs.n8n.io',
      '- Source code: https://github.com/n8n-io/n8n',
      '- License: Sustainable Use License',
      '',
      'When using n8n software, you must comply with n8n\'s license terms. See: https://github.com/n8n-io/n8n/blob/master/LICENSE.md',
    ].join('\n');
  }
}

/**
 * Convenience function: quickly generate SKILL.md
 */
export function generateSkillMarkdown(
  input: SkillGeneratorInput
): string {
  const generator = new SkillGenerator(input.config);
  return generator.generate(input);
}

/**
 * Convenience function: generate and write to file
 */
export async function generateSkillFile(
  input: SkillGeneratorInput,
  outputPath: string
): Promise<void> {
  const { writeFile } = await import('fs/promises');
  const content = generateSkillMarkdown(input);
  await writeFile(outputPath, content, 'utf-8');
  console.log(`SKILL.md generated: ${outputPath}`);
  console.log(`Total lines: ${content.split('\n').length}`);
}
