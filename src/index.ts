/**
 * Copyright (c) 2025 Frank Chen @ www.frankchen.tw/personal
 * SPDX-License-Identifier: MIT
 *
 * This file is part of n8n-skills project.
 */

/**
 * n8n Skill Pack - 主要入口點
 * 匯出所有公開的類別、函數和類型
 */

// 內部使用的 import
import { NpmCollector, type SimplifiedNodeInfo } from './collectors/npm-collector';
import { ApiCollector, type NodeUsageStats } from './collectors/api-collector';
import { type EnrichedNodeInfo, type SkillConfig } from './generators/skill-generator';
import { SkillGenerator } from './generators/skill-generator';

// ===== 收集器 (Collectors) =====
export {
  // NPM 收集器
  NpmCollector,
  type SimplifiedNodeInfo,
  type LoadedNode,
} from './collectors/npm-collector';

export {
  // API 收集器
  ApiCollector,
  fetchPopularTemplates,
  getNodeUsageStats,
  type ApiCollectorConfig,
  type TemplateCollectionResult,
  type NodeUsageStats,
} from './collectors/api-collector';

// ===== 解析器 (Parsers) =====
export {
  // 節點解析器
  NodeParser,
  type NodeClass,
  type ParsedNode,
} from './parsers/node-parser';

export {
  // 屬性解析器
  PropertyParser,
  type CoreProperty,
  type Operation,
  type ParsedProperties,
} from './parsers/property-parser';

// ===== 組織器 (Organizers) =====
export {
  // 優先級排序器
  PriorityRanker,
  type PriorityTier,
  type NodeData,
  type ScoredNode,
} from './organizers/priority-ranker';

export {
  // 類別組織器
  CategoryOrganizer,
  type CategoryDefinition,
  type CategoryConfig,
  type CategorizedNode,
  type OrganizationResult,
} from './organizers/category-organizer';

export {
  // 節點分組器
  NodeGrouper,
  UsageFrequency,
  FunctionalGroup,
  type GroupedNode,
  type NodeRelationship,
  type GroupingResult,
} from './organizers/node-grouper';

// ===== 生成器 (Generators) =====
export {
  // Skill 生成器
  SkillGenerator,
  generateSkillMarkdown,
  generateSkillFile,
  type SkillConfig,
  type EnrichedNodeInfo,
  type ResourceFile,
  type SkillGeneratorInput,
} from './generators/skill-generator';

export {
  // 資源生成器
  ResourceGenerator,
  createResourceGenerator,
  type ResourceGeneratorConfig,
} from './generators/resource-generator';

export {
  // 範本格式化器
  TemplateFormatter,
  createTemplateFormatter,
  formatMarkdown,
  type FormatterOptions,
} from './generators/template-formatter';

// ===== 工具函數 (Utilities) =====
export {
  info,
  warn,
  error,
  success,
  progress,
} from './utils/logger';

// ===== 簡化的 API 介面 =====

/**
 * 建置配置選項
 */
export interface BuildOptions {
  configPath?: string;
  outputDir?: string;
  cacheDir?: string;
  skipCache?: boolean;
  maxNodes?: number;
}

/**
 * 建置結果
 */
export interface BuildResult {
  success: boolean;
  totalNodes: number;
  topNodes: number;
  resourceNodes: number;
  outputPath: string;
  duration: number;
  errors?: string[];
}

/**
 * 快速建置函數
 * 提供簡單的 API 來執行完整的建置流程
 *
 * @param options 建置選項
 * @returns 建置結果
 *
 * @example
 * ```typescript
 * import { quickBuild } from 'n8n-skills';
 *
 * async function main() {
 *   const result = await quickBuild({
 *     outputDir: './output',
 *     maxNodes: 50
 *   });
 *
 *   if (result.success) {
 *     console.log(`建置成功！輸出到: ${result.outputPath}`);
 *   }
 * }
 * ```
 */
export async function quickBuild(_options: BuildOptions = {}): Promise<BuildResult> {
  const startTime = Date.now();
  const errors: string[] = [];

  try {
    // 注意：這個函數需要從專案根目錄執行 scripts/build.js
    // 建議直接使用 npm run build:full 命令
    throw new Error('quickBuild 函數需要使用 CLI 執行。請使用 npm run build:full 或 npm start 命令。');
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));

    return {
      success: false,
      totalNodes: 0,
      topNodes: 0,
      resourceNodes: 0,
      outputPath: '',
      duration: Date.now() - startTime,
      errors,
    };
  }
}

/**
 * 收集所有節點資訊
 * 提供簡化的 API 來收集節點
 *
 * @returns 節點資訊陣列
 *
 * @example
 * ```typescript
 * import { collectAllNodes } from 'n8n-skills';
 *
 * const nodes = await collectAllNodes();
 * console.log(`收集到 ${nodes.length} 個節點`);
 * ```
 */
export async function collectAllNodes(): Promise<SimplifiedNodeInfo[]> {
  const collector = new NpmCollector();
  return await collector.collectAll();
}

/**
 * 收集節點使用統計
 * 從 n8n.io API 收集範本和使用統計
 *
 * @param limit 最大範本數量
 * @returns 使用統計
 *
 * @example
 * ```typescript
 * import { collectNodeUsage } from 'n8n-skills';
 *
 * const stats = await collectNodeUsage(100);
 * console.log(`HTTP Request 使用次數: ${stats['nodes-base.HttpRequest']?.count}`);
 * ```
 */
export async function collectNodeUsage(limit: number = 100): Promise<NodeUsageStats> {
  const collector = new ApiCollector({ limit });
  const result = await collector.fetchTemplates();
  return result.nodeUsageStats;
}


/**
 * 生成 Skill 文件
 * 提供簡化的 API 來生成 Skill Markdown 文件
 *
 * @param nodes 節點資訊陣列
 * @param options Skill 配置選項
 * @returns 生成的 Markdown 內容
 *
 * @example
 * ```typescript
 * import { generateSkill } from 'n8n-skills';
 *
 * const nodes = await collectAllNodes();
 * const content = await generateSkill(nodes, {
 *   name: 'My n8n Skill',
 *   version: '1.0.0'
 * });
 * ```
 */
export async function generateSkill(
  nodes: EnrichedNodeInfo[],
  options: Partial<SkillConfig> = {}
): Promise<string> {
  const config: SkillConfig = {
    name: options.name || 'n8n Workflow Automation',
    version: options.version || '1.0.0',
    description: options.description || 'n8n 工作流程自動化知識庫',
    topNodesCount: options.topNodesCount || 50,
  };

  const generator = new SkillGenerator(config);

  return generator.generate({
    nodes,
    nodeUsageStats: {},
    resourceFiles: [],
    config,
  });
}

// ===== 版本資訊 =====
export const VERSION = '1.0.0';
export const NAME = 'n8n-skills';
