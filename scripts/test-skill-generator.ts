/**
 * 快速測試 SkillGenerator 功能
 */

import { SkillGenerator, type SkillGeneratorInput } from '../src/generators/skill-generator';

// 模擬資料
const mockInput: SkillGeneratorInput = {
  nodes: [
    {
      nodeType: 'nodes-base.HttpRequest',
      displayName: 'HTTP Request',
      description: '發送 HTTP 請求並返回回應資料',
      category: 'core',
      packageName: 'n8n-nodes-base',
      version: '4.2',
      isVersioned: true,
      isTrigger: false,
      isWebhook: false,
      isAITool: false,
      hasCredentials: false,
      hasOperations: true,
      usageCount: 150,
      usagePercentage: 25.5,
    },
    {
      nodeType: 'nodes-base.Set',
      displayName: 'Set',
      description: '設定資料值',
      category: 'core',
      packageName: 'n8n-nodes-base',
      version: '3.3',
      isVersioned: true,
      isTrigger: false,
      isWebhook: false,
      isAITool: false,
      hasCredentials: false,
      hasOperations: false,
      usageCount: 120,
      usagePercentage: 20.4,
    },
    {
      nodeType: 'nodes-base.IF',
      displayName: 'IF',
      description: '根據條件路由資料',
      category: 'core',
      packageName: 'n8n-nodes-base',
      version: '2.0',
      isVersioned: true,
      isTrigger: false,
      isWebhook: false,
      isAITool: false,
      hasCredentials: false,
      hasOperations: false,
      usageCount: 100,
      usagePercentage: 17.0,
    },
    {
      nodeType: 'nodes-base.Slack',
      displayName: 'Slack',
      description: '傳送訊息到 Slack',
      category: 'communication',
      packageName: 'n8n-nodes-base',
      version: '2.1',
      isVersioned: true,
      isTrigger: false,
      isWebhook: false,
      isAITool: false,
      hasCredentials: true,
      hasOperations: true,
      usageCount: 80,
      usagePercentage: 13.6,
    },
  ],
  nodeUsageStats: {
    'nodes-base.HttpRequest': { count: 150, percentage: 25.5 },
    'nodes-base.Set': { count: 120, percentage: 20.4 },
    'nodes-base.IF': { count: 100, percentage: 17.0 },
    'nodes-base.Slack': { count: 80, percentage: 13.6 },
  },
  resourceFiles: [
    {
      name: 'HTTP Request',
      path: 'resources/nodes-base.HttpRequest.md',
      description: 'HTTP Request 節點詳細文件',
      category: 'core',
    },
    {
      name: 'Set',
      path: 'resources/nodes-base.Set.md',
      description: 'Set 節點詳細文件',
      category: 'core',
    },
    {
      name: 'IF',
      path: 'resources/nodes-base.IF.md',
      description: 'IF 節點詳細文件',
      category: 'core',
    },
    {
      name: 'Slack',
      path: 'resources/nodes-base.Slack.md',
      description: 'Slack 節點詳細文件',
      category: 'communication',
    },
  ],
  config: {
    name: 'n8n Workflow Automation',
    version: '1.0.0',
    description: 'n8n 工作流程自動化知識庫',
    topNodesCount: 10,
  },
};

// 執行測試
console.log('開始測試 SkillGenerator...\n');

const generator = new SkillGenerator(mockInput.config);
const content = generator.generate(mockInput);

console.log('生成完成！');
console.log(`總行數: ${content.split('\n').length}`);
console.log(`總字元數: ${content.length}`);

console.log('\n--- 前 50 行預覽 ---\n');
console.log(content.split('\n').slice(0, 50).join('\n'));

console.log('\n\n--- 驗證內容 ---');
console.log('✓ 包含 YAML frontmatter:', content.includes('---'));
console.log('✓ 包含專案名稱:', content.includes('n8n Workflow Automation'));
console.log('✓ 包含版本:', content.includes('version: 1.0.0'));
console.log('✓ 包含概述章節:', content.includes('## 什麼是 n8n？'));
console.log('✓ 包含快速開始:', content.includes('# 快速開始'));
console.log('✓ 包含節點索引:', content.includes('# 節點索引'));
console.log('✓ 包含工作流程模式:', content.includes('# 常見工作流程模式'));
console.log('✓ 包含資源檔案:', content.includes('# 資源檔案'));
console.log('✓ 包含授權聲明:', content.includes('# 授權聲明'));
console.log('✓ 包含 HTTP Request:', content.includes('HTTP Request'));
console.log('✓ 包含使用率:', content.includes('25.5%'));

console.log('\n測試完成！');
