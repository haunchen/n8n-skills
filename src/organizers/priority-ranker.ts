/**
 * Copyright (c) 2025 Frank Chen @ www.frankchen.tw/personal
 * SPDX-License-Identifier: MIT
 *
 * This file is part of n8n-skills project.
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Priority tier definition
 */
export type PriorityTier = 'essential' | 'common' | 'specialized';

/**
 * Node scoring factors
 */
interface ScoringFactors {
  usageFrequency: number;
  documentationQuality: number;
  communityPopularity: number;
  versatility: number;
}

/**
 * Scoring weights configuration
 */
interface ScoringWeights {
  usage_frequency: number;
  documentation_quality: number;
  community_popularity: number;
  versatility: number;
}

/**
 * Priority configuration
 */
interface PriorityConfig {
  priority_tiers: {
    essential: TierConfig;
    common: TierConfig;
    specialized: TierConfig;
  };
  ranking_criteria: {
    [key: string]: {
      weight: number;
      description: string;
    };
  };
  boosted_nodes: {
    description: string;
    nodes: string[];
  };
}

/**
 * Tier configuration
 */
interface TierConfig {
  tier: number;
  description: string;
  max_nodes: number;
  nodes?: string[];
  include_all_others?: boolean;
}

/**
 * Node data to be scored
 */
export interface NodeData {
  nodeType: string;
  displayName: string;
  description?: string;
  category?: string;
  nodeCategory?: string;
  usageCount?: number;
  hasDocumentation?: boolean;
  propertyCount?: number;
  packageName?: string;
}

/**
 * Scored node
 */
export interface ScoredNode extends NodeData {
  score: number;
  scoringFactors: ScoringFactors;
  tier: PriorityTier;
  rank: number;
}

/**
 * Node priority ranker
 *
 * Calculates importance scores for nodes based on multiple factors and ranks them:
 * 1. Usage frequency (from template statistics)
 * 2. Documentation completeness
 * 3. Whether in essential list
 * 4. Community popularity
 * 5. Node versatility
 */
export class PriorityRanker {
  private config: PriorityConfig;
  private weights: ScoringWeights;

  constructor(configPath?: string) {
    const defaultConfigPath = path.join(
      __dirname,
      '../../config/priorities.json'
    );
    const finalConfigPath = configPath || defaultConfigPath;

    this.config = this.loadConfig(finalConfigPath);
    this.weights = this.extractWeights();
  }

  /**
   * Load priority configuration file
   */
  private loadConfig(configPath: string): PriorityConfig {
    try {
      const content = fs.readFileSync(configPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      throw new Error(
        `Failed to load priority configuration file: ${configPath}. Error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Extract scoring weights
   */
  private extractWeights(): ScoringWeights {
    const criteria = this.config.ranking_criteria;
    return {
      usage_frequency: criteria.usage_frequency?.weight || 0.4,
      documentation_quality: criteria.documentation_quality?.weight || 0.2,
      community_popularity: criteria.community_popularity?.weight || 0.2,
      versatility: criteria.versatility?.weight || 0.2
    };
  }

  /**
   * Calculate importance score for a node
   *
   * @param node Node data
   * @param maxUsageCount Maximum usage count among all nodes (for normalization)
   * @returns Scoring factors and total score
   */
  private calculateScore(
    node: NodeData,
    maxUsageCount: number
  ): { score: number; factors: ScoringFactors } {
    // 1. Usage frequency score (0-1)
    const usageFrequency = maxUsageCount > 0
      ? (node.usageCount || 0) / maxUsageCount
      : 0;

    // 2. Documentation quality score (0-1)
    const documentationQuality = this.calculateDocumentationQuality(node);

    // 3. Community popularity (0-1)
    const communityPopularity = this.calculateCommunityPopularity(node);

    // 4. Versatility score (0-1)
    const versatility = this.calculateVersatility(node);

    // Weighted total score
    const score =
      usageFrequency * this.weights.usage_frequency +
      documentationQuality * this.weights.documentation_quality +
      communityPopularity * this.weights.community_popularity +
      versatility * this.weights.versatility;

    return {
      score,
      factors: {
        usageFrequency,
        documentationQuality,
        communityPopularity,
        versatility
      }
    };
  }

  /**
   * Calculate documentation quality score
   */
  private calculateDocumentationQuality(node: NodeData): number {
    let score = 0;

    // Has description +0.3
    if (node.description && node.description.length > 0) {
      score += 0.3;
    }

    // Has complete documentation +0.5
    if (node.hasDocumentation) {
      score += 0.5;
    }

    // Has property definitions +0.2
    if (node.propertyCount && node.propertyCount > 0) {
      score += 0.2;
    }

    return Math.min(score, 1.0);
  }

  /**
   * Calculate community popularity
   * Based on whether node is in essential or boosted lists
   */
  private calculateCommunityPopularity(node: NodeData): number {
    const nodeTypeName = this.normalizeNodeName(node.nodeType);

    // Check if in essential list
    const isEssential = this.config.priority_tiers.essential.nodes?.some(
      name => this.normalizeNodeName(name) === nodeTypeName
    );

    if (isEssential) {
      return 1.0;
    }

    // Check if in common list
    const isCommon = this.config.priority_tiers.common.nodes?.some(
      name => this.normalizeNodeName(name) === nodeTypeName
    );

    if (isCommon) {
      return 0.7;
    }

    // Check if in boosted list
    const isBoosted = this.config.boosted_nodes.nodes.some(
      name => this.normalizeNodeName(name) === nodeTypeName
    );

    if (isBoosted) {
      return 0.8;
    }

    // Give base score based on category
    return this.getCategoryBaseScore(node.category || '');
  }

  /**
   * Calculate node versatility
   * Evaluated based on node type and property count
   */
  private calculateVersatility(node: NodeData): number {
    let score = 0;

    // Core function nodes (HTTP, Code, Webhook, etc.) have high versatility
    const coreNodes = ['httpRequest', 'code', 'webhook', 'function', 'set', 'if'];
    const nodeTypeName = this.normalizeNodeName(node.nodeType);

    if (coreNodes.some(name => this.normalizeNodeName(name) === nodeTypeName)) {
      score += 0.5;
    }

    // Evaluate configuration flexibility based on property count
    const propertyCount = node.propertyCount || 0;
    if (propertyCount > 10) {
      score += 0.3;
    } else if (propertyCount > 5) {
      score += 0.2;
    } else if (propertyCount > 0) {
      score += 0.1;
    }

    // Trigger nodes and webhooks are workflow entry points, higher importance
    if (node.nodeCategory === 'trigger' || node.nodeCategory === 'webhook') {
      score += 0.2;
    }

    return Math.min(score, 1.0);
  }

  /**
   * Give base score based on category
   */
  private getCategoryBaseScore(category: string): number {
    const categoryScores: { [key: string]: number } = {
      'Core Nodes': 0.6,
      'Communication': 0.5,
      'Data & Storage': 0.5,
      'Development': 0.4,
      'AI': 0.4,
      'Marketing': 0.3,
      'Analytics': 0.3
    };

    return categoryScores[category] || 0.2;
  }

  /**
   * Normalize node name for comparison
   * Remove package prefix, unify case
   */
  private normalizeNodeName(nodeName: string): string {
    return nodeName
      .toLowerCase()
      .replace(/^(nodes-base\.|langchain\.)/, '')
      .replace(/^n8n-/, '');
  }

  /**
   * Rank nodes and assign tiers
   *
   * @param nodes Array of nodes to be ranked
   * @returns Sorted array of nodes (with scores and tiers)
   */
  public rankNodes(nodes: NodeData[]): ScoredNode[] {
    // Calculate maximum usage count for normalization
    const maxUsageCount = Math.max(
      ...nodes.map(node => node.usageCount || 0),
      1
    );

    // Calculate score for each node
    const scoredNodes: ScoredNode[] = nodes.map(node => {
      const { score, factors } = this.calculateScore(node, maxUsageCount);

      return {
        ...node,
        score,
        scoringFactors: factors,
        tier: 'specialized' as PriorityTier,
        rank: 0
      };
    });

    // Sort by score in descending order
    scoredNodes.sort((a, b) => b.score - a.score);

    // Assign ranks
    scoredNodes.forEach((node, index) => {
      node.rank = index + 1;
    });

    // Assign tiers
    this.assignTiers(scoredNodes);

    return scoredNodes;
  }

  /**
   * Assign tiers based on ranking and configuration
   */
  private assignTiers(scoredNodes: ScoredNode[]): void {
    const essentialMax = this.config.priority_tiers.essential.max_nodes;
    const commonMax = this.config.priority_tiers.common.max_nodes;

    scoredNodes.forEach((node, index) => {
      if (index < essentialMax) {
        node.tier = 'essential';
      } else if (index < essentialMax + commonMax) {
        node.tier = 'common';
      } else {
        node.tier = 'specialized';
      }
    });
  }

  /**
   * Group nodes by tier
   *
   * @param scoredNodes Array of scored nodes
   * @returns Nodes grouped by tier
   */
  public groupByTier(scoredNodes: ScoredNode[]): {
    essential: ScoredNode[];
    common: ScoredNode[];
    specialized: ScoredNode[];
  } {
    return {
      essential: scoredNodes.filter(node => node.tier === 'essential'),
      common: scoredNodes.filter(node => node.tier === 'common'),
      specialized: scoredNodes.filter(node => node.tier === 'specialized')
    };
  }

  /**
   * Get nodes by specified tier
   *
   * @param scoredNodes Array of scored nodes
   * @param tier Tier to filter
   * @returns Array of nodes in that tier
   */
  public getNodesByTier(
    scoredNodes: ScoredNode[],
    tier: PriorityTier
  ): ScoredNode[] {
    return scoredNodes.filter(node => node.tier === tier);
  }

  /**
   * Generate ranking report
   *
   * @param scoredNodes Array of scored nodes
   * @returns Ranking statistics
   */
  public generateReport(scoredNodes: ScoredNode[]): {
    totalNodes: number;
    tierCounts: { [key in PriorityTier]: number };
    averageScores: { [key in PriorityTier]: number };
    topNodes: ScoredNode[];
  } {
    const grouped = this.groupByTier(scoredNodes);

    const calculateAverage = (nodes: ScoredNode[]): number => {
      if (nodes.length === 0) return 0;
      const sum = nodes.reduce((acc, node) => acc + node.score, 0);
      return sum / nodes.length;
    };

    return {
      totalNodes: scoredNodes.length,
      tierCounts: {
        essential: grouped.essential.length,
        common: grouped.common.length,
        specialized: grouped.specialized.length
      },
      averageScores: {
        essential: calculateAverage(grouped.essential),
        common: calculateAverage(grouped.common),
        specialized: calculateAverage(grouped.specialized)
      },
      topNodes: scoredNodes.slice(0, 10)
    };
  }
}
