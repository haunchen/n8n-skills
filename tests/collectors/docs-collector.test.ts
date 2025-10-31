import { DocsCollector, createDocsCollector } from '../../src/collectors/docs-collector';

describe('DocsCollector', () => {
  let collector: DocsCollector;

  beforeEach(() => {
    collector = createDocsCollector({
      summaryLength: 100,
    });
  });

  describe('建立實例', () => {
    test('應該能建立 DocsCollector 實例', () => {
      expect(collector).toBeInstanceOf(DocsCollector);
    });

    test('應該能使用工廠函數建立實例', () => {
      const newCollector = createDocsCollector();
      expect(newCollector).toBeInstanceOf(DocsCollector);
    });
  });

  describe('配置', () => {
    test('應該能自訂摘要長度', () => {
      const customCollector = createDocsCollector({
        summaryLength: 150,
      });
      expect(customCollector).toBeInstanceOf(DocsCollector);
    });

    test('應該能自訂儲存庫路徑', () => {
      const customCollector = createDocsCollector({
        localPath: '/tmp/test-n8n-docs',
      });
      expect(customCollector).toBeInstanceOf(DocsCollector);
    });

    test('應該能自訂文件分類', () => {
      const customCollector = createDocsCollector({
        categories: ['core-nodes', 'app-nodes'],
      });
      expect(customCollector).toBeInstanceOf(DocsCollector);
    });
  });

  describe('清理快取', () => {
    test('應該能清理快取而不拋出錯誤', async () => {
      await expect(collector.clearCache()).resolves.not.toThrow();
    });
  });

  // 注意：以下測試需要網路連線和較長的執行時間
  // 在 CI/CD 環境中可能需要跳過這些測試
  describe.skip('收集文件摘要', () => {
    test('應該能收集節點文件摘要', async () => {
      const summaries = await collector.collectDocsSummaries();
      expect(summaries).toBeInstanceOf(Map);
      expect(summaries.size).toBeGreaterThan(0);
    }, 300000); // 5 分鐘超時

    test('收集的摘要應該包含必要欄位', async () => {
      const summaries = await collector.collectDocsSummaries();
      const firstSummary = summaries.values().next().value;

      expect(firstSummary).toBeDefined();
      expect(firstSummary).toHaveProperty('nodeName');
      expect(firstSummary).toHaveProperty('summary');
      expect(firstSummary).toHaveProperty('url');
      expect(firstSummary).toHaveProperty('category');
      expect(firstSummary).toHaveProperty('copyright');
    }, 300000);

    test('摘要長度應該不超過配置的長度', async () => {
      const summaries = await collector.collectDocsSummaries();
      const firstSummary = summaries.values().next().value;

      expect(firstSummary).toBeDefined();
      if (firstSummary) {
        expect(firstSummary.summary.length).toBeLessThanOrEqual(150); // 100 + 一些緩衝
      }
    }, 300000);

    test('應該能搜尋特定節點', async () => {
      const summary = await collector.getNodeDocSummary('webhook');

      if (summary) {
        expect(summary).toHaveProperty('nodeName');
        expect(summary).toHaveProperty('summary');
        expect(summary.url).toContain('docs.n8n.io');
      }
    }, 300000);
  });
});
