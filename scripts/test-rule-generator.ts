/**
 * Copyright (c) 2025 Frank Chen @ www.frankchen.tw/personal
 * SPDX-License-Identifier: MIT
 *
 * Test script for ConnectionRuleGenerator
 */

import { InputOutputParser } from '../src/parsers/input-output-parser';
import { CompatibilityAnalyzer } from '../src/analyzers/compatibility-analyzer';
import { ConnectionRuleGenerator } from '../src/generators/connection-rule-generator';
import type { NodeConnectionInfo } from '../src/models/connection';

async function testRuleGenerator() {
  const parser = new InputOutputParser();
  const analyzer = new CompatibilityAnalyzer();
  const ruleGenerator = new ConnectionRuleGenerator();

  // 收集測試節點
  const testNodes: NodeConnectionInfo[] = [];

  // 1. Webhook
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

  // 2. HTTP Request
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

  // 3. Slack
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

  // 4. AI Agent
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

  // 5. OpenAI Chat Model
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

  // 建立相容性矩陣
  const matrix = analyzer.buildCompatibilityMatrix(testNodes);

  console.log('===== 測試 1: Webhook 的連接指南 =====\n');
  const webhookGuide = ruleGenerator.generateNodeConnectionGuide(
    testNodes[0],
    matrix,
    testNodes,
    5
  );
  console.log(webhookGuide);

  console.log('\n\n===== 測試 2: AI Agent 的連接指南 =====\n');
  const agentGuide = ruleGenerator.generateNodeConnectionGuide(
    testNodes[3],
    matrix,
    testNodes,
    5
  );
  console.log(agentGuide);

  console.log('\n\n===== 測試 3: 相容性矩陣 =====\n');
  const matrixMd = ruleGenerator.generateCompatibilityMatrix(matrix, testNodes, 5);
  console.log(matrixMd);
}

testRuleGenerator().catch(console.error);
