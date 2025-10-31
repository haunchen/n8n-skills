/**
 * Copyright (c) 2025 Frank Chen @ www.frankchen.tw/personal
 * SPDX-License-Identifier: MIT
 *
 * This file is part of n8n-skills project.
 */

/**
 * 節點使用頻率等級
 */
export enum UsageFrequency {
  ESSENTIAL = 'essential',    // 必備節點（核心功能）
  COMMON = 'common',          // 常用節點（經常使用）
  SPECIALIZED = 'specialized' // 專業節點（特定場景）
}

/**
 * 節點功能群組
 */
export enum FunctionalGroup {
  COMMUNICATION = 'communication',   // 通訊工具
  PRODUCTIVITY = 'productivity',     // 生產力工具
  DEVELOPMENT = 'development',       // 開發工具
  MARKETING = 'marketing',           // 行銷工具
  DATABASE = 'database',             // 資料庫
  STORAGE = 'storage',               // 儲存服務
  AI_ML = 'ai_ml',                   // AI/機器學習
  AUTOMATION = 'automation',         // 自動化工具
  ANALYTICS = 'analytics',           // 分析工具
  UTILITY = 'utility'                // 實用工具
}

/**
 * 分組的節點資訊
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
 * 節點關係
 */
export interface NodeRelationship {
  sourceNode: string;
  targetNode: string;
  relationshipType: 'alternative' | 'complement' | 'prerequisite' | 'successor';
  description?: string;
}

/**
 * 分組結果
 */
export interface GroupingResult {
  byFrequency: Map<UsageFrequency, GroupedNode[]>;
  byFunction: Map<FunctionalGroup, GroupedNode[]>;
  relationships: NodeRelationship[];
}

/**
 * 節點基本資訊介面
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
 * 節點分組器
 *
 * 提供多種分組邏輯：
 * 1. 按使用頻率分組（必備/常用/專業）
 * 2. 按功能相似性分組（通訊/生產力/開發等）
 * 3. 建立節點間的關係映射
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
   * 初始化使用頻率規則
   */
  private initializeFrequencyRules(): void {
    // 必備節點：核心功能，幾乎每個工作流程都會用到
    this.frequencyRules.set(UsageFrequency.ESSENTIAL, (node) => {
      const essentialKeywords = [
        'httpRequest', 'webhook', 'code', 'set', 'if', 'merge', 'split',
        'function', 'executeWorkflow', 'manualTrigger', 'cronTrigger'
      ];
      return essentialKeywords.some(keyword =>
        node.nodeType.toLowerCase().includes(keyword.toLowerCase())
      );
    });

    // 常用節點：流行的第三方整合
    this.frequencyRules.set(UsageFrequency.COMMON, (node) => {
      const commonKeywords = [
        'slack', 'gmail', 'googlesheets', 'notion', 'airtable',
        'github', 'telegram', 'discord', 'postgres', 'mysql'
      ];
      return commonKeywords.some(keyword =>
        node.nodeType.toLowerCase().includes(keyword.toLowerCase())
      );
    });

    // 專業節點：預設為專業節點
    this.frequencyRules.set(UsageFrequency.SPECIALIZED, () => true);
  }

  /**
   * 初始化功能群組規則
   */
  private initializeFunctionalRules(): void {
    // 通訊工具
    this.functionalRules.set(FunctionalGroup.COMMUNICATION, (node) => {
      const keywords = ['slack', 'discord', 'telegram', 'teams', 'email', 'sms', 'whatsapp'];
      return keywords.some(k => node.nodeType.toLowerCase().includes(k));
    });

    // 生產力工具
    this.functionalRules.set(FunctionalGroup.PRODUCTIVITY, (node) => {
      const keywords = ['sheets', 'notion', 'airtable', 'monday', 'asana', 'trello', 'calendar'];
      return keywords.some(k => node.nodeType.toLowerCase().includes(k));
    });

    // 開發工具
    this.functionalRules.set(FunctionalGroup.DEVELOPMENT, (node) => {
      const keywords = ['github', 'gitlab', 'jira', 'linear', 'jenkins', 'docker'];
      return keywords.some(k => node.nodeType.toLowerCase().includes(k));
    });

    // 行銷工具
    this.functionalRules.set(FunctionalGroup.MARKETING, (node) => {
      const keywords = ['mailchimp', 'sendgrid', 'hubspot', 'salesforce', 'mailgun'];
      return keywords.some(k => node.nodeType.toLowerCase().includes(k));
    });

    // 資料庫
    this.functionalRules.set(FunctionalGroup.DATABASE, (node) => {
      const keywords = ['postgres', 'mysql', 'mongodb', 'redis', 'sqlite', 'firebase', 'supabase'];
      return keywords.some(k => node.nodeType.toLowerCase().includes(k));
    });

    // 儲存服務
    this.functionalRules.set(FunctionalGroup.STORAGE, (node) => {
      const keywords = ['drive', 'dropbox', 's3', 'box', 'onedrive', 'storage'];
      return keywords.some(k => node.nodeType.toLowerCase().includes(k));
    });

    // AI/機器學習
    this.functionalRules.set(FunctionalGroup.AI_ML, (node) => {
      return node.isAITool === true ||
             ['openai', 'anthropic', 'huggingface', 'langchain', 'ai'].some(k =>
               node.nodeType.toLowerCase().includes(k)
             );
    });

    // 自動化工具
    this.functionalRules.set(FunctionalGroup.AUTOMATION, (node) => {
      return node.isTrigger === true ||
             node.isWebhook === true ||
             ['trigger', 'webhook', 'schedule', 'cron'].some(k =>
               node.nodeType.toLowerCase().includes(k)
             );
    });

    // 分析工具
    this.functionalRules.set(FunctionalGroup.ANALYTICS, (node) => {
      const keywords = ['analytics', 'segment', 'mixpanel', 'amplitude'];
      return keywords.some(k => node.nodeType.toLowerCase().includes(k));
    });

    // 實用工具
    this.functionalRules.set(FunctionalGroup.UTILITY, (node) => {
      const keywords = ['datetime', 'crypto', 'xml', 'json', 'compress', 'pdf', 'html'];
      return keywords.some(k => node.nodeType.toLowerCase().includes(k));
    });
  }

  /**
   * 初始化節點關係規則
   */
  private initializeRelationshipRules(): void {
    // 替代關係：相似功能的不同實作
    this.relationshipRules.push(
      {
        sourceNode: 'Gmail',
        targetNode: 'EmailSend',
        relationshipType: 'alternative',
        description: '兩者都可以發送電子郵件'
      },
      {
        sourceNode: 'PostgresQL',
        targetNode: 'MySQL',
        relationshipType: 'alternative',
        description: '都是關聯式資料庫'
      },
      {
        sourceNode: 'OpenAI',
        targetNode: 'Anthropic',
        relationshipType: 'alternative',
        description: '都是大型語言模型服務'
      }
    );

    // 互補關係：經常一起使用
    this.relationshipRules.push(
      {
        sourceNode: 'Webhook',
        targetNode: 'HTTP Request',
        relationshipType: 'complement',
        description: 'Webhook 接收請求，HTTP Request 發送請求'
      },
      {
        sourceNode: 'Code',
        targetNode: 'Set',
        relationshipType: 'complement',
        description: 'Code 處理複雜邏輯，Set 設定簡單值'
      },
      {
        sourceNode: 'If',
        targetNode: 'Switch',
        relationshipType: 'complement',
        description: '都用於條件判斷和流程分支'
      }
    );

    // 前置關係：一個是另一個的前提
    this.relationshipRules.push(
      {
        sourceNode: 'Trigger',
        targetNode: 'HTTP Request',
        relationshipType: 'prerequisite',
        description: '工作流程需要觸發器才能啟動'
      }
    );

    // 後繼關係：通常在某節點之後使用
    this.relationshipRules.push(
      {
        sourceNode: 'HTTP Request',
        targetNode: 'Set',
        relationshipType: 'successor',
        description: '從 API 取得資料後通常需要轉換'
      }
    );
  }

  /**
   * 對節點進行分組
   *
   * @param nodes 所有節點資訊
   * @returns 分組結果
   */
  group(nodes: NodeInfo[]): GroupingResult {
    const groupedNodes: GroupedNode[] = nodes.map(node => this.classifyNode(node));

    // 按使用頻率分組
    const byFrequency = new Map<UsageFrequency, GroupedNode[]>();
    for (const freq of Object.values(UsageFrequency)) {
      byFrequency.set(freq, []);
    }
    for (const node of groupedNodes) {
      byFrequency.get(node.usageFrequency)!.push(node);
    }

    // 按功能分組
    const byFunction = new Map<FunctionalGroup, GroupedNode[]>();
    for (const func of Object.values(FunctionalGroup)) {
      byFunction.set(func, []);
    }
    for (const node of groupedNodes) {
      for (const func of node.functionalGroups) {
        byFunction.get(func)!.push(node);
      }
    }

    // 建立關係映射
    const relationships = this.buildRelationships(groupedNodes);

    return {
      byFrequency,
      byFunction,
      relationships
    };
  }

  /**
   * 分類單一節點
   */
  private classifyNode(node: NodeInfo): GroupedNode {
    // 判斷使用頻率
    let usageFrequency = UsageFrequency.SPECIALIZED;
    for (const [freq, rule] of this.frequencyRules.entries()) {
      if (rule(node)) {
        usageFrequency = freq;
        break;
      }
    }

    // 判斷功能群組
    const functionalGroups: FunctionalGroup[] = [];
    for (const [group, rule] of this.functionalRules.entries()) {
      if (rule(node)) {
        functionalGroups.push(group);
      }
    }

    // 如果沒有匹配任何功能群組，歸類為實用工具
    if (functionalGroups.length === 0) {
      functionalGroups.push(FunctionalGroup.UTILITY);
    }

    // 產生標籤
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
   * 建立節點關係映射
   */
  private buildRelationships(nodes: GroupedNode[]): NodeRelationship[] {
    const relationships: NodeRelationship[] = [];
    const nodeMap = new Map(nodes.map(n => [this.normalizeNodeType(n.nodeType), n]));

    // 套用預定義規則
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

    // 自動發現相似節點關係
    for (const node of nodes) {
      const related = this.findRelatedNodes(node, nodes);
      node.relatedNodes = related;
    }

    return relationships;
  }

  /**
   * 尋找相關節點
   */
  private findRelatedNodes(node: GroupedNode, allNodes: GroupedNode[]): string[] {
    const related: string[] = [];

    for (const other of allNodes) {
      if (other.nodeType === node.nodeType) continue;

      // 相同功能群組
      const sharedGroups = node.functionalGroups.filter(g =>
        other.functionalGroups.includes(g)
      );

      if (sharedGroups.length > 0) {
        related.push(other.nodeType);
      }
    }

    return related.slice(0, 5); // 最多回傳 5 個相關節點
  }

  /**
   * 產生節點標籤
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
   * 標準化節點類型以便比較
   */
  private normalizeNodeType(nodeType: string): string {
    return nodeType.toLowerCase().split('.').pop() || nodeType.toLowerCase();
  }

  /**
   * 取得特定頻率等級的節點
   */
  getNodesByFrequency(result: GroupingResult, frequency: UsageFrequency): GroupedNode[] {
    return result.byFrequency.get(frequency) || [];
  }

  /**
   * 取得特定功能群組的節點
   */
  getNodesByFunction(result: GroupingResult, group: FunctionalGroup): GroupedNode[] {
    return result.byFunction.get(group) || [];
  }

  /**
   * 產生分組統計
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
