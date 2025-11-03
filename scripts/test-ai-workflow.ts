import { ApiCollector } from '../src/collectors/api-collector';
import { WorkflowAnalyzer } from '../src/analyzers/workflow-analyzer';

async function test() {
  const collector = new ApiCollector();
  const analyzer = new WorkflowAnalyzer();

  const workflow = await collector.fetchWorkflowDefinition(6270);
  const analysis = analyzer.analyze(workflow);

  console.log(`名稱: ${analysis.name}`);
  console.log(`總節點: ${analysis.totalNodes}`);
  console.log(`活動節點: ${analysis.activeNodes}`);
  console.log(`\n關鍵節點:`);
  console.log(`  觸發器: ${analysis.keyNodes.triggers.length}`);
  console.log(`  AI 節點: ${analysis.keyNodes.aiNodes.length}`);
  console.log(`  工具: ${analysis.keyNodes.tools.length}`);

  console.log(`\n結構化描述:\n`);
  console.log(analysis.structuredDescription);
}

test().catch(console.error);
