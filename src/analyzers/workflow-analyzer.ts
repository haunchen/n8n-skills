/**
 * Copyright (c) 2025 Frank Chen @ www.frankchen.tw/personal
 * SPDX-License-Identifier: MIT
 *
 * This file is part of n8n-skills project.
 */

import type { WorkflowDefinition, WorkflowNode, WorkflowConnections } from '../collectors/api-collector';

/**
 * Connection information
 */
export interface ConnectionInfo {
  from: string;
  to: string;
  type: string;
}

/**
 * Node analysis information
 */
export interface NodeAnalysis {
  name: string;
  type: string;
  category: 'trigger' | 'action' | 'ai' | 'tool' | 'transform' | 'output' | 'input' | 'other';
  isKeyNode: boolean;
  description?: string;
}

/**
 * Workflow analysis result
 */
export interface WorkflowAnalysis {
  id?: number;
  name?: string;
  totalNodes: number;
  activeNodes: number; // Excluding Sticky Notes
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
 * Workflow Analyzer
 */
export class WorkflowAnalyzer {
  /**
   * Analyze workflow
   */
  analyze(workflow: WorkflowDefinition & { id?: number; name?: string }): WorkflowAnalysis {
    // Filter out Sticky Notes
    const activeNodes = workflow.nodes.filter(node => !this.isStickyNote(node));

    // Analyze nodes
    const nodeAnalyses = activeNodes.map(node => this.analyzeNode(node));

    // Extract connections
    const connections = this.extractConnections(workflow.connections);

    // Identify key nodes
    const keyNodes = this.identifyKeyNodes(nodeAnalyses);

    // Generate structured description
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
   * Check if node is a Sticky Note
   */
  private isStickyNote(node: WorkflowNode): boolean {
    return node.type === 'n8n-nodes-base.stickyNote' ||
           node.type === 'stickyNote';
  }

  /**
   * Analyze a single node
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
   * Categorize node
   */
  private categorizeNode(node: WorkflowNode): NodeAnalysis['category'] {
    const type = node.type.toLowerCase();

    // Triggers
    if (type.includes('trigger') || type.includes('webhook')) {
      return 'trigger';
    }

    // AI related
    if (type.includes('openai') ||
        type.includes('langchain') ||
        type.includes('agent') ||
        type.includes('anthropic') ||
        type.includes('huggingface')) {
      return 'ai';
    }

    // AI tools
    if (type.includes('tool') && type.includes('langchain')) {
      return 'tool';
    }

    // Data transformation
    if (type.includes('code') ||
        type.includes('function') ||
        type.includes('set') ||
        type.includes('merge') ||
        type.includes('if') ||
        type.includes('switch')) {
      return 'transform';
    }

    // Input
    if (type.includes('mysql') ||
        type.includes('postgres') ||
        type.includes('mongodb') ||
        type.includes('airtable') ||
        type.includes('sheets') ||
        type.includes('drive')) {
      return 'input';
    }

    // Output
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
   * Check if node is a key node
   */
  private isKeyNode(_node: WorkflowNode, category: NodeAnalysis['category']): boolean {
    return category === 'trigger' || category === 'ai' || category === 'tool';
  }

  /**
   * Extract connection relationships
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
   * Identify key nodes
   */
  private identifyKeyNodes(nodes: NodeAnalysis[]) {
    return {
      triggers: nodes.filter(n => n.category === 'trigger'),
      aiNodes: nodes.filter(n => n.category === 'ai'),
      tools: nodes.filter(n => n.category === 'tool'),
    };
  }

  /**
   * Generate structured description
   */
  private generateStructuredDescription(
    workflow: WorkflowDefinition & { id?: number; name?: string },
    nodes: NodeAnalysis[],
    connections: ConnectionInfo[],
    keyNodes: ReturnType<typeof this.identifyKeyNodes>
  ): string {
    const lines: string[] = [];

    // Title
    if (workflow.name) {
      lines.push(`# ${workflow.name}`);
      lines.push('');
    }

    // Basic statistics
    lines.push('## Basic Information');
    lines.push('');
    lines.push(`- Node count: ${nodes.length}`);
    lines.push(`- Connection count: ${connections.length}`);
    lines.push('');

    // Key nodes
    if (keyNodes.triggers.length > 0 || keyNodes.aiNodes.length > 0 || keyNodes.tools.length > 0) {
      lines.push('## Key Nodes');
      lines.push('');

      if (keyNodes.triggers.length > 0) {
        lines.push('### Triggers');
        keyNodes.triggers.forEach(node => {
          lines.push(`- ${node.name} (\`${node.type}\`)`);
        });
        lines.push('');
      }

      if (keyNodes.aiNodes.length > 0) {
        lines.push('### AI Nodes');
        keyNodes.aiNodes.forEach(node => {
          lines.push(`- ${node.name} (\`${node.type}\`)`);
        });
        lines.push('');
      }

      if (keyNodes.tools.length > 0) {
        lines.push('### Tool Nodes');
        keyNodes.tools.forEach(node => {
          lines.push(`- ${node.name} (\`${node.type}\`)`);
        });
        lines.push('');
      }
    }

    // Node list
    lines.push('## All Nodes');
    lines.push('');
    lines.push('| Node Name | Type | Category |');
    lines.push('|-----------|------|----------|');
    nodes.forEach(node => {
      const categoryName = this.getCategoryDisplayName(node.category);
      lines.push(`| ${node.name} | \`${node.type}\` | ${categoryName} |`);
    });
    lines.push('');

    // Connections
    if (connections.length > 0) {
      lines.push('## Connections');
      lines.push('');
      lines.push('```');
      connections.forEach(conn => {
        lines.push(`${conn.from} --[${conn.type}]--> ${conn.to}`);
      });
      lines.push('```');
      lines.push('');
    }

    // Workflow summary
    lines.push('## Workflow Summary');
    lines.push('');
    lines.push(this.generateWorkflowSummary(nodes, connections, keyNodes));

    return lines.join('\n');
  }

  /**
   * Get category display name
   */
  private getCategoryDisplayName(category: NodeAnalysis['category']): string {
    const names: Record<NodeAnalysis['category'], string> = {
      trigger: 'Trigger',
      action: 'Action',
      ai: 'AI',
      tool: 'Tool',
      transform: 'Transform',
      input: 'Input',
      output: 'Output',
      other: 'Other',
    };
    return names[category];
  }

  /**
   * Generate workflow summary
   */
  private generateWorkflowSummary(
    nodes: NodeAnalysis[],
    _connections: ConnectionInfo[],
    keyNodes: ReturnType<typeof this.identifyKeyNodes>
  ): string {
    const parts: string[] = [];

    // Trigger method
    if (keyNodes.triggers.length > 0) {
      const triggerNames = keyNodes.triggers.map(t => t.name).join(', ');
      parts.push(`This workflow is triggered by ${triggerNames}`);
    }

    // AI capabilities
    if (keyNodes.aiNodes.length > 0) {
      const aiNames = keyNodes.aiNodes.map(n => n.name).join(', ');
      parts.push(`uses ${aiNames} for AI processing`);
    }

    // Tools
    if (keyNodes.tools.length > 0) {
      parts.push(`equipped with ${keyNodes.tools.length} tool node(s)`);
    }

    // Data flow
    const transformNodes = nodes.filter(n => n.category === 'transform');
    const outputNodes = nodes.filter(n => n.category === 'output');

    if (transformNodes.length > 0) {
      parts.push(`goes through ${transformNodes.length} transformation step(s)`);
    }

    if (outputNodes.length > 0) {
      const outputNames = outputNodes.map(n => n.name).join(', ');
      parts.push(`finally outputs to ${outputNames}`);
    }

    if (parts.length === 0) {
      return `A workflow containing ${nodes.length} node(s).`;
    }

    return parts.join(', ') + '.';
  }
}
