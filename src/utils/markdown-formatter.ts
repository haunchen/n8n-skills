/**
 * Copyright (c) 2025 Frank Chen @ www.frankchen.tw/personal
 * SPDX-License-Identifier: MIT
 *
 * This file is part of n8n-skills project.
 */

export function formatHeading(text: string, level: number = 1): string {
  const hash = '#'.repeat(Math.max(1, Math.min(6, level)));
  return `${hash} ${text}\n`;
}

export function formatList(items: string[], ordered: boolean = false): string {
  return items
    .map((item, index) => {
      const prefix = ordered ? `${index + 1}.` : '-';
      return `${prefix} ${item}`;
    })
    .join('\n');
}

export function formatTable(headers: string[], rows: string[][]): string {
  if (headers.length === 0 || rows.length === 0) {
    return '';
  }

  const headerRow = `| ${headers.join(' | ')} |`;
  const separator = `| ${headers.map(() => '---').join(' | ')} |`;
  const dataRows = rows.map(row => `| ${row.join(' | ')} |`).join('\n');

  return `${headerRow}\n${separator}\n${dataRows}`;
}

export function formatCodeBlock(code: string, language: string = ''): string {
  return `\`\`\`${language}\n${code}\n\`\`\``;
}

export function formatLink(text: string, url: string): string {
  return `[${text}](${url})`;
}

export function escapeMarkdown(text: string): string {
  const specialChars = ['\\', '`', '*', '_', '{', '}', '[', ']', '(', ')', '#', '+', '-', '.', '!', '|'];
  let escaped = text;

  for (const char of specialChars) {
    escaped = escaped.replace(new RegExp(`\\${char}`, 'g'), `\\${char}`);
  }

  return escaped;
}
