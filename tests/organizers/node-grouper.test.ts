import { NodeGrouper, UsageFrequency, FunctionalGroup } from '../../src/organizers/node-grouper';

describe('NodeGrouper', () => {
  let grouper: NodeGrouper;

  beforeEach(() => {
    grouper = new NodeGrouper();
  });

  describe('group', () => {
    it('should correctly classify essential nodes', () => {
      const mockNodes = [
        {
          nodeType: 'nodes-base.httpRequest',
          displayName: 'HTTP Request',
          description: 'Make HTTP requests',
          category: 'core'
        },
        {
          nodeType: 'nodes-base.webhook',
          displayName: 'Webhook',
          description: 'Listen to webhooks',
          category: 'core',
          isWebhook: true
        }
      ];

      const result = grouper.group(mockNodes);

      const essentialNodes = grouper.getNodesByFrequency(result, UsageFrequency.ESSENTIAL);
      expect(essentialNodes.length).toBe(2);
      expect(essentialNodes[0].usageFrequency).toBe(UsageFrequency.ESSENTIAL);
    });

    it('should correctly classify common nodes', () => {
      const mockNodes = [
        {
          nodeType: 'nodes-base.slack',
          displayName: 'Slack',
          description: 'Send Slack messages',
          category: 'app'
        }
      ];

      const result = grouper.group(mockNodes);

      const commonNodes = grouper.getNodesByFrequency(result, UsageFrequency.COMMON);
      expect(commonNodes.length).toBe(1);
      expect(commonNodes[0].displayName).toBe('Slack');
    });

    it('should correctly assign functional groups', () => {
      const mockNodes = [
        {
          nodeType: 'nodes-base.slack',
          displayName: 'Slack',
          description: 'Slack integration',
          category: 'app'
        },
        {
          nodeType: 'nodes-base.postgres',
          displayName: 'PostgreSQL',
          description: 'PostgreSQL database',
          category: 'database'
        }
      ];

      const result = grouper.group(mockNodes);

      const commNodes = grouper.getNodesByFunction(result, FunctionalGroup.COMMUNICATION);
      const dbNodes = grouper.getNodesByFunction(result, FunctionalGroup.DATABASE);

      expect(commNodes.length).toBe(1);
      expect(dbNodes.length).toBe(1);
    });

    it('should add correct tags and groups for AI nodes', () => {
      const mockNodes = [
        {
          nodeType: 'nodes-langchain.openai',
          displayName: 'OpenAI',
          description: 'OpenAI integration',
          category: 'ai',
          isAITool: true
        }
      ];

      const result = grouper.group(mockNodes);

      const aiNodes = grouper.getNodesByFunction(result, FunctionalGroup.AI_ML);
      expect(aiNodes.length).toBe(1);
      expect(aiNodes[0].tags).toContain('ai');
      expect(aiNodes[0].functionalGroups).toContain(FunctionalGroup.AI_ML);
    });

    it('should add correct tags for trigger nodes', () => {
      const mockNodes = [
        {
          nodeType: 'nodes-base.cronTrigger',
          displayName: 'Cron Trigger',
          description: 'Schedule workflows',
          category: 'trigger',
          isTrigger: true
        }
      ];

      const result = grouper.group(mockNodes);

      const allNodes = grouper.getNodesByFrequency(result, UsageFrequency.ESSENTIAL);
      const triggerNode = allNodes.find(n => n.nodeType.includes('cronTrigger'));

      expect(triggerNode?.tags).toContain('trigger');
      expect(triggerNode?.functionalGroups).toContain(FunctionalGroup.AUTOMATION);
    });
  });

  describe('generateStatistics', () => {
    it('should generate correct statistics', () => {
      const mockNodes = [
        {
          nodeType: 'nodes-base.httpRequest',
          displayName: 'HTTP Request',
          description: 'HTTP requests',
          category: 'core'
        },
        {
          nodeType: 'nodes-base.slack',
          displayName: 'Slack',
          description: 'Slack integration',
          category: 'app'
        },
        {
          nodeType: 'nodes-base.postgres',
          displayName: 'PostgreSQL',
          description: 'Database',
          category: 'database'
        }
      ];

      const result = grouper.group(mockNodes);
      const stats = grouper.generateStatistics(result);

      expect(stats.totalNodes).toBe(3);
      expect(stats.frequencyDistribution).toBeDefined();
      expect(stats.functionDistribution).toBeDefined();
      expect(typeof stats.relationshipsCount).toBe('number');
    });
  });

  describe('Node Relationships', () => {
    it('should find related nodes', () => {
      const mockNodes = [
        {
          nodeType: 'nodes-base.slack',
          displayName: 'Slack',
          description: 'Slack integration',
          category: 'app'
        },
        {
          nodeType: 'nodes-base.discord',
          displayName: 'Discord',
          description: 'Discord integration',
          category: 'app'
        },
        {
          nodeType: 'nodes-base.postgres',
          displayName: 'PostgreSQL',
          description: 'Database',
          category: 'database'
        }
      ];

      const result = grouper.group(mockNodes);

      const slackNode = result.byFrequency.get(UsageFrequency.COMMON)?.find(n =>
        n.nodeType.includes('slack')
      );

      expect(slackNode?.relatedNodes.length).toBeGreaterThan(0);
      expect(slackNode?.relatedNodes).toContain('nodes-base.discord');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty node array', () => {
      const result = grouper.group([]);
      const stats = grouper.generateStatistics(result);

      expect(stats.totalNodes).toBe(0);
    });

    it('should assign default group for unknown nodes', () => {
      const mockNodes = [
        {
          nodeType: 'nodes-base.unknownNode',
          displayName: 'Unknown',
          description: 'Unknown node',
          category: 'misc'
        }
      ];

      const result = grouper.group(mockNodes);

      const specializedNodes = grouper.getNodesByFrequency(result, UsageFrequency.SPECIALIZED);
      expect(specializedNodes.length).toBe(1);

      const utilityNodes = grouper.getNodesByFunction(result, FunctionalGroup.UTILITY);
      expect(utilityNodes.length).toBe(1);
    });
  });
});
