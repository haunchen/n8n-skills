/**
 * Copyright (c) 2025 Frank Chen @ www.frankchen.tw/personal
 * SPDX-License-Identifier: MIT
 *
 * This file is part of n8n-skills project.
 */

import axios, { AxiosInstance, AxiosError } from 'axios';

// API 回應型別定義
interface TemplateNode {
  id: number;
  name: string;
  icon?: string;
  displayName?: string;
  codex?: {
    data?: {
      categories?: string[];
      subcategories?: Record<string, string[]>;
    };
  };
}

interface TemplateUser {
  id: number;
  name: string;
  username: string;
  verified: boolean;
}

interface Template {
  id: number;
  name: string;
  description: string;
  totalViews: number;
  createdAt: string;
  user: TemplateUser;
  nodes: TemplateNode[];
}

interface TemplateApiResponse {
  workflows: Template[];
  totalWorkflows: number;
}

// 節點使用統計型別
export interface NodeUsageStats {
  [nodeType: string]: {
    count: number;
    percentage: number;
  };
}

// 收集結果型別
export interface TemplateCollectionResult {
  templates: Template[];
  nodeUsageStats: NodeUsageStats;
  totalTemplates: number;
  collectedAt: string;
}

// 配置選項
export interface ApiCollectorConfig {
  baseUrl?: string;
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
  limit?: number;
}

// API 收集器類別
export class ApiCollector {
  private client: AxiosInstance;
  private maxRetries: number;
  private retryDelay: number;
  private limit: number;

  constructor(config: ApiCollectorConfig = {}) {
    const {
      baseUrl = 'https://api.n8n.io/api',
      maxRetries = 3,
      retryDelay = 1000,
      timeout = 30000,
      limit = 100,
    } = config;

    this.maxRetries = maxRetries;
    this.retryDelay = retryDelay;
    this.limit = limit;

    // 建立 axios 實例
    this.client = axios.create({
      baseURL: baseUrl,
      timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'n8n-skills/1.0.0',
      },
    });

    // 設定回應攔截器處理錯誤
    this.client.interceptors.response.use(
      (response) => response,
      (error) => this.handleAxiosError(error)
    );
  }

  // 處理 Axios 錯誤
  private handleAxiosError(error: AxiosError): Promise<never> {
    if (error.response) {
      // 伺服器回應錯誤狀態碼
      throw new Error(
        `API 回應錯誤: ${error.response.status} - ${error.response.statusText}`
      );
    } else if (error.request) {
      // 請求已發送但沒有收到回應
      throw new Error('API 請求無回應，請檢查網路連線');
    } else {
      // 設定請求時發生錯誤
      throw new Error(`API 請求設定錯誤: ${error.message}`);
    }
  }

  // 重試機制包裝函數
  private async withRetry<T>(
    fn: () => Promise<T>,
    retries: number = this.maxRetries
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (retries > 0) {
        console.log(`請求失敗，${this.retryDelay}ms 後重試... (剩餘重試次數: ${retries})`);
        await this.delay(this.retryDelay);
        return this.withRetry(fn, retries - 1);
      }
      throw error;
    }
  }

  // 延遲函數
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // 從 n8n.io API 抓取範本
  public async fetchTemplates(): Promise<TemplateCollectionResult> {
    try {
      console.log(`開始從 n8n.io API 抓取前 ${this.limit} 個熱門範本...`);

      const response = await this.withRetry(async () => {
        const result = await this.client.get<TemplateApiResponse>('/templates/search', {
          params: {
            page: 1,
            rows: this.limit,
          },
        });
        return result;
      });

      const templates = response.data.workflows || [];
      console.log(`成功抓取 ${templates.length} 個範本`);

      // 計算節點使用統計
      const nodeUsageStats = this.calculateNodeUsage(templates);

      return {
        templates,
        nodeUsageStats,
        totalTemplates: response.data.totalWorkflows || templates.length,
        collectedAt: new Date().toISOString(),
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`抓取範本失敗: ${error.message}`);
      }
      throw new Error('抓取範本時發生未知錯誤');
    }
  }

  // 計算節點使用頻率統計
  private calculateNodeUsage(templates: Template[]): NodeUsageStats {
    const nodeCount: Record<string, number> = {};
    let totalNodes = 0;

    // 統計每個節點類型的使用次數
    templates.forEach((template) => {
      if (template.nodes && Array.isArray(template.nodes)) {
        template.nodes.forEach((node) => {
          const nodeType = node.name || node.displayName || 'unknown';
          nodeCount[nodeType] = (nodeCount[nodeType] || 0) + 1;
          totalNodes++;
        });
      }
    });

    // 計算百分比並排序
    const stats: NodeUsageStats = {};
    Object.entries(nodeCount)
      .sort(([, a], [, b]) => b - a)
      .forEach(([nodeType, count]) => {
        stats[nodeType] = {
          count,
          percentage: totalNodes > 0 ? (count / totalNodes) * 100 : 0,
        };
      });

    return stats;
  }

  // 取得特定範本詳細資訊
  public async fetchTemplateById(templateId: number): Promise<Template> {
    try {
      console.log(`抓取範本 ID: ${templateId}...`);

      const response = await this.withRetry(async () => {
        return await this.client.get<Template>(`/templates/${templateId}`);
      });

      console.log(`成功抓取範本: ${response.data.name}`);
      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`抓取範本 ID ${templateId} 失敗: ${error.message}`);
      }
      throw new Error(`抓取範本 ID ${templateId} 時發生未知錯誤`);
    }
  }

  // 依分類抓取範本
  public async fetchTemplatesByCategory(
    category: string,
    limit: number = 50
  ): Promise<Template[]> {
    try {
      console.log(`抓取分類「${category}」的範本 (限制: ${limit})...`);

      const response = await this.withRetry(async () => {
        return await this.client.get<TemplateApiResponse>('/templates/search', {
          params: {
            page: 1,
            rows: limit,
            category,
          },
        });
      });

      const templates = response.data.workflows || [];
      console.log(`成功抓取 ${templates.length} 個範本`);
      return templates;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`抓取分類「${category}」範本失敗: ${error.message}`);
      }
      throw new Error(`抓取分類「${category}」範本時發生未知錯誤`);
    }
  }

  // 搜尋範本
  public async searchTemplates(query: string, limit: number = 50): Promise<Template[]> {
    try {
      console.log(`搜尋範本: "${query}" (限制: ${limit})...`);

      const response = await this.withRetry(async () => {
        return await this.client.get<TemplateApiResponse>('/templates/search', {
          params: {
            page: 1,
            rows: limit,
            search: query,
          },
        });
      });

      const templates = response.data.workflows || [];
      console.log(`搜尋到 ${templates.length} 個範本`);
      return templates;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`搜尋範本「${query}」失敗: ${error.message}`);
      }
      throw new Error(`搜尋範本「${query}」時發生未知錯誤`);
    }
  }

  // 顯示節點使用統計摘要
  public printNodeUsageStats(stats: NodeUsageStats, topN: number = 20): void {
    console.log('\n節點使用頻率統計（前 ' + topN + ' 名）:');
    console.log('='.repeat(60));
    console.log(
      `${'節點類型'.padEnd(40)} ${'次數'.padStart(8)} ${'百分比'.padStart(10)}`
    );
    console.log('-'.repeat(60));

    Object.entries(stats)
      .slice(0, topN)
      .forEach(([nodeType, { count, percentage }]) => {
        console.log(
          `${nodeType.padEnd(40)} ${count.toString().padStart(8)} ${percentage.toFixed(2).padStart(9)}%`
        );
      });
    console.log('='.repeat(60));
  }
}

// 便利函數：快速抓取熱門範本
export async function fetchPopularTemplates(
  limit: number = 100,
  config?: Omit<ApiCollectorConfig, 'limit'>
): Promise<TemplateCollectionResult> {
  const collector = new ApiCollector({ ...config, limit });
  return await collector.fetchTemplates();
}

// 便利函數：取得節點使用統計
export async function getNodeUsageStats(
  limit: number = 100
): Promise<NodeUsageStats> {
  const result = await fetchPopularTemplates(limit);
  return result.nodeUsageStats;
}
