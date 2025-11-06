# n8n.io Workflow API Research Summary

[中文版](./workflow-api-summary.md) | English

Research Date: 2025-11-03

## Key Findings

Successfully discovered the complete workflow definition API provided by n8n.io!

### Key API Endpoint

```
GET https://api.n8n.io/api/workflows/templates/{id}
```

This API returns complete workflow definitions, including:
- Complete configuration for all nodes
- Connection relationships between nodes
- Node parameter settings
- JSON format directly importable to n8n

## Quick Test

```bash
# Test fetching workflow definition
curl https://api.n8n.io/api/workflows/templates/6270 | jq '.'

# Check node count
curl -s https://api.n8n.io/api/workflows/templates/6270 | jq '.workflow.nodes | length'

# View connection relationships
curl -s https://api.n8n.io/api/workflows/templates/6270 | jq '.workflow.connections'
```

## API Comparison

| Feature | /templates/search | /workflows/templates/{id} |
|---------|-------------------|---------------------------|
| Batch Query | ✅ Can fetch multiple | ❌ Single query |
| Node List | ✅ Simplified | ✅ Complete |
| Node Parameters | ❌ | ✅ |
| Connection Relationships | ❌ | ✅ |
| Importable to n8n | ❌ | ✅ |

## Response Data Structure

```typescript
{
  id: number,
  name: string,
  workflow: {
    meta: {
      instanceId: string,
      templateCredsSetupCompleted: boolean
    },
    nodes: [
      {
        id: string,              // Node UUID
        name: string,            // Node name
        type: string,            // Node type
        position: [x, y],        // Canvas position
        parameters: {...},       // Complete parameter configuration
        typeVersion: number      // Node version
      }
    ],
    connections: {
      "Source Node Name": {
        "Output Type": [[
          {
            node: "Target Node Name",
            type: "Connection Type",
            index: 0
          }
        ]]
      }
    }
  }
}
```

## Implementation Recommendations

### 1. Extend ApiCollector (Priority: High)

Add method to `src/collectors/api-collector.ts`:

```typescript
public async fetchWorkflowDefinition(templateId: number) {
  const response = await this.client.get(
    `/workflows/templates/${templateId}`
  );
  return response.data;
}
```

### 2. Batch Fetch Control (Priority: High)

Since only single queries are supported, implement:
- Batch request control (recommend 5 per batch)
- Request delays (recommend 1000ms)
- Error handling and retry mechanism

### 3. Extend TemplateGenerator (Priority: Medium)

Add to generated markdown:
- Workflow visualization (Mermaid diagrams)
- Node detailed configuration descriptions
- Connection relationship diagrams
- Optional: Complete workflow JSON

### 4. Security Checks (Priority: Medium)

- Check and filter sensitive information (API keys, tokens)
- Sanitize credential fields
- Add warning markers

## Implementation Time Estimation

- Basic API calls: 2-3 hours
- Batch control and caching: 2 hours
- Generator extension: 3-4 hours
- Testing and debugging: 2 hours
- Total: approximately 9-11 hours

## Example Files

- Research report: `docs/workflow-api-research.md`
- API testing: `examples/api-test.ts`
- Complete example: `examples/workflow-api-example.ts` (to be completed)

## Considerations

1. Rate Limiting
   - API may have request frequency limits
   - Recommend adding delays and retry mechanisms
   - Use caching to avoid duplicate requests

2. Data Size
   - Complete workflow JSON can be very large
   - Consider providing download links rather than direct embedding
   - Or generate separate JSON files

3. Sensitive Information
   - Workflows may contain credential configurations
   - Need to check and filter sensitive fields
   - Should not store actual API keys or tokens

## Next Steps

1. ✅ Confirm API availability and data structure
2. ⬜ Implement fetchWorkflowDefinition method
3. ⬜ Implement batch fetching and caching mechanism
4. ⬜ Extend TemplateGenerator to generate complete documentation
5. ⬜ Add security checks and sensitive information filtering
6. ⬜ Integrate into main build process
7. ⬜ Testing and documentation updates
