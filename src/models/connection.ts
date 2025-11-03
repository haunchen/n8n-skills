/**
 * Copyright (c) 2025 Frank Chen @ www.frankchen.tw/personal
 * SPDX-License-Identifier: MIT
 *
 * This file is part of n8n-skills project.
 */

import type { NodeConnectionType } from 'n8n-workflow';

/**
 * 相容性條目
 */
export interface CompatibilityEntry {
  targetNode: string;
  score: number;
  reason: string;
  connectionTypes: NodeConnectionType[];
}

/**
 * 相容性矩陣
 * 記錄每個節點可以連接到哪些節點
 */
export interface CompatibilityMatrix {
  [sourceNode: string]: {
    compatible: CompatibilityEntry[];
    incompatible: CompatibilityEntry[];
  };
}

/**
 * 節點連接資訊
 * 用於分析節點間的連接相容性
 */
export interface NodeConnectionInfo {
  nodeType: string;
  displayName: string;
  inputTypes: NodeConnectionType[];
  outputTypes: NodeConnectionType[];
  isMultiInput: boolean;
  isMultiOutput: boolean;
  requiresSpecialInputs: boolean;
  category: string;
  outputCount: number;
  outputNames: string[];
  isDynamicOutput: boolean;
}
