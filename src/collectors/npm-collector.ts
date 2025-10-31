/**
 * Copyright (c) 2025 Frank Chen @ www.frankchen.tw/personal
 * SPDX-License-Identifier: MIT
 *
 * This file is part of n8n-skills project.
 */

import path from 'path';
import type { INodeTypeBaseDescription, INodeTypeDescription } from 'n8n-workflow';

/**
 * 簡化的節點資訊介面
 * 僅包含關鍵資訊以減少儲存大小
 */
export interface SimplifiedNodeInfo {
  nodeType: string;
  displayName: string;
  description: string;
  category: string;
  packageName: string;
  version: string;
  isVersioned: boolean;
  isTrigger: boolean;
  isWebhook: boolean;
  isAITool: boolean;
  hasCredentials: boolean;
  hasOperations: boolean;
}

/**
 * 載入的節點類別介面
 */
export interface LoadedNode {
  packageName: string;
  nodeName: string;
  NodeClass: any;
}

/**
 * 從 n8n npm 套件收集節點資訊
 *
 * 此收集器會：
 * 1. 載入 n8n-nodes-base 和 @n8n/n8n-nodes-langchain 套件
 * 2. 從 package.json 讀取節點列表
 * 3. 動態載入每個節點類別
 * 4. 提取節點基本資訊
 * 5. 回傳簡化的節點資訊陣列
 */
export class NpmCollector {
  private readonly CORE_PACKAGES = [
    { name: 'n8n-nodes-base', path: 'n8n-nodes-base' },
    { name: '@n8n/n8n-nodes-langchain', path: '@n8n/n8n-nodes-langchain' }
  ];

  /**
   * 收集所有 n8n 節點的簡化資訊
   *
   * @returns 簡化節點資訊陣列
   */
  async collectAll(): Promise<SimplifiedNodeInfo[]> {
    const results: SimplifiedNodeInfo[] = [];

    for (const pkg of this.CORE_PACKAGES) {
      try {
        const loadedNodes = await this.loadPackageNodes(pkg.name, pkg.path);
        const simplifiedNodes = loadedNodes.map(node => this.extractNodeInfo(node));
        results.push(...simplifiedNodes);
      } catch (error) {
        console.error(`載入套件失敗 ${pkg.name}:`, error);
      }
    }

    return results;
  }

  /**
   * 收集所有 n8n 節點的完整資訊（包含 NodeClass）
   *
   * @returns 載入的節點陣列
   */
  async collectAllWithDetails(): Promise<LoadedNode[]> {
    const results: LoadedNode[] = [];

    for (const pkg of this.CORE_PACKAGES) {
      try {
        const loadedNodes = await this.loadPackageNodes(pkg.name, pkg.path);
        results.push(...loadedNodes);
      } catch (error) {
        console.error(`載入套件失敗 ${pkg.name}:`, error);
      }
    }

    return results;
  }

  /**
   * 從單一套件載入所有節點
   *
   * @param packageName 套件名稱
   * @param packagePath 套件路徑
   * @returns 載入的節點陣列
   */
  private async loadPackageNodes(packageName: string, packagePath: string): Promise<LoadedNode[]> {
    try {
      const packageJson = require(`${packagePath}/package.json`);
      const nodes: LoadedNode[] = [];

      const n8nConfig = packageJson.n8n || {};
      const nodesList = n8nConfig.nodes || [];

      if (Array.isArray(nodesList)) {
        // 處理陣列格式（n8n-nodes-base 使用此格式）
        for (const nodePath of nodesList) {
          const loadedNode = this.loadSingleNode(packageName, packagePath, nodePath);
          if (loadedNode) {
            nodes.push(loadedNode);
          }
        }
      } else {
        // 處理物件格式（其他套件可能使用此格式）
        for (const [nodeName, nodePath] of Object.entries(nodesList)) {
          const loadedNode = this.loadSingleNode(packageName, packagePath, nodePath as string, nodeName);
          if (loadedNode) {
            nodes.push(loadedNode);
          }
        }
      }

      return nodes;
    } catch (error) {
      throw new Error(`無法載入套件 ${packageName}: ${(error as Error).message}`);
    }
  }

  /**
   * 載入單一節點類別
   *
   * @param packageName 套件名稱
   * @param packagePath 套件路徑
   * @param nodePath 節點檔案路徑
   * @param nodeNameHint 節點名稱提示（選用）
   * @returns 載入的節點或 null
   */
  private loadSingleNode(
    packageName: string,
    packagePath: string,
    nodePath: string,
    nodeNameHint?: string
  ): LoadedNode | null {
    try {
      const fullPath = require.resolve(`${packagePath}/${nodePath}`);

      // 使用 try-catch 保護 require 過程（避免原生模組載入失敗）
      let nodeModule;
      try {
        nodeModule = require(fullPath);
      } catch (requireError) {
        const errMsg = (requireError as Error).message;
        // 如果是 segfault 相關錯誤，記錄但不中斷
        if (errMsg.includes('segmentation') || errMsg.includes('SIGSEGV')) {
          console.error(`嚴重錯誤 - 跳過節點 ${packageName}/${nodePath}: segmentation fault`);
          return null;
        }
        throw requireError;
      }

      // 從路徑提取節點名稱（例如："dist/nodes/Slack/Slack.node.js" -> "Slack"）
      const nodeNameMatch = nodePath.match(/\/([^\/]+)\.node\.(js|ts)$/);
      const nodeName = nodeNameHint || (nodeNameMatch ? nodeNameMatch[1] : path.basename(nodePath, '.node.js'));

      // 處理不同的匯出模式
      const NodeClass = nodeModule.default || nodeModule[nodeName] || Object.values(nodeModule)[0];

      if (NodeClass) {
        return { packageName, nodeName, NodeClass };
      }

      console.warn(`找不到有效的節點匯出: ${nodeName} in ${packageName}`);
      return null;
    } catch (error) {
      const errMsg = (error as Error).message;
      console.error(`載入節點失敗 ${packageName}/${nodePath}:`, errMsg);
      return null;
    }
  }

  /**
   * 從節點類別提取簡化資訊
   *
   * @param loadedNode 載入的節點
   * @returns 簡化的節點資訊
   */
  private extractNodeInfo(loadedNode: LoadedNode): SimplifiedNodeInfo {
    const { packageName, nodeName, NodeClass } = loadedNode;

    try {
      const description = this.getNodeDescription(NodeClass);

      return {
        nodeType: this.extractNodeType(description, packageName),
        displayName: description.displayName || nodeName,
        description: description.description || '',
        category: this.extractCategory(description),
        packageName,
        version: this.extractVersion(NodeClass, description),
        isVersioned: this.isVersionedNode(NodeClass),
        isTrigger: this.detectTrigger(description),
        isWebhook: this.detectWebhook(description),
        isAITool: this.detectAITool(description),
        hasCredentials: this.hasCredentials(description),
        hasOperations: this.hasOperations(description)
      };
    } catch (error) {
      // 回傳最基本的資訊
      return {
        nodeType: `${packageName}.${nodeName}`,
        displayName: nodeName,
        description: '',
        category: 'misc',
        packageName,
        version: '1',
        isVersioned: false,
        isTrigger: false,
        isWebhook: false,
        isAITool: false,
        hasCredentials: false,
        hasOperations: false
      };
    }
  }

  /**
   * 取得節點描述
   *
   * @param nodeClass 節點類別
   * @returns 節點描述
   */
  private getNodeDescription(nodeClass: any): INodeTypeBaseDescription | INodeTypeDescription {
    try {
      // 優先嘗試從靜態屬性取得（避免實例化可能的原生模組）
      if (nodeClass.description) {
        return nodeClass.description;
      }

      // 嘗試實例化節點（使用 timeout 保護）
      const instance = typeof nodeClass === 'function' ? new nodeClass() : nodeClass;

      // 檢查是否為版本化節點
      if (instance?.nodeVersions) {
        return instance.description || instance.baseDescription || ({} as INodeTypeBaseDescription);
      }

      return instance?.description || ({} as INodeTypeBaseDescription);
    } catch (error) {
      // 實例化失敗時的容錯處理
      try {
        // 嘗試從 prototype 取得
        if (nodeClass.prototype?.description) {
          return nodeClass.prototype.description;
        }
      } catch {
        // 忽略
      }

      return {} as INodeTypeBaseDescription;
    }
  }

  /**
   * 提取完整的節點類型名稱
   *
   * @param description 節點描述
   * @param packageName 套件名稱
   * @returns 完整節點類型（例如：nodes-base.Slack）
   */
  private extractNodeType(description: INodeTypeBaseDescription | INodeTypeDescription, packageName: string): string {
    const name = description.name || '';

    if (name.includes('.')) {
      return name;
    }

    // 加入套件前綴
    const packagePrefix = packageName.replace('@n8n/', '').replace('n8n-', '');
    return `${packagePrefix}.${name}`;
  }

  /**
   * 提取節點分類
   *
   * @param description 節點描述
   * @returns 分類名稱
   */
  private extractCategory(description: INodeTypeBaseDescription | INodeTypeDescription): string {
    const desc = description as any;
    return desc.group?.[0] || desc.categories?.[0] || desc.category || 'misc';
  }

  /**
   * 提取節點版本
   *
   * @param nodeClass 節點類別
   * @param description 節點描述
   * @returns 版本字串
   */
  private extractVersion(nodeClass: any, description: INodeTypeBaseDescription | INodeTypeDescription): string {
    try {
      // 優先從 description 取得版本（避免實例化）
      const desc = description as any;
      if (desc?.version) {
        if (Array.isArray(desc.version)) {
          const numericVersions = desc.version.map((v: any) => parseFloat(v.toString()));
          const maxVersion = Math.max(...numericVersions);
          if (!isNaN(maxVersion)) {
            return maxVersion.toString();
          }
        } else {
          return desc.version.toString();
        }
      }

      if (desc?.defaultVersion) {
        return desc.defaultVersion.toString();
      }

      // 嘗試從靜態屬性取得
      if (nodeClass.currentVersion !== undefined) {
        return nodeClass.currentVersion.toString();
      }

      // 最後才嘗試實例化
      try {
        const instance = typeof nodeClass === 'function' ? new nodeClass() : nodeClass;
        const inst = instance as any;

        if (inst?.currentVersion !== undefined) {
          return inst.currentVersion.toString();
        }

        if (inst?.description?.defaultVersion) {
          return inst.description.defaultVersion.toString();
        }

        if (inst?.nodeVersions) {
          const versions = Object.keys(inst.nodeVersions).map(Number);
          if (versions.length > 0) {
            const maxVersion = Math.max(...versions);
            if (!isNaN(maxVersion)) {
              return maxVersion.toString();
            }
          }
        }
      } catch {
        // 實例化失敗，使用預設值
      }
    } catch (error) {
      // 忽略錯誤，使用預設值
    }

    return '1';
  }

  /**
   * 檢測是否為版本化節點
   *
   * @param nodeClass 節點類別
   * @returns 是否為版本化節點
   */
  private isVersionedNode(nodeClass: any): boolean {
    try {
      // 優先檢查靜態屬性
      if (nodeClass.nodeVersions || nodeClass.baseDescription?.defaultVersion) {
        return true;
      }

      // 嘗試實例化檢查
      try {
        const instance = typeof nodeClass === 'function' ? new nodeClass() : nodeClass;
        const inst = instance as any;
        return !!(inst?.nodeVersions || inst?.baseDescription?.defaultVersion);
      } catch {
        return false;
      }
    } catch (error) {
      return false;
    }
  }

  /**
   * 檢測是否為觸發器節點
   *
   * @param description 節點描述
   * @returns 是否為觸發器
   */
  private detectTrigger(description: INodeTypeBaseDescription | INodeTypeDescription): boolean {
    const desc = description as any;

    if (description.group && Array.isArray(description.group)) {
      if (description.group.includes('trigger')) {
        return true;
      }
    }

    return desc.polling === true ||
           desc.trigger === true ||
           desc.eventTrigger === true ||
           description.name?.toLowerCase().includes('trigger') || false;
  }

  /**
   * 檢測是否為 Webhook 節點
   *
   * @param description 節點描述
   * @returns 是否為 Webhook
   */
  private detectWebhook(description: INodeTypeBaseDescription | INodeTypeDescription): boolean {
    const desc = description as any;
    return desc.webhooks?.length > 0 ||
           desc.webhook === true ||
           description.name?.toLowerCase().includes('webhook') || false;
  }

  /**
   * 檢測是否為 AI 工具節點
   *
   * @param description 節點描述
   * @returns 是否為 AI 工具
   */
  private detectAITool(description: INodeTypeBaseDescription | INodeTypeDescription): boolean {
    const desc = description as any;
    const codex = desc.codex || {};
    return codex.categories?.includes('AI') ||
           codex.subcategories?.AI?.length > 0 ||
           desc.usableAsTool === true ||
           false;
  }

  /**
   * 檢測節點是否需要認證
   *
   * @param description 節點描述
   * @returns 是否需要認證
   */
  private hasCredentials(description: INodeTypeBaseDescription | INodeTypeDescription): boolean {
    const desc = description as any;
    return Array.isArray(desc.credentials) && desc.credentials.length > 0;
  }

  /**
   * 檢測節點是否有操作選項
   *
   * @param description 節點描述
   * @returns 是否有操作選項
   */
  private hasOperations(description: INodeTypeBaseDescription | INodeTypeDescription): boolean {
    const desc = description as any;
    if (!Array.isArray(desc.properties)) {
      return false;
    }

    return desc.properties.some((prop: any) =>
      prop.name === 'operation' ||
      prop.name === 'resource' ||
      prop.type === 'options' && prop.options?.length > 0
    );
  }
}
