/**
 * Copyright (c) 2025 Frank Chen @ www.frankchen.tw/personal
 * SPDX-License-Identifier: MIT
 *
 * This file is part of n8n-skills project.
 */

import { promises as fs } from 'fs';
import path from 'path';
import type { WorkflowDefinition } from '../collectors/api-collector';

/**
 * Template cache item
 */
export interface TemplateCacheItem {
  id: number;
  name: string;
  totalViews: number;
  lastFetched: string;
  workflow?: WorkflowDefinition & { id: number; name: string };
}

/**
 * Template ranking snapshot
 */
export interface TemplateRankingSnapshot {
  version: string;
  fetchedAt: string;
  rankings: Array<{
    id: number;
    rank: number;
    totalViews: number;
  }>;
}

/**
 * Cache change analysis result
 */
export interface CacheAnalysis {
  needsUpdate: boolean;
  newTemplates: number[];
  rankChanged: number[];
  unchanged: number[];
  removed: number[];
}

/**
 * Template Cache Manager
 * Manages template workflow cache to avoid re-downloading unchanged templates
 */
export class TemplateCacheManager {
  private cacheDir: string;
  private rankingSnapshotPath: string;
  private workflowCachePath: string;

  constructor(cacheDir: string) {
    this.cacheDir = cacheDir;
    this.rankingSnapshotPath = path.join(cacheDir, 'template-ranking-snapshot.json');
    this.workflowCachePath = path.join(cacheDir, 'template-workflows.json');
  }

  /**
   * Load ranking snapshot
   */
  private async loadRankingSnapshot(): Promise<TemplateRankingSnapshot | null> {
    try {
      const content = await fs.readFile(this.rankingSnapshotPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  /**
   * Save ranking snapshot
   */
  private async saveRankingSnapshot(snapshot: TemplateRankingSnapshot): Promise<void> {
    await fs.mkdir(this.cacheDir, { recursive: true });
    await fs.writeFile(
      this.rankingSnapshotPath,
      JSON.stringify(snapshot, null, 2),
      'utf-8'
    );
  }

  /**
   * Load workflow cache
   */
  private async loadWorkflowCache(): Promise<Map<number, TemplateCacheItem>> {
    try {
      const content = await fs.readFile(this.workflowCachePath, 'utf-8');
      const data = JSON.parse(content) as TemplateCacheItem[];
      return new Map(data.map(item => [item.id, item]));
    } catch {
      return new Map();
    }
  }

  /**
   * Save workflow cache
   */
  private async saveWorkflowCache(cache: Map<number, TemplateCacheItem>): Promise<void> {
    await fs.mkdir(this.cacheDir, { recursive: true });
    const data = Array.from(cache.values());
    await fs.writeFile(
      this.workflowCachePath,
      JSON.stringify(data, null, 2),
      'utf-8'
    );
  }

  /**
   * Analyze cache changes
   * Compare new template list with cached rankings to determine which need updates
   */
  async analyzeCacheChanges(
    currentTemplates: Array<{ id: number; totalViews: number }>
  ): Promise<CacheAnalysis> {
    const oldSnapshot = await this.loadRankingSnapshot();

    // If no old cache exists, all templates are new
    if (!oldSnapshot) {
      return {
        needsUpdate: true,
        newTemplates: currentTemplates.map(t => t.id),
        rankChanged: [],
        unchanged: [],
        removed: [],
      };
    }

    // Build old ranking map (id -> rank)
    const oldRankMap = new Map(
      oldSnapshot.rankings.map(r => [r.id, r.rank])
    );

    // Build old views map (id -> totalViews)
    const oldViewsMap = new Map(
      oldSnapshot.rankings.map(r => [r.id, r.totalViews])
    );

    const newTemplates: number[] = [];
    const rankChanged: number[] = [];
    const unchanged: number[] = [];

    // Check each current template
    currentTemplates.forEach((template, index) => {
      const currentRank = index + 1;
      const oldRank = oldRankMap.get(template.id);
      const oldViews = oldViewsMap.get(template.id);

      if (oldRank === undefined) {
        // Newly appeared template
        newTemplates.push(template.id);
      } else if (oldRank !== currentRank || oldViews !== template.totalViews) {
        // Rank changed or view count changed
        rankChanged.push(template.id);
      } else {
        // Completely unchanged
        unchanged.push(template.id);
      }
    });

    // Find removed templates (in old snapshot but not in new list)
    const currentIds = new Set(currentTemplates.map(t => t.id));
    const removed = oldSnapshot.rankings
      .map(r => r.id)
      .filter(id => !currentIds.has(id));

    const needsUpdate = newTemplates.length > 0 || rankChanged.length > 0 || removed.length > 0;

    return {
      needsUpdate,
      newTemplates,
      rankChanged,
      unchanged,
      removed,
    };
  }

  /**
   * Get template IDs that need downloading
   */
  async getTemplatesNeedingDownload(
    currentTemplates: Array<{ id: number; totalViews: number }>
  ): Promise<number[]> {
    const analysis = await this.analyzeCacheChanges(currentTemplates);

    // Need to download = new templates + rank changed
    return [...analysis.newTemplates, ...analysis.rankChanged];
  }

  /**
   * Get workflow from cache
   */
  async getCachedWorkflow(
    templateId: number
  ): Promise<(WorkflowDefinition & { id: number; name: string }) | null> {
    const cache = await this.loadWorkflowCache();
    const item = cache.get(templateId);
    return item?.workflow || null;
  }

  /**
   * Batch get cached workflows
   */
  async getCachedWorkflows(
    templateIds: number[]
  ): Promise<Map<number, WorkflowDefinition & { id: number; name: string }>> {
    const cache = await this.loadWorkflowCache();
    const result = new Map<number, WorkflowDefinition & { id: number; name: string }>();

    for (const id of templateIds) {
      const item = cache.get(id);
      if (item?.workflow) {
        result.set(id, item.workflow);
      }
    }

    return result;
  }

  /**
   * Update cache
   * Save newly downloaded workflows and update ranking snapshot
   */
  async updateCache(
    currentTemplates: Array<{ id: number; name: string; totalViews: number }>,
    newWorkflows: Array<WorkflowDefinition & { id: number; name: string }>
  ): Promise<void> {
    // Load existing cache
    const cache = await this.loadWorkflowCache();

    // Update newly downloaded workflows
    for (const workflow of newWorkflows) {
      cache.set(workflow.id, {
        id: workflow.id,
        name: workflow.name,
        totalViews: currentTemplates.find(t => t.id === workflow.id)?.totalViews || 0,
        lastFetched: new Date().toISOString(),
        workflow,
      });
    }

    // Remove cache items not in current list (cleanup old data)
    const currentIds = new Set(currentTemplates.map(t => t.id));
    for (const id of cache.keys()) {
      if (!currentIds.has(id)) {
        cache.delete(id);
      }
    }

    // Save workflow cache
    await this.saveWorkflowCache(cache);

    // Update ranking snapshot
    const snapshot: TemplateRankingSnapshot = {
      version: '1.0.0',
      fetchedAt: new Date().toISOString(),
      rankings: currentTemplates.map((t, index) => ({
        id: t.id,
        rank: index + 1,
        totalViews: t.totalViews,
      })),
    };

    await this.saveRankingSnapshot(snapshot);
  }

  /**
   * Clear all cache
   */
  async clearCache(): Promise<void> {
    try {
      await fs.unlink(this.rankingSnapshotPath);
    } catch {}
    try {
      await fs.unlink(this.workflowCachePath);
    } catch {}
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    totalCached: number;
    oldestCache: string | null;
    newestCache: string | null;
    totalSize: number;
  }> {
    const cache = await this.loadWorkflowCache();

    let oldestCache: string | null = null;
    let newestCache: string | null = null;

    for (const item of cache.values()) {
      if (!oldestCache || item.lastFetched < oldestCache) {
        oldestCache = item.lastFetched;
      }
      if (!newestCache || item.lastFetched > newestCache) {
        newestCache = item.lastFetched;
      }
    }

    // Calculate cache file size
    let totalSize = 0;
    try {
      const stats = await fs.stat(this.workflowCachePath);
      totalSize = stats.size;
    } catch {}

    return {
      totalCached: cache.size,
      oldestCache,
      newestCache,
      totalSize,
    };
  }
}
