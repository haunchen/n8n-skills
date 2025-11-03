/**
 * Copyright (c) 2025 Frank Chen @ www.frankchen.tw/personal
 * SPDX-License-Identifier: MIT
 *
 * Test script for InputOutputParser
 */

import { InputOutputParser } from '../src/parsers/input-output-parser';

async function testIOParser() {
  const parser = new InputOutputParser();

  // 測試 1: Slack 節點（簡單節點）
  console.log('\n===== 測試 1: Slack 節點 =====');
  try {
    const SlackClass = require('n8n-nodes-base/dist/nodes/Slack/Slack.node.js').Slack;
    const slackIO = parser.parseNodeInputOutput(SlackClass);
    console.log(JSON.stringify(slackIO, null, 2));
  } catch (error) {
    console.error('Slack 節點測試失敗:', (error as Error).message);
  }

  // 測試 2: AI Agent 節點（複雜 AI 節點）
  console.log('\n===== 測試 2: AI Agent 節點 =====');
  try {
    const AgentClass = require('@n8n/n8n-nodes-langchain/dist/nodes/agents/Agent/Agent.node.js').Agent;
    const agentIO = parser.parseNodeInputOutput(AgentClass);
    console.log(JSON.stringify(agentIO, null, 2));
  } catch (error) {
    console.error('AI Agent 節點測試失敗:', (error as Error).message);
  }

  // 測試 3: HTTP Request 節點
  console.log('\n===== 測試 3: HTTP Request 節點 =====');
  try {
    const HttpRequestClass = require('n8n-nodes-base/dist/nodes/HttpRequest/V3/HttpRequestV3.node.js').HttpRequestV3;
    const httpIO = parser.parseNodeInputOutput(HttpRequestClass);
    console.log(JSON.stringify(httpIO, null, 2));
  } catch (error) {
    console.error('HTTP Request 節點測試失敗:', (error as Error).message);
  }

  // 測試 4: Webhook 觸發器（Trigger 節點）
  console.log('\n===== 測試 4: Webhook Trigger 節點 =====');
  try {
    const WebhookClass = require('n8n-nodes-base/dist/nodes/Webhook/Webhook.node.js').Webhook;
    const webhookIO = parser.parseNodeInputOutput(WebhookClass);
    console.log(JSON.stringify(webhookIO, null, 2));
  } catch (error) {
    console.error('Webhook 節點測試失敗:', (error as Error).message);
  }
}

testIOParser().catch(console.error);
