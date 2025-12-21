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
    name: 'AI & Chatbots',
    description: 'AI Agents, RAG systems, intelligent conversational bots',
    icon: '',
  },
  [TemplateCategory.SOCIAL_MEDIA]: {
    id: TemplateCategory.SOCIAL_MEDIA,
    name: 'Social Media & Video',
    description: 'TikTok, Instagram, YouTube automation and AI video generation',
    icon: '',
  },
  [TemplateCategory.DATA_PROCESSING]: {
    id: TemplateCategory.DATA_PROCESSING,
    name: 'Data Processing & Analysis',
    description: 'Google Sheets, database integration, data analysis workflows',
    icon: '',
  },
  [TemplateCategory.COMMUNICATION]: {
    id: TemplateCategory.COMMUNICATION,
    name: 'Communication & Collaboration',
    description: 'Email, WhatsApp, Telegram, Slack automation',
    icon: '',
  },
  [TemplateCategory.AUTOMATION]: {
    id: TemplateCategory.AUTOMATION,
    name: 'Automation & Integration',
    description: 'Workflow automation, API integration, scheduled tasks',
    icon: '',
  },
  [TemplateCategory.LEARNING]: {
    id: TemplateCategory.LEARNING,
    name: 'Learning & Teaching',
    description: 'n8n introductory tutorials, interactive lessons',
    icon: '',
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
      `> **Category**: ${CATEGORY_INFO[category].name}`,
      `> **Views**: ${template.totalViews.toLocaleString()}`,
      `> **Created**: ${new Date(template.createdAt).toLocaleDateString('en-US')}`,
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
      `- **Name**: ${template.user.name}`,
      `- **Username**: @${template.user.username}`,
      template.user.verified ? `- Verified user` : '',
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
      `# ${info.name}`,
      '',
      info.description,
      '',
      `Total: ${templates.length} templates`,
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
        `- [${template.name}](./${filename}) - ${views} views`
      );
    });

    sections.push('');

    return sections.join('\n');
  }

  /**
   * Generate main index
   */
  generateMainIndex(categorizedTemplates: Map<TemplateCategory, Template[]>): string {
    const totalCount = Array.from(categorizedTemplates.values()).reduce((sum, arr) => sum + arr.length, 0);
    const sections = [
      '# n8n Workflow Templates',
      '',
      `We have collected ${totalCount} popular workflow templates from n8n.io, organized by use case categories.`,
      '',
      '## Category Navigation',
      '',
    ];

    // List categories in defined order
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

      // Only display categories with templates
      if (templates.length > 0) {
        sections.push(
          `### [${info.name}](${category}/README.md)`,
          '',
          info.description,
          '',
          `**Template Count**: ${templates.length}`,
          ''
        );
      }
    });

    sections.push(
      '## Usage Instructions',
      '',
      '1. Browse the categories above to find the workflow type you need',
      '2. Click on a category link to view all templates in that category',
      '3. Select a template you are interested in to view detailed information',
      '4. Click on the "View this template on n8n.io" link in the template to use it directly in n8n',
      '',
      '## Statistics',
      '',
      `- Total Templates: ${Array.from(categorizedTemplates.values()).reduce((sum, arr) => sum + arr.length, 0)}`,
      `- Total Views: ${Array.from(categorizedTemplates.values())
        .flat()
        .reduce((sum, t) => sum + t.totalViews, 0)
        .toLocaleString()}`,
      ''
    );

    return sections.join('\n');
  }

  /**
   * Get template filename
   */
  private getTemplateFilename(template: Template): string {
    // Remove special characters, keep only letters, numbers, and hyphens
    const slug = template.name
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 60);

    return `${template.id}-${slug}.md`;
  }

  /**
   * Generate all template files
   */
  async generate(templates: Array<Template | EnhancedTemplate>): Promise<void> {
    // Organize templates by category
    const categorized = new Map<TemplateCategory, Array<Template | EnhancedTemplate>>();

    templates.forEach((template) => {
      const category = this.categorizeTemplate(template);
      if (!categorized.has(category)) {
        categorized.set(category, []);
      }
      categorized.get(category)!.push(template);
    });

    // Create directory for each category
    for (const [category, categoryTemplates] of categorized.entries()) {
      const categoryDir = path.join(this.config.outputDir, category);
      await fs.mkdir(categoryDir, { recursive: true });

      // Limit the number of templates per category
      const limited = categoryTemplates
        .sort((a, b) => b.totalViews - a.totalViews)
        .slice(0, this.config.maxTemplatesPerCategory);

      // Generate file for each template
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

    // Generate main index
    const mainIndex = this.generateMainIndex(categorized);
    await fs.writeFile(
      path.join(this.config.outputDir, 'README.md'),
      mainIndex,
      'utf-8'
    );

    console.log(`Successfully generated ${templates.length} template files`);
    console.log(`Number of categories: ${categorized.size}`);
    categorized.forEach((templates, category) => {
      console.log(`  ${CATEGORY_INFO[category].name}: ${templates.length}`);
    });
  }
}

/**
 * Convenience function: generate templates
 */
export async function generateTemplates(
  templates: Template[],
  outputDir: string
): Promise<void> {
  const generator = new TemplateGenerator({ outputDir });
  await generator.generate(templates);
}
