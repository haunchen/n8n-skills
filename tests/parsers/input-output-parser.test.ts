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

  describe('Multi-output Node Parsing', () => {
    it('should correctly parse If node with two outputs', () => {
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

    it('should correctly parse Split In Batches node with two outputs', () => {
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

    it('should correctly parse Compare Datasets node with four outputs', () => {
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

    it('should correctly identify Switch node as dynamic output', () => {
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

    it('should correctly handle single output node', () => {
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

  describe('Versioned Node Handling', () => {
    it('should extract output configuration from latest version of versioned node', () => {
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
