/**
 * Copyright (c) 2025 Frank Chen @ www.frankchen.tw/personal
 * SPDX-License-Identifier: MIT
 *
 * This file is part of n8n-skills project.
 */

import type { NodeClass } from './node-parser';

/**
 * 精簡的屬性資訊
 * 只包含核心欄位
 */
export interface CoreProperty {
  name: string;
  displayName: string;
  type: string;
  description?: string;
  required: boolean;
  default?: any;
  options?: Array<{ name: string; value: string; description?: string }>;
}

/**
 * 操作資訊
 */
export interface Operation {
  name: string;
  value: string;
  description?: string;
  resource?: string;
}

/**
 * 解析後的屬性資訊
 */
export interface ParsedProperties {
  coreProperties: CoreProperty[];
  operations: Operation[];
  hasCredentials: boolean;
  totalPropertyCount: number;
}

/**
 * 屬性解析器
 * 提取節點的核心屬性（限制最多 10 個）和操作列表
 */
export class PropertyParser {
  private readonly MAX_CORE_PROPERTIES = 10;

  /**
   * 解析節點屬性
   * @param nodeClass 節點類別或實例
   * @returns 解析後的屬性資訊
   */
  parse(nodeClass: NodeClass): ParsedProperties {
    const allProperties = this.extractAllProperties(nodeClass);
    const operations = this.extractOperations(nodeClass);
    const credentials = this.extractCredentials(nodeClass);

    return {
      coreProperties: this.selectCoreProperties(allProperties),
      operations,
      hasCredentials: credentials.length > 0,
      totalPropertyCount: allProperties.length
    };
  }

  /**
   * 提取所有屬性
   * 處理版本化節點和一般節點
   */
  private extractAllProperties(nodeClass: NodeClass): any[] {
    try {
      const instance = typeof nodeClass === 'function' ? new nodeClass() : nodeClass;

      // 處理版本化節點
      if (instance.nodeVersions) {
        const versions = Object.keys(instance.nodeVersions).map(Number);
        if (versions.length > 0) {
          const latestVersion = Math.max(...versions);
          const versionedNode = instance.nodeVersions[latestVersion];
          if (versionedNode?.description?.properties) {
            return versionedNode.description.properties;
          }
        }
      }

      // 一般節點
      const description = instance.description || instance.baseDescription;
      return description?.properties || [];
    } catch (e) {
      return [];
    }
  }

  /**
   * 選擇核心屬性
   * 優先選擇必填屬性和重要屬性，最多 10 個
   */
  private selectCoreProperties(properties: any[]): CoreProperty[] {
    if (properties.length === 0) {
      return [];
    }

    // 屬性優先順序評分
    const scoredProperties = properties.map(prop => ({
      property: prop,
      score: this.calculatePropertyScore(prop)
    }));

    // 按分數排序
    scoredProperties.sort((a, b) => b.score - a.score);

    // 取前 10 個
    return scoredProperties
      .slice(0, this.MAX_CORE_PROPERTIES)
      .map(({ property }) => this.normalizeProperty(property));
  }

  /**
   * 計算屬性重要性分數
   * 必填屬性和特定名稱的屬性有較高分數
   */
  private calculatePropertyScore(property: any): number {
    let score = 0;

    // 必填屬性 +10 分
    if (property.required === true) {
      score += 10;
    }

    // 重要的屬性名稱
    const importantNames = [
      'resource',
      'operation',
      'action',
      'method',
      'url',
      'authentication',
      'credentials',
      'apiKey',
      'value',
      'field',
      'query',
      'path'
    ];

    if (importantNames.includes(property.name)) {
      score += 5;
    }

    // 有選項的屬性 +3 分（通常是重要的選擇）
    if (property.options?.length > 0) {
      score += 3;
    }

    // 有描述的屬性 +1 分
    if (property.description) {
      score += 1;
    }

    return score;
  }

  /**
   * 正規化屬性為統一格式
   */
  private normalizeProperty(property: any): CoreProperty {
    return {
      name: property.name,
      displayName: property.displayName || property.name,
      type: property.type,
      description: property.description,
      required: property.required === true,
      default: property.default,
      options: property.options?.map((opt: any) => ({
        name: opt.name,
        value: opt.value,
        description: opt.description
      }))
    };
  }

  /**
   * 提取操作列表
   * 支援宣告式和程式化節點
   */
  private extractOperations(nodeClass: NodeClass): Operation[] {
    try {
      const instance = typeof nodeClass === 'function' ? new nodeClass() : nodeClass;

      // 處理版本化節點
      let description;
      if (instance.nodeVersions) {
        const versions = Object.keys(instance.nodeVersions).map(Number);
        if (versions.length > 0) {
          const latestVersion = Math.max(...versions);
          description = instance.nodeVersions[latestVersion]?.description;
        }
      } else {
        description = instance.description || instance.baseDescription;
      }

      if (!description) {
        return [];
      }

      // 宣告式節點（有 routing）
      if (description.routing) {
        return this.extractDeclarativeOperations(description);
      }

      // 程式化節點（從 properties 中找 operation）
      return this.extractProgrammaticOperations(description);
    } catch (e) {
      return [];
    }
  }

  /**
   * 提取宣告式節點的操作
   */
  private extractDeclarativeOperations(description: any): Operation[] {
    const operations: Operation[] = [];
    const routing = description.routing;

    if (!routing?.request) {
      return operations;
    }

    const resources = routing.request.resource?.options || [];
    const operationOptions = routing.request.operation?.options || {};

    resources.forEach((resource: any) => {
      const resourceOps = operationOptions[resource.value] || [];
      resourceOps.forEach((op: any) => {
        operations.push({
          name: op.name,
          value: op.value,
          description: op.description || op.action,
          resource: resource.value
        });
      });
    });

    return operations;
  }

  /**
   * 提取程式化節點的操作
   */
  private extractProgrammaticOperations(description: any): Operation[] {
    const operations: Operation[] = [];

    if (!description.properties) {
      return operations;
    }

    // 尋找名為 'operation' 或 'action' 的屬性
    const operationProp = description.properties.find(
      (p: any) => p.name === 'operation' || p.name === 'action'
    );

    if (operationProp?.options) {
      operationProp.options.forEach((op: any) => {
        operations.push({
          name: op.name,
          value: op.value,
          description: op.description
        });
      });
    }

    return operations;
  }

  /**
   * 提取憑證資訊
   */
  private extractCredentials(nodeClass: NodeClass): any[] {
    try {
      const instance = typeof nodeClass === 'function' ? new nodeClass() : nodeClass;

      // 處理版本化節點
      if (instance.nodeVersions) {
        const versions = Object.keys(instance.nodeVersions).map(Number);
        if (versions.length > 0) {
          const latestVersion = Math.max(...versions);
          const versionedNode = instance.nodeVersions[latestVersion];
          if (versionedNode?.description?.credentials) {
            return versionedNode.description.credentials;
          }
        }
      }

      // 一般節點
      const description = instance.description || instance.baseDescription;
      return description?.credentials || [];
    } catch (e) {
      return [];
    }
  }
}
