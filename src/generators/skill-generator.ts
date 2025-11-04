/**
 * Copyright (c) 2025 Frank Chen @ www.frankchen.tw/personal
 * SPDX-License-Identifier: MIT
 *
 * This file is part of n8n-skills project.
 */

/**
 * Skill Generator
 * 生成主要的 Skill.md 文件
 *
 * 此生成器會組合所有收集和處理的資料，生成結構化的 Markdown 文件
 */

import type { SimplifiedNodeInfo } from '../collectors/npm-collector';
import type { NodeUsageStats } from '../collectors/api-collector';
import type { ParsedProperties } from '../parsers/property-parser';
import type { PriorityTier } from '../organizers/priority-ranker';
import { escapeMarkdown } from './template-formatter';

/**
 * Skill 文件配置
 */
export interface SkillConfig {
  name: string;
  version: string;
  description: string;
  author?: string;
  license?: string;
  maxLines?: number;
  topNodesCount?: number;
}

/**
 * 節點資訊（組合後）
 */
export interface EnrichedNodeInfo extends SimplifiedNodeInfo {
  usageCount?: number;
  usagePercentage?: number;
  properties?: ParsedProperties;
  examples?: {
    minimal?: Record<string, any>;
    common?: Record<string, any>;
    advanced?: Record<string, any>;
  };
  // 優先級相關欄位（用於分層合併策略）
  score?: number;
  rank?: number;
  tier?: PriorityTier;
}

/**
 * 資源檔案資訊
 */
export interface ResourceFile {
  name: string;
  path: string;
  description: string;
  category?: string;
}

/**
 * Skill 生成器輸入資料
 */
export interface SkillGeneratorInput {
  nodes: EnrichedNodeInfo[];
  nodeUsageStats: NodeUsageStats;
  resourceFiles: ResourceFile[];
  config: SkillConfig;
}

/**
 * 預設配置
 */
const DEFAULT_CONFIG: Required<SkillConfig> = {
  name: 'n8n-skills',
  version: '1.0.0',
  description: 'n8n 工作流程自動化知識庫。使用此 skill 查找 n8n 節點資訊、了解節點功能用法、學習工作流程模式、取得節點配置範例。涵蓋觸發器、資料轉換、資料輸入輸出、AI 整合等節點。關鍵詞：n8n、workflow、automation、node、trigger、webhook、http request、database、ai agent。',
  author: 'n8n-skill',
  license: 'MIT',
  maxLines: 5000,
  topNodesCount: 50,
};

/**
 * 常見工作流程模式
 */
const COMMON_PATTERNS = [
  {
    name: 'HTTP 資料擷取',
    description: '從 API 抓取資料並處理',
    nodes: ['HTTP Request', 'Set', 'IF'],
    example: '使用 HTTP Request 節點從外部 API 取得資料，用 Set 節點轉換格式，IF 節點做條件判斷'
  },
  {
    name: 'Email 自動化',
    description: '監控郵件並自動回應或轉發',
    nodes: ['Email Trigger (IMAP)', 'Gmail', 'IF'],
    example: '用 Email Trigger 監控收件匣，IF 節點篩選特定條件，Gmail 節點自動回覆或轉發'
  },
  {
    name: '資料庫同步',
    description: '在不同系統間同步資料',
    nodes: ['Schedule Trigger', 'HTTP Request', 'Postgres', 'MySQL'],
    example: '定時觸發從一個資料庫讀取資料，轉換後寫入另一個資料庫'
  },
  {
    name: 'Webhook 接收處理',
    description: '接收外部 webhook 並觸發動作',
    nodes: ['Webhook', 'Set', 'HTTP Request', 'Slack'],
    example: '接收 webhook 事件，處理資料後發送通知到 Slack 或其他系統'
  },
  {
    name: 'AI 助理整合',
    description: '使用 AI 模型處理和生成內容',
    nodes: ['AI Agent', 'OpenAI', 'Vector Store', 'Embeddings OpenAI'],
    example: '建立 AI 助理處理使用者查詢，整合向量資料庫進行語義搜尋'
  },
  {
    name: '檔案處理',
    description: '自動處理和轉換檔案',
    nodes: ['Google Drive Trigger', 'Extract from File', 'Move Binary Data', 'Dropbox'],
    example: '監控 Google Drive 新檔案，提取內容處理後上傳到 Dropbox'
  },
];

/**
 * Skill.md 生成器
 */
export class SkillGenerator {
  private config: Required<SkillConfig>;

  constructor(config: Partial<SkillConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 生成完整的 Skill.md 內容
   */
  generate(input: SkillGeneratorInput): string {
    const totalNodes = input.nodes.length;
    const sections: string[] = [
      this.generateFrontmatter(totalNodes),
      this.generateOverview(),
      this.generateHowToFindNodes(input.nodes, input.nodeUsageStats),
      this.generateWorkflowPatterns(),
      this.generateAIUsageGuide(input.resourceFiles),
      this.generateLicense(),
    ];

    const content = sections.filter(Boolean).join('\n\n');

    // 檢查行數限制
    const actualLines = content.split('\n').length;
    if (actualLines > this.config.maxLines) {
      console.warn(
        `警告: 生成的內容超過限制 (${actualLines} > ${this.config.maxLines} 行)`
      );
    }

    return content;
  }

  /**
   * 生成 YAML frontmatter
   */
  private generateFrontmatter(totalNodes: number): string {
    const description = this.config.description.replace(
      '等節點',
      `等 ${totalNodes} 個節點`
    );

    return [
      '---',
      `name: ${this.config.name}`,
      `description: ${description}`,
      `allowed-tools: Read, Glob, Grep`,
      '---',
    ].join('\n');
  }

  /**
   * 生成概述章節
   */
  private generateOverview(): string {
    return [
      '# n8n Workflow Automation Skill Pack',
      '',
      '## 什麼是 n8n？',
      '',
      'n8n 是一個可擴展的工作流程自動化工具，讓你可以連接任何應用程式並自動化工作流程。',
      '它提供了超過 400 個內建整合（節點），支援視覺化工作流程設計，並可自訂擴展。',
      '',
      '主要特色：',
      '- 視覺化工作流程編輯器',
      '- 400+ 內建整合節點',
      '- 自訂程式碼執行（JavaScript/Python）',
      '- AI 工具整合（OpenAI、Anthropic、Hugging Face 等）',
      '- 資料轉換和處理',
      '- 條件邏輯和分支',
      '- 排程和觸發器',
      '- 錯誤處理和重試機制',
      '',
      '## 何時使用這個 Skill',
      '',
      '使用這個 skill 來：',
      '- 了解 n8n 節點的功能和用法',
      '- 查找適合特定任務的節點',
      '- 學習常見的工作流程模式',
      '- 取得節點配置範例',
      '- 解決工作流程設計問題',
      '',
      '本 skill 包含：',
      `- ${this.config.topNodesCount} 個最常用的 n8n 節點詳細資訊`,
      '- 節點配置範例和最佳實踐',
      '- 常見工作流程模式',
      '- 節點分類和索引',
    ].join('\n');
  }


  /**
   * 生成節點查找指南（工具使用導向）
   */
  private generateHowToFindNodes(
    _nodes: EnrichedNodeInfo[],
    _stats: NodeUsageStats
  ): string {
    const sections = [
      '# 如何查找節點',
      '',
      '本 skill 包含 542 個 n8n 節點的完整資訊。作為 AI 助理，你可以使用以下工具高效查找和讀取節點資訊。',
      '',
      '## 1. 使用統一索引表 (INDEX.md)',
      '',
      'INDEX.md 是所有節點的總索引，提供兩種查找方式：',
      '',
      '### 讀取完整索引',
      '```',
      'Read("resources/INDEX.md")',
      '```',
      '',
      '索引內容包括：',
      '- 依分類查找：6 個功能分類（Transform、Input、Output、Trigger、Organization、Misc）',
      '- 範本索引：100 個工作流程範本',
      '',
      '### 讀取索引中的特定部分',
      '',
      'INDEX.md 包含所有 542 個節點的位置資訊（開始行號和行數），你可以精準讀取：',
      '',
      '範例：查找「資料轉換」分類的節點',
      '```',
      '# 先讀取索引了解分類內容',
      'Read("resources/INDEX.md", offset=1, limit=100)',
      '```',
      '',
      '## 2. 使用 Read 工具精準讀取節點文件',
      '',
      '### 讀取高優先級節點（獨立檔案）',
      '',
      '前 50 個最常用節點有獨立檔案，直接讀取即可：',
      '',
      '```',
      '# 範例：讀取 Gmail 節點',
      'Read("resources/output/nodes-base.gmail.md")',
      '',
      '# 範例：讀取 Code 節點',
      'Read("resources/transform/nodes-base.code.md")',
      '```',
      '',
      '### 讀取低優先級節點（合併檔案中的特定節點）',
      '',
      '其他 492 個節點合併在分類檔案中。INDEX.md 會告訴你每個節點的開始行號和行數：',
      '',
      '```',
      '# 步驟 1：從 INDEX.md 查找節點的位置資訊',
      '# 例如：Azure Cosmos DB 在 transform-merged-1.md 的開始行號 110，行數 64',
      '',
      '# 步驟 2：使用開始行號和行數精準讀取',
      'Read("resources/transform/transform-merged-1.md", offset=110, limit=64)',
      '```',
      '',
      '## 3. 使用 Glob 工具搜尋檔案',
      '',
      '當你知道節點名稱的一部分，可以用 Glob 快速定位檔案：',
      '',
      '```',
      '# 搜尋包含 "gmail" 的節點檔案',
      'Glob("resources/**/*gmail*.md")',
      '',
      '# 搜尋所有輸出類節點',
      'Glob("resources/output/*.md")',
      '',
      '# 搜尋所有觸發器節點',
      'Glob("resources/trigger/*.md")',
      '',
      '# 搜尋合併檔案',
      'Glob("resources/**/*-merged-*.md")',
      '```',
      '',
      '## 4. 使用 Grep 工具搜尋關鍵字',
      '',
      '在所有資源檔案中搜尋功能關鍵字：',
      '',
      '```',
      '# 搜尋包含 "send email" 的節點',
      'Grep("send email", path="resources", output_mode="files_with_matches")',
      '',
      '# 搜尋資料庫相關節點',
      'Grep("database", path="resources", output_mode="files_with_matches")',
      '',
      '# 搜尋 webhook 相關功能（顯示匹配內容）',
      'Grep("webhook", path="resources", output_mode="content", -n=true, -C=2)',
      '',
      '# 搜尋 AI 相關節點',
      'Grep("AI|artificial intelligence", path="resources", output_mode="files_with_matches")',
      '```',
      '',
      '## 查找策略建議',
      '',
      '根據不同情境選擇最佳查找方式：',
      '',
      '1. 使用者詢問特定服務（如 "Gmail"、"Slack"）：',
      '   → 使用 Glob 搜尋：`Glob("resources/**/*gmail*.md")`',
      '',
      '2. 使用者詢問功能需求（如 "發送郵件"、"資料庫查詢"）：',
      '   → 使用 Grep 搜尋關鍵字：`Grep("send email", path="resources")`',
      '',
      '3. 使用者詢問節點分類（如 "有哪些觸發器"）：',
      '   → 讀取 INDEX.md 的分類表：`Read("resources/INDEX.md", offset=<分類起始行>, limit=<行數>)`',
      '',
      '4. 使用者想了解熱門節點：',
      '   → 讀取 INDEX.md 的優先級排名表',
      '',
      '5. 使用者需要工作流程範例：',
      '   → 參考「常見工作流程模式」章節或 resources/templates/ 目錄',
      '',
    ];

    return sections.join('\n');
  }

  /**
   * 生成工作流程模式章節
   */
  private generateWorkflowPatterns(): string {
    const sections = [
      '# 常見工作流程模式',
      '',
      '以下是一些常見的工作流程模式，可作為起點參考：',
      '',
    ];

    COMMON_PATTERNS.forEach((pattern, index) => {
      sections.push(
        `## ${index + 1}. ${pattern.name}`,
        '',
        escapeMarkdown(pattern.description),
        '',
        '使用節點:',
        ...pattern.nodes.map(node => `- ${node}`),
        '',
        `範例: ${escapeMarkdown(pattern.example)}`,
        ''
      );
    });

    sections.push(
      '## 完整範本庫',
      '',
      '我們收錄了 100 個來自 n8n.io 的熱門工作流程範本，按使用場景分類：',
      '',
      '- 🤖 [AI 與聊天機器人](resources/templates/ai-chatbots/README.md) - AI Agent、RAG 系統、智能對話',
      '- 📱 [社交媒體與影片](resources/templates/social-media/README.md) - TikTok、Instagram、YouTube 自動化',
      '- 📊 [資料處理與分析](resources/templates/data-processing/README.md) - Google Sheets、資料庫整合',
      '- 💬 [通訊與協作](resources/templates/communication/README.md) - Email、WhatsApp、Telegram 自動化',
      '',
      '查看 [完整範本索引](resources/templates/README.md) 了解所有可用範本。',
      ''
    );

    return sections.join('\n');
  }

  /**
   * 生成 AI 助理使用指南
   */
  private generateAIUsageGuide(resourceFiles: ResourceFile[]): string {
    const categoryCounts = new Map<string, number>();

    resourceFiles.forEach(file => {
      const category = file.category || 'misc';
      categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
    });

    const sections = [
      '# 使用指南',
      '',
      '## 1. 檔案結構導覽',
      '',
      '### 目錄結構',
      '',
      '```',
      'resources/',
      '├── INDEX.md                     # 統一索引表（包含所有節點的行號資訊）',
      '├── compatibility-matrix.md      # 節點相容性矩陣',
      '├── transform/                   # 資料轉換節點',
      `│   ├── README.md                # ${categoryCounts.get('transform') || 0} 個節點總覽`,
      '│   ├── nodes-base.code.md       # 高優先級獨立檔案',
      '│   ├── nodes-base.function.md',
      '│   └── transform-merged-*.md    # 低優先級合併檔案',
      '├── input/                       # 資料輸入節點',
      `│   ├── README.md                # ${categoryCounts.get('input') || 0} 個節點`,
      '│   └── ...',
      '├── output/                      # 資料輸出節點',
      `│   ├── README.md                # ${categoryCounts.get('output') || 0} 個節點`,
      '│   └── ...',
      '├── trigger/                     # 觸發器節點',
      `│   ├── README.md                # ${categoryCounts.get('trigger') || 0} 個節點`,
      '│   └── ...',
      '├── organization/                # 組織管理節點',
      `│   ├── README.md                # ${categoryCounts.get('organization') || 0} 個節點`,
      '│   └── ...',
      '├── misc/                        # 其他節點',
      `│   ├── README.md                # ${categoryCounts.get('misc') || 0} 個節點`,
      '│   └── ...',
      '└── templates/                   # 工作流程範本',
      '    ├── README.md                # 100 個範本總覽',
      '    ├── ai-chatbots/             # AI 與聊天機器人範本',
      '    ├── social-media/            # 社交媒體範本',
      '    ├── data-processing/         # 資料處理範本',
      '    └── communication/           # 通訊協作範本',
      '```',
      '',
      '### 高優先級 vs 低優先級節點',
      '',
      '- 高優先級（前 50 名）：獨立檔案，檔名格式 `nodes-base.{nodeType}.md`',
      '  - 範例：`resources/transform/nodes-base.code.md`',
      '  - 直接使用 Read 工具讀取完整檔案',
      '',
      '- 低優先級（其他 492 個）：合併在 `*-merged-*.md` 檔案中',
      '  - 範例：`resources/transform/transform-merged-1.md`',
      '  - 使用 INDEX.md 查找行號，再用 Read 工具的 offset/limit 參數讀取特定範圍',
      '',
      '## 2. 工具使用完整說明',
      '',
      '### Read 工具',
      '',
      '用途：讀取檔案內容',
      '',
      '完整讀取：',
      '```',
      'Read("resources/INDEX.md")',
      'Read("resources/transform/nodes-base.code.md")',
      '```',
      '',
      '精準讀取（使用開始行號和行數）：',
      '```',
      'Read("resources/transform/transform-merged-1.md", offset=110, limit=64)',
      '```',
      '',
      '### Glob 工具',
      '',
      '用途：搜尋符合 pattern 的檔案',
      '',
      '常用 patterns：',
      '```',
      'Glob("resources/**/*{關鍵字}*.md")    # 搜尋包含關鍵字的檔案',
      'Glob("resources/transform/*.md")      # 搜尋特定分類的所有檔案',
      'Glob("resources/**/*-merged-*.md")    # 搜尋所有合併檔案',
      '```',
      '',
      '### Grep 工具',
      '',
      '用途：在檔案內容中搜尋關鍵字',
      '',
      '基本搜尋：',
      '```',
      'Grep("{關鍵字}", path="resources", output_mode="files_with_matches")',
      '```',
      '',
      '進階搜尋：',
      '```',
      '# 顯示匹配內容和行號',
      'Grep("{關鍵字}", path="resources", output_mode="content", -n=true, -C=2)',
      '',
      '# 使用正則表達式',
      'Grep("email|mail", path="resources", output_mode="files_with_matches")',
      '',
      '# 限制搜尋特定分類',
      'Grep("{關鍵字}", path="resources/transform", output_mode="files_with_matches")',
      '```',
      '',
      '### INDEX.md 查詢方法',
      '',
      'INDEX.md 是最重要的導航工具，建議優先使用：',
      '',
      '1. 先讀取 INDEX.md 了解整體結構',
      '2. 根據分類找到目標節點',
      '3. 記錄節點的檔案路徑、開始行號和行數',
      '4. 使用 Read 工具精準讀取節點內容',
      '',
      '## 3. 決策流程指引',
      '',
      '### 情境 1：使用者詢問特定服務節點',
      '',
      '範例：「如何使用 Gmail 節點？」',
      '',
      '決策流程：',
      '```',
      '1. 使用 Glob 快速定位',
      '   Glob("resources/**/*gmail*.md")',
      '',
      '2. 如果找到獨立檔案，直接讀取',
      '   Read("resources/output/nodes-base.gmail.md")',
      '',
      '3. 如果在合併檔案中，先查 INDEX.md',
      '   → 找到開始行號和行數',
      '   → 使用 offset/limit 讀取',
      '```',
      '',
      '### 情境 2：使用者詢問功能需求',
      '',
      '範例：「我需要發送郵件的節點」',
      '',
      '決策流程：',
      '```',
      '1. 使用 Grep 搜尋關鍵字',
      '   Grep("send email|send mail", path="resources", output_mode="files_with_matches")',
      '',
      '2. 獲得候選節點列表',
      '   → Gmail、SendGrid、SMTP 等',
      '',
      '3. 讀取相關節點的詳細文件',
      '   → 比較功能差異',
      '   → 推薦最適合的節點',
      '```',
      '',
      '### 情境 3：使用者詢問節點分類',
      '',
      '範例：「有哪些觸發器節點？」',
      '',
      '決策流程：',
      '```',
      '1. 讀取 INDEX.md 的觸發器分類部分',
      '   Read("resources/INDEX.md")',
      '   → 找到 "## 依分類查找" > "### Trigger"',
      '',
      '2. 或直接讀取分類 README',
      '   Read("resources/trigger/README.md")',
      '',
      '3. 提供節點列表和簡要說明',
      '```',
      '',
      '### 情境 4：使用者需要工作流程範例',
      '',
      '範例：「如何建立 AI 聊天機器人？」',
      '',
      '決策流程：',
      '```',
      '1. 先查看「常見工作流程模式」章節',
      '   → 尋找相關模式',
      '',
      '2. 查看範本庫',
      '   Read("resources/templates/ai-chatbots/README.md")',
      '',
      '3. 結合節點文件',
      '   → AI Agent 節點',
      '   → OpenAI 節點',
      '   → Vector Store 節點',
      '```',
      '',
      '## 4. 最佳實踐和注意事項',
      '',
      '### 查找策略',
      '',
      '1. 優先使用 INDEX.md 獲得全局視野',
      '   - 了解節點分類和優先級',
      '   - 快速定位目標節點',
      '',
      '2. 善用 Grep 進行功能導向搜尋',
      '   - 當使用者描述需求而非具體節點名稱',
      '   - 搜尋關鍵字可以快速找到候選節點',
      '',
      '3. 使用 Glob 進行檔案名稱搜尋',
      '   - 當知道節點名稱的一部分',
      '   - 比 Grep 更快速',
      '',
      '4. 善用開始行號和行數讀取',
      '   - 合併檔案可能很大（數千行）',
      '   - 使用 offset/limit 只讀取需要的部分',
      '   - 節省 token 使用',
      '',
      '### 節點選擇建議',
      '',
      '1. 優先推薦高優先級節點',
      '   - 使用率高 = 更穩定、文件更完整',
      '   - 社群支援更好',
      '',
      '2. 檢查節點相容性',
      '   - 讀取 resources/compatibility-matrix.md',
      '   - 或查看節點文件中的「連接指南」章節',
      '',
      '3. 參考實際範本',
      '   - templates/ 目錄包含 100 個真實使用案例',
      '   - 可以學習節點組合方式',
      '',
      '### 常見陷阱',
      '',
      '1. 不要每次都讀取完整的合併檔案',
      '   - 合併檔案可能有數千行',
      '   - 應該使用 INDEX.md 找到行號後精準讀取',
      '',
      '2. 注意節點命名格式',
      '   - 檔案格式：`nodes-base.{nodeType}.md`',
      '   - nodeType 通常是小寫加連字號',
      '   - 例如：`nodes-base.httpRequest.md`（不是 `http-request`）',
      '',
      '3. 區分觸發器和動作節點',
      '   - 觸發器只能放在工作流程開頭',
      '   - Webhook 節點也是觸發器的一種',
      '',
      '4. 檢查節點版本',
      '   - 部分節點有多個版本',
      '   - 文件中會標註版本號和差異',
      '',
    ];

    return sections.join('\n');
  }

  /**
   * 生成授權聲明
   */
  private generateLicense(): string {
    return [
      '---',
      '',
      '# 授權與聲明',
      '',
      '## 本 Skill Pack 授權',
      '',
      '本 skill pack 專案採用 MIT License。',
      '詳見：https://github.com/haunchen/n8n-skill/blob/main/LICENSE',
      '',
      '## 重要聲明',
      '',
      '本專案為非官方教學專案，不隸屬於 n8n GmbH。',
      '',
      '本 skill 內容基於以下資源產生：',
      '- n8n 節點型別定義（Sustainable Use License）',
      '- n8n 官方文件（MIT License）',
      '- n8n-mcp 專案架構（MIT License）',
      '',
      '詳細授權資訊請參閱專案的 ATTRIBUTIONS.md 檔案。',
      '',
      '## 關於 n8n',
      '',
      'n8n 是由 n8n GmbH 開發和維護的開源工作流程自動化平台。',
      '',
      '- 官方網站: https://n8n.io',
      '- 文件: https://docs.n8n.io',
      '- 原始碼: https://github.com/n8n-io/n8n',
      '- 授權: Sustainable Use License',
      '',
      '使用 n8n 軟體時需遵循 n8n 的授權條款，詳見：https://github.com/n8n-io/n8n/blob/master/LICENSE.md',
    ].join('\n');
  }
}

/**
 * 便利函數：快速生成 Skill.md
 */
export function generateSkillMarkdown(
  input: SkillGeneratorInput
): string {
  const generator = new SkillGenerator(input.config);
  return generator.generate(input);
}

/**
 * 便利函數：生成並寫入檔案
 */
export async function generateSkillFile(
  input: SkillGeneratorInput,
  outputPath: string
): Promise<void> {
  const { writeFile } = await import('fs/promises');
  const content = generateSkillMarkdown(input);
  await writeFile(outputPath, content, 'utf-8');
  console.log(`Skill.md 已生成: ${outputPath}`);
  console.log(`總行數: ${content.split('\n').length}`);
}
