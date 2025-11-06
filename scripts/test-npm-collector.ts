#!/usr/bin/env ts-node
/**
 * Test script for npm-collector.ts
 * Verifies that node collection functionality works correctly
 */

import { NpmCollector } from '../src/collectors/npm-collector';

async function main() {
  console.log('Testing NpmCollector...\n');

  const collector = new NpmCollector();

  try {
    console.log('Collecting node information...');
    const startTime = Date.now();

    const nodes = await collector.collectAll();

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log(`\nCollection completed! Duration: ${duration} seconds`);
    console.log(`Total nodes collected: ${nodes.length}\n`);

    // Display statistics
    const stats = {
      Total: nodes.length,
      Triggers: nodes.filter(n => n.isTrigger).length,
      Webhooks: nodes.filter(n => n.isWebhook).length,
      'AI Tools': nodes.filter(n => n.isAITool).length,
      'With Credentials': nodes.filter(n => n.hasCredentials).length,
      'With Operations': nodes.filter(n => n.hasOperations).length,
      Versioned: nodes.filter(n => n.isVersioned).length,
    };

    console.log('=== Statistics ===');
    for (const [key, value] of Object.entries(stats)) {
      console.log(`${key}: ${value}`);
    }

    // Group by package
    const byPackage = nodes.reduce((acc, node) => {
      acc[node.packageName] = (acc[node.packageName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('\n=== Package Distribution ===');
    for (const [pkg, count] of Object.entries(byPackage)) {
      console.log(`${pkg}: ${count} nodes`);
    }

    // Group by category
    const byCategory = nodes.reduce((acc, node) => {
      acc[node.category] = (acc[node.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('\n=== Category Distribution (Top 10) ===');
    const topCategories = Object.entries(byCategory)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    for (const [category, count] of topCategories) {
      console.log(`${category}: ${count} nodes`);
    }

    // Display sample nodes
    console.log('\n=== Sample Nodes (First 5) ===');
    nodes.slice(0, 5).forEach((node, index) => {
      console.log(`\n${index + 1}. ${node.displayName}`);
      console.log(`   Node Type: ${node.nodeType}`);
      console.log(`   Category: ${node.category}`);
      console.log(`   Version: ${node.version}`);
      console.log(`   Description: ${node.description.substring(0, 100)}${node.description.length > 100 ? '...' : ''}`);
      console.log(`   Features: ${[
        node.isTrigger && 'Trigger',
        node.isWebhook && 'Webhook',
        node.isAITool && 'AI Tool',
        node.hasCredentials && 'With Credentials',
        node.hasOperations && 'With Operations',
        node.isVersioned && 'Versioned'
      ].filter(Boolean).join(', ') || 'None'}`);
    });

    // Check for well-known nodes
    console.log('\n=== Well-known Nodes Check ===');
    const famousNodes = ['Slack', 'HTTP Request', 'Gmail', 'Google Sheets', 'OpenAI'];

    for (const name of famousNodes) {
      const found = nodes.find(n => n.displayName === name);
      if (found) {
        console.log(`✓ ${name} - Version ${found.version} (${found.category})`);
      } else {
        console.log(`✗ ${name} - Not found`);
      }
    }

    // Test completed
    console.log('\nTest completed!');

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
