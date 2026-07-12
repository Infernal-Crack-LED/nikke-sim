// Node-only override loader (the browser bundles overrides with import.meta.glob).
import { existsSync, readFileSync } from 'node:fs';
import type { OverrideFile } from './index.js';

export function loadOverride(slug: string): OverrideFile | undefined {
  const path = new URL(`./overrides/${slug}.json`, import.meta.url);
  if (!existsSync(path)) return undefined;
  return JSON.parse(readFileSync(path, 'utf8'));
}
