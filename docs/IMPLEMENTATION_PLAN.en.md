# n8n Workflow API Implementation Plan

[中文版](./IMPLEMENTATION_PLAN.md) | English

Based on research results, this is the complete implementation plan with priority ordering.

## Research Summary

### Discovered API

Successfully found API endpoint for fetching complete workflow definitions:

```
GET https://api.n8n.io/api/workflows/templates/{id}
```

### API Feature Comparison

```
┌─────────────────────┬────────────────────────┬───────────────────────────┐
│ Feature             │ /templates/search      │ /workflows/templates/{id} │
├─────────────────────┼────────────────────────┼───────────────────────────┤
│ Batch Query         │ ✅ Up to 100           │ ❌ Single query           │
│ Basic Node Info     │ ✅                     │ ✅                        │
│ Complete Parameters │ ❌                     │ ✅                        │
│ Node Positions      │ ❌                     │ ✅                        │
│ Connections         │ ❌                     │ ✅                        │
│ Importable to n8n   │ ❌                     │ ✅                        │
└─────────────────────┴────────────────────────┴───────────────────────────┘
```

### Data Structure

Returned complete structure includes:

- workflow.nodes[] - Node array
  - id (UUID)
  - name (node name)
  - type (node type)
  - position [x, y]
  - parameters (complete configuration)
  - typeVersion (version)

- workflow.connections - Connection relationships
  - Source node → Target node
  - Connection type (main, ai_tool, ai_languageModel, etc.)
  - Output index

## Implementation Phases

### Phase 1: Basic API Integration (Essential - Priority: High)

Time estimate: 4-5 hours

#### Task 1.1: Extend ApiCollector

File: `src/collectors/api-collector.ts`

Add methods:
```typescript
// 1. Fetch single workflow definition
public async fetchWorkflowDefinition(templateId: number): Promise<WorkflowDefinition>

// 2. Batch fetch workflow definitions (with concurrency control)
public async fetchMultipleWorkflows(
  templateIds: number[],
  concurrency?: number
): Promise<WorkflowDefinition[]>
```

Add type definitions:
```typescript
export interface WorkflowNode { ... }
export interface WorkflowConnections { ... }
export interface WorkflowDefinition { ... }
```

Considerations:
- Add request delays (recommend 1000ms)
- Error handling and retry mechanism
- Concurrency control (recommend 5 per batch)

#### Task 1.2: Unit Tests

File: `src/collectors/__tests__/api-collector.test.ts`

Test cases:
- Single workflow fetch
- Batch fetch
- Error handling
- Retry mechanism

### Phase 2: Caching Mechanism (Important - Priority: High)

Time estimate: 2-3 hours

#### Task 2.1: Cache Implementation

Avoid duplicate API requests, reduce build time.

File: `scripts/build.ts`

Features:
- Check if cache exists in data/cache/workflows/
- Only request uncached workflows
- Cache data format: `workflow-{id}.json`

Cache strategy:
- Cache validity: 7 days
- Can use --force parameter to clear cache

### Phase 3: TemplateGenerator Extension (Important - Priority: Medium)

Time estimate: 5-6 hours

#### Task 3.1: Generate Workflow Visualization

File: `src/generators/template-generator.ts`

Add methods:
```typescript
// Generate Mermaid flowchart
private generateWorkflowDiagram(workflow: WorkflowDefinition): string

// Generate node detailed configuration
private generateNodeDetails(workflow: WorkflowDefinition): string

// Generate connection relationship description
private generateConnectionDetails(workflow: WorkflowDefinition): string
```

Output format example:
```markdown
## Workflow Architecture

\`\`\`mermaid
graph LR
  N0[Example Chat] --> N1[AI Agent]
  N2[Get Weather] -->|ai_tool| N1
  N3[Get News] -->|ai_tool| N1
\`\`\`

## Node Configuration

### Example Chat (chatTrigger)
- Version: 1.1
- Position: (-176, -64)
- Parameters: public chat interface

### AI Agent (agent)
- Version: 2.2
- Position: (192, -64)
- Parameters: system message, tools

## Connection Relationships

Example Chat → AI Agent (main)
Get Weather → AI Agent (ai_tool)
Get News → AI Agent (ai_tool)
```

#### Task 3.2: Extend Template Interface

Update Template interface to include complete workflow:

```typescript
export interface TemplateWithWorkflow extends Template {
  workflowDefinition?: WorkflowDefinition;
}
```

### Phase 4: Security and Optimization (Secondary - Priority: Medium)

Time estimate: 3-4 hours

#### Task 4.1: Sensitive Information Filtering

Add utility functions:
```typescript
function sanitizeWorkflow(workflow: WorkflowDefinition): WorkflowDefinition
function detectSensitiveFields(workflow: WorkflowDefinition): string[]
```

Filtering rules:
- Remove credentials field
- Check parameters for sensitive keywords (apiKey, password, token, secret)
- Mark nodes containing sensitive information

#### Task 4.2: Output Size Optimization

Options:
1. Generate separate JSON files instead of embedding in markdown
2. Provide download links to n8n.io
3. Only embed structured summary, save complete JSON separately

Recommended approach:
```
output/
└── templates/
    ├── ai-chatbots/
    │   ├── README.md
    │   ├── 6270-build-your-first-ai-agent.md  (includes visualization and summary)
    │   └── workflows/
    │       └── 6270.json  (complete workflow definition)
    └── ...
```

### Phase 5: Integration and Testing (Essential - Priority: High)

Time estimate: 3-4 hours

#### Task 5.1: Integrate into Build Process

File: `scripts/build.ts`

Add build step:
```typescript
// Step 3.5: Fetch workflow definitions
async function fetchWorkflowDefinitions(
  templates: Template[]
): Promise<Map<number, WorkflowDefinition>> {
  // 1. Select top 50 most popular templates
  // 2. Check cache
  // 3. Batch fetch uncached ones
  // 4. Save cache
  // 5. Return results
}
```

#### Task 5.2: End-to-End Testing

Test cases:
- Complete build process (npm run build:full)
- Cache mechanism verification
- Generated markdown format correctness
- Mermaid diagrams render correctly
- Sensitive information filtered

#### Task 5.3: Documentation Updates

Update files:
- README.md - Add new feature description
- CLAUDE.md - Update architecture description
- docs/ - Usage instructions

## Time Total

- Phase 1: 4-5 hours (Basic API)
- Phase 2: 2-3 hours (Caching)
- Phase 3: 5-6 hours (Generator)
- Phase 4: 3-4 hours (Security)
- Phase 5: 3-4 hours (Integration)

Total: 17-22 hours

## Priority Recommendations

### First Priority (MVP - Minimum Viable Product)

1. Phase 1: API Integration (4-5h)
2. Phase 2: Caching Mechanism (2-3h)
3. Phase 5: Basic Integration (2h)

MVP Total Time: 8-10 hours

Features:
- Can fetch complete workflow definitions
- Has caching to avoid duplicate requests
- Can execute build normally

### Second Priority (Enhanced Features)

4. Phase 3: Visualization Generation (5-6h)

Features:
- Generate Mermaid flowcharts
- Display node configurations
- Connection relationship descriptions

### Third Priority (Refinement and Security)

5. Phase 4: Security Filtering (3-4h)
6. Phase 5: Complete Testing (2-3h)

Features:
- Sensitive information filtering
- Complete test coverage
- Documentation updates

## Technical Risks and Mitigation

### Risk 1: API Rate Limiting

Probability: Medium
Impact: High

Mitigation measures:
- Implement request delays (1000ms)
- Concurrency control (max 5)
- Use caching to reduce requests
- Add retry mechanism

### Risk 2: Data Too Large

Probability: High
Impact: Medium

Mitigation measures:
- Generate separate JSON files
- Only include summary in markdown
- Limit template quantity (top 50)

### Risk 3: Sensitive Information Leakage

Probability: Medium
Impact: High

Mitigation measures:
- Implement sensitive field detection
- Filter credentials
- Add warning markers
- Recommend user review

## Success Metrics

After implementation completion, should achieve:

1. Functional Metrics
   - ✅ Can fetch complete workflow definitions
   - ✅ Includes node parameters and connection relationships
   - ✅ Generates visualization flowcharts
   - ✅ Caching mechanism works properly

2. Performance Metrics
   - ⏱️ Build time < 10 minutes (with cache)
   - ⏱️ API requests < 60 (50 templates + retries)
   - 📦 Total output file size < 50MB

3. Quality Metrics
   - 🔒 No sensitive information leakage
   - 📝 Complete and clear documentation
   - ✅ Test coverage > 80%
   - 🎨 Markdown formatting correct

## Next Steps

Recommended execution order:

1. Complete MVP first (Phase 1 + 2 + basic integration)
2. Verify feasibility and performance
3. Then implement visualization features
4. Finally refine security and testing
