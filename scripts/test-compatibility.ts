/**
 * Copyright (c) 2025 Frank Chen @ www.frankchen.tw/personal
 * SPDX-License-Identifier: MIT
 *
 * Test script for CompatibilityAnalyzer
 */

import { InputOutputParser } from '../src/parsers/input-output-parser';
import { CompatibilityAnalyzer } from '../src/analyzers/compatibility-analyzer';
import type { NodeConnectionInfo } from '../src/models/connection';

async function testCompatibilityAnalyzer() {
  const parser = new InputOutputParser();
  const analyzer = new CompatibilityAnalyzer();

  // Collect I/O information for test nodes
  const testNodes: NodeConnectionInfo[] = [];

  // 1. Webhook (Trigger)
  try {
    const WebhookClass = require('n8n-nodes-base/dist/nodes/Webhook/Webhook.node.js').Webhook;
    const webhookIO = parser.parseNodeInputOutput(WebhookClass);
    testNodes.push({
      nodeType: webhookIO.nodeType,
      displayName: 'Webhook',
      inputTypes: webhookIO.inputTypes,
      outputTypes: webhookIO.outputTypes,
      isMultiInput: webhookIO.isMultiInput,
      isMultiOutput: webhookIO.isMultiOutput,
      requiresSpecialInputs: webhookIO.requiresSpecialInputs,
      category: 'trigger',
      outputCount: webhookIO.outputCount,
      outputNames: webhookIO.outputNames,
      isDynamicOutput: webhookIO.isDynamicOutput
    });
  } catch (error) {
    console.error('Failed to load Webhook');
  }

  // 2. HTTP Request
  try {
    const HttpRequestClass = require('n8n-nodes-base/dist/nodes/HttpRequest/V3/HttpRequestV3.node.js').HttpRequestV3;
    const httpIO = parser.parseNodeInputOutput(HttpRequestClass);
    testNodes.push({
      nodeType: httpIO.nodeType || 'httpRequest',
      displayName: 'HTTP Request',
      inputTypes: httpIO.inputTypes,
      outputTypes: httpIO.outputTypes,
      isMultiInput: httpIO.isMultiInput,
      isMultiOutput: httpIO.isMultiOutput,
      requiresSpecialInputs: httpIO.requiresSpecialInputs,
      category: 'action',
      outputCount: httpIO.outputCount,
      outputNames: httpIO.outputNames,
      isDynamicOutput: httpIO.isDynamicOutput
    });
  } catch (error) {
    console.error('Failed to load HTTP Request');
  }

  // 3. Slack
  try {
    const SlackClass = require('n8n-nodes-base/dist/nodes/Slack/Slack.node.js').Slack;
    const slackIO = parser.parseNodeInputOutput(SlackClass);
    testNodes.push({
      nodeType: slackIO.nodeType,
      displayName: 'Slack',
      inputTypes: slackIO.inputTypes,
      outputTypes: slackIO.outputTypes,
      isMultiInput: slackIO.isMultiInput,
      isMultiOutput: slackIO.isMultiOutput,
      requiresSpecialInputs: slackIO.requiresSpecialInputs,
      category: 'action',
      outputCount: slackIO.outputCount,
      outputNames: slackIO.outputNames,
      isDynamicOutput: slackIO.isDynamicOutput
    });
  } catch (error) {
    console.error('Failed to load Slack');
  }

  // 4. AI Agent
  try {
    const AgentClass = require('@n8n/n8n-nodes-langchain/dist/nodes/agents/Agent/Agent.node.js').Agent;
    const agentIO = parser.parseNodeInputOutput(AgentClass);
    testNodes.push({
      nodeType: agentIO.nodeType,
      displayName: 'AI Agent',
      inputTypes: agentIO.inputTypes,
      outputTypes: agentIO.outputTypes,
      isMultiInput: agentIO.isMultiInput,
      isMultiOutput: agentIO.isMultiOutput,
      requiresSpecialInputs: agentIO.requiresSpecialInputs,
      category: 'ai',
      outputCount: agentIO.outputCount,
      outputNames: agentIO.outputNames,
      isDynamicOutput: agentIO.isDynamicOutput
    });
  } catch (error) {
    console.error('Failed to load AI Agent');
  }

  // 5. OpenAI Chat Model
  try {
    const OpenAIClass = require('@n8n/n8n-nodes-langchain/dist/nodes/llms/LMChatOpenAi/LmChatOpenAi.node.js').LmChatOpenAi;
    const openaiIO = parser.parseNodeInputOutput(OpenAIClass);
    testNodes.push({
      nodeType: openaiIO.nodeType,
      displayName: 'OpenAI Chat Model',
      inputTypes: openaiIO.inputTypes,
      outputTypes: openaiIO.outputTypes,
      isMultiInput: openaiIO.isMultiInput,
      isMultiOutput: openaiIO.isMultiOutput,
      requiresSpecialInputs: openaiIO.requiresSpecialInputs,
      category: 'ai',
      outputCount: openaiIO.outputCount,
      outputNames: openaiIO.outputNames,
      isDynamicOutput: openaiIO.isDynamicOutput
    });
  } catch (error) {
    console.error('Failed to load OpenAI Chat Model');
  }

  console.log(`\nCollected ${testNodes.length} nodes\n`);

  // Build compatibility matrix
  console.log('===== Building Compatibility Matrix =====\n');
  const matrix = analyzer.buildCompatibilityMatrix(testNodes);

  // Display compatible connections for each node
  for (const node of testNodes) {
    console.log(`\n【${node.displayName}】`);
    console.log(`  Input types: ${node.inputTypes.join(', ') || 'None'}`);
    console.log(`  Output types: ${node.outputTypes.join(', ')}`);

    const recommended = analyzer.getRecommendedConnections(node.nodeType, matrix, 3);
    if (recommended.length > 0) {
      console.log('  Recommended connections:');
      recommended.forEach((rec, idx) => {
        const targetNode = testNodes.find(n => n.nodeType === rec.targetNode);
        console.log(`    ${idx + 1}. ${targetNode?.displayName || rec.targetNode} (Score: ${rec.score})`);
        console.log(`       Reason: ${rec.reason}`);
      });
    } else {
      console.log('  Recommended connections: None');
    }
  }

  // Test specific connections
  console.log('\n\n===== Testing Specific Connections =====');
  console.log('\n1. Webhook → HTTP Request');
  const webhookToHttp = analyzer.isCompatible('webhook', 'httpRequest', matrix);
  const score1 = analyzer.getCompatibilityScore('webhook', 'httpRequest', matrix);
  console.log(`   Compatible: ${webhookToHttp}, Score: ${score1}`);

  console.log('\n2. HTTP Request → Slack');
  const httpToSlack = analyzer.isCompatible('httpRequest', 'slack', matrix);
  const score2 = analyzer.getCompatibilityScore('httpRequest', 'slack', matrix);
  console.log(`   Compatible: ${httpToSlack}, Score: ${score2}`);

  console.log('\n3. AI Agent → Slack');
  const agentToSlack = analyzer.isCompatible('agent', 'slack', matrix);
  const score3 = analyzer.getCompatibilityScore('agent', 'slack', matrix);
  console.log(`   Compatible: ${agentToSlack}, Score: ${score3}`);

  console.log('\n4. OpenAI Chat Model → AI Agent');
  const openaiToAgent = analyzer.isCompatible('lmChatOpenAi', 'agent', matrix);
  const score4 = analyzer.getCompatibilityScore('lmChatOpenAi', 'agent', matrix);
  console.log(`   Compatible: ${openaiToAgent}, Score: ${score4}`);
}

testCompatibilityAnalyzer().catch(console.error);
