/**
 * Copyright (c) 2025 Frank Chen @ www.frankchen.tw/personal
 * SPDX-License-Identifier: MIT
 *
 * This file is part of n8n-skills project.
 */

/**
 * Node usage frequency level
 */
export enum UsageFrequency {
  ESSENTIAL = 'essential',    // Essential nodes (core functionality)
  COMMON = 'common',          // Common nodes (frequently used)
  SPECIALIZED = 'specialized' // Specialized nodes (specific scenarios)
}

/**
 * Node functional group
 */
export enum FunctionalGroup {
  COMMUNICATION = 'communication',   // Communication tools
  PRODUCTIVITY = 'productivity',     // Productivity tools
  DEVELOPMENT = 'development',       // Development tools
  MARKETING = 'marketing',           // Marketing tools
  DATABASE = 'database',             // Database
  STORAGE = 'storage',               // Storage services
  AI_ML = 'ai_ml',                   // AI/Machine Learning
  AUTOMATION = 'automation',         // Automation tools
  ANALYTICS = 'analytics',           // Analytics tools
  UTILITY = 'utility'                // Utility tools
}

/**
 * Grouped node information
 */
export interface GroupedNode {
  nodeType: string;
  displayName: string;
  description: string;
  usageFrequency: UsageFrequency;
  functionalGroups: FunctionalGroup[];
  relatedNodes: string[];
  tags: string[];
}

/**
 * Node relationship
 */
export interface NodeRelationship {
  sourceNode: string;
  targetNode: string;
  relationshipType: 'alternative' | 'complement' | 'prerequisite' | 'successor';
  description?: string;
}

/**
 * Grouping result
 */
export interface GroupingResult {
  byFrequency: Map<UsageFrequency, GroupedNode[]>;
  byFunction: Map<FunctionalGroup, GroupedNode[]>;
  relationships: NodeRelationship[];
}

/**
 * Node basic information interface
 */
export interface NodeInfo {
  nodeType: string;
  displayName: string;
  description: string;
  category?: string;
  isTrigger?: boolean;
  isWebhook?: boolean;
  isAITool?: boolean;
  hasCredentials?: boolean;
  hasOperations?: boolean;
}

/**
 * Node grouper
 *
 * Provides multiple grouping logics:
 * 1. Group by usage frequency (essential/common/specialized)
 * 2. Group by functional similarity (communication/productivity/development, etc.)
 * 3. Build relationship mapping between nodes
 */
export class NodeGrouper {
  private frequencyRules: Map<UsageFrequency, (node: NodeInfo) => boolean> = new Map();
  private functionalRules: Map<FunctionalGroup, (node: NodeInfo) => boolean> = new Map();
  private relationshipRules: NodeRelationship[] = [];

  constructor() {
    this.initializeFrequencyRules();
    this.initializeFunctionalRules();
    this.initializeRelationshipRules();
  }

  /**
   * Initialize usage frequency rules
   */
  private initializeFrequencyRules(): void {
    // Essential nodes: core functionality, used in almost every workflow
    this.frequencyRules.set(UsageFrequency.ESSENTIAL, (node) => {
      const essentialKeywords = [
        'httpRequest', 'webhook', 'code', 'set', 'if', 'merge', 'split',
        'function', 'executeWorkflow', 'manualTrigger', 'cronTrigger'
      ];
      return essentialKeywords.some(keyword =>
        node.nodeType.toLowerCase().includes(keyword.toLowerCase())
      );
    });

    // Common nodes: popular third-party integrations
    this.frequencyRules.set(UsageFrequency.COMMON, (node) => {
      const commonKeywords = [
        'slack', 'gmail', 'googlesheets', 'notion', 'airtable',
        'github', 'telegram', 'discord', 'postgres', 'mysql'
      ];
      return commonKeywords.some(keyword =>
        node.nodeType.toLowerCase().includes(keyword.toLowerCase())
      );
    });

    // Specialized nodes: default to specialized
    this.frequencyRules.set(UsageFrequency.SPECIALIZED, () => true);
  }

  /**
   * Initialize functional group rules
   */
  private initializeFunctionalRules(): void {
    // Communication tools
    this.functionalRules.set(FunctionalGroup.COMMUNICATION, (node) => {
      const keywords = ['slack', 'discord', 'telegram', 'teams', 'email', 'sms', 'whatsapp'];
      return keywords.some(k => node.nodeType.toLowerCase().includes(k));
    });

    // Productivity tools
    this.functionalRules.set(FunctionalGroup.PRODUCTIVITY, (node) => {
      const keywords = ['sheets', 'notion', 'airtable', 'monday', 'asana', 'trello', 'calendar'];
      return keywords.some(k => node.nodeType.toLowerCase().includes(k));
    });

    // Development tools
    this.functionalRules.set(FunctionalGroup.DEVELOPMENT, (node) => {
      const keywords = ['github', 'gitlab', 'jira', 'linear', 'jenkins', 'docker'];
      return keywords.some(k => node.nodeType.toLowerCase().includes(k));
    });

    // Marketing tools
    this.functionalRules.set(FunctionalGroup.MARKETING, (node) => {
      const keywords = ['mailchimp', 'sendgrid', 'hubspot', 'salesforce', 'mailgun'];
      return keywords.some(k => node.nodeType.toLowerCase().includes(k));
    });

    // Database
    this.functionalRules.set(FunctionalGroup.DATABASE, (node) => {
      const keywords = ['postgres', 'mysql', 'mongodb', 'redis', 'sqlite', 'firebase', 'supabase'];
      return keywords.some(k => node.nodeType.toLowerCase().includes(k));
    });

    // Storage services
    this.functionalRules.set(FunctionalGroup.STORAGE, (node) => {
      const keywords = ['drive', 'dropbox', 's3', 'box', 'onedrive', 'storage'];
      return keywords.some(k => node.nodeType.toLowerCase().includes(k));
    });

    // AI/Machine Learning
    this.functionalRules.set(FunctionalGroup.AI_ML, (node) => {
      return node.isAITool === true ||
             ['openai', 'anthropic', 'huggingface', 'langchain', 'ai'].some(k =>
               node.nodeType.toLowerCase().includes(k)
             );
    });

    // Automation tools
    this.functionalRules.set(FunctionalGroup.AUTOMATION, (node) => {
      return node.isTrigger === true ||
             node.isWebhook === true ||
             ['trigger', 'webhook', 'schedule', 'cron'].some(k =>
               node.nodeType.toLowerCase().includes(k)
             );
    });

    // Analytics tools
    this.functionalRules.set(FunctionalGroup.ANALYTICS, (node) => {
      const keywords = ['analytics', 'segment', 'mixpanel', 'amplitude'];
      return keywords.some(k => node.nodeType.toLowerCase().includes(k));
    });

    // Utility tools
    this.functionalRules.set(FunctionalGroup.UTILITY, (node) => {
      const keywords = ['datetime', 'crypto', 'xml', 'json', 'compress', 'pdf', 'html'];
      return keywords.some(k => node.nodeType.toLowerCase().includes(k));
    });
  }

  /**
   * Initialize node relationship rules
   */
  private initializeRelationshipRules(): void {
    // Alternative relationship: different implementations of similar functionality
    this.relationshipRules.push(
      {
        sourceNode: 'Gmail',
        targetNode: 'EmailSend',
        relationshipType: 'alternative',
        description: 'Both can send emails'
      },
      {
        sourceNode: 'PostgresQL',
        targetNode: 'MySQL',
        relationshipType: 'alternative',
        description: 'Both are relational databases'
      },
      {
        sourceNode: 'OpenAI',
        targetNode: 'Anthropic',
        relationshipType: 'alternative',
        description: 'Both are large language model services'
      }
    );

    // Complement relationship: frequently used together
    this.relationshipRules.push(
      {
        sourceNode: 'Webhook',
        targetNode: 'HTTP Request',
        relationshipType: 'complement',
        description: 'Webhook receives requests, HTTP Request sends requests'
      },
      {
        sourceNode: 'Code',
        targetNode: 'Set',
        relationshipType: 'complement',
        description: 'Code handles complex logic, Set sets simple values'
      },
      {
        sourceNode: 'If',
        targetNode: 'Switch',
        relationshipType: 'complement',
        description: 'Both used for conditional branching and flow control'
      }
    );

    // Prerequisite relationship: one is a prerequisite for another
    this.relationshipRules.push(
      {
        sourceNode: 'Trigger',
        targetNode: 'HTTP Request',
        relationshipType: 'prerequisite',
        description: 'Workflows need triggers to start'
      }
    );

    // Successor relationship: typically used after certain nodes
    this.relationshipRules.push(
      {
        sourceNode: 'HTTP Request',
        targetNode: 'Set',
        relationshipType: 'successor',
        description: 'Data fetched from API usually needs transformation'
      }
    );
  }

  /**
   * Group nodes
   *
   * @param nodes All node information
   * @returns Grouping result
   */
  group(nodes: NodeInfo[]): GroupingResult {
    const groupedNodes: GroupedNode[] = nodes.map(node => this.classifyNode(node));

    // Group by usage frequency
    const byFrequency = new Map<UsageFrequency, GroupedNode[]>();
    for (const freq of Object.values(UsageFrequency)) {
      byFrequency.set(freq, []);
    }
    for (const node of groupedNodes) {
      byFrequency.get(node.usageFrequency)!.push(node);
    }

    // Group by function
    const byFunction = new Map<FunctionalGroup, GroupedNode[]>();
    for (const func of Object.values(FunctionalGroup)) {
      byFunction.set(func, []);
    }
    for (const node of groupedNodes) {
      for (const func of node.functionalGroups) {
        byFunction.get(func)!.push(node);
      }
    }

    // Build relationship mapping
    const relationships = this.buildRelationships(groupedNodes);

    return {
      byFrequency,
      byFunction,
      relationships
    };
  }

  /**
   * Classify a single node
   */
  private classifyNode(node: NodeInfo): GroupedNode {
    // Determine usage frequency
    let usageFrequency = UsageFrequency.SPECIALIZED;
    for (const [freq, rule] of this.frequencyRules.entries()) {
      if (rule(node)) {
        usageFrequency = freq;
        break;
      }
    }

    // Determine functional groups
    const functionalGroups: FunctionalGroup[] = [];
    for (const [group, rule] of this.functionalRules.entries()) {
      if (rule(node)) {
        functionalGroups.push(group);
      }
    }

    // If no functional group matches, categorize as utility
    if (functionalGroups.length === 0) {
      functionalGroups.push(FunctionalGroup.UTILITY);
    }

    // Generate tags
    const tags = this.generateTags(node);

    return {
      nodeType: node.nodeType,
      displayName: node.displayName,
      description: node.description,
      usageFrequency,
      functionalGroups,
      relatedNodes: [],
      tags
    };
  }

  /**
   * Build node relationship mapping
   */
  private buildRelationships(nodes: GroupedNode[]): NodeRelationship[] {
    const relationships: NodeRelationship[] = [];
    const nodeMap = new Map(nodes.map(n => [this.normalizeNodeType(n.nodeType), n]));

    // Apply predefined rules
    for (const rule of this.relationshipRules) {
      const sourceExists = Array.from(nodeMap.keys()).some(k =>
        k.includes(rule.sourceNode.toLowerCase())
      );
      const targetExists = Array.from(nodeMap.keys()).some(k =>
        k.includes(rule.targetNode.toLowerCase())
      );

      if (sourceExists && targetExists) {
        relationships.push(rule);
      }
    }

    // Automatically discover similar node relationships
    for (const node of nodes) {
      const related = this.findRelatedNodes(node, nodes);
      node.relatedNodes = related;
    }

    return relationships;
  }

  /**
   * Find related nodes
   */
  private findRelatedNodes(node: GroupedNode, allNodes: GroupedNode[]): string[] {
    const related: string[] = [];

    for (const other of allNodes) {
      if (other.nodeType === node.nodeType) continue;

      // Same functional group
      const sharedGroups = node.functionalGroups.filter(g =>
        other.functionalGroups.includes(g)
      );

      if (sharedGroups.length > 0) {
        related.push(other.nodeType);
      }
    }

    return related.slice(0, 5); // Return at most 5 related nodes
  }

  /**
   * Generate node tags
   */
  private generateTags(node: NodeInfo): string[] {
    const tags: string[] = [];

    if (node.isTrigger) tags.push('trigger');
    if (node.isWebhook) tags.push('webhook');
    if (node.isAITool) tags.push('ai');
    if (node.hasCredentials) tags.push('requires-auth');
    if (node.hasOperations) tags.push('multi-operation');

    return tags;
  }

  /**
   * Normalize node type for comparison
   */
  private normalizeNodeType(nodeType: string): string {
    return nodeType.toLowerCase().split('.').pop() || nodeType.toLowerCase();
  }

  /**
   * Get nodes by specific frequency level
   */
  getNodesByFrequency(result: GroupingResult, frequency: UsageFrequency): GroupedNode[] {
    return result.byFrequency.get(frequency) || [];
  }

  /**
   * Get nodes by specific functional group
   */
  getNodesByFunction(result: GroupingResult, group: FunctionalGroup): GroupedNode[] {
    return result.byFunction.get(group) || [];
  }

  /**
   * Generate grouping statistics
   */
  generateStatistics(result: GroupingResult): {
    totalNodes: number;
    frequencyDistribution: Record<UsageFrequency, number>;
    functionDistribution: Record<FunctionalGroup, number>;
    relationshipsCount: number;
  } {
    const frequencyDistribution: Record<string, number> = {};
    for (const [freq, nodes] of result.byFrequency.entries()) {
      frequencyDistribution[freq] = nodes.length;
    }

    const functionDistribution: Record<string, number> = {};
    for (const [func, nodes] of result.byFunction.entries()) {
      functionDistribution[func] = nodes.length;
    }

    return {
      totalNodes: Array.from(result.byFrequency.values()).reduce((sum, nodes) => sum + nodes.length, 0),
      frequencyDistribution: frequencyDistribution as Record<UsageFrequency, number>,
      functionDistribution: functionDistribution as Record<FunctionalGroup, number>,
      relationshipsCount: result.relationships.length
    };
  }
}
