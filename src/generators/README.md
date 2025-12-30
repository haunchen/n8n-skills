# Generators 模組

此模組負責生成 n8n skill 的各種輸出檔案。

## 檔案結構

```
generators/
├── index.ts                    # 模組導出
├── skill-generator.ts          # 主要 SKILL.md 生成器
├── skill-generator.test.ts     # Skill 生成器測試
├── resource-generator.ts       # 資源檔案生成器
├── template-formatter.ts       # 範本格式化器
└── README.md                   # 本檔案
```

## 模組說明

### skill-generator.ts

生成主要的 SKILL.md 文件，包含：
- YAML frontmatter
- n8n 概述
- 快速開始指南
- 最常用節點列表
- 節點索引（按分類）
- 常見工作流程模式
- 資源檔案索引
- 授權聲明

特色：
- 自動按使用率排序節點
- 控制檔案大小（預設 < 5000 行）
- 支援中文分類翻譯
- 內建常見工作流程模式

使用範例：
```typescript
import { generateSkillFile } from './generators';

await generateSkillFile({
  nodes: enrichedNodes,
  nodeUsageStats: stats,
  resourceFiles: resources,
  config: {
    name: 'n8n Workflow Automation',
    version: '1.0.0',
    topNodesCount: 50,
  }
}, './output/SKILL.md');
```

### resource-generator.ts

為每個節點生成詳細的 Markdown 資源檔案。

功能：
- 生成節點詳細說明（resources/nodes/*.md）
- 生成範例文件（resources/examples/*.md）
- 生成參考資料（resources/reference/*.md）
- 支援批次生成
- 自動生成索引檔案

特色：
- 節點完整描述和配置資訊
- 屬性和操作列表
- 使用範例（包含 JSON 配置）
- 官方文件連結
- 按分類組織輸出

使用範例：
```typescript
import { createResourceGenerator } from './generators';

const generator = createResourceGenerator({
  outputDir: './resources',
  categories: ['trigger', 'action', 'webhook', 'ai'],
  overwrite: false,
  generateIndex: true
});

// 生成單一節點的所有文件
await generator.generateNodeDocument(nodeInfo);
await generator.generateExampleDocument(nodeInfo);
await generator.generateReferenceDocument(nodeInfo);

// 批次生成
const results = await generator.generateAllResources(nodes);
```

### template-formatter.ts

格式化和美化 Markdown 輸出。

功能：
- 統一 Markdown 風格（標題、列表、程式碼區塊）
- 自動加入目錄（TOC）
- 確保可讀性（適當的空行、縮排）
- 清理多餘空白和格式問題
- 統一表格格式
- 正規化連結和圖片格式

特色：
- 支援多種標題樣式（ATX / Setext）
- 可自訂列表標記（-, *, +）
- 自動生成目錄連結
- 表格自動對齊
- 保留程式碼區塊內的原始格式

使用範例：
```typescript
import { createTemplateFormatter, formatMarkdown } from './generators';

// 快速格式化
const formatted = formatMarkdown(content, {
  addTableOfContents: true,
  tocDepth: 3
});

// 建立格式化器實例
const formatter = createTemplateFormatter({
  headingStyle: 'atx',
  listStyle: 'dash',
  addTableOfContents: true
});

// 格式化檔案
await formatter.formatFile('./docs/README.md');

// 格式化整個目錄
await formatter.formatDirectory('./resources', true);
```

## 資料流程

```
NpmCollector → SimplifiedNodeInfo[]
      ↓
DocsCollector → ParsedDocumentation
      ↓
ApiCollector → NodeUsageStats
      ↓
組合 → EnrichedNodeInfo[]
      ↓
SkillGenerator → SKILL.md
      ↓
ResourceGenerator → resources/*.md
```

## 測試

執行所有測試：
```bash
npm test src/generators/
```

執行特定測試：
```bash
npm test src/generators/skill-generator.test.ts
```

## 相關文件

- [Skill Generator 使用說明](../../docs/skill-generator-usage.md)
- [範例腳本](../../examples/generate-skill.ts)

## 類型定義

主要類型定義：

```typescript
// Skill 配置
interface SkillConfig {
  name: string;
  version: string;
  description: string;
  author?: string;
  license?: string;
  maxLines?: number;
  topNodesCount?: number;
}

// 擴充節點資訊
interface EnrichedNodeInfo extends SimplifiedNodeInfo {
  documentation?: ParsedDocumentation;
  usageCount?: number;
  usagePercentage?: number;
}

// 資源檔案資訊
interface ResourceFile {
  name: string;
  path: string;
  description: string;
  category?: string;
}

// 生成器輸入
interface SkillGeneratorInput {
  nodes: EnrichedNodeInfo[];
  nodeUsageStats: NodeUsageStats;
  resourceFiles: ResourceFile[];
  config: SkillConfig;
}
```
