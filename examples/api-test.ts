// Simple API test example
import axios from 'axios';

async function testWorkflowAPI() {
  const templateId = 6270;
  const url = `https://api.n8n.io/api/workflows/templates/${templateId}`;
  
  console.log('Testing n8n Workflow API...');
  console.log('URL:', url);
  
  const response = await axios.get(url);
  const data = response.data;
  
  console.log('\nWorkflow Name:', data.name);
  console.log('Nodes Count:', data.workflow.nodes.length);
  console.log('Connections:', Object.keys(data.workflow.connections).length);
  
  return data;
}

testWorkflowAPI().catch(console.error);
