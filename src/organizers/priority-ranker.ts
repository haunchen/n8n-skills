/**
 * Copyright (c) 2025 Frank Chen @ www.frankchen.tw/personal
 * SPDX-License-Identifier: MIT
 *
 * This file is part of n8n-skills project.
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * 優先級層級定義
 */
export type PriorityTier = 'essential' | 'common' | 'specialized';

/**
 * 節點評分因素
 */
interface ScoringFactors {
  usageFrequency: number;
  documentationQuality: number;
  communityPopularity: number;
  versatility: number;
}

/**
 * 評分權重設定
 */
interface ScoringWeights {
  usage_frequency: number;
  documentation_quality: number;
  community_popularity: number;
  versatility: number;
}

/**
 * 優先級設定
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
 * 層級設定
 */
interface TierConfig {
  tier: number;
  description: string;
  max_nodes: number;
  nodes?: string[];
  include_all_others?: boolean;
}

/**
 * 待評分的節點資料
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
 * 評分後的節點
 */
export interface ScoredNode extends NodeData {
  score: number;
  scoringFactors: ScoringFactors;
  tier: PriorityTier;
  rank: number;
}

/**
 * 節點優先級排序器
 *
 * 根據多種因素計算節點的重要性分數並進行排序：
 * 1. 使用頻率（從範本統計）
 * 2. 文件完整性
 * 3. 是否在必備清單中
 * 4. 社群受歡迎程度
 * 5. 節點通用性
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
   * 載入優先級設定檔
   */
  private loadConfig(configPath: string): PriorityConfig {
    try {
      const content = fs.readFileSync(configPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      throw new Error(
        `無法載入優先級設定檔: ${configPath}. 錯誤: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 提取評分權重
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
   * 計算節點的重要性分數
   *
   * @param node 節點資料
   * @param maxUsageCount 所有節點中的最大使用次數（用於正規化）
   * @returns 評分因素和總分
   */
  private calculateScore(
    node: NodeData,
    maxUsageCount: number
  ): { score: number; factors: ScoringFactors } {
    // 1. 使用頻率分數（0-1）
    const usageFrequency = maxUsageCount > 0
      ? (node.usageCount || 0) / maxUsageCount
      : 0;

    // 2. 文件完整性分數（0-1）
    const documentationQuality = this.calculateDocumentationQuality(node);

    // 3. 社群受歡迎程度（0-1）
    const communityPopularity = this.calculateCommunityPopularity(node);

    // 4. 通用性分數（0-1）
    const versatility = this.calculateVersatility(node);

    // 加權總分
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
   * 計算文件完整性分數
   */
  private calculateDocumentationQuality(node: NodeData): number {
    let score = 0;

    // 有描述 +0.3
    if (node.description && node.description.length > 0) {
      score += 0.3;
    }

    // 有完整文件 +0.5
    if (node.hasDocumentation) {
      score += 0.5;
    }

    // 有屬性定義 +0.2
    if (node.propertyCount && node.propertyCount > 0) {
      score += 0.2;
    }

    return Math.min(score, 1.0);
  }

  /**
   * 計算社群受歡迎程度
   * 基於節點是否在必備清單或加速清單中
   */
  private calculateCommunityPopularity(node: NodeData): number {
    const nodeTypeName = this.normalizeNodeName(node.nodeType);

    // 檢查是否在必備清單中
    const isEssential = this.config.priority_tiers.essential.nodes?.some(
      name => this.normalizeNodeName(name) === nodeTypeName
    );

    if (isEssential) {
      return 1.0;
    }

    // 檢查是否在常用清單中
    const isCommon = this.config.priority_tiers.common.nodes?.some(
      name => this.normalizeNodeName(name) === nodeTypeName
    );

    if (isCommon) {
      return 0.7;
    }

    // 檢查是否在加速清單中
    const isBoosted = this.config.boosted_nodes.nodes.some(
      name => this.normalizeNodeName(name) === nodeTypeName
    );

    if (isBoosted) {
      return 0.8;
    }

    // 基於分類給予基礎分數
    return this.getCategoryBaseScore(node.category || '');
  }

  /**
   * 計算節點通用性
   * 根據節點類型和屬性數量評估
   */
  private calculateVersatility(node: NodeData): number {
    let score = 0;

    // 核心功能節點（HTTP、Code、Webhook等）通用性高
    const coreNodes = ['httpRequest', 'code', 'webhook', 'function', 'set', 'if'];
    const nodeTypeName = this.normalizeNodeName(node.nodeType);

    if (coreNodes.some(name => this.normalizeNodeName(name) === nodeTypeName)) {
      score += 0.5;
    }

    // 根據屬性數量評估配置靈活性
    const propertyCount = node.propertyCount || 0;
    if (propertyCount > 10) {
      score += 0.3;
    } else if (propertyCount > 5) {
      score += 0.2;
    } else if (propertyCount > 0) {
      score += 0.1;
    }

    // 觸發節點和 webhook 是工作流程的起點，重要性較高
    if (node.nodeCategory === 'trigger' || node.nodeCategory === 'webhook') {
      score += 0.2;
    }

    return Math.min(score, 1.0);
  }

  /**
   * 根據分類給予基礎分數
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
   * 正規化節點名稱以便比對
   * 移除套件前綴，統一大小寫
   */
  private normalizeNodeName(nodeName: string): string {
    return nodeName
      .toLowerCase()
      .replace(/^(nodes-base\.|langchain\.)/, '')
      .replace(/^n8n-/, '');
  }

  /**
   * 排序節點並分配層級
   *
   * @param nodes 待排序的節點陣列
   * @returns 排序後的節點陣列（包含分數和層級）
   */
  public rankNodes(nodes: NodeData[]): ScoredNode[] {
    // 計算最大使用次數用於正規化
    const maxUsageCount = Math.max(
      ...nodes.map(node => node.usageCount || 0),
      1
    );

    // 計算每個節點的分數
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

    // 依分數降序排序
    scoredNodes.sort((a, b) => b.score - a.score);

    // 分配排名
    scoredNodes.forEach((node, index) => {
      node.rank = index + 1;
    });

    // 分配層級
    this.assignTiers(scoredNodes);

    return scoredNodes;
  }

  /**
   * 根據排名和設定分配層級
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
   * 依層級分組節點
   *
   * @param scoredNodes 已評分的節點陣列
   * @returns 依層級分組的節點
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
   * 取得指定層級的節點
   *
   * @param scoredNodes 已評分的節點陣列
   * @param tier 要篩選的層級
   * @returns 該層級的節點陣列
   */
  public getNodesByTier(
    scoredNodes: ScoredNode[],
    tier: PriorityTier
  ): ScoredNode[] {
    return scoredNodes.filter(node => node.tier === tier);
  }

  /**
   * 產生排序報告
   *
   * @param scoredNodes 已評分的節點陣列
   * @returns 排序統計資訊
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
