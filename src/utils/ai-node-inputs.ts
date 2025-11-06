/**
 * Copyright (c) 2025 Frank Chen @ www.frankchen.tw/personal
 * SPDX-License-Identifier: MIT
 *
 * AI Node Input Configuration Mapping
 * Provides complete input configurations for AI nodes to avoid attempting dynamic expression evaluation
 */

import type {
  INodeInputConfiguration,
  NodeConnectionType
} from 'n8n-workflow';

/**
 * AI node input configuration
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
 * AI node input configuration mapping table
 * Contains input configurations for all commonly used AI nodes
 */
export const AI_NODE_INPUTS_MAP: Record<string, AINodeInputConfig> = {
  // ========== Agent Nodes ==========
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

  // ========== Language Model Nodes ==========
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

  // ========== Tool Nodes ==========
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

  // ========== Memory Nodes ==========
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

  // ========== Retriever Nodes ==========
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

  // ========== Output Parser Nodes ==========
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
 * Get complete input configuration for AI node
 * @param nodeType Node type
 * @param parameters Node parameters (for conditional inputs)
 * @returns Array of input configurations
 */
export function getAINodeInputs(
  nodeType: string,
  parameters?: Record<string, any>
): INodeInputConfiguration[] {
  const config = AI_NODE_INPUTS_MAP[nodeType];
  if (!config) {
    return [];
  }

  // Static inputs
  let inputs = [...config.baseInputs];

  // Conditional inputs
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
 * Check if a node is a known AI node
 * @param nodeType Node type
 * @returns Whether it is an AI node
 */
export function isKnownAINode(nodeType: string): boolean {
  return nodeType in AI_NODE_INPUTS_MAP;
}

/**
 * Get all AI node types
 * @returns Array of AI node types
 */
export function getAllAINodeTypes(): string[] {
  return Object.keys(AI_NODE_INPUTS_MAP);
}

/**
 * Check if a node requires a specific input type
 * @param nodeType Node type
 * @param requiredInputType Required input type
 * @returns Whether the input type is required
 */
export function requiresInputType(
  nodeType: string,
  requiredInputType: NodeConnectionType
): boolean {
  const inputs = getAINodeInputs(nodeType);
  return inputs.some(input => input.type === requiredInputType && input.required);
}

/**
 * Get all supported input types for a node
 * @param nodeType Node type
 * @returns Array of supported input types
 */
export function getSupportedInputTypes(nodeType: string): NodeConnectionType[] {
  const inputs = getAINodeInputs(nodeType);
  return [...new Set(inputs.map(input => input.type))];
}
