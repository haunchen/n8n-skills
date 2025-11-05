/**
 * Copyright (c) 2025 Frank Chen @ www.frankchen.tw/personal
 * SPDX-License-Identifier: MIT
 *
 * This file is part of n8n-skills project.
 */

import type {
  INodeTypeDescription,
  INodeInputConfiguration,
  INodeOutputConfiguration,
  NodeConnectionType
} from 'n8n-workflow';
import { AI_NODE_INPUTS_MAP, getAINodeInputs } from '../utils/ai-node-inputs';

/**
 * Node input/output information
 */
export interface NodeInputOutputInfo {
  nodeType: string;
  version: string;
  inputs: Array<string | INodeInputConfiguration>;
  outputs: Array<string | INodeOutputConfiguration>;
  inputTypes: NodeConnectionType[];
  outputTypes: NodeConnectionType[];
  isMultiInput: boolean;
  isMultiOutput: boolean;
  requiresSpecialInputs: boolean;
  hasErrorOutput: boolean;
  outputCount: number;
  outputNames: string[];
  isDynamicOutput: boolean;
}

/**
 * Input/Output Parser
 * Extracts input/output configuration from n8n node classes
 */
export class InputOutputParser {
  /**
   * Extract input/output configuration from node class
   * @param nodeClass Node class or instance
   * @returns Node I/O information
   */
  parseNodeInputOutput(nodeClass: any): NodeInputOutputInfo {
    const desc = this.getNodeDescription(nodeClass);
    const nodeType = desc.name || '';

    const inputs = this.normalizeInputs(desc.inputs, nodeType);
    const outputs = this.normalizeOutputs(desc.outputs);
    const isDynamicOutput = this.isDynamicOutputs(desc.outputs);
    const outputNames = this.extractOutputNames(desc, outputs);

    // Calculate output count: use outputNames length for dynamic outputs, otherwise use outputs length
    const outputCount = isDynamicOutput ? outputNames.length : outputs.length;
    const isMultiOutput = isDynamicOutput ? outputNames.length > 1 : outputs.length > 1;

    return {
      nodeType,
      version: this.extractVersion(desc),
      inputs,
      outputs,
      inputTypes: this.extractInputTypes(inputs),
      outputTypes: isDynamicOutput ? ['main'] : this.extractOutputTypes(outputs),
      isMultiInput: inputs.length > 1,
      isMultiOutput,
      requiresSpecialInputs: this.hasSpecialInputs(inputs),
      hasErrorOutput: this.hasErrorOutput(outputs),
      outputCount,
      outputNames,
      isDynamicOutput
    };
  }

  /**
   * Get node description
   * Handles versioned nodes and regular nodes
   */
  private getNodeDescription(nodeClass: any): INodeTypeDescription {
    try {
      const instance = typeof nodeClass === 'function' ? new nodeClass() : nodeClass;

      // Handle versioned nodes
      if (instance.nodeVersions) {
        const versions = Object.keys(instance.nodeVersions).map(Number);
        if (versions.length > 0) {
          const latestVersion = Math.max(...versions);
          const versionData = instance.nodeVersions[latestVersion];
          if (versionData?.description) {
            return versionData.description;
          }
        }
      }

      // Regular nodes
      return instance.description || instance.baseDescription || ({} as any);
    } catch (error) {
      return {} as any;
    }
  }

  /**
   * Extract version information
   */
  private extractVersion(desc: INodeTypeDescription): string {
    if (Array.isArray(desc.version)) {
      return Math.max(...desc.version.map(v => Number(v))).toString();
    }
    return desc.version?.toString() || '1';
  }

  /**
   * Normalize input configuration
   */
  private normalizeInputs(inputs: any, nodeType?: string): Array<string | INodeInputConfiguration> {
    // Handle undefined or null
    if (!inputs) {
      return [];
    }

    // Handle dynamic expressions (ExpressionString)
    if (typeof inputs === 'string') {
      // Dynamic expression: try to get configuration from AI node mapping
      if (nodeType && AI_NODE_INPUTS_MAP[nodeType]) {
        const aiInputs = getAINodeInputs(nodeType);
        if (aiInputs.length > 0) {
          return aiInputs;
        }
      }

      // Cannot statically evaluate, return default value
      return ['main'];
    }

    // Handle arrays
    if (Array.isArray(inputs)) {
      return inputs;
    }

    // Unknown format
    return [];
  }

  /**
   * Normalize output configuration
   */
  private normalizeOutputs(outputs: any): Array<string | INodeOutputConfiguration> {
    // Handle undefined or null
    if (!outputs) {
      return [];
    }

    // Handle dynamic expressions (e.g., Switch node)
    if (typeof outputs === 'string') {
      // Dynamic output, return empty array, handled by isDynamicOutput flag
      return [];
    }

    // Handle arrays
    if (Array.isArray(outputs)) {
      return outputs;
    }

    // Unknown format
    return [];
  }

  /**
   * Extract connection types from input configuration
   */
  private extractInputTypes(inputs: Array<string | INodeInputConfiguration>): NodeConnectionType[] {
    const types = new Set<NodeConnectionType>();

    inputs.forEach(input => {
      if (typeof input === 'string') {
        types.add(input as NodeConnectionType);
      } else if (input.type) {
        types.add(input.type);
      }
    });

    return Array.from(types);
  }

  /**
   * Extract connection types from output configuration
   */
  private extractOutputTypes(outputs: Array<string | INodeOutputConfiguration>): NodeConnectionType[] {
    const types = new Set<NodeConnectionType>();

    outputs.forEach(output => {
      if (typeof output === 'string') {
        types.add(output as NodeConnectionType);
      } else if (output.type) {
        types.add(output.type);
      }
    });

    return Array.from(types);
  }

  /**
   * Detect if special inputs are required (AI-related nodes)
   */
  private hasSpecialInputs(inputs: Array<string | INodeInputConfiguration>): boolean {
    const specialTypes: NodeConnectionType[] = [
      'ai_agent',
      'ai_chain',
      'ai_document',
      'ai_embedding',
      'ai_languageModel',
      'ai_memory',
      'ai_outputParser',
      'ai_retriever',
      'ai_reranker',
      'ai_textSplitter',
      'ai_tool',
      'ai_vectorStore'
    ];

    const inputTypes = this.extractInputTypes(inputs);
    return inputTypes.some(type => specialTypes.includes(type));
  }

  /**
   * Detect if there is an error output
   */
  private hasErrorOutput(outputs: Array<string | INodeOutputConfiguration>): boolean {
    return outputs.some(output => {
      if (typeof output === 'object' && output.category === 'error') {
        return true;
      }
      return false;
    });
  }

  /**
   * Detect if outputs are dynamic (using expressions)
   */
  private isDynamicOutputs(outputs: any): boolean {
    return typeof outputs === 'string';
  }

  /**
   * Extract output names
   * @param desc Node description
   * @param outputs Normalized output array
   * @returns List of output names
   */
  private extractOutputNames(
    desc: INodeTypeDescription,
    outputs: Array<string | INodeOutputConfiguration>
  ): string[] {
    // If there are explicitly defined outputNames, use them
    if (desc.outputNames && Array.isArray(desc.outputNames)) {
      return desc.outputNames;
    }

    // Special handling for Switch node
    if (desc.name === 'switch' && typeof desc.outputs === 'string') {
      return this.extractSwitchOutputInfo(desc);
    }

    // Extract displayName from output configuration
    const names: string[] = [];
    outputs.forEach(output => {
      if (typeof output === 'object' && output.displayName) {
        names.push(output.displayName);
      } else if (typeof output === 'string') {
        // For simple string types, use the type name
        names.push(output);
      }
    });

    return names;
  }

  /**
   * Extract Switch node output information
   * Switch node has two modes: expression (default 4 outputs) and rules (dynamically generated based on rules)
   */
  private extractSwitchOutputInfo(desc: INodeTypeDescription): string[] {
    // Find numberOutputs parameter to get default output count
    const numberOutputsProp = desc.properties?.find(
      (p: any) => p.name === 'numberOutputs'
    );

    if (numberOutputsProp && typeof numberOutputsProp.default === 'number') {
      const defaultCount = numberOutputsProp.default as number;
      // Generate default output names (0, 1, 2, ...)
      return Array.from({ length: defaultCount }, (_, i: number) => i.toString());
    }

    // If not found, use default 4 outputs
    return ['0', '1', '2', '3'];
  }
}
