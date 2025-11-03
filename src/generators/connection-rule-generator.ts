/**
 * Copyright (c) 2025 Frank Chen @ www.frankchen.tw/personal
 * SPDX-License-Identifier: MIT
 *
 * This file is part of n8n-skills project.
 */

import type { CompatibilityMatrix, NodeConnectionInfo } from '../models/connection';
import type { NodeConnectionType } from 'n8n-workflow';

/**
 * 連接規則生成器
 * 為節點生成連接指南的 Markdown 內容
 */
export class ConnectionRuleGenerator {
  /**
   * 為單一節點生成完整的連接指南
   * @param node 節點資訊
   * @param matrix 相容性矩陣
   * @param allNodes 所有節點列表（用於查詢顯示名稱）
   * @param limit 限制推薦數量
   * @returns Markdown 格式的連接指南
   */
  generateNodeConnectionGuide(
    node: NodeConnectionInfo,
    matrix: CompatibilityMatrix,
    allNodes: NodeConnectionInfo[],
    limit: number = 10
  ): string {
    const sections: string[] = [];

    sections.push('## 連接指南\n');

    // 1. 連接類型資訊
    sections.push('### 連接類型\n');
    sections.push(this.formatConnectionTypes(node));

    // 2. 可接收來自哪些節點
    if (node.inputTypes.length > 0) {
      sections.push('\n### 可接收來自\n');
      sections.push(this.formatIncomingConnections(node, matrix, allNodes, limit));
    }

    // 3. 可連接到哪些節點
    if (node.outputTypes.length > 0) {
      sections.push('\n### 可連接到\n');
      sections.push(this.formatOutgoingConnections(node, matrix, allNodes, limit));
    }

    // 4. 特殊說明（針對 AI 節點）
    if (node.requiresSpecialInputs) {
      sections.push('\n### 特殊要求\n');
      sections.push(this.formatSpecialRequirements(node));
    }

    return sections.join('\n');
  }

  /**
   * 格式化連接類型資訊
   */
  private formatConnectionTypes(node: NodeConnectionInfo): string {
    const lines: string[] = [];

    if (node.inputTypes.length > 0) {
      lines.push(`- 輸入類型: ${this.formatConnectionTypeList(node.inputTypes)}`);
    } else {
      lines.push('- 輸入類型: 無（這是觸發器或起始節點）');
    }

    if (node.outputTypes.length > 0) {
      lines.push(`- 輸出類型: ${this.formatConnectionTypeList(node.outputTypes)}`);

      // 如果有多個輸出，顯示輸出詳情
      if (node.outputCount > 1 || node.isDynamicOutput) {
        lines.push(`- 輸出數量: ${node.isDynamicOutput ? `${node.outputCount} 個（可配置）` : `${node.outputCount} 個`}`);

        if (node.outputNames.length > 0) {
          lines.push('\n輸出詳情:');
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
   * 格式化連接類型列表
   */
  private formatConnectionTypeList(types: NodeConnectionType[]): string {
    return types.map(type => {
      if (type === 'main') {
        return '`main`（一般資料流）';
      } else if (type.startsWith('ai_')) {
        const name = type.replace('ai_', '').replace(/([A-Z])/g, ' $1').trim();
        return `\`${type}\`（${name}）`;
      } else {
        return `\`${type}\``;
      }
    }).join(', ');
  }

  /**
   * 取得輸出端口的描述
   * 為常見的多輸出節點提供有用的說明
   */
  private getOutputDescription(nodeType: string, outputName: string): string {
    // If 節點
    if (nodeType === 'nodes-base.if') {
      if (outputName === 'true') return '當條件判斷為真時的輸出';
      if (outputName === 'false') return '當條件判斷為假時的輸出';
    }

    // Split In Batches 節點
    if (nodeType === 'nodes-base.splitInBatches') {
      if (outputName === 'done') return '當所有批次處理完成時輸出';
      if (outputName === 'loop') return '每次批次迭代時輸出（用於循環）';
    }

    // Compare Datasets 節點
    if (nodeType === 'nodes-base.compareDatasets') {
      if (outputName === 'In A only') return '只存在於資料集 A 的項目';
      if (outputName === 'Same') return '兩個資料集中相同的項目';
      if (outputName === 'Different') return '兩個資料集中不同的項目';
      if (outputName === 'In B only') return '只存在於資料集 B 的項目';
    }

    // Switch 節點
    if (nodeType === 'nodes-base.switch') {
      if (!isNaN(Number(outputName))) {
        return `輸出路徑 ${outputName}`;
      }
      if (outputName === 'Fallback') return '不符合任何規則時的預設輸出';
    }

    return '';
  }

  /**
   * 格式化可接收的來源節點
   */
  private formatIncomingConnections(
    node: NodeConnectionInfo,
    matrix: CompatibilityMatrix,
    allNodes: NodeConnectionInfo[],
    limit: number
  ): string {
    // 找出所有可以連接到此節點的節點
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
      return '此節點不接受來自其他節點的輸入（通常是觸發器節點）。';
    }

    const lines: string[] = [];
    incoming.forEach((item, idx) => {
      const typeStr = item.connectionTypes.map(t => `\`${t}\``).join(', ');
      lines.push(`${idx + 1}. ${item.node.displayName} - 透過 ${typeStr} 連接`);
    });

    return lines.join('\n');
  }

  /**
   * 格式化可連接的目標節點
   */
  private formatOutgoingConnections(
    node: NodeConnectionInfo,
    matrix: CompatibilityMatrix,
    allNodes: NodeConnectionInfo[],
    limit: number
  ): string {
    const entry = matrix[node.nodeType];
    if (!entry || entry.compatible.length === 0) {
      return '此節點沒有輸出，通常作為工作流程的終點。';
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
      lines.push(`${idx + 1}. ${item.node!.displayName} - 透過 ${typeStr} 連接`);
    });

    return lines.join('\n');
  }

  /**
   * 格式化特殊要求（AI 節點）
   */
  private formatSpecialRequirements(node: NodeConnectionInfo): string {
    const lines: string[] = [];

    const aiInputTypes = node.inputTypes.filter(t => t.startsWith('ai_'));

    if (aiInputTypes.length === 0) {
      return '';
    }

    lines.push('此 AI 節點需要以下特殊輸入：\n');

    aiInputTypes.forEach(type => {
      const name = type.replace('ai_', '').replace(/([A-Z])/g, ' $1').trim();
      let required = '';

      if (type === 'ai_languageModel') {
        required = '（必需）';
      } else if (type === 'ai_tool' || type === 'ai_memory') {
        required = '（選用，可多個）';
      } else {
        required = '（選用）';
      }

      lines.push(`- ${name} ${required}`);
    });

    return lines.join('\n');
  }

  /**
   * 生成相容性矩陣的 Markdown 表格
   * @param matrix 相容性矩陣
   * @param allNodes 所有節點列表
   * @param topN 只顯示前 N 個最常用的節點
   * @returns Markdown 格式的矩陣表格
   */
  generateCompatibilityMatrix(
    matrix: CompatibilityMatrix,
    allNodes: NodeConnectionInfo[],
    topN: number = 30
  ): string {
    const sections: string[] = [];

    sections.push('# 節點相容性矩陣\n');
    sections.push('此矩陣顯示節點之間的連接相容性。橫列為來源節點，縱欄為目標節點。\n');

    // 只選擇前 N 個節點
    const selectedNodes = allNodes.slice(0, topN);

    // 建立表頭
    const header = ['來源節點 ↓ / 目標節點 →'];
    selectedNodes.forEach(node => {
      header.push(this.truncateName(node.displayName, 12));
    });
    sections.push(`| ${header.join(' | ')} |`);

    // 建立分隔線
    const separator = header.map(() => '---');
    sections.push(`| ${separator.join(' | ')} |`);

    // 建立每一列
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

    // 圖例
    sections.push('\n## 圖例\n');
    sections.push('- `++` 高度相容（分數 ≥ 70）- 強烈推薦');
    sections.push('- `+` 中度相容（分數 50-69）- 可以連接');
    sections.push('- `~` 低度相容（分數 < 50）- 可能可以連接');
    sections.push('- `X` 不相容 - 無法連接');
    sections.push('- `-` N/A - 同一節點');

    return sections.join('\n');
  }

  /**
   * 截斷名稱以適應表格
   */
  private truncateName(name: string, maxLength: number): string {
    if (name.length <= maxLength) {
      return name;
    }
    return name.substring(0, maxLength - 2) + '..';
  }
}
