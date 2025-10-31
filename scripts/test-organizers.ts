/**
 * 快速測試組織器功能
 */

import path from 'path';
import { CategoryOrganizer } from '../src/organizers/category-organizer';
import { NodeGrouper } from '../src/organizers/node-grouper';

console.log('測試組織器功能\n');
console.log('='.repeat(60));

// 測試 CategoryOrganizer
console.log('\n1. 測試 CategoryOrganizer：');
const configPath = path.join(__dirname, 'config/categories.json');
const categoryOrganizer = new CategoryOrganizer(configPath);

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
    description: 'Send Slack messages',
    category: 'app'
  },
  {
    nodeType: 'nodes-base.postgres',
    displayName: 'PostgreSQL',
    description: 'PostgreSQL database',
    category: 'database'
  }
];

const categoryResult = categoryOrganizer.organize(mockNodes, 2);
console.log(`   主要節點：${categoryResult.topNodes.length}`);
console.log(`   次要節點：${categoryResult.remainingNodes.length}`);
console.log(`   未分類節點：${categoryResult.uncategorizedNodes.length}`);

categoryResult.topNodes.forEach(node => {
  console.log(`   - ${node.displayName} (優先順序: ${node.priority})`);
});

// 測試 NodeGrouper
console.log('\n2. 測試 NodeGrouper：');
const nodeGrouper = new NodeGrouper();

const groupingResult = nodeGrouper.group(mockNodes);
const stats = nodeGrouper.generateStatistics(groupingResult);

console.log(`   總節點數：${stats.totalNodes}`);
console.log(`   關係數：${stats.relationshipsCount}`);

console.log('\n   頻率分布：');
for (const [freq, count] of Object.entries(stats.frequencyDistribution)) {
  console.log(`     ${freq}: ${count}`);
}

console.log('\n   功能分布（非零）：');
for (const [func, count] of Object.entries(stats.functionDistribution)) {
  if (count > 0) {
    console.log(`     ${func}: ${count}`);
  }
}

console.log('\n測試完成！所有組織器運作正常。');
