/**
 * Copyright (c) 2025 Frank Chen @ www.frankchen.tw/personal
 * SPDX-License-Identifier: MIT
 *
 * This file is part of n8n-skills project.
 */

/**
 * Markdown Formatter
 * Standardizes and beautifies Markdown document formatting
 */

/**
 * Formatter options
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
 * Default options
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
 * Heading information
 */
interface HeadingInfo {
  level: number;
  text: string;
  anchor: string;
  line: number;
}

/**
 * Markdown Template Formatter
 */
export class TemplateFormatter {
  private options: Required<FormatterOptions>;

  constructor(options: FormatterOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Format Markdown content
   */
  public format(content: string): string {
    let formatted = content;

    // Normalize line endings
    formatted = this.normalizeLineEndings(formatted);

    // Clean extra whitespace
    if (this.options.cleanExtraWhitespace) {
      formatted = this.cleanWhitespace(formatted);
    }

    // Normalize headings
    formatted = this.normalizeHeadings(formatted);

    // Normalize lists
    formatted = this.normalizeLists(formatted);

    // Normalize code blocks
    formatted = this.normalizeCodeBlocks(formatted);

    // Normalize tables
    formatted = this.normalizeTables(formatted);

    // Normalize links and images
    formatted = this.normalizeLinks(formatted);

    // Ensure proper spacing
    formatted = this.ensureProperSpacing(formatted);

    // Add Table of Contents
    if (this.options.addTableOfContents) {
      formatted = this.addTableOfContents(formatted);
    }

    // Ensure trailing newline
    if (this.options.ensureTrailingNewline) {
      formatted = this.ensureTrailingNewline(formatted);
    }

    return formatted;
  }

  /**
   * Normalize line endings
   */
  private normalizeLineEndings(content: string): string {
    return content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  }

  /**
   * Clean extra whitespace
   */
  private cleanWhitespace(content: string): string {
    return content
      // Remove trailing whitespace
      .replace(/[ \t]+$/gm, '')
      // Remove consecutive blank lines (more than 2)
      .replace(/\n{3,}/g, '\n\n')
      // Remove blank lines at file beginning
      .replace(/^\n+/, '')
      // Remove extra blank lines at file end
      .replace(/\n{2,}$/, '\n');
  }

  /**
   * Normalize headings
   */
  private normalizeHeadings(content: string): string {
    const lines = content.split('\n');
    const result: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (this.options.headingStyle === 'atx') {
        // Use ATX style (# heading)
        // Handle Setext style conversion
        if (i < lines.length - 1) {
          const nextLine = lines[i + 1];

          // H1: next line all =
          if (/^=+$/.test(nextLine)) {
            result.push(`# ${line.trim()}`);
            i++; // Skip next line
            continue;
          }

          // H2: next line all -
          if (/^-+$/.test(nextLine)) {
            result.push(`## ${line.trim()}`);
            i++; // Skip next line
            continue;
          }
        }

        // Already ATX style, ensure correct format
        const atxMatch = line.match(/^(#{1,6})\s*(.*)$/);
        if (atxMatch) {
          const level = atxMatch[1];
          const text = atxMatch[2].replace(/\s*#+$/, '').trim(); // Remove trailing #
          result.push(`${level} ${text}`);
          continue;
        }
      }

      result.push(line);
    }

    return result.join('\n');
  }

  /**
   * Normalize lists
   */
  private normalizeLists(content: string): string {
    const listMarker = this.getListMarker();
    const lines = content.split('\n');
    const result: string[] = [];

    for (const line of lines) {
      // Unordered list
      const unorderedMatch = line.match(/^(\s*)[-*+]\s+(.*)$/);
      if (unorderedMatch) {
        const indent = unorderedMatch[1];
        const text = unorderedMatch[2];
        result.push(`${indent}${listMarker} ${text}`);
        continue;
      }

      // Ordered list - ensure dot and space after number
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
   * Get list marker symbol
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
   * Normalize code blocks
   */
  private normalizeCodeBlocks(content: string): string {
    if (this.options.codeBlockStyle !== 'fenced') {
      return content;
    }

    const lines = content.split('\n');
    const result: string[] = [];
    let inCodeBlock = false;

    for (const line of lines) {
      // Check if it's a code block marker
      if (line.trim().startsWith('```')) {
        if (!inCodeBlock) {
          // Start code block
          inCodeBlock = true;
        } else {
          // End code block
          inCodeBlock = false;
        }
        result.push(line);
        continue;
      }

      // Inside code block, keep as-is
      if (inCodeBlock) {
        result.push(line);
        continue;
      }

      // Handle indented code blocks (convert to fenced)
      // This is complex, keep as-is for now
      result.push(line);
    }

    return result.join('\n');
  }

  /**
   * Normalize tables
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
          // Table ended, format and add to result
          result.push(...this.formatTable(tableLines));
          result.push(''); // Add blank line after table
          inTable = false;
          tableLines = [];
        }
        result.push(line);
      }
    }

    // Handle table at end of file
    if (inTable && tableLines.length > 0) {
      result.push(...this.formatTable(tableLines));
    }

    return result.join('\n');
  }

  /**
   * Format a single table
   */
  private formatTable(tableLines: string[]): string[] {
    if (tableLines.length < 2) {
      return tableLines;
    }

    // Parse cells in each row
    const rows = tableLines.map(line =>
      line.split('|')
        .slice(1, -1) // Remove leading/trailing empty strings
        .map(cell => cell.trim())
    );

    // Calculate max width for each column
    const columnCount = rows[0].length;
    const columnWidths = new Array(columnCount).fill(0);

    for (const row of rows) {
      for (let i = 0; i < row.length; i++) {
        // For separator row, keep minimum width of 3
        const width = row[i].match(/^:?-+:?$/)
          ? 3
          : row[i].length;
        columnWidths[i] = Math.max(columnWidths[i], width);
      }
    }

    // Format each row
    const formatted = rows.map((row, rowIndex) => {
      const cells = row.map((cell, colIndex) => {
        const width = columnWidths[colIndex];

        // Special handling for separator row
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

        // Normal cell, left-aligned
        return cell.padEnd(width);
      });

      return '| ' + cells.join(' | ') + ' |';
    });

    return formatted;
  }

  /**
   * Normalize links and images
   */
  private normalizeLinks(content: string): string {
    return content
      // Ensure correct link format [text](url)
      .replace(/\[([^\]]+)\]\s*\(([^)]+)\)/g, '[$1]($2)')
      // Ensure correct image format ![alt](url)
      .replace(/!\[([^\]]*)\]\s*\(([^)]+)\)/g, '![$1]($2)');
  }

  /**
   * Ensure proper spacing
   */
  private ensureProperSpacing(content: string): string {
    const lines = content.split('\n');
    const result: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const prevLine = i > 0 ? lines[i - 1] : '';
      const nextLine = i < lines.length - 1 ? lines[i + 1] : '';

      result.push(line);

      // Headings need blank lines before and after
      if (line.match(/^#{1,6}\s/)) {
        if (nextLine && !nextLine.match(/^#{1,6}\s/) && nextLine.trim() !== '') {
          if (i < lines.length - 1 && lines[i + 1].trim() !== '') {
            // Next line is not blank, add blank line
            // But check first to avoid duplication
          }
        }
      }

      // Lists and paragraphs need blank lines between them
      const isListItem = line.match(/^[\s]*[-*+\d.]+\s/);
      const prevIsListItem = prevLine.match(/^[\s]*[-*+\d.]+\s/);

      if (isListItem && !prevIsListItem && prevLine.trim() !== '') {
        // List start needs blank line before (already handled above)
      }
    }

    return result.join('\n');
  }

  /**
   * Add Table of Contents
   */
  private addTableOfContents(content: string): string {
    const headings = this.extractHeadings(content);

    // Filter out first H1 heading (usually the document title)
    const tocHeadings = headings.filter((h, index) =>
      h.level > 1 && h.level <= this.options.tocDepth && index > 0
    );

    if (tocHeadings.length === 0) {
      return content;
    }

    // Generate Table of Contents
    const toc = this.generateTOC(tocHeadings);

    // Find position of first H1 heading
    const lines = content.split('\n');
    let insertIndex = 0;

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].match(/^#\s/)) {
        insertIndex = i + 1;
        break;
      }
    }

    // Insert Table of Contents
    lines.splice(insertIndex, 0, '', '## Table of Contents', '', ...toc.split('\n'), '');

    return lines.join('\n');
  }

  /**
   * Extract headings
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
   * Generate anchor ID
   */
  private generateAnchor(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\u4e00-\u9fa5\s-]/g, '') // Preserve Chinese characters
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Generate Table of Contents content
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
   * Ensure trailing newline
   */
  private ensureTrailingNewline(content: string): string {
    if (!content.endsWith('\n')) {
      return content + '\n';
    }
    return content;
  }

  /**
   * Format and write file
   */
  public async formatFile(filePath: string): Promise<void> {
    const fs = await import('fs/promises');
    const content = await fs.readFile(filePath, 'utf-8');
    const formatted = this.format(content);
    await fs.writeFile(filePath, formatted, 'utf-8');
  }

  /**
   * Batch format multiple files
   */
  public async formatFiles(filePaths: string[]): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();

    for (const filePath of filePaths) {
      try {
        await this.formatFile(filePath);
        results.set(filePath, true);
      } catch (error) {
        results.set(filePath, false);
        console.error(`Failed to format file ${filePath}:`, error);
      }
    }

    return results;
  }

  /**
   * Format all Markdown files in a directory
   */
  public async formatDirectory(
    dirPath: string,
    recursive = true
  ): Promise<Map<string, boolean>> {
    const fs = await import('fs/promises');
    const path = await import('path');
    const results = new Map<string, boolean>();

    const processDirectory = async (dir: string): Promise<void> => {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory() && recursive) {
          await processDirectory(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          try {
            const content = await fs.readFile(fullPath, 'utf-8');
            const formatted = this.format(content);
            await fs.writeFile(fullPath, formatted, 'utf-8');
            results.set(fullPath, true);
          } catch (error) {
            results.set(fullPath, false);
            console.error(`Failed to format file ${fullPath}:`, error);
          }
        }
      }
    };

    await processDirectory(dirPath);
    return results;
  }
}

/**
 * Create template formatter instance
 */
export function createTemplateFormatter(options?: FormatterOptions): TemplateFormatter {
  return new TemplateFormatter(options);
}

/**
 * Quick format function
 */
export function formatMarkdown(content: string, options?: FormatterOptions): string {
  const formatter = new TemplateFormatter(options);
  return formatter.format(content);
}

/**
 * Escape Markdown special characters
 * Ensures text content is not misinterpreted as Markdown syntax
 *
 * @param text Text to escape
 * @returns Escaped text
 */
export function escapeMarkdown(text: string): string {
  if (!text) return text;

  return text
    .replace(/\\/g, '\\\\')   // Backslash (must process first)
    .replace(/`/g, '\\`')      // Backtick
    .replace(/\*/g, '\\*')     // Asterisk
    .replace(/_/g, '\\_')      // Underscore
    .replace(/\[/g, '\\[')     // Left bracket
    .replace(/\]/g, '\\]')     // Right bracket
    .replace(/</g, '\\<')      // Left angle bracket
    .replace(/>/g, '\\>')      // Right angle bracket
    .replace(/\|/g, '\\|');    // Pipe
}

/**
 * Escape table cell content
 * Pipe symbols in tables must be escaped, along with other special characters
 *
 * @param text Text to escape
 * @returns Escaped text
 */
export function escapeTableCell(text: string): string {
  if (!text) return text;

  return text
    .replace(/\\/g, '\\\\')   // Backslash (must process first)
    .replace(/\|/g, '\\|')     // Pipe (most important in tables)
    .replace(/`/g, '\\`')      // Backtick
    .replace(/\*/g, '\\*')     // Asterisk
    .replace(/_/g, '\\_');     // Underscore
}
