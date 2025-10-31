import { promises as fs } from 'fs';
import path from 'path';

/**
 * Template 資料結構
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
 * Template 分類
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
 * 分類資訊
 */
export interface CategoryInfo {
  id: TemplateCategory;
  name: string;
  description: string;
  icon: string;
}

/**
 * 分類對應表
 */
export const CATEGORY_INFO: Record<TemplateCategory, CategoryInfo> = {
  [TemplateCategory.AI_CHATBOTS]: {
    id: TemplateCategory.AI_CHATBOTS,
    name: 'AI 與聊天機器人',
    description: 'AI Agent、RAG 系統、智能對話機器人',
    icon: '🤖',
  },
  [TemplateCategory.SOCIAL_MEDIA]: {
    id: TemplateCategory.SOCIAL_MEDIA,
    name: '社交媒體與影片',
    description: 'TikTok、Instagram、YouTube 自動化和 AI 影片生成',
    icon: '📱',
  },
  [TemplateCategory.DATA_PROCESSING]: {
    id: TemplateCategory.DATA_PROCESSING,
    name: '資料處理與分析',
    description: 'Google Sheets、資料庫整合、資料分析工作流程',
    icon: '📊',
  },
  [TemplateCategory.COMMUNICATION]: {
    id: TemplateCategory.COMMUNICATION,
    name: '通訊與協作',
    description: 'Email、WhatsApp、Telegram、Slack 自動化',
    icon: '💬',
  },
  [TemplateCategory.AUTOMATION]: {
    id: TemplateCategory.AUTOMATION,
    name: '自動化與整合',
    description: '工作流程自動化、API 整合、排程任務',
    icon: '⚡',
  },
  [TemplateCategory.LEARNING]: {
    id: TemplateCategory.LEARNING,
    name: '學習與教學',
    description: 'n8n 入門教學、互動式教程',
    icon: '📚',
  },
};

/**
 * Template 生成器配置
 */
export interface TemplateGeneratorConfig {
  outputDir: string;
  maxTemplatesPerCategory?: number;
}

/**
 * Template 生成器
 */
export class TemplateGenerator {
  private config: TemplateGeneratorConfig;

  constructor(config: TemplateGeneratorConfig) {
    this.config = {
      maxTemplatesPerCategory: 20,
      ...config,
    };
  }

  /**
   * 分類 template
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
   * 生成單個 template 的 markdown 檔案
   */
  generateTemplateMarkdown(template: Template, category: TemplateCategory): string {
    const sections = [
      `# ${template.name}`,
      '',
      `> ${CATEGORY_INFO[category].icon} **分類**: ${CATEGORY_INFO[category].name}`,
      `> 👁️ **瀏覽次數**: ${template.totalViews.toLocaleString()}`,
      `> 📅 **建立時間**: ${new Date(template.createdAt).toLocaleDateString('zh-TW')}`,
      '',
      '## 描述',
      '',
      template.description || '無描述',
      '',
      '## 使用的節點',
      '',
    ];

    if (template.nodes && template.nodes.length > 0) {
      template.nodes.forEach((node) => {
        const displayName = node.displayName || node.name;
        sections.push(`- ${displayName}`);
      });
    } else {
      sections.push('*此範本不包含節點資訊*');
    }

    sections.push(
      '',
      '## 作者資訊',
      '',
      `- **名稱**: ${template.user.name}`,
      `- **用戶名**: @${template.user.username}`,
      template.user.verified ? `- ✓ 已驗證用戶` : '',
      '',
      '## 相關連結',
      '',
      `- [在 n8n.io 上查看此範本](https://n8n.io/workflows/${template.id})`,
      ''
    );

    return sections.filter(Boolean).join('\n');
  }

  /**
   * 生成分類索引
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
      `共 ${templates.length} 個範本`,
      '',
      '## 範本列表',
      '',
    ];

    // 按瀏覽次數排序
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
      '這裡收錄了 100 個來自 n8n.io 的熱門工作流程範本，按照使用場景分類。',
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
      `- 總瀏覽次數: ${Array.from(categorizedTemplates.values())
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
  async generate(templates: Template[]): Promise<void> {
    // 按分類組織 templates
    const categorized = new Map<TemplateCategory, Template[]>();

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

      // 生成分類索引
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

    console.log(`成功生成 ${templates.length} 個範本檔案`);
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
