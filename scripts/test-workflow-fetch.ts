/**
 * 測試 ApiCollector 的 workflow 獲取功能
 */

import { ApiCollector } from '../src/collectors/api-collector';

async function testWorkflowFetch() {
  const collector = new ApiCollector();

  try {
    // 測試 1: 獲取單個 workflow
    console.log('=== 測試 1: 獲取單個 workflow ===\n');
    const workflow = await collector.fetchWorkflowDefinition(1);

    // 先查看完整結構
    console.log('完整 workflow 結構:');
    console.log(JSON.stringify(workflow, null, 2).substring(0, 500));
    console.log('...\n');

    console.log(`Workflow ID: ${workflow.id}`);
    console.log(`名稱: ${workflow.name}`);
    console.log(`描述: ${workflow.description}`);
    console.log(`節點數量: ${workflow.nodes?.length || 0}`);
    console.log(`連接數量: ${Object.keys(workflow.connections || {}).length}`);

    // 顯示節點列表
    console.log('\n節點列表:');
    workflow.nodes.forEach(node => {
      console.log(`  - ${node.name} (${node.type})`);
    });

    // 顯示連接
    console.log('\n連接關係:');
    Object.entries(workflow.connections).forEach(([source, targets]) => {
      Object.entries(targets).forEach(([type, connections]) => {
        connections.forEach(connGroup => {
          connGroup.forEach(conn => {
            console.log(`  ${source} --[${type}]--> ${conn.node}`);
          });
        });
      });
    });

    // 測試 2: 批次獲取前 3 個 workflow
    console.log('\n=== 測試 2: 批次獲取 3 個 workflow ===\n');
    const workflows = await collector.fetchWorkflowDefinitions([1, 2, 3], 500);

    console.log(`\n成功獲取 ${workflows.length} 個 workflow:`);
    workflows.forEach(wf => {
      console.log(`  - [${wf.id}] ${wf.name} (${wf.nodes.length} 個節點)`);
    });

  } catch (error) {
    console.error('測試失敗:', error);
  }
}

testWorkflowFetch();
