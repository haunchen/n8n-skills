import { ApiCollector, fetchPopularTemplates } from '../src/collectors/api-collector';

async function main() {
  console.log('API 收集器使用範例\n');

  // 範例 1: 使用便利函數快速抓取熱門範本
  console.log('範例 1: 抓取前 20 個熱門範本');
  console.log('='.repeat(60));
  const result = await fetchPopularTemplates(20);
  console.log(`成功抓取 ${result.templates.length} 個範本`);
  console.log(`總範本數量: ${result.totalTemplates}`);

  // 顯示前 3 個範本
  result.templates.slice(0, 3).forEach((template, index) => {
    console.log(`\n${index + 1}. ${template.name}`);
    console.log(`   瀏覽次數: ${template.totalViews}`);
    console.log(`   節點數量: ${template.nodes?.length || 0}`);
  });

  // 範例 2: 使用類別進行更多控制
  console.log('\n\n範例 2: 搜尋特定主題的範本');
  console.log('='.repeat(60));
  const collector = new ApiCollector({
    limit: 10,
    timeout: 15000,
  });

  const searchResults = await collector.searchTemplates('gmail', 5);
  console.log(`找到 ${searchResults.length} 個與 Gmail 相關的範本:`);
  searchResults.forEach((template, index) => {
    console.log(`${index + 1}. ${template.name} (${template.totalViews} 次瀏覽)`);
  });

  // 範例 3: 節點使用統計
  console.log('\n\n範例 3: 節點使用統計');
  console.log('='.repeat(60));
  const statsResult = await collector.fetchTemplates();
  collector.printNodeUsageStats(statsResult.nodeUsageStats, 10);

  console.log('\n完成！');
}

main().catch(console.error);
