/**
 * Copyright (c) 2025 Frank Chen @ www.frankchen.tw/personal
 * SPDX-License-Identifier: MIT
 *
 * This file is part of n8n-skills project.
 */

import fs from 'fs';

/**
 * 類別定義介面
 */
export interface CategoryDefinition {
  name: string;
  description: string;
  icon: string;
  priority: number;
  nodes?: string[];
  subcategories?: Record<string, string[]>;
}

/**
 * 類別配置介面
 */
export interface CategoryConfig {
  categories: Record<string, CategoryDefinition>;
}

/**
 * 分類的節點介面
 */
export interface CategorizedNode {
  nodeType: string;
  displayName: string;
  category: string;
  subcategory?: string;
  priority: number;
  isTopNode: boolean;
}

/**
 * 組織結果介面
 */
export interface OrganizationResult {
  topNodes: CategorizedNode[];
  remainingNodes: CategorizedNode[];
  uncategorizedNodes: string[];
}

/**
 * 節點資訊介面
 */
export interface NodeInfo {
  nodeType: string;
  displayName: string;
  description: string;
  category?: string;
  isTrigger?: boolean;
  isWebhook?: boolean;
  isAITool?: boolean;
}

/**
 * 類別組織器
 *
 * 根據 config/categories.json 的定義，將節點分類為：
 * - 主要節點（Top 50）：進入主 Skill.md
 * - 次要節點：進入 resources/ 目錄
 * - 未分類節點：需要手動處理
 */
export class CategoryOrganizer {
  private categoryConfig!: CategoryConfig;
  private categoryPriorityMap: Map<string, number> = new Map();
  private nodeToCategory: Map<string, { category: string; subcategory?: string }> = new Map();

  constructor(configPath: string) {
    this.loadCategoryConfig(configPath);
    this.buildCategoryMaps();
  }

  /**
   * 載入類別配置檔案
   */
  private loadCategoryConfig(configPath: string): void {
    try {
      const configContent = fs.readFileSync(configPath, 'utf-8');
      this.categoryConfig = JSON.parse(configContent);
    } catch (error) {
      throw new Error(`無法載入類別配置檔案 ${configPath}: ${(error as Error).message}`);
    }
  }

  /**
   * 建立類別對應映射
   * 用於快速查詢節點所屬的類別和優先順序
   */
  private buildCategoryMaps(): void {
    for (const [categoryKey, categoryDef] of Object.entries(this.categoryConfig.categories)) {
      this.categoryPriorityMap.set(categoryKey, categoryDef.priority);

      // 處理直接定義的節點
      if (categoryDef.nodes) {
        for (const nodeType of categoryDef.nodes) {
          this.nodeToCategory.set(nodeType, { category: categoryKey });
        }
      }

      // 處理子分類
      if (categoryDef.subcategories) {
        for (const [subcategoryKey, nodes] of Object.entries(categoryDef.subcategories)) {
          for (const nodeType of nodes) {
            this.nodeToCategory.set(nodeType, {
              category: categoryKey,
              subcategory: subcategoryKey
            });
          }
        }
      }
    }
  }

  /**
   * 組織所有節點
   *
   * @param nodes 所有節點資訊
   * @param topNodesLimit 主要節點數量上限（預設 50）
   * @returns 組織結果
   */
  organize(nodes: NodeInfo[], topNodesLimit: number = 50): OrganizationResult {
    const categorizedNodes: CategorizedNode[] = [];
    const uncategorizedNodes: string[] = [];

    // 將每個節點分配到對應的類別
    for (const node of nodes) {
      const nodeTypeKey = this.extractNodeTypeKey(node.nodeType);
      const categoryInfo = this.nodeToCategory.get(nodeTypeKey);

      if (categoryInfo) {
        const priority = this.categoryPriorityMap.get(categoryInfo.category) || 999;
        categorizedNodes.push({
          nodeType: node.nodeType,
          displayName: node.displayName,
          category: categoryInfo.category,
          subcategory: categoryInfo.subcategory,
          priority,
          isTopNode: false // 稍後決定
        });
      } else {
        uncategorizedNodes.push(node.nodeType);
      }
    }

    // 根據優先順序排序
    categorizedNodes.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return a.displayName.localeCompare(b.displayName);
    });

    // 決定哪些是主要節點（Top N）
    const topNodes = categorizedNodes.slice(0, topNodesLimit).map(node => ({
      ...node,
      isTopNode: true
    }));

    const remainingNodes = categorizedNodes.slice(topNodesLimit).map(node => ({
      ...node,
      isTopNode: false
    }));

    return {
      topNodes,
      remainingNodes,
      uncategorizedNodes
    };
  }

  /**
   * 提取節點類型的關鍵字
   * 例如：nodes-base.Slack -> Slack
   *       n8n-nodes-langchain.OpenAI -> OpenAI
   */
  private extractNodeTypeKey(nodeType: string): string {
    const parts = nodeType.split('.');
    if (parts.length > 1) {
      return parts[parts.length - 1];
    }
    return nodeType;
  }

  /**
   * 根據類別分組節點
   *
   * @param nodes 已分類的節點
   * @returns 按類別分組的節點映射
   */
  groupByCategory(nodes: CategorizedNode[]): Map<string, CategorizedNode[]> {
    const grouped = new Map<string, CategorizedNode[]>();

    for (const node of nodes) {
      const key = node.subcategory
        ? `${node.category}.${node.subcategory}`
        : node.category;

      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(node);
    }

    return grouped;
  }

  /**
   * 取得類別資訊
   */
  getCategoryInfo(categoryKey: string): CategoryDefinition | undefined {
    return this.categoryConfig.categories[categoryKey];
  }

  /**
   * 取得所有類別按優先順序排序
   */
  getCategoriesByPriority(): Array<{ key: string; definition: CategoryDefinition }> {
    return Object.entries(this.categoryConfig.categories)
      .map(([key, definition]) => ({ key, definition }))
      .sort((a, b) => a.definition.priority - b.definition.priority);
  }

  /**
   * 產生統計資訊
   */
  generateStatistics(result: OrganizationResult): {
    totalNodes: number;
    topNodesCount: number;
    remainingNodesCount: number;
    uncategorizedCount: number;
    categoryCounts: Record<string, number>;
  } {
    const categoryCounts: Record<string, number> = {};

    for (const node of [...result.topNodes, ...result.remainingNodes]) {
      const key = node.subcategory
        ? `${node.category}.${node.subcategory}`
        : node.category;
      categoryCounts[key] = (categoryCounts[key] || 0) + 1;
    }

    return {
      totalNodes: result.topNodes.length + result.remainingNodes.length + result.uncategorizedNodes.length,
      topNodesCount: result.topNodes.length,
      remainingNodesCount: result.remainingNodes.length,
      uncategorizedCount: result.uncategorizedNodes.length,
      categoryCounts
    };
  }
}
