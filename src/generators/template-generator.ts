import { promises as fs } from 'fs';
import path from 'path';
import type { WorkflowDefinition } from '../collectors/api-collector';
import { WorkflowAnalyzer, type WorkflowAnalysis } from '../analyzers/workflow-analyzer';

/**
 * Template data structure
 */
export interface Template {
  id: number;
  name: string;
  description: string;
  totalViews: number;
  createdAt: string;
  user: {
    id: number;
    name: string;
    username: string;
    verified: boolean;
  };
  nodes: Array<{
    id: number;
    name: string;
    icon?: string;
    displayName?: string;
  }>;
}

/**
 * Enhanced Template(including complete workflow)
 */
export interface EnhancedTemplate extends Template {
  workflow?: WorkflowDefinition;
  analysis?: WorkflowAnalysis;
}

/**
 * Template categories
 */
export enum TemplateCategory {
  AI_CHATBOTS = 'ai-chatbots',
  SOCIAL_MEDIA = 'social-media',
  DATA_PROCESSING = 'data-processing',
  COMMUNICATION = 'communication',
  AUTOMATION = 'automation',
  LEARNING = 'learning',
}

/**
 * Category information
 */
export interface CategoryInfo {
  id: TemplateCategory;
  name: string;
  description: string;
  icon: string;
}

/**
 * Category mapping
 */
export const CATEGORY_INFO: Record<TemplateCategory, CategoryInfo> = {
  [TemplateCategory.AI_CHATBOTS]: {
    id: TemplateCategory.AI_CHATBOTS,
    name: 'AI AI AI 與聊天機器人 Chatbots Chatbots',
    description: 'AI Agents, RAG systems, intelligent conversational bots',
    icon: '🤖',
  },
  [TemplateCategory.SOCIAL_MEDIA]: {
    id: TemplateCategory.SOCIAL_MEDIA,
    name: 'Social Media Social Media 社交媒體與影片 Video Video',
    description: 'TikTok, Instagram, YouTube automation and AI video generation',
    icon: '📱',
  },
  [TemplateCategory.DATA_PROCESSING]: {
    id: TemplateCategory.DATA_PROCESSING,
    name: 'Data Processing Data Processing 資料處理與分析 Analysis Analysis',
    description: 'Google Sheets, database integration, data analysis workflows',
    icon: '📊',
  },
  [TemplateCategory.COMMUNICATION]: {
    id: TemplateCategory.COMMUNICATION,
    name: 'Communication Communication 通訊與協作 Collaboration Collaboration',
    description: 'Email, WhatsApp, Telegram, Slack automation',
    icon: '💬',
  },
  [TemplateCategory.AUTOMATION]: {
    id: TemplateCategory.AUTOMATION,
    name: 'Automation Automation 自動化與整合 Integration Integration',
    description: 'Workflow automation, API integration, scheduled tasks',
    icon: '⚡',
  },
  [TemplateCategory.LEARNING]: {
    id: TemplateCategory.LEARNING,
    name: 'Learning Learning 學習與教學 Teaching Teaching',
    description: 'n8n introductory tutorials, interactive lessons',
    icon: '📚',
  },
};

/**
 * Template generator configuration
 */
export interface TemplateGeneratorConfig {
  outputDir: string;
  maxTemplatesPerCategory?: number;
}

/**
 * Template generator
 */
export class TemplateGenerator {
  private config: TemplateGeneratorConfig;
  private analyzer: WorkflowAnalyzer;

  constructor(config: TemplateGeneratorConfig) {
    this.config = {
      maxTemplatesPerCategory: 20,
      ...config,
    };
    this.analyzer = new WorkflowAnalyzer();
  }

  /**
   * Combine template and workflow and analyze
   */
  enhanceTemplate(template: Template, workflow: WorkflowDefinition & { id: number; name: string }): EnhancedTemplate {
    const analysis = this.analyzer.analyze(workflow);

    return {
      ...template,
      workflow,
      analysis,
    };
  }

  /**
   * Categorize templates
   */
  categorizeTemplate(template: Template): TemplateCategory {
    const name = template.name.toLowerCase();
    const description = template.description.toLowerCase();
    const content = `${name} ${description}`;

    // AI & Chatbots
    if (
      content.includes('ai agent') ||
      content.includes('chatbot') ||
      content.includes('rag') ||
      content.includes('chat interface') ||
      content.includes('gpt') ||
      content.includes('gemini') ||
      content.includes('claude')
    ) {
      return TemplateCategory.AI_CHATBOTS;
    }

    // Social Media & Video
    if (
      content.includes('tiktok') ||
      content.includes('instagram') ||
      content.includes('youtube') ||
      content.includes('video') ||
      content.includes('social media') ||
      content.includes('viral')
    ) {
      return TemplateCategory.SOCIAL_MEDIA;
    }

    // Data Processing
    if (
      content.includes('google sheets') ||
      content.includes('database') ||
      content.includes('data') ||
      content.includes('spreadsheet') ||
      content.includes('analytics')
    ) {
      return TemplateCategory.DATA_PROCESSING;
    }

    // Communication
    if (
      content.includes('email') ||
      content.includes('whatsapp') ||
      content.includes('telegram') ||
      content.includes('slack') ||
      content.includes('discord')
    ) {
      return TemplateCategory.COMMUNICATION;
    }

    // Learning
    if (
      content.includes('learn') ||
      content.includes('tutorial') ||
      content.includes('get started') ||
      content.includes('beginner')
    ) {
      return TemplateCategory.LEARNING;
    }

    // Default to Automation
    return TemplateCategory.AUTOMATION;
  }

  /**
   * Generate markdown file for single template
   */
  generateTemplateMarkdown(template: Template | EnhancedTemplate, category: TemplateCategory): string {
    const enhanced = template as EnhancedTemplate;

    const sections = [
      `# ${template.name}`,
      '',
      `> ${CATEGORY_INFO[category].icon} **分類**: ${CATEGORY_INFO[category].name}`,
      `> 👁️ **瀏覽次數**: ${template.totalViews.toLocaleString()}`,
      `> 📅 **建立時間**: ${new Date(template.createdAt).toLocaleDateString('zh-TW')}`,
      '',
      '## Description',
      '',
      template.description || 'No description',
      '',
    ];

    // If workflow analysis results exist, use structured description
    if (enhanced.analysis) {
      sections.push(
        '## Workflow Structure',
        '',
        enhanced.analysis.structuredDescription,
        ''
      );
    } else {
      // Otherwise display traditional node list
      sections.push('## Nodes Used', '');

      if (template.nodes && template.nodes.length > 0) {
        template.nodes.forEach((node) => {
          const displayName = node.displayName || node.name;
          sections.push(`- ${displayName}`);
        });
      } else {
        sections.push('*This template contains no node information*');
      }
      sections.push('');
    }

    sections.push(
      '## Author Information',
      '',
      `- **名稱**: ${template.user.name}`,
      `- **用戶名**: @${template.user.username}`,
      template.user.verified ? `- ✓ Verified user` : '',
      '',
      '## Related Links',
      '',
      `- [View this template on n8n.io](https://n8n.io/workflows/${template.id})`,
      ''
    );

    // If complete workflow exists, add JSON
    if (enhanced.workflow) {
      sections.push(
        '## Complete Workflow JSON',
        '',
        '<details>',
        '<summary>Click to expand Workflow JSON</summary>',
        '',
        '```json',
        JSON.stringify(enhanced.workflow, null, 2),
        '```',
        '',
        '</details>',
        ''
      );
    }

    return sections.filter(Boolean).join('\n');
  }

  /**
   * Generate category index
   */
  generateCategoryIndex(
    category: TemplateCategory,
    templates: Template[]
  ): string {
    const info = CATEGORY_INFO[category];

    const sections = [
      `# ${info.icon} ${info.name}`,
      '',
      info.description,
      '',
      `Total: ${templates.length}  templates`,
      '',
      '## Template List',
      '',
    ];

    // Sort by views
    const sorted = [...templates].sort((a, b) => b.totalViews - a.totalViews);

    sorted.forEach((template) => {
      const filename = this.getTemplateFilename(template);
      const views = template.totalViews.toLocaleString();
      sections.push(
        `- [${template.name}](./${filename}) - ${views} 次瀏覽`
      );
    });

    sections.push('');

    return sections.join('\n');
  }

  /**
   * 生成主索引
   */
  generateMainIndex(categorizedTemplates: Map<TemplateCategory, Template[]>): string {
    const sections = [
      '# n8n 工作流程範本',
      '',
      'Here we have collected 100 popular workflow templates from n8n.io from n8n.io，按照使用場景分類。',
      '',
      '## 分類導覽',
      '',
    ];

    // 按照定義順序列出分類
    const categories = [
      TemplateCategory.AI_CHATBOTS,
      TemplateCategory.SOCIAL_MEDIA,
      TemplateCategory.DATA_PROCESSING,
      TemplateCategory.COMMUNICATION,
      TemplateCategory.AUTOMATION,
      TemplateCategory.LEARNING,
    ];

    categories.forEach((category) => {
      const info = CATEGORY_INFO[category];
      const templates = categorizedTemplates.get(category) || [];

      // 只顯示有範本的分類
      if (templates.length > 0) {
        sections.push(
          `### ${info.icon} [${info.name}](${category}/README.md)`,
          '',
          info.description,
          '',
          `**範本數量**: ${templates.length} 個`,
          ''
        );
      }
    });

    sections.push(
      '## 使用說明',
      '',
      '1. 瀏覽上方分類，找到你需要的工作流程類型',
      '2. 點擊分類連結查看該類別的所有範本',
      '3. 選擇感興趣的範本查看詳細說明',
      '4. 點擊範本中的 "在 n8n.io 上查看" 連結可以直接在 n8n 中使用',
      '',
      '## 統計資訊',
      '',
      `- 總範本數量: ${Array.from(categorizedTemplates.values()).reduce((sum, arr) => sum + arr.length, 0)} 個`,
      `- 總Views: ${Array.from(categorizedTemplates.values())
        .flat()
        .reduce((sum, t) => sum + t.totalViews, 0)
        .toLocaleString()} 次`,
      ''
    );

    return sections.join('\n');
  }

  /**
   * 取得 template 檔案名稱
   */
  private getTemplateFilename(template: Template): string {
    // 移除特殊字元，保留英文、數字、連字號
    const slug = template.name
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 60);

    return `${template.id}-${slug}.md`;
  }

  /**
   * 生成所有 template 檔案
   */
  async generate(templates: Array<Template | EnhancedTemplate>): Promise<void> {
    // 按分類組織 templates
    const categorized = new Map<TemplateCategory, Array<Template | EnhancedTemplate>>();

    templates.forEach((template) => {
      const category = this.categorizeTemplate(template);
      if (!categorized.has(category)) {
        categorized.set(category, []);
      }
      categorized.get(category)!.push(template);
    });

    // 為每個分類創建目錄
    for (const [category, categoryTemplates] of categorized.entries()) {
      const categoryDir = path.join(this.config.outputDir, category);
      await fs.mkdir(categoryDir, { recursive: true });

      // 限制每個分類的範本數量
      const limited = categoryTemplates
        .sort((a, b) => b.totalViews - a.totalViews)
        .slice(0, this.config.maxTemplatesPerCategory);

      // 生成每個 template 的檔案
      for (const template of limited) {
        const filename = this.getTemplateFilename(template);
        const filepath = path.join(categoryDir, filename);
        const content = this.generateTemplateMarkdown(template, category);
        await fs.writeFile(filepath, content, 'utf-8');
      }

      // Generate category index
      const indexContent = this.generateCategoryIndex(category, limited);
      await fs.writeFile(
        path.join(categoryDir, 'README.md'),
        indexContent,
        'utf-8'
      );
    }

    // 生成主索引
    const mainIndex = this.generateMainIndex(categorized);
    await fs.writeFile(
      path.join(this.config.outputDir, 'README.md'),
      mainIndex,
      'utf-8'
    );

    console.log(`成功生成 ${templates.length}  templates檔案`);
    console.log(`分類數量: ${categorized.size}`);
    categorized.forEach((templates, category) => {
      console.log(`  ${CATEGORY_INFO[category].name}: ${templates.length} 個`);
    });
  }
}

/**
 * 便利函數：生成 templates
 */
export async function generateTemplates(
  templates: Template[],
  outputDir: string
): Promise<void> {
  const generator = new TemplateGenerator({ outputDir });
  await generator.generate(templates);
}
