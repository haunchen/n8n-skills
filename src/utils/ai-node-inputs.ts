/**
 * Copyright (c) 2025 Frank Chen @ www.frankchen.tw/personal
 * SPDX-License-Identifier: MIT
 *
 * AI 節點輸入配置映射表
 * 提供 AI 節點的完整輸入配置，避免試圖動態評估表達式
 */

import type {
  INodeInputConfiguration,
  NodeConnectionType
} from 'n8n-workflow';

/**
 * AI 節點輸入配置
 */
export interface AINodeInputConfig {
  nodeType: string;
  version?: string | string[];
  dynamicBehavior: 'static' | 'conditional';
  baseInputs: INodeInputConfiguration[];
  conditionalInputs?: {
    [condition: string]: INodeInputConfiguration[];
  };
  description?: string;
}

/**
 * AI 節點輸入配置映射表
 * 包含所有常用 AI 節點的輸入配置
 */
export const AI_NODE_INPUTS_MAP: Record<string, AINodeInputConfig> = {
  // ========== Agent 節點 ==========
  'agent': {
    nodeType: 'agent',
    version: ['1', '2', '3'],
    dynamicBehavior: 'conditional',
    baseInputs: [
      {
        type: 'main',
        displayName: 'Input',
        required: true,
      },
      {
        type: 'ai_languageModel',
        displayName: 'Chat Model',
        required: true,
        maxConnections: 1,
        filter: {
          excludedNodes: [
            '@n8n/n8n-nodes-langchain.lmCohere',
            '@n8n/n8n-nodes-langchain.lmOllama',
            'n8n/n8n-nodes-langchain.lmOpenAi',
            '@n8n/n8n-nodes-langchain.lmOpenHuggingFaceInference'
          ]
        }
      },
      {
        type: 'ai_memory',
        displayName: 'Memory',
        required: false,
        maxConnections: 1,
      },
      {
        type: 'ai_tool',
        displayName: 'Tool',
        required: false,
      }
    ],
    conditionalInputs: {
      hasOutputParser: [
        {
          type: 'ai_outputParser',
          displayName: 'Output Parser',
          required: false,
          maxConnections: 1,
        }
      ],
      needsFallback: [
        {
          type: 'ai_languageModel',
          displayName: 'Fallback Model',
          required: true,
          maxConnections: 1,
          filter: {
            excludedNodes: [
              '@n8n/n8n-nodes-langchain.lmCohere',
              '@n8n/n8n-nodes-langchain.lmOllama',
              'n8n/n8n-nodes-langchain.lmOpenAi',
              '@n8n/n8n-nodes-langchain.lmOpenHuggingFaceInference'
            ]
          }
        }
      ]
    },
  },

  // ========== 語言模型節點 ==========
  'lmOpenAi': {
    nodeType: 'lmOpenAi',
    version: '1',
    dynamicBehavior: 'static',
    baseInputs: [],
  },

  'lmAzureOpenAi': {
    nodeType: 'lmAzureOpenAi',
    version: '1',
    dynamicBehavior: 'static',
    baseInputs: [],
  },

  'lmChatAnthropic': {
    nodeType: 'lmChatAnthropic',
    version: '1',
    dynamicBehavior: 'static',
    baseInputs: [],
  },

  'lmChatGoogleVertexAi': {
    nodeType: 'lmChatGoogleVertexAi',
    version: '1',
    dynamicBehavior: 'static',
    baseInputs: [],
  },

  'lmCohere': {
    nodeType: 'lmCohere',
    version: '1',
    dynamicBehavior: 'static',
    baseInputs: [],
  },

  'lmOllama': {
    nodeType: 'lmOllama',
    version: '1',
    dynamicBehavior: 'static',
    baseInputs: [],
  },

  'lmGroq': {
    nodeType: 'lmGroq',
    version: '1',
    dynamicBehavior: 'static',
    baseInputs: [],
  },

  // ========== Tool 節點 ==========
  'toolCode': {
    nodeType: 'toolCode',
    version: ['1', '1.1', '1.2', '1.3'],
    dynamicBehavior: 'static',
    baseInputs: [],
  },

  'toolHttpRequest': {
    nodeType: 'toolHttpRequest',
    version: '1',
    dynamicBehavior: 'static',
    baseInputs: [],
  },

  'toolWorkflow': {
    nodeType: 'toolWorkflow',
    version: ['1', '2'],
    dynamicBehavior: 'static',
    baseInputs: [],
  },

  'toolWikipedia': {
    nodeType: 'toolWikipedia',
    version: '1',
    dynamicBehavior: 'static',
    baseInputs: [],
  },

  'toolSerpApi': {
    nodeType: 'toolSerpApi',
    version: '1',
    dynamicBehavior: 'static',
    baseInputs: [],
  },

  'toolVectorStore': {
    nodeType: 'toolVectorStore',
    version: '1',
    dynamicBehavior: 'static',
    baseInputs: [
      {
        type: 'ai_vectorStore',
        displayName: 'Vector Store',
        required: true,
        maxConnections: 1,
      }
    ],
  },

  'toolCalculator': {
    nodeType: 'toolCalculator',
    version: '1',
    dynamicBehavior: 'static',
    baseInputs: [],
  },

  'toolThink': {
    nodeType: 'toolThink',
    version: '1',
    dynamicBehavior: 'static',
    baseInputs: [],
  },

  // ========== Memory 節點 ==========
  'memoryBuffer': {
    nodeType: 'memoryBuffer',
    version: '1',
    dynamicBehavior: 'static',
    baseInputs: [],
  },

  'memoryVectorStore': {
    nodeType: 'memoryVectorStore',
    version: '1',
    dynamicBehavior: 'static',
    baseInputs: [
      {
        type: 'ai_vectorStore',
        displayName: 'Vector Store',
        required: true,
        maxConnections: 1,
      }
    ],
  },

  // ========== 檢索器節點 ==========
  'vectorStoreRetriever': {
    nodeType: 'vectorStoreRetriever',
    version: '1',
    dynamicBehavior: 'static',
    baseInputs: [
      {
        type: 'ai_vectorStore',
        displayName: 'Vector Store',
        required: true,
        maxConnections: 1,
      }
    ],
  },

  // ========== 輸出解析器節點 ==========
  'outputParserJson': {
    nodeType: 'outputParserJson',
    version: '1',
    dynamicBehavior: 'static',
    baseInputs: [],
  },

  'outputParserStructured': {
    nodeType: 'outputParserStructured',
    version: '1',
    dynamicBehavior: 'static',
    baseInputs: [],
  }
};

/**
 * 取得 AI 節點的完整輸入配置
 * @param nodeType 節點類型
 * @param parameters 節點參數（用於條件輸入）
 * @returns 輸入配置陣列
 */
export function getAINodeInputs(
  nodeType: string,
  parameters?: Record<string, any>
): INodeInputConfiguration[] {
  const config = AI_NODE_INPUTS_MAP[nodeType];
  if (!config) {
    return [];
  }

  // 靜態輸入
  let inputs = [...config.baseInputs];

  // 條件輸入
  if (config.conditionalInputs) {
    if (parameters?.hasOutputParser !== false && config.conditionalInputs.hasOutputParser) {
      inputs = inputs.concat(config.conditionalInputs.hasOutputParser);
    }
    if (parameters?.needsFallback === true && config.conditionalInputs.needsFallback) {
      inputs = inputs.concat(config.conditionalInputs.needsFallback);
    }
  }

  return inputs;
}

/**
 * 檢查是否為已知的 AI 節點
 * @param nodeType 節點類型
 * @returns 是否為 AI 節點
 */
export function isKnownAINode(nodeType: string): boolean {
  return nodeType in AI_NODE_INPUTS_MAP;
}

/**
 * 取得所有 AI 節點類型
 * @returns AI 節點類型陣列
 */
export function getAllAINodeTypes(): string[] {
  return Object.keys(AI_NODE_INPUTS_MAP);
}

/**
 * 檢查節點是否需要特定的輸入類型
 * @param nodeType 節點類型
 * @param requiredInputType 所需的輸入類型
 * @returns 是否需要該輸入類型
 */
export function requiresInputType(
  nodeType: string,
  requiredInputType: NodeConnectionType
): boolean {
  const inputs = getAINodeInputs(nodeType);
  return inputs.some(input => input.type === requiredInputType && input.required);
}

/**
 * 取得節點的所有支援的輸入類型
 * @param nodeType 節點類型
 * @returns 支援的輸入類型陣列
 */
export function getSupportedInputTypes(nodeType: string): NodeConnectionType[] {
  const inputs = getAINodeInputs(nodeType);
  return [...new Set(inputs.map(input => input.type))];
}
