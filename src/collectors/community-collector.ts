/**
 * Copyright (c) 2025 Frank Chen @ www.frankchen.tw/personal
 * SPDX-License-Identifier: MIT
 *
 * This file is part of n8n-skills project.
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { PropertyParser, ParsedProperties } from '../parsers/property-parser';
import { InputOutputParser, NodeInputOutputInfo } from '../parsers/input-output-parser';

// Community package information
export interface CommunityPackage {
  name: string;
  description: string;
  category: CommunityCategory;
  npmUrl: string;
  version?: string;
  maintainer?: string;
  repository?: string;
}

// Community package categories
export type CommunityCategory =
  | 'communication'
  | 'ai-tools'
  | 'web-scraping'
  | 'document'
  | 'data-processing'
  | 'utilities';

// npm search result structure
interface NpmSearchResult {
  objects: Array<{
    package: {
      name: string;
      version: string;
      description: string;
      links: {
        npm: string;
        repository?: string;
      };
      publisher?: {
        username: string;
      };
      maintainers?: Array<{
        username: string;
      }>;
    };
    score: {
      final: number;
      detail: {
        quality: number;
        popularity: number;
        maintenance: number;
      };
    };
  }>;
  total: number;
}

// Collection result
export interface CommunityCollectionResult {
  version: string;
  lastUpdated: string;
  limit: number;
  packages: CommunityPackage[];
}

// Community node details (parsed from node class)
export interface CommunityNodeInfo {
  nodeType: string;
  displayName: string;
  description: string;
  version: string;
  properties: ParsedProperties;
  ioInfo: NodeInputOutputInfo;
}

// Community node details result (per package)
export interface CommunityNodeDetails {
  packageName: string;
  packageVersion: string;
  nodes: CommunityNodeInfo[];
  loadError?: string;
}

// Community nodes cache structure
export interface CommunityNodesCache {
  lastUpdated: string;
  nodes: Record<string, CommunityNodeDetails>;
}

// Configuration options
export interface CommunityCollectorConfig {
  limit?: number;
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
}

// Category keywords for auto-classification
const CATEGORY_KEYWORDS: Record<CommunityCategory, string[]> = {
  communication: [
    'whatsapp',
    'telegram',
    'chat',
    'message',
    'sms',
    'email',
    'slack',
    'discord',
    'chatwoot',
    'evolution',
    'waha',
    'zapi',
    'notifica',
  ],
  'ai-tools': [
    'ai',
    'llm',
    'gpt',
    'openai',
    'elevenlabs',
    'voice',
    'speech',
    'mcp',
    'langchain',
    'embedding',
    'vector',
    'deepseek',
    'perplexity',
  ],
  'web-scraping': [
    'scrape',
    'crawl',
    'browser',
    'puppeteer',
    'playwright',
    'selenium',
    'firecrawl',
    'serp',
    'search',
    'webpage',
    'extract',
  ],
  document: [
    'pdf',
    'doc',
    'excel',
    'word',
    'document',
    'file',
    'image',
    'convert',
    'ocr',
    'tesseract',
  ],
  'data-processing': [
    'data',
    'json',
    'xml',
    'csv',
    'yaml',
    'transform',
    'parse',
    'validate',
    'text',
    'manipulation',
  ],
  utilities: [
    'util',
    'tool',
    'helper',
    'debug',
    'test',
    'qrcode',
    'cron',
    'schedule',
    'global',
    'store',
  ],
};

export class CommunityCollector {
  private npmClient: AxiosInstance;
  private maxRetries: number;
  private retryDelay: number;
  private limit: number;

  constructor(config: CommunityCollectorConfig = {}) {
    const {
      limit = 30,
      maxRetries = 3,
      retryDelay = 1000,
      timeout = 30000,
    } = config;

    this.limit = limit;
    this.maxRetries = maxRetries;
    this.retryDelay = retryDelay;

    // npm registry client
    this.npmClient = axios.create({
      baseURL: 'https://registry.npmjs.org',
      timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'n8n-skills/1.0.0',
      },
    });

    // Set up error handler
    this.npmClient.interceptors.response.use(
      (response) => response,
      (error) => this.handleAxiosError(error)
    );
  }

  private handleAxiosError(error: AxiosError): Promise<never> {
    if (error.response) {
      throw new Error(
        `API response error: ${error.response.status} - ${error.response.statusText}`
      );
    } else if (error.request) {
      throw new Error('No API response received, please check network connection');
    } else {
      throw new Error(`API request configuration error: ${error.message}`);
    }
  }

  private async withRetry<T>(
    fn: () => Promise<T>,
    retries: number = this.maxRetries
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (retries > 0) {
        console.log(
          `Request failed, retrying after ${this.retryDelay}ms... (retries remaining: ${retries})`
        );
        await this.delay(this.retryDelay);
        return this.withRetry(fn, retries - 1);
      }
      throw error;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Search for n8n community packages on npm (sorted by popularity)
   */
  public async searchPackages(): Promise<NpmSearchResult> {
    console.log(`Searching for top ${this.limit} n8n community packages on npm...`);

    const response = await this.withRetry(async () => {
      return await this.npmClient.get<NpmSearchResult>('/-/v1/search', {
        params: {
          text: 'keywords:n8n-community-node-package',
          size: this.limit,
          popularity: 1.0,
          quality: 0.0,
          maintenance: 0.0,
        },
      });
    });

    console.log(`Found ${response.data.total} community packages, returning top ${this.limit}`);
    return response.data;
  }

  /**
   * Auto-classify package based on name and description
   */
  private classifyPackage(name: string, description: string): CommunityCategory {
    const text = `${name} ${description}`.toLowerCase();

    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      for (const keyword of keywords) {
        if (text.includes(keyword)) {
          return category as CommunityCategory;
        }
      }
    }

    return 'utilities';
  }

  /**
   * Fetch popular community packages (sorted by npm popularity)
   */
  public async fetchPopularPackages(): Promise<CommunityCollectionResult> {
    console.log(`Fetching top ${this.limit} popular n8n community packages...`);

    // Search for packages (already sorted by popularity)
    const searchResult = await this.searchPackages();

    // Convert to CommunityPackage format
    const packages: CommunityPackage[] = searchResult.objects.map((obj) => {
      const pkg = obj.package;
      return {
        name: pkg.name,
        description: pkg.description || '',
        category: this.classifyPackage(pkg.name, pkg.description || ''),
        npmUrl: pkg.links.npm,
        version: pkg.version,
        maintainer: pkg.publisher?.username || pkg.maintainers?.[0]?.username,
        repository: pkg.links.repository,
      };
    });

    console.log(`\nTop ${packages.length} packages by popularity:`);
    packages.forEach((pkg, index) => {
      console.log(`  ${index + 1}. ${pkg.name} (${pkg.category})`);
    });

    return {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      limit: this.limit,
      packages,
    };
  }

  /**
   * Save collection result to config file
   */
  public async saveToConfig(
    result: CommunityCollectionResult,
    configPath?: string
  ): Promise<void> {
    const defaultPath = path.join(
      __dirname,
      '../../config/community-packages.json'
    );
    const finalPath = configPath || defaultPath;

    await fs.promises.writeFile(finalPath, JSON.stringify(result, null, 2), 'utf-8');
    console.log(`\nSaved community packages to: ${finalPath}`);
  }

  /**
   * Load existing config file
   */
  public async loadFromConfig(configPath?: string): Promise<CommunityCollectionResult | null> {
    const defaultPath = path.join(
      __dirname,
      '../../config/community-packages.json'
    );
    const finalPath = configPath || defaultPath;

    try {
      const content = await fs.promises.readFile(finalPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  /**
   * Compare two results and check if there are changes
   */
  public hasChanges(
    oldResult: CommunityCollectionResult | null,
    newResult: CommunityCollectionResult
  ): boolean {
    if (!oldResult) return true;

    // Compare package lists
    const oldNames = new Set(oldResult.packages.map((p) => p.name));
    const newNames = new Set(newResult.packages.map((p) => p.name));

    // Check for new or removed packages
    for (const name of newNames) {
      if (!oldNames.has(name)) return true;
    }
    for (const name of oldNames) {
      if (!newNames.has(name)) return true;
    }

    return false;
  }

  /**
   * Print statistics summary
   */
  public printStats(result: CommunityCollectionResult): void {
    const categoryCount: Record<string, number> = {};

    for (const pkg of result.packages) {
      categoryCount[pkg.category] = (categoryCount[pkg.category] || 0) + 1;
    }

    console.log('\n===== Community Packages Statistics =====');
    console.log(`Total packages: ${result.packages.length}`);
    console.log(`Last updated: ${result.lastUpdated}`);
    console.log('\nBy category:');
    for (const [category, count] of Object.entries(categoryCount).sort(
      (a, b) => b[1] - a[1]
    )) {
      console.log(`  ${category}: ${count}`);
    }
    console.log('=========================================\n');
  }

  // ============================================================
  // Node loading and parsing methods (for detailed documentation)
  // ============================================================

  /**
   * Install a community package using npm
   */
  public async installPackage(packageName: string): Promise<boolean> {
    try {
      console.log(`  Installing ${packageName}...`);
      execSync(`npm install ${packageName} --no-save --legacy-peer-deps`, {
        stdio: 'pipe',
        timeout: 120000, // 2 minutes timeout
      });
      return true;
    } catch (error) {
      console.warn(`  Failed to install ${packageName}: ${(error as Error).message}`);
      return false;
    }
  }

  /**
   * Uninstall a community package using npm
   */
  public async uninstallPackage(packageName: string): Promise<void> {
    try {
      execSync(`npm uninstall ${packageName} --no-save`, {
        stdio: 'pipe',
        timeout: 60000, // 1 minute timeout
      });
    } catch (error) {
      // Ignore uninstall errors
      console.warn(`  Warning: Failed to uninstall ${packageName}`);
    }
  }

  /**
   * Clear require cache for a package
   */
  private clearRequireCache(packageName: string): void {
    const cacheKeys = Object.keys(require.cache).filter(
      (key) => key.includes(packageName) || key.includes(packageName.replace('@', '').replace('/', '-'))
    );
    for (const key of cacheKeys) {
      delete require.cache[key];
    }
  }

  /**
   * Load and parse a community package's nodes
   */
  public async collectNodeDetails(packageName: string, packageVersion: string): Promise<CommunityNodeDetails> {
    const result: CommunityNodeDetails = {
      packageName,
      packageVersion,
      nodes: [],
    };

    try {
      // Try to load package.json to get node list
      const packageJsonPath = require.resolve(`${packageName}/package.json`);
      const packageJson = require(packageJsonPath);
      const n8nConfig = packageJson.n8n || {};
      const nodesList = n8nConfig.nodes || [];

      if (!Array.isArray(nodesList) || nodesList.length === 0) {
        result.loadError = 'No nodes found in package.json n8n.nodes';
        return result;
      }

      const propertyParser = new PropertyParser();
      const ioParser = new InputOutputParser();

      for (const nodePath of nodesList) {
        try {
          const nodeInfo = await this.loadSingleCommunityNode(
            packageName,
            nodePath,
            propertyParser,
            ioParser
          );
          if (nodeInfo) {
            result.nodes.push(nodeInfo);
          }
        } catch (nodeError) {
          console.warn(`    Failed to load node ${nodePath}: ${(nodeError as Error).message}`);
        }
      }

      if (result.nodes.length === 0) {
        result.loadError = 'All nodes failed to load';
      }
    } catch (error) {
      result.loadError = `Failed to load package: ${(error as Error).message}`;
    }

    return result;
  }

  /**
   * Load a single node from a community package
   */
  private async loadSingleCommunityNode(
    packageName: string,
    nodePath: string,
    propertyParser: PropertyParser,
    ioParser: InputOutputParser
  ): Promise<CommunityNodeInfo | null> {
    try {
      const fullPath = require.resolve(`${packageName}/${nodePath}`);
      const nodeModule = require(fullPath);

      // Extract node name from path
      const nodeNameMatch = nodePath.match(/\/([^\/]+)\.node\.(js|ts)$/);
      const nodeName = nodeNameMatch ? nodeNameMatch[1] : path.basename(nodePath, '.node.js');

      // Handle different export modes
      const NodeClass = nodeModule.default || nodeModule[nodeName] || Object.values(nodeModule)[0];

      if (!NodeClass) {
        return null;
      }

      // Get node description
      const description = this.getNodeDescription(NodeClass);
      if (!description || !description.name) {
        return null;
      }

      // Parse properties
      let properties: ParsedProperties;
      try {
        properties = propertyParser.parse(NodeClass);
      } catch {
        properties = {
          coreProperties: [],
          operations: [],
          hasCredentials: false,
          totalPropertyCount: 0,
        };
      }

      // Parse IO info
      let ioInfo: NodeInputOutputInfo;
      try {
        ioInfo = ioParser.parseNodeInputOutput(NodeClass);
      } catch {
        ioInfo = {
          nodeType: '',
          version: '1',
          inputs: ['main'],
          outputs: ['main'],
          inputTypes: ['main'],
          outputTypes: ['main'],
          isMultiInput: false,
          isMultiOutput: false,
          requiresSpecialInputs: false,
          hasErrorOutput: false,
          outputCount: 1,
          outputNames: [],
          isDynamicOutput: false,
        };
      }

      // Build node type
      const nodeType = description.name.includes('.')
        ? description.name
        : `${packageName}.${description.name}`;

      return {
        nodeType,
        displayName: description.displayName || nodeName,
        description: description.description || '',
        version: this.extractNodeVersion(description),
        properties,
        ioInfo,
      };
    } catch (error) {
      console.warn(`    Error loading node: ${(error as Error).message}`);
      return null;
    }
  }

  /**
   * Get node description from class
   */
  private getNodeDescription(nodeClass: any): any {
    try {
      // Try static property first
      if (nodeClass.description) {
        return nodeClass.description;
      }

      // Try instantiation
      const instance = typeof nodeClass === 'function' ? new nodeClass() : nodeClass;

      // Handle versioned nodes
      if (instance?.nodeVersions) {
        const versions = Object.keys(instance.nodeVersions).map(Number);
        if (versions.length > 0) {
          const latestVersion = Math.max(...versions);
          return instance.nodeVersions[latestVersion]?.description || instance.description;
        }
      }

      return instance?.description || null;
    } catch {
      return null;
    }
  }

  /**
   * Extract node version from description
   */
  private extractNodeVersion(description: any): string {
    if (description?.version) {
      if (Array.isArray(description.version)) {
        return Math.max(...description.version.map((v: any) => parseFloat(v))).toString();
      }
      return description.version.toString();
    }
    if (description?.defaultVersion) {
      return description.defaultVersion.toString();
    }
    return '1';
  }

  /**
   * Process a single package: install → parse → uninstall
   * Returns the node details for caching
   */
  public async processPackageForDetails(pkg: CommunityPackage): Promise<CommunityNodeDetails> {
    console.log(`\n  Processing: ${pkg.name} (v${pkg.version})`);

    // Step 1: Install
    const installed = await this.installPackage(pkg.name);
    if (!installed) {
      return {
        packageName: pkg.name,
        packageVersion: pkg.version || 'unknown',
        nodes: [],
        loadError: 'Installation failed',
      };
    }

    // Step 2: Parse
    const details = await this.collectNodeDetails(pkg.name, pkg.version || 'unknown');
    console.log(`    Found ${details.nodes.length} node(s)`);

    // Step 3: Clear require cache
    this.clearRequireCache(pkg.name);

    // Step 4: Uninstall
    await this.uninstallPackage(pkg.name);

    return details;
  }

  /**
   * Load community nodes cache
   */
  public async loadNodesCache(cachePath?: string): Promise<CommunityNodesCache | null> {
    const defaultPath = path.join(process.cwd(), 'data', 'cache', 'community-nodes.json');
    const finalPath = cachePath || defaultPath;

    try {
      const content = await fs.promises.readFile(finalPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  /**
   * Save community nodes cache
   */
  public async saveNodesCache(cache: CommunityNodesCache, cachePath?: string): Promise<void> {
    const defaultPath = path.join(process.cwd(), 'data', 'cache', 'community-nodes.json');
    const finalPath = cachePath || defaultPath;

    // Ensure directory exists
    const dir = path.dirname(finalPath);
    await fs.promises.mkdir(dir, { recursive: true });

    await fs.promises.writeFile(finalPath, JSON.stringify(cache, null, 2), 'utf-8');
    console.log(`\nSaved community nodes cache to: ${finalPath}`);
  }
}

// Convenience function
export async function fetchCommunityPackages(
  limit: number = 30,
  config?: Omit<CommunityCollectorConfig, 'limit'>
): Promise<CommunityCollectionResult> {
  const collector = new CommunityCollector({ ...config, limit });
  return await collector.fetchPopularPackages();
}
