/**
 * Quick test for SkillGenerator functionality
 */

import { SkillGenerator, type SkillGeneratorInput } from '../src/generators/skill-generator';

// Mock data
const mockInput: SkillGeneratorInput = {
  nodes: [
    {
      nodeType: 'nodes-base.HttpRequest',
      displayName: 'HTTP Request',
      description: 'Send HTTP requests and return response data',
      category: 'core',
      packageName: 'n8n-nodes-base',
      version: '4.2',
      isVersioned: true,
      isTrigger: false,
      isWebhook: false,
      isAITool: false,
      hasCredentials: false,
      hasOperations: true,
      usageCount: 150,
      usagePercentage: 25.5,
    },
    {
      nodeType: 'nodes-base.Set',
      displayName: 'Set',
      description: 'Set data values',
      category: 'core',
      packageName: 'n8n-nodes-base',
      version: '3.3',
      isVersioned: true,
      isTrigger: false,
      isWebhook: false,
      isAITool: false,
      hasCredentials: false,
      hasOperations: false,
      usageCount: 120,
      usagePercentage: 20.4,
    },
    {
      nodeType: 'nodes-base.IF',
      displayName: 'IF',
      description: 'Route data based on conditions',
      category: 'core',
      packageName: 'n8n-nodes-base',
      version: '2.0',
      isVersioned: true,
      isTrigger: false,
      isWebhook: false,
      isAITool: false,
      hasCredentials: false,
      hasOperations: false,
      usageCount: 100,
      usagePercentage: 17.0,
    },
    {
      nodeType: 'nodes-base.Slack',
      displayName: 'Slack',
      description: 'Send messages to Slack',
      category: 'communication',
      packageName: 'n8n-nodes-base',
      version: '2.1',
      isVersioned: true,
      isTrigger: false,
      isWebhook: false,
      isAITool: false,
      hasCredentials: true,
      hasOperations: true,
      usageCount: 80,
      usagePercentage: 13.6,
    },
  ],
  nodeUsageStats: {
    'nodes-base.HttpRequest': { count: 150, percentage: 25.5 },
    'nodes-base.Set': { count: 120, percentage: 20.4 },
    'nodes-base.IF': { count: 100, percentage: 17.0 },
    'nodes-base.Slack': { count: 80, percentage: 13.6 },
  },
  resourceFiles: [
    {
      name: 'HTTP Request',
      path: 'resources/nodes-base.HttpRequest.md',
      description: 'HTTP Request node detailed documentation',
      category: 'core',
    },
    {
      name: 'Set',
      path: 'resources/nodes-base.Set.md',
      description: 'Set node detailed documentation',
      category: 'core',
    },
    {
      name: 'IF',
      path: 'resources/nodes-base.IF.md',
      description: 'IF node detailed documentation',
      category: 'core',
    },
    {
      name: 'Slack',
      path: 'resources/nodes-base.Slack.md',
      description: 'Slack node detailed documentation',
      category: 'communication',
    },
  ],
  config: {
    name: 'n8n Workflow Automation',
    version: '1.0.0',
    description: 'n8n workflow automation knowledge base',
    topNodesCount: 10,
  },
};

// Run test
console.log('Testing SkillGenerator...\n');

const generator = new SkillGenerator(mockInput.config);
const content = generator.generate(mockInput);

console.log('Generation completed!');
console.log(`Total lines: ${content.split('\n').length}`);
console.log(`Total characters: ${content.length}`);

console.log('\n--- First 50 lines preview ---\n');
console.log(content.split('\n').slice(0, 50).join('\n'));

console.log('\n\n--- Content validation ---');
console.log('✓ Contains YAML frontmatter:', content.includes('---'));
console.log('✓ Contains project name:', content.includes('n8n Workflow Automation'));
console.log('✓ Contains version:', content.includes('version: 1.0.0'));
console.log('✓ Contains overview section:', content.includes('## What is n8n?'));
console.log('✓ Contains quick start:', content.includes('# Quick Start'));
console.log('✓ Contains node index:', content.includes('# Node Index'));
console.log('✓ Contains workflow patterns:', content.includes('# Common Workflow Patterns'));
console.log('✓ Contains resource files:', content.includes('# Resource Files'));
console.log('✓ Contains license:', content.includes('# License'));
console.log('✓ Contains HTTP Request:', content.includes('HTTP Request'));
console.log('✓ Contains usage percentage:', content.includes('25.5%'));

console.log('\nTest completed!');
