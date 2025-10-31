/**
 * Copyright (c) 2025 Frank Chen @ www.frankchen.tw/personal
 * SPDX-License-Identifier: MIT
 *
 * This file is part of n8n-skills project.
 */

/**
 * Skill Validator
 * 驗證 Skill.md 檔案格式和結構
 */

import * as logger from '../utils/logger';

/**
 * 驗證結果介面
 */
export interface ValidationResult {
  success: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  stats?: SkillStats;
}

/**
 * 驗證錯誤
 */
export interface ValidationError {
  type: string;
  message: string;
  line?: number;
  section?: string;
}

/**
 * 驗證警告
 */
export interface ValidationWarning {
  type: string;
  message: string;
  line?: number;
  section?: string;
}

/**
 * Skill 檔案統計資訊
 */
export interface SkillStats {
  totalLines: number;
  sectionCount: number;
  hasValidFrontmatter: boolean;
  headingLevels: number[];
  linkCount: number;
}

/**
 * 必要的章節標題
 */
const REQUIRED_SECTIONS = [
  'n8n Workflow Automation',
  '快速開始',
  '節點索引',
  '常見工作流程模式',
  '資源檔案',
];

/**
 * YAML frontmatter 必要欄位
 */
const REQUIRED_FRONTMATTER_FIELDS = [
  'name',
  'description',
  'version',
];

/**
 * 驗證 Skill.md 檔案
 */
export function validate(content: string): ValidationResult {
  logger.info('開始驗證 Skill.md 檔案格式');

  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const lines = content.split('\n');

  // 檢查檔案大小限制
  if (lines.length > 5000) {
    errors.push({
      type: 'FILE_SIZE',
      message: `檔案行數超過限制：${lines.length} 行（最大 5000 行）`,
    });
  }

  if (lines.length > 4500) {
    warnings.push({
      type: 'FILE_SIZE',
      message: `檔案行數接近限制：${lines.length} 行（建議保持在 4500 行以下）`,
    });
  }

  // 驗證 YAML frontmatter
  const frontmatterResult = validateFrontmatter(lines);
  errors.push(...frontmatterResult.errors);
  warnings.push(...frontmatterResult.warnings);

  // 驗證章節結構
  const sectionsResult = validateSections(lines);
  errors.push(...sectionsResult.errors);
  warnings.push(...sectionsResult.warnings);

  // 驗證標題層級
  const headingsResult = validateHeadings(lines);
  errors.push(...headingsResult.errors);
  warnings.push(...headingsResult.warnings);

  // 驗證 Markdown 語法
  const markdownResult = validateMarkdownSyntax(lines);
  errors.push(...markdownResult.errors);
  warnings.push(...markdownResult.warnings);

  // 收集統計資訊
  const stats = collectStats(lines, frontmatterResult.hasValidFrontmatter);

  const success = errors.length === 0;

  if (success) {
    logger.success('Skill.md 檔案格式驗證通過');
  } else {
    logger.error(`發現 ${errors.length} 個錯誤`);
  }

  if (warnings.length > 0) {
    logger.warn(`發現 ${warnings.length} 個警告`);
  }

  return {
    success,
    errors,
    warnings,
    stats,
  };
}

/**
 * 驗證 YAML frontmatter
 */
function validateFrontmatter(lines: string[]): {
  errors: ValidationError[];
  warnings: ValidationWarning[];
  hasValidFrontmatter: boolean;
} {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  let hasValidFrontmatter = false;

  // 檢查是否以 --- 開頭
  if (lines.length === 0 || lines[0].trim() !== '---') {
    errors.push({
      type: 'FRONTMATTER',
      message: '檔案必須以 YAML frontmatter 開頭（---）',
      line: 1,
    });
    return { errors, warnings, hasValidFrontmatter };
  }

  // 找到 frontmatter 結束位置
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
      message: 'YAML frontmatter 未正確關閉（缺少結尾的 ---）',
    });
    return { errors, warnings, hasValidFrontmatter };
  }

  // 解析 frontmatter 內容
  const frontmatterLines = lines.slice(1, frontmatterEnd);
  const frontmatterFields = new Map<string, string>();

  for (let i = 0; i < frontmatterLines.length; i++) {
    const line = frontmatterLines[i].trim();
    if (!line) continue;

    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) {
      warnings.push({
        type: 'FRONTMATTER',
        message: `frontmatter 中的行格式不正確：${line}`,
        line: i + 2,
      });
      continue;
    }

    const key = line.substring(0, colonIndex).trim();
    const value = line.substring(colonIndex + 1).trim();
    frontmatterFields.set(key, value);
  }

  // 檢查必要欄位
  for (const field of REQUIRED_FRONTMATTER_FIELDS) {
    if (!frontmatterFields.has(field)) {
      errors.push({
        type: 'FRONTMATTER',
        message: `frontmatter 缺少必要欄位：${field}`,
        section: 'YAML frontmatter',
      });
    }
  }

  // 驗證版本格式
  const version = frontmatterFields.get('version');
  if (version && !/^\d+\.\d+\.\d+$/.test(version)) {
    warnings.push({
      type: 'FRONTMATTER',
      message: `版本號格式不符合語義化版本規範：${version}（建議格式：1.0.0）`,
      section: 'YAML frontmatter',
    });
  }

  hasValidFrontmatter = errors.length === 0;
  return { errors, warnings, hasValidFrontmatter };
}

/**
 * 驗證章節結構
 */
function validateSections(lines: string[]): {
  errors: ValidationError[];
  warnings: ValidationWarning[];
} {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // 收集所有一級標題
  const h1Sections: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const h1Match = line.match(/^#\s+(.+)$/);
    if (h1Match) {
      h1Sections.push(h1Match[1].trim());
    }
  }

  // 檢查必要章節
  for (const requiredSection of REQUIRED_SECTIONS) {
    const found = h1Sections.some(section =>
      section.toLowerCase().includes(requiredSection.toLowerCase())
    );
    if (!found) {
      errors.push({
        type: 'SECTION',
        message: `缺少必要章節：${requiredSection}`,
      });
    }
  }

  // 檢查章節數量
  if (h1Sections.length < 3) {
    warnings.push({
      type: 'SECTION',
      message: `章節數量過少：${h1Sections.length} 個（建議至少 3 個主要章節）`,
    });
  }

  return { errors, warnings };
}

/**
 * 驗證標題層級
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

      // 檢查標題是否為空
      if (!title) {
        errors.push({
          type: 'HEADING',
          message: '標題不能為空',
          line: i + 1,
        });
        continue;
      }

      // 檢查標題層級跳躍（不能跳過層級）
      if (previousLevel > 0 && level > previousLevel + 1) {
        warnings.push({
          type: 'HEADING',
          message: `標題層級跳躍：從 h${previousLevel} 跳到 h${level}（建議逐級遞增）`,
          line: i + 1,
        });
      }

      // 檢查標題前後是否有空行
      if (i > 0 && lines[i - 1].trim() !== '') {
        warnings.push({
          type: 'HEADING',
          message: '標題前應該有空行',
          line: i + 1,
        });
      }

      previousLevel = level;
    }
  }

  return { errors, warnings };
}

/**
 * 驗證 Markdown 語法
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

    // 檢查程式碼區塊標記
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

    // 跳過程式碼區塊內的行
    if (inCodeBlock) {
      continue;
    }

    // 檢查連結格式
    const linkMatches = line.matchAll(/\[([^\]]*)\]\(([^)]*)\)/g);
    for (const match of linkMatches) {
      const linkText = match[1];
      const linkUrl = match[2];

      if (!linkText) {
        warnings.push({
          type: 'MARKDOWN',
          message: '連結文字為空',
          line: i + 1,
        });
      }

      if (!linkUrl) {
        errors.push({
          type: 'MARKDOWN',
          message: '連結 URL 為空',
          line: i + 1,
        });
      }
    }

    // 檢查表格格式
    if (trimmed.includes('|')) {
      const cells = trimmed.split('|').map(c => c.trim());

      // 檢查是否為分隔線
      if (cells.every(c => /^[-:]+$/.test(c) || c === '')) {
        continue;
      }

      // 檢查表格行的欄位數量是否一致
      if (i > 0 && lines[i - 1].includes('|')) {
        const prevCells = lines[i - 1].split('|').length;
        const currCells = cells.length;

        if (prevCells !== currCells) {
          warnings.push({
            type: 'MARKDOWN',
            message: `表格欄位數量不一致：上一行 ${prevCells} 欄，本行 ${currCells} 欄`,
            line: i + 1,
          });
        }
      }
    }

    // 檢查列表格式
    const listMatch = trimmed.match(/^([-*+]|\d+\.)\s+/);
    if (listMatch) {
      const marker = listMatch[0];
      if (marker.length > 0 && trimmed.length === marker.length) {
        warnings.push({
          type: 'MARKDOWN',
          message: '列表項目內容為空',
          line: i + 1,
        });
      }
    }
  }

  // 檢查是否有未關閉的程式碼區塊
  if (inCodeBlock) {
    errors.push({
      type: 'MARKDOWN',
      message: '程式碼區塊未正確關閉',
      line: codeBlockStart,
    });
  }

  return { errors, warnings };
}

/**
 * 收集統計資訊
 */
function collectStats(lines: string[], hasValidFrontmatter: boolean): SkillStats {
  const headingLevels: number[] = [];
  let sectionCount = 0;
  let linkCount = 0;

  for (const line of lines) {
    const trimmed = line.trim();

    // 統計標題
    const headingMatch = trimmed.match(/^(#{1,6})\s+/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      headingLevels.push(level);
      if (level === 1) {
        sectionCount++;
      }
    }

    // 統計連結
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
 * 格式化驗證結果為易讀的文字
 */
export function formatValidationResult(result: ValidationResult): string {
  const output: string[] = [];

  output.push('=== Skill.md 驗證結果 ===\n');

  if (result.stats) {
    output.push('檔案統計：');
    output.push(`  總行數：${result.stats.totalLines}`);
    output.push(`  章節數：${result.stats.sectionCount}`);
    output.push(`  連結數：${result.stats.linkCount}`);
    output.push(`  Frontmatter：${result.stats.hasValidFrontmatter ? '有效' : '無效'}`);
    output.push('');
  }

  if (result.errors.length > 0) {
    output.push(`錯誤（${result.errors.length}）：`);
    result.errors.forEach((error, index) => {
      output.push(`  ${index + 1}. [${error.type}] ${error.message}`);
      if (error.line) {
        output.push(`     位置：第 ${error.line} 行`);
      }
      if (error.section) {
        output.push(`     章節：${error.section}`);
      }
    });
    output.push('');
  }

  if (result.warnings.length > 0) {
    output.push(`警告（${result.warnings.length}）：`);
    result.warnings.forEach((warning, index) => {
      output.push(`  ${index + 1}. [${warning.type}] ${warning.message}`);
      if (warning.line) {
        output.push(`     位置：第 ${warning.line} 行`);
      }
      if (warning.section) {
        output.push(`     章節：${warning.section}`);
      }
    });
    output.push('');
  }

  output.push(result.success ? '驗證通過' : '驗證失敗');

  return output.join('\n');
}
