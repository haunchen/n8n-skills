/**
 * Copyright (c) 2025 Frank Chen @ www.frankchen.tw/personal
 * SPDX-License-Identifier: MIT
 *
 * Test script for InputOutputParser
 */

import { InputOutputParser } from '../src/parsers/input-output-parser';

async function testIOParser() {
  const parser = new InputOutputParser();

  // Test 1: Slack node (simple node)
  console.log('\n===== Test 1: Slack Node =====');
  try {
    const SlackClass = require('n8n-nodes-base/dist/nodes/Slack/Slack.node.js').Slack;
    const slackIO = parser.parseNodeInputOutput(SlackClass);
    console.log(JSON.stringify(slackIO, null, 2));
  } catch (error) {
    console.error('Slack node test failed:', (error as Error).message);
  }

  // Test 2: AI Agent node (complex AI node)
  console.log('\n===== Test 2: AI Agent Node =====');
  try {
    const AgentClass = require('@n8n/n8n-nodes-langchain/dist/nodes/agents/Agent/Agent.node.js').Agent;
    const agentIO = parser.parseNodeInputOutput(AgentClass);
    console.log(JSON.stringify(agentIO, null, 2));
  } catch (error) {
    console.error('AI Agent node test failed:', (error as Error).message);
  }

  // Test 3: HTTP Request node
  console.log('\n===== Test 3: HTTP Request Node =====');
  try {
    const HttpRequestClass = require('n8n-nodes-base/dist/nodes/HttpRequest/V3/HttpRequestV3.node.js').HttpRequestV3;
    const httpIO = parser.parseNodeInputOutput(HttpRequestClass);
    console.log(JSON.stringify(httpIO, null, 2));
  } catch (error) {
    console.error('HTTP Request node test failed:', (error as Error).message);
  }

  // Test 4: Webhook Trigger node (Trigger node)
  console.log('\n===== Test 4: Webhook Trigger Node =====');
  try {
    const WebhookClass = require('n8n-nodes-base/dist/nodes/Webhook/Webhook.node.js').Webhook;
    const webhookIO = parser.parseNodeInputOutput(WebhookClass);
    console.log(JSON.stringify(webhookIO, null, 2));
  } catch (error) {
    console.error('Webhook node test failed:', (error as Error).message);
  }
}

testIOParser().catch(console.error);
