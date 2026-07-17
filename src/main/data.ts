import { readFileSync, writeFileSync } from 'node:fs';

import type { AppData } from '../shared/api';

export function readData(filePath: string): AppData | null {
  try {
    return JSON.parse(readFileSync(filePath, 'utf8')) as AppData;
  } catch {
    return null;
  }
}

export function writeData(filePath: string, data: AppData): void {
  writeFileSync(filePath, JSON.stringify(data, null, 2));
}
