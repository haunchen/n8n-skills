/**
 * 範例：使用 ResourceGenerator 和 TemplateFormatter
 *
 * 此範例展示如何：
 * 1. 建立資源生成器
 * 2. 生成節點文件
 * 3. 格式化生成的文件
 */

import { createResourceGenerator, createTemplateFormatter } from '../src/generators';
import type { NodeFullInfo } from '../src/generators';

async function main() {
  console.log('開始生成資源文件...\n');

  // 建立範例節點資訊
  const exampleNode: NodeFullInfo = {
    node: {
      nodeType: 'n8n-nodes-base.httpRequest',
      displayName: 'HTTP Request',
      description: '發送 HTTP 請求到任何 URL',
      category: 'core',
      nodeCategory: 'action',
      version: '4.1',
      packageName: 'n8n-nodes-base'
    },
    properties: {
      coreProperties: [
        {
          name: 'method',
          displayName: 'Method',
          type: 'options',
          description: 'HTTP 請求方法',
          required: true,
          default: 'GET',
          options: [
            { name: 'GET', value: 'GET', description: '取得資源' },
            { name: 'POST', value: 'POST', description: '建立資源' },
            { name: 'PUT', value: 'PUT', description: '更新資源' },
            { name: 'DELETE', value: 'DELETE', description: '刪除資源' }
          ]
        },
        {
          name: 'url',
          displayName: 'URL',
          type: 'string',
          description: '要請求的 URL',
          required: true,
          default: ''
        },
        {
          name: 'authentication',
          displayName: 'Authentication',
          type: 'options',
          description: '認證方式',
          required: false,
          default: 'none',
          options: [
            { name: 'None', value: 'none' },
            { name: 'Basic Auth', value: 'basicAuth' },
            { name: 'OAuth2', value: 'oAuth2' }
          ]
        }
      ],
      operations: [],
      hasCredentials: true,
      totalPropertyCount: 15
    },
    documentation: {
      description: 'HTTP Request 節點可以向任何 URL 發送 HTTP 請求，支援多種 HTTP 方法和認證方式。',
      usage: '使用此節點可以與任何 RESTful API 整合，發送 GET、POST、PUT、DELETE 等請求。',
      examples: [
        '```json\n{\n  "method": "GET",\n  "url": "https://api.example.com/users"\n}\n```',
        '```json\n{\n  "method": "POST",\n  "url": "https://api.example.com/users",\n  "body": {\n    "name": "John Doe"\n  }\n}\n```'
      ],
      keywords: ['http', 'request', 'api', 'rest', 'webhook'],
      tags: ['http', 'api', 'rest'],
      officialUrl: 'https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/'
    }
  };

  // 步驟 1: 建立資源生成器
  console.log('步驟 1: 建立資源生成器');
  const generator = createResourceGenerator({
    outputDir: './resources-example',
    categories: ['trigger', 'action', 'webhook', 'ai'],
    overwrite: true,
    generateIndex: true
  });

  // 步驟 2: 生成節點文件
  console.log('步驟 2: 生成節點文件');

  const nodePath = await generator.generateNodeDocument(exampleNode);
  console.log(`  - 節點文件：${nodePath}`);

  const examplePath = await generator.generateExampleDocument(exampleNode);
  console.log(`  - 範例文件：${examplePath}`);

  const referencePath = await generator.generateReferenceDocument(exampleNode);
  console.log(`  - 參考文件：${referencePath}`);

  // 步驟 3: 批次生成（使用多個節點）
  console.log('\n步驟 3: 批次生成多個節點');

  const nodes: NodeFullInfo[] = [
    exampleNode,
    // 可以加入更多節點...
  ];

  const results = await generator.generateAllResources(
    nodes,
    ['node', 'example', 'reference']
  );

  console.log(`  - 共生成 ${results.size} 個節點的文件`);

  // 步驟 4: 格式化生成的文件
  console.log('\n步驟 4: 格式化生成的文件');

  const formatter = createTemplateFormatter({
    maxLineLength: 100,
    headingStyle: 'atx',
    listStyle: 'dash',
    addTableOfContents: true,
    tocDepth: 3,
    cleanExtraWhitespace: true
  });

  const formatResults = await formatter.formatDirectory(
    './resources-example',
    true // 遞迴處理子目錄
  );

  console.log(`  - 共格式化 ${formatResults.size} 個檔案`);

  // 顯示成功/失敗統計
  const successCount = Array.from(formatResults.values()).filter(v => v).length;
  const failCount = formatResults.size - successCount;

  console.log(`  - 成功：${successCount} 個檔案`);
  if (failCount > 0) {
    console.log(`  - 失敗：${failCount} 個檔案`);
  }

  // 步驟 5: 展示單一檔案格式化
  console.log('\n步驟 5: 單一檔案格式化範例');

  const unformattedMarkdown = `
#標題不規範


##  子標題
*   項目1
 *  項目2


表格也不規範
|欄位1|欄位2|
|---|---|
|值1|值2|
  `.trim();

  const formatted = formatter.format(unformattedMarkdown);
  console.log('  原始內容：');
  console.log('  ' + unformattedMarkdown.split('\n').join('\n  '));
  console.log('\n  格式化後：');
  console.log('  ' + formatted.split('\n').join('\n  '));

  console.log('\n完成！');
  console.log(`\n請查看 ${generator.getOutputDir()} 目錄查看生成的文件。`);
}

// 執行範例
main().catch(error => {
  console.error('執行失敗：', error);
  process.exit(1);
});
