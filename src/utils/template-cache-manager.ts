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
 * Template 快取項目
 */
export interface TemplateCacheItem {
  id: number;
  name: string;
  totalViews: number;
  lastFetched: string;
  workflow?: WorkflowDefinition & { id: number; name: string };
}

/**
 * Template 排序快照
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
 * 快取變更分析結果
 */
export interface CacheAnalysis {
  needsUpdate: boolean;
  newTemplates: number[];
  rankChanged: number[];
  unchanged: number[];
  removed: number[];
}

/**
 * Template 快取管理器
 * 負責管理 template workflow 的快取，避免重複下載未變動的 template
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
   * 載入排序快照
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
   * 儲存排序快照
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
   * 載入 workflow 快取
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
   * 儲存 workflow 快取
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
   * 分析快取變更
   * 比對新的 template 列表與快取的排序，判斷哪些需要更新
   */
  async analyzeCacheChanges(
    currentTemplates: Array<{ id: number; totalViews: number }>
  ): Promise<CacheAnalysis> {
    const oldSnapshot = await this.loadRankingSnapshot();

    // 如果沒有舊快取，所有 template 都是新的
    if (!oldSnapshot) {
      return {
        needsUpdate: true,
        newTemplates: currentTemplates.map(t => t.id),
        rankChanged: [],
        unchanged: [],
        removed: [],
      };
    }

    // 建立舊排序的 Map（id -> rank）
    const oldRankMap = new Map(
      oldSnapshot.rankings.map(r => [r.id, r.rank])
    );

    // 建立舊排序的 Map（id -> totalViews）
    const oldViewsMap = new Map(
      oldSnapshot.rankings.map(r => [r.id, r.totalViews])
    );

    const newTemplates: number[] = [];
    const rankChanged: number[] = [];
    const unchanged: number[] = [];

    // 檢查每個當前 template
    currentTemplates.forEach((template, index) => {
      const currentRank = index + 1;
      const oldRank = oldRankMap.get(template.id);
      const oldViews = oldViewsMap.get(template.id);

      if (oldRank === undefined) {
        // 新出現的 template
        newTemplates.push(template.id);
      } else if (oldRank !== currentRank || oldViews !== template.totalViews) {
        // 排序改變或瀏覽次數改變
        rankChanged.push(template.id);
      } else {
        // 完全沒變
        unchanged.push(template.id);
      }
    });

    // 找出被移除的 template（在舊快照中但不在新列表中）
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
   * 取得需要下載的 template IDs
   */
  async getTemplatesNeedingDownload(
    currentTemplates: Array<{ id: number; totalViews: number }>
  ): Promise<number[]> {
    const analysis = await this.analyzeCacheChanges(currentTemplates);

    // 需要下載的 = 新 template + 排序改變的
    return [...analysis.newTemplates, ...analysis.rankChanged];
  }

  /**
   * 從快取取得 workflow
   */
  async getCachedWorkflow(
    templateId: number
  ): Promise<(WorkflowDefinition & { id: number; name: string }) | null> {
    const cache = await this.loadWorkflowCache();
    const item = cache.get(templateId);
    return item?.workflow || null;
  }

  /**
   * 批次取得快取的 workflows
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
   * 更新快取
   * 儲存新下載的 workflows 並更新排序快照
   */
  async updateCache(
    currentTemplates: Array<{ id: number; name: string; totalViews: number }>,
    newWorkflows: Array<WorkflowDefinition & { id: number; name: string }>
  ): Promise<void> {
    // 載入現有快取
    const cache = await this.loadWorkflowCache();

    // 更新新下載的 workflows
    for (const workflow of newWorkflows) {
      cache.set(workflow.id, {
        id: workflow.id,
        name: workflow.name,
        totalViews: currentTemplates.find(t => t.id === workflow.id)?.totalViews || 0,
        lastFetched: new Date().toISOString(),
        workflow,
      });
    }

    // 移除不在當前列表中的快取項目（清理舊資料）
    const currentIds = new Set(currentTemplates.map(t => t.id));
    for (const id of cache.keys()) {
      if (!currentIds.has(id)) {
        cache.delete(id);
      }
    }

    // 儲存 workflow 快取
    await this.saveWorkflowCache(cache);

    // 更新排序快照
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
   * 清除所有快取
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
   * 取得快取統計資訊
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

    // 計算快取檔案大小
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
