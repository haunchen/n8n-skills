/**
 * Copyright (c) 2025 Frank Chen @ www.frankchen.tw/personal
 * SPDX-License-Identifier: MIT
 *
 * This file is part of n8n-skills project.
 */

import type { NodeClass } from './node-parser';

/**
 * Simplified property information
 * Contains only core fields
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
 * Operation information
 */
export interface Operation {
  name: string;
  value: string;
  description?: string;
  resource?: string;
}

/**
 * Parsed property information
 */
export interface ParsedProperties {
  coreProperties: CoreProperty[];
  operations: Operation[];
  hasCredentials: boolean;
  totalPropertyCount: number;
}

/**
 * Property Parser
 * Extracts node's core properties (maximum 10) and operation list
 */
export class PropertyParser {
  private readonly MAX_CORE_PROPERTIES = 10;

  /**
   * Parse node properties
   * @param nodeClass Node class or instance
   * @returns Parsed property information
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
   * Extract all properties
   * Handles versioned nodes and regular nodes
   */
  private extractAllProperties(nodeClass: NodeClass): any[] {
    try {
      const instance = typeof nodeClass === 'function' ? new nodeClass() : nodeClass;

      // Handle versioned nodes
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

      // Regular nodes
      const description = instance.description || instance.baseDescription;
      return description?.properties || [];
    } catch (e) {
      return [];
    }
  }

  /**
   * Select core properties
   * Prioritize required and important properties, maximum 10
   */
  private selectCoreProperties(properties: any[]): CoreProperty[] {
    if (properties.length === 0) {
      return [];
    }

    // Score properties by priority
    const scoredProperties = properties.map(prop => ({
      property: prop,
      score: this.calculatePropertyScore(prop)
    }));

    // Sort by score
    scoredProperties.sort((a, b) => b.score - a.score);

    // Take top 10
    return scoredProperties
      .slice(0, this.MAX_CORE_PROPERTIES)
      .map(({ property }) => this.normalizeProperty(property));
  }

  /**
   * Calculate property importance score
   * Required properties and properties with specific names have higher scores
   */
  private calculatePropertyScore(property: any): number {
    let score = 0;

    // Required property +10 points
    if (property.required === true) {
      score += 10;
    }

    // Important property names
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

    // Properties with options +3 points (usually important selections)
    if (property.options?.length > 0) {
      score += 3;
    }

    // Properties with description +1 point
    if (property.description) {
      score += 1;
    }

    return score;
  }

  /**
   * Normalize property to unified format
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
   * Extract operation list
   * Supports declarative and programmatic nodes
   */
  private extractOperations(nodeClass: NodeClass): Operation[] {
    try {
      const instance = typeof nodeClass === 'function' ? new nodeClass() : nodeClass;

      // Handle versioned nodes
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

      // Declarative node (has routing)
      if (description.routing) {
        return this.extractDeclarativeOperations(description);
      }

      // Programmatic node (find operation from properties)
      return this.extractProgrammaticOperations(description);
    } catch (e) {
      return [];
    }
  }

  /**
   * Extract operations from declarative node
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
   * Extract operations from programmatic node
   */
  private extractProgrammaticOperations(description: any): Operation[] {
    const operations: Operation[] = [];

    if (!description.properties) {
      return operations;
    }

    // Find property named 'operation' or 'action'
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
   * Extract credential information
   */
  private extractCredentials(nodeClass: NodeClass): any[] {
    try {
      const instance = typeof nodeClass === 'function' ? new nodeClass() : nodeClass;

      // Handle versioned nodes
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

      // Regular nodes
      const description = instance.description || instance.baseDescription;
      return description?.credentials || [];
    } catch (e) {
      return [];
    }
  }
}
