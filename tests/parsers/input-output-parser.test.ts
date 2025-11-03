/**
 * Copyright (c) 2025 Frank Chen @ www.frankchen.tw/personal
 * SPDX-License-Identifier: MIT
 *
 * This file is part of n8n-skills project.
 */

import { InputOutputParser } from '../../src/parsers/input-output-parser';

describe('InputOutputParser', () => {
  let parser: InputOutputParser;

  beforeEach(() => {
    parser = new InputOutputParser();
  });

  describe('多輸出節點解析', () => {
    it('應該正確解析 If 節點的兩個輸出', () => {
      const mockIfNode = {
        description: {
          name: 'if',
          displayName: 'If',
          version: 2,
          inputs: ['main'],
          outputs: ['main', 'main'],
          outputNames: ['true', 'false']
        }
      };

      const result = parser.parseNodeInputOutput(mockIfNode);

      expect(result.nodeType).toBe('if');
      expect(result.isMultiOutput).toBe(true);
      expect(result.outputCount).toBe(2);
      expect(result.outputNames).toEqual(['true', 'false']);
      expect(result.isDynamicOutput).toBe(false);
    });

    it('應該正確解析 Split In Batches 節點的兩個輸出', () => {
      const mockSplitNode = {
        description: {
          name: 'splitInBatches',
          displayName: 'Split In Batches',
          version: 3,
          inputs: ['main'],
          outputs: ['main', 'main'],
          outputNames: ['done', 'loop']
        }
      };

      const result = parser.parseNodeInputOutput(mockSplitNode);

      expect(result.nodeType).toBe('splitInBatches');
      expect(result.isMultiOutput).toBe(true);
      expect(result.outputCount).toBe(2);
      expect(result.outputNames).toEqual(['done', 'loop']);
      expect(result.isDynamicOutput).toBe(false);
    });

    it('應該正確解析 Compare Datasets 節點的四個輸出', () => {
      const mockCompareNode = {
        description: {
          name: 'compareDatasets',
          displayName: 'Compare Datasets',
          version: 1,
          inputs: ['main', 'main'],
          outputs: [
            { type: 'main', displayName: 'In A only' },
            { type: 'main', displayName: 'Same' },
            { type: 'main', displayName: 'Different' },
            { type: 'main', displayName: 'In B only' }
          ]
        }
      };

      const result = parser.parseNodeInputOutput(mockCompareNode);

      expect(result.nodeType).toBe('compareDatasets');
      expect(result.isMultiOutput).toBe(true);
      expect(result.outputCount).toBe(4);
      expect(result.outputNames).toEqual(['In A only', 'Same', 'Different', 'In B only']);
      expect(result.isDynamicOutput).toBe(false);
    });

    it('應該正確識別 Switch 節點為動態輸出', () => {
      const mockSwitchNode = {
        description: {
          name: 'switch',
          displayName: 'Switch',
          version: 3,
          inputs: ['main'],
          outputs: '={{configuredOutputs}}',
          properties: [
            {
              displayName: 'Number of Outputs',
              name: 'numberOutputs',
              type: 'number',
              default: 4
            }
          ]
        }
      };

      const result = parser.parseNodeInputOutput(mockSwitchNode);

      expect(result.nodeType).toBe('switch');
      expect(result.isDynamicOutput).toBe(true);
      expect(result.isMultiOutput).toBe(true);
      expect(result.outputCount).toBe(4);
      expect(result.outputNames).toEqual(['0', '1', '2', '3']);
    });

    it('應該正確處理單一輸出節點', () => {
      const mockSingleOutputNode = {
        description: {
          name: 'httpRequest',
          displayName: 'HTTP Request',
          version: 1,
          inputs: ['main'],
          outputs: ['main']
        }
      };

      const result = parser.parseNodeInputOutput(mockSingleOutputNode);

      expect(result.nodeType).toBe('httpRequest');
      expect(result.isMultiOutput).toBe(false);
      expect(result.outputCount).toBe(1);
      expect(result.outputNames).toEqual(['main']);
      expect(result.isDynamicOutput).toBe(false);
    });
  });

  describe('版本化節點處理', () => {
    it('應該從版本化節點中提取最新版本的輸出配置', () => {
      const mockVersionedNode = {
        nodeVersions: {
          1: {
            description: {
              name: 'if',
              version: 1,
              outputs: ['main']
            }
          },
          2: {
            description: {
              name: 'if',
              version: 2,
              outputs: ['main', 'main'],
              outputNames: ['true', 'false']
            }
          }
        }
      };

      const result = parser.parseNodeInputOutput(mockVersionedNode);

      expect(result.version).toBe('2');
      expect(result.outputCount).toBe(2);
      expect(result.outputNames).toEqual(['true', 'false']);
    });
  });
});
