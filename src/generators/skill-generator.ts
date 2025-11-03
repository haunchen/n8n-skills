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
      this.generateQuickStart(input.nodes, input.nodeUsageStats),
      this.generateNodeIndex(input.nodes, input.nodeUsageStats),
      this.generateWorkflowPatterns(),
      this.generateResourceIndex(input.resourceFiles),
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
   * 生成快速開始章節
   */
  private generateQuickStart(
    nodes: EnrichedNodeInfo[],
    stats: NodeUsageStats
  ): string {
    // 取得最常用的 8-10 個節點
    const topNodes = this.getTopNodes(nodes, stats, 10);

    const sections = [
      '# 快速開始',
      '',
      '## 核心概念',
      '',
      '### 節點（Nodes）',
      '節點是工作流程的基本單位，每個節點執行特定的任務。',
      '節點可以分為以下類型：',
      '- 觸發器（Trigger）：啟動工作流程的節點',
      '- 動作（Action）：執行特定操作的節點',
      '- Webhook：接收 HTTP 請求的節點',
      '- AI 工具：整合 AI 模型的節點',
      '',
      '### 連接（Connections）',
      '節點之間通過連接傳遞資料，資料以 JSON 格式流動。',
      '',
      '### 執行（Executions）',
      '工作流程可以手動執行、定時執行或由觸發器啟動。',
      '',
      '## 最常用節點',
      '',
      '以下是最常用的 10 個節點，涵蓋大多數使用場景：',
      '',
    ];

    topNodes.forEach((node, index) => {
      // 嘗試多種格式匹配 nodeType
      let usage = stats[node.nodeType];
      if (!usage) {
        // 嘗試加上 n8n- 前綴
        usage = stats[`n8n-${node.nodeType}`];
      }
      if (!usage) {
        // 嘗試加上 @n8n/n8n- 前綴（用於 langchain 節點）
        usage = stats[`@n8n/n8n-${node.nodeType}`];
      }
      const percentage = usage?.percentage?.toFixed(1) || '0.0';

      sections.push(
        `### ${index + 1}. ${node.displayName}`,
        '',
        escapeMarkdown(node.description || '無描述'),
        '',
        `- 類型: ${this.formatNodeCategory(node)}`,
        `- 分類: ${node.category}`,
        `- 使用率: ${percentage}%`,
        ''
      );

      const category = node.category || 'misc';
      sections.push(`詳細資訊請參閱: resources/${category}/${node.nodeType}.md`, '');
    });

    return sections.join('\n');
  }

  /**
   * 生成節點索引
   */
  private generateNodeIndex(
    _nodes: EnrichedNodeInfo[],
    _stats: NodeUsageStats
  ): string {
    const sections = [
      '# 如何查找節點',
      '',
      '本 skill 包含 542 個 n8n 節點的完整資訊，按照功能分為以下 6 個分類：',
      '',
      '## 分類導航',
      '',
      '### 資料轉換 (Transform)',
      '處理和轉換資料的節點，包含 Code、Function、If、Switch、Merge 等邏輯和資料處理節點。',
      '查看完整清單: [resources/transform/README.md](resources/transform/README.md)',
      '',
      '### 資料輸入 (Input)',
      '從各種來源讀取資料的節點，包含資料庫（MySQL、Postgres、MongoDB）、檔案儲存（Google Drive、Dropbox）等。',
      '查看完整清單: [resources/input/README.md](resources/input/README.md)',
      '',
      '### 資料輸出 (Output)',
      '將資料發送到外部服務的節點，包含 HTTP Request、Slack、Discord、Notion 等通訊和儲存服務。',
      '查看完整清單: [resources/output/README.md](resources/output/README.md)',
      '',
      '### 觸發器 (Trigger)',
      '啟動工作流程的節點，包含 Webhook、Schedule、Email Trigger、Cron 等各種觸發方式。',
      '查看完整清單: [resources/trigger/README.md](resources/trigger/README.md)',
      '',
      '### 組織管理 (Organization)',
      '工作流程組織和控制節點，包含 Wait、Split In Batches、No Operation 等輔助節點。',
      '查看完整清單: [resources/organization/README.md](resources/organization/README.md)',
      '',
      '### 其他 (Misc)',
      '其他特殊用途的節點。',
      '查看完整清單: [resources/misc/README.md](resources/misc/README.md)',
      '',
      '## 節點相容性參考',
      '',
      '查看節點之間的連接相容性矩陣：',
      '- [節點相容性矩陣](resources/compatibility-matrix.md) - 50 個常用節點的連接相容性對照表',
      '',
      '此外，每個節點的詳細文件都包含連接指南，說明該節點可以接收來自哪些節點，以及可以連接到哪些節點。',
      '',
      '## 查詢建議',
      '',
      '當你需要特定功能的節點時，可以這樣詢問：',
      '- "我需要發送 HTTP 請求的節點" → 查看 HTTP Request 節點',
      '- "如何連接 MySQL 資料庫？" → 查看 MySQL 節點',
      '- "怎麼在工作流程中使用條件判斷？" → 查看 If 或 Switch 節點',
      '- "如何定時執行工作流程？" → 查看 Schedule Trigger 或 Cron 節點',
      '- "想要處理 JSON 資料" → 查看 Code 或 Function 節點',
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
   * 生成資源檔案索引
   */
  private generateResourceIndex(resourceFiles: ResourceFile[]): string {
    const categoryCounts = new Map<string, number>();

    resourceFiles.forEach(file => {
      const category = file.category || 'misc';
      categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
    });

    const sections = [
      '# 使用指南',
      '',
      '## 探索節點',
      '',
      '每個分類目錄下都有詳細的節點資訊文件：',
      '',
      `- [資料轉換](resources/transform/README.md)：${categoryCounts.get('transform') || 0} 個節點`,
      `- [資料輸入](resources/input/README.md)：${categoryCounts.get('input') || 0} 個節點`,
      `- [資料輸出](resources/output/README.md)：${categoryCounts.get('output') || 0} 個節點`,
      `- [觸發器](resources/trigger/README.md)：${categoryCounts.get('trigger') || 0} 個節點`,
      `- [組織管理](resources/organization/README.md)：${categoryCounts.get('organization') || 0} 個節點`,
      `- [其他](resources/misc/README.md)：${categoryCounts.get('misc') || 0} 個節點`,
      '',
      '## 最佳實踐',
      '',
      '1. 從常用節點開始學習（參考"快速開始"章節）',
      '2. 根據需求查找對應分類的節點',
      '3. 參考常見工作流程模式來組合節點',
      '4. 查看具體節點的文件了解配置細節',
      '',
      '## 範例工作流程',
      '',
      '透過組合不同節點可以建立強大的自動化流程：',
      '',
      '- API 資料處理：Webhook → HTTP Request → Code → Database',
      '- 定時任務：Schedule Trigger → Database Query → Email Send',
      '- 即時通知：Form Trigger → AI Transform → Slack/Discord',
      '- 資料同步：Cron → API Fetch → Transform → Multiple Outputs',
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

  /**
   * 取得使用率最高的節點
   */
  private getTopNodes(
    nodes: EnrichedNodeInfo[],
    stats: NodeUsageStats,
    count: number
  ): EnrichedNodeInfo[] {
    // 為節點加上使用統計
    const enriched = nodes.map(node => {
      const usage = stats[node.nodeType];
      return {
        ...node,
        usageCount: usage?.count || 0,
        usagePercentage: usage?.percentage || 0,
      };
    });

    // 按使用率排序並取前 N 個
    return enriched
      .sort((a, b) => (b.usagePercentage || 0) - (a.usagePercentage || 0))
      .slice(0, count);
  }

  /**
   * 格式化節點類別
   */
  private formatNodeCategory(node: EnrichedNodeInfo): string {
    if (node.isTrigger) return '觸發器';
    if (node.isWebhook) return 'Webhook';
    if (node.isAITool) return 'AI 工具';
    return '動作';
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
