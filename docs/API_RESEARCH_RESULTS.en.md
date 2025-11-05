# n8n.io API Research Results

[中文版](./API_RESEARCH_RESULTS.md) | English

Researcher: Claude Code
Research Date: 2025-11-03
Project: n8n-skills

---

## Executive Summary

Successfully researched and verified methods to obtain complete workflow definitions from n8n.io. Discovered that n8n.io provides a public API endpoint that can fetch workflow JSON including node configurations, connection relationships, and complete parameters, directly importable to n8n.

Key Findings:
- ✅ API endpoint confirmed available
- ✅ Returns complete workflow definitions
- ✅ Includes all necessary information (nodes, connections, parameters)
- ✅ Can be used directly to generate complete template documentation
- ⚠️ Requires separate request for each template (no batch endpoint)
- ⚠️ Need attention to sensitive information filtering

## Research Question

Original requirement:
> How to obtain complete workflow definitions from n8n.io (including node connections and configurations) to provide complete workflow structure in template files.

## Research Method

1. Analyze existing code (src/collectors/api-collector.ts)
2. Test existing API endpoint (/templates/search)
3. Explore other possible endpoints
4. Actually call and verify data structure
5. Evaluate implementation feasibility

## Research Results

### 1. Currently Used API

File: `src/collectors/api-collector.ts`

```typescript
// Current implementation
GET https://api.n8n.io/api/templates/search
Parameters:
  - page: Page number
  - rows: Items per page (max 100)
  - category: Category (optional)
  - search: Keywords (optional)
```

Returned data:
- ✅ Template basic info (id, name, description, views)
- ✅ Used node list (simplified)
- ❌ Node parameter configuration
- ❌ Node connection relationships
- ❌ Executable workflow JSON

Conclusion: Current API insufficient for obtaining complete workflow definitions.

### 2. Discovered Complete Workflow API

Through testing, discovered the following endpoint:

```bash
GET https://api.n8n.io/api/workflows/templates/{id}

# Example
curl https://api.n8n.io/api/workflows/templates/6270
```

Returned data structure:

```json
{
  "id": 6270,
  "name": "Build Your First AI Agent",
  "workflow": {
    "meta": {
      "instanceId": "...",
      "templateCredsSetupCompleted": true
    },
    "nodes": [
      {
        "id": "uuid",
        "name": "Example Chat",
        "type": "@n8n/n8n-nodes-langchain.chatTrigger",
        "position": [-176, -64],
        "parameters": {
          "public": true,
          "options": { ... }
        },
        "typeVersion": 1.1
      }
    ],
    "connections": {
      "Example Chat": {
        "main": [[
          {
            "node": "AI Agent",
            "type": "main",
            "index": 0
          }
        ]]
      }
    },
    "pinData": {}
  }
}
```

Verification results:
- ✅ Contains complete node array
- ✅ Each node contains complete parameters
- ✅ Contains node position information
- ✅ Contains complete connection relationships
- ✅ Directly importable to n8n
- ✅ Returned JSON format correct

Actual testing:

```bash
# Test 1: Get workflow name
$ curl -s "https://api.n8n.io/api/workflows/templates/6270" | jq '.name'
"Build Your First AI Agent"

# Test 2: Count nodes
$ curl -s "https://api.n8n.io/api/workflows/templates/6270" | jq '.workflow.nodes | length'
13

# Test 3: View connection relationships
$ curl -s "https://api.n8n.io/api/workflows/templates/6270" | jq '.workflow.connections | keys'
[
  "Connect Gemini",
  "Conversation Memory",
  "Example Chat",
  "Get News",
  "Get Weather"
]
```

Conclusion: This API fully meets requirements, can obtain complete workflow definitions.

### 3. API Feature Comparison

| Feature | /templates/search | /workflows/templates/{id} |
|---------|-------------------|---------------------------|
| Batch Query | ✅ Up to 100 | ❌ Single query |
| Template Basic Info | ✅ | ✅ |
| Node List | ✅ Simplified | ✅ Complete |
| Node Parameters | ❌ | ✅ |
| Node Positions | ❌ | ✅ |
| Connection Relationships | ❌ | ✅ |
| Complete Workflow | ❌ | ✅ |
| Importable to n8n | ❌ | ✅ |

Recommendation: Use both APIs together
1. Use /templates/search to get template list
2. Use /workflows/templates/{id} to get complete definitions

### 4. Data Structure Analysis

#### WorkflowNode Structure

```typescript
interface WorkflowNode {
  id: string;                    // UUID, unique node identifier
  name: string;                  // Display name
  type: string;                  // Node type (full path)
  position: [number, number];    // Canvas coordinates [x, y]
  parameters: Record<string, any>;  // Node parameter configuration
  typeVersion: number;           // Node version number
  credentials?: any;             // Credential configuration (may contain sensitive info)
  notes?: string;                // Node description
  cid?: string;                  // Creator ID
  creator?: string;              // Creator name
  webhookId?: string;            // Webhook ID (trigger nodes)
}
```

#### WorkflowConnections Structure

```typescript
interface WorkflowConnections {
  [sourceNodeName: string]: {
    [outputType: string]: Array<Array<{
      node: string;      // Target node name
      type: string;      // Connection type
      index: number;     // Output index
    }>>;
  };
}
```

Connection types include:
- `main` - Main output
- `ai_tool` - AI tool connection
- `ai_languageModel` - Language model connection
- `ai_memory` - Memory connection
- Other custom types

### 5. Implementation Feasibility Assessment

#### Advantages
- ✅ API publicly available, no authentication required
- ✅ Returns complete data, meets all requirements
- ✅ Standard JSON format, easy to parse
- ✅ Can be used directly to generate documentation
- ✅ Supports import to n8n

#### Challenges
- ⚠️ Only single queries, requires multiple requests
- ⚠️ May have rate limiting
- ⚠️ Returned data may contain sensitive information
- ⚠️ Workflow JSON may be very large

#### Mitigation Solutions
- Implement batch request control (concurrency limit + delays)
- Use caching mechanism to reduce requests
- Implement sensitive information filtering
- Generate separate files instead of embedding in markdown

Conclusion: Completely feasible, estimated implementation time 17-22 hours.

## Solutions

### Solution 1: Complete Implementation (Recommended)

Integrate complete workflow definitions into project:

1. Extend ApiCollector
   - Add fetchWorkflowDefinition() method
   - Add fetchMultipleWorkflows() batch method
   - Add type definitions

2. Implement Caching Mechanism
   - Cache workflow definitions to data/cache/workflows/
   - Avoid duplicate API requests

3. Extend TemplateGenerator
   - Generate Mermaid flowcharts
   - Generate node configuration descriptions
   - Generate connection relationship diagrams
   - Generate separate JSON files

4. Security Handling
   - Filter sensitive information
   - Detect credential fields
   - Add warning markers

Advantages:
- Provides complete workflow information
- Users can directly import to n8n
- Visualization helps understanding

Disadvantages:
- Longer development time (17-22h)
- Increases build time
- Need to manage cache

### Solution 2: Minimum Implementation (MVP)

Implement only basic features:

1. Extend ApiCollector (4-5h)
2. Implement Caching Mechanism (2-3h)
3. Basic Integration (2h)

Advantages:
- Quick completion (8-10h)
- Low risk
- Can verify feasibility

Disadvantages:
- Incomplete features
- Missing visualization
- Poor user experience

### Solution 3: Hybrid Approach (Alternative)

Use external links instead of full embedding:

Add to template documentation:
```markdown
## Workflow Definition

Complete workflow definition available from:
- [View on n8n.io](https://n8n.io/workflows/6270)
- [Download JSON](https://api.n8n.io/api/workflows/templates/6270)
```

Advantages:
- Simple implementation (1h)
- No API request burden
- Data always up-to-date

Disadvantages:
- Missing visualization
- Requires network connection
- Poor user experience

## Recommendations

Based on research results, recommend Solution 1 (Complete Implementation), executed in phases:

### Phase 1: MVP (8-10 hours)
- Implement basic API calls
- Implement caching mechanism
- Verify feasibility

### Phase 2: Enhanced Features (5-6 hours)
- Generate visualization flowcharts
- Display node configurations
- Connection relationship descriptions

### Phase 3: Refinement (5-6 hours)
- Sensitive information filtering
- Complete testing
- Documentation updates

Total time: 18-22 hours

## Technical Documentation

Created the following documents:

1. Complete Research Report
   - File: `docs/workflow-api-research.md` (14KB)
   - Content: Detailed API documentation, data structures, implementation examples

2. Quick Summary
   - File: `docs/workflow-api-summary.md` (3.6KB)
   - Content: Key highlights, implementation recommendations, action plan

3. Implementation Plan
   - File: `docs/IMPLEMENTATION_PLAN.md`
   - Content: Phased implementation plan, time estimates, risk assessment

4. Code Examples
   - File: `examples/api-test.ts`
   - Content: Simple API test code

   - File: `examples/api-response-sample.json`
   - Content: Actual API response example

5. Usage Instructions
   - File: `examples/README.md`
   - Content: Quick test commands and usage examples

## Immediately Available Test Commands

```bash
# 1. Test API availability
curl -s "https://api.n8n.io/api/workflows/templates/6270" | jq '.name'

# 2. View complete structure
curl -s "https://api.n8n.io/api/workflows/templates/6270" | jq '.' | head -100

# 3. Count nodes
curl -s "https://api.n8n.io/api/workflows/templates/6270" | jq '.workflow.nodes | length'

# 4. List node types
curl -s "https://api.n8n.io/api/workflows/templates/6270" | jq '.workflow.nodes[].type' | sort -u

# 5. View connection relationships
curl -s "https://api.n8n.io/api/workflows/templates/6270" | jq '.workflow.connections'

# 6. Download complete JSON
curl -s "https://api.n8n.io/api/workflows/templates/6270" > workflow-6270.json
```

## Conclusion

Research completed successfully, all research objectives achieved:

1. ✅ Found API to obtain complete workflow definitions
2. ✅ Verified data structure contains all necessary information
3. ✅ Confirmed implementation feasibility
4. ✅ Provided concrete implementation solutions
5. ✅ Assessed implementation difficulty and time
6. ✅ Created complete technical documentation

Next step: Start development according to implementation plan, recommend completing MVP phase first to verify feasibility.

---

Research report completion date: 2025-11-03
