/**
 * Copyright (c) 2025 Frank Chen @ www.frankchen.tw/personal
 * SPDX-License-Identifier: MIT
 *
 * This file is part of n8n-skills project.
 */

import type { NodeConnectionType } from 'n8n-workflow';

/**
 * Compatibility entry
 */
export interface CompatibilityEntry {
  targetNode: string;
  score: number;
  reason: string;
  connectionTypes: NodeConnectionType[];
}

/**
 * Compatibility matrix
 * Records which nodes each node can connect to
 */
export interface CompatibilityMatrix {
  [sourceNode: string]: {
    compatible: CompatibilityEntry[];
    incompatible: CompatibilityEntry[];
  };
}

/**
 * Node connection information
 * Used for analyzing connection compatibility between nodes
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
