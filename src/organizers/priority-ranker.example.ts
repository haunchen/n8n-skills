import { PriorityRanker, NodeData } from './priority-ranker';

/**
 * Priority Ranker 使用範例
 *
 * 此檔案展示如何使用 PriorityRanker 來計算和排序節點優先級
 */

// 建立 PriorityRanker 實例
const ranker = new PriorityRanker();

// 準備節點資料
const nodes: NodeData[] = [
  {
    nodeType: 'nodes-base.HttpRequest',
    displayName: 'HTTP Request',
    description: 'Makes HTTP requests to any URL',
    category: 'Core Nodes',
    nodeCategory: 'action',
    usageCount: 150,
    hasDocumentation: true,
    propertyCount: 20,
    packageName: 'n8n-nodes-base'
  },
  {
    nodeType: 'nodes-base.Webhook',
    displayName: 'Webhook',
    description: 'Receives webhook requests',
    category: 'Core Nodes',
    nodeCategory: 'webhook',
    usageCount: 120,
    hasDocumentation: true,
    propertyCount: 15,
    packageName: 'n8n-nodes-base'
  },
  {
    nodeType: 'nodes-base.Code',
    displayName: 'Code',
    description: 'Execute JavaScript code',
    category: 'Core Nodes',
    nodeCategory: 'action',
    usageCount: 100,
    hasDocumentation: true,
    propertyCount: 12,
    packageName: 'n8n-nodes-base'
  },
  {
    nodeType: 'nodes-base.Slack',
    displayName: 'Slack',
    description: 'Send messages to Slack',
    category: 'Communication',
    nodeCategory: 'action',
    usageCount: 80,
    hasDocumentation: true,
    propertyCount: 10,
    packageName: 'n8n-nodes-base'
  },
  {
    nodeType: 'nodes-base.GoogleSheets',
    displayName: 'Google Sheets',
    description: 'Read and write data from Google Sheets',
    category: 'Data & Storage',
    nodeCategory: 'action',
    usageCount: 70,
    hasDocumentation: true,
    propertyCount: 18,
    packageName: 'n8n-nodes-base'
  },
  {
    nodeType: 'nodes-base.SomeRandomNode',
    displayName: 'Some Random Node',
    description: 'A specialized node for specific use case',
    category: 'Misc',
    nodeCategory: 'action',
    usageCount: 5,
    hasDocumentation: false,
    propertyCount: 3,
    packageName: 'n8n-nodes-base'
  }
];

// 1. 計算分數並排序所有節點
console.log('=== 節點排序結果 ===\n');
const rankedNodes = ranker.rankNodes(nodes);

rankedNodes.forEach(node => {
  console.log(`排名 ${node.rank}: ${node.displayName}`);
  console.log(`  類型: ${node.nodeType}`);
  console.log(`  層級: ${node.tier}`);
  console.log(`  總分: ${node.score.toFixed(3)}`);
  console.log(`  評分因素:`);
  console.log(`    - 使用頻率: ${node.scoringFactors.usageFrequency.toFixed(3)}`);
  console.log(`    - 文件完整性: ${node.scoringFactors.documentationQuality.toFixed(3)}`);
  console.log(`    - 社群受歡迎度: ${node.scoringFactors.communityPopularity.toFixed(3)}`);
  console.log(`    - 通用性: ${node.scoringFactors.versatility.toFixed(3)}`);
  console.log('');
});

// 2. 依層級分組
console.log('\n=== 依層級分組 ===\n');
const grouped = ranker.groupByTier(rankedNodes);

console.log(`必備節點（Essential）: ${grouped.essential.length} 個`);
grouped.essential.forEach(node => {
  console.log(`  - ${node.displayName} (分數: ${node.score.toFixed(3)})`);
});

console.log(`\n常用節點（Common）: ${grouped.common.length} 個`);
grouped.common.forEach(node => {
  console.log(`  - ${node.displayName} (分數: ${node.score.toFixed(3)})`);
});

console.log(`\n專業節點（Specialized）: ${grouped.specialized.length} 個`);
grouped.specialized.forEach(node => {
  console.log(`  - ${node.displayName} (分數: ${node.score.toFixed(3)})`);
});

// 3. 產生統計報告
console.log('\n=== 統計報告 ===\n');
const report = ranker.generateReport(rankedNodes);

console.log(`總節點數: ${report.totalNodes}`);
console.log(`\n各層級節點數:`);
console.log(`  - 必備: ${report.tierCounts.essential}`);
console.log(`  - 常用: ${report.tierCounts.common}`);
console.log(`  - 專業: ${report.tierCounts.specialized}`);

console.log(`\n各層級平均分數:`);
console.log(`  - 必備: ${report.averageScores.essential.toFixed(3)}`);
console.log(`  - 常用: ${report.averageScores.common.toFixed(3)}`);
console.log(`  - 專業: ${report.averageScores.specialized.toFixed(3)}`);

console.log(`\nTop 10 節點:`);
report.topNodes.forEach((node, index) => {
  console.log(`  ${index + 1}. ${node.displayName} (${node.score.toFixed(3)})`);
});

// 4. 取得特定層級的節點
console.log('\n=== 取得必備層級節點 ===\n');
const essentialNodes = ranker.getNodesByTier(rankedNodes, 'essential');
console.log(`找到 ${essentialNodes.length} 個必備節點：`);
essentialNodes.forEach(node => {
  console.log(`  - ${node.displayName}`);
});

/**
 * 輸出範例：
 *
 * === 節點排序結果 ===
 *
 * 排名 1: HTTP Request
 *   類型: nodes-base.HttpRequest
 *   層級: essential
 *   總分: 0.950
 *   評分因素:
 *     - 使用頻率: 1.000
 *     - 文件完整性: 1.000
 *     - 社群受歡迎度: 1.000
 *     - 通用性: 0.800
 *
 * 排名 2: Webhook
 *   類型: nodes-base.Webhook
 *   層級: essential
 *   總分: 0.920
 *   ...
 *
 * === 依層級分組 ===
 *
 * 必備節點（Essential）: 3 個
 *   - HTTP Request (分數: 0.950)
 *   - Webhook (分數: 0.920)
 *   - Code (分數: 0.890)
 *
 * 常用節點（Common）: 2 個
 *   - Slack (分數: 0.780)
 *   - Google Sheets (分數: 0.720)
 *
 * 專業節點（Specialized）: 1 個
 *   - Some Random Node (分數: 0.250)
 */
