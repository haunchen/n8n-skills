/**
 * Copyright (c) 2025 Frank Chen @ www.frankchen.tw/personal
 * SPDX-License-Identifier: MIT
 *
 * This file is part of n8n-skills project.
 */

/**
 * Skill Validator
 * Validates SKILL.md file format and structure
 */

import * as logger from '../utils/logger';

/**
 * Validation result interface
 */
export interface ValidationResult {
  success: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  stats?: SkillStats;
}

/**
 * Validation error
 */
export interface ValidationError {
  type: string;
  message: string;
  line?: number;
  section?: string;
}

/**
 * Validation warning
 */
export interface ValidationWarning {
  type: string;
  message: string;
  line?: number;
  section?: string;
}

/**
 * Skill file statistics
 */
export interface SkillStats {
  totalLines: number;
  sectionCount: number;
  hasValidFrontmatter: boolean;
  headingLevels: number[];
  linkCount: number;
}

/**
 * Required section headings
 */
const REQUIRED_SECTIONS = [
  'n8n Workflow Automation',
  '快速開始',
  '節點索引',
  '常見工作流程模式',
  '資源檔案',
];

/**
 * Required YAML frontmatter fields
 */
const REQUIRED_FRONTMATTER_FIELDS = [
  'name',
  'description',
];

/**
 * Validate SKILL.md file
 */
export function validate(content: string): ValidationResult {
  logger.info('Starting SKILL.md file format validation');

  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const lines = content.split('\n');

  // Check file size limit
  if (lines.length > 5000) {
    errors.push({
      type: 'FILE_SIZE',
      message: `File exceeds line limit: ${lines.length} lines (max 5000 lines)`,
    });
  }

  if (lines.length > 4500) {
    warnings.push({
      type: 'FILE_SIZE',
      message: `File approaching line limit: ${lines.length} lines (recommended to keep below 4500 lines)`,
    });
  }

  // Validate YAML frontmatter
  const frontmatterResult = validateFrontmatter(lines);
  errors.push(...frontmatterResult.errors);
  warnings.push(...frontmatterResult.warnings);

  // Validate section structure
  const sectionsResult = validateSections(lines);
  errors.push(...sectionsResult.errors);
  warnings.push(...sectionsResult.warnings);

  // Validate heading levels
  const headingsResult = validateHeadings(lines);
  errors.push(...headingsResult.errors);
  warnings.push(...headingsResult.warnings);

  // Validate Markdown syntax
  const markdownResult = validateMarkdownSyntax(lines);
  errors.push(...markdownResult.errors);
  warnings.push(...markdownResult.warnings);

  // Collect statistics
  const stats = collectStats(lines, frontmatterResult.hasValidFrontmatter);

  const success = errors.length === 0;

  if (success) {
    logger.success('SKILL.md file format validation passed');
  } else {
    logger.error(`Found ${errors.length} error(s)`);
  }

  if (warnings.length > 0) {
    logger.warn(`Found ${warnings.length} warning(s)`);
  }

  return {
    success,
    errors,
    warnings,
    stats,
  };
}

/**
 * Validate YAML frontmatter
 */
function validateFrontmatter(lines: string[]): {
  errors: ValidationError[];
  warnings: ValidationWarning[];
  hasValidFrontmatter: boolean;
} {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  let hasValidFrontmatter = false;

  // Check if file starts with ---
  if (lines.length === 0 || lines[0].trim() !== '---') {
    errors.push({
      type: 'FRONTMATTER',
      message: 'File must start with YAML frontmatter (---)',
      line: 1,
    });
    return { errors, warnings, hasValidFrontmatter };
  }

  // Find frontmatter end position
  let frontmatterEnd = -1;
  for (let i = 1; i < Math.min(lines.length, 20); i++) {
    if (lines[i].trim() === '---') {
      frontmatterEnd = i;
      break;
    }
  }

  if (frontmatterEnd === -1) {
    errors.push({
      type: 'FRONTMATTER',
      message: 'YAML frontmatter not properly closed (missing closing ---)',
    });
    return { errors, warnings, hasValidFrontmatter };
  }

  // Parse frontmatter content
  const frontmatterLines = lines.slice(1, frontmatterEnd);
  const frontmatterFields = new Map<string, string>();

  for (let i = 0; i < frontmatterLines.length; i++) {
    const line = frontmatterLines[i].trim();
    if (!line) continue;

    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) {
      warnings.push({
        type: 'FRONTMATTER',
        message: `Incorrectly formatted line in frontmatter: ${line}`,
        line: i + 2,
      });
      continue;
    }

    const key = line.substring(0, colonIndex).trim();
    const value = line.substring(colonIndex + 1).trim();
    frontmatterFields.set(key, value);
  }

  // Check required fields
  for (const field of REQUIRED_FRONTMATTER_FIELDS) {
    if (!frontmatterFields.has(field)) {
      errors.push({
        type: 'FRONTMATTER',
        message: `Frontmatter missing required field: ${field}`,
        section: 'YAML frontmatter',
      });
    }
  }

  // Validate version format
  const version = frontmatterFields.get('version');
  if (version && !/^\d+\.\d+\.\d+$/.test(version)) {
    warnings.push({
      type: 'FRONTMATTER',
      message: `Version format does not follow semantic versioning: ${version} (recommended format: 1.0.0)`,
      section: 'YAML frontmatter',
    });
  }

  hasValidFrontmatter = errors.length === 0;
  return { errors, warnings, hasValidFrontmatter };
}

/**
 * Validate section structure
 */
function validateSections(lines: string[]): {
  errors: ValidationError[];
  warnings: ValidationWarning[];
} {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Collect all H1 headings
  const h1Sections: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const h1Match = line.match(/^#\s+(.+)$/);
    if (h1Match) {
      h1Sections.push(h1Match[1].trim());
    }
  }

  // Check required sections
  for (const requiredSection of REQUIRED_SECTIONS) {
    const found = h1Sections.some(section =>
      section.toLowerCase().includes(requiredSection.toLowerCase())
    );
    if (!found) {
      errors.push({
        type: 'SECTION',
        message: `Missing required section: ${requiredSection}`,
      });
    }
  }

  // Check section count
  if (h1Sections.length < 3) {
    warnings.push({
      type: 'SECTION',
      message: `Too few sections: ${h1Sections.length} (recommended at least 3 main sections)`,
    });
  }

  return { errors, warnings };
}

/**
 * Validate heading levels
 */
function validateHeadings(lines: string[]): {
  errors: ValidationError[];
  warnings: ValidationWarning[];
} {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  let previousLevel = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);

    if (headingMatch) {
      const level = headingMatch[1].length;
      const title = headingMatch[2].trim();

      // Check if heading is empty
      if (!title) {
        errors.push({
          type: 'HEADING',
          message: 'Heading cannot be empty',
          line: i + 1,
        });
        continue;
      }

      // Check for heading level jumps (cannot skip levels)
      if (previousLevel > 0 && level > previousLevel + 1) {
        warnings.push({
          type: 'HEADING',
          message: `Heading level jump: from h${previousLevel} to h${level} (recommended to increment gradually)`,
          line: i + 1,
        });
      }

      // Check if there are blank lines before headings
      if (i > 0 && lines[i - 1].trim() !== '') {
        warnings.push({
          type: 'HEADING',
          message: 'Heading should have a blank line before it',
          line: i + 1,
        });
      }

      previousLevel = level;
    }
  }

  return { errors, warnings };
}

/**
 * Validate Markdown syntax
 */
function validateMarkdownSyntax(lines: string[]): {
  errors: ValidationError[];
  warnings: ValidationWarning[];
} {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  let inCodeBlock = false;
  let codeBlockStart = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Check code block markers
    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        inCodeBlock = false;
        codeBlockStart = -1;
      } else {
        inCodeBlock = true;
        codeBlockStart = i + 1;
      }
      continue;
    }

    // Skip lines inside code blocks
    if (inCodeBlock) {
      continue;
    }

    // Check link format
    const linkMatches = line.matchAll(/\[([^\]]*)\]\(([^)]*)\)/g);
    for (const match of linkMatches) {
      const linkText = match[1];
      const linkUrl = match[2];

      if (!linkText) {
        warnings.push({
          type: 'MARKDOWN',
          message: 'Link text is empty',
          line: i + 1,
        });
      }

      if (!linkUrl) {
        errors.push({
          type: 'MARKDOWN',
          message: 'Link URL is empty',
          line: i + 1,
        });
      }
    }

    // Check table format
    if (trimmed.includes('|')) {
      const cells = trimmed.split('|').map(c => c.trim());

      // Check if it's a separator line
      if (cells.every(c => /^[-:]+$/.test(c) || c === '')) {
        continue;
      }

      // Check if table row column count is consistent
      if (i > 0 && lines[i - 1].includes('|')) {
        const prevCells = lines[i - 1].split('|').length;
        const currCells = cells.length;

        if (prevCells !== currCells) {
          warnings.push({
            type: 'MARKDOWN',
            message: `Table column count inconsistent: previous row ${prevCells} columns, this row ${currCells} columns`,
            line: i + 1,
          });
        }
      }
    }

    // Check list format
    const listMatch = trimmed.match(/^([-*+]|\d+\.)\s+/);
    if (listMatch) {
      const marker = listMatch[0];
      if (marker.length > 0 && trimmed.length === marker.length) {
        warnings.push({
          type: 'MARKDOWN',
          message: 'List item content is empty',
          line: i + 1,
        });
      }
    }
  }

  // Check for unclosed code blocks
  if (inCodeBlock) {
    errors.push({
      type: 'MARKDOWN',
      message: 'Code block not properly closed',
      line: codeBlockStart,
    });
  }

  return { errors, warnings };
}

/**
 * Collect statistics
 */
function collectStats(lines: string[], hasValidFrontmatter: boolean): SkillStats {
  const headingLevels: number[] = [];
  let sectionCount = 0;
  let linkCount = 0;

  for (const line of lines) {
    const trimmed = line.trim();

    // Count headings
    const headingMatch = trimmed.match(/^(#{1,6})\s+/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      headingLevels.push(level);
      if (level === 1) {
        sectionCount++;
      }
    }

    // Count links
    const linkMatches = line.matchAll(/\[([^\]]*)\]\(([^)]*)\)/g);
    linkCount += Array.from(linkMatches).length;
  }

  return {
    totalLines: lines.length,
    sectionCount,
    hasValidFrontmatter,
    headingLevels,
    linkCount,
  };
}

/**
 * Format validation result as readable text
 */
export function formatValidationResult(result: ValidationResult): string {
  const output: string[] = [];

  output.push('=== SKILL.md Validation Result ===\n');

  if (result.stats) {
    output.push('File Statistics:');
    output.push(`  Total lines: ${result.stats.totalLines}`);
    output.push(`  Sections: ${result.stats.sectionCount}`);
    output.push(`  Links: ${result.stats.linkCount}`);
    output.push(`  Frontmatter: ${result.stats.hasValidFrontmatter ? 'Valid' : 'Invalid'}`);
    output.push('');
  }

  if (result.errors.length > 0) {
    output.push(`Errors (${result.errors.length}):`);
    result.errors.forEach((error, index) => {
      output.push(`  ${index + 1}. [${error.type}] ${error.message}`);
      if (error.line) {
        output.push(`     Location: line ${error.line}`);
      }
      if (error.section) {
        output.push(`     Section: ${error.section}`);
      }
    });
    output.push('');
  }

  if (result.warnings.length > 0) {
    output.push(`Warnings (${result.warnings.length}):`);
    result.warnings.forEach((warning, index) => {
      output.push(`  ${index + 1}. [${warning.type}] ${warning.message}`);
      if (warning.line) {
        output.push(`     Location: line ${warning.line}`);
      }
      if (warning.section) {
        output.push(`     Section: ${warning.section}`);
      }
    });
    output.push('');
  }

  output.push(result.success ? 'Validation passed' : 'Validation failed');

  return output.join('\n');
}
