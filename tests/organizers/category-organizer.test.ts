import { CategoryOrganizer } from '../../src/organizers/category-organizer';
import path from 'path';

describe('CategoryOrganizer', () => {
  let organizer: CategoryOrganizer;
  const configPath = path.join(__dirname, '../../config/categories.json');

  beforeEach(() => {
    organizer = new CategoryOrganizer(configPath);
  });

  describe('organize', () => {
    it('應該正確組織節點為主要和次要節點', () => {
      const mockNodes = [
        {
          nodeType: 'nodes-base.httpRequest',
          displayName: 'HTTP Request',
          description: 'Make HTTP requests',
          category: 'core'
        },
        {
          nodeType: 'nodes-base.slack',
          displayName: 'Slack',
          description: 'Send messages to Slack',
          category: 'app'
        },
        {
          nodeType: 'nodes-base.unknown',
          displayName: 'Unknown Node',
          description: 'Unknown',
          category: 'misc'
        }
      ];

      const result = organizer.organize(mockNodes, 2);

      expect(result.topNodes.length).toBe(2);
      expect(result.remainingNodes.length).toBe(0);
      expect(result.uncategorizedNodes.length).toBe(1);
    });

    it('應該根據優先順序排序節點', () => {
      const mockNodes = [
        {
          nodeType: 'nodes-base.slack',
          displayName: 'Slack',
          description: 'Slack integration',
          category: 'app'
        },
        {
          nodeType: 'nodes-base.httpRequest',
          displayName: 'HTTP Request',
          description: 'HTTP requests',
          category: 'core'
        }
      ];

      const result = organizer.organize(mockNodes, 10);

      expect(result.topNodes[0].displayName).toBe('HTTP Request');
      expect(result.topNodes[0].priority).toBeLessThan(result.topNodes[1].priority);
    });
  });

  describe('groupByCategory', () => {
    it('應該按類別分組節點', () => {
      const categorizedNodes = [
        {
          nodeType: 'nodes-base.httpRequest',
          displayName: 'HTTP Request',
          category: 'core',
          priority: 1,
          isTopNode: true
        },
        {
          nodeType: 'nodes-base.slack',
          displayName: 'Slack',
          category: 'app',
          subcategory: 'communication',
          priority: 2,
          isTopNode: true
        }
      ];

      const grouped = organizer.groupByCategory(categorizedNodes);

      expect(grouped.has('core')).toBe(true);
      expect(grouped.has('app.communication')).toBe(true);
      expect(grouped.get('core')?.length).toBe(1);
    });
  });

  describe('getCategoryInfo', () => {
    it('應該回傳正確的類別資訊', () => {
      const coreInfo = organizer.getCategoryInfo('core');

      expect(coreInfo).toBeDefined();
      expect(coreInfo?.name).toBe('核心節點');
      expect(coreInfo?.priority).toBe(1);
    });

    it('對於不存在的類別應該回傳 undefined', () => {
      const info = organizer.getCategoryInfo('nonexistent');
      expect(info).toBeUndefined();
    });
  });

  describe('generateStatistics', () => {
    it('應該產生正確的統計資訊', () => {
      const result = {
        topNodes: [
          {
            nodeType: 'nodes-base.httpRequest',
            displayName: 'HTTP Request',
            category: 'core',
            priority: 1,
            isTopNode: true
          }
        ],
        remainingNodes: [
          {
            nodeType: 'nodes-base.slack',
            displayName: 'Slack',
            category: 'app',
            priority: 2,
            isTopNode: false
          }
        ],
        uncategorizedNodes: ['nodes-base.unknown']
      };

      const stats = organizer.generateStatistics(result);

      expect(stats.totalNodes).toBe(3);
      expect(stats.topNodesCount).toBe(1);
      expect(stats.remainingNodesCount).toBe(1);
      expect(stats.uncategorizedCount).toBe(1);
    });
  });
});
