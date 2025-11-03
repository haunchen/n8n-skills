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
 * 節點輸入輸出資訊
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
 * 輸入輸出解析器
 * 從 n8n 節點類別提取輸入輸出配置
 */
export class InputOutputParser {
  /**
   * 從節點類別提取輸入輸出配置
   * @param nodeClass 節點類別或實例
   * @returns 節點 I/O 資訊
   */
  parseNodeInputOutput(nodeClass: any): NodeInputOutputInfo {
    const desc = this.getNodeDescription(nodeClass);
    const nodeType = desc.name || '';

    const inputs = this.normalizeInputs(desc.inputs, nodeType);
    const outputs = this.normalizeOutputs(desc.outputs);
    const isDynamicOutput = this.isDynamicOutputs(desc.outputs);
    const outputNames = this.extractOutputNames(desc, outputs);

    // 計算輸出數量：動態輸出使用 outputNames 長度，否則使用 outputs 長度
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
   * 取得節點描述
   * 處理版本化節點和一般節點
   */
  private getNodeDescription(nodeClass: any): INodeTypeDescription {
    try {
      const instance = typeof nodeClass === 'function' ? new nodeClass() : nodeClass;

      // 處理版本化節點
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

      // 一般節點
      return instance.description || instance.baseDescription || ({} as any);
    } catch (error) {
      return {} as any;
    }
  }

  /**
   * 提取版本資訊
   */
  private extractVersion(desc: INodeTypeDescription): string {
    if (Array.isArray(desc.version)) {
      return Math.max(...desc.version.map(v => Number(v))).toString();
    }
    return desc.version?.toString() || '1';
  }

  /**
   * 正規化輸入配置
   */
  private normalizeInputs(inputs: any, nodeType?: string): Array<string | INodeInputConfiguration> {
    // 處理未定義或 null
    if (!inputs) {
      return [];
    }

    // 處理動態表達式（ExpressionString）
    if (typeof inputs === 'string') {
      // 動態表達式：嘗試從 AI 節點映射表取得配置
      if (nodeType && AI_NODE_INPUTS_MAP[nodeType]) {
        const aiInputs = getAINodeInputs(nodeType);
        if (aiInputs.length > 0) {
          return aiInputs;
        }
      }

      // 無法靜態評估，回傳預設值
      return ['main'];
    }

    // 處理陣列
    if (Array.isArray(inputs)) {
      return inputs;
    }

    // 未知格式
    return [];
  }

  /**
   * 正規化輸出配置
   */
  private normalizeOutputs(outputs: any): Array<string | INodeOutputConfiguration> {
    // 處理未定義或 null
    if (!outputs) {
      return [];
    }

    // 處理動態表達式（如 Switch 節點）
    if (typeof outputs === 'string') {
      // 動態輸出，回傳空陣列，由 isDynamicOutput 標記處理
      return [];
    }

    // 處理陣列
    if (Array.isArray(outputs)) {
      return outputs;
    }

    // 未知格式
    return [];
  }

  /**
   * 從輸入配置提取連接類型
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
   * 從輸出配置提取連接類型
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
   * 檢測是否需要特殊輸入（AI 相關節點）
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
   * 檢測是否有錯誤輸出
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
   * 檢測是否為動態輸出（使用表達式）
   */
  private isDynamicOutputs(outputs: any): boolean {
    return typeof outputs === 'string';
  }

  /**
   * 提取輸出名稱
   * @param desc 節點描述
   * @param outputs 正規化後的輸出陣列
   * @returns 輸出名稱列表
   */
  private extractOutputNames(
    desc: INodeTypeDescription,
    outputs: Array<string | INodeOutputConfiguration>
  ): string[] {
    // 如果有明確定義的 outputNames，使用它
    if (desc.outputNames && Array.isArray(desc.outputNames)) {
      return desc.outputNames;
    }

    // Switch 節點特殊處理
    if (desc.name === 'switch' && typeof desc.outputs === 'string') {
      return this.extractSwitchOutputInfo(desc);
    }

    // 從輸出配置中提取 displayName
    const names: string[] = [];
    outputs.forEach(output => {
      if (typeof output === 'object' && output.displayName) {
        names.push(output.displayName);
      } else if (typeof output === 'string') {
        // 對於簡單的字串類型，使用類型名稱
        names.push(output);
      }
    });

    return names;
  }

  /**
   * 提取 Switch 節點的輸出資訊
   * Switch 節點有兩種模式：expression（預設 4 個輸出）和 rules（根據規則動態生成）
   */
  private extractSwitchOutputInfo(desc: INodeTypeDescription): string[] {
    // 尋找 numberOutputs 參數來取得預設輸出數量
    const numberOutputsProp = desc.properties?.find(
      (p: any) => p.name === 'numberOutputs'
    );

    if (numberOutputsProp && typeof numberOutputsProp.default === 'number') {
      const defaultCount = numberOutputsProp.default as number;
      // 生成預設的輸出名稱（0, 1, 2, ...）
      return Array.from({ length: defaultCount }, (_, i: number) => i.toString());
    }

    // 如果找不到，使用預設的 4 個輸出
    return ['0', '1', '2', '3'];
  }
}
