/**
 * Parser 使用範例
 * 展示如何使用 node-parser 和 property-parser
 */

import { NodeParser, PropertyParser } from '../src/parsers';

// 模擬一個簡單的 n8n 節點
const mockNode = {
  description: {
    displayName: 'HTTP Request',
    name: 'HttpRequest',
    description: 'Makes HTTP requests to external APIs',
    group: ['transform'],
    version: 2,
    properties: [
      {
        displayName: 'Method',
        name: 'method',
        type: 'options',
        required: true,
        default: 'GET',
        options: [
          { name: 'GET', value: 'GET' },
          { name: 'POST', value: 'POST' },
          { name: 'PUT', value: 'PUT' },
          { name: 'DELETE', value: 'DELETE' }
        ],
        description: 'The HTTP method to use'
      },
      {
        displayName: 'URL',
        name: 'url',
        type: 'string',
        required: true,
        default: '',
        description: 'The URL to make the request to'
      },
      {
        displayName: 'Headers',
        name: 'headers',
        type: 'fixedCollection',
        required: false,
        default: {},
        description: 'HTTP headers to send'
      }
    ],
    credentials: [
      {
        name: 'httpBasicAuth',
        required: false
      }
    ]
  }
};

// 測試 NodeParser
console.log('=== NodeParser 測試 ===\n');
const nodeParser = new NodeParser();
const nodeInfo = nodeParser.parse(mockNode, 'n8n-nodes-base');
console.log('節點資訊：', JSON.stringify(nodeInfo, null, 2));

// 測試 PropertyParser
console.log('\n=== PropertyParser 測試 ===\n');
const propertyParser = new PropertyParser();
const properties = propertyParser.parse(mockNode);
console.log('屬性資訊：', JSON.stringify(properties, null, 2));

// 輸出摘要
console.log('\n=== 摘要 ===');
console.log(`節點名稱：${nodeInfo.displayName}`);
console.log(`節點類型：${nodeInfo.nodeCategory}`);
console.log(`版本：${nodeInfo.version}`);
console.log(`核心屬性數量：${properties.coreProperties.length}/${properties.totalPropertyCount}`);
console.log(`是否需要憑證：${properties.hasCredentials ? '是' : '否'}`);
console.log(`操作數量：${properties.operations.length}`);
