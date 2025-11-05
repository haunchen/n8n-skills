# n8n.io Workflow API Research Report

[中文版](./workflow-api-research.md) | English

Created: 2025-11-03

## Executive Summary

Through our research, we successfully discovered the complete workflow definition API provided by n8n.io. This API provides comprehensive workflow JSON definitions including node configurations, connection relationships, parameter settings, and more.

## 1. Current API Endpoint

### 1.1 Current Implementation (src/collectors/api-collector.ts)

Current endpoint in use:

```
GET https://api.n8n.io/api/templates/search
Parameters:
- page: Page number
- rows: Items per page
- category: Category filter (optional)
- search: Search keywords (optional)
```

Response data structure:

```typescript
interface TemplateApiResponse {
  totalWorkflows: number;
  workflows: Template[];
}

interface Template {
  id: number;
  name: string;
  description: string;
  totalViews: number;
  createdAt: string;
  user: TemplateUser;
  nodes: TemplateNode[];  // Only contains basic node info (id, name, displayName)
}
```

### 1.2 Problem Analysis

The current `/templates/search` endpoint has the following limitations:

- nodes array only contains basic info (id, name, displayName, icon)
- Missing connection relationships between nodes
- Missing complete node parameter configurations
- Missing node position information
- Cannot obtain complete executable workflow JSON

## 2. Discovered Complete Workflow API

### 2.1 API Endpoint

```
GET https://api.n8n.io/api/workflows/templates/{id}
```

Example:
```bash
curl https://api.n8n.io/api/workflows/templates/6270
```

### 2.2 Response Data Structure

```typescript
interface WorkflowDetailResponse {
  id: number;                    // Template ID
  name: string;                  // Template name
  workflow: {
    meta: {
      instanceId: string;
      templateCredsSetupCompleted: boolean;
    };
    nodes: WorkflowNode[];       // Complete node definitions
    connections: WorkflowConnections;  // Node connection relationships
    pinData: Record<string, any>;      // Pinned data
  };
}

interface WorkflowNode {
  id: string;                    // Node UUID
  name: string;                  // Node name
  type: string;                  // Node type (e.g., "n8n-nodes-base.httpRequest")
  position: [number, number];    // Node position [x, y]
  parameters: Record<string, any>;  // Node parameter configuration
  typeVersion: number;           // Node version
  credentials?: Record<string, any>;  // Credentials configuration
  notes?: string;                // Node notes
  cid?: string;                  // Creator ID
  creator?: string;              // Creator name
}

interface WorkflowConnections {
  [sourceNodeName: string]: {
    [outputType: string]: Array<Array<{
      node: string;              // Target node name
      type: string;              // Connection type (main, ai_tool, ai_languageModel, etc.)
      index: number;             // Output index
    }>>;
  };
}
```

### 2.3 Actual Data Example

Using Template ID 6270 ("Build Your First AI Agent") as an example:

```json
{
  "id": 6270,
  "name": "Build Your First AI Agent",
  "workflow": {
    "meta": {
      "instanceId": "e409ea34548a2afe2dffba31130cd1cf2e98ebe2afaeed2a63caf2a0582d1da0",
      "templateCredsSetupCompleted": true
    },
    "nodes": [
      {
        "id": "95421925-c5ad-48bd-9638-c84ff5b5e3c6",
        "name": "Example Chat",
        "type": "@n8n/n8n-nodes-langchain.chatTrigger",
        "position": [-176, -64],
        "parameters": {
          "public": true,
          "options": {
            "title": "Your first AI Agent 🚀",
            "subtitle": "This is for demo purposes. Try me out !"
          }
        },
        "typeVersion": 1.1
      },
      {
        "id": "332af12a-45ab-4e5d-8dab-da21ba2111f9",
        "name": "Your First AI Agent",
        "type": "@n8n/n8n-nodes-langchain.agent",
        "position": [192, -64],
        "parameters": {
          "options": {
            "systemMessage": "You are an AI assistant..."
          }
        },
        "typeVersion": 2.2
      }
    ],
    "connections": {
      "Example Chat": {
        "main": [
          [
            {
              "node": "Your First AI Agent",
              "type": "main",
              "index": 0
            }
          ]
        ]
      },
      "Get Weather": {
        "ai_tool": [
          [
            {
              "node": "Your First AI Agent",
              "type": "ai_tool",
              "index": 0
            }
          ]
        ]
      }
    }
  }
}
```

## 3. API Feature Comparison

| Feature | /templates/search | /workflows/templates/{id} |
|---------|-------------------|---------------------------|
| Batch Query | ✅ (up to 100) | ❌ (single query) |
| Basic Info | ✅ | ✅ |
| Node List | ✅ (simplified) | ✅ (complete) |
| Node Parameters | ❌ | ✅ |
| Node Positions | ❌ | ✅ |
| Connection Relationships | ❌ | ✅ |
| Importable to n8n | ❌ | ✅ |

## 4. Implementation Recommendations

### 4.1 Extend ApiCollector Class

Add methods to `src/collectors/api-collector.ts`:

```typescript
/**
 * Fetch complete workflow definition
 */
public async fetchWorkflowDefinition(templateId: number): Promise<WorkflowDefinition> {
  try {
    console.log(`Fetching complete workflow definition for Template ID ${templateId}...`);

    const response = await this.withRetry(async () => {
      return await this.client.get<WorkflowDefinition>(
        `/workflows/templates/${templateId}`
      );
    });

    console.log(`Successfully fetched workflow: ${response.data.name}`);
    console.log(`- Node count: ${response.data.workflow.nodes.length}`);
    console.log(`- Connection count: ${Object.keys(response.data.workflow.connections).length}`);

    return response.data;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to fetch workflow definition: ${error.message}`);
    }
    throw new Error('Unknown error occurred while fetching workflow definition');
  }
}

/**
 * Batch fetch multiple workflow definitions
 */
public async fetchMultipleWorkflows(
  templateIds: number[],
  concurrency: number = 5
): Promise<WorkflowDefinition[]> {
  const results: WorkflowDefinition[] = [];

  // Use concurrency control to avoid too many requests
  for (let i = 0; i < templateIds.length; i += concurrency) {
    const batch = templateIds.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(id => this.fetchWorkflowDefinition(id))
    );
    results.push(...batchResults);

    // Add delay between batches
    if (i + concurrency < templateIds.length) {
      await this.delay(1000);
    }
  }

  return results;
}
```

### 4.2 Add Type Definitions

```typescript
export interface WorkflowNode {
  id: string;
  name: string;
  type: string;
  position: [number, number];
  parameters: Record<string, any>;
  typeVersion: number;
  credentials?: Record<string, any>;
  notes?: string;
  cid?: string;
  creator?: string;
}

export interface WorkflowConnection {
  node: string;
  type: string;
  index: number;
}

export interface WorkflowConnections {
  [sourceNodeName: string]: {
    [outputType: string]: WorkflowConnection[][];
  };
}

export interface WorkflowDefinition {
  id: number;
  name: string;
  workflow: {
    meta: {
      instanceId: string;
      templateCredsSetupCompleted: boolean;
    };
    nodes: WorkflowNode[];
    connections: WorkflowConnections;
    pinData: Record<string, any>;
  };
}
```

### 4.3 Extend TemplateGenerator

Extend functionality in `src/generators/template-generator.ts`:

```typescript
/**
 * Generate markdown with complete workflow definition
 */
generateTemplateMarkdownWithWorkflow(
  template: Template,
  workflow: WorkflowDefinition,
  category: TemplateCategory
): string {
  const sections = [
    // ... original basic info ...

    '## Workflow Architecture',
    '',
    this.generateWorkflowDiagram(workflow),
    '',
    '## Node Configuration Details',
    '',
    this.generateNodeDetails(workflow),
    '',
    '## Connection Relationships',
    '',
    this.generateConnectionDetails(workflow),
    '',
    '## Complete Workflow JSON',
    '',
    '```json',
    JSON.stringify(workflow.workflow, null, 2),
    '```',
    ''
  ];

  return sections.join('\n');
}

/**
 * Generate workflow diagram
 */
private generateWorkflowDiagram(workflow: WorkflowDefinition): string {
  const lines = ['```mermaid', 'graph LR'];

  // Generate nodes
  workflow.workflow.nodes.forEach((node, index) => {
    const nodeId = `N${index}`;
    const label = node.name.replace(/"/g, '\\"');
    lines.push(`  ${nodeId}["${label}<br/>${node.type}"]`);
  });

  // Generate connections
  const nodeNameToId = new Map<string, string>();
  workflow.workflow.nodes.forEach((node, index) => {
    nodeNameToId.set(node.name, `N${index}`);
  });

  Object.entries(workflow.workflow.connections).forEach(([source, outputs]) => {
    const sourceId = nodeNameToId.get(source);
    Object.entries(outputs).forEach(([outputType, targets]) => {
      targets.flat().forEach(target => {
        const targetId = nodeNameToId.get(target.node);
        if (sourceId && targetId) {
          lines.push(`  ${sourceId} -->|${outputType}| ${targetId}`);
        }
      });
    });
  });

  lines.push('```');
  return lines.join('\n');
}

/**
 * Generate node detail information
 */
private generateNodeDetails(workflow: WorkflowDefinition): string {
  const lines: string[] = [];

  workflow.workflow.nodes.forEach((node) => {
    lines.push(`### ${node.name}`);
    lines.push('');
    lines.push(`- Type: \`${node.type}\``);
    lines.push(`- Version: ${node.typeVersion}`);
    lines.push(`- Position: (${node.position[0]}, ${node.position[1]})`);

    if (node.notes) {
      lines.push(`- Notes: ${node.notes}`);
    }

    if (Object.keys(node.parameters).length > 0) {
      lines.push('- Parameter Configuration:');
      lines.push('```json');
      lines.push(JSON.stringify(node.parameters, null, 2));
      lines.push('```');
    }

    lines.push('');
  });

  return lines.join('\n');
}

/**
 * Generate connection relationship details
 */
private generateConnectionDetails(workflow: WorkflowDefinition): string {
  const lines: string[] = [];

  Object.entries(workflow.workflow.connections).forEach(([source, outputs]) => {
    lines.push(`**${source}**`);
    Object.entries(outputs).forEach(([outputType, targets]) => {
      targets.flat().forEach(target => {
        lines.push(`  - ${outputType} → ${target.node} (index: ${target.index})`);
      });
    });
    lines.push('');
  });

  return lines.join('\n');
}
```

### 4.4 Integration into Build Process

Add step to `scripts/build.ts`:

```typescript
// Step 3.5: Fetch complete workflow definitions
async function fetchWorkflowDefinitions(
  templates: Template[]
): Promise<Map<number, WorkflowDefinition>> {
  const collector = new ApiCollector();
  const definitions = new Map<number, WorkflowDefinition>();

  // Select top N most popular templates
  const topTemplates = templates
    .sort((a, b) => b.totalViews - a.totalViews)
    .slice(0, 50);  // Limit quantity to avoid excessive API requests

  const templateIds = topTemplates.map(t => t.id);
  const workflows = await collector.fetchMultipleWorkflows(templateIds);

  workflows.forEach(workflow => {
    definitions.set(workflow.id, workflow);
  });

  return definitions;
}
```

## 5. Implementation Difficulty Assessment

### 5.1 Technical Difficulty

- Difficulty: ⭐⭐☆☆☆ (Medium-Low)
- API already provides complete data, only need to add calling logic
- Main work is parsing and formatting output

### 5.2 Time Estimation

- Extend ApiCollector: 2-3 hours
- Add type definitions: 1 hour
- Extend TemplateGenerator: 3-4 hours
- Integration testing: 2 hours
- Total: 8-10 hours

### 5.3 Considerations

1. API Request Limits
   - Single template API can only query one at a time, requires batch processing
   - Recommend adding request delays to avoid rate limits
   - Recommend caching results to avoid duplicate requests

2. Data Size
   - Complete workflow JSON can be very large (includes all parameters)
   - Consider providing collapsible sections or links rather than full embedding in markdown
   - Consider generating separate JSON files

3. Privacy and Security
   - Workflows may contain sensitive information (API keys, credentials)
   - Need to check and filter sensitive fields
   - Recommend saving only structure, not actual credentials

## 6. Alternative Solutions

If the API approach is not feasible, consider these alternatives:

### 6.1 From n8n GitHub Examples

n8n official GitHub repositories may contain example workflows:
- https://github.com/n8n-io/n8n
- https://github.com/n8n-io/n8n-docs

### 6.2 From Community Resources

- n8n community forum shares
- Reddit r/n8n
- n8n Discord community

### 6.3 Manual Curation

- Select representative workflows
- Manually create and test
- Ensure quality and usability

## 7. Recommended Implementation Priority

### Phase 1: Basic Implementation (Essential)

✅ Extend ApiCollector to add `fetchWorkflowDefinition()` method
✅ Add complete type definitions
✅ Test API calls and data structures

### Phase 2: Generator Extension (Important)

- Extend TemplateGenerator to support complete workflows
- Generate structured markdown documents
- Add workflow visualization (mermaid diagrams)

### Phase 3: Integration Optimization (Secondary)

- Implement batch requests and caching mechanisms
- Optimize output formats
- Add sensitive information filtering

### Phase 4: Advanced Features (Optional)

- Generate standalone workflow JSON files for import
- Add interactive workflow preview
- Support auto-generating documentation from workflows

## 8. Conclusion

The n8n.io API provides complete workflow definition access capabilities, including node configurations, connection relationships, and all necessary information. Through the `/workflows/templates/{id}` endpoint, we can obtain complete workflow JSON that can be directly imported into n8n.

The main challenges in implementing this feature are:
1. Need to make separate API calls for each template (no batch endpoint)
2. Need proper request rate control
3. Need to design good output formats to present complex workflow structures

Recommend implementing the basic API calling functionality first, then gradually extending the generator to provide richer documentation formats.

## 9. Example Code

Complete implementation examples can be found at:
- `/Users/haunchenchen/Documents/GitHub/n8n-skills/examples/workflow-api-example.ts`
