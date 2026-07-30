// Shared nickname-aware Nikke search/pick UI — extracted from App.tsx so any
// tool tab (not just the sim pages) can offer the same "type a name or
// approved nickname" combobox against its own scoped candidate pool.
import { useState } from 'react';
import { manifestThumbUrl } from '../portraitManifest';

export interface CharSearchOption {
  slug: string;
  name: string;
  nicknames?: string[]; // APPROVED community nicknames (characters.json, sync-derived from bakery-bot aliases)
  imageUrl?: string | null;
  weapon?: string;
  element?: string;
  burst?: string | number | null;
}

// search predicate for the char pickers: slug, name, or an approved nickname
export function charMatchesQuery(c: CharSearchOption, q: string): boolean {
  return (
    c.slug.includes(q) ||
    c.name.toLowerCase().includes(q) ||
    (c.nicknames ?? []).some((n) => n.includes(q))
  );
}

function subtitleFor(c: CharSearchOption): string {
  return [
    c.burst != null ? `B${c.burst}` : null,
    c.weapon ?? null,
    c.element ?? null,
  ]
    .filter((p): p is string => !!p)
    .join(' · ');
}

function ResultRow<T extends CharSearchOption>({
  c,
  onPick,
}: {
  c: T;
  onPick: (slug: string) => void;
}) {
  const subtitle = subtitleFor(c);
  return (
    <button key={c.slug} onMouseDown={() => onPick(c.slug)}>
      {c.imageUrl && (
        <img
          src={manifestThumbUrl(c.imageUrl, 24) ?? c.imageUrl}
          alt=""
          loading="lazy"
        />
      )}
      <span>{c.name}</span>
      {subtitle && <span className="muted">{subtitle}</span>}
    </button>
  );
}

// Search box that ADDS a nikke on pick and clears itself — for building up a
// set (blocked list, multi-unit compare/exclude lists). Anything in `exclude`
// is hidden from the results (it's already picked elsewhere).
export function CharSearch<T extends CharSearchOption>({
  placeholder,
  exclude = [],
  onPick,
  pool,
}: {
  placeholder: string;
  exclude?: string[];
  onPick: (slug: string) => void;
  pool: T[];
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const q = query.toLowerCase();
  const matches = pool
    .filter((c) => !exclude.includes(c.slug))
    .filter((c) => !q || charMatchesQuery(c, q))
    .slice(0, 12);
  return (
    <div className="picker">
      <input
        value={query}
        placeholder={placeholder}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onChange={(e) => setQuery(e.target.value)}
      />
      {open && (
        <div className="picker-list">
          {matches.map((c) => (
            <ResultRow
              key={c.slug}
              c={c}
              onPick={(slug) => {
                onPick(slug);
                setQuery('');
              }}
            />
          ))}
          {!matches.length && <div className="muted pad">no matches</div>}
        </div>
      )}
    </div>
  );
}

// Search box that REPLACES a single current selection — shows the selected
// unit's name when unfocused (like a native <select>), and the live query +
// full-pool dropdown while focused.
export function CharPicker<T extends CharSearchOption>({
  selectedSlug,
  onPick,
  pool,
}: {
  selectedSlug: string | null;
  onPick: (slug: string) => void;
  pool: T[];
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const selected = pool.find((c) => c.slug === selectedSlug) ?? null;
  const q = query.toLowerCase();
  const matches = q
    ? pool.filter((c) => charMatchesQuery(c, q)).slice(0, 12)
    : pool.slice(0, 12);
  return (
    <div className="picker">
      <input
        value={open ? query : (selected?.name ?? '')}
        placeholder="search nikke…"
        onFocus={() => {
          setOpen(true);
          setQuery('');
        }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onChange={(e) => setQuery(e.target.value)}
      />
      {open && (
        <div className="picker-list">
          {matches.map((c) => (
            <ResultRow
              key={c.slug}
              c={c}
              onPick={(slug) => {
                onPick(slug);
                setOpen(false);
              }}
            />
          ))}
          {!matches.length && <div className="muted pad">no matches</div>}
        </div>
      )}
    </div>
  );
}
