import { useEffect, useState } from 'react';
import charactersJson from '../../data/characters.json';
import type { DataFile } from '../../src/types';
import { usePortraitThumbs } from './usePortraitThumbs';
import { useDragReorder } from './useDragReorder';
import { CharacterGrid } from './components/CharacterGrid';
import type { AuthUser } from './auth';

const data = charactersJson as unknown as DataFile;

export interface TeamBuilderProps {
  user: AuthUser | null;
  onSaveTeam: (slugs: (string | null)[]) => Promise<void>;
  // Write the built team into the Team Sim's slots and switch to it; returns a
  // warning message (and does NOT switch) when the team holds a unit the sim
  // doesn't model yet.
  onCopyToSim: (slugs: (string | null)[]) => string | null;
  // Write the expanded 5×5 into the Roster Sim and switch to it; returns a
  // warning (and does NOT switch) on unsupported units.
  onCopyToRoster: (rows: (string | null)[][]) => string | null;
  // Report the current build up to the App so the page header's Generate
  // link / Copy image buttons can act on it (team vs roster implementation
  // depends on rosterMode).
  onTeamChange: (slugs: (string | null)[], rosterMode: boolean) => void;
}

// The dedicated Team Builder page (Tools section): stage a team on the strip
// via the filterable roster grid, then hand it off to the Team Sim or the
// Roster Sim. Units already placed leave the grid. The + beside the strip
// expands it to a full 5×5 roster (roster-sim-sized chips) for building all
// five teams at once. Not-in-sim units CAN be placed here (browsable backlog)
// — the copy buttons warn and stay put if one is in the selection.
export function TeamBuilderPage({
  user,
  onSaveTeam,
  onCopyToSim,
  onCopyToRoster,
  onTeamChange,
}: TeamBuilderProps) {
  const [savedFlash, setSavedFlash] = useState(false);
  const [copyWarning, setCopyWarning] = useState<string | null>(null);
  // false = one team of 5; true = full 5×5 roster (25 slots, row-major)
  const [rosterMode, setRosterMode] = useState(false);

  // Team slots: 5 in team mode, 25 in roster mode; each holds a slug or null.
  const [teamSlots, setTeamSlots] = useState<(string | null)[]>([
    null,
    null,
    null,
    null,
    null,
  ]);

  // Keep the App's copy of the build in sync (drives the header share buttons)
  useEffect(() => {
    onTeamChange(teamSlots, rosterMode);
  }, [teamSlots, rosterMode, onTeamChange]);

  const expandToRoster = () => {
    setCopyWarning(null);
    setTeamSlots((prev) => [
      ...prev,
      ...Array.from({ length: 20 }, () => null),
    ]);
    setRosterMode(true);
  };
  const collapseToTeam = () => {
    setCopyWarning(null);
    setTeamSlots((prev) => prev.slice(0, 5));
    setRosterMode(false);
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
    setTeamSlots([null, null, null, null, null]);
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

  // the current build as rows — one row in team mode, five when expanded
  const currentRows = () =>
    rosterMode
      ? Array.from({ length: 5 }, (_, r) => teamSlots.slice(r * 5, r * 5 + 5))
      : [teamSlots];

  const handleCopyToSim = () => {
    if (!hasTeam) return;
    setCopyWarning(onCopyToSim(teamSlots));
  };

  const handleCopyToRoster = () => {
    if (!hasTeam) return;
    setCopyWarning(onCopyToRoster(currentRows()));
  };

  // Portrait thumbs for the strip chips — team-sized in team mode, the
  // smaller roster-sim chips in roster mode
  const teamSlotUrls = teamSlots.filter(Boolean) as string[];
  const teamSlotThumbs = usePortraitThumbs(teamSlotUrls, rosterMode ? 72 : 124);

  // Units already placed (anywhere in the 5×5) leave the grid below
  const stripSet = new Set(teamSlotUrls);

  // One slot chip — draggable in both modes; in the 5×5 a drag can cross
  // teams (nearest-centre targeting over all 25 registered chips)
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

  return (
    <section className='calc-tab teambuilder-page'>
      <p className='muted'>
        Browse all NIKKEs and filter by weapon, burst, class, element,
        manufacturer, or kit role. Click a card to add it to the team; click ×
        on a portrait to remove it. Then copy the team into the Sim or Roster
        Sim — or press + to build a full 5×5 roster at once.
      </p>

      {/* Team slots — 5 boxes (or a full 5×5 roster) that fill in as you click
          characters below; the + / − button switches between the two */}
      <div className='teambuilder-team'>
        {rosterMode ? (
          <div className='roster-input'>
            {Array.from({ length: 5 }, (_, t) => (
              <div className='roster-input-row' key={t}>
                <span className='rg-label muted'>team {t + 1}</span>
                <div className='roster-slots'>
                  {teamSlots
                    .slice(t * 5, t * 5 + 5)
                    .map((_, u) => renderChip(t * 5 + u, true))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className='roster-slots'>
            {teamSlots.map((_, i) => renderChip(i, true))}
          </div>
        )}
        <button
          type='button'
          className='teambuilder-expand'
          title={
            rosterMode
              ? 'collapse to a single team of 5 (keeps team 1)'
              : 'expand to a full 5×5 roster'
          }
          onClick={rosterMode ? collapseToTeam : expandToRoster}
        >
          {rosterMode ? '−' : '+'}
        </button>
      </div>

      {/* Team management actions — below the team portraits. Copy to Sim is a
          team-mode action (the 5-portrait strip); Copy to Roster Sim appears
          when expanded to the 5×5. Generate link + Copy image live in the
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
          {rosterMode ? (
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
