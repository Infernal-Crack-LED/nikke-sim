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
  hint = 'Click a card to fill the next open slot, drag portraits to reorder, click × to remove. Placed units leave the list. Nothing is applied to the page until you press Save Team.',
  restrict,
}: {
  staged: (string | null)[];
  onStagedChange: (next: (string | null)[]) => void;
  actions: ReactNode;
  onClose: () => void;
  hint?: string;
  restrict?: Set<string>;
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
      hint={hint}
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
      <CharacterGrid
        exclude={new Set(stagedUrls)}
        onToggle={place}
        restrict={restrict}
      />
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
      // absolute placement: the dragged unit lands exactly on the target slot
      // and swaps with whatever was there. A splice here shifted every unit
      // between source and target, so dragging one portrait re-ordered the
      // whole row behind it.
      const flat = staged.flat();
      const tmp = flat[from];
      flat[from] = flat[to];
      flat[to] = tmp;
      onStagedChange(
        Array.from({ length: rows }, (_, t) => flat.slice(t * 5, t * 5 + 5)),
      );
    },
    (i) => {
      const t = Math.floor(i / 5);
      const u = i % 5;
      setActive((cur) => (cur && cur[0] === t && cur[1] === u ? null : [t, u]));
    },
    { ignoreFrom: '.chip-x', commitOnDrop: true },
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
                      className={`team-chip roster-slot${isActive ? ' active' : ''}${reorder.dragIndex === i ? ' dragging' : ''}${reorder.overIndex === i ? ' droptarget' : ''}`}
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

// Generator "Exclude" picker — replaces the old Blocked-characters text entry.
// A flat, unbounded list of Nikkes to keep out of the search: click a card to
// exclude it (it moves up into the strip and leaves the grid); click × on a
// portrait to keep it again. Same click-to-add / ×-to-remove interaction as the
// Include pickers, just without any team/slot structure.
export function BrowseExcludeModal({
  staged,
  onStagedChange,
  actions,
  onClose,
  restrict,
  hint = 'Click a card to exclude it from the search — excluded Nikkes move up here and leave the list. Click × to keep one again. Changes apply the next time you calculate.',
}: {
  staged: string[];
  onStagedChange: (next: string[]) => void;
  actions: ReactNode;
  onClose: () => void;
  restrict?: Set<string>;
  hint?: string;
}) {
  const thumbs = usePortraitThumbs(staged, 72);
  const add = (slug: string) => {
    if (staged.includes(slug)) return;
    onStagedChange([...staged, slug]);
  };
  const remove = (slug: string) =>
    onStagedChange(staged.filter((s) => s !== slug));

  return (
    <PickerShell
      hint={hint}
      actions={actions}
      onClose={onClose}
      portraits={
        staged.length > 0 ? (
          <div className='exclude-strip'>
            {staged.map((slug) => {
              const c = data.characters[slug];
              return (
                <div
                  key={slug}
                  className='team-chip exclude-chip active'
                  title={c?.name ?? slug}
                >
                  {c?.imageUrl ? (
                    <img
                      src={thumbs[c.imageUrl] ?? c.imageUrl}
                      alt={c?.name ?? slug}
                      draggable={false}
                    />
                  ) : (
                    <span className='chip-empty'>?</span>
                  )}
                  <span
                    className='chip-x'
                    role='button'
                    aria-label='remove'
                    onClick={() => remove(slug)}
                  >
                    ×
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className='muted exclude-empty'>
            No Nikkes excluded yet — click cards below to exclude them from the
            search.
          </p>
        )
      }
    >
      <CharacterGrid
        exclude={new Set(staged)}
        onToggle={add}
        restrict={restrict}
      />
    </PickerShell>
  );
}

// Roster GENERATOR's picker (5 teams for solo raid, 3 for union raid). Two kinds
// of lock, mirroring the two ways a unit can be required:
//   - the team rows — "use these Nikkes on THESE teams" (pinned to a team)
//   - the side box — "use these Nikkes" (the generator picks their team)
// Clicking a card adds it to the box; dragging a portrait between the box and a
// team row pins/unpins it. Team + box slots share one flat drag field so a chip
// can move anywhere.
export function BrowseRosterGenModal({
  staged,
  onStagedChange,
  generic,
  onGenericChange,
  actions,
  onClose,
  restrict,
}: {
  staged: (string | null)[][];
  onStagedChange: (next: (string | null)[][]) => void;
  generic: (string | null)[];
  onGenericChange: (next: (string | null)[]) => void;
  actions: ReactNode;
  onClose: () => void;
  restrict?: Set<string>;
}) {
  const rows = staged.length;
  const teamLen = rows * 5;
  const stagedUrls = [...staged.flat(), ...generic].filter(Boolean) as string[];
  const chipThumbs = usePortraitThumbs(stagedUrls, 72);

  // a clicked grid card lands in the next open box slot ("use these Nikkes")
  const place = (slug: string) => {
    const empty = generic.indexOf(null);
    if (empty < 0) return; // box full — remove one to add another
    const next = [...generic];
    next[empty] = slug;
    onGenericChange(next);
  };
  const clearAt = (t: number, u: number) => {
    const next = staged.map((row) => [...row]);
    next[t][u] = null;
    onStagedChange(next);
  };
  const removeGeneric = (i: number) => {
    const next = [...generic];
    next[i] = null;
    onGenericChange(next);
  };

  // one flat drag field over [team slots…, box slots…] — dragging a chip onto a
  // team row pins it to that team, dragging it back onto the box unpins it
  const reorder = useDragReorder(
    (from, to) => {
      const flat = [...staged.flat(), ...generic];
      const [item] = flat.splice(from, 1);
      flat.splice(to, 0, item);
      onStagedChange(
        Array.from({ length: rows }, (_, t) => flat.slice(t * 5, t * 5 + 5)),
      );
      onGenericChange(flat.slice(teamLen));
    },
    undefined,
    { ignoreFrom: '.chip-x' },
  );

  const dragging = reorder.dragIndex !== null;

  return (
    <PickerShell
      hint='Click a card to drop it into the “Use these Nikkes” box — the generator fields each one on whichever team fits best. Drag a portrait onto a team row to pin it to that exact team; drag it back into the box to unpin. Every included Nikke is guaranteed to make the generated teams.'
      actions={actions}
      onClose={onClose}
      portraits={
        <div className='roster-input rostergen-input'>
          <div className='rostergen-teams'>
            {staged.map((row, t) => (
              <div className='roster-input-row' key={t}>
                <span className='rg-label muted'>team {t + 1}</span>
                <div className='roster-slots'>
                  {row.map((slug, u) => {
                    const c = slug ? data.characters[slug] : null;
                    const i = t * 5 + u;
                    return (
                      <button
                        key={u}
                        type='button'
                        ref={reorder.register(i)}
                        className={
                          'team-chip roster-slot' +
                          (reorder.dragIndex === i ? ' dragging' : '')
                        }
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
          <aside className='rostergen-box'>
            <div className='rostergen-box-head'>
              <span className='rostergen-box-label'>Use these Nikkes</span>
              <span className='muted rostergen-box-sub'>
                the generator picks their teams
              </span>
            </div>
            <div className='rostergen-box-scroll'>
              <div className='rostergen-box-slots'>
                {generic.map((slug, i) => {
                  const c = slug ? data.characters[slug] : null;
                  const flatIndex = teamLen + i;
                  // Empty slots only materialise mid-drag, as drop targets — the
                  // box otherwise shows just the Nikkes you've added (no
                  // placeholder grid).
                  if (!slug && !dragging) return null;
                  return (
                    <button
                      key={i}
                      type='button'
                      ref={reorder.register(flatIndex)}
                      className={
                        'team-chip roster-slot rostergen-box-slot' +
                        (slug ? ' active' : '') +
                        (reorder.dragIndex === flatIndex ? ' dragging' : '')
                      }
                      title={c?.name ?? 'drop here to unpin'}
                      {...(slug ? reorder.handleProps(flatIndex) : {})}
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
                            removeGeneric(i);
                          }}
                        >
                          ×
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <p className='muted rostergen-box-hint'>
                Click a card to add it here. Drag a portrait onto a team row to
                pin it to that team — drag it back to unpin.
              </p>
            </div>
          </aside>
        </div>
      }
    >
      <CharacterGrid
        exclude={new Set(stagedUrls)}
        onToggle={place}
        restrict={restrict}
      />
    </PickerShell>
  );
}
