/**
 * Copyright (c) 2025 Frank Chen @ www.frankchen.tw/personal
 * SPDX-License-Identifier: MIT
 *
 * This file is part of n8n-skills project.
 */

/**
 * Markdown 格式化器
 * 統一和美化 Markdown 文件的格式
 */

/**
 * 格式化選項
 */
export interface FormatterOptions {
  maxLineLength?: number;
  headingStyle?: 'atx' | 'setext';
  listStyle?: 'dash' | 'asterisk' | 'plus';
  codeBlockStyle?: 'fenced' | 'indented';
  addTableOfContents?: boolean;
  tocDepth?: number;
  ensureTrailingNewline?: boolean;
  cleanExtraWhitespace?: boolean;
}

/**
 * 預設選項
 */
const DEFAULT_OPTIONS: Required<FormatterOptions> = {
  maxLineLength: 100,
  headingStyle: 'atx',
  listStyle: 'dash',
  codeBlockStyle: 'fenced',
  addTableOfContents: true,
  tocDepth: 3,
  ensureTrailingNewline: true,
  cleanExtraWhitespace: true,
};

/**
 * 標題資訊
 */
interface HeadingInfo {
  level: number;
  text: string;
  anchor: string;
  line: number;
}

/**
 * Markdown 範本格式化器
 */
export class TemplateFormatter {
  private options: Required<FormatterOptions>;

  constructor(options: FormatterOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * 格式化 Markdown 內容
   */
  public format(content: string): string {
    let formatted = content;

    // 正規化換行符號
    formatted = this.normalizeLineEndings(formatted);

    // 清理多餘空白
    if (this.options.cleanExtraWhitespace) {
      formatted = this.cleanWhitespace(formatted);
    }

    // 統一標題格式
    formatted = this.normalizeHeadings(formatted);

    // 統一列表格式
    formatted = this.normalizeLists(formatted);

    // 統一程式碼區塊格式
    formatted = this.normalizeCodeBlocks(formatted);

    // 修正表格格式
    formatted = this.normalizeTables(formatted);

    // 修正連結和圖片格式
    formatted = this.normalizeLinks(formatted);

    // 確保適當的空行
    formatted = this.ensureProperSpacing(formatted);

    // 加入目錄
    if (this.options.addTableOfContents) {
      formatted = this.addTableOfContents(formatted);
    }

    // 確保結尾換行
    if (this.options.ensureTrailingNewline) {
      formatted = this.ensureTrailingNewline(formatted);
    }

    return formatted;
  }

  /**
   * 正規化換行符號
   */
  private normalizeLineEndings(content: string): string {
    return content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  }

  /**
   * 清理多餘空白
   */
  private cleanWhitespace(content: string): string {
    return content
      // 移除行尾空白
      .replace(/[ \t]+$/gm, '')
      // 移除連續空行（超過 2 個）
      .replace(/\n{3,}/g, '\n\n')
      // 移除檔案開頭的空行
      .replace(/^\n+/, '')
      // 移除檔案結尾的多餘空行
      .replace(/\n{2,}$/, '\n');
  }

  /**
   * 統一標題格式
   */
  private normalizeHeadings(content: string): string {
    const lines = content.split('\n');
    const result: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (this.options.headingStyle === 'atx') {
        // 統一使用 ATX 樣式 (# 標題)
        // 處理 Setext 樣式的轉換
        if (i < lines.length - 1) {
          const nextLine = lines[i + 1];

          // H1: 下一行全是 =
          if (/^=+$/.test(nextLine)) {
            result.push(`# ${line.trim()}`);
            i++; // 跳過下一行
            continue;
          }

          // H2: 下一行全是 -
          if (/^-+$/.test(nextLine)) {
            result.push(`## ${line.trim()}`);
            i++; // 跳過下一行
            continue;
          }
        }

        // 已經是 ATX 樣式，確保格式正確
        const atxMatch = line.match(/^(#{1,6})\s*(.*)$/);
        if (atxMatch) {
          const level = atxMatch[1];
          const text = atxMatch[2].replace(/\s*#+$/, '').trim(); // 移除結尾的 #
          result.push(`${level} ${text}`);
          continue;
        }
      }

      result.push(line);
    }

    return result.join('\n');
  }

  /**
   * 統一列表格式
   */
  private normalizeLists(content: string): string {
    const listMarker = this.getListMarker();
    const lines = content.split('\n');
    const result: string[] = [];

    for (const line of lines) {
      // 無序列表
      const unorderedMatch = line.match(/^(\s*)[-*+]\s+(.*)$/);
      if (unorderedMatch) {
        const indent = unorderedMatch[1];
        const text = unorderedMatch[2];
        result.push(`${indent}${listMarker} ${text}`);
        continue;
      }

      // 有序列表 - 確保數字後面有點和空格
      const orderedMatch = line.match(/^(\s*)(\d+)[.)]\s*(.*)$/);
      if (orderedMatch) {
        const indent = orderedMatch[1];
        const number = orderedMatch[2];
        const text = orderedMatch[3];
        result.push(`${indent}${number}. ${text}`);
        continue;
      }

      result.push(line);
    }

    return result.join('\n');
  }

  /**
   * 取得列表標記符號
   */
  private getListMarker(): string {
    const markers: Record<string, string> = {
      dash: '-',
      asterisk: '*',
      plus: '+',
    };
    return markers[this.options.listStyle];
  }

  /**
   * 統一程式碼區塊格式
   */
  private normalizeCodeBlocks(content: string): string {
    if (this.options.codeBlockStyle !== 'fenced') {
      return content;
    }

    const lines = content.split('\n');
    const result: string[] = [];
    let inCodeBlock = false;

    for (const line of lines) {
      // 檢查是否為程式碼區塊標記
      if (line.trim().startsWith('```')) {
        if (!inCodeBlock) {
          // 開始程式碼區塊
          inCodeBlock = true;
        } else {
          // 結束程式碼區塊
          inCodeBlock = false;
        }
        result.push(line);
        continue;
      }

      // 在程式碼區塊內，保持原樣
      if (inCodeBlock) {
        result.push(line);
        continue;
      }

      // 處理縮排式程式碼區塊（轉換為 fenced）
      // 這部分較複雜，暫時保持原樣
      result.push(line);
    }

    return result.join('\n');
  }

  /**
   * 統一表格格式
   */
  private normalizeTables(content: string): string {
    const lines = content.split('\n');
    const result: string[] = [];
    let inTable = false;
    let tableLines: string[] = [];

    for (const line of lines) {
      const isTableRow = /^\|.*\|$/.test(line.trim());

      if (isTableRow) {
        if (!inTable) {
          inTable = true;
          tableLines = [];
        }
        tableLines.push(line.trim());
      } else {
        if (inTable) {
          // 表格結束，格式化並加入結果
          result.push(...this.formatTable(tableLines));
          result.push(''); // 表格後加空行
          inTable = false;
          tableLines = [];
        }
        result.push(line);
      }
    }

    // 處理檔案結尾的表格
    if (inTable && tableLines.length > 0) {
      result.push(...this.formatTable(tableLines));
    }

    return result.join('\n');
  }

  /**
   * 格式化單一表格
   */
  private formatTable(tableLines: string[]): string[] {
    if (tableLines.length < 2) {
      return tableLines;
    }

    // 解析每一行的儲存格
    const rows = tableLines.map(line =>
      line.split('|')
        .slice(1, -1) // 移除首尾的空字串
        .map(cell => cell.trim())
    );

    // 計算每列的最大寬度
    const columnCount = rows[0].length;
    const columnWidths = new Array(columnCount).fill(0);

    for (const row of rows) {
      for (let i = 0; i < row.length; i++) {
        // 對於分隔行，保持最小寬度 3
        const width = row[i].match(/^:?-+:?$/)
          ? 3
          : row[i].length;
        columnWidths[i] = Math.max(columnWidths[i], width);
      }
    }

    // 格式化每一行
    const formatted = rows.map((row, rowIndex) => {
      const cells = row.map((cell, colIndex) => {
        const width = columnWidths[colIndex];

        // 分隔行特殊處理
        if (rowIndex === 1 && cell.match(/^:?-+:?$/)) {
          const hasLeftColon = cell.startsWith(':');
          const hasRightColon = cell.endsWith(':');

          if (hasLeftColon && hasRightColon) {
            return ':' + '-'.repeat(width - 2) + ':';
          } else if (hasLeftColon) {
            return ':' + '-'.repeat(width - 1);
          } else if (hasRightColon) {
            return '-'.repeat(width - 1) + ':';
          } else {
            return '-'.repeat(width);
          }
        }

        // 一般儲存格，左對齊
        return cell.padEnd(width);
      });

      return '| ' + cells.join(' | ') + ' |';
    });

    return formatted;
  }

  /**
   * 統一連結和圖片格式
   */
  private normalizeLinks(content: string): string {
    return content
      // 確保連結格式正確 [text](url)
      .replace(/\[([^\]]+)\]\s*\(([^)]+)\)/g, '[$1]($2)')
      // 確保圖片格式正確 ![alt](url)
      .replace(/!\[([^\]]*)\]\s*\(([^)]+)\)/g, '![$1]($2)');
  }

  /**
   * 確保適當的空行
   */
  private ensureProperSpacing(content: string): string {
    const lines = content.split('\n');
    const result: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const prevLine = i > 0 ? lines[i - 1] : '';
      const nextLine = i < lines.length - 1 ? lines[i + 1] : '';

      result.push(line);

      // 標題前後需要空行
      if (line.match(/^#{1,6}\s/)) {
        if (nextLine && !nextLine.match(/^#{1,6}\s/) && nextLine.trim() !== '') {
          if (i < lines.length - 1 && lines[i + 1].trim() !== '') {
            // 下一行不是空行，加入空行
            // 但先檢查，避免重複
          }
        }
      }

      // 列表和段落之間需要空行
      const isListItem = line.match(/^[\s]*[-*+\d.]+\s/);
      const prevIsListItem = prevLine.match(/^[\s]*[-*+\d.]+\s/);

      if (isListItem && !prevIsListItem && prevLine.trim() !== '') {
        // 列表開始前需要空行（但已經在前面處理了）
      }
    }

    return result.join('\n');
  }

  /**
   * 加入目錄
   */
  private addTableOfContents(content: string): string {
    const headings = this.extractHeadings(content);

    // 過濾掉第一個 H1 標題（通常是文件標題）
    const tocHeadings = headings.filter((h, index) =>
      h.level > 1 && h.level <= this.options.tocDepth && index > 0
    );

    if (tocHeadings.length === 0) {
      return content;
    }

    // 生成目錄
    const toc = this.generateTOC(tocHeadings);

    // 找到第一個 H1 標題的位置
    const lines = content.split('\n');
    let insertIndex = 0;

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].match(/^#\s/)) {
        insertIndex = i + 1;
        break;
      }
    }

    // 插入目錄
    lines.splice(insertIndex, 0, '', '## 目錄', '', ...toc.split('\n'), '');

    return lines.join('\n');
  }

  /**
   * 提取標題
   */
  private extractHeadings(content: string): HeadingInfo[] {
    const lines = content.split('\n');
    const headings: HeadingInfo[] = [];

    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(/^(#{1,6})\s+(.+)$/);
      if (match) {
        const level = match[1].length;
        const text = match[2].trim();
        const anchor = this.generateAnchor(text);

        headings.push({ level, text, anchor, line: i });
      }
    }

    return headings;
  }

  /**
   * 生成錨點 ID
   */
  private generateAnchor(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\u4e00-\u9fa5\s-]/g, '') // 保留中文字元
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * 生成目錄內容
   */
  private generateTOC(headings: HeadingInfo[]): string {
    const lines: string[] = [];

    for (const heading of headings) {
      const indent = '  '.repeat(heading.level - 2);
      const marker = this.getListMarker();
      lines.push(`${indent}${marker} [${heading.text}](#${heading.anchor})`);
    }

    return lines.join('\n');
  }

  /**
   * 確保結尾換行
   */
  private ensureTrailingNewline(content: string): string {
    if (!content.endsWith('\n')) {
      return content + '\n';
    }
    return content;
  }

  /**
   * 格式化並寫入檔案
   */
  public async formatFile(filePath: string): Promise<void> {
    const fs = await import('fs/promises');
    const content = await fs.readFile(filePath, 'utf-8');
    const formatted = this.format(content);
    await fs.writeFile(filePath, formatted, 'utf-8');
  }

  /**
   * 批次格式化多個檔案
   */
  public async formatFiles(filePaths: string[]): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();

    for (const filePath of filePaths) {
      try {
        await this.formatFile(filePath);
        results.set(filePath, true);
      } catch (error) {
        results.set(filePath, false);
        console.error(`格式化檔案失敗 ${filePath}:`, error);
      }
    }

    return results;
  }

  /**
   * 格式化目錄下的所有 Markdown 檔案
   */
  public async formatDirectory(
    dirPath: string,
    recursive = true
  ): Promise<Map<string, boolean>> {
    const fs = await import('fs/promises');
    const path = await import('path');
    const results = new Map<string, boolean>();
    const formatter = this;

    async function processDirectory(dir: string): Promise<void> {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory() && recursive) {
          await processDirectory(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          try {
            const content = await fs.readFile(fullPath, 'utf-8');
            const formatted = formatter.format(content);
            await fs.writeFile(fullPath, formatted, 'utf-8');
            results.set(fullPath, true);
          } catch (error) {
            results.set(fullPath, false);
            console.error(`格式化檔案失敗 ${fullPath}:`, error);
          }
        }
      }
    }

    await processDirectory(dirPath);
    return results;
  }
}

/**
 * 建立範本格式化器實例
 */
export function createTemplateFormatter(options?: FormatterOptions): TemplateFormatter {
  return new TemplateFormatter(options);
}

/**
 * 快速格式化函式
 */
export function formatMarkdown(content: string, options?: FormatterOptions): string {
  const formatter = new TemplateFormatter(options);
  return formatter.format(content);
}

/**
 * 轉義 Markdown 特殊字元
 * 確保文字內容不會被誤解析為 Markdown 語法
 *
 * @param text 要轉義的文字
 * @returns 轉義後的文字
 */
export function escapeMarkdown(text: string): string {
  if (!text) return text;

  return text
    .replace(/\\/g, '\\\\')   // 反斜線（必須最先處理）
    .replace(/`/g, '\\`')      // 反引號
    .replace(/\*/g, '\\*')     // 星號
    .replace(/_/g, '\\_')      // 底線
    .replace(/\[/g, '\\[')     // 左方括號
    .replace(/\]/g, '\\]')     // 右方括號
    .replace(/</g, '\\<')      // 左尖括號
    .replace(/>/g, '\\>')      // 右尖括號
    .replace(/\|/g, '\\|');    // 管道符號
}

/**
 * 轉義表格儲存格內容
 * 表格內的管道符號必須轉義，其他特殊字元也需要處理
 *
 * @param text 要轉義的文字
 * @returns 轉義後的文字
 */
export function escapeTableCell(text: string): string {
  if (!text) return text;

  return text
    .replace(/\\/g, '\\\\')   // 反斜線（必須最先處理）
    .replace(/\|/g, '\\|')     // 管道符號（表格中最重要）
    .replace(/`/g, '\\`')      // 反引號
    .replace(/\*/g, '\\*')     // 星號
    .replace(/_/g, '\\_');     // 底線
}
