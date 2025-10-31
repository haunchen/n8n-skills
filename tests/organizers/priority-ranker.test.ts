import { PriorityRanker, NodeData, ScoredNode } from '../../src/organizers/priority-ranker';

describe('PriorityRanker', () => {
  let ranker: PriorityRanker;

  beforeEach(() => {
    ranker = new PriorityRanker();
  });

  describe('rankNodes', () => {
    it('應該正確計算節點分數並排序', () => {
      const nodes: NodeData[] = [
        {
          nodeType: 'nodes-base.HttpRequest',
          displayName: 'HTTP Request',
          description: 'Makes HTTP requests',
          category: 'Core Nodes',
          nodeCategory: 'action',
          usageCount: 100,
          hasDocumentation: true,
          propertyCount: 15
        },
        {
          nodeType: 'nodes-base.Slack',
          displayName: 'Slack',
          description: 'Send messages to Slack',
          category: 'Communication',
          usageCount: 50,
          hasDocumentation: true,
          propertyCount: 8
        },
        {
          nodeType: 'nodes-base.RandomTool',
          displayName: 'Random Tool',
          description: 'Some random tool',
          category: 'Misc',
          usageCount: 5,
          hasDocumentation: false,
          propertyCount: 3
        }
      ];

      const ranked = ranker.rankNodes(nodes);

      expect(ranked).toHaveLength(3);
      expect(ranked[0].nodeType).toBe('nodes-base.HttpRequest');
      expect(ranked[0].rank).toBe(1);
      expect(ranked[0].score).toBeGreaterThan(ranked[1].score);
      expect(ranked[1].score).toBeGreaterThan(ranked[2].score);
    });

    it('應該正確分配層級', () => {
      const nodes: NodeData[] = Array.from({ length: 60 }, (_, i) => ({
        nodeType: `nodes-base.Node${i}`,
        displayName: `Node ${i}`,
        description: `Node ${i} description`,
        category: 'Test',
        usageCount: 60 - i,
        hasDocumentation: true,
        propertyCount: 5
      }));

      const ranked = ranker.rankNodes(nodes);

      const essential = ranked.filter((n: ScoredNode) => n.tier === 'essential');
      const common = ranked.filter((n: ScoredNode) => n.tier === 'common');
      const specialized = ranked.filter((n: ScoredNode) => n.tier === 'specialized');

      expect(essential.length).toBe(10);
      expect(common.length).toBe(40);
      expect(specialized.length).toBe(10);
    });

    it('應該為核心節點給予高分', () => {
      const coreNode: NodeData = {
        nodeType: 'nodes-base.Code',
        displayName: 'Code',
        description: 'Execute JavaScript code',
        category: 'Core Nodes',
        nodeCategory: 'action',
        usageCount: 80,
        hasDocumentation: true,
        propertyCount: 12
      };

      const regularNode: NodeData = {
        nodeType: 'nodes-base.SomeTool',
        displayName: 'Some Tool',
        description: 'Some tool',
        category: 'Misc',
        usageCount: 80,
        hasDocumentation: true,
        propertyCount: 5
      };

      const ranked = ranker.rankNodes([coreNode, regularNode]);

      expect(ranked[0].nodeType).toBe(coreNode.nodeType);
      expect(ranked[0].score).toBeGreaterThan(ranked[1].score);
    });
  });

  describe('groupByTier', () => {
    it('應該正確依層級分組', () => {
      const nodes: NodeData[] = Array.from({ length: 15 }, (_, i) => ({
        nodeType: `nodes-base.Node${i}`,
        displayName: `Node ${i}`,
        usageCount: 15 - i,
        hasDocumentation: true,
        propertyCount: 5
      }));

      const ranked = ranker.rankNodes(nodes);
      const grouped = ranker.groupByTier(ranked);

      expect(grouped.essential.length).toBe(10);
      expect(grouped.common.length).toBe(5);
      expect(grouped.specialized.length).toBe(0);
    });
  });

  describe('generateReport', () => {
    it('應該產生正確的統計報告', () => {
      const nodes: NodeData[] = Array.from({ length: 60 }, (_, i) => ({
        nodeType: `nodes-base.Node${i}`,
        displayName: `Node ${i}`,
        usageCount: 60 - i,
        hasDocumentation: true,
        propertyCount: 5
      }));

      const ranked = ranker.rankNodes(nodes);
      const report = ranker.generateReport(ranked);

      expect(report.totalNodes).toBe(60);
      expect(report.tierCounts.essential).toBe(10);
      expect(report.tierCounts.common).toBe(40);
      expect(report.tierCounts.specialized).toBe(10);
      expect(report.topNodes.length).toBe(10);
      expect(report.averageScores.essential).toBeGreaterThan(0);
    });
  });

  describe('getNodesByTier', () => {
    it('應該正確篩選指定層級的節點', () => {
      const nodes: NodeData[] = Array.from({ length: 20 }, (_, i) => ({
        nodeType: `nodes-base.Node${i}`,
        displayName: `Node ${i}`,
        usageCount: 20 - i,
        hasDocumentation: true,
        propertyCount: 5
      }));

      const ranked = ranker.rankNodes(nodes);
      const essential = ranker.getNodesByTier(ranked, 'essential');
      const common = ranker.getNodesByTier(ranked, 'common');

      expect(essential.length).toBe(10);
      expect(common.length).toBe(10);
      expect(essential.every((n: ScoredNode) => n.tier === 'essential')).toBe(true);
      expect(common.every((n: ScoredNode) => n.tier === 'common')).toBe(true);
    });
  });
});
