import { useEffect, useRef, useState } from 'react';
import charactersJson from '../../data/characters.json';
import type { DataFile, Element } from '../../src/types';
import { usePortraitThumbs } from './usePortraitThumbs';
import { useDragReorder } from './useDragReorder';
import { CharacterGrid } from './components/CharacterGrid';
import type { AuthUser } from './auth';

const data = charactersJson as unknown as DataFile;

// Per-team boss options for Union Raid (mirrors App.tsx UnionBossOpts)
export interface UnionBossOpts {
  weakness: Element | null;
  bossDef: string;
  core: number;
  coreCustom: boolean;
  coreCustomVal: string;
}
const defaultUnionBossOpts = (): UnionBossOpts => ({
  weakness: null,
  bossDef: '0',
  core: 0,
  coreCustom: false,
  coreCustomVal: '10',
});

const ELEMENTS: (Element | null)[] = [
  null,
  'Fire',
  'Water',
  'Wind',
  'Electric',
  'Iron',
];
const CORE_PRESETS = [
  { label: 'No Core', value: 0 },
  { label: '25%', value: 0.25 },
  { label: '50%', value: 0.5 },
  { label: '75%', value: 0.75 },
  { label: '100%', value: 1 },
] as const;

export type RosterMode = 'team' | 'solo' | 'union';

export interface TeamBuilderProps {
  user: AuthUser | null;
  onSaveTeam: (slugs: (string | null)[]) => Promise<void>;
  // Write the built team into the Team Sim's slots and switch to it; returns a
  // warning message (and does NOT switch) when the team holds a unit the sim
  // doesn't model yet.
  onCopyToSim: (slugs: (string | null)[]) => string | null;
  // Write the expanded roster into the Roster Sim and switch to it; returns a
  // warning (and does NOT switch) on unsupported units.
  onCopyToRoster: (
    rows: (string | null)[][],
    mode: 'solo' | 'union',
  ) => string | null;
  // Report the current build up to the App so the page header's Generate
  // link / Copy image buttons can act on it (team vs roster implementation
  // depends on rosterMode).
  onTeamChange: (
    slugs: (string | null)[],
    rosterMode: RosterMode,
    unionBossOpts?: UnionBossOpts[],
  ) => void;
}

// The dedicated Team Builder page (Tools section): stage a team on the strip
// via the filterable roster grid, then hand it off to the Team Sim or the
// Roster Sim. Units already placed leave the grid. The + beside the strip
// offers a choice: expand to a full 5×5 solo-raid roster or a 3×5 union-raid
// roster (with per-team boss options). Not-in-sim units CAN be placed here
// (browsable backlog) — the copy buttons warn and stay put if one is in the
// selection.
export function TeamBuilderPage({
  user,
  onSaveTeam,
  onCopyToSim,
  onCopyToRoster,
  onTeamChange,
}: TeamBuilderProps) {
  const [savedFlash, setSavedFlash] = useState(false);
  const [copyWarning, setCopyWarning] = useState<string | null>(null);
  // 'team' = one team of 5; 'solo' = full 5×5 roster; 'union' = 3×5 union raid
  const [rosterMode, setRosterMode] = useState<RosterMode>('team');
  // "+" choice popover
  const [showExpandChoice, setShowExpandChoice] = useState(false);
  const expandRef = useRef<HTMLDivElement>(null);

  // Team slots: 5 in team mode, 25 in solo mode, 15 in union mode
  const [teamSlots, setTeamSlots] = useState<(string | null)[]>([
    null,
    null,
    null,
    null,
    null,
  ]);

  // Per-team boss options for union mode (3 teams)
  const [unionBossOpts, setUnionBossOpts] = useState<UnionBossOpts[]>(
    Array.from({ length: 3 }, defaultUnionBossOpts),
  );

  // Keep the App's copy of the build in sync (drives the header share buttons)
  useEffect(() => {
    onTeamChange(
      teamSlots,
      rosterMode,
      rosterMode === 'union' ? unionBossOpts : undefined,
    );
  }, [teamSlots, rosterMode, unionBossOpts, onTeamChange]);

  // Dismiss the expand-choice popover on outside click / Escape
  useEffect(() => {
    if (!showExpandChoice) return;
    const onDocDown = (e: globalThis.MouseEvent) => {
      if (expandRef.current && !expandRef.current.contains(e.target as Node))
        setShowExpandChoice(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowExpandChoice(false);
    };
    document.addEventListener('mousedown', onDocDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [showExpandChoice]);

  const slotCount =
    rosterMode === 'solo' ? 25 : rosterMode === 'union' ? 15 : 5;
  const teamCount = rosterMode === 'solo' ? 5 : rosterMode === 'union' ? 3 : 1;

  const expandTo = (mode: 'solo' | 'union') => {
    setCopyWarning(null);
    setShowExpandChoice(false);
    setTeamSlots((prev) => {
      const target = mode === 'solo' ? 25 : 15;
      if (prev.length >= target) return prev.slice(0, target);
      return [
        ...prev,
        ...Array.from({ length: target - prev.length }, () => null),
      ];
    });
    setRosterMode(mode);
  };
  const collapseToTeam = () => {
    setCopyWarning(null);
    setTeamSlots((prev) => prev.slice(0, 5));
    setRosterMode('team');
  };

  // Drag-to-reorder for team slots.
  const moveSlot = (from: number, to: number) => {
    setTeamSlots((prev) => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  };
  const teamReorder = useDragReorder(moveSlot, undefined, {
    ignoreFrom: '.chip-x',
  });

  // Add a character to the next empty slot. If already in the team, remove them.
  const toggleTeamSlot = (slug: string) => {
    setCopyWarning(null);
    setTeamSlots((prev) => {
      const existingIdx = prev.indexOf(slug);
      if (existingIdx >= 0) {
        const next = [...prev];
        next[existingIdx] = null;
        return next;
      }
      const emptyIdx = prev.indexOf(null);
      if (emptyIdx < 0) return prev; // team full — remove one to add another
      const next = [...prev];
      next[emptyIdx] = slug;
      return next;
    });
  };

  const removeFromSlot = (idx: number) => {
    setCopyWarning(null);
    setTeamSlots((prev) => {
      const next = [...prev];
      next[idx] = null;
      return next;
    });
  };

  const clearTeam = () => {
    setTeamSlots(Array.from({ length: slotCount }, () => null));
    setCopyWarning(null);
  };

  const hasTeam = teamSlots.some((s) => s !== null);

  const handleSaveTeam = async () => {
    if (!hasTeam) return;
    const names = teamSlots
      .filter(Boolean)
      .map((s) => data.characters[s!].name);
    const defaultName = names.slice(0, 2).join(' / ') || 'My team';
    const name = window.prompt('Save team as:', defaultName);
    if (!name?.trim()) return;
    try {
      await onSaveTeam(teamSlots);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1500);
    } catch (e) {
      window.alert(`Save failed: ${(e as Error).message ?? e}`);
    }
  };

  // the current build as rows — one row in team mode, five in solo, three in union
  const currentRows = () =>
    rosterMode === 'team'
      ? [teamSlots]
      : Array.from({ length: teamCount }, (_, r) =>
          teamSlots.slice(r * 5, r * 5 + 5),
        );

  const handleCopyToSim = () => {
    if (!hasTeam) return;
    setCopyWarning(onCopyToSim(teamSlots));
  };

  const handleCopyToRoster = () => {
    if (!hasTeam) return;
    const mode = rosterMode === 'union' ? 'union' : 'solo';
    setCopyWarning(onCopyToRoster(currentRows(), mode));
  };

  const setUnionBossOpt = (ti: number, patch: Partial<UnionBossOpts>) =>
    setUnionBossOpts((prev) =>
      prev.map((o, i) => (i === ti ? { ...o, ...patch } : o)),
    );

  // Portrait thumbs for the strip chips — team-sized in team mode, the
  // smaller roster-sim chips in roster modes
  const teamSlotUrls = teamSlots.filter(Boolean) as string[];
  const teamSlotThumbs = usePortraitThumbs(
    teamSlotUrls,
    rosterMode === 'team' ? 124 : 72,
  );

  // Units already placed (anywhere in the grid) leave the grid below
  const stripSet = new Set(teamSlotUrls);

  // One slot chip — draggable in all modes; in the grid a drag can cross
  // teams (nearest-centre targeting over all registered chips)
  const renderChip = (i: number, draggable: boolean) => {
    const slug = teamSlots[i];
    const c = slug ? data.characters[slug] : null;
    return (
      <button
        key={i}
        type='button'
        ref={draggable ? teamReorder.register(i) : undefined}
        className={
          'team-chip roster-slot' +
          (slug ? ' active' : '') +
          (draggable && teamReorder.dragIndex === i ? ' dragging' : '')
        }
        title={c?.name ?? `slot ${i + 1}`}
        {...(draggable ? teamReorder.handleProps(i) : {})}
      >
        {c?.imageUrl ? (
          <img
            src={teamSlotThumbs[c.imageUrl] ?? c.imageUrl}
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
              removeFromSlot(i);
            }}
          >
            ×
          </span>
        )}
      </button>
    );
  };

  // Compact per-team boss options for union mode
  const renderUnionBossOpts = (ti: number) => {
    const o = unionBossOpts[ti];
    return (
      <div className='union-boss-opts'>
        <div className='union-boss-row'>
          <span className='union-boss-label'>Weakness</span>
          <div className='pills small'>
            {ELEMENTS.map((e) => (
              <button
                key={e ?? 'none'}
                className={o.weakness === e ? 'on' : ''}
                onClick={() => setUnionBossOpt(ti, { weakness: e })}
              >
                {e ?? 'None'}
              </button>
            ))}
          </div>
        </div>
        <div className='union-boss-row'>
          <span className='union-boss-label'>Boss DEF</span>
          <input
            className='num'
            value={o.bossDef}
            onChange={(e) => setUnionBossOpt(ti, { bossDef: e.target.value })}
          />
        </div>
        <div className='union-boss-row'>
          <span className='union-boss-label'>Core</span>
          <div className='pills small'>
            {CORE_PRESETS.map((p) => (
              <button
                key={p.label}
                className={!o.coreCustom && o.core === p.value ? 'on' : ''}
                onClick={() =>
                  setUnionBossOpt(ti, { core: p.value, coreCustom: false })
                }
              >
                {p.label}
              </button>
            ))}
            <button
              className={o.coreCustom ? 'on' : ''}
              onClick={() => setUnionBossOpt(ti, { coreCustom: true })}
            >
              Custom
            </button>
          </div>
          {o.coreCustom && (
            <input
              className='num'
              value={o.coreCustomVal}
              onChange={(e) =>
                setUnionBossOpt(ti, { coreCustomVal: e.target.value })
              }
              placeholder='%'
            />
          )}
        </div>
      </div>
    );
  };

  return (
    <section className='calc-tab teambuilder-page'>
      <p className='muted'>
        Browse all NIKKEs and filter by weapon, burst, class, element,
        manufacturer, or kit role. Click a card to add it to the team; click ×
        on a portrait to remove it. Then copy the team into the Sim or Roster
        Sim — or press + to build a full roster at once.
      </p>

      {/* Team slots — 5 boxes (or a full roster grid) that fill in as you click
          characters below; the + / − button switches between the modes */}
      <div className='teambuilder-team'>
        {rosterMode === 'team' ? (
          <div className='roster-slots'>
            {teamSlots.map((_, i) => renderChip(i, true))}
          </div>
        ) : (
          <div className='roster-input'>
            {Array.from({ length: teamCount }, (_, t) => (
              <div className='union-team-block' key={t}>
                <div className='roster-input-row'>
                  <span className='rg-label muted'>team {t + 1}</span>
                  <div className='roster-slots'>
                    {teamSlots
                      .slice(t * 5, t * 5 + 5)
                      .map((_, u) => renderChip(t * 5 + u, true))}
                  </div>
                </div>
                {rosterMode === 'union' && renderUnionBossOpts(t)}
              </div>
            ))}
          </div>
        )}
        <div className='teambuilder-expand-wrap' ref={expandRef}>
          {rosterMode === 'team' ? (
            <>
              <button
                type='button'
                className='teambuilder-expand'
                title='expand to a full roster'
                onClick={() => setShowExpandChoice((v) => !v)}
              >
                +
              </button>
              {showExpandChoice && (
                <div className='teambuilder-choice'>
                  <button type='button' onClick={() => expandTo('solo')}>
                    Solo Raid
                  </button>
                  <button type='button' onClick={() => expandTo('union')}>
                    Union Raid
                  </button>
                </div>
              )}
            </>
          ) : (
            <button
              type='button'
              className='teambuilder-expand'
              title='collapse to a single team of 5 (keeps team 1)'
              onClick={collapseToTeam}
            >
              −
            </button>
          )}
        </div>
      </div>

      {/* Team management actions — below the team portraits. Copy to Sim is a
          team-mode action (the 5-portrait strip); Copy to Roster Sim appears
          when expanded to a roster grid. Generate link + Copy image live in the
          page header (App) and switch implementations with the mode. */}
      {hasTeam && (
        <div className='teambuilder-actions'>
          <button className='teambuilder-clear' onClick={clearTeam}>
            Clear team
          </button>
          {user && (
            <button className='teambuilder-action' onClick={handleSaveTeam}>
              {savedFlash ? '✓ Saved' : '💾 Save team'}
            </button>
          )}
          {rosterMode !== 'team' ? (
            <button className='teambuilder-action' onClick={handleCopyToRoster}>
              ✎ Copy to Roster Sim
            </button>
          ) : (
            <button className='teambuilder-action' onClick={handleCopyToSim}>
              ✎ Copy to Sim
            </button>
          )}
        </div>
      )}

      {copyWarning && (
        <div className='teambuilder-warning' role='alert'>
          {copyWarning}
        </div>
      )}

      <CharacterGrid
        exclude={stripSet}
        onToggle={toggleTeamSlot}
        allowUnsupported
      />
    </section>
  );
}
