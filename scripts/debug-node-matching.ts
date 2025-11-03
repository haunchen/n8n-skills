import { NpmCollector } from '../src/collectors/npm-collector';
import { promises as fs } from 'fs';

async function debugMatching() {
  console.log('=== 載入節點資料 ===\n');

  // 讀取 enriched nodes
  const nodesData = JSON.parse(await fs.readFile('data/cache/nodes.json', 'utf-8'));
  console.log(`Enriched nodes 數量: ${nodesData.length}`);
  console.log('\n前 5 個 enriched nodes 的 nodeType:');
  nodesData.slice(0, 5).forEach((node: any, i: number) => {
    console.log(`  [${i+1}] ${node.nodeType} (${node.displayName})`);
  });

  // 載入實際的節點
  console.log('\n載入實際節點...');
  const npmCollector = new NpmCollector();
  const loadedNodes = await npmCollector.collectAllWithDetails();
  console.log(`Loaded nodes 數量: ${loadedNodes.length}`);

  console.log('\n前 5 個 loaded nodes 的資訊:');
  loadedNodes.slice(0, 5).forEach((ln: any, i: number) => {
    const desc = (npmCollector as any).getNodeDescription(ln.NodeClass);
    console.log(`  [${i+1}] packageName: ${ln.packageName}`);
    console.log(`      nodeName: ${ln.nodeName}`);
    console.log(`      description.name: ${desc.name || 'undefined'}`);
    console.log(`      description.displayName: ${desc.displayName || 'undefined'}`);
  });

  // 嘗試匹配第一個 enriched node
  console.log('\n=== 嘗試匹配第一個 enriched node ===');
  const firstEnriched = nodesData[0];
  console.log(`目標 nodeType: ${firstEnriched.nodeType}`);
  console.log(`目標 displayName: ${firstEnriched.displayName}`);

  const matched = loadedNodes.find((ln: any) => {
    const desc = (npmCollector as any).getNodeDescription(ln.NodeClass);
    const descName = desc.name || '';

    console.log(`  檢查: ${descName} vs ${firstEnriched.nodeType}`);
    return descName === firstEnriched.nodeType;
  });

  if (matched) {
    console.log('\n✓ 找到匹配！');
  } else {
    console.log('\n✗ 沒有找到匹配');
  }
}

debugMatching().catch(console.error);
