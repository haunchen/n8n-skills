/**
 * Copyright (c) 2025 Frank Chen @ www.frankchen.tw/personal
 * SPDX-License-Identifier: MIT
 *
 * This file is part of n8n-skills project.
 */

import type { WorkflowDefinition, WorkflowNode, WorkflowConnections } from '../collectors/api-collector';

/**
 * 連接資訊
 */
export interface ConnectionInfo {
  from: string;
  to: string;
  type: string;
}

/**
 * 節點分析資訊
 */
export interface NodeAnalysis {
  name: string;
  type: string;
  category: 'trigger' | 'action' | 'ai' | 'tool' | 'transform' | 'output' | 'input' | 'other';
  isKeyNode: boolean;
  description?: string;
}

/**
 * Workflow 分析結果
 */
export interface WorkflowAnalysis {
  id?: number;
  name?: string;
  totalNodes: number;
  activeNodes: number; // 排除 Sticky Notes
  nodes: NodeAnalysis[];
  connections: ConnectionInfo[];
  keyNodes: {
    triggers: NodeAnalysis[];
    aiNodes: NodeAnalysis[];
    tools: NodeAnalysis[];
  };
  structuredDescription: string;
}

/**
 * Workflow 分析器
 */
export class WorkflowAnalyzer {
  /**
   * 分析 workflow
   */
  analyze(workflow: WorkflowDefinition & { id?: number; name?: string }): WorkflowAnalysis {
    // 過濾掉 Sticky Notes
    const activeNodes = workflow.nodes.filter(node => !this.isStickyNote(node));

    // 分析節點
    const nodeAnalyses = activeNodes.map(node => this.analyzeNode(node));

    // 提取連接
    const connections = this.extractConnections(workflow.connections);

    // 識別關鍵節點
    const keyNodes = this.identifyKeyNodes(nodeAnalyses);

    // 生成結構化描述
    const structuredDescription = this.generateStructuredDescription(
      workflow,
      nodeAnalyses,
      connections,
      keyNodes
    );

    return {
      id: workflow.id,
      name: workflow.name,
      totalNodes: workflow.nodes.length,
      activeNodes: activeNodes.length,
      nodes: nodeAnalyses,
      connections,
      keyNodes,
      structuredDescription,
    };
  }

  /**
   * 判斷是否為 Sticky Note
   */
  private isStickyNote(node: WorkflowNode): boolean {
    return node.type === 'n8n-nodes-base.stickyNote' ||
           node.type === 'stickyNote';
  }

  /**
   * 分析單一節點
   */
  private analyzeNode(node: WorkflowNode): NodeAnalysis {
    const category = this.categorizeNode(node);
    const isKeyNode = this.isKeyNode(node, category);

    return {
      name: node.name,
      type: node.type,
      category,
      isKeyNode,
      description: node.notes,
    };
  }

  /**
   * 節點分類
   */
  private categorizeNode(node: WorkflowNode): NodeAnalysis['category'] {
    const type = node.type.toLowerCase();

    // 觸發器
    if (type.includes('trigger') || type.includes('webhook')) {
      return 'trigger';
    }

    // AI 相關
    if (type.includes('openai') ||
        type.includes('langchain') ||
        type.includes('agent') ||
        type.includes('anthropic') ||
        type.includes('huggingface')) {
      return 'ai';
    }

    // AI 工具
    if (type.includes('tool') && type.includes('langchain')) {
      return 'tool';
    }

    // 資料轉換
    if (type.includes('code') ||
        type.includes('function') ||
        type.includes('set') ||
        type.includes('merge') ||
        type.includes('if') ||
        type.includes('switch')) {
      return 'transform';
    }

    // 輸入
    if (type.includes('mysql') ||
        type.includes('postgres') ||
        type.includes('mongodb') ||
        type.includes('airtable') ||
        type.includes('sheets') ||
        type.includes('drive')) {
      return 'input';
    }

    // 輸出
    if (type.includes('http') ||
        type.includes('slack') ||
        type.includes('discord') ||
        type.includes('telegram') ||
        type.includes('email') ||
        type.includes('gmail')) {
      return 'output';
    }

    return 'other';
  }

  /**
   * 判斷是否為關鍵節點
   */
  private isKeyNode(_node: WorkflowNode, category: NodeAnalysis['category']): boolean {
    return category === 'trigger' || category === 'ai' || category === 'tool';
  }

  /**
   * 提取連接關係
   */
  private extractConnections(connections: WorkflowConnections): ConnectionInfo[] {
    const result: ConnectionInfo[] = [];

    Object.entries(connections).forEach(([sourceNode, outputs]) => {
      Object.entries(outputs).forEach(([_outputType, connectionGroups]) => {
        connectionGroups.forEach(connGroup => {
          connGroup.forEach(conn => {
            result.push({
              from: sourceNode,
              to: conn.node,
              type: conn.type,
            });
          });
        });
      });
    });

    return result;
  }

  /**
   * 識別關鍵節點
   */
  private identifyKeyNodes(nodes: NodeAnalysis[]) {
    return {
      triggers: nodes.filter(n => n.category === 'trigger'),
      aiNodes: nodes.filter(n => n.category === 'ai'),
      tools: nodes.filter(n => n.category === 'tool'),
    };
  }

  /**
   * 生成結構化描述
   */
  private generateStructuredDescription(
    workflow: WorkflowDefinition & { id?: number; name?: string },
    nodes: NodeAnalysis[],
    connections: ConnectionInfo[],
    keyNodes: ReturnType<typeof this.identifyKeyNodes>
  ): string {
    const lines: string[] = [];

    // 標題
    if (workflow.name) {
      lines.push(`# ${workflow.name}`);
      lines.push('');
    }

    // 基本統計
    lines.push('## 基本資訊');
    lines.push('');
    lines.push(`- 節點數量: ${nodes.length}`);
    lines.push(`- 連接數量: ${connections.length}`);
    lines.push('');

    // 關鍵節點
    if (keyNodes.triggers.length > 0 || keyNodes.aiNodes.length > 0 || keyNodes.tools.length > 0) {
      lines.push('## 關鍵節點');
      lines.push('');

      if (keyNodes.triggers.length > 0) {
        lines.push('### 觸發器');
        keyNodes.triggers.forEach(node => {
          lines.push(`- ${node.name} (\`${node.type}\`)`);
        });
        lines.push('');
      }

      if (keyNodes.aiNodes.length > 0) {
        lines.push('### AI 節點');
        keyNodes.aiNodes.forEach(node => {
          lines.push(`- ${node.name} (\`${node.type}\`)`);
        });
        lines.push('');
      }

      if (keyNodes.tools.length > 0) {
        lines.push('### 工具節點');
        keyNodes.tools.forEach(node => {
          lines.push(`- ${node.name} (\`${node.type}\`)`);
        });
        lines.push('');
      }
    }

    // 節點列表
    lines.push('## 所有節點');
    lines.push('');
    lines.push('| 節點名稱 | 類型 | 分類 |');
    lines.push('|---------|------|------|');
    nodes.forEach(node => {
      const categoryName = this.getCategoryDisplayName(node.category);
      lines.push(`| ${node.name} | \`${node.type}\` | ${categoryName} |`);
    });
    lines.push('');

    // 連接關係
    if (connections.length > 0) {
      lines.push('## 連接關係');
      lines.push('');
      lines.push('```');
      connections.forEach(conn => {
        lines.push(`${conn.from} --[${conn.type}]--> ${conn.to}`);
      });
      lines.push('```');
      lines.push('');
    }

    // 工作流程摘要
    lines.push('## 工作流程摘要');
    lines.push('');
    lines.push(this.generateWorkflowSummary(nodes, connections, keyNodes));

    return lines.join('\n');
  }

  /**
   * 取得分類顯示名稱
   */
  private getCategoryDisplayName(category: NodeAnalysis['category']): string {
    const names: Record<NodeAnalysis['category'], string> = {
      trigger: '觸發器',
      action: '動作',
      ai: 'AI',
      tool: '工具',
      transform: '資料轉換',
      input: '資料輸入',
      output: '資料輸出',
      other: '其他',
    };
    return names[category];
  }

  /**
   * 生成工作流程摘要
   */
  private generateWorkflowSummary(
    nodes: NodeAnalysis[],
    _connections: ConnectionInfo[],
    keyNodes: ReturnType<typeof this.identifyKeyNodes>
  ): string {
    const parts: string[] = [];

    // 觸發方式
    if (keyNodes.triggers.length > 0) {
      const triggerNames = keyNodes.triggers.map(t => t.name).join('、');
      parts.push(`此工作流程由 ${triggerNames} 觸發`);
    }

    // AI 功能
    if (keyNodes.aiNodes.length > 0) {
      const aiNames = keyNodes.aiNodes.map(n => n.name).join('、');
      parts.push(`使用 ${aiNames} 進行 AI 處理`);
    }

    // 工具
    if (keyNodes.tools.length > 0) {
      parts.push(`配備 ${keyNodes.tools.length} 個工具節點`);
    }

    // 資料流
    const transformNodes = nodes.filter(n => n.category === 'transform');
    const outputNodes = nodes.filter(n => n.category === 'output');

    if (transformNodes.length > 0) {
      parts.push(`經過 ${transformNodes.length} 個轉換步驟`);
    }

    if (outputNodes.length > 0) {
      const outputNames = outputNodes.map(n => n.name).join('、');
      parts.push(`最終輸出到 ${outputNames}`);
    }

    if (parts.length === 0) {
      return `包含 ${nodes.length} 個節點的工作流程。`;
    }

    return parts.join('，') + '。';
  }
}
