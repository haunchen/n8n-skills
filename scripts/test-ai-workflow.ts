import { ApiCollector } from '../src/collectors/api-collector';
import { WorkflowAnalyzer } from '../src/analyzers/workflow-analyzer';

async function test() {
  const collector = new ApiCollector();
  const analyzer = new WorkflowAnalyzer();

  const workflow = await collector.fetchWorkflowDefinition(6270);
  const analysis = analyzer.analyze(workflow);

  console.log(`Name: ${analysis.name}`);
  console.log(`Total nodes: ${analysis.totalNodes}`);
  console.log(`Active nodes: ${analysis.activeNodes}`);
  console.log(`\nKey nodes:`);
  console.log(`  Triggers: ${analysis.keyNodes.triggers.length}`);
  console.log(`  AI nodes: ${analysis.keyNodes.aiNodes.length}`);
  console.log(`  Tools: ${analysis.keyNodes.tools.length}`);

  console.log(`\nStructured description:\n`);
  console.log(analysis.structuredDescription);
}

test().catch(console.error);
