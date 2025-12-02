/**
 * Copyright (c) 2025 Frank Chen @ www.frankchen.tw/personal
 * SPDX-License-Identifier: MIT
 *
 * This file is part of n8n-skills project.
 */

import path from 'path';
import type { INodeTypeBaseDescription, INodeTypeDescription } from 'n8n-workflow';

/**
 * Simplified node information interface
 * Contains only key information to reduce storage size
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
 * Loaded node class interface
 */
export interface LoadedNode {
  packageName: string;
  nodeName: string;
  NodeClass: any;
}

/**
 * Collects node information from n8n npm packages
 *
 * This collector will:
 * 1. Load n8n-nodes-base and @n8n/n8n-nodes-langchain packages
 * 2. Read node list from package.json
 * 3. Dynamically load each node class
 * 4. Extract basic node information
 * 5. Return simplified node information array
 */
export class NpmCollector {
  private readonly CORE_PACKAGES = [
    { name: 'n8n-nodes-base', path: 'n8n-nodes-base' },
    { name: '@n8n/n8n-nodes-langchain', path: '@n8n/n8n-nodes-langchain' }
  ];

  /**
   * Collects simplified information for all n8n nodes
   *
   * @returns Array of simplified node information
   */
  async collectAll(): Promise<SimplifiedNodeInfo[]> {
    const results: SimplifiedNodeInfo[] = [];

    for (const pkg of this.CORE_PACKAGES) {
      try {
        const loadedNodes = await this.loadPackageNodes(pkg.name, pkg.path);
        const simplifiedNodes = loadedNodes.map(node => this.extractNodeInfo(node));
        results.push(...simplifiedNodes);
      } catch (error) {
        console.error(`Failed to load package ${pkg.name}:`, error);
      }
    }

    return results;
  }

  /**
   * Collects complete information for all n8n nodes (including NodeClass)
   *
   * @returns Array of loaded nodes
   */
  async collectAllWithDetails(): Promise<LoadedNode[]> {
    const results: LoadedNode[] = [];

    for (const pkg of this.CORE_PACKAGES) {
      try {
        const loadedNodes = await this.loadPackageNodes(pkg.name, pkg.path);
        results.push(...loadedNodes);
      } catch (error) {
        console.error(`Failed to load package ${pkg.name}:`, error);
      }
    }

    return results;
  }

  /**
   * Loads all nodes from a single package
   *
   * @param packageName Package name
   * @param packagePath Package path
   * @returns Array of loaded nodes
   */
  private async loadPackageNodes(packageName: string, packagePath: string): Promise<LoadedNode[]> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const packageJson = require(`${packagePath}/package.json`);
      const nodes: LoadedNode[] = [];

      const n8nConfig = packageJson.n8n || {};
      const nodesList = n8nConfig.nodes || [];

      // Detect if running in CI environment
      const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';

      if (Array.isArray(nodesList)) {
        // Handle array format (used by n8n-nodes-base)
        for (const nodePath of nodesList) {
          if (isCI) {
            console.log(`[CI] Loading: ${packageName}/${nodePath}`);
          }
          const loadedNode = this.loadSingleNode(packageName, packagePath, nodePath);
          if (loadedNode) {
            nodes.push(loadedNode);
          }
        }
      } else {
        // Handle object format (may be used by other packages)
        for (const [nodeName, nodePath] of Object.entries(nodesList)) {
          if (isCI) {
            console.log(`[CI] Loading: ${packageName}/${nodePath}`);
          }
          const loadedNode = this.loadSingleNode(packageName, packagePath, nodePath as string, nodeName);
          if (loadedNode) {
            nodes.push(loadedNode);
          }
        }
      }

      return nodes;
    } catch (error) {
      throw new Error(`Cannot load package ${packageName}: ${(error as Error).message}`);
    }
  }

  /**
   * Loads a single node class
   *
   * @param packageName Package name
   * @param packagePath Package path
   * @param nodePath Node file path
   * @param nodeNameHint Node name hint (optional)
   * @returns Loaded node or null
   */
  private loadSingleNode(
    packageName: string,
    packagePath: string,
    nodePath: string,
    nodeNameHint?: string
  ): LoadedNode | null {
    try {
      const fullPath = require.resolve(`${packagePath}/${nodePath}`);

      // Use try-catch to protect require process (avoid native module loading failures)
      let nodeModule;
      try {
        nodeModule = require(fullPath);
      } catch (requireError) {
        const errMsg = (requireError as Error).message;
        // If segfault related error, log but don't interrupt
        if (errMsg.includes('segmentation') || errMsg.includes('SIGSEGV')) {
          console.error(`Critical error - Skipping node ${packageName}/${nodePath}: segmentation fault`);
          return null;
        }
        throw requireError;
      }

      // Extract node name from path (e.g., "dist/nodes/Slack/Slack.node.js" -> "Slack")
      const nodeNameMatch = nodePath.match(/\/([^/]+)\.node\.(js|ts)$/);
      const nodeName = nodeNameHint || (nodeNameMatch ? nodeNameMatch[1] : path.basename(nodePath, '.node.js'));

      // Handle different export modes
      const NodeClass = nodeModule.default || nodeModule[nodeName] || Object.values(nodeModule)[0];

      if (NodeClass) {
        return { packageName, nodeName, NodeClass };
      }

      console.warn(`Cannot find valid node export: ${nodeName} in ${packageName}`);
      return null;
    } catch (error) {
      const errMsg = (error as Error).message;
      console.error(`Failed to load node ${packageName}/${nodePath}:`, errMsg);
      return null;
    }
  }

  /**
   * Extracts simplified information from node class
   *
   * @param loadedNode Loaded node
   * @returns Simplified node information
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
      // Return minimal information
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
   * Gets node description
   *
   * @param nodeClass Node class
   * @returns Node description
   */
  private getNodeDescription(nodeClass: any): INodeTypeBaseDescription | INodeTypeDescription {
    try {
      // Try to get from static properties first (avoid instantiating potential native modules)
      if (nodeClass.description) {
        return nodeClass.description;
      }

      // Try to instantiate node (with timeout protection)
      const instance = typeof nodeClass === 'function' ? new nodeClass() : nodeClass;

      // Check if it's a versioned node
      if (instance?.nodeVersions) {
        return instance.description || instance.baseDescription || ({} as INodeTypeBaseDescription);
      }

      return instance?.description || ({} as INodeTypeBaseDescription);
    } catch (error) {
      // Fallback handling when instantiation fails
      try {
        // Try to get from prototype
        if (nodeClass.prototype?.description) {
          return nodeClass.prototype.description;
        }
      } catch {
        // Ignore
      }

      return {} as INodeTypeBaseDescription;
    }
  }

  /**
   * Extracts full node type name
   *
   * @param description Node description
   * @param packageName Package name
   * @returns Full node type (e.g., nodes-base.Slack)
   */
  private extractNodeType(description: INodeTypeBaseDescription | INodeTypeDescription, packageName: string): string {
    const name = description.name || '';

    if (name.includes('.')) {
      return name;
    }

    // Add package prefix
    const packagePrefix = packageName.replace('@n8n/', '').replace('n8n-', '');
    return `${packagePrefix}.${name}`;
  }

  /**
   * Extracts node category
   *
   * @param description Node description
   * @returns Category name
   */
  private extractCategory(description: INodeTypeBaseDescription | INodeTypeDescription): string {
    const desc = description as any;
    return desc.group?.[0] || desc.categories?.[0] || desc.category || 'misc';
  }

  /**
   * Extracts node version
   *
   * @param nodeClass Node class
   * @param description Node description
   * @returns Version string
   */
  private extractVersion(nodeClass: any, description: INodeTypeBaseDescription | INodeTypeDescription): string {
    try {
      // Get version from description first (avoid instantiation)
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

      // Try to get from static properties
      if (nodeClass.currentVersion !== undefined) {
        return nodeClass.currentVersion.toString();
      }

      // Try instantiation as last resort
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
        // Instantiation failed, use default value
      }
    } catch (error) {
      // Ignore error, use default value
    }

    return '1';
  }

  /**
   * Detects if node is versioned
   *
   * @param nodeClass Node class
   * @returns Whether node is versioned
   */
  private isVersionedNode(nodeClass: any): boolean {
    try {
      // Check static properties first
      if (nodeClass.nodeVersions || nodeClass.baseDescription?.defaultVersion) {
        return true;
      }

      // Try instantiation check
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
   * Detects if node is a trigger
   *
   * @param description Node description
   * @returns Whether node is a trigger
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
   * Detects if node is a Webhook
   *
   * @param description Node description
   * @returns Whether node is a Webhook
   */
  private detectWebhook(description: INodeTypeBaseDescription | INodeTypeDescription): boolean {
    const desc = description as any;
    return desc.webhooks?.length > 0 ||
           desc.webhook === true ||
           description.name?.toLowerCase().includes('webhook') || false;
  }

  /**
   * Detects if node is an AI tool
   *
   * @param description Node description
   * @returns Whether node is an AI tool
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
   * Detects if node requires credentials
   *
   * @param description Node description
   * @returns Whether node requires credentials
   */
  private hasCredentials(description: INodeTypeBaseDescription | INodeTypeDescription): boolean {
    const desc = description as any;
    return Array.isArray(desc.credentials) && desc.credentials.length > 0;
  }

  /**
   * Detects if node has operation options
   *
   * @param description Node description
   * @returns Whether node has operation options
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
