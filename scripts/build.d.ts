/**
 * 主要建置編排腳本
 * 協調整個建置流程：收集、解析、組織和生成
 */
/**
 * 主要建置類別
 */
declare class SkillBuilder {
    private config;
    private stats;
    private projectRoot;
    constructor(configPath: string);
    /**
     * 載入配置檔案
     */
    private loadConfig;
    /**
     * 確保目錄存在
     */
    private ensureDirectory;
    /**
     * 儲存快取資料
     */
    private saveCache;
    /**
     * 載入快取資料
     */
    private loadCache;
    /**
     * 步驟 1: 收集節點資訊
     */
    private collectNodes;
    /**
     * 步驟 2: 收集使用統計
     */
    private collectUsageStats;
    /**
     * 步驟 3: 收集文件
     */
    private collectDocs;
    /**
     * 步驟 4: 組織和排序節點
     */
    private organizeNodes;
    /**
     * 步驟 5: 生成主 Skill 文件
     */
    private generateMainSkill;
    /**
     * 步驟 6: 生成資源檔案
     */
    private generateResourceFiles;
    /**
     * 顯示建置統計
     */
    private printStats;
    /**
     * 執行完整建置流程
     */
    build(): Promise<void>;
}
export { SkillBuilder };
//# sourceMappingURL=build.d.ts.map