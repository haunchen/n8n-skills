/**
 * Copyright (c) 2025 Frank Chen @ www.frankchen.tw/personal
 * SPDX-License-Identifier: MIT
 *
 * This file is part of n8n-skills project.
 *
 * Update community packages list from npm registry.
 * Also parses node details and saves to cache.
 */

import path from 'path';
import { info, warn, error, success } from '../src/utils/logger';
import {
  CommunityCollector,
  CommunityCollectionResult,
  CommunityNodesCache,
} from '../src/collectors/community-collector';

interface UpdateResult {
  hasChanges: boolean;
  oldPackageCount: number;
  newPackageCount: number;
  addedPackages: string[];
  removedPackages: string[];
  timestamp: string;
}

class CommunityUpdater {
  private configPath: string;
  private cachePath: string;
  private dryRun: boolean;
  private skipParse: boolean;
  private collector: CommunityCollector;

  constructor(dryRun: boolean = false, skipParse: boolean = false) {
    this.configPath = path.join(process.cwd(), 'config', 'community-packages.json');
    this.cachePath = path.join(process.cwd(), 'data', 'cache', 'community-nodes.json');
    this.dryRun = dryRun;
    this.skipParse = skipParse;
    this.collector = new CommunityCollector({ limit: 30 });
  }

  async run(): Promise<void> {
    try {
      info('Starting community packages update...');
      if (this.dryRun) {
        warn('Execution mode: Check only, no actual update');
      }

      // Load existing config
      info('\n[1/4] Loading existing community packages...');
      const oldResult = await this.collector.loadFromConfig(this.configPath);
      const oldPackageCount = oldResult?.packages.length || 0;
      info(`Found ${oldPackageCount} existing packages`);

      // Fetch latest packages from npm
      info('\n[2/4] Fetching latest community packages from npm...');
      const newResult = await this.collector.fetchPopularPackages();

      // Compare and check for changes
      info('\n[3/4] Comparing package lists...');
      const updateResult = this.compareResults(oldResult, newResult);

      // Print summary
      this.printSummary(updateResult);

      // Save if not dry run and has changes
      if (!this.dryRun && updateResult.hasChanges) {
        await this.collector.saveToConfig(newResult, this.configPath);
        success('Community packages config updated');
      } else if (!updateResult.hasChanges) {
        info('No changes detected, skipping config save');
      } else {
        info('Dry run mode, skipping config save');
      }

      // Parse node details (Step 4)
      if (!this.dryRun && !this.skipParse) {
        info('\n[4/4] Parsing node details (this may take a while)...');
        await this.parseNodeDetails(newResult);
      } else if (this.skipParse) {
        info('\n[4/4] Skipping node parsing (--skip-parse flag)');
      } else {
        info('\n[4/4] Dry run mode, skipping node parsing');
      }

      // Print statistics
      this.collector.printStats(newResult);

      // Output result for CI
      if (process.env.GITHUB_OUTPUT) {
        const outputPath = process.env.GITHUB_OUTPUT;
        const outputContent = `community_updated=${updateResult.hasChanges}\n`;
        await require('fs').promises.appendFile(outputPath, outputContent);
        info(`GitHub output written: community_updated=${updateResult.hasChanges}`);
      }

      success('Community packages update completed');
    } catch (err) {
      error('Community packages update failed', err);
      process.exit(1);
    }
  }

  /**
   * Parse node details for all packages
   * Process one package at a time: install → parse → uninstall
   */
  private async parseNodeDetails(result: CommunityCollectionResult): Promise<void> {
    // Load existing cache
    const existingCache = await this.collector.loadNodesCache(this.cachePath);
    const cache: CommunityNodesCache = {
      lastUpdated: new Date().toISOString(),
      nodes: existingCache?.nodes || {},
    };

    const total = result.packages.length;
    let processed = 0;
    let succeeded = 0;
    let failed = 0;
    let skipped = 0;

    for (const pkg of result.packages) {
      processed++;
      info(`\n[${processed}/${total}] Processing ${pkg.name}...`);

      // Check if cached version matches
      const cached = cache.nodes[pkg.name];
      if (cached && cached.packageVersion === pkg.version && cached.nodes.length > 0) {
        info(`  Using cached data (v${pkg.version})`);
        skipped++;
        continue;
      }

      // Process package: install → parse → uninstall
      const details = await this.collector.processPackageForDetails(pkg);

      if (details.loadError) {
        warn(`  Error: ${details.loadError}`);
        failed++;
        // Keep old cache if available
        if (!cached) {
          cache.nodes[pkg.name] = details;
        }
      } else {
        succeeded++;
        cache.nodes[pkg.name] = details;
      }
    }

    // Save cache
    await this.collector.saveNodesCache(cache, this.cachePath);

    // Print summary
    console.log('\n===== Node Parsing Summary =====');
    console.log(`Total packages: ${total}`);
    console.log(`Succeeded: ${succeeded}`);
    console.log(`Failed: ${failed}`);
    console.log(`Skipped (cached): ${skipped}`);
    console.log('================================\n');
  }

  private compareResults(
    oldResult: CommunityCollectionResult | null,
    newResult: CommunityCollectionResult
  ): UpdateResult {
    const oldNames = new Set(oldResult?.packages.map((p) => p.name) || []);
    const newNames = new Set(newResult.packages.map((p) => p.name));

    const addedPackages: string[] = [];
    const removedPackages: string[] = [];

    for (const name of newNames) {
      if (!oldNames.has(name)) {
        addedPackages.push(name);
      }
    }

    for (const name of oldNames) {
      if (!newNames.has(name)) {
        removedPackages.push(name);
      }
    }

    const hasChanges = this.collector.hasChanges(oldResult, newResult);

    return {
      hasChanges,
      oldPackageCount: oldResult?.packages.length || 0,
      newPackageCount: newResult.packages.length,
      addedPackages,
      removedPackages,
      timestamp: new Date().toISOString(),
    };
  }

  private printSummary(result: UpdateResult): void {
    console.log('\n===== Update Summary =====');
    console.log(`Has changes: ${result.hasChanges ? 'Yes' : 'No'}`);
    console.log(`Package count: ${result.oldPackageCount} → ${result.newPackageCount}`);

    if (result.addedPackages.length > 0) {
      console.log(`\nAdded packages (${result.addedPackages.length}):`);
      result.addedPackages.forEach((name) => console.log(`  + ${name}`));
    }

    if (result.removedPackages.length > 0) {
      console.log(`\nRemoved packages (${result.removedPackages.length}):`);
      result.removedPackages.forEach((name) => console.log(`  - ${name}`));
    }

    console.log('==========================\n');
  }
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const skipParse = args.includes('--skip-parse');

  if (args.includes('--help')) {
    console.log(`
Usage: npm run update:community [options]

Options:
  --dry-run      Check for updates without saving changes
  --skip-parse   Skip node parsing (only update package list)
  --help         Show this help message
`);
    process.exit(0);
  }

  const updater = new CommunityUpdater(dryRun, skipParse);
  updater.run().catch((err) => {
    error('Execution failed', err);
    process.exit(1);
  });
}

export { CommunityUpdater };
