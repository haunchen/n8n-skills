/**
 * Test enhanced TemplateGenerator
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
    console.log('=== Testing Enhanced TemplateGenerator ===\n');

    // 1. Fetch template basic information
    console.log('Step 1: Fetching template basic information...');
    const result = await collector.fetchTemplates();
    const template = result.templates[0]; // Use the first template

    console.log(`Template ID: ${template.id}`);
    console.log(`Template Name: ${template.name}\n`);

    // 2. Fetch complete workflow
    console.log('Step 2: Fetching complete workflow...');
    const workflow = await collector.fetchWorkflowDefinition(template.id);
    console.log(`Workflow node count: ${workflow.nodes.length}\n`);

    // 3. Enhance template
    console.log('Step 3: Enhancing template (adding analysis)...');
    const enhancedTemplate = generator.enhanceTemplate(template as Template, workflow);
    console.log(`Analysis completed, active nodes: ${enhancedTemplate.analysis?.activeNodes}\n`);

    // 4. Generate markdown
    console.log('Step 4: Generating markdown...');
    await generator.generate([enhancedTemplate]);
    console.log('Generation completed!\n');

    // 5. Read and display partial content
    const categoryDir = path.join(process.cwd(), 'output/test-templates');
    const files = await fs.readdir(categoryDir, { recursive: true });
    const mdFile = files.find(f => typeof f === 'string' && f.endsWith('.md') && !f.includes('README'));

    if (mdFile) {
      const filePath = path.join(categoryDir, mdFile as string);
      const content = await fs.readFile(filePath, 'utf-8');

      console.log('Generated file content (first 1500 characters):');
      console.log('='.repeat(80));
      console.log(content.substring(0, 1500));
      console.log('...');
      console.log('='.repeat(80));
    }

  } catch (error) {
    console.error('Test failed:', error);
  }
}

test();
