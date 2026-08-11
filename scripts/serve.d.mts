// Type surface of scripts/serve.mjs (the legacy zero-dependency server) —
// only what TypeScript test code imports. The .mjs stays the source of truth;
// keep this in sync if its exports change.
export interface LegacyTabMeta {
  title: string;
  desc: string;
  label?: string;
  image?: string;
}
export const TAB_META: Record<string, LegacyTabMeta>;
