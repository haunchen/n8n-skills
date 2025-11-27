/**
 * Copyright (c) 2025 Frank Chen @ www.frankchen.tw/personal
 * SPDX-License-Identifier: MIT
 *
 * This file is part of n8n-skills project.
 *
 * Test script for CommunityCollector.
 */

import { CommunityCollector } from '../src/collectors/community-collector';

async function main() {
  console.log('=== Testing CommunityCollector ===\n');

  const collector = new CommunityCollector({
    limit: 30,
  });

  try {
    // Test 1: Search packages
    console.log('Test 1: Searching for n8n community packages...\n');
    const searchResult = await collector.searchPackages();
    console.log(`Found ${searchResult.total} packages in npm registry\n`);

    // Test 2: Fetch popular packages
    console.log('Test 2: Fetching top 30 packages by popularity...\n');
    const result = await collector.fetchPopularPackages();

    // Test 3: Print statistics
    console.log('\nTest 3: Statistics\n');
    collector.printStats(result);

    // Test 4: Display top 10 packages
    console.log('Test 4: Top 10 packages detail\n');
    console.log('| Rank | Package | Category |');
    console.log('|------|---------|----------|');
    result.packages.slice(0, 10).forEach((pkg, index) => {
      console.log(`| ${index + 1} | ${pkg.name} | ${pkg.category} |`);
    });

    // Test 5: Category distribution
    console.log('\n\nTest 5: Category distribution\n');
    const categories: Record<string, number> = {};
    result.packages.forEach((pkg) => {
      categories[pkg.category] = (categories[pkg.category] || 0) + 1;
    });
    Object.entries(categories)
      .sort((a, b) => b[1] - a[1])
      .forEach(([cat, count]) => {
        console.log(`  ${cat}: ${count} packages`);
      });

    // Test 6: Check for changes against empty config
    console.log('\n\nTest 6: Change detection\n');
    const hasChanges = collector.hasChanges(null, result);
    console.log(`Has changes (vs empty): ${hasChanges}`);

    // Test 7: Save to temp file
    console.log('\n\nTest 7: Save to temp config\n');
    const tempPath = '/tmp/test-community-packages.json';
    await collector.saveToConfig(result, tempPath);
    console.log(`Saved to: ${tempPath}`);

    // Test 8: Load from temp file
    console.log('\n\nTest 8: Load from temp config\n');
    const loaded = await collector.loadFromConfig(tempPath);
    console.log(`Loaded ${loaded?.packages.length} packages from temp file`);

    console.log('\n=== All tests passed ===\n');
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

main();
