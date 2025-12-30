/**
 * SKILL.md 生成範例
 *
 * 此腳本示範如何使用 SkillGenerator 生成完整的 SKILL.md 文件
 *
 * 使用方式:
 *   npm run build
 *   node dist/examples/generate-skill.js
 */

import { resolve } from 'path';
import { NpmCollector } from '../src/collectors/npm-collector';
import { ApiCollector } from '../src/collectors/api-collector';
import { generateSkillFile, type SkillGeneratorInput } from '../src/generators';

async function main() {
  console.log('開始生成 SKILL.md...\n');

  // 步驟 1: 從 npm 套件收集節點資訊
  console.log('1. 從 npm 套件收集節點資訊...');
  const npmCollector = new NpmCollector();
  const nodes = await npmCollector.collectAll();
  console.log(`   收集到 ${nodes.length} 個節點\n`);

  // 步驟 2: 從 n8n.io API 收集使用統計
  console.log('2. 從 n8n.io API 收集使用統計...');
  let nodeUsageStats = {};
  try {
    const apiCollector = new ApiCollector({ limit: 100 });
    const result = await apiCollector.fetchTemplates();
    nodeUsageStats = result.nodeUsageStats;
    console.log(`   收集到 ${Object.keys(nodeUsageStats).length} 個節點的使用統計\n`);
  } catch (error) {
    console.warn('   API 收集失敗，使用空統計:', (error as Error).message);
    console.log('');
  }

  // 步驟 3: 準備資源檔案列表
  console.log('3. 準備資源檔案列表...');
  const resourceFiles = nodes.map(node => ({
    name: node.displayName,
    path: `resources/${node.nodeType}.md`,
    description: `${node.displayName} 節點詳細文件`,
    category: node.category,
  }));
  console.log(`   準備 ${resourceFiles.length} 個資源檔案索引\n`);

  // 步驟 4: 生成 SKILL.md
  console.log('4. 生成 SKILL.md...');
  const input: SkillGeneratorInput = {
    nodes: nodes.map(node => ({
      ...node,
      usageCount: nodeUsageStats[node.nodeType]?.count || 0,
      usagePercentage: nodeUsageStats[node.nodeType]?.percentage || 0,
    })),
    nodeUsageStats,
    resourceFiles,
    config: {
      name: 'n8n Workflow Automation',
      version: '1.0.0',
      description: 'Complete n8n workflow automation knowledge base',
      author: 'n8n-skill',
      license: 'Apache-2.0',
      maxLines: 5000,
      topNodesCount: 50,
    },
  };

  const outputPath = resolve(__dirname, '../../output/SKILL.md');
  await generateSkillFile(input, outputPath);

  console.log('\n完成！');
  console.log(`SKILL.md 已生成至: ${outputPath}`);
}

// 執行主函數
main().catch(error => {
  console.error('錯誤:', error);
  process.exit(1);
});
