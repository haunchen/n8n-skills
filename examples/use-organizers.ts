/**
 * 使用範例：如何使用 CategoryOrganizer 和 NodeGrouper
 *
 * 本檔案展示如何整合這兩個組織器來處理節點資料
 */

import path from 'path';
import { CategoryOrganizer } from '../src/organizers/category-organizer';
import { NodeGrouper, UsageFrequency, FunctionalGroup } from '../src/organizers/node-grouper';

/**
 * 範例：按類別組織節點
 */
function exampleCategoryOrganization() {
  console.log('=== 類別組織範例 ===\n');

  const configPath = path.join(__dirname, '../config/categories.json');
  const organizer = new CategoryOrganizer(configPath);

  // 模擬節點資料
  const mockNodes = [
    {
      nodeType: 'nodes-base.httpRequest',
      displayName: 'HTTP Request',
      description: 'Make HTTP requests to any URL',
      category: 'core'
    },
    {
      nodeType: 'nodes-base.slack',
      displayName: 'Slack',
      description: 'Send messages to Slack',
      category: 'app'
    },
    {
      nodeType: 'nodes-base.googleSheets',
      displayName: 'Google Sheets',
      description: 'Read and write to Google Sheets',
      category: 'app'
    },
    {
      nodeType: 'nodes-base.postgres',
      displayName: 'PostgreSQL',
      description: 'Execute queries on PostgreSQL',
      category: 'database'
    },
    {
      nodeType: 'nodes-langchain.openai',
      displayName: 'OpenAI',
      description: 'Use OpenAI models',
      category: 'ai',
      isAITool: true
    }
  ];

  // 組織節點（Top 3）
  const result = organizer.organize(mockNodes, 3);

  console.log(`主要節點（Top ${result.topNodes.length}）：`);
  result.topNodes.forEach(node => {
    console.log(`  - ${node.displayName} (${node.category}, 優先順序: ${node.priority})`);
  });

  console.log(`\n次要節點（${result.remainingNodes.length} 個）：`);
  result.remainingNodes.forEach(node => {
    console.log(`  - ${node.displayName} (${node.category})`);
  });

  console.log(`\n未分類節點：${result.uncategorizedNodes.length} 個`);

  // 產生統計
  const stats = organizer.generateStatistics(result);
  console.log('\n統計資訊：');
  console.log(`  總節點數：${stats.totalNodes}`);
  console.log(`  主要節點：${stats.topNodesCount}`);
  console.log(`  次要節點：${stats.remainingNodesCount}`);
  console.log(`  未分類：${stats.uncategorizedCount}`);

  // 按類別分組
  const grouped = organizer.groupByCategory([...result.topNodes, ...result.remainingNodes]);
  console.log('\n按類別分組：');
  for (const [category, nodes] of grouped.entries()) {
    console.log(`  ${category}: ${nodes.length} 個節點`);
  }

  console.log('\n');
}

/**
 * 範例：邏輯分組節點
 */
function exampleLogicalGrouping() {
  console.log('=== 邏輯分組範例 ===\n');

  const grouper = new NodeGrouper();

  // 模擬節點資料
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
      category: 'app',
      hasCredentials: true
    },
    {
      nodeType: 'nodes-base.discord',
      displayName: 'Discord',
      description: 'Send Discord messages',
      category: 'app',
      hasCredentials: true
    },
    {
      nodeType: 'nodes-base.postgres',
      displayName: 'PostgreSQL',
      description: 'PostgreSQL database',
      category: 'database',
      hasCredentials: true,
      hasOperations: true
    },
    {
      nodeType: 'nodes-langchain.openai',
      displayName: 'OpenAI',
      description: 'OpenAI models',
      category: 'ai',
      isAITool: true,
      hasCredentials: true
    },
    {
      nodeType: 'nodes-base.cronTrigger',
      displayName: 'Cron Trigger',
      description: 'Schedule workflows',
      category: 'trigger',
      isTrigger: true
    }
  ];

  // 執行分組
  const result = grouper.group(mockNodes);

  // 按使用頻率分組
  console.log('按使用頻率分組：');
  for (const freq of Object.values(UsageFrequency)) {
    const nodes = grouper.getNodesByFrequency(result, freq);
    console.log(`  ${freq}: ${nodes.length} 個節點`);
    nodes.forEach(node => {
      console.log(`    - ${node.displayName} [${node.tags.join(', ')}]`);
    });
  }

  // 按功能群組
  console.log('\n按功能群組分組：');
  for (const func of Object.values(FunctionalGroup)) {
    const nodes = grouper.getNodesByFunction(result, func);
    if (nodes.length > 0) {
      console.log(`  ${func}: ${nodes.length} 個節點`);
      nodes.forEach(node => {
        console.log(`    - ${node.displayName}`);
        if (node.relatedNodes.length > 0) {
          console.log(`      相關節點: ${node.relatedNodes.slice(0, 2).join(', ')}`);
        }
      });
    }
  }

  // 統計資訊
  const stats = grouper.generateStatistics(result);
  console.log('\n統計資訊：');
  console.log(`  總節點數：${stats.totalNodes}`);
  console.log(`  關係數：${stats.relationshipsCount}`);

  console.log('\n頻率分布：');
  for (const [freq, count] of Object.entries(stats.frequencyDistribution)) {
    console.log(`  ${freq}: ${count}`);
  }

  console.log('\n功能分布：');
  for (const [func, count] of Object.entries(stats.functionDistribution)) {
    if (count > 0) {
      console.log(`  ${func}: ${count}`);
    }
  }

  console.log('\n');
}

/**
 * 範例：結合使用兩個組織器
 */
function exampleCombinedUsage() {
  console.log('=== 結合使用範例 ===\n');

  const configPath = path.join(__dirname, '../config/categories.json');
  const categoryOrganizer = new CategoryOrganizer(configPath);
  const nodeGrouper = new NodeGrouper();

  // 模擬節點資料
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
      description: 'Slack integration',
      category: 'app',
      hasCredentials: true
    },
    {
      nodeType: 'nodes-base.postgres',
      displayName: 'PostgreSQL',
      description: 'PostgreSQL database',
      category: 'database',
      hasCredentials: true
    }
  ];

  // 步驟 1：按類別組織，決定哪些進入主檔案
  const categoryResult = categoryOrganizer.organize(mockNodes, 2);
  console.log(`步驟 1：類別組織完成`);
  console.log(`  主要節點：${categoryResult.topNodes.length}`);
  console.log(`  次要節點：${categoryResult.remainingNodes.length}`);

  // 步驟 2：對主要節點進行邏輯分組
  const topNodesForGrouping = categoryResult.topNodes.map(node => {
    const original = mockNodes.find(n => n.nodeType === node.nodeType)!;
    return original;
  });

  const groupingResult = nodeGrouper.group(topNodesForGrouping);
  console.log(`\n步驟 2：邏輯分組完成`);

  // 顯示主要節點的分組資訊
  console.log('\n主要節點詳細資訊：');
  const essentialNodes = nodeGrouper.getNodesByFrequency(groupingResult, UsageFrequency.ESSENTIAL);
  const commonNodes = nodeGrouper.getNodesByFrequency(groupingResult, UsageFrequency.COMMON);

  if (essentialNodes.length > 0) {
    console.log('\n  必備節點：');
    essentialNodes.forEach(node => {
      console.log(`    - ${node.displayName}`);
      console.log(`      功能群組：${node.functionalGroups.join(', ')}`);
      console.log(`      標籤：${node.tags.join(', ')}`);
    });
  }

  if (commonNodes.length > 0) {
    console.log('\n  常用節點：');
    commonNodes.forEach(node => {
      console.log(`    - ${node.displayName}`);
      console.log(`      功能群組：${node.functionalGroups.join(', ')}`);
      if (node.relatedNodes.length > 0) {
        console.log(`      相關節點：${node.relatedNodes.join(', ')}`);
      }
    });
  }

  console.log('\n');
}

/**
 * 執行所有範例
 */
function main() {
  console.log('n8n Skill Pack - 組織器使用範例\n');
  console.log('=' .repeat(60));
  console.log('\n');

  try {
    exampleCategoryOrganization();
    exampleLogicalGrouping();
    exampleCombinedUsage();

    console.log('所有範例執行完成！');
  } catch (error) {
    console.error('執行範例時發生錯誤：', error);
  }
}

// 如果直接執行此檔案，執行範例
if (require.main === module) {
  main();
}

export {
  exampleCategoryOrganization,
  exampleLogicalGrouping,
  exampleCombinedUsage
};
