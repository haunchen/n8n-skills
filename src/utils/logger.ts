/**
 * Copyright (c) 2025 Frank Chen @ www.frankchen.tw/personal
 * SPDX-License-Identifier: MIT
 *
 * This file is part of n8n-skills project.
 */

export function info(message: string): void {
  console.log(`[INFO] ${message}`);
}

export function warn(message: string): void {
  console.warn(`[WARN] ${message}`);
}

export function error(message: string, err?: Error | unknown): void {
  const errorMsg = err instanceof Error ? err.message : String(err);
  console.error(`[ERROR] ${message}${err ? `: ${errorMsg}` : ''}`);
}

export function success(message: string): void {
  console.log(`[SUCCESS] ${message}`);
}

export function progress(current: number, total: number, message?: string): void {
  const percentage = Math.round((current / total) * 100);
  const progressBar = createProgressBar(current, total, 20);
  const msg = message ? ` - ${message}` : '';
  console.log(`[PROGRESS] ${progressBar} ${percentage}% (${current}/${total})${msg}`);
}

function createProgressBar(current: number, total: number, width: number = 20): string {
  const filled = Math.round((current / total) * width);
  const empty = width - filled;
  return `[${'='.repeat(filled)}${' '.repeat(empty)}]`;
}
