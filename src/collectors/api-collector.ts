/**
 * Copyright (c) 2025 Frank Chen @ www.frankchen.tw/personal
 * SPDX-License-Identifier: MIT
 *
 * This file is part of n8n-skills project.
 */

import axios, { AxiosInstance, AxiosError } from 'axios';

// API response type definitions
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

// Complete Workflow node definition
export interface WorkflowNode {
  id: string;
  name: string;
  type: string;
  typeVersion: number;
  position: [number, number];
  parameters: Record<string, any>;
  credentials?: Record<string, any>;
  disabled?: boolean;
  notes?: string;
  notesInFlow?: boolean;
}

// Workflow connection definition
export interface WorkflowConnection {
  node: string;
  type: string;
  index: number;
}

export interface WorkflowConnections {
  [sourceNode: string]: {
    [outputType: string]: WorkflowConnection[][];
  };
}

// Complete Workflow definition
export interface WorkflowDefinition {
  nodes: WorkflowNode[];
  connections: WorkflowConnections;
  settings?: Record<string, any>;
  staticData?: Record<string, any>;
  tags?: Array<{ id: number; name: string }>;
  pinData?: Record<string, any>;
  versionId?: string;
  meta?: {
    templateId?: string;
    instanceId?: string;
  };
  // These properties may be in meta or not exist
  id?: number;
  name?: string;
  description?: string;
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

// Node usage statistics type
export interface NodeUsageStats {
  [nodeType: string]: {
    count: number;
    percentage: number;
  };
}

// Collection result type
export interface TemplateCollectionResult {
  templates: Template[];
  nodeUsageStats: NodeUsageStats;
  totalTemplates: number;
  collectedAt: string;
}

// Configuration options
export interface ApiCollectorConfig {
  baseUrl?: string;
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
  limit?: number;
}

// API collector class
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

    // Create axios instance
    this.client = axios.create({
      baseURL: baseUrl,
      timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'n8n-skills/1.0.0',
      },
    });

    // Set up response interceptor to handle errors
    this.client.interceptors.response.use(
      (response) => response,
      (error) => this.handleAxiosError(error)
    );
  }

  // Handle Axios errors
  private handleAxiosError(error: AxiosError): Promise<never> {
    if (error.response) {
      // Server responded with error status code
      throw new Error(
        `API response error: ${error.response.status} - ${error.response.statusText}`
      );
    } else if (error.request) {
      // Request was sent but no response received
      throw new Error('No API response received, please check network connection');
    } else {
      // Error occurred while setting up the request
      throw new Error(`API request configuration error: ${error.message}`);
    }
  }

  // Retry mechanism wrapper function
  private async withRetry<T>(
    fn: () => Promise<T>,
    retries: number = this.maxRetries
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (retries > 0) {
        console.log(`Request failed, retrying after ${this.retryDelay}ms... (retries remaining: ${retries})`);
        await this.delay(this.retryDelay);
        return this.withRetry(fn, retries - 1);
      }
      throw error;
    }
  }

  // Delay function
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Fetch templates from n8n.io API
  public async fetchTemplates(): Promise<TemplateCollectionResult> {
    try {
      console.log(`Starting to fetch top ${this.limit} popular templates from n8n.io API...`);

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
      console.log(`Successfully fetched ${templates.length} templates`);

      // Calculate node usage statistics
      const nodeUsageStats = this.calculateNodeUsage(templates);

      return {
        templates,
        nodeUsageStats,
        totalTemplates: response.data.totalWorkflows || templates.length,
        collectedAt: new Date().toISOString(),
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to fetch templates: ${error.message}`);
      }
      throw new Error('Unknown error occurred while fetching templates');
    }
  }

  // Calculate node usage frequency statistics
  private calculateNodeUsage(templates: Template[]): NodeUsageStats {
    const nodeCount: Record<string, number> = {};
    let totalNodes = 0;

    // Count usage of each node type
    templates.forEach((template) => {
      if (template.nodes && Array.isArray(template.nodes)) {
        template.nodes.forEach((node) => {
          const nodeType = node.name || node.displayName || 'unknown';
          nodeCount[nodeType] = (nodeCount[nodeType] || 0) + 1;
          totalNodes++;
        });
      }
    });

    // Calculate percentages and sort
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

  // Get specific template details
  public async fetchTemplateById(templateId: number): Promise<Template> {
    try {
      console.log(`Fetching template ID: ${templateId}...`);

      const response = await this.withRetry(async () => {
        return await this.client.get<Template>(`/templates/${templateId}`);
      });

      console.log(`Successfully fetched template: ${response.data.name}`);
      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to fetch template ID ${templateId}: ${error.message}`);
      }
      throw new Error(`Unknown error occurred while fetching template ID ${templateId}`);
    }
  }

  // Fetch templates by category
  public async fetchTemplatesByCategory(
    category: string,
    limit: number = 50
  ): Promise<Template[]> {
    try {
      console.log(`Fetching templates for category "${category}" (limit: ${limit})...`);

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
      console.log(`Successfully fetched ${templates.length} templates`);
      return templates;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to fetch templates for category "${category}": ${error.message}`);
      }
      throw new Error(`Unknown error occurred while fetching templates for category "${category}"`);
    }
  }

  // Search templates
  public async searchTemplates(query: string, limit: number = 50): Promise<Template[]> {
    try {
      console.log(`Searching templates: "${query}" (limit: ${limit})...`);

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
      console.log(`Found ${templates.length} templates`);
      return templates;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to search templates "${query}": ${error.message}`);
      }
      throw new Error(`Unknown error occurred while searching templates "${query}"`);
    }
  }

  // Get complete workflow definition
  public async fetchWorkflowDefinition(templateId: number): Promise<WorkflowDefinition & { id: number; name: string }> {
    try {
      console.log(`Fetching complete workflow definition: ${templateId}...`);

      const response = await this.withRetry(async () => {
        return await this.client.get<{ id: number; name: string; workflow: WorkflowDefinition }>(
          `/workflows/templates/${templateId}`
        );
      });

      if (!response.data || !response.data.workflow) {
        throw new Error('API response is empty or incorrectly formatted');
      }

      const { id, name, workflow } = response.data;

      if (!workflow.nodes || !Array.isArray(workflow.nodes)) {
        throw new Error('Invalid workflow structure: missing nodes array');
      }

      console.log(`Successfully fetched workflow: ${name} (${workflow.nodes.length} nodes)`);

      // Merge id and name into workflow
      return {
        ...workflow,
        id,
        name,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to fetch workflow ${templateId}: ${error.message}`);
      }
      throw new Error(`Unknown error occurred while fetching workflow ${templateId}`);
    }
  }

  // Batch fetch multiple workflow definitions (with delay)
  public async fetchWorkflowDefinitions(
    templateIds: number[],
    delayMs: number = 500
  ): Promise<Array<WorkflowDefinition & { id: number; name: string }>> {
    const workflows: Array<WorkflowDefinition & { id: number; name: string }> = [];

    console.log(`Starting batch fetch of ${templateIds.length} workflow definitions...`);
    console.log(`Interval between requests: ${delayMs}ms`);

    for (let i = 0; i < templateIds.length; i++) {
      const templateId = templateIds[i];
      try {
        const workflow = await this.fetchWorkflowDefinition(templateId);
        workflows.push(workflow);

        // Add delay if not the last one
        if (i < templateIds.length - 1) {
          await this.delay(delayMs);
        }
      } catch (error) {
        console.error(`Skipping template ${templateId}:`, error);
        // Continue with next one
      }
    }

    console.log(`Successfully fetched ${workflows.length}/${templateIds.length} workflows`);
    return workflows;
  }

  // Display node usage statistics summary
  public printNodeUsageStats(stats: NodeUsageStats, topN: number = 20): void {
    console.log('\nNode Usage Frequency Statistics (Top ' + topN + '):');
    console.log('='.repeat(60));
    console.log(
      `${'Node Type'.padEnd(40)} ${'Count'.padStart(8)} ${'Percentage'.padStart(10)}`
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

// Convenience function: quickly fetch popular templates
export async function fetchPopularTemplates(
  limit: number = 100,
  config?: Omit<ApiCollectorConfig, 'limit'>
): Promise<TemplateCollectionResult> {
  const collector = new ApiCollector({ ...config, limit });
  return await collector.fetchTemplates();
}

// Convenience function: get node usage statistics
export async function getNodeUsageStats(
  limit: number = 100
): Promise<NodeUsageStats> {
  const result = await fetchPopularTemplates(limit);
  return result.nodeUsageStats;
}
