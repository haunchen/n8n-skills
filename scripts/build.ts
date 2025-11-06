/**
 * Main Build Orchestration Script
 * Coordinates the entire build process: collect, parse, organize, and generate
 */

import path from 'path';
import { promises as fs } from 'fs';
import * as logger from '../src/utils/logger';

// Import collectors
import { NpmCollector, ApiCollector } from '../src/collectors';
import type { SimplifiedNodeInfo } from '../src/collectors/npm-collector';
import type { NodeUsageStats } from '../src/collectors/api-collector';

// Import parsers
import { NodeParser, PropertyParser } from '../src/parsers';

// Import organizers
import { PriorityRanker } from '../src/organizers';
import type { ScoredNode } from '../src/organizers/priority-ranker';

// Import generators
import { SkillGenerator } from '../src/generators';
import type { EnrichedNodeInfo, SkillConfig, ResourceFile } from '../src/generators/skill-generator';
import { TemplateGenerator } from '../src/generators/template-generator';
import { ResourceGenerator } from '../src/generators/resource-generator';
import { ConnectionRuleGenerator } from '../src/generators/connection-rule-generator';

// Import analyzers
import { CompatibilityAnalyzer } from '../src/analyzers/compatibility-analyzer';
import { InputOutputParser } from '../src/parsers/input-output-parser';
import type { NodeConnectionInfo, CompatibilityMatrix } from '../src/models/connection';

// Import cache manager
import { TemplateCacheManager } from '../src/utils/template-cache-manager';

/**
 * Build configuration interface
 */
interface BuildConfig {
  version: string;
  n8n_version: string;
  max_nodes_in_main_skill: number;
  high_priority_node_count?: number;
  merge_remaining_nodes?: boolean;
  max_nodes_per_merged_file?: number;
  categories: Record<string, any>;
  output_format: string;
  include_examples: boolean;
  include_templates: boolean;
  max_template_examples: number;
  docs_summary_max_length: number;
  property_max_count: number;
}

/**
 * Build statistics
 */
interface BuildStats {
  totalNodes: number;
  topNodes: number;
  resourceNodes: number;
  templatesCollected: number;
  startTime: Date;
  endTime?: Date;
  duration?: number;
}

/**
 * Main build class
 */
class SkillBuilder {
  private config: BuildConfig;
  private stats: BuildStats;
  private projectRoot: string;

  constructor(configPath: string) {
    this.projectRoot = path.resolve(__dirname, '../..');
    this.config = this.loadConfig(configPath);
    this.stats = {
      totalNodes: 0,
      topNodes: 0,
      resourceNodes: 0,
      templatesCollected: 0,
      startTime: new Date(),
    };
  }

  /**
   * Load configuration file
   */
  private loadConfig(configPath: string): BuildConfig {
    try {
      const fullPath = path.resolve(this.projectRoot, configPath);
      const content = require(fullPath);
      logger.info(`Successfully loaded config: ${configPath}`);
      return content;
    } catch (error) {
      logger.error('Failed to load config file', error);
      throw error;
    }
  }

  /**
   * Ensure directory exists
   */
  private async ensureDirectory(dirPath: string): Promise<void> {
    const fullPath = path.resolve(this.projectRoot, dirPath);
    try {
      await fs.mkdir(fullPath, { recursive: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
        throw error;
      }
    }
  }

  /**
   * Save cache data
   */
  private async saveCache(filename: string, data: any): Promise<void> {
    await this.ensureDirectory('data/cache');
    const cachePath = path.resolve(this.projectRoot, 'data/cache', filename);
    await fs.writeFile(cachePath, JSON.stringify(data, null, 2), 'utf-8');
    logger.info(`Cache saved: ${filename}`);
  }

  /**
   * Load cache data
   */
  private async loadCache(filename: string): Promise<any | null> {
    const cachePath = path.resolve(this.projectRoot, 'data/cache', filename);
    try {
      const content = await fs.readFile(cachePath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  /**
   * Step 1: Collect node information
   */
  private async collectNodes(): Promise<SimplifiedNodeInfo[]> {
    logger.info('===== Step 1: Collecting node information =====');

    // Check cache
    const cached = await this.loadCache('nodes.json');
    if (cached) {
      logger.info(`Using cached node data (${cached.length} nodes)`);
      return cached;
    }

    logger.info('Collecting node information from NPM packages...');

    // Detect CI environment
    const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
    if (isCI) {
      logger.info('CI environment detected, enabling memory optimization mode');
    }

    try {
      const npmCollector = new NpmCollector();
      const nodes = await npmCollector.collectAll();

      this.stats.totalNodes = nodes.length;
      logger.success(`Successfully collected ${nodes.length} nodes`);

      await this.saveCache('nodes.json', nodes);

      // Trigger garbage collection in CI environment
      if (isCI && global.gc) {
        global.gc();
        logger.info('Executed memory garbage collection');
      }

      return nodes;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('Error occurred while collecting node information', error);

      // Try to recover from cache (even if cache might be old)
      const oldCache = await this.loadCache('nodes.json');
      if (oldCache && oldCache.length > 0) {
        logger.warn(`Recovering using old cache data (${oldCache.length} nodes)`);
        return oldCache;
      }

      throw new Error(`Failed to collect nodes and cannot recover: ${errorMsg}`);
    }
  }

  /**
   * Step 2: Collect usage statistics
   */
  private async collectUsageStats(): Promise<NodeUsageStats> {
    logger.info('===== Step 2: Collecting usage statistics =====');

    // Check cache
    const cached = await this.loadCache('usage-stats.json');
    if (cached) {
      logger.info('Using cached usage statistics data');
      return cached;
    }

    logger.info('Collecting templates and usage statistics from n8n.io API...');
    try {
      const apiCollector = new ApiCollector({
        limit: this.config.max_template_examples,
      });
      const result = await apiCollector.fetchTemplates();

      this.stats.templatesCollected = result.totalTemplates;
      logger.success(`Successfully collected ${result.totalTemplates} templates`);

      await this.saveCache('usage-stats.json', result.nodeUsageStats);
      await this.saveCache('templates.json', result.templates);

      return result.nodeUsageStats;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.warn(`Failed to collect usage statistics, using empty data: ${errorMsg}`);
      return {};
    }
  }


  /**
   * Step 3: Organize and rank nodes
   */
  private async organizeNodes(
    nodes: SimplifiedNodeInfo[],
    usageStats: NodeUsageStats,
    propertiesMap: Map<string, any>
  ): Promise<{ topNodes: EnrichedNodeInfo[]; remainingNodes: EnrichedNodeInfo[] }> {
    logger.info('===== Step 3: Organizing and ranking nodes =====');

    // Create priority ranker
    const priorityConfigPath = path.resolve(this.projectRoot, 'config/priorities.json');
    const ranker = new PriorityRanker(priorityConfigPath);

    // Convert node data to scoring format
    const nodeDataList = nodes.map(node => ({
      nodeType: node.nodeType,
      displayName: node.displayName,
      description: node.description,
      category: node.category,
      usageCount: usageStats[node.nodeType]?.count || 0,
      hasDocumentation: false,
      packageName: node.packageName,
    }));

    logger.info('Calculating node priority scores...');
    const scoredNodes = ranker.rankNodes(nodeDataList);
    logger.progress(scoredNodes.length, nodes.length, 'scored');

    // Sort and get top N nodes
    const topCount = this.config.max_nodes_in_main_skill;
    const sortedNodes = scoredNodes.sort((a, b) => b.score - a.score);
    const topScoredNodes = sortedNodes.slice(0, topCount);
    const remainingScoredNodes = sortedNodes.slice(topCount);

    this.stats.topNodes = topScoredNodes.length;
    this.stats.resourceNodes = remainingScoredNodes.length;

    logger.success(`Selected ${topScoredNodes.length} primary nodes`);
    logger.info(`Remaining ${remainingScoredNodes.length} nodes will be generated as resource files`);

    // Convert to EnrichedNodeInfo
    const enrichNode = (scored: ScoredNode, original: SimplifiedNodeInfo): EnrichedNodeInfo => {
      const propData = propertiesMap.get(scored.nodeType);

      return {
        ...original,
        usageCount: scored.usageCount,
        usagePercentage: usageStats[scored.nodeType]?.percentage || 0,
        properties: propData?.properties,
        // Preserve priority score information (for tiered merge strategy)
        score: scored.score,
        rank: scored.rank,
        tier: scored.tier,
      };
    };

    const topNodes = topScoredNodes.map(scored => {
      const original = nodes.find(n => n.nodeType === scored.nodeType)!;
      return enrichNode(scored, original);
    });

    const remainingNodes = remainingScoredNodes.map(scored => {
      const original = nodes.find(n => n.nodeType === scored.nodeType)!;
      return enrichNode(scored, original);
    });

    return { topNodes, remainingNodes };
  }

  /**
   * Step 4: Generate main Skill document
   */
  private async generateMainSkill(
    topNodes: EnrichedNodeInfo[],
    usageStats: NodeUsageStats,
    resourceFiles: ResourceFile[]
  ): Promise<void> {
    logger.info('===== Step 5: Generating main Skill document =====');

    await this.ensureDirectory('output');

    const skillConfig: SkillConfig = {
      name: 'n8n-skills',
      version: this.config.version,
      description: 'n8n workflow automation knowledge base. Use this skill to find n8n node information, understand node functionality and usage, learn workflow patterns, and get node configuration examples. Covers triggers, data transformation, data input/output, AI integration, and more. Keywords: n8n, workflow, automation, node, trigger, webhook, http request, database, ai agent.',
      topNodesCount: this.config.max_nodes_in_main_skill,
    };

    const generator = new SkillGenerator(skillConfig);
    const content = generator.generate({
      nodes: topNodes,
      nodeUsageStats: usageStats,
      resourceFiles,
      config: skillConfig,
    });

    const outputPath = path.resolve(this.projectRoot, 'output/Skill.md');
    await fs.writeFile(outputPath, content, 'utf-8');

    const lineCount = content.split('\n').length;
    const charCount = content.length;
    logger.success(`Main Skill document generated: ${outputPath}`);
    logger.info(`File size: ${lineCount} lines, ${charCount} characters`);
  }

  /**
   * Step 3.5: Build compatibility matrix
   */
  private async buildCompatibilityMatrix(
    allNodes: EnrichedNodeInfo[]
  ): Promise<{ nodeConnectionInfoList: NodeConnectionInfo[]; compatibilityMatrix: CompatibilityMatrix }> {
    logger.info('===== Step 3.5: Building node compatibility matrix =====');

    // Check cache
    const cachedInfo = await this.loadCache('node-io-config.json');
    const cachedMatrix = await this.loadCache('compatibility-matrix.json');

    if (cachedInfo && cachedMatrix) {
      logger.info('Using cached compatibility data');
      return {
        nodeConnectionInfoList: cachedInfo,
        compatibilityMatrix: cachedMatrix
      };
    }

    logger.info('Collecting node I/O configurations...');

    // Reload nodes to extract I/O information
    const npmCollector = new NpmCollector();
    const loadedNodes = await npmCollector.collectAllWithDetails();
    const ioParser = new InputOutputParser();

    const nodeConnectionInfoList: NodeConnectionInfo[] = [];

    // Helper function to extract node description
    const getNodeDescription = (nodeClass: any) => {
      try {
        if (nodeClass.description) {
          return nodeClass.description;
        }
        const instance = typeof nodeClass === 'function' ? new nodeClass() : nodeClass;
        if (instance?.nodeVersions) {
          return instance.description || instance.baseDescription || {};
        }
        return instance?.description || {};
      } catch {
        return {};
      }
    };

    for (const enrichedNode of allNodes) {
      // Find corresponding loadedNode
      // enrichedNode.nodeType format: "nodes-base.actionNetwork"
      // loadedNode description.name format: "actionNetwork" (no prefix)
      const loadedNode = loadedNodes.find(ln => {
        // Extract name from node description
        const description = getNodeDescription(ln.NodeClass);
        const descName = description?.name || '';

        // Build full node type (with package prefix)
        const packagePrefix = ln.packageName.replace('@n8n/', '').replace('n8n-', '');
        const fullNodeType = descName ? `${packagePrefix}.${descName}` : '';

        // Match full node type
        return enrichedNode.nodeType === fullNodeType;
      });

      if (!loadedNode) {
        continue;
      }

      try {
        const ioInfo = ioParser.parseNodeInputOutput(loadedNode.NodeClass);

        nodeConnectionInfoList.push({
          nodeType: enrichedNode.nodeType,
          displayName: enrichedNode.displayName,
          inputTypes: ioInfo.inputTypes,
          outputTypes: ioInfo.outputTypes,
          isMultiInput: ioInfo.isMultiInput,
          isMultiOutput: ioInfo.isMultiOutput,
          requiresSpecialInputs: ioInfo.requiresSpecialInputs,
          category: enrichedNode.category || 'misc',
          outputCount: ioInfo.outputCount,
          outputNames: ioInfo.outputNames,
          isDynamicOutput: ioInfo.isDynamicOutput
        });
      } catch (error) {
        // Ignore nodes that cannot be parsed
      }
    }

    logger.success(`Successfully collected I/O configurations for ${nodeConnectionInfoList.length} nodes`);

    // Build compatibility matrix
    logger.info('Building compatibility matrix...');
    const analyzer = new CompatibilityAnalyzer();
    const compatibilityMatrix = analyzer.buildCompatibilityMatrix(nodeConnectionInfoList);

    logger.success('Compatibility matrix build completed');

    // Save cache
    await this.saveCache('node-io-config.json', nodeConnectionInfoList);
    await this.saveCache('compatibility-matrix.json', compatibilityMatrix);

    return { nodeConnectionInfoList, compatibilityMatrix };
  }

  /**
   * Step 4.5: Generate compatibility matrix document
   */
  private async generateCompatibilityMatrixFile(
    matrix: CompatibilityMatrix,
    nodeList: NodeConnectionInfo[]
  ): Promise<void> {
    logger.info('===== Step 4.5: Generating compatibility matrix document =====');

    const ruleGenerator = new ConnectionRuleGenerator();
    const matrixMd = ruleGenerator.generateCompatibilityMatrix(matrix, nodeList, 50);

    const outputPath = path.resolve(this.projectRoot, 'output/resources/compatibility-matrix.md');
    await fs.writeFile(outputPath, matrixMd, 'utf-8');

    logger.success(`Compatibility matrix generated: ${outputPath}`);
  }

  /**
   * Step 7: Generate template files
   */
  private async generateTemplates(): Promise<void> {
    logger.info('===== Step 7: Generating template files =====');

    // Check for templates cache
    const templates = await this.loadCache('templates.json');
    if (!templates || !Array.isArray(templates) || templates.length === 0) {
      logger.warn('No templates cache found, skipping template generation');
      return;
    }

    logger.info(`Found ${templates.length} templates`);

    // Select top 20 most popular templates (sorted by view count)
    const topTemplates = [...templates]
      .sort((a, b) => b.totalViews - a.totalViews)
      .slice(0, 20);

    logger.info(`Selecting top ${topTemplates.length} most popular templates to fetch complete workflows`);

    // Initialize cache manager
    const cacheManager = new TemplateCacheManager(
      path.resolve(this.projectRoot, 'data/cache')
    );

    // Check for forced update
    const forceUpdate = process.env.FORCE_TEMPLATE_UPDATE === 'true';
    if (forceUpdate) {
      logger.info('Detected FORCE_TEMPLATE_UPDATE=true, will force re-download all workflows');
    }

    let workflows: Array<any> = [];

    if (forceUpdate) {
      // Force update: download all workflows
      const apiCollector = new ApiCollector();
      const templateIds = topTemplates.map(t => t.id);

      logger.info('Starting to fetch complete workflows (0.5s interval between requests)...');
      workflows = await apiCollector.fetchWorkflowDefinitions(templateIds, 500);

      logger.info(`Successfully fetched ${workflows.length}/${topTemplates.length} workflows`);

      // Update cache
      await cacheManager.updateCache(topTemplates, workflows);
    } else {
      // Smart cache mode
      logger.info('\nAnalyzing template cache changes...');
      const analysis = await cacheManager.analyzeCacheChanges(topTemplates);

      if (analysis.needsUpdate) {
        logger.info(`✓ New: ${analysis.newTemplates.length}`);
        logger.info(`✓ Rank changed: ${analysis.rankChanged.length}`);
        logger.info(`✓ Unchanged: ${analysis.unchanged.length}`);
        logger.info(`✓ Removed: ${analysis.removed.length}`);

        const needsDownload = [...analysis.newTemplates, ...analysis.rankChanged];

        if (needsDownload.length > 0) {
          logger.info(`\nNeed to download ${needsDownload.length} workflows`);

          // Download workflows that need updates
          const apiCollector = new ApiCollector();
          logger.info('Starting to download new/changed workflows (0.5s interval between requests)...');
          const newWorkflows = await apiCollector.fetchWorkflowDefinitions(needsDownload, 500);

          logger.success(`Successfully downloaded ${newWorkflows.length} workflows`);

          // Read unchanged workflows from cache
          logger.info(`Reading ${analysis.unchanged.length} workflows from cache`);
          const cachedWorkflows = await cacheManager.getCachedWorkflows(analysis.unchanged);

          // Merge newly downloaded and cached workflows
          workflows = [
            ...newWorkflows,
            ...Array.from(cachedWorkflows.values())
          ];

          logger.success(`Total ${workflows.length} workflows prepared`);

          // Update cache
          logger.info('Updating cache...');
          await cacheManager.updateCache(topTemplates, newWorkflows);
          logger.success('Cache updated');
        } else {
          logger.info('All template rankings unchanged, reading from cache...');
          const cachedWorkflows = await cacheManager.getCachedWorkflows(
            topTemplates.map(t => t.id)
          );
          workflows = Array.from(cachedWorkflows.values());
          logger.success(`Read ${workflows.length} workflows from cache`);
        }
      } else {
        logger.info('All templates completely unchanged, reading from cache...');
        const cachedWorkflows = await cacheManager.getCachedWorkflows(
          topTemplates.map(t => t.id)
        );
        workflows = Array.from(cachedWorkflows.values());
        logger.success(`Read ${workflows.length} workflows from cache`);
      }
    }

    // Enhance templates (merge template and workflow)
    const generator = new TemplateGenerator({
      outputDir: path.resolve(this.projectRoot, 'output/resources/templates'),
      maxTemplatesPerCategory: 20,
    });

    const enhancedTemplates = topTemplates.map(template => {
      const workflow = workflows.find(w => w.id === template.id);
      if (workflow) {
        return generator.enhanceTemplate(template, workflow);
      }
      return template;
    });

    logger.info(`Enhanced ${enhancedTemplates.filter(t => 'workflow' in t).length} templates`);

    // Generate files
    await generator.generate(enhancedTemplates);
    logger.success('Template files generation completed');
  }


  /**
   * Display build statistics
   */
  private printStats(): void {
    this.stats.endTime = new Date();
    this.stats.duration = this.stats.endTime.getTime() - this.stats.startTime.getTime();

    console.log('\n');
    logger.success('===== Build completed =====');
    console.log(`Total nodes: ${this.stats.totalNodes}`);
    console.log(`Primary nodes: ${this.stats.topNodes}`);
    console.log(`Resource nodes: ${this.stats.resourceNodes}`);
    console.log(`Templates: ${this.stats.templatesCollected}`);
    console.log(`Build time: ${(this.stats.duration / 1000).toFixed(2)} seconds`);
    console.log('');
  }

  /**
   * Step 1.5: Collect detailed node properties
   */
  private async collectDetailedProperties(): Promise<Map<string, any>> {
    logger.info('===== Step 1.5: Collecting detailed node properties =====');

    // Check cache
    const cached = await this.loadCache('properties.json');
    if (cached) {
      logger.info('Using cached property data');
      return new Map(Object.entries(cached));
    }

    logger.info('Parsing node properties from NPM packages...');

    const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';

    try {
      const npmCollector = new NpmCollector();
      const loadedNodes = await npmCollector.collectAllWithDetails();

      const propertiesMap = new Map<string, any>();
      const nodeParser = new NodeParser();
      const propertyParser = new PropertyParser();

      let processed = 0;
      for (const loadedNode of loadedNodes) {
        try {
          const parsed = nodeParser.parse(loadedNode.NodeClass, loadedNode.packageName);
          const properties = propertyParser.parse(loadedNode.NodeClass);

          propertiesMap.set(parsed.nodeType, {
            properties,
            version: parsed.version,
            nodeCategory: parsed.nodeCategory,
          });

          processed++;
          if (processed % 50 === 0) {
            logger.progress(processed, loadedNodes.length, 'parsed');

            // Trigger garbage collection periodically in CI environment
            if (isCI && global.gc && processed % 100 === 0) {
              global.gc();
            }
          }
        } catch (error) {
          // Ignore nodes that failed to parse
        }
      }

      logger.success(`Successfully parsed properties for ${propertiesMap.size} nodes`);

      // Convert to serializable format
      const cacheData: Record<string, any> = {};
      propertiesMap.forEach((value, key) => {
        cacheData[key] = value;
      });

      await this.saveCache('properties.json', cacheData);

      // Execute final garbage collection
      if (isCI && global.gc) {
        global.gc();
        logger.info('Executed memory garbage collection');
      }

      return propertiesMap;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('Error occurred while collecting node properties', error);

      // Try to recover from cache
      const oldCache = await this.loadCache('properties.json');
      if (oldCache) {
        logger.warn('Recovering using old cache data');
        return new Map(Object.entries(oldCache));
      }

      throw new Error(`Failed to collect node properties and cannot recover: ${errorMsg}`);
    }
  }

  /**
   * Execute complete build process
   */
  async build(): Promise<void> {
    try {
      logger.info('Starting n8n Skill Pack build...\n');

      // Step 1: Collect nodes
      const nodes = await this.collectNodes();

      // Step 1.5: Collect detailed node properties
      const propertiesMap = await this.collectDetailedProperties();

      // Step 2: Collect usage statistics
      const usageStats = await this.collectUsageStats();

      // Step 3: Organize and rank
      const { topNodes, remainingNodes } = await this.organizeNodes(
        nodes,
        usageStats,
        propertiesMap
      );

      const allNodes = [...topNodes, ...remainingNodes];

      // Step 3.5: Collect node I/O configurations and build compatibility matrix
      const { nodeConnectionInfoList, compatibilityMatrix } = await this.buildCompatibilityMatrix(allNodes);

      // Step 4: Generate resource files for all nodes (using tiered merge strategy)
      logger.info('===== Step 4: Generating resource files =====');

      // Re-sort all nodes by score (already contains score, rank, tier information)
      const sortedAllNodes = [...allNodes].sort((a, b) => (b.score || 0) - (a.score || 0));

      // Split into high-priority and low-priority nodes based on configuration
      const highPriorityCount = this.config.high_priority_node_count || 50;
      const highPriorityNodes = sortedAllNodes.slice(0, highPriorityCount);
      const lowPriorityNodes = sortedAllNodes.slice(highPriorityCount);

      logger.info(`High-priority nodes (individual files): ${highPriorityNodes.length}`);
      logger.info(`Low-priority nodes (merged files): ${lowPriorityNodes.length}`);

      const resourceGenerator = new ResourceGenerator({
        outputDir: path.resolve(this.projectRoot, 'output/resources'),
      });

      // Generate resource files using tiered merge strategy
      const resourceFiles = await resourceGenerator.generateTiered(
        highPriorityNodes,
        lowPriorityNodes,
        compatibilityMatrix,
        nodeConnectionInfoList
      );

      logger.success(`Successfully generated ${resourceFiles.length} resource files`);

      // Step 4.5: Generate compatibility matrix document
      await this.generateCompatibilityMatrixFile(compatibilityMatrix, nodeConnectionInfoList.slice(0, 50));

      // Step 5: Generate template files
      await this.generateTemplates();

      // Step 6: Generate main Skill document
      await this.generateMainSkill(topNodes, usageStats, resourceFiles);

      // Display statistics
      this.printStats();
    } catch (error) {
      logger.error('Error occurred during build process', error);
      throw error;
    }
  }
}

/**
 * Main program entry point
 */
async function main() {
  try {
    const configPath = 'config/skill-config.json';
    const builder = new SkillBuilder(configPath);
    await builder.build();
    process.exit(0);
  } catch (error) {
    logger.error('Build failed', error);
    process.exit(1);
  }
}

// Execute main program
if (require.main === module) {
  main();
}

export { SkillBuilder };
