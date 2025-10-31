/**
 * Copyright (c) 2025 Frank Chen @ www.frankchen.tw/personal
 * SPDX-License-Identifier: MIT
 *
 * This file is part of n8n-skills project.
 */

/**
 * Documentation Parser
 * 解析和提取文件內容的關鍵資訊
 */

export interface ParsedDocumentation {
  description: string;
  usage: string;
  examples: string[];
  keywords: string[];
  tags: string[];
  officialUrl?: string;
}

export interface ParseOptions {
  maxSummaryLength?: number;
  maxExamples?: number;
  extractKeywords?: boolean;
}

const DEFAULT_OPTIONS: Required<ParseOptions> = {
  maxSummaryLength: 300,
  maxExamples: 3,
  extractKeywords: true,
};

/**
 * 清理 Markdown 格式，移除標記符號
 */
export function cleanMarkdown(text: string): string {
  if (!text) return '';

  return text
    // 移除標題標記
    .replace(/^#{1,6}\s+/gm, '')
    // 移除粗體和斜體標記
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    // 移除程式碼區塊標記
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`(.+?)`/g, '$1')
    // 移除連結但保留文字
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    // 移除圖片
    .replace(/!\[.*?\]\(.+?\)/g, '')
    // 移除列表標記
    .replace(/^[\s]*[-*+]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    // 移除引用標記
    .replace(/^>\s+/gm, '')
    // 移除水平線
    .replace(/^[-*_]{3,}$/gm, '')
    // 移除多餘空白
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * 截斷文字到指定長度，保持完整句子
 */
export function truncateText(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text;

  const truncated = text.substring(0, maxLength);
  const lastPeriod = truncated.lastIndexOf('。');
  const lastDot = truncated.lastIndexOf('.');
  const lastBreak = Math.max(lastPeriod, lastDot);

  if (lastBreak > maxLength * 0.7) {
    return truncated.substring(0, lastBreak + 1);
  }

  return truncated + '...';
}

/**
 * 從文字中提取關鍵字
 */
export function extractKeywords(text: string): string[] {
  if (!text) return [];

  const cleaned = cleanMarkdown(text).toLowerCase();

  // 常見停用詞
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
    'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those',
    '的', '了', '是', '在', '有', '和', '與', '或', '但', '如果', '因為',
  ]);

  // 提取單字（包含中文字元）
  const words = cleaned
    .split(/[\s,;.:!?()\[\]{}"']+/)
    .filter(word => {
      return word.length > 2 &&
             !stopWords.has(word) &&
             !/^\d+$/.test(word);
    });

  // 計算詞頻
  const frequency = new Map<string, number>();
  for (const word of words) {
    frequency.set(word, (frequency.get(word) || 0) + 1);
  }

  // 返回頻率最高的前 10 個關鍵字
  return Array.from(frequency.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);
}

/**
 * 提取文件中的描述部分
 */
export function extractDescription(content: string): string {
  const lines = content.split('\n');
  const descriptionLines: string[] = [];
  let inDescription = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // 檢測描述相關的標題
    if (/^#{1,3}\s*(description|概述|簡介|說明)/i.test(trimmed)) {
      inDescription = true;
      continue;
    }

    // 遇到下一個章節標題則停止
    if (inDescription && /^#{1,3}\s+/.test(trimmed)) {
      break;
    }

    if (inDescription && trimmed) {
      descriptionLines.push(trimmed);
    }
  }

  // 如果沒有找到描述章節，使用前幾段
  if (descriptionLines.length === 0) {
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !/^#{1,6}\s+/.test(trimmed)) {
        descriptionLines.push(trimmed);
        if (descriptionLines.length >= 3) break;
      }
    }
  }

  return descriptionLines.join(' ');
}

/**
 * 提取文件中的使用說明
 */
export function extractUsage(content: string): string {
  const lines = content.split('\n');
  const usageLines: string[] = [];
  let inUsage = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (/^#{1,3}\s*(usage|使用|用法|how to use)/i.test(trimmed)) {
      inUsage = true;
      continue;
    }

    if (inUsage && /^#{1,3}\s+/.test(trimmed)) {
      break;
    }

    if (inUsage && trimmed) {
      usageLines.push(trimmed);
    }
  }

  return usageLines.join(' ');
}

/**
 * 提取文件中的範例
 */
export function extractExamples(content: string, maxExamples: number = 3): string[] {
  const examples: string[] = [];
  const lines = content.split('\n');
  let inExample = false;
  let currentExample: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // 檢測範例相關的標題
    if (/^#{1,4}\s*(example|範例|示例)/i.test(trimmed)) {
      if (currentExample.length > 0) {
        examples.push(currentExample.join('\n'));
        currentExample = [];
      }
      inExample = true;
      continue;
    }

    // 程式碼區塊
    if (trimmed.startsWith('```')) {
      if (inExample) {
        currentExample.push(line);
      }
      continue;
    }

    // 遇到新的主要章節標題則停止當前範例
    if (/^#{1,3}\s+/.test(trimmed) && !trimmed.toLowerCase().includes('example')) {
      if (currentExample.length > 0) {
        examples.push(currentExample.join('\n'));
        currentExample = [];
      }
      inExample = false;
      continue;
    }

    if (inExample && trimmed) {
      currentExample.push(line);
    }
  }

  // 加入最後一個範例
  if (currentExample.length > 0) {
    examples.push(currentExample.join('\n'));
  }

  return examples.slice(0, maxExamples);
}

/**
 * 從內容中提取標籤
 */
export function extractTags(content: string): string[] {
  const tags = new Set<string>();

  // 查找明確標記的標籤
  const tagMatches = content.match(/(?:tags?|標籤):\s*([^\n]+)/gi);
  if (tagMatches) {
    for (const match of tagMatches) {
      const tagList = match.split(':')[1];
      const extractedTags = tagList.split(/[,;、]/);
      for (const tag of extractedTags) {
        const cleaned = tag.trim().toLowerCase();
        if (cleaned) tags.add(cleaned);
      }
    }
  }

  // 從內容中識別常見技術標籤
  const techPatterns = [
    /\b(api|rest|graphql|webhook|http|https)\b/gi,
    /\b(json|xml|yaml|csv)\b/gi,
    /\b(database|sql|mongodb|postgresql|mysql)\b/gi,
    /\b(auth|oauth|jwt|token)\b/gi,
    /\b(email|smtp|imap)\b/gi,
    /\b(file|upload|download|storage)\b/gi,
  ];

  for (const pattern of techPatterns) {
    const matches = content.match(pattern);
    if (matches) {
      for (const match of matches) {
        tags.add(match.toLowerCase());
      }
    }
  }

  return Array.from(tags);
}

/**
 * 生成官方文件連結
 */
export function generateOfficialUrl(nodeName: string): string {
  const cleanName = nodeName
    .replace(/^n8n-nodes-/, '')
    .replace(/[^a-zA-Z0-9-]/g, '-')
    .toLowerCase();

  return `https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.${cleanName}/`;
}

/**
 * 解析完整文件內容
 */
export function parseDocumentation(
  content: string,
  nodeName: string,
  options: ParseOptions = {}
): ParsedDocumentation {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // 提取各個章節
  const description = extractDescription(content);
  const usage = extractUsage(content);
  const examples = extractExamples(content, opts.maxExamples);

  // 清理並截斷描述
  const cleanedDescription = cleanMarkdown(description);
  const truncatedDescription = truncateText(cleanedDescription, opts.maxSummaryLength);

  // 清理使用說明
  const cleanedUsage = cleanMarkdown(usage);
  const truncatedUsage = truncateText(cleanedUsage, opts.maxSummaryLength);

  // 清理範例
  const cleanedExamples = examples.map(ex => cleanMarkdown(ex));

  // 提取關鍵字和標籤
  const keywords = opts.extractKeywords ? extractKeywords(content) : [];
  const tags = extractTags(content);

  // 生成官方連結
  const officialUrl = generateOfficialUrl(nodeName);

  return {
    description: truncatedDescription,
    usage: truncatedUsage,
    examples: cleanedExamples,
    keywords,
    tags,
    officialUrl,
  };
}
