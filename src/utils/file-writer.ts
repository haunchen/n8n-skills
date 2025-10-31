/**
 * Copyright (c) 2025 Frank Chen @ www.frankchen.tw/personal
 * SPDX-License-Identifier: MIT
 *
 * This file is part of n8n-skills project.
 */

import * as fs from 'fs';
import * as path from 'path';

export async function writeFile(filePath: string, content: string): Promise<void> {
  const dir = path.dirname(filePath);
  await ensureDir(dir);
  await fs.promises.writeFile(filePath, content, 'utf-8');
}

export async function appendFile(filePath: string, content: string): Promise<void> {
  const dir = path.dirname(filePath);
  await ensureDir(dir);
  await fs.promises.appendFile(filePath, content, 'utf-8');
}

export async function ensureDir(dirPath: string): Promise<void> {
  try {
    await fs.promises.access(dirPath);
  } catch {
    await fs.promises.mkdir(dirPath, { recursive: true });
  }
}

export async function cleanDirectory(dirPath: string): Promise<void> {
  try {
    const exists = await fs.promises.access(dirPath)
      .then(() => true)
      .catch(() => false);

    if (exists) {
      const files = await fs.promises.readdir(dirPath);
      await Promise.all(
        files.map(file =>
          fs.promises.rm(path.join(dirPath, file), { recursive: true, force: true })
        )
      );
    } else {
      await ensureDir(dirPath);
    }
  } catch (error) {
    throw new Error(`清理目錄失敗: ${error instanceof Error ? error.message : String(error)}`);
  }
}
