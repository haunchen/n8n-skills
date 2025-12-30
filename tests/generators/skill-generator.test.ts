/**
 * Skill Generator 測試
 */

import { SkillGenerator, type SkillGeneratorInput } from '../../src/generators/skill-generator';
import type { EnrichedNodeInfo } from '../../src/generators/skill-generator';
import type { NodeUsageStats } from '../../src/collectors/api-collector';

describe('SkillGenerator', () => {
  const mockNodes: EnrichedNodeInfo[] = [
    {
      nodeType: 'nodes-base.HttpRequest',
      displayName: 'HTTP Request',
      description: 'Makes an HTTP request and returns the response data',
      category: 'core',
      packageName: 'n8n-nodes-base',
      version: '4.2',
      isVersioned: true,
      isTrigger: false,
      isWebhook: false,
      isAITool: false,
      hasCredentials: false,
      hasOperations: true,
    },
    {
      nodeType: 'nodes-base.Set',
      displayName: 'Set',
      description: 'Sets values to data',
      category: 'core',
      packageName: 'n8n-nodes-base',
      version: '3.3',
      isVersioned: true,
      isTrigger: false,
      isWebhook: false,
      isAITool: false,
      hasCredentials: false,
      hasOperations: false,
    },
    {
      nodeType: 'nodes-base.IF',
      displayName: 'IF',
      description: 'Routes data based on conditions',
      category: 'core',
      packageName: 'n8n-nodes-base',
      version: '2.0',
      isVersioned: true,
      isTrigger: false,
      isWebhook: false,
      isAITool: false,
      hasCredentials: false,
      hasOperations: false,
    },
  ];

  const mockStats: NodeUsageStats = {
    'nodes-base.HttpRequest': { count: 150, percentage: 25.5 },
    'nodes-base.Set': { count: 120, percentage: 20.4 },
    'nodes-base.IF': { count: 100, percentage: 17.0 },
  };

  const mockInput: SkillGeneratorInput = {
    nodes: mockNodes,
    nodeUsageStats: mockStats,
    resourceFiles: [
      {
        name: 'HTTP Request',
        path: 'resources/nodes-base.HttpRequest.md',
        description: 'HTTP Request node documentation',
        category: 'core',
      },
    ],
    config: {
      name: 'n8n Test',
      version: '1.0.0',
      description: 'Test skill',
    },
  };

  describe('generate', () => {
    it('should generate valid SKILL.md content', () => {
      const generator = new SkillGenerator(mockInput.config);
      const content = generator.generate(mockInput);

      expect(content).toBeTruthy();
      expect(content.length).toBeGreaterThan(0);
    });

    it('should include YAML frontmatter', () => {
      const generator = new SkillGenerator(mockInput.config);
      const content = generator.generate(mockInput);

      expect(content).toMatch(/^---\n/);
      expect(content).toContain('name: n8n Test');
      expect(content).toContain('description: Test skill');
      expect(content).toContain('allowed-tools:');
    });

    it('should include overview sections', () => {
      const generator = new SkillGenerator(mockInput.config);
      const content = generator.generate(mockInput);

      expect(content).toContain('# n8n Workflow Automation');
      expect(content).toContain('## What is n8n?');
      expect(content).toContain('## When to Use This Skill');
    });

    it('should include how to find nodes section', () => {
      const generator = new SkillGenerator(mockInput.config);
      const content = generator.generate(mockInput);

      expect(content).toContain('# How to Find Nodes');
      expect(content).toContain('INDEX.md');
    });

    it('should list nodes sorted by usage', () => {
      const generator = new SkillGenerator(mockInput.config);
      const content = generator.generate(mockInput);

      // Check nodes are present
      expect(content).toContain('HTTP Request');
      expect(content).toContain('Set');
      expect(content).toContain('IF');
    });

    it('should include common workflow patterns', () => {
      const generator = new SkillGenerator(mockInput.config);
      const content = generator.generate(mockInput);

      expect(content).toContain('Common Workflow Patterns');
    });

    it('should include license and attribution', () => {
      const generator = new SkillGenerator(mockInput.config);
      const content = generator.generate(mockInput);

      expect(content).toContain('License');
      expect(content).toContain('https://n8n.io');
      expect(content).toContain('https://docs.n8n.io');
    });

    it('should warn when exceeding line limit', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const generator = new SkillGenerator({
        ...mockInput.config,
        maxLines: 10, // Set very small limit
      });

      generator.generate(mockInput);

      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('node formatting', () => {
    it('should include trigger nodes', () => {
      const generator = new SkillGenerator();
      const content = generator.generate({
        ...mockInput,
        nodes: [
          {
            ...mockNodes[0],
            isTrigger: true,
            isWebhook: false,
            isAITool: false,
          },
        ],
      });

      expect(content).toBeTruthy();
      expect(content.length).toBeGreaterThan(0);
    });

    it('should include webhook nodes', () => {
      const generator = new SkillGenerator();
      const content = generator.generate({
        ...mockInput,
        nodes: [
          {
            ...mockNodes[0],
            isTrigger: false,
            isWebhook: true,
            isAITool: false,
          },
        ],
      });

      expect(content).toBeTruthy();
      expect(content.length).toBeGreaterThan(0);
    });

    it('should include AI tool nodes', () => {
      const generator = new SkillGenerator();
      const content = generator.generate({
        ...mockInput,
        nodes: [
          {
            ...mockNodes[0],
            isTrigger: false,
            isWebhook: false,
            isAITool: true,
          },
        ],
      });

      expect(content).toBeTruthy();
      expect(content.length).toBeGreaterThan(0);
    });
  });

  describe('category handling', () => {
    it('should handle nodes from multiple categories', () => {
      const multiCategoryNodes: EnrichedNodeInfo[] = [
        { ...mockNodes[0], category: 'core' },
        { ...mockNodes[1], category: 'communication' },
        { ...mockNodes[2], category: 'core' },
      ];

      const generator = new SkillGenerator();
      const content = generator.generate({
        ...mockInput,
        nodes: multiCategoryNodes,
      });

      expect(content).toBeTruthy();
      expect(content.length).toBeGreaterThan(0);
    });

    it('should handle AI and trigger categories', () => {
      const generator = new SkillGenerator();
      const content = generator.generate({
        ...mockInput,
        nodes: [
          { ...mockNodes[0], category: 'ai' },
          { ...mockNodes[1], category: 'trigger' },
        ],
      });

      expect(content).toBeTruthy();
      expect(content.length).toBeGreaterThan(0);
    });
  });
});
