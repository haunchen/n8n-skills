/**
 * Copyright (c) 2025 Frank Chen @ www.frankchen.tw/personal
 * SPDX-License-Identifier: MIT
 *
 * This file is part of n8n-skills project.
 */

import type { CompatibilityMatrix, NodeConnectionInfo } from '../models/connection';
import type { NodeConnectionType } from 'n8n-workflow';

/**
 * Connection rule generator
 * Generate Markdown content for node connection guide
 */
export class ConnectionRuleGenerator {
  /**
   * Generate complete connection guide for a single node
   * @param node Node information
   * @param matrix Compatibility matrix
   * @param allNodes All nodes list (for querying display names)
   * @param limit Limit recommendation count
   * @returns Markdown format connection guide
   */
  generateNodeConnectionGuide(
    node: NodeConnectionInfo,
    matrix: CompatibilityMatrix,
    allNodes: NodeConnectionInfo[],
    limit: number = 10
  ): string {
    const sections: string[] = [];

    sections.push('## Connection Guide\n');

    // 1. Connection Type information
    sections.push('### Connection Type\n');
    sections.push(this.formatConnectionTypes(node));

    // 2. Can Receive From which nodes
    if (node.inputTypes.length > 0) {
      sections.push('\n### Can Receive From\n');
      sections.push(this.formatIncomingConnections(node, matrix, allNodes, limit));
    }

    // 3. Can Connect To which nodes
    if (node.outputTypes.length > 0) {
      sections.push('\n### Can Connect To\n');
      sections.push(this.formatOutgoingConnections(node, matrix, allNodes, limit));
    }

    // 4. Special notes (for AI nodes)
    if (node.requiresSpecialInputs) {
      sections.push('\n### Special Requirements\n');
      sections.push(this.formatSpecialRequirements(node));
    }

    return sections.join('\n');
  }

  /**
   * Format connection type information
   */
  private formatConnectionTypes(node: NodeConnectionInfo): string {
    const lines: string[] = [];

    if (node.inputTypes.length > 0) {
      lines.push(`- Input Types: ${this.formatConnectionTypeList(node.inputTypes)}`);
    } else {
      lines.push('- Input Types: None (this is a trigger or starting node)');
    }

    if (node.outputTypes.length > 0) {
      lines.push(`- Output Types: ${this.formatConnectionTypeList(node.outputTypes)}`);

      // If there are multiple outputs, display output details
      if (node.outputCount > 1 || node.isDynamicOutput) {
        lines.push(`- Output Count: ${node.isDynamicOutput ? `${node.outputCount} (configurable)` : `${node.outputCount}`}`);

        if (node.outputNames.length > 0) {
          lines.push('\nOutput Details:');
          node.outputNames.forEach((name, index) => {
            const description = this.getOutputDescription(node.nodeType, name);
            lines.push(`${index + 1}. \`${name}\`${description ? ` - ${description}` : ''}`);
          });
        }
      }
    }

    return lines.join('\n');
  }

  /**
   * Format connection type list
   */
  private formatConnectionTypeList(types: NodeConnectionType[]): string {
    return types.map(type => {
      if (type === 'main') {
        return '`main` (general data flow)';
      } else if (type.startsWith('ai_')) {
        const name = type.replace('ai_', '').replace(/([A-Z])/g, ' $1').trim();
        return `\`${type}\` (${name})`;
      } else {
        return `\`${type}\``;
      }
    }).join(', ');
  }

  /**
   * Get output port description
   * Provides useful descriptions for common multi-output nodes
   */
  private getOutputDescription(nodeType: string, outputName: string): string {
    // If node
    if (nodeType === 'nodes-base.if') {
      if (outputName === 'true') return 'Output when condition is true';
      if (outputName === 'false') return 'Output when condition is false';
    }

    // Split In Batches node
    if (nodeType === 'nodes-base.splitInBatches') {
      if (outputName === 'done') return 'Output when all batches are processed';
      if (outputName === 'loop') return 'Output for each batch iteration (for looping)';
    }

    // Compare Datasets node
    if (nodeType === 'nodes-base.compareDatasets') {
      if (outputName === 'In A only') return 'Items only in dataset A';
      if (outputName === 'Same') return 'Items that are the same in both datasets';
      if (outputName === 'Different') return 'Items that are different between datasets';
      if (outputName === 'In B only') return 'Items only in dataset B';
    }

    // Switch node
    if (nodeType === 'nodes-base.switch') {
      if (!isNaN(Number(outputName))) {
        return `Output path ${outputName}`;
      }
      if (outputName === 'Fallback') return 'Default output when no rules match';
    }

    return '';
  }

  /**
   * Format incoming source nodes
   */
  private formatIncomingConnections(
    node: NodeConnectionInfo,
    matrix: CompatibilityMatrix,
    allNodes: NodeConnectionInfo[],
    limit: number
  ): string {
    // Find all nodes that can connect to this node
    const incoming = allNodes
      .filter(sourceNode => {
        if (sourceNode.nodeType === node.nodeType) return false;
        const entry = matrix[sourceNode.nodeType];
        return entry?.compatible.some(c => c.targetNode === node.nodeType);
      })
      .map(sourceNode => {
        const entry = matrix[sourceNode.nodeType];
        const compat = entry?.compatible.find(c => c.targetNode === node.nodeType);
        return {
          node: sourceNode,
          score: compat?.score || 0,
          connectionTypes: compat?.connectionTypes || []
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    if (incoming.length === 0) {
      return 'This node does not accept input from other nodes (usually a trigger node).';
    }

    const lines: string[] = [];
    incoming.forEach((item, idx) => {
      const typeStr = item.connectionTypes.map(t => `\`${t}\``).join(', ');
      lines.push(`${idx + 1}. ${item.node.displayName} - via ${typeStr} connection`);
    });

    return lines.join('\n');
  }

  /**
   * Format outgoing target nodes
   */
  private formatOutgoingConnections(
    node: NodeConnectionInfo,
    matrix: CompatibilityMatrix,
    allNodes: NodeConnectionInfo[],
    limit: number
  ): string {
    const entry = matrix[node.nodeType];
    if (!entry || entry.compatible.length === 0) {
      return 'This node has no output, usually used as a workflow endpoint.';
    }

    const outgoing = entry.compatible
      .slice(0, limit)
      .map(compat => {
        const targetNode = allNodes.find(n => n.nodeType === compat.targetNode);
        return {
          node: targetNode,
          score: compat.score,
          connectionTypes: compat.connectionTypes
        };
      })
      .filter(item => item.node !== undefined);

    const lines: string[] = [];
    outgoing.forEach((item, idx) => {
      const typeStr = item.connectionTypes.map(t => `\`${t}\``).join(', ');
      lines.push(`${idx + 1}. ${item.node!.displayName} - via ${typeStr} connection`);
    });

    return lines.join('\n');
  }

  /**
   * Format special requirements (AI nodes)
   */
  private formatSpecialRequirements(node: NodeConnectionInfo): string {
    const lines: string[] = [];

    const aiInputTypes = node.inputTypes.filter(t => t.startsWith('ai_'));

    if (aiInputTypes.length === 0) {
      return '';
    }

    lines.push('This AI node requires the following special inputs:\n');

    aiInputTypes.forEach(type => {
      const name = type.replace('ai_', '').replace(/([A-Z])/g, ' $1').trim();
      let required = '';

      if (type === 'ai_languageModel') {
        required = '(required)';
      } else if (type === 'ai_tool' || type === 'ai_memory') {
        required = '(optional, multiple allowed)';
      } else {
        required = '(optional)';
      }

      lines.push(`- ${name} ${required}`);
    });

    return lines.join('\n');
  }

  /**
   * Generate compatibility matrix Markdown table
   * @param matrix Compatibility matrix
   * @param allNodes All nodes list
   * @param topN Only display top N most commonly used nodes
   * @returns Markdown formatted matrix table
   */
  generateCompatibilityMatrix(
    matrix: CompatibilityMatrix,
    allNodes: NodeConnectionInfo[],
    topN: number = 30
  ): string {
    const sections: string[] = [];

    sections.push('# Node Compatibility Matrix\n');
    sections.push('This matrix shows connection compatibility between nodes. Rows are source nodes, columns are target nodes.\n');

    // Only select top N nodes
    const selectedNodes = allNodes.slice(0, topN);

    // Build header
    const header = ['Source Node ↓ / Target Node →'];
    selectedNodes.forEach(node => {
      header.push(this.truncateName(node.displayName, 12));
    });
    sections.push(`| ${header.join(' | ')} |`);

    // Build separator
    const separator = header.map(() => '---');
    sections.push(`| ${separator.join(' | ')} |`);

    // Build each row
    selectedNodes.forEach(sourceNode => {
      const row = [this.truncateName(sourceNode.displayName, 20)];

      selectedNodes.forEach(targetNode => {
        if (sourceNode.nodeType === targetNode.nodeType) {
          row.push('-');
        } else {
          const entry = matrix[sourceNode.nodeType];
          const compat = entry?.compatible.find(c => c.targetNode === targetNode.nodeType);

          if (compat) {
            if (compat.score >= 70) {
              row.push('++');
            } else if (compat.score >= 50) {
              row.push('+');
            } else {
              row.push('~');
            }
          } else {
            row.push('X');
          }
        }
      });

      sections.push(`| ${row.join(' | ')} |`);
    });

    // Legend
    sections.push('\n## Legend\n');
    sections.push('- `++` High Compatibility (score ≥ 70) - Strongly recommended');
    sections.push('- `+` Medium Compatibility (score 50-69) - Can connect');
    sections.push('- `~` Low Compatibility (score < 50) - May be able to connect');
    sections.push('- `X` Incompatible - Cannot connect');
    sections.push('- `-` N/A - Same node');

    return sections.join('\n');
  }

  /**
   * Truncate name to fit table
   */
  private truncateName(name: string, maxLength: number): string {
    if (name.length <= maxLength) {
      return name;
    }
    return name.substring(0, maxLength - 2) + '..';
  }
}
