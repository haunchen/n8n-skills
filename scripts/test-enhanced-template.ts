/**
 * 測試增強的 TemplateGenerator
 */

import { ApiCollector } from '../src/collectors/api-collector';
import { TemplateGenerator, type Template } from '../src/generators/template-generator';
import { promises as fs } from 'fs';
import path from 'path';

async function test() {
  const collector = new ApiCollector();
  const generator = new TemplateGenerator({
    outputDir: path.join(process.cwd(), 'output/test-templates'),
  });

  try {
    console.log('=== 測試增強的 TemplateGenerator ===\n');

    // 1. 獲取 template 基本資訊
    console.log('步驟 1: 獲取 template 基本資訊...');
    const result = await collector.fetchTemplates();
    const template = result.templates[0]; // 使用第一個 template

    console.log(`Template ID: ${template.id}`);
    console.log(`Template Name: ${template.name}\n`);

    // 2. 獲取完整 workflow
    console.log('步驟 2: 獲取完整 workflow...');
    const workflow = await collector.fetchWorkflowDefinition(template.id);
    console.log(`Workflow 節點數: ${workflow.nodes.length}\n`);

    // 3. 增強 template
    console.log('步驟 3: 增強 template（加入分析）...');
    const enhancedTemplate = generator.enhanceTemplate(template as Template, workflow);
    console.log(`分析完成，活動節點: ${enhancedTemplate.analysis?.activeNodes}\n`);

    // 4. 生成 markdown
    console.log('步驟 4: 生成 markdown...');
    await generator.generate([enhancedTemplate]);
    console.log('生成完成！\n');

    // 5. 讀取並顯示部分內容
    const categoryDir = path.join(process.cwd(), 'output/test-templates');
    const files = await fs.readdir(categoryDir, { recursive: true });
    const mdFile = files.find(f => typeof f === 'string' && f.endsWith('.md') && !f.includes('README'));

    if (mdFile) {
      const filePath = path.join(categoryDir, mdFile as string);
      const content = await fs.readFile(filePath, 'utf-8');

      console.log('生成的檔案內容（前 1500 字元）:');
      console.log('='.repeat(80));
      console.log(content.substring(0, 1500));
      console.log('...');
      console.log('='.repeat(80));
    }

  } catch (error) {
    console.error('測試失敗:', error);
  }
}

test();
