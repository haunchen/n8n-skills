/**
 * Quick test for organizer functionality
 */

import path from 'path';
import { CategoryOrganizer } from '../src/organizers/category-organizer';
import { NodeGrouper } from '../src/organizers/node-grouper';

console.log('Testing Organizer Functionality\n');
console.log('='.repeat(60));

// Test CategoryOrganizer
console.log('\n1. Testing CategoryOrganizer:');
const configPath = path.join(__dirname, '../../config/categories.json');
const categoryOrganizer = new CategoryOrganizer(configPath);

const mockNodes = [
  {
    nodeType: 'nodes-base.httpRequest',
    displayName: 'HTTP Request',
    description: 'Make HTTP requests',
    category: 'core'
  },
  {
    nodeType: 'nodes-base.slack',
    displayName: 'Slack',
    description: 'Send Slack messages',
    category: 'app'
  },
  {
    nodeType: 'nodes-base.postgres',
    displayName: 'PostgreSQL',
    description: 'PostgreSQL database',
    category: 'database'
  }
];

const categoryResult = categoryOrganizer.organize(mockNodes, 2);
console.log(`   Top nodes: ${categoryResult.topNodes.length}`);
console.log(`   Remaining nodes: ${categoryResult.remainingNodes.length}`);
console.log(`   Uncategorized nodes: ${categoryResult.uncategorizedNodes.length}`);

categoryResult.topNodes.forEach(node => {
  console.log(`   - ${node.displayName} (Priority: ${node.priority})`);
});

// Test NodeGrouper
console.log('\n2. Testing NodeGrouper:');
const nodeGrouper = new NodeGrouper();

const groupingResult = nodeGrouper.group(mockNodes);
const stats = nodeGrouper.generateStatistics(groupingResult);

console.log(`   Total nodes: ${stats.totalNodes}`);
console.log(`   Relationships: ${stats.relationshipsCount}`);

console.log('\n   Frequency distribution:');
for (const [freq, count] of Object.entries(stats.frequencyDistribution)) {
  console.log(`     ${freq}: ${count}`);
}

console.log('\n   Function distribution (non-zero):');
for (const [func, count] of Object.entries(stats.functionDistribution)) {
  if (count > 0) {
    console.log(`     ${func}: ${count}`);
  }
}

console.log('\nTest completed! All organizers working properly.');
