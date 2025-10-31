/**
 * 主要建置編排腳本
 * 協調整個建置流程：收集、解析、組織和生成
 */

import path from 'path';
import { promises as fs } from 'fs';
import * as logger from '../src/utils/logger';

// 導入收集器
import { NpmCollector, ApiCollector, DocsCollector } from '../src/collectors';
import type { SimplifiedNodeInfo } from '../src/collectors/npm-collector';
import type { NodeUsageStats } from '../src/collectors/api-collector';
import type { NodeDocSummary } from '../src/collectors/docs-collector';

// 導入解析器
import { NodeParser, PropertyParser } from '../src/parsers';

// 導入組織器
import { PriorityRanker } from '../src/organizers';
import type { ScoredNode } from '../src/organizers/priority-ranker';

// 導入生成器
import { SkillGenerator } from '../src/generators';
import type { EnrichedNodeInfo, SkillConfig, ResourceFile } from '../src/generators/skill-generator';
import { TemplateGenerator } from '../src/generators/template-generator';
import { ResourceGenerator } from '../src/generators/resource-generator';

/**
 * 建置配置介面
 */
interface BuildConfig {
  version: string;
  n8n_version: string;
  max_nodes_in_main_skill: number;
  categories: Record<string, any>;
  output_format: string;
  include_examples: boolean;
  include_templates: boolean;
  max_template_examples: number;
  docs_summary_max_length: number;
  property_max_count: number;
}

/**
 * 建置統計資訊
 */
interface BuildStats {
  totalNodes: number;
  topNodes: number;
  resourceNodes: number;
  templatesCollected: number;
  docsCollected: number;
  startTime: Date;
  endTime?: Date;
  duration?: number;
}

/**
 * 主要建置類別
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
      docsCollected: 0,
      startTime: new Date(),
    };
  }

  /**
   * 載入配置檔案
   */
  private loadConfig(configPath: string): BuildConfig {
    try {
      const fullPath = path.resolve(this.projectRoot, configPath);
      const content = require(fullPath);
      logger.info(`成功載入配置: ${configPath}`);
      return content;
    } catch (error) {
      logger.error('載入配置檔案失敗', error);
      throw error;
    }
  }

  /**
   * 確保目錄存在
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
   * 儲存快取資料
   */
  private async saveCache(filename: string, data: any): Promise<void> {
    await this.ensureDirectory('data/cache');
    const cachePath = path.resolve(this.projectRoot, 'data/cache', filename);
    await fs.writeFile(cachePath, JSON.stringify(data, null, 2), 'utf-8');
    logger.info(`快取已儲存: ${filename}`);
  }

  /**
   * 載入快取資料
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
   * 步驟 1: 收集節點資訊
   */
  private async collectNodes(): Promise<SimplifiedNodeInfo[]> {
    logger.info('===== 步驟 1: 收集節點資訊 =====');

    // 檢查快取
    const cached = await this.loadCache('nodes.json');
    if (cached) {
      logger.info(`使用快取的節點資料 (${cached.length} 個節點)`);
      return cached;
    }

    logger.info('從 NPM 套件收集節點資訊...');

    // 檢測是否在 CI 環境中
    const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
    if (isCI) {
      logger.info('偵測到 CI 環境，啟用記憶體優化模式');
    }

    try {
      const npmCollector = new NpmCollector();
      const nodes = await npmCollector.collectAll();

      this.stats.totalNodes = nodes.length;
      logger.success(`成功收集 ${nodes.length} 個節點`);

      await this.saveCache('nodes.json', nodes);

      // 在 CI 環境中主動觸發垃圾回收
      if (isCI && global.gc) {
        global.gc();
        logger.info('執行記憶體垃圾回收');
      }

      return nodes;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('收集節點資訊時發生錯誤', error);

      // 嘗試從快取恢復（即使快取可能是舊的）
      const oldCache = await this.loadCache('nodes.json');
      if (oldCache && oldCache.length > 0) {
        logger.warn(`使用舊的快取資料恢復 (${oldCache.length} 個節點)`);
        return oldCache;
      }

      throw new Error(`收集節點失敗且無法恢復: ${errorMsg}`);
    }
  }

  /**
   * 步驟 2: 收集使用統計
   */
  private async collectUsageStats(): Promise<NodeUsageStats> {
    logger.info('===== 步驟 2: 收集使用統計 =====');

    // 檢查快取
    const cached = await this.loadCache('usage-stats.json');
    if (cached) {
      logger.info('使用快取的使用統計資料');
      return cached;
    }

    logger.info('從 n8n.io API 收集範本和使用統計...');
    try {
      const apiCollector = new ApiCollector({
        limit: this.config.max_template_examples,
      });
      const result = await apiCollector.fetchTemplates();

      this.stats.templatesCollected = result.totalTemplates;
      logger.success(`成功收集 ${result.totalTemplates} 個範本`);

      await this.saveCache('usage-stats.json', result.nodeUsageStats);
      await this.saveCache('templates.json', result.templates);

      return result.nodeUsageStats;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.warn(`收集使用統計失敗，使用空白資料: ${errorMsg}`);
      return {};
    }
  }

  /**
   * 步驟 3: 收集文件
   */
  private async collectDocs(): Promise<Map<string, NodeDocSummary>> {
    logger.info('===== 步驟 3: 收集節點文件 =====');

    // 檢查快取
    const cached = await this.loadCache('docs.json');
    if (cached) {
      logger.info(`使用快取的文件資料 (${cached.length} 個文件)`);
      return new Map(cached.map((doc: NodeDocSummary) => [doc.nodeName, doc]));
    }

    logger.info('從 n8n-docs 儲存庫收集文件...');
    try {
      const docsCollector = new DocsCollector({
        summaryLength: this.config.docs_summary_max_length,
      });
      const docs = await docsCollector.collectDocsSummaries();

      this.stats.docsCollected = docs.size;
      logger.success(`成功收集 ${docs.size} 個文件摘要`);

      await this.saveCache('docs.json', Array.from(docs.values()));
      return docs;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.warn(`收集文件失敗，繼續執行: ${errorMsg}`);
      return new Map();
    }
  }

  /**
   * 步驟 4: 組織和排序節點
   */
  private async organizeNodes(
    nodes: SimplifiedNodeInfo[],
    usageStats: NodeUsageStats,
    docsMap: Map<string, NodeDocSummary>,
    propertiesMap: Map<string, any>
  ): Promise<{ topNodes: EnrichedNodeInfo[]; remainingNodes: EnrichedNodeInfo[] }> {
    logger.info('===== 步驟 4: 組織和排序節點 =====');

    // 建立優先級排序器
    const priorityConfigPath = path.resolve(this.projectRoot, 'config/priorities.json');
    const ranker = new PriorityRanker(priorityConfigPath);

    // 將節點資料轉換為評分格式
    const nodeDataList = nodes.map(node => ({
      nodeType: node.nodeType,
      displayName: node.displayName,
      description: node.description,
      category: node.category,
      usageCount: usageStats[node.nodeType]?.count || 0,
      hasDocumentation: docsMap.has(node.nodeType),
      packageName: node.packageName,
    }));

    logger.info('計算節點優先級分數...');
    const scoredNodes = ranker.rankNodes(nodeDataList);
    logger.progress(scoredNodes.length, nodes.length, '已評分');

    // 排序並取得前 N 個節點
    const topCount = this.config.max_nodes_in_main_skill;
    const sortedNodes = scoredNodes.sort((a, b) => b.score - a.score);
    const topScoredNodes = sortedNodes.slice(0, topCount);
    const remainingScoredNodes = sortedNodes.slice(topCount);

    this.stats.topNodes = topScoredNodes.length;
    this.stats.resourceNodes = remainingScoredNodes.length;

    logger.success(`選出 ${topScoredNodes.length} 個主要節點`);
    logger.info(`其餘 ${remainingScoredNodes.length} 個節點將生成為資源檔案`);

    // 轉換為 EnrichedNodeInfo
    const enrichNode = (scored: ScoredNode, original: SimplifiedNodeInfo): EnrichedNodeInfo => {
      const doc = docsMap.get(scored.nodeType);
      const propData = propertiesMap.get(scored.nodeType);

      return {
        ...original,
        usageCount: scored.usageCount,
        usagePercentage: usageStats[scored.nodeType]?.percentage || 0,
        documentation: doc ? {
          description: doc.summary,
          usage: '',
          examples: [],
          keywords: [],
          tags: [],
          officialUrl: doc.url,
        } : undefined,
        properties: propData?.properties,
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
   * 步驟 5: 生成主 Skill 文件
   */
  private async generateMainSkill(
    topNodes: EnrichedNodeInfo[],
    usageStats: NodeUsageStats,
    resourceFiles: ResourceFile[]
  ): Promise<void> {
    logger.info('===== 步驟 5: 生成主 Skill 文件 =====');

    await this.ensureDirectory('output');

    const skillConfig: SkillConfig = {
      name: 'n8n-skills',
      version: this.config.version,
      description: 'n8n 工作流程自動化知識庫。使用此 skill 查找 n8n 節點資訊、了解節點功能用法、學習工作流程模式、取得節點配置範例。涵蓋觸發器、資料轉換、資料輸入輸出、AI 整合等節點。關鍵詞：n8n、workflow、automation、node、trigger、webhook、http request、database、ai agent。',
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
    logger.success(`主 Skill 文件已生成: ${outputPath}`);
    logger.info(`檔案大小: ${lineCount} 行, ${charCount} 字元`);
  }

  /**
   * 步驟 7: 生成 templates 範本檔案
   */
  private async generateTemplates(): Promise<void> {
    logger.info('===== 步驟 7: 生成 templates 範本檔案 =====');

    // 檢查是否有 templates 快取
    const templates = await this.loadCache('templates.json');
    if (!templates || !Array.isArray(templates) || templates.length === 0) {
      logger.warn('沒有找到 templates 快取，跳過 templates 生成');
      return;
    }

    logger.info(`找到 ${templates.length} 個範本`);

    // 使用 TemplateGenerator 生成檔案
    const outputDir = path.resolve(this.projectRoot, 'output/resources/templates');
    const generator = new TemplateGenerator({
      outputDir,
      maxTemplatesPerCategory: 20, // 每個分類最多 20 個範本
    });

    await generator.generate(templates);
    logger.success('templates 範本檔案生成完成');
  }


  /**
   * 顯示建置統計
   */
  private printStats(): void {
    this.stats.endTime = new Date();
    this.stats.duration = this.stats.endTime.getTime() - this.stats.startTime.getTime();

    console.log('\n');
    logger.success('===== 建置完成 =====');
    console.log(`總節點數: ${this.stats.totalNodes}`);
    console.log(`主要節點: ${this.stats.topNodes}`);
    console.log(`資源節點: ${this.stats.resourceNodes}`);
    console.log(`範本數量: ${this.stats.templatesCollected}`);
    console.log(`文件數量: ${this.stats.docsCollected}`);
    console.log(`建置時間: ${(this.stats.duration / 1000).toFixed(2)} 秒`);
    console.log('');
  }

  /**
   * 步驟 1.5: 收集節點詳細屬性
   */
  private async collectDetailedProperties(): Promise<Map<string, any>> {
    logger.info('===== 步驟 1.5: 收集節點詳細屬性 =====');

    // 檢查快取
    const cached = await this.loadCache('properties.json');
    if (cached) {
      logger.info('使用快取的屬性資料');
      return new Map(Object.entries(cached));
    }

    logger.info('從 NPM 套件解析節點屬性...');

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
            logger.progress(processed, loadedNodes.length, '已解析');

            // 在 CI 環境中定期觸發垃圾回收
            if (isCI && global.gc && processed % 100 === 0) {
              global.gc();
            }
          }
        } catch (error) {
          // 忽略解析失敗的節點
        }
      }

      logger.success(`成功解析 ${propertiesMap.size} 個節點的屬性`);

      // 轉換為可序列化的格式
      const cacheData: Record<string, any> = {};
      propertiesMap.forEach((value, key) => {
        cacheData[key] = value;
      });

      await this.saveCache('properties.json', cacheData);

      // 最後執行一次垃圾回收
      if (isCI && global.gc) {
        global.gc();
        logger.info('執行記憶體垃圾回收');
      }

      return propertiesMap;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('收集節點屬性時發生錯誤', error);

      // 嘗試從快取恢復
      const oldCache = await this.loadCache('properties.json');
      if (oldCache) {
        logger.warn('使用舊的快取資料恢復');
        return new Map(Object.entries(oldCache));
      }

      throw new Error(`收集節點屬性失敗且無法恢復: ${errorMsg}`);
    }
  }

  /**
   * 執行完整建置流程
   */
  async build(): Promise<void> {
    try {
      logger.info('開始建置 n8n Skill Pack...\n');

      // 步驟 1: 收集節點
      const nodes = await this.collectNodes();

      // 步驟 1.5: 收集節點詳細屬性
      const propertiesMap = await this.collectDetailedProperties();

      // 步驟 2: 收集使用統計
      const usageStats = await this.collectUsageStats();

      // 步驟 3: 收集文件
      const docsMap = await this.collectDocs();

      // 步驟 4: 組織和排序
      const { topNodes, remainingNodes } = await this.organizeNodes(
        nodes,
        usageStats,
        docsMap,
        propertiesMap
      );

      // 步驟 6: 為所有節點生成資源檔案（包括 topNodes，因為 Skill.md 會連結到它們）
      logger.info('===== 步驟 6: 生成資源檔案 =====');
      const allNodes = [...topNodes, ...remainingNodes];

      const resourceGenerator = new ResourceGenerator({
        outputDir: path.resolve(this.projectRoot, 'output/resources'),
      });
      const resourceFiles = await resourceGenerator.generateAll(allNodes);

      logger.success(`成功生成 ${resourceFiles.length} 個資源檔案`);

      // 步驟 7: 生成 templates 範本檔案
      await this.generateTemplates();

      // 步驟 5: 生成主 Skill 文件
      await this.generateMainSkill(topNodes, usageStats, resourceFiles);

      // 顯示統計
      this.printStats();
    } catch (error) {
      logger.error('建置過程發生錯誤', error);
      throw error;
    }
  }
}

/**
 * 主程式入口
 */
async function main() {
  try {
    const configPath = 'config/skill-config.json';
    const builder = new SkillBuilder(configPath);
    await builder.build();
    process.exit(0);
  } catch (error) {
    logger.error('建置失敗', error);
    process.exit(1);
  }
}

// 執行主程式
if (require.main === module) {
  main();
}

export { SkillBuilder };
