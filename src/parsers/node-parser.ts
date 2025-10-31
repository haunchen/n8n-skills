/**
 * Copyright (c) 2025 Frank Chen @ www.frankchen.tw/personal
 * SPDX-License-Identifier: MIT
 *
 * This file is part of n8n-skills project.
 */

/**
 * 節點類型定義
 * 可以是建構函式或已實例化的節點
 */
export type NodeClass =
  | (new () => any)
  | { description?: any; nodeVersions?: any };

/**
 * 解析後的節點資訊
 */
export interface ParsedNode {
  nodeType: string;
  displayName: string;
  description?: string;
  category?: string;
  nodeCategory: 'trigger' | 'action' | 'webhook' | 'ai';
  version: string;
  packageName: string;
}

/**
 * 節點解析器
 * 提取節點的基本資訊和分類
 */
export class NodeParser {
  /**
   * 解析節點類別
   * @param nodeClass 節點類別或實例
   * @param packageName 套件名稱
   * @returns 解析後的節點資訊
   */
  parse(nodeClass: NodeClass, packageName: string): ParsedNode {
    const description = this.getNodeDescription(nodeClass);

    return {
      nodeType: this.extractNodeType(description, packageName),
      displayName: description.displayName || description.name || 'Unknown',
      description: description.description,
      category: this.extractCategory(description),
      nodeCategory: this.determineNodeCategory(description),
      version: this.extractVersion(nodeClass, description),
      packageName
    };
  }

  /**
   * 取得節點描述
   * 處理一般節點和版本化節點
   */
  private getNodeDescription(nodeClass: NodeClass): any {
    try {
      // 如果是函式，嘗試實例化
      if (typeof nodeClass === 'function') {
        const instance = new nodeClass();
        return instance.description || instance.baseDescription || {};
      }

      // 已經是實例
      return nodeClass.description || {};
    } catch (e) {
      // 某些節點需要參數才能實例化
      return (nodeClass as any).description || {};
    }
  }

  /**
   * 提取節點類型名稱
   * 確保包含套件前綴
   */
  private extractNodeType(description: any, packageName: string): string {
    const name = description.name;

    if (!name) {
      throw new Error('節點缺少 name 屬性');
    }

    // 如果已包含點號，直接返回
    if (name.includes('.')) {
      return name;
    }

    // 加上套件前綴
    const packagePrefix = packageName.replace('@n8n/', '').replace('n8n-', '');
    return `${packagePrefix}.${name}`;
  }

  /**
   * 提取分類
   */
  private extractCategory(description: any): string {
    return description.group?.[0] ||
           description.categories?.[0] ||
           description.category ||
           'misc';
  }

  /**
   * 判斷節點類型
   * 分為 trigger（觸發）、action（動作）、webhook、ai（AI工具）
   */
  private determineNodeCategory(description: any): 'trigger' | 'action' | 'webhook' | 'ai' {
    // 檢查是否為觸發節點
    if (this.isTrigger(description)) {
      return 'trigger';
    }

    // 檢查是否為 webhook
    if (this.isWebhook(description)) {
      return 'webhook';
    }

    // 檢查是否為 AI 工具
    if (this.isAITool(description)) {
      return 'ai';
    }

    // 預設為動作節點
    return 'action';
  }

  /**
   * 偵測是否為觸發節點
   */
  private isTrigger(description: any): boolean {
    // 檢查 group 是否包含 'trigger'
    if (description.group?.includes('trigger')) {
      return true;
    }

    // 檢查其他觸發指標
    return description.polling === true ||
           description.trigger === true ||
           description.eventTrigger === true ||
           description.name?.toLowerCase().includes('trigger');
  }

  /**
   * 偵測是否為 webhook 節點
   */
  private isWebhook(description: any): boolean {
    return description.webhooks?.length > 0 ||
           description.webhook === true ||
           description.name?.toLowerCase().includes('webhook');
  }

  /**
   * 偵測是否為 AI 工具
   */
  private isAITool(description: any): boolean {
    // 檢查是否標記為可用作工具
    if (description.usableAsTool === true) {
      return true;
    }

    // 檢查名稱中是否包含 AI 相關關鍵字
    const aiIndicators = ['openai', 'anthropic', 'huggingface', 'cohere', 'ai'];
    const nodeName = description.name?.toLowerCase() || '';

    return aiIndicators.some(indicator => nodeName.includes(indicator));
  }

  /**
   * 提取版本資訊
   * 優先順序：
   * 1. currentVersion（版本化節點的計算屬性）
   * 2. description.defaultVersion（明確的預設版本）
   * 3. nodeVersions（取最大版本）
   * 4. description.version（陣列或數值）
   * 5. 預設為 "1"
   */
  private extractVersion(nodeClass: NodeClass, description: any): string {
    try {
      const instance = typeof nodeClass === 'function' ? new nodeClass() : nodeClass;

      // 檢查 currentVersion
      if (instance.currentVersion !== undefined) {
        return instance.currentVersion.toString();
      }

      // 檢查 description.defaultVersion
      if (instance.description?.defaultVersion) {
        return instance.description.defaultVersion.toString();
      }

      // 檢查 nodeVersions（取最大版本）
      if (instance.nodeVersions) {
        const versions = Object.keys(instance.nodeVersions).map(Number);
        if (versions.length > 0) {
          const maxVersion = Math.max(...versions);
          if (!isNaN(maxVersion)) {
            return maxVersion.toString();
          }
        }
      }

      // 檢查 description.version
      if (description.version) {
        if (Array.isArray(description.version)) {
          const numericVersions = description.version.map((v: any) => parseFloat(v.toString()));
          const maxVersion = Math.max(...numericVersions);
          if (!isNaN(maxVersion)) {
            return maxVersion.toString();
          }
        } else {
          return description.version.toString();
        }
      }
    } catch (e) {
      // 實例化失敗，嘗試類別層級屬性
    }

    // 預設版本
    return '1';
  }
}
