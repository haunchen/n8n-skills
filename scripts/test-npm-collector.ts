#!/usr/bin/env ts-node
/**
 * npm-collector.ts 測試腳本
 * 用於驗證節點收集功能是否正常運作
 */

import { NpmCollector } from '../src/collectors/npm-collector';

async function main() {
  console.log('開始測試 NpmCollector...\n');

  const collector = new NpmCollector();

  try {
    console.log('正在收集節點資訊...');
    const startTime = Date.now();

    const nodes = await collector.collectAll();

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log(`\n收集完成！耗時：${duration} 秒`);
    console.log(`總共收集到 ${nodes.length} 個節點\n`);

    // 顯示統計資訊
    const stats = {
      總數: nodes.length,
      觸發器: nodes.filter(n => n.isTrigger).length,
      Webhook: nodes.filter(n => n.isWebhook).length,
      AI工具: nodes.filter(n => n.isAITool).length,
      需認證: nodes.filter(n => n.hasCredentials).length,
      有操作: nodes.filter(n => n.hasOperations).length,
      版本化: nodes.filter(n => n.isVersioned).length,
    };

    console.log('=== 統計資訊 ===');
    for (const [key, value] of Object.entries(stats)) {
      console.log(`${key}: ${value}`);
    }

    // 按套件分組統計
    const byPackage = nodes.reduce((acc, node) => {
      acc[node.packageName] = (acc[node.packageName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('\n=== 套件分佈 ===');
    for (const [pkg, count] of Object.entries(byPackage)) {
      console.log(`${pkg}: ${count} 個節點`);
    }

    // 按分類統計
    const byCategory = nodes.reduce((acc, node) => {
      acc[node.category] = (acc[node.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('\n=== 分類分佈（前 10 名）===');
    const topCategories = Object.entries(byCategory)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    for (const [category, count] of topCategories) {
      console.log(`${category}: ${count} 個節點`);
    }

    // 顯示一些範例節點
    console.log('\n=== 範例節點（前 5 個）===');
    nodes.slice(0, 5).forEach((node, index) => {
      console.log(`\n${index + 1}. ${node.displayName}`);
      console.log(`   節點類型: ${node.nodeType}`);
      console.log(`   分類: ${node.category}`);
      console.log(`   版本: ${node.version}`);
      console.log(`   描述: ${node.description.substring(0, 100)}${node.description.length > 100 ? '...' : ''}`);
      console.log(`   特性: ${[
        node.isTrigger && '觸發器',
        node.isWebhook && 'Webhook',
        node.isAITool && 'AI工具',
        node.hasCredentials && '需認證',
        node.hasOperations && '有操作',
        node.isVersioned && '版本化'
      ].filter(Boolean).join(', ') || '無'}`);
    });

    // 尋找一些特定的知名節點
    console.log('\n=== 知名節點檢查 ===');
    const famousNodes = ['Slack', 'HTTP Request', 'Gmail', 'Google Sheets', 'OpenAI'];

    for (const name of famousNodes) {
      const found = nodes.find(n => n.displayName === name);
      if (found) {
        console.log(`✓ ${name} - 版本 ${found.version} (${found.category})`);
      } else {
        console.log(`✗ ${name} - 未找到`);
      }
    }

    // 測試完成
    console.log('\n測試完成！');

  } catch (error) {
    console.error('錯誤:', error);
    process.exit(1);
  }
}

main();
