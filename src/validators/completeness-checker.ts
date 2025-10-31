/**
 * Copyright (c) 2025 Frank Chen @ www.frankchen.tw/personal
 * SPDX-License-Identifier: MIT
 *
 * This file is part of n8n-skills project.
 */

/**
 * Completeness Checker
 * 檢查資料完整性和一致性
 */

import * as logger from '../utils/logger';
import { existsSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

/**
 * 完整性檢查結果
 */
export interface CompletenessResult {
  success: boolean;
  errors: CompletenessError[];
  warnings: CompletenessWarning[];
  stats: CompletenessStats;
}

/**
 * 完整性錯誤
 */
export interface CompletenessError {
  type: string;
  message: string;
  context?: string;
}

/**
 * 完整性警告
 */
export interface CompletenessWarning {
  type: string;
  message: string;
  context?: string;
}

/**
 * 完整性統計
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
 * 節點資訊介面
 */
export interface NodeInfo {
  nodeType: string;
  displayName: string;
  category: string;
  usageRank?: number;
  hasDetailedDocs?: boolean;
}

/**
 * 分類資訊介面
 */
export interface CategoryInfo {
  name: string;
  expectedNodeCount: number;
  actualNodeCount: number;
}

/**
 * 檢查選項
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
 * 檢查資料完整性
 */
export function check(
  nodes: NodeInfo[],
  options: CheckOptions
): CompletenessResult {
  logger.info('開始檢查資料完整性');

  const opts = { ...DEFAULT_OPTIONS, ...options };
  const errors: CompletenessError[] = [];
  const warnings: CompletenessWarning[] = [];

  // 檢查 top 50 節點詳細資料
  const top50Result = checkTop50Coverage(nodes, opts);
  errors.push(...top50Result.errors);
  warnings.push(...top50Result.warnings);

  // 檢查分類完整性
  const categoriesResult = checkCategoryCoverage(nodes, opts);
  errors.push(...categoriesResult.errors);
  warnings.push(...categoriesResult.warnings);

  // 檢查資源檔案
  const resourcesResult = checkResourceFiles(nodes, opts);
  errors.push(...resourcesResult.errors);
  warnings.push(...resourcesResult.warnings);

  // 檢查節點統計數字
  const statsResult = checkNodeStats(nodes, opts);
  errors.push(...statsResult.errors);
  warnings.push(...statsResult.warnings);

  // 收集統計資訊
  const stats = collectCompletenessStats(nodes, opts, resourcesResult);

  const success = errors.length === 0 && (!opts.strictMode || warnings.length === 0);

  if (success) {
    logger.success('資料完整性檢查通過');
  } else {
    logger.error(`發現 ${errors.length} 個錯誤，${warnings.length} 個警告`);
  }

  return {
    success,
    errors,
    warnings,
    stats,
  };
}

/**
 * 檢查 top 50 節點是否有詳細資料
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

  // 按使用率排序取得 top N 節點
  const topNodes = nodes
    .filter(n => n.usageRank !== undefined)
    .sort((a, b) => (a.usageRank || 0) - (b.usageRank || 0))
    .slice(0, options.topNodesCount);

  if (topNodes.length < options.topNodesCount) {
    warnings.push({
      type: 'TOP_NODES',
      message: `只有 ${topNodes.length} 個節點有使用率資料（預期 ${options.topNodesCount} 個）`,
    });
  }

  // 檢查每個 top 節點是否有詳細文件
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
      message: `${missingDocs.length} 個 top ${options.topNodesCount} 節點缺少詳細文件（覆蓋率：${coverage}%）`,
      context: `缺少文件的節點：${missingDocs.slice(0, 5).join(', ')}${missingDocs.length > 5 ? ` 等 ${missingDocs.length} 個` : ''}`,
    });
  }

  return { errors, warnings };
}

/**
 * 檢查分類覆蓋率
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

  // 統計每個分類的節點數量
  const categoryCounts = new Map<string, number>();
  const uncategorizedNodes: string[] = [];

  for (const node of nodes) {
    if (!node.category || node.category.toLowerCase() === 'misc' || node.category.toLowerCase() === 'other') {
      uncategorizedNodes.push(node.displayName);
    } else {
      categoryCounts.set(node.category, (categoryCounts.get(node.category) || 0) + 1);
    }
  }

  // 檢查未分類節點
  if (uncategorizedNodes.length > 0) {
    const percentage = (uncategorizedNodes.length / nodes.length * 100).toFixed(1);
    if (uncategorizedNodes.length > nodes.length * 0.1) {
      errors.push({
        type: 'CATEGORY',
        message: `${uncategorizedNodes.length} 個節點未正確分類（${percentage}%）`,
        context: `未分類節點：${uncategorizedNodes.slice(0, 5).join(', ')}${uncategorizedNodes.length > 5 ? ` 等 ${uncategorizedNodes.length} 個` : ''}`,
      });
    } else {
      warnings.push({
        type: 'CATEGORY',
        message: `${uncategorizedNodes.length} 個節點未正確分類（${percentage}%）`,
        context: `未分類節點：${uncategorizedNodes.join(', ')}`,
      });
    }
  }

  // 檢查預期分類是否存在
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
      message: `缺少預期的分類：${missingCategories.join(', ')}`,
    });
  }

  // 檢查分類是否過於集中
  const totalCategorized = nodes.length - uncategorizedNodes.length;
  for (const [category, count] of categoryCounts.entries()) {
    const percentage = (count / totalCategorized * 100);
    if (percentage > 40) {
      warnings.push({
        type: 'CATEGORY',
        message: `分類 "${category}" 包含過多節點（${count} 個，${percentage.toFixed(1)}%）`,
        context: '建議細分為更具體的子分類',
      });
    }
  }

  return { errors, warnings };
}

/**
 * 檢查資源檔案完整性
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
      message: `資源目錄不存在：${options.resourcesPath}`,
    });
    return { errors, warnings, missingFiles, orphanedFiles };
  }

  // 收集所有資源檔案
  const resourceFiles = new Set<string>();
  try {
    const files = readdirSync(options.resourcesPath);
    for (const file of files) {
      const filePath = join(options.resourcesPath, file);
      const stats = statSync(filePath);

      if (stats.isFile() && extname(file).toLowerCase() === '.md') {
        // 移除 .md 副檔名
        resourceFiles.add(file.slice(0, -3));
      }
    }
  } catch (err) {
    errors.push({
      type: 'RESOURCES',
      message: `無法讀取資源目錄：${err instanceof Error ? err.message : String(err)}`,
    });
    return { errors, warnings, missingFiles, orphanedFiles };
  }

  // 檢查每個節點是否有對應的資源檔案
  const nodeTypes = new Set(nodes.map(n => n.nodeType));

  for (const node of nodes) {
    if (!resourceFiles.has(node.nodeType)) {
      missingFiles.push(node.nodeType);
    }
  }

  // 檢查是否有孤立的資源檔案（沒有對應節點）
  for (const file of resourceFiles) {
    if (!nodeTypes.has(file)) {
      orphanedFiles.push(file);
    }
  }

  // 報告缺少的資源檔案
  if (missingFiles.length > 0) {
    const percentage = (missingFiles.length / nodes.length * 100).toFixed(1);
    errors.push({
      type: 'RESOURCES',
      message: `${missingFiles.length} 個節點缺少資源檔案（${percentage}%）`,
      context: `缺少檔案的節點：${missingFiles.slice(0, 5).join(', ')}${missingFiles.length > 5 ? ` 等 ${missingFiles.length} 個` : ''}`,
    });
  }

  // 報告孤立的資源檔案
  if (orphanedFiles.length > 0) {
    warnings.push({
      type: 'RESOURCES',
      message: `${orphanedFiles.length} 個資源檔案沒有對應的節點`,
      context: `孤立檔案：${orphanedFiles.slice(0, 5).join(', ')}${orphanedFiles.length > 5 ? ` 等 ${orphanedFiles.length} 個` : ''}`,
    });
  }

  return { errors, warnings, missingFiles, orphanedFiles };
}

/**
 * 檢查節點統計數字的合理性
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

  // 檢查節點總數
  if (nodes.length === 0) {
    errors.push({
      type: 'STATS',
      message: '沒有任何節點資料',
    });
    return { errors, warnings };
  }

  if (nodes.length < 50) {
    warnings.push({
      type: 'STATS',
      message: `節點數量較少：${nodes.length} 個（預期至少 50 個）`,
    });
  }

  // 檢查使用率資料
  const nodesWithRank = nodes.filter(n => n.usageRank !== undefined);
  if (nodesWithRank.length === 0) {
    errors.push({
      type: 'STATS',
      message: '沒有任何節點有使用率資料',
    });
  } else if (nodesWithRank.length < nodes.length * 0.8) {
    const percentage = (nodesWithRank.length / nodes.length * 100).toFixed(1);
    warnings.push({
      type: 'STATS',
      message: `只有 ${percentage}% 的節點有使用率資料`,
    });
  }

  // 檢查使用率排名是否連續
  const ranks = nodesWithRank
    .map(n => n.usageRank!)
    .sort((a, b) => a - b);

  for (let i = 1; i < Math.min(ranks.length, options.topNodesCount); i++) {
    if (ranks[i] !== ranks[i - 1] + 1) {
      warnings.push({
        type: 'STATS',
        message: `使用率排名不連續：第 ${ranks[i - 1]} 名之後是第 ${ranks[i]} 名`,
      });
      break;
    }
  }

  return { errors, warnings };
}

/**
 * 收集完整性統計資訊
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
 * 格式化完整性檢查結果
 */
export function formatCompletenessResult(result: CompletenessResult): string {
  const output: string[] = [];

  output.push('=== 資料完整性檢查結果 ===\n');

  output.push('統計資訊：');
  output.push(`  總節點數：${result.stats.totalNodes}`);
  output.push(`  Top 50 覆蓋率：${result.stats.top50Coverage.toFixed(1)}%`);
  output.push(`  分類數量：${result.stats.categoriesCount}`);
  output.push(`  資源檔案數：${result.stats.resourceFilesCount}`);
  output.push(`  缺少檔案數：${result.stats.missingResourceFiles.length}`);
  output.push(`  孤立檔案數：${result.stats.orphanedResourceFiles.length}`);
  output.push('');

  if (result.stats.categoryCoverage.size > 0) {
    output.push('分類分布：');
    const sortedCategories = Array.from(result.stats.categoryCoverage.entries())
      .sort((a, b) => b[1] - a[1]);

    for (const [category, percentage] of sortedCategories.slice(0, 10)) {
      output.push(`  ${category}: ${percentage.toFixed(1)}%`);
    }
    output.push('');
  }

  if (result.errors.length > 0) {
    output.push(`錯誤（${result.errors.length}）：`);
    result.errors.forEach((error, index) => {
      output.push(`  ${index + 1}. [${error.type}] ${error.message}`);
      if (error.context) {
        output.push(`     ${error.context}`);
      }
    });
    output.push('');
  }

  if (result.warnings.length > 0) {
    output.push(`警告（${result.warnings.length}）：`);
    result.warnings.forEach((warning, index) => {
      output.push(`  ${index + 1}. [${warning.type}] ${warning.message}`);
      if (warning.context) {
        output.push(`     ${warning.context}`);
      }
    });
    output.push('');
  }

  output.push(result.success ? '完整性檢查通過' : '完整性檢查失敗');

  return output.join('\n');
}
