/**
 * Copyright (c) 2025 Frank Chen @ www.frankchen.tw/personal
 * SPDX-License-Identifier: MIT
 *
 * This file is part of n8n-skills project.
 */

import fs from 'fs';

/**
 * Category definition interface
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
 * Category configuration interface
 */
export interface CategoryConfig {
  categories: Record<string, CategoryDefinition>;
}

/**
 * Categorized node interface
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
 * Organization result interface
 */
export interface OrganizationResult {
  topNodes: CategorizedNode[];
  remainingNodes: CategorizedNode[];
  uncategorizedNodes: string[];
}

/**
 * Node information interface
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
 * Category organizer
 *
 * Based on config/categories.json definitions, categorizes nodes into:
 * - Top nodes (Top 50): Goes into main SKILL.md
 * - Secondary nodes: Goes into resources/ directory
 * - Uncategorized nodes: Requires manual processing
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
   * Load category configuration file
   */
  private loadCategoryConfig(configPath: string): void {
    try {
      const configContent = fs.readFileSync(configPath, 'utf-8');
      this.categoryConfig = JSON.parse(configContent);
    } catch (error) {
      throw new Error(`Failed to load category configuration file ${configPath}: ${(error as Error).message}`);
    }
  }

  /**
   * Build category mapping
   * Used for quick lookup of node's category and priority
   */
  private buildCategoryMaps(): void {
    for (const [categoryKey, categoryDef] of Object.entries(this.categoryConfig.categories)) {
      this.categoryPriorityMap.set(categoryKey, categoryDef.priority);

      // Process directly defined nodes
      if (categoryDef.nodes) {
        for (const nodeType of categoryDef.nodes) {
          this.nodeToCategory.set(nodeType, { category: categoryKey });
        }
      }

      // Process subcategories
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
   * Organize all nodes
   *
   * @param nodes All node information
   * @param topNodesLimit Maximum number of top nodes (default 50)
   * @returns Organization result
   */
  organize(nodes: NodeInfo[], topNodesLimit: number = 50): OrganizationResult {
    const categorizedNodes: CategorizedNode[] = [];
    const uncategorizedNodes: string[] = [];

    // Assign each node to corresponding category
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
          isTopNode: false // Decided later
        });
      } else {
        uncategorizedNodes.push(node.nodeType);
      }
    }

    // Sort by priority
    categorizedNodes.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return a.displayName.localeCompare(b.displayName);
    });

    // Determine which are top nodes (Top N)
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
   * Extract node type key
   * Example: nodes-base.Slack -> Slack
   *          n8n-nodes-langchain.OpenAI -> OpenAI
   */
  private extractNodeTypeKey(nodeType: string): string {
    const parts = nodeType.split('.');
    if (parts.length > 1) {
      return parts[parts.length - 1];
    }
    return nodeType;
  }

  /**
   * Group nodes by category
   *
   * @param nodes Categorized nodes
   * @returns Map of nodes grouped by category
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
   * Get category information
   */
  getCategoryInfo(categoryKey: string): CategoryDefinition | undefined {
    return this.categoryConfig.categories[categoryKey];
  }

  /**
   * Get all categories sorted by priority
   */
  getCategoriesByPriority(): Array<{ key: string; definition: CategoryDefinition }> {
    return Object.entries(this.categoryConfig.categories)
      .map(([key, definition]) => ({ key, definition }))
      .sort((a, b) => a.definition.priority - b.definition.priority);
  }

  /**
   * Generate statistics
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
