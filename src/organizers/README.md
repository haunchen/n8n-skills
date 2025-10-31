# Organizers

此目錄包含節點組織和排序的工具。

## Priority Ranker (優先級排序器)

`priority-ranker.ts` 提供節點優先級計算和排序功能。

### 功能特色

1. 多因素評分系統
   - 使用頻率（40% 權重）
   - 文件完整性（20% 權重）
   - 社群受歡迎程度（20% 權重）
   - 節點通用性（20% 權重）

2. 自動層級分配
   - Essential（必備）：前 10 個節點
   - Common（常用）：第 11-50 個節點
   - Specialized（專業）：其餘節點

3. 靈活的配置系統
   - 透過 `config/priorities.json` 自訂權重
   - 支援必備清單和加速清單
   - 可調整各層級的節點數量上限

### 使用方式

```typescript
import { PriorityRanker, NodeData } from './organizers';

// 建立實例
const ranker = new PriorityRanker();

// 準備節點資料
const nodes: NodeData[] = [
  {
    nodeType: 'nodes-base.HttpRequest',
    displayName: 'HTTP Request',
    description: 'Makes HTTP requests',
    category: 'Core Nodes',
    usageCount: 150,
    hasDocumentation: true,
    propertyCount: 20
  },
  // 更多節點...
];

// 計算分數並排序
const rankedNodes = ranker.rankNodes(nodes);

// 依層級分組
const grouped = ranker.groupByTier(rankedNodes);

// 產生統計報告
const report = ranker.generateReport(rankedNodes);
```

### 評分演算法

每個節點的總分計算公式：

```
總分 = 使用頻率 × 0.4 + 文件完整性 × 0.2 + 社群受歡迎度 × 0.2 + 通用性 × 0.2
```

各項因素的評分標準：

1. 使用頻率（0-1）
   - 根據範本中的使用次數正規化
   - 使用次數越多，分數越高

2. 文件完整性（0-1）
   - 有描述：+0.3
   - 有完整文件：+0.5
   - 有屬性定義：+0.2

3. 社群受歡迎度（0-1）
   - 在必備清單中：1.0
   - 在加速清單中：0.8
   - 在常用清單中：0.7
   - 根據分類給予基礎分數：0.2-0.6

4. 通用性（0-1）
   - 核心功能節點：+0.5
   - 屬性數量 > 10：+0.3
   - 屬性數量 5-10：+0.2
   - 屬性數量 > 0：+0.1
   - 觸發/Webhook 節點：+0.2

### API 文件

#### PriorityRanker

主要類別，負責節點的評分和排序。

方法：

- `rankNodes(nodes: NodeData[]): ScoredNode[]`
  計算所有節點的分數並排序，返回包含分數和層級資訊的節點陣列

- `groupByTier(scoredNodes: ScoredNode[]): { essential, common, specialized }`
  將已評分的節點依層級分組

- `getNodesByTier(scoredNodes: ScoredNode[], tier: PriorityTier): ScoredNode[]`
  取得指定層級的節點

- `generateReport(scoredNodes: ScoredNode[]): Report`
  產生包含統計資訊的報告

#### 資料型別

```typescript
interface NodeData {
  nodeType: string;
  displayName: string;
  description?: string;
  category?: string;
  nodeCategory?: string;
  usageCount?: number;
  hasDocumentation?: boolean;
  propertyCount?: number;
  packageName?: string;
}

interface ScoredNode extends NodeData {
  score: number;
  scoringFactors: ScoringFactors;
  tier: PriorityTier;
  rank: number;
}

type PriorityTier = 'essential' | 'common' | 'specialized';
```

### 測試

執行測試：

```bash
npm test -- tests/organizers/priority-ranker.test.ts
```

查看使用範例：

```bash
ts-node src/organizers/priority-ranker.example.ts
```

## Category Organizer (分類組織器)

`category-organizer.ts` 根據預定義的分類將節點組織成結構化的群組。

### 功能特色

1. 類別管理
   - 從 `config/categories.json` 載入類別定義
   - 支援多層級類別（類別 → 子類別）
   - 按優先順序排序節點

2. 節點分配
   - 自動分配節點到對應類別
   - 決定主要節點（Top N）和次要節點
   - 識別未分類的節點

3. 統計報告
   - 各類別節點數量統計
   - 分類覆蓋率分析

### 使用方式

```typescript
import { CategoryOrganizer } from './organizers/category-organizer';

const organizer = new CategoryOrganizer('./config/categories.json');

const nodes = [
  {
    nodeType: 'nodes-base.httpRequest',
    displayName: 'HTTP Request',
    description: 'Make HTTP requests',
    category: 'core'
  }
];

// 組織節點，取前 50 個作為主要節點
const result = organizer.organize(nodes, 50);

console.log(`主要節點：${result.topNodes.length}`);
console.log(`次要節點：${result.remainingNodes.length}`);
console.log(`未分類：${result.uncategorizedNodes.length}`);

// 按類別分組
const grouped = organizer.groupByCategory(result.topNodes);

// 產生統計
const stats = organizer.generateStatistics(result);
```

### 資料型別

```typescript
interface CategoryDefinition {
  name: string;
  description: string;
  icon: string;
  priority: number;
  nodes?: string[];
  subcategories?: Record<string, string[]>;
}

interface CategorizedNode {
  nodeType: string;
  displayName: string;
  category: string;
  subcategory?: string;
  priority: number;
  isTopNode: boolean;
}

interface OrganizationResult {
  topNodes: CategorizedNode[];
  remainingNodes: CategorizedNode[];
  uncategorizedNodes: string[];
}
```

## Node Grouper (節點分組器)

`node-grouper.ts` 提供進階的節點分組功能，按使用頻率和功能特性組織節點。

### 功能特色

1. 使用頻率分類
   - Essential（必備）：核心節點，幾乎每個工作流程都會用到
   - Common（常用）：流行的第三方整合
   - Specialized（專業）：特定場景使用的節點

2. 功能群組分類
   - Communication（通訊工具）：Slack、Discord、Telegram 等
   - Productivity（生產力工具）：Google Sheets、Notion 等
   - Development（開發工具）：GitHub、GitLab、Jira 等
   - Database（資料庫）：PostgreSQL、MySQL、MongoDB 等
   - AI/ML（AI 和機器學習）：OpenAI、Anthropic 等
   - 其他 10+ 種功能群組

3. 節點關係映射
   - 自動發現相關節點
   - 定義替代關係（alternative）
   - 定義互補關係（complement）
   - 定義前置關係（prerequisite）

4. 智慧標籤
   - 自動產生節點標籤（trigger、webhook、ai 等）
   - 標示需要認證的節點
   - 標示多操作節點

### 使用方式

```typescript
import { NodeGrouper, UsageFrequency, FunctionalGroup } from './organizers/node-grouper';

const grouper = new NodeGrouper();

const nodes = [
  {
    nodeType: 'nodes-base.httpRequest',
    displayName: 'HTTP Request',
    description: 'Make HTTP requests',
    category: 'core'
  },
  {
    nodeType: 'nodes-base.slack',
    displayName: 'Slack',
    description: 'Slack integration',
    category: 'app',
    hasCredentials: true
  }
];

// 執行分組
const result = grouper.group(nodes);

// 取得必備節點
const essentialNodes = grouper.getNodesByFrequency(
  result,
  UsageFrequency.ESSENTIAL
);

// 取得通訊工具節點
const commNodes = grouper.getNodesByFunction(
  result,
  FunctionalGroup.COMMUNICATION
);

// 產生統計
const stats = grouper.generateStatistics(result);
console.log(`總節點數：${stats.totalNodes}`);
console.log(`關係數：${stats.relationshipsCount}`);
```

### 列舉型別

```typescript
enum UsageFrequency {
  ESSENTIAL = 'essential',
  COMMON = 'common',
  SPECIALIZED = 'specialized'
}

enum FunctionalGroup {
  COMMUNICATION = 'communication',
  PRODUCTIVITY = 'productivity',
  DEVELOPMENT = 'development',
  MARKETING = 'marketing',
  DATABASE = 'database',
  STORAGE = 'storage',
  AI_ML = 'ai_ml',
  AUTOMATION = 'automation',
  ANALYTICS = 'analytics',
  UTILITY = 'utility'
}
```

### 資料型別

```typescript
interface GroupedNode {
  nodeType: string;
  displayName: string;
  description: string;
  usageFrequency: UsageFrequency;
  functionalGroups: FunctionalGroup[];
  relatedNodes: string[];
  tags: string[];
}

interface NodeRelationship {
  sourceNode: string;
  targetNode: string;
  relationshipType: 'alternative' | 'complement' | 'prerequisite' | 'successor';
  description?: string;
}

interface GroupingResult {
  byFrequency: Map<UsageFrequency, GroupedNode[]>;
  byFunction: Map<FunctionalGroup, GroupedNode[]>;
  relationships: NodeRelationship[];
}
```

## 整合使用

這些組織器可以結合使用：

```typescript
import { CategoryOrganizer } from './organizers/category-organizer';
import { NodeGrouper, UsageFrequency } from './organizers/node-grouper';

// 步驟 1：按類別組織，決定主要節點
const categoryOrganizer = new CategoryOrganizer('./config/categories.json');
const categoryResult = categoryOrganizer.organize(allNodes, 50);

// 步驟 2：對主要節點進行邏輯分組
const nodeGrouper = new NodeGrouper();
const topNodesData = categoryResult.topNodes.map(node =>
  allNodes.find(n => n.nodeType === node.nodeType)
);
const groupingResult = nodeGrouper.group(topNodesData);

// 步驟 3：產生文件
const essentialNodes = nodeGrouper.getNodesByFrequency(
  groupingResult,
  UsageFrequency.ESSENTIAL
);

// 將必備節點放在最前面
generateSkillMd(essentialNodes, categoryResult.topNodes);
```

## 測試

執行所有組織器測試：

```bash
npm test -- tests/organizers/
```

執行特定測試：

```bash
npm test -- tests/organizers/category-organizer.test.ts
npm test -- tests/organizers/node-grouper.test.ts
```
