/**
 * 測試 WorkflowAnalyzer
 */

import { ApiCollector } from '../src/collectors/api-collector';
import { WorkflowAnalyzer } from '../src/analyzers/workflow-analyzer';

async function testWorkflowAnalyzer() {
  const collector = new ApiCollector();
  const analyzer = new WorkflowAnalyzer();

  try {
    console.log('=== 測試 WorkflowAnalyzer ===\n');

    // 獲取幾個 workflow 進行測試
    console.log('獲取測試用 workflow...\n');
    const workflows = await collector.fetchWorkflowDefinitions([1, 1279, 2104], 500);

    workflows.forEach((workflow, index) => {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`測試 ${index + 1}: ${workflow.name || `Workflow ${workflow.id}`}`);
      console.log('='.repeat(80));

      // 分析 workflow
      const analysis = analyzer.analyze(workflow);

      console.log(`\n總節點數: ${analysis.totalNodes}`);
      console.log(`活動節點數: ${analysis.activeNodes} (排除 Sticky Notes)`);
      console.log(`連接數: ${analysis.connections.length}`);

      console.log('\n關鍵節點:');
      console.log(`  觸發器: ${analysis.keyNodes.triggers.length}`);
      console.log(`  AI 節點: ${analysis.keyNodes.aiNodes.length}`);
      console.log(`  工具節點: ${analysis.keyNodes.tools.length}`);

      console.log('\n節點分類統計:');
      const categoryCounts = analysis.nodes.reduce((acc, node) => {
        acc[node.category] = (acc[node.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      Object.entries(categoryCounts).forEach(([category, count]) => {
        console.log(`  ${category}: ${count}`);
      });

      console.log('\n結構化描述:');
      console.log('-'.repeat(80));
      console.log(analysis.structuredDescription);
    });

  } catch (error) {
    console.error('測試失敗:', error);
  }
}

testWorkflowAnalyzer();
