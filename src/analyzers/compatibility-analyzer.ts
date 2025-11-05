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
 * Compatibility Analyzer
 * Analyzes connection compatibility between nodes based on input/output types
 */
export class CompatibilityAnalyzer {
  /**
   * Build complete compatibility matrix
   * @param nodes Connection information for all nodes
   * @returns Compatibility matrix
   */
  buildCompatibilityMatrix(nodes: NodeConnectionInfo[]): CompatibilityMatrix {
    const matrix: CompatibilityMatrix = {};

    // Build compatibility list for each node
    for (const sourceNode of nodes) {
      const compatible: CompatibilityEntry[] = [];
      const incompatible: CompatibilityEntry[] = [];

      // Check compatibility with every other node
      for (const targetNode of nodes) {
        // Skip self
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

      // Sort by score (high to low)
      compatible.sort((a, b) => b.score - a.score);

      matrix[sourceNode.nodeType] = {
        compatible,
        incompatible
      };
    }

    return matrix;
  }

  /**
   * Calculate compatibility between two nodes
   * @param sourceNode Source node
   * @param targetNode Target node
   * @returns Compatibility entry
   */
  private calculateCompatibility(
    sourceNode: NodeConnectionInfo,
    targetNode: NodeConnectionInfo
  ): CompatibilityEntry {
    const matchingTypes: NodeConnectionType[] = [];
    let score = 0;
    const reasons: string[] = [];

    // Check if each output type matches the target node's input types
    for (const outputType of sourceNode.outputTypes) {
      if (targetNode.inputTypes.includes(outputType)) {
        matchingTypes.push(outputType);

        // Calculate score
        if (outputType === 'main') {
          score += 50; // main connection is most common
        } else if (outputType.startsWith('ai_')) {
          score += 70; // AI connections are more specialized, higher score
        } else {
          score += 60;
        }

        reasons.push(`${outputType} → ${outputType}`);
      }
    }

    // Special case: trigger nodes typically connect to any node accepting main input
    if (sourceNode.outputTypes.includes('main') && targetNode.inputTypes.includes('main')) {
      if (sourceNode.category === 'trigger' && targetNode.category !== 'trigger') {
        score += 20; // Extra bonus for trigger to non-trigger node
        reasons.push('Trigger → Processing node');
      }
    }

    // If no matching connection types
    if (matchingTypes.length === 0) {
      return {
        targetNode: targetNode.nodeType,
        score: 0,
        reason: 'No matching connection types',
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
   * Get recommended connections for a node (top N most compatible nodes)
   * @param nodeType Node type
   * @param matrix Compatibility matrix
   * @param limit Limit number of results
   * @returns List of recommended connections
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
   * Check if two nodes are compatible
   * @param sourceNodeType Source node type
   * @param targetNodeType Target node type
   * @param matrix Compatibility matrix
   * @returns Whether nodes are compatible
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
   * Get compatibility score
   * @param sourceNodeType Source node type
   * @param targetNodeType Target node type
   * @param matrix Compatibility matrix
   * @returns Score (0 means incompatible)
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
