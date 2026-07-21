import { useState } from 'react';
import type { ReactNode } from 'react';
import charactersJson from '../../../data/characters.json';
import type { DataFile } from '../../../src/types';
import { usePortraitThumbs } from '../usePortraitThumbs';
import { useDragReorder } from '../useDragReorder';
import { CharacterGrid } from './CharacterGrid';

const data = charactersJson as unknown as DataFile;

// Shared shell for the Browse Nikkes modals: heading + selection area + commit
// buttons + the filterable roster grid + hint. The commit buttons sit directly
// under the staged portraits so they're in reach before scrolling the grid. The
// selection state is OWNED BY THE CALLER (App) so a dismissed modal keeps its
// staged team — nothing is applied to the page until a Save button is pressed,
// and reopening shows the picks exactly as they were left.
function PickerShell({
  hint,
  actions,
  onClose,
  portraits,
  children,
}: {
  hint: string;
  actions: ReactNode;
  onClose: () => void;
  portraits: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className='modal-backdrop' onClick={onClose}>
      <div className='modal modal-wide' onClick={(e) => e.stopPropagation()}>
        <div className='modal-head'>
          <h2>Browse Nikkes</h2>
          <button className='modal-x' onClick={onClose}>
            ×
          </button>
        </div>
        {portraits}
        <div className='teambuilder-actions'>{actions}</div>
        {children}
        <p className='muted picker-hint'>{hint}</p>
      </div>
    </div>
  );
}

// Team Sim's picker: a five-slot strip. Opens pre-populated with the page's
// current team; "Save Team" writes the strip back into the five slots.
export function BrowseNikkesModal({
  staged,
  onStagedChange,
  actions,
  onClose,
}: {
  staged: (string | null)[];
  onStagedChange: (next: (string | null)[]) => void;
  actions: ReactNode;
  onClose: () => void;
}) {
  const stagedUrls = staged.filter(Boolean) as string[];
  const stripThumbs = usePortraitThumbs(stagedUrls, 124);

  const place = (slug: string) => {
    const empty = staged.indexOf(null);
    if (empty < 0) return; // strip full — remove one to add another
    const next = [...staged];
    next[empty] = slug;
    onStagedChange(next);
  };
  const remove = (i: number) => {
    const next = [...staged];
    next[i] = null;
    onStagedChange(next);
  };
  // drag to reorder the strip
  const reorder = useDragReorder(
    (from, to) => {
      const next = [...staged];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      onStagedChange(next);
    },
    undefined,
    { ignoreFrom: '.chip-x' },
  );

  return (
    <PickerShell
      hint='Click a card to fill the next open slot, drag portraits to reorder, click × to remove. Placed units leave the list. Nothing is applied to the page until you press Save Team.'
      actions={actions}
      onClose={onClose}
      portraits={
        <div className='teambuilder-team'>
          <div className='roster-slots'>
            {staged.map((slug, i) => {
              const c = slug ? data.characters[slug] : null;
              return (
                <button
                  key={i}
                  type='button'
                  ref={reorder.register(i)}
                  className={
                    'team-chip roster-slot' +
                    (slug ? ' active' : '') +
                    (reorder.dragIndex === i ? ' dragging' : '')
                  }
                  title={c?.name ?? `slot ${i + 1}`}
                  {...reorder.handleProps(i)}
                >
                  {c?.imageUrl ? (
                    <img
                      src={stripThumbs[c.imageUrl] ?? c.imageUrl}
                      alt={c.name}
                      draggable={false}
                    />
                  ) : (
                    <span className='chip-empty'>+</span>
                  )}
                  {slug && (
                    <span
                      className='chip-x'
                      role='button'
                      aria-label='remove'
                      onClick={(e) => {
                        e.stopPropagation();
                        remove(i);
                      }}
                    >
                      ×
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      }
    >
      <CharacterGrid exclude={new Set(stagedUrls)} onToggle={place} />
    </PickerShell>
  );
}

// Roster Sim's picker: the full roster grid (5 teams for solo raid, 3 for
// union raid), so every team is staged at once. Click a slot to target it, or
// just click cards to fill the next open slot row-by-row; "Save Roster" writes
// all slots to the page.
export function BrowseRosterNikkesModal({
  staged,
  onStagedChange,
  actions,
  onClose,
}: {
  staged: (string | null)[][];
  onStagedChange: (next: (string | null)[][]) => void;
  actions: ReactNode;
  onClose: () => void;
}) {
  // which slot the next clicked card fills (null = next open slot, row-major)
  const [active, setActive] = useState<[number, number] | null>(null);

  const stagedUrls = staged.flat().filter(Boolean) as string[];
  const chipThumbs = usePortraitThumbs(stagedUrls, 72);

  const place = (slug: string) => {
    const next = staged.map((row) => [...row]);
    if (active) {
      next[active[0]][active[1]] = slug;
      setActive(null);
    } else {
      let placed = false;
      for (let t = 0; t < next.length && !placed; t++) {
        for (let u = 0; u < next[t].length && !placed; u++) {
          if (!next[t][u]) {
            next[t][u] = slug;
            placed = true;
          }
        }
      }
      if (!placed) return; // roster full — remove one to add another
    }
    onStagedChange(next);
  };
  const clearAt = (t: number, u: number) => {
    const next = staged.map((row) => [...row]);
    next[t][u] = null;
    onStagedChange(next);
  };
  // drag to move a unit between slots — including across teams (all chips
  // register into one flat nearest-centre field); a press without movement
  // toggles the slot's targeting instead
  const rows = staged.length;
  const reorder = useDragReorder(
    (from, to) => {
      const flat = staged.flat();
      const [item] = flat.splice(from, 1);
      flat.splice(to, 0, item);
      onStagedChange(
        Array.from({ length: rows }, (_, t) => flat.slice(t * 5, t * 5 + 5)),
      );
    },
    (i) => {
      const t = Math.floor(i / 5);
      const u = i % 5;
      setActive((cur) => (cur && cur[0] === t && cur[1] === u ? null : [t, u]));
    },
    { ignoreFrom: '.chip-x' },
  );

  return (
    <PickerShell
      hint='Click a slot to target it, then click a card — or just click cards to fill the next open slot. Drag portraits between slots or across teams; click × to clear a slot. Nothing is applied to the page until you press Save Roster.'
      actions={actions}
      onClose={onClose}
      portraits={
        <div className='roster-input'>
          {staged.map((row, t) => (
            <div className='roster-input-row' key={t}>
              <span className='rg-label muted'>team {t + 1}</span>
              <div className='roster-slots'>
                {row.map((slug, u) => {
                  const c = slug ? data.characters[slug] : null;
                  const i = t * 5 + u;
                  const isActive = active?.[0] === t && active?.[1] === u;
                  return (
                    <button
                      key={u}
                      type='button'
                      ref={reorder.register(i)}
                      className={`team-chip roster-slot${isActive ? ' active' : ''}${reorder.dragIndex === i ? ' dragging' : ''}`}
                      title={c?.name ?? `team ${t + 1} · slot ${u + 1}`}
                      {...reorder.handleProps(i)}
                    >
                      {c?.imageUrl ? (
                        <img
                          src={chipThumbs[c.imageUrl] ?? c.imageUrl}
                          alt={c.name}
                          draggable={false}
                        />
                      ) : (
                        <span className='chip-empty'>+</span>
                      )}
                      {slug && (
                        <span
                          className='chip-x'
                          role='button'
                          aria-label='remove'
                          onClick={(e) => {
                            e.stopPropagation();
                            clearAt(t, u);
                          }}
                        >
                          ×
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      }
    >
      <CharacterGrid exclude={new Set(stagedUrls)} onToggle={place} />
    </PickerShell>
  );
}
