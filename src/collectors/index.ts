// API collector - Collect template information from n8n.io API
export {
  ApiCollector,
  fetchPopularTemplates,
  getNodeUsageStats,
  type ApiCollectorConfig,
  type TemplateCollectionResult,
  type NodeUsageStats,
} from './api-collector';

// NPM collector - Collect node information from n8n npm packages
export {
  NpmCollector,
  type SimplifiedNodeInfo,
  type LoadedNode,
} from './npm-collector';

// Community collector - Collect popular community packages from npm
export {
  CommunityCollector,
  fetchCommunityPackages,
  type CommunityPackage,
  type CommunityCategory,
  type CommunityCollectionResult,
  type CommunityCollectorConfig,
  type CommunityNodeInfo,
  type CommunityNodeDetails,
  type CommunityNodesCache,
} from './community-collector';
