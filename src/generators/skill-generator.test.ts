/**
 * Skill Generator 測試
 */

import { SkillGenerator, type SkillGeneratorInput } from './skill-generator';
import type { EnrichedNodeInfo } from './skill-generator';
import type { NodeUsageStats } from '../collectors/api-collector';

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
        description: 'HTTP Request 節點詳細文件',
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
    it('應該生成有效的 Skill.md 內容', () => {
      const generator = new SkillGenerator(mockInput.config);
      const content = generator.generate(mockInput);

      expect(content).toBeTruthy();
      expect(content.length).toBeGreaterThan(0);
    });

    it('應該包含 YAML frontmatter', () => {
      const generator = new SkillGenerator(mockInput.config);
      const content = generator.generate(mockInput);

      expect(content).toMatch(/^---\n/);
      expect(content).toContain('name: n8n Test');
      expect(content).toContain('version: 1.0.0');
      expect(content).toContain('description: Test skill');
    });

    it('應該包含概述章節', () => {
      const generator = new SkillGenerator(mockInput.config);
      const content = generator.generate(mockInput);

      expect(content).toContain('# n8n Workflow Automation');
      expect(content).toContain('## 什麼是 n8n？');
      expect(content).toContain('## 何時使用這個 Skill');
    });

    it('應該包含快速開始章節', () => {
      const generator = new SkillGenerator(mockInput.config);
      const content = generator.generate(mockInput);

      expect(content).toContain('# 快速開始');
      expect(content).toContain('## 核心概念');
      expect(content).toContain('## 最常用節點');
    });

    it('應該列出節點並按使用率排序', () => {
      const generator = new SkillGenerator(mockInput.config);
      const content = generator.generate(mockInput);

      // 檢查節點按使用率排序
      const httpIndex = content.indexOf('HTTP Request');
      const setIndex = content.indexOf('Set');
      const ifIndex = content.indexOf('IF');

      expect(httpIndex).toBeLessThan(setIndex);
      expect(setIndex).toBeLessThan(ifIndex);
    });

    it('應該包含節點索引', () => {
      const generator = new SkillGenerator(mockInput.config);
      const content = generator.generate(mockInput);

      expect(content).toContain('# 節點索引');
      expect(content).toContain('## 核心');
    });

    it('應該包含常見工作流程模式', () => {
      const generator = new SkillGenerator(mockInput.config);
      const content = generator.generate(mockInput);

      expect(content).toContain('# 常見工作流程模式');
      expect(content).toContain('HTTP 資料擷取');
      expect(content).toContain('Email 自動化');
    });

    it('應該包含資源檔案索引', () => {
      const generator = new SkillGenerator(mockInput.config);
      const content = generator.generate(mockInput);

      expect(content).toContain('# 資源檔案');
      expect(content).toContain('HTTP Request');
      expect(content).toContain('resources/nodes-base.HttpRequest.md');
    });

    it('應該包含授權聲明', () => {
      const generator = new SkillGenerator(mockInput.config);
      const content = generator.generate(mockInput);

      expect(content).toContain('# 授權聲明');
      expect(content).toContain('https://n8n.io');
      expect(content).toContain('https://docs.n8n.io');
    });

    it('應該警告超過行數限制', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const generator = new SkillGenerator({
        ...mockInput.config,
        maxLines: 10, // 設定很小的限制
      });

      generator.generate(mockInput);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('警告: 生成的內容超過限制')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('節點格式化', () => {
    it('應該正確格式化節點類別', () => {
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

      expect(content).toContain('類型: 觸發器');
    });

    it('應該正確格式化 Webhook 節點', () => {
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

      expect(content).toContain('類型: Webhook');
    });

    it('應該正確格式化 AI 工具節點', () => {
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

      expect(content).toContain('類型: AI 工具');
    });
  });

  describe('分類處理', () => {
    it('應該按分類分組節點', () => {
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

      expect(content).toContain('## 核心');
      expect(content).toContain('## 通訊');
    });

    it('應該翻譯分類名稱', () => {
      const generator = new SkillGenerator();
      const content = generator.generate({
        ...mockInput,
        nodes: [
          { ...mockNodes[0], category: 'ai' },
          { ...mockNodes[1], category: 'trigger' },
        ],
      });

      expect(content).toContain('## AI 工具');
      expect(content).toContain('## 觸發器');
    });
  });
});
