/**
 * Copyright (c) 2025 Frank Chen @ www.frankchen.tw/personal
 * SPDX-License-Identifier: MIT
 *
 * This file is part of n8n-skills project.
 */

/**
 * Completeness Checker
 * Checks data completeness and consistency
 */

import * as logger from '../utils/logger';
import { existsSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

/**
 * Completeness check result
 */
export interface CompletenessResult {
  success: boolean;
  errors: CompletenessError[];
  warnings: CompletenessWarning[];
  stats: CompletenessStats;
}

/**
 * Completeness error
 */
export interface CompletenessError {
  type: string;
  message: string;
  context?: string;
}

/**
 * Completeness warning
 */
export interface CompletenessWarning {
  type: string;
  message: string;
  context?: string;
}

/**
 * Completeness statistics
 */
export interface CompletenessStats {
  totalNodes: number;
  top50Coverage: number;
  categoriesCount: number;
  resourceFilesCount: number;
  missingResourceFiles: string[];
  orphanedResourceFiles: string[];
  categoryCoverage: Map<string, number>;
}

/**
 * Node information interface
 */
export interface NodeInfo {
  nodeType: string;
  displayName: string;
  category: string;
  usageRank?: number;
  hasDetailedDocs?: boolean;
}

/**
 * Category information interface
 */
export interface CategoryInfo {
  name: string;
  expectedNodeCount: number;
  actualNodeCount: number;
}

/**
 * Check options
 */
export interface CheckOptions {
  resourcesPath: string;
  topNodesCount?: number;
  expectedCategories?: string[];
  strictMode?: boolean;
}

const DEFAULT_OPTIONS: Required<Omit<CheckOptions, 'resourcesPath'>> & Pick<CheckOptions, 'resourcesPath'> = {
  resourcesPath: '',
  topNodesCount: 50,
  expectedCategories: [
    'Core',
    'Trigger',
    'Action',
    'Communication',
    'Productivity',
    'Sales',
    'Marketing',
    'Development',
    'Analytics',
    'Finance',
    'AI',
  ],
  strictMode: false,
};

/**
 * Check data completeness
 */
export function check(
  nodes: NodeInfo[],
  options: CheckOptions
): CompletenessResult {
  logger.info('Starting data completeness check');

  const opts = { ...DEFAULT_OPTIONS, ...options };
  const errors: CompletenessError[] = [];
  const warnings: CompletenessWarning[] = [];

  // Check top 50 node detailed data
  const top50Result = checkTop50Coverage(nodes, opts);
  errors.push(...top50Result.errors);
  warnings.push(...top50Result.warnings);

  // Check category completeness
  const categoriesResult = checkCategoryCoverage(nodes, opts);
  errors.push(...categoriesResult.errors);
  warnings.push(...categoriesResult.warnings);

  // Check resource files
  const resourcesResult = checkResourceFiles(nodes, opts);
  errors.push(...resourcesResult.errors);
  warnings.push(...resourcesResult.warnings);

  // Check node statistics
  const statsResult = checkNodeStats(nodes, opts);
  errors.push(...statsResult.errors);
  warnings.push(...statsResult.warnings);

  // Collect statistics
  const stats = collectCompletenessStats(nodes, opts, resourcesResult);

  const success = errors.length === 0 && (!opts.strictMode || warnings.length === 0);

  if (success) {
    logger.success('Data completeness check passed');
  } else {
    logger.error(`Found ${errors.length} error(s) and ${warnings.length} warning(s)`);
  }

  return {
    success,
    errors,
    warnings,
    stats,
  };
}

/**
 * Check if top 50 nodes have detailed data
 */
function checkTop50Coverage(
  nodes: NodeInfo[],
  options: Required<CheckOptions>
): {
  errors: CompletenessError[];
  warnings: CompletenessWarning[];
} {
  const errors: CompletenessError[] = [];
  const warnings: CompletenessWarning[] = [];

  // Sort by usage rate and get top N nodes
  const topNodes = nodes
    .filter(n => n.usageRank !== undefined)
    .sort((a, b) => (a.usageRank || 0) - (b.usageRank || 0))
    .slice(0, options.topNodesCount);

  if (topNodes.length < options.topNodesCount) {
    warnings.push({
      type: 'TOP_NODES',
      message: `Only ${topNodes.length} nodes have usage data (expected ${options.topNodesCount})`,
    });
  }

  // Check if each top node has detailed documentation
  const missingDocs: string[] = [];
  for (const node of topNodes) {
    if (!node.hasDetailedDocs) {
      missingDocs.push(node.displayName);
    }
  }

  if (missingDocs.length > 0) {
    const coverage = ((topNodes.length - missingDocs.length) / topNodes.length * 100).toFixed(1);
    errors.push({
      type: 'TOP_NODES',
      message: `${missingDocs.length} top ${options.topNodesCount} node(s) missing detailed documentation (coverage: ${coverage}%)`,
      context: `Nodes missing docs: ${missingDocs.slice(0, 5).join(', ')}${missingDocs.length > 5 ? ` and ${missingDocs.length} more` : ''}`,
    });
  }

  return { errors, warnings };
}

/**
 * Check category coverage
 */
function checkCategoryCoverage(
  nodes: NodeInfo[],
  options: Required<CheckOptions>
): {
  errors: CompletenessError[];
  warnings: CompletenessWarning[];
} {
  const errors: CompletenessError[] = [];
  const warnings: CompletenessWarning[] = [];

  // Count nodes in each category
  const categoryCounts = new Map<string, number>();
  const uncategorizedNodes: string[] = [];

  for (const node of nodes) {
    if (!node.category || node.category.toLowerCase() === 'misc' || node.category.toLowerCase() === 'other') {
      uncategorizedNodes.push(node.displayName);
    } else {
      categoryCounts.set(node.category, (categoryCounts.get(node.category) || 0) + 1);
    }
  }

  // Check uncategorized nodes
  if (uncategorizedNodes.length > 0) {
    const percentage = (uncategorizedNodes.length / nodes.length * 100).toFixed(1);
    if (uncategorizedNodes.length > nodes.length * 0.1) {
      errors.push({
        type: 'CATEGORY',
        message: `${uncategorizedNodes.length} node(s) not properly categorized (${percentage}%)`,
        context: `Uncategorized nodes: ${uncategorizedNodes.slice(0, 5).join(', ')}${uncategorizedNodes.length > 5 ? ` and ${uncategorizedNodes.length} more` : ''}`,
      });
    } else {
      warnings.push({
        type: 'CATEGORY',
        message: `${uncategorizedNodes.length} node(s) not properly categorized (${percentage}%)`,
        context: `Uncategorized nodes: ${uncategorizedNodes.join(', ')}`,
      });
    }
  }

  // Check if expected categories exist
  const missingCategories: string[] = [];
  for (const expectedCategory of options.expectedCategories || []) {
    if (!Array.from(categoryCounts.keys()).some(c =>
      c.toLowerCase() === expectedCategory.toLowerCase()
    )) {
      missingCategories.push(expectedCategory);
    }
  }

  if (missingCategories.length > 0) {
    warnings.push({
      type: 'CATEGORY',
      message: `Missing expected categories: ${missingCategories.join(', ')}`,
    });
  }

  // Check if categories are too concentrated
  const totalCategorized = nodes.length - uncategorizedNodes.length;
  for (const [category, count] of categoryCounts.entries()) {
    const percentage = (count / totalCategorized * 100);
    if (percentage > 40) {
      warnings.push({
        type: 'CATEGORY',
        message: `Category "${category}" contains too many nodes (${count} nodes, ${percentage.toFixed(1)}%)`,
        context: 'Recommend subdividing into more specific subcategories',
      });
    }
  }

  return { errors, warnings };
}

/**
 * Check resource file completeness
 */
function checkResourceFiles(
  nodes: NodeInfo[],
  options: Required<CheckOptions>
): {
  errors: CompletenessError[];
  warnings: CompletenessWarning[];
  missingFiles: string[];
  orphanedFiles: string[];
} {
  const errors: CompletenessError[] = [];
  const warnings: CompletenessWarning[] = [];
  const missingFiles: string[] = [];
  const orphanedFiles: string[] = [];

  if (!existsSync(options.resourcesPath)) {
    errors.push({
      type: 'RESOURCES',
      message: `Resource directory does not exist: ${options.resourcesPath}`,
    });
    return { errors, warnings, missingFiles, orphanedFiles };
  }

  // Collect all resource files
  const resourceFiles = new Set<string>();
  try {
    const files = readdirSync(options.resourcesPath);
    for (const file of files) {
      const filePath = join(options.resourcesPath, file);
      const stats = statSync(filePath);

      if (stats.isFile() && extname(file).toLowerCase() === '.md') {
        // Remove .md extension
        resourceFiles.add(file.slice(0, -3));
      }
    }
  } catch (err) {
    errors.push({
      type: 'RESOURCES',
      message: `Unable to read resource directory: ${err instanceof Error ? err.message : String(err)}`,
    });
    return { errors, warnings, missingFiles, orphanedFiles };
  }

  // Check if each node has a corresponding resource file
  const nodeTypes = new Set(nodes.map(n => n.nodeType));

  for (const node of nodes) {
    if (!resourceFiles.has(node.nodeType)) {
      missingFiles.push(node.nodeType);
    }
  }

  // Check for orphaned resource files (no corresponding node)
  for (const file of resourceFiles) {
    if (!nodeTypes.has(file)) {
      orphanedFiles.push(file);
    }
  }

  // Report missing resource files
  if (missingFiles.length > 0) {
    const percentage = (missingFiles.length / nodes.length * 100).toFixed(1);
    errors.push({
      type: 'RESOURCES',
      message: `${missingFiles.length} node(s) missing resource files (${percentage}%)`,
      context: `Nodes missing files: ${missingFiles.slice(0, 5).join(', ')}${missingFiles.length > 5 ? ` and ${missingFiles.length} more` : ''}`,
    });
  }

  // Report orphaned resource files
  if (orphanedFiles.length > 0) {
    warnings.push({
      type: 'RESOURCES',
      message: `${orphanedFiles.length} resource file(s) have no corresponding node`,
      context: `Orphaned files: ${orphanedFiles.slice(0, 5).join(', ')}${orphanedFiles.length > 5 ? ` and ${orphanedFiles.length} more` : ''}`,
    });
  }

  return { errors, warnings, missingFiles, orphanedFiles };
}

/**
 * Check reasonableness of node statistics
 */
function checkNodeStats(
  nodes: NodeInfo[],
  options: Required<CheckOptions>
): {
  errors: CompletenessError[];
  warnings: CompletenessWarning[];
} {
  const errors: CompletenessError[] = [];
  const warnings: CompletenessWarning[] = [];

  // Check total node count
  if (nodes.length === 0) {
    errors.push({
      type: 'STATS',
      message: 'No node data available',
    });
    return { errors, warnings };
  }

  if (nodes.length < 50) {
    warnings.push({
      type: 'STATS',
      message: `Low node count: ${nodes.length} nodes (expected at least 50)`,
    });
  }

  // Check usage rate data
  const nodesWithRank = nodes.filter(n => n.usageRank !== undefined);
  if (nodesWithRank.length === 0) {
    errors.push({
      type: 'STATS',
      message: 'No nodes have usage rate data',
    });
  } else if (nodesWithRank.length < nodes.length * 0.8) {
    const percentage = (nodesWithRank.length / nodes.length * 100).toFixed(1);
    warnings.push({
      type: 'STATS',
      message: `Only ${percentage}% of nodes have usage rate data`,
    });
  }

  // Check if usage rankings are consecutive
  const ranks = nodesWithRank
    .map(n => n.usageRank!)
    .sort((a, b) => a - b);

  for (let i = 1; i < Math.min(ranks.length, options.topNodesCount); i++) {
    if (ranks[i] !== ranks[i - 1] + 1) {
      warnings.push({
        type: 'STATS',
        message: `Usage rankings not consecutive: rank ${ranks[i - 1]} followed by rank ${ranks[i]}`,
      });
      break;
    }
  }

  return { errors, warnings };
}

/**
 * Collect completeness statistics
 */
function collectCompletenessStats(
  nodes: NodeInfo[],
  options: Required<CheckOptions>,
  resourcesResult: {
    missingFiles: string[];
    orphanedFiles: string[];
  }
): CompletenessStats {
  const topNodes = nodes
    .filter(n => n.usageRank !== undefined && n.usageRank <= options.topNodesCount);

  const topNodesWithDocs = topNodes.filter(n => n.hasDetailedDocs);
  const top50Coverage = topNodes.length > 0
    ? (topNodesWithDocs.length / topNodes.length * 100)
    : 0;

  const categoryCoverage = new Map<string, number>();
  const categoryCounts = new Map<string, number>();

  for (const node of nodes) {
    const category = node.category || 'Uncategorized';
    categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
  }

  for (const [category, count] of categoryCounts.entries()) {
    const percentage = (count / nodes.length * 100);
    categoryCoverage.set(category, percentage);
  }

  return {
    totalNodes: nodes.length,
    top50Coverage,
    categoriesCount: categoryCounts.size,
    resourceFilesCount: nodes.length - resourcesResult.missingFiles.length,
    missingResourceFiles: resourcesResult.missingFiles,
    orphanedResourceFiles: resourcesResult.orphanedFiles,
    categoryCoverage,
  };
}

/**
 * Format completeness check result
 */
export function formatCompletenessResult(result: CompletenessResult): string {
  const output: string[] = [];

  output.push('=== Data Completeness Check Result ===\n');

  output.push('Statistics:');
  output.push(`  Total nodes: ${result.stats.totalNodes}`);
  output.push(`  Top 50 coverage: ${result.stats.top50Coverage.toFixed(1)}%`);
  output.push(`  Categories: ${result.stats.categoriesCount}`);
  output.push(`  Resource files: ${result.stats.resourceFilesCount}`);
  output.push(`  Missing files: ${result.stats.missingResourceFiles.length}`);
  output.push(`  Orphaned files: ${result.stats.orphanedResourceFiles.length}`);
  output.push('');

  if (result.stats.categoryCoverage.size > 0) {
    output.push('Category Distribution:');
    const sortedCategories = Array.from(result.stats.categoryCoverage.entries())
      .sort((a, b) => b[1] - a[1]);

    for (const [category, percentage] of sortedCategories.slice(0, 10)) {
      output.push(`  ${category}: ${percentage.toFixed(1)}%`);
    }
    output.push('');
  }

  if (result.errors.length > 0) {
    output.push(`Errors (${result.errors.length}):`);
    result.errors.forEach((error, index) => {
      output.push(`  ${index + 1}. [${error.type}] ${error.message}`);
      if (error.context) {
        output.push(`     ${error.context}`);
      }
    });
    output.push('');
  }

  if (result.warnings.length > 0) {
    output.push(`Warnings (${result.warnings.length}):`);
    result.warnings.forEach((warning, index) => {
      output.push(`  ${index + 1}. [${warning.type}] ${warning.message}`);
      if (warning.context) {
        output.push(`     ${warning.context}`);
      }
    });
    output.push('');
  }

  output.push(result.success ? 'Completeness check passed' : 'Completeness check failed');

  return output.join('\n');
}
