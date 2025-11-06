/**
 * Test ApiCollector workflow fetching functionality
 */

import { ApiCollector } from '../src/collectors/api-collector';

async function testWorkflowFetch() {
  const collector = new ApiCollector();

  try {
    // Test 1: Fetch single workflow
    console.log('=== Test 1: Fetch Single Workflow ===\n');
    const workflow = await collector.fetchWorkflowDefinition(1);

    // View complete structure first
    console.log('Complete workflow structure:');
    console.log(JSON.stringify(workflow, null, 2).substring(0, 500));
    console.log('...\n');

    console.log(`Workflow ID: ${workflow.id}`);
    console.log(`Name: ${workflow.name}`);
    console.log(`Description: ${workflow.description}`);
    console.log(`Node count: ${workflow.nodes?.length || 0}`);
    console.log(`Connection count: ${Object.keys(workflow.connections || {}).length}`);

    // Display node list
    console.log('\nNode list:');
    workflow.nodes.forEach(node => {
      console.log(`  - ${node.name} (${node.type})`);
    });

    // Display connections
    console.log('\nConnection relationships:');
    Object.entries(workflow.connections).forEach(([source, targets]) => {
      Object.entries(targets).forEach(([type, connections]) => {
        connections.forEach(connGroup => {
          connGroup.forEach(conn => {
            console.log(`  ${source} --[${type}]--> ${conn.node}`);
          });
        });
      });
    });

    // Test 2: Batch fetch first 3 workflows
    console.log('\n=== Test 2: Batch Fetch 3 Workflows ===\n');
    const workflows = await collector.fetchWorkflowDefinitions([1, 2, 3], 500);

    console.log(`\nSuccessfully fetched ${workflows.length} workflows:`);
    workflows.forEach(wf => {
      console.log(`  - [${wf.id}] ${wf.name} (${wf.nodes.length} nodes)`);
    });

  } catch (error) {
    console.error('Test failed:', error);
  }
}

testWorkflowFetch();
