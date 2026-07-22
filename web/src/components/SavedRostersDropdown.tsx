import { useEffect, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import {
  deleteTeam,
  fetchTeams,
  type AuthUser,
  type SavedTeam,
} from '../auth';
import { decodeBuild } from '../../../src/share/build-code';

// Load dropdown for Roster Sim's saved rosters, modeled on SaveProfileControl
// (the Roster Generator's save/load chip). Roster Sim saves into the
// saved-teams store tagged by the build-code's `roster` field (doSaveRoster /
// doSaveUnionRoster in App.tsx), so this lists fetchTeams() filtered to
// roster builds and hands the picked entry to the same load path the
// My-teams modal uses. Renders nothing until the user is authenticated and
// has at least one saved roster (the 💾 Save button reveals it on first save).
export function SavedRostersDropdown({
  user,
  onLoad,
  refreshKey = 0,
}: {
  user: AuthUser | null;
  onLoad: (t: SavedTeam) => void;
  refreshKey?: number; // bump to re-fetch (a save just landed in the store)
}) {
  const [rosters, setRosters] = useState<SavedTeam[] | null>(null);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const refresh = () =>
    fetchTeams()
      .then((ts) => setRosters(ts.filter((t) => decodeBuild(t.code)?.roster)))
      .catch(() => setRosters(null));

  // fetch on mount (so we know whether to reveal the chip) and again each
  // time it opens (cheap; always up to date)
  useEffect(() => {
    if (user) refresh();
    else setRosters(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, refreshKey]);
  useEffect(() => {
    if (open && user) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user]);

  // dismiss on outside-click / Escape (shared dropdown pattern)
  useEffect(() => {
    if (!open) return;
    const onDocDown = (e: globalThis.MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node))
        setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!user) return null;

  const onDelete = async (t: SavedTeam, e: ReactMouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Delete "${t.name}"?`)) return;
    try {
      await deleteTeam(t.id);
      setRosters((rs) => (rs ? rs.filter((x) => x.id !== t.id) : rs));
    } catch (err) {
      window.alert(`Delete failed: ${(err as Error).message ?? err}`);
    }
  };

  const count = rosters?.length ?? 0;

  return (
    <div className='saveprofile' ref={wrapRef}>
      {count > 0 && (
        <button
          className='chip saveprofile-load'
          onClick={() => setOpen((o) => !o)}
          title='Load a saved roster'
        >
          ▾ Saved ({count})
        </button>
      )}
      {open && (
        <div className='saveprofile-list'>
          {rosters === null && <div className='muted pad'>loading…</div>}
          {rosters && rosters.length === 0 && (
            <div className='muted pad'>no saved rosters yet</div>
          )}
          {rosters?.map((t) => (
            <div key={t.id} className='saveprofile-row'>
              <button
                className='saveprofile-name'
                title={`Load "${t.name}"`}
                onClick={() => {
                  setOpen(false);
                  onLoad(t);
                }}
              >
                {t.name}
                {decodeBuild(t.code)?.rosterMode === 'union' && (
                  <span className='save-tag'>union</span>
                )}
              </button>
              <button
                className='saveprofile-del'
                title='delete'
                aria-label={`delete ${t.name}`}
                onClick={(e) => onDelete(t, e)}
              >
                🗑
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
