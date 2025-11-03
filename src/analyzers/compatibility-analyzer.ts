/**
 * Copyright (c) 2025 Frank Chen @ www.frankchen.tw/personal
 * SPDX-License-Identifier: MIT
 *
 * This file is part of n8n-skills project.
 */

import type { NodeConnectionType } from 'n8n-workflow';
import type {
  CompatibilityMatrix,
  CompatibilityEntry,
  NodeConnectionInfo
} from '../models/connection';

/**
 * 相容性分析器
 * 分析節點之間的連接相容性，基於輸入輸出類型
 */
export class CompatibilityAnalyzer {
  /**
   * 建立完整的相容性矩陣
   * @param nodes 所有節點的連接資訊
   * @returns 相容性矩陣
   */
  buildCompatibilityMatrix(nodes: NodeConnectionInfo[]): CompatibilityMatrix {
    const matrix: CompatibilityMatrix = {};

    // 為每個節點建立相容性列表
    for (const sourceNode of nodes) {
      const compatible: CompatibilityEntry[] = [];
      const incompatible: CompatibilityEntry[] = [];

      // 檢查與每個其他節點的相容性
      for (const targetNode of nodes) {
        // 跳過自己
        if (sourceNode.nodeType === targetNode.nodeType) {
          continue;
        }

        const result = this.calculateCompatibility(sourceNode, targetNode);

        if (result.score > 0) {
          compatible.push(result);
        } else {
          incompatible.push(result);
        }
      }

      // 按分數排序（高到低）
      compatible.sort((a, b) => b.score - a.score);

      matrix[sourceNode.nodeType] = {
        compatible,
        incompatible
      };
    }

    return matrix;
  }

  /**
   * 計算兩個節點之間的相容性
   * @param sourceNode 來源節點
   * @param targetNode 目標節點
   * @returns 相容性條目
   */
  private calculateCompatibility(
    sourceNode: NodeConnectionInfo,
    targetNode: NodeConnectionInfo
  ): CompatibilityEntry {
    const matchingTypes: NodeConnectionType[] = [];
    let score = 0;
    const reasons: string[] = [];

    // 檢查每個輸出類型是否匹配目標節點的輸入類型
    for (const outputType of sourceNode.outputTypes) {
      if (targetNode.inputTypes.includes(outputType)) {
        matchingTypes.push(outputType);

        // 計算分數
        if (outputType === 'main') {
          score += 50; // main 連接是最常見的
        } else if (outputType.startsWith('ai_')) {
          score += 70; // AI 連接更特殊，分數更高
        } else {
          score += 60;
        }

        reasons.push(`${outputType} → ${outputType}`);
      }
    }

    // 特殊情況：觸發器節點通常連接到任何接受 main 輸入的節點
    if (sourceNode.outputTypes.includes('main') && targetNode.inputTypes.includes('main')) {
      if (sourceNode.category === 'trigger' && targetNode.category !== 'trigger') {
        score += 20; // 觸發器到非觸發器節點有額外獎勵
        reasons.push('觸發器 → 處理節點');
      }
    }

    // 如果沒有匹配的連接類型
    if (matchingTypes.length === 0) {
      return {
        targetNode: targetNode.nodeType,
        score: 0,
        reason: '無匹配的連接類型',
        connectionTypes: []
      };
    }

    return {
      targetNode: targetNode.nodeType,
      score,
      reason: reasons.join(', '),
      connectionTypes: matchingTypes
    };
  }

  /**
   * 取得節點的推薦連接（前 N 個最相容的節點）
   * @param nodeType 節點類型
   * @param matrix 相容性矩陣
   * @param limit 限制數量
   * @returns 推薦的連接列表
   */
  getRecommendedConnections(
    nodeType: string,
    matrix: CompatibilityMatrix,
    limit: number = 10
  ): CompatibilityEntry[] {
    const entry = matrix[nodeType];
    if (!entry) {
      return [];
    }

    return entry.compatible.slice(0, limit);
  }

  /**
   * 檢查兩個節點是否相容
   * @param sourceNodeType 來源節點類型
   * @param targetNodeType 目標節點類型
   * @param matrix 相容性矩陣
   * @returns 是否相容
   */
  isCompatible(
    sourceNodeType: string,
    targetNodeType: string,
    matrix: CompatibilityMatrix
  ): boolean {
    const entry = matrix[sourceNodeType];
    if (!entry) {
      return false;
    }

    return entry.compatible.some(c => c.targetNode === targetNodeType);
  }

  /**
   * 取得相容性分數
   * @param sourceNodeType 來源節點類型
   * @param targetNodeType 目標節點類型
   * @param matrix 相容性矩陣
   * @returns 分數（0 表示不相容）
   */
  getCompatibilityScore(
    sourceNodeType: string,
    targetNodeType: string,
    matrix: CompatibilityMatrix
  ): number {
    const entry = matrix[sourceNodeType];
    if (!entry) {
      return 0;
    }

    const compatible = entry.compatible.find(c => c.targetNode === targetNodeType);
    return compatible?.score || 0;
  }
}
