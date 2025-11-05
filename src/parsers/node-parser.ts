/**
 * Copyright (c) 2025 Frank Chen @ www.frankchen.tw/personal
 * SPDX-License-Identifier: MIT
 *
 * This file is part of n8n-skills project.
 */

/**
 * Node type definition
 * Can be a constructor function or an instantiated node
 */
export type NodeClass =
  | (new () => any)
  | { description?: any; nodeVersions?: any };

/**
 * Parsed node information
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
 * Node Parser
 * Extracts basic information and classification from nodes
 */
export class NodeParser {
  /**
   * Parse node class
   * @param nodeClass Node class or instance
   * @param packageName Package name
   * @returns Parsed node information
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
   * Get node description
   * Handles regular nodes and versioned nodes
   */
  private getNodeDescription(nodeClass: NodeClass): any {
    try {
      // If it's a function, try to instantiate it
      if (typeof nodeClass === 'function') {
        const instance = new nodeClass();
        return instance.description || instance.baseDescription || {};
      }

      // Already an instance
      return nodeClass.description || {};
    } catch (e) {
      // Some nodes require parameters to instantiate
      return (nodeClass as any).description || {};
    }
  }

  /**
   * Extract node type name
   * Ensures package prefix is included
   */
  private extractNodeType(description: any, packageName: string): string {
    const name = description.name;

    if (!name) {
      throw new Error('Node is missing name property');
    }

    // If already includes a dot, return directly
    if (name.includes('.')) {
      return name;
    }

    // Add package prefix
    const packagePrefix = packageName.replace('@n8n/', '').replace('n8n-', '');
    return `${packagePrefix}.${name}`;
  }

  /**
   * Extract category
   */
  private extractCategory(description: any): string {
    return description.group?.[0] ||
           description.categories?.[0] ||
           description.category ||
           'misc';
  }

  /**
   * Determine node category
   * Categories: trigger, action, webhook, ai (AI tool)
   */
  private determineNodeCategory(description: any): 'trigger' | 'action' | 'webhook' | 'ai' {
    // Check if it's a trigger node
    if (this.isTrigger(description)) {
      return 'trigger';
    }

    // Check if it's a webhook
    if (this.isWebhook(description)) {
      return 'webhook';
    }

    // Check if it's an AI tool
    if (this.isAITool(description)) {
      return 'ai';
    }

    // Default to action node
    return 'action';
  }

  /**
   * Detect if it's a trigger node
   */
  private isTrigger(description: any): boolean {
    // Check if group contains 'trigger'
    if (description.group?.includes('trigger')) {
      return true;
    }

    // Check other trigger indicators
    return description.polling === true ||
           description.trigger === true ||
           description.eventTrigger === true ||
           description.name?.toLowerCase().includes('trigger');
  }

  /**
   * Detect if it's a webhook node
   */
  private isWebhook(description: any): boolean {
    return description.webhooks?.length > 0 ||
           description.webhook === true ||
           description.name?.toLowerCase().includes('webhook');
  }

  /**
   * Detect if it's an AI tool
   */
  private isAITool(description: any): boolean {
    // Check if marked as usable as tool
    if (description.usableAsTool === true) {
      return true;
    }

    // Check if name contains AI-related keywords
    const aiIndicators = ['openai', 'anthropic', 'huggingface', 'cohere', 'ai'];
    const nodeName = description.name?.toLowerCase() || '';

    return aiIndicators.some(indicator => nodeName.includes(indicator));
  }

  /**
   * Extract version information
   * Priority order:
   * 1. currentVersion (computed property for versioned nodes)
   * 2. description.defaultVersion (explicit default version)
   * 3. nodeVersions (get maximum version)
   * 4. description.version (array or numeric value)
   * 5. Default to "1"
   */
  private extractVersion(nodeClass: NodeClass, description: any): string {
    try {
      const instance = typeof nodeClass === 'function' ? new nodeClass() : nodeClass;

      // Check currentVersion
      if (instance.currentVersion !== undefined) {
        return instance.currentVersion.toString();
      }

      // Check description.defaultVersion
      if (instance.description?.defaultVersion) {
        return instance.description.defaultVersion.toString();
      }

      // Check nodeVersions (get maximum version)
      if (instance.nodeVersions) {
        const versions = Object.keys(instance.nodeVersions).map(Number);
        if (versions.length > 0) {
          const maxVersion = Math.max(...versions);
          if (!isNaN(maxVersion)) {
            return maxVersion.toString();
          }
        }
      }

      // Check description.version
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
      // Instantiation failed, try class-level properties
    }

    // Default version
    return '1';
  }
}
