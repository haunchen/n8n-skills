/**
 * DocsCollector 使用範例
 * 展示如何從 n8n-docs 儲存庫收集節點文件摘要
 */

import { createDocsCollector } from '../src/collectors/docs-collector';

async function main() {
  console.log('初始化 DocsCollector...\n');

  // 建立文件收集器實例
  const collector = createDocsCollector({
    summaryLength: 200, // 自訂摘要長度為 200 字
  });

  try {
    // 收集所有節點文件摘要
    console.log('開始收集節點文件摘要...');
    console.log('這可能需要幾分鐘，因為需要 clone 或更新 n8n-docs 儲存庫\n');

    const summaries = await collector.collectDocsSummaries();

    console.log(`成功收集 ${summaries.size} 個節點的文件摘要\n`);

    // 顯示前 5 個節點的摘要
    console.log('前 5 個節點摘要範例：\n');
    let count = 0;
    for (const [nodeName, summary] of summaries) {
      if (count >= 5) break;

      console.log('─'.repeat(80));
      console.log(`節點名稱: ${nodeName}`);
      console.log(`分類: ${summary.category}`);
      console.log(`URL: ${summary.url}`);
      console.log(`摘要: ${summary.summary}`);
      console.log(`版權: ${summary.copyright}`);
      console.log();

      count++;
    }

    // 搜尋特定節點
    console.log('─'.repeat(80));
    console.log('\n搜尋特定節點範例：\n');

    const httpRequestNode = await collector.getNodeDocSummary('http-request');
    if (httpRequestNode) {
      console.log('找到 HTTP Request 節點：');
      console.log(`URL: ${httpRequestNode.url}`);
      console.log(`摘要: ${httpRequestNode.summary}`);
    } else {
      console.log('找不到 HTTP Request 節點文件');
    }

    // 按分類統計
    console.log('\n' + '─'.repeat(80));
    console.log('\n按分類統計：\n');

    const categories = new Map<string, number>();
    for (const summary of summaries.values()) {
      categories.set(summary.category, (categories.get(summary.category) || 0) + 1);
    }

    for (const [category, count] of categories) {
      console.log(`${category}: ${count} 個節點`);
    }

  } catch (error) {
    console.error('發生錯誤:', error);
    process.exit(1);
  }
}

// 執行範例
main().catch(console.error);
