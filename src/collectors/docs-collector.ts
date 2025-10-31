/**
 * Copyright (c) 2025 Frank Chen @ www.frankchen.tw/personal
 * SPDX-License-Identifier: MIT
 *
 * This file is part of n8n-skills project.
 */

import simpleGit, { SimpleGit } from 'simple-git';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * 節點文件摘要介面
 */
export interface NodeDocSummary {
  nodeName: string;
  summary: string; // 前 300 字摘要
  url: string; // 原始文件連結
  category: string; // core-nodes, app-nodes, trigger-nodes, cluster-nodes
  copyright: string; // 版權聲明
}

/**
 * 文件收集器配置
 */
export interface DocsCollectorConfig {
  repoUrl?: string; // n8n-docs 儲存庫 URL
  localPath?: string; // 本地儲存庫路徑
  summaryLength?: number; // 摘要長度（預設 300 字）
  categories?: string[]; // 要搜尋的文件分類
}

/**
 * 預設配置
 */
const DEFAULT_CONFIG: Required<DocsCollectorConfig> = {
  repoUrl: 'https://github.com/n8n-io/n8n-docs.git',
  localPath: path.join(process.cwd(), '.cache', 'n8n-docs'),
  summaryLength: 300,
  categories: ['core-nodes', 'app-nodes', 'trigger-nodes', 'cluster-nodes'],
};

/**
 * n8n 文件收集器
 * 從 n8n-docs 儲存庫收集節點文件摘要
 */
export class DocsCollector {
  private git: SimpleGit;
  private config: Required<DocsCollectorConfig>;

  constructor(config: DocsCollectorConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.git = simpleGit();
  }

  /**
   * 初始化或更新 n8n-docs 儲存庫
   */
  private async ensureRepository(): Promise<void> {
    try {
      // 檢查本地路徑是否存在
      const exists = await this.pathExists(this.config.localPath);

      if (exists) {
        // 儲存庫已存在，執行更新
        const git = simpleGit(this.config.localPath);
        await git.fetch();
        await git.pull();
      } else {
        // 儲存庫不存在，執行 clone
        await fs.mkdir(path.dirname(this.config.localPath), { recursive: true });
        await this.git.clone(this.config.repoUrl, this.config.localPath, ['--depth', '1']);
      }
    } catch (error) {
      throw new Error(`無法初始化 n8n-docs 儲存庫: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 檢查路徑是否存在
   */
  private async pathExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 搜尋節點文件檔案
   */
  private async findNodeDocs(): Promise<Map<string, string>> {
    const docsMap = new Map<string, string>();

    for (const category of this.config.categories) {
      const categoryPath = path.join(this.config.localPath, 'docs', 'integrations', category);

      // 檢查分類目錄是否存在
      const exists = await this.pathExists(categoryPath);
      if (!exists) {
        continue;
      }

      // 遞迴搜尋 .md 檔案
      await this.searchMarkdownFiles(categoryPath, category, docsMap);
    }

    return docsMap;
  }

  /**
   * 遞迴搜尋 Markdown 檔案
   */
  private async searchMarkdownFiles(
    dir: string,
    category: string,
    docsMap: Map<string, string>
  ): Promise<void> {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          await this.searchMarkdownFiles(fullPath, category, docsMap);
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          // 從檔案路徑提取節點名稱
          const nodeName = this.extractNodeName(fullPath, category);
          docsMap.set(nodeName, fullPath);
        }
      }
    } catch (error) {
      // 忽略無法讀取的目錄
    }
  }

  /**
   * 從檔案路徑提取節點名稱
   */
  private extractNodeName(filePath: string, _category: string): string {
    const fileName = path.basename(filePath, '.md');

    // 移除路徑分隔符並規範化名稱
    return fileName.replace(/[/\\]/g, '-').toLowerCase();
  }

  /**
   * 從 Markdown 檔案提取摘要
   */
  private async extractSummary(filePath: string): Promise<string> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');

      // 移除 frontmatter（如果存在）
      let cleanContent = content.replace(/^---\n[\s\S]*?\n---\n/, '');

      // 移除標題和其他 Markdown 語法
      cleanContent = cleanContent
        .replace(/^#+ .+$/gm, '') // 移除標題
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // 移除連結，保留文字
        .replace(/`([^`]+)`/g, '$1') // 移除行內程式碼標記
        .replace(/```[\s\S]*?```/g, '') // 移除程式碼區塊
        .trim();

      // 取得前 N 個字元
      const summary = cleanContent.substring(0, this.config.summaryLength);

      // 在最後一個句點處截斷，避免句子被切斷
      const lastPeriod = summary.lastIndexOf('.');
      if (lastPeriod > this.config.summaryLength * 0.8) {
        return summary.substring(0, lastPeriod + 1).trim();
      }

      return summary.trim() + '...';
    } catch (error) {
      throw new Error(`無法讀取檔案 ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 生成文件 URL
   */
  private generateDocsUrl(filePath: string): string {
    // 從本地路徑轉換為線上文件 URL
    const relativePath = filePath
      .split('n8n-docs')[1]
      .replace(/\\/g, '/')
      .replace('.md', '/');

    return `https://docs.n8n.io${relativePath}`;
  }

  /**
   * 收集節點文件摘要
   * @returns 節點名稱到文件摘要的映射
   */
  public async collectDocsSummaries(): Promise<Map<string, NodeDocSummary>> {
    // 確保儲存庫已初始化
    await this.ensureRepository();

    // 搜尋節點文件
    const docsMap = await this.findNodeDocs();

    // 提取摘要
    const summaries = new Map<string, NodeDocSummary>();

    for (const [nodeName, filePath] of docsMap) {
      try {
        const summary = await this.extractSummary(filePath);
        const url = this.generateDocsUrl(filePath);

        // 從路徑判斷分類
        let category = 'core-nodes';
        for (const cat of this.config.categories) {
          if (filePath.includes(cat)) {
            category = cat;
            break;
          }
        }

        summaries.set(nodeName, {
          nodeName,
          summary,
          url,
          category,
          copyright: '© n8n GmbH. Licensed under Fair Code License. Source: https://github.com/n8n-io/n8n-docs',
        });
      } catch (error) {
        // 記錄錯誤但繼續處理其他文件
        console.error(`無法處理節點 ${nodeName}:`, error);
      }
    }

    return summaries;
  }

  /**
   * 搜尋特定節點的文件摘要
   * @param nodeName 節點名稱
   * @returns 節點文件摘要，如果找不到則返回 null
   */
  public async getNodeDocSummary(nodeName: string): Promise<NodeDocSummary | null> {
    const summaries = await this.collectDocsSummaries();
    return summaries.get(nodeName.toLowerCase()) || null;
  }

  /**
   * 清理快取的儲存庫
   */
  public async clearCache(): Promise<void> {
    try {
      const exists = await this.pathExists(this.config.localPath);
      if (exists) {
        await fs.rm(this.config.localPath, { recursive: true, force: true });
      }
    } catch (error) {
      throw new Error(`無法清理快取: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

/**
 * 建立文件收集器實例
 */
export function createDocsCollector(config?: DocsCollectorConfig): DocsCollector {
  return new DocsCollector(config);
}
