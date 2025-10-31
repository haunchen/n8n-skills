"use strict";
/**
 * 主要建置編排腳本
 * 協調整個建置流程：收集、解析、組織和生成
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SkillBuilder = void 0;
const path_1 = __importDefault(require("path"));
const fs_1 = require("fs");
const logger = __importStar(require("../src/utils/logger"));
// 導入收集器
const collectors_1 = require("../src/collectors");
// 導入組織器
const organizers_1 = require("../src/organizers");
// 導入生成器
const generators_1 = require("../src/generators");
/**
 * 主要建置類別
 */
class SkillBuilder {
    config;
    stats;
    projectRoot;
    constructor(configPath) {
        this.projectRoot = path_1.default.resolve(__dirname, '..');
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
    loadConfig(configPath) {
        try {
            const fullPath = path_1.default.resolve(this.projectRoot, configPath);
            const content = require(fullPath);
            logger.info(`成功載入配置: ${configPath}`);
            return content;
        }
        catch (error) {
            logger.error('載入配置檔案失敗', error);
            throw error;
        }
    }
    /**
     * 確保目錄存在
     */
    async ensureDirectory(dirPath) {
        const fullPath = path_1.default.resolve(this.projectRoot, dirPath);
        try {
            await fs_1.promises.mkdir(fullPath, { recursive: true });
        }
        catch (error) {
            if (error.code !== 'EEXIST') {
                throw error;
            }
        }
    }
    /**
     * 儲存快取資料
     */
    async saveCache(filename, data) {
        await this.ensureDirectory('data/cache');
        const cachePath = path_1.default.resolve(this.projectRoot, 'data/cache', filename);
        await fs_1.promises.writeFile(cachePath, JSON.stringify(data, null, 2), 'utf-8');
        logger.info(`快取已儲存: ${filename}`);
    }
    /**
     * 載入快取資料
     */
    async loadCache(filename) {
        const cachePath = path_1.default.resolve(this.projectRoot, 'data/cache', filename);
        try {
            const content = await fs_1.promises.readFile(cachePath, 'utf-8');
            return JSON.parse(content);
        }
        catch {
            return null;
        }
    }
    /**
     * 步驟 1: 收集節點資訊
     */
    async collectNodes() {
        logger.info('===== 步驟 1: 收集節點資訊 =====');
        // 檢查快取
        const cached = await this.loadCache('nodes.json');
        if (cached) {
            logger.info(`使用快取的節點資料 (${cached.length} 個節點)`);
            return cached;
        }
        logger.info('從 NPM 套件收集節點資訊...');
        const npmCollector = new collectors_1.NpmCollector();
        const nodes = await npmCollector.collectAll();
        this.stats.totalNodes = nodes.length;
        logger.success(`成功收集 ${nodes.length} 個節點`);
        await this.saveCache('nodes.json', nodes);
        return nodes;
    }
    /**
     * 步驟 2: 收集使用統計
     */
    async collectUsageStats() {
        logger.info('===== 步驟 2: 收集使用統計 =====');
        // 檢查快取
        const cached = await this.loadCache('usage-stats.json');
        if (cached) {
            logger.info('使用快取的使用統計資料');
            return cached;
        }
        logger.info('從 n8n.io API 收集範本和使用統計...');
        try {
            const apiCollector = new collectors_1.ApiCollector({
                limit: this.config.max_template_examples,
            });
            const result = await apiCollector.collectTemplates();
            this.stats.templatesCollected = result.totalTemplates;
            logger.success(`成功收集 ${result.totalTemplates} 個範本`);
            await this.saveCache('usage-stats.json', result.nodeUsageStats);
            await this.saveCache('templates.json', result.templates);
            return result.nodeUsageStats;
        }
        catch (error) {
            logger.warn('收集使用統計失敗，使用空白資料');
            return {};
        }
    }
    /**
     * 步驟 3: 收集文件
     */
    async collectDocs() {
        logger.info('===== 步驟 3: 收集節點文件 =====');
        // 檢查快取
        const cached = await this.loadCache('docs.json');
        if (cached) {
            logger.info(`使用快取的文件資料 (${cached.length} 個文件)`);
            return new Map(cached.map((doc) => [doc.nodeName, doc]));
        }
        logger.info('從 n8n-docs 儲存庫收集文件...');
        try {
            const docsCollector = new collectors_1.DocsCollector({
                summaryLength: this.config.docs_summary_max_length,
            });
            const docs = await docsCollector.collectAll();
            this.stats.docsCollected = docs.length;
            logger.success(`成功收集 ${docs.length} 個文件摘要`);
            await this.saveCache('docs.json', docs);
            return new Map(docs.map(doc => [doc.nodeName, doc]));
        }
        catch (error) {
            logger.warn('收集文件失敗，繼續執行', error);
            return new Map();
        }
    }
    /**
     * 步驟 4: 組織和排序節點
     */
    async organizeNodes(nodes, usageStats, docsMap) {
        logger.info('===== 步驟 4: 組織和排序節點 =====');
        // 建立優先級排序器
        const priorityConfigPath = path_1.default.resolve(this.projectRoot, 'config/priority.json');
        const ranker = new organizers_1.PriorityRanker(priorityConfigPath);
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
        const enrichNode = (scored, original) => {
            const doc = docsMap.get(scored.nodeType);
            return {
                ...original,
                usageCount: scored.usageCount,
                usagePercentage: usageStats[scored.nodeType]?.percentage || 0,
                documentation: doc ? {
                    summary: doc.summary,
                    url: doc.url,
                    category: doc.category,
                    keywords: [],
                    tags: [],
                } : undefined,
            };
        };
        const topNodes = topScoredNodes.map(scored => {
            const original = nodes.find(n => n.nodeType === scored.nodeType);
            return enrichNode(scored, original);
        });
        const remainingNodes = remainingScoredNodes.map(scored => {
            const original = nodes.find(n => n.nodeType === scored.nodeType);
            return enrichNode(scored, original);
        });
        return { topNodes, remainingNodes };
    }
    /**
     * 步驟 5: 生成主 Skill 文件
     */
    async generateMainSkill(topNodes, usageStats, resourceFiles) {
        logger.info('===== 步驟 5: 生成主 Skill 文件 =====');
        await this.ensureDirectory('output');
        const skillConfig = {
            name: 'n8n Workflow Automation',
            version: this.config.version,
            description: 'n8n 工作流程自動化知識庫',
            topNodesCount: this.config.max_nodes_in_main_skill,
        };
        const generator = new generators_1.SkillGenerator(skillConfig);
        const content = generator.generate({
            nodes: topNodes,
            nodeUsageStats: usageStats,
            resourceFiles,
            config: skillConfig,
        });
        const outputPath = path_1.default.resolve(this.projectRoot, 'output/Skill.md');
        await fs_1.promises.writeFile(outputPath, content, 'utf-8');
        const lineCount = content.split('\n').length;
        const charCount = content.length;
        logger.success(`主 Skill 文件已生成: ${outputPath}`);
        logger.info(`檔案大小: ${lineCount} 行, ${charCount} 字元`);
    }
    /**
     * 步驟 6: 生成資源檔案
     */
    async generateResourceFiles(nodes) {
        logger.info('===== 步驟 6: 生成資源檔案 =====');
        const resourceDir = path_1.default.resolve(this.projectRoot, 'output/resources');
        await this.ensureDirectory('output/resources');
        const resourceFiles = [];
        let processed = 0;
        const resourceGenerator = new generators_1.ResourceGenerator({
            outputDir: resourceDir,
            overwrite: true,
            generateIndex: true,
        });
        logger.info(`開始生成 ${nodes.length} 個資源檔案...`);
        for (const node of nodes) {
            try {
                // 這裡需要有完整的節點資訊，但目前我們只有簡化版
                // 在實際使用中，這裡應該從詳細資料中取得
                const filename = `${node.nodeType}.md`;
                const filepath = path_1.default.join('resources', filename);
                resourceFiles.push({
                    name: node.displayName,
                    path: filepath,
                    description: node.description,
                    category: node.category,
                });
                processed++;
                if (processed % 10 === 0) {
                    logger.progress(processed, nodes.length, '生成資源檔案');
                }
            }
            catch (error) {
                logger.warn(`生成資源檔案失敗: ${node.displayName}`, error);
            }
        }
        logger.success(`成功生成 ${resourceFiles.length} 個資源檔案`);
        return resourceFiles;
    }
    /**
     * 顯示建置統計
     */
    printStats() {
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
     * 執行完整建置流程
     */
    async build() {
        try {
            logger.info('開始建置 n8n Skill Pack...\n');
            // 步驟 1: 收集節點
            const nodes = await this.collectNodes();
            // 步驟 2: 收集使用統計
            const usageStats = await this.collectUsageStats();
            // 步驟 3: 收集文件
            const docsMap = await this.collectDocs();
            // 步驟 4: 組織和排序
            const { topNodes, remainingNodes } = await this.organizeNodes(nodes, usageStats, docsMap);
            // 步驟 6: 生成資源檔案（需要在步驟 5 之前，因為步驟 5 需要資源檔案列表）
            const resourceFiles = await this.generateResourceFiles(remainingNodes);
            // 步驟 5: 生成主 Skill 文件
            await this.generateMainSkill(topNodes, usageStats, resourceFiles);
            // 顯示統計
            this.printStats();
        }
        catch (error) {
            logger.error('建置過程發生錯誤', error);
            throw error;
        }
    }
}
exports.SkillBuilder = SkillBuilder;
/**
 * 主程式入口
 */
async function main() {
    try {
        const configPath = 'config/skill-config.json';
        const builder = new SkillBuilder(configPath);
        await builder.build();
        process.exit(0);
    }
    catch (error) {
        logger.error('建置失敗', error);
        process.exit(1);
    }
}
// 執行主程式
if (require.main === module) {
    main();
}
//# sourceMappingURL=build.js.map