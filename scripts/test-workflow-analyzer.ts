/**
 * Test WorkflowAnalyzer
 */

import { ApiCollector } from '../src/collectors/api-collector';
import { WorkflowAnalyzer } from '../src/analyzers/workflow-analyzer';

async function testWorkflowAnalyzer() {
  const collector = new ApiCollector();
  const analyzer = new WorkflowAnalyzer();

  try {
    console.log('=== Testing WorkflowAnalyzer ===\n');

    // Fetch several workflows for testing
    console.log('Fetching test workflows...\n');
    const workflows = await collector.fetchWorkflowDefinitions([1, 1279, 2104], 500);

    workflows.forEach((workflow, index) => {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`Test ${index + 1}: ${workflow.name || `Workflow ${workflow.id}`}`);
      console.log('='.repeat(80));

      // Analyze workflow
      const analysis = analyzer.analyze(workflow);

      console.log(`\nTotal nodes: ${analysis.totalNodes}`);
      console.log(`Active nodes: ${analysis.activeNodes} (excluding Sticky Notes)`);
      console.log(`Connections: ${analysis.connections.length}`);

      console.log('\nKey nodes:');
      console.log(`  Triggers: ${analysis.keyNodes.triggers.length}`);
      console.log(`  AI nodes: ${analysis.keyNodes.aiNodes.length}`);
      console.log(`  Tool nodes: ${analysis.keyNodes.tools.length}`);

      console.log('\nNode category statistics:');
      const categoryCounts = analysis.nodes.reduce((acc, node) => {
        acc[node.category] = (acc[node.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      Object.entries(categoryCounts).forEach(([category, count]) => {
        console.log(`  ${category}: ${count}`);
      });

      console.log('\nStructured description:');
      console.log('-'.repeat(80));
      console.log(analysis.structuredDescription);
    });

  } catch (error) {
    console.error('Test failed:', error);
  }
}

testWorkflowAnalyzer();
