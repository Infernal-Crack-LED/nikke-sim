import { useEffect, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import {
  deleteProfile,
  fetchProfiles,
  saveProfile,
  type AuthUser,
  type SavedProfile,
} from '../auth';

// Reusable save/load control backed by the kind-tagged saved-profiles store
// (bakery-bot /api/profiles). Payload-agnostic: the caller supplies the current
// payload to save (`getCode`) and applies a loaded payload (`onLoad`), so the
// very same control serves flat Nikke lists (include/exclude) today and
// positioned team/roster builds — which remember order/location — later. The
// control never interprets the payload itself. Renders a quiet "log in" note
// until the user is authenticated (profiles are per-Discord-account).
export function SaveProfileControl({
  kind,
  user,
  getCode,
  onLoad,
  suggestName,
  noun = 'list',
}: {
  kind: string;
  user: AuthUser | null;
  getCode: () => string | null; // encode the current state; null = nothing to save
  onLoad: (code: string) => void; // apply a saved payload to the page
  suggestName: () => string;
  noun?: string; // "list" / "team" … used in labels + prompts
}) {
  const [profiles, setProfiles] = useState<SavedProfile[] | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const refresh = () =>
    fetchProfiles(kind)
      .then(setProfiles)
      .catch(() => setProfiles(null));

  // fetch on mount (so we know whether to reveal the load dropdown) and again
  // each time it opens (cheap; always up to date)
  useEffect(() => {
    if (user) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);
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

  if (!user) {
    return (
      <span className='muted saveprofile-signin'>Log in to save {noun}s</span>
    );
  }

  const onSave = async () => {
    const code = getCode();
    if (!code) return;
    const name = window.prompt(`Save ${noun} as:`, suggestName());
    if (!name?.trim()) return;
    setBusy(true);
    try {
      await saveProfile(kind, name.trim(), code);
      if (open) refresh();
    } catch (e) {
      window.alert(`Save failed: ${(e as Error).message ?? e}`);
    } finally {
      setBusy(false);
    }
  };

  const onPick = (p: SavedProfile) => {
    setOpen(false);
    onLoad(p.code);
  };

  const onDelete = async (p: SavedProfile, e: ReactMouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Delete "${p.name}"?`)) return;
    try {
      await deleteProfile(p.id);
      setProfiles((ps) => (ps ? ps.filter((x) => x.id !== p.id) : ps));
    } catch (err) {
      window.alert(`Delete failed: ${(err as Error).message ?? err}`);
    }
  };

  const count = profiles?.length ?? 0;

  return (
    <div className='saveprofile' ref={wrapRef}>
      <button
        className='chip saveprofile-save'
        onClick={onSave}
        disabled={busy}
        title={`Save the current ${noun}`}
      >
        💾 Save
      </button>
      {count > 0 && (
        <button
          className='chip saveprofile-load'
          onClick={() => setOpen((o) => !o)}
          title={`Load a saved ${noun}`}
        >
          ▾ Saved ({count})
        </button>
      )}
      {open && (
        <div className='saveprofile-list'>
          {profiles === null && <div className='muted pad'>loading…</div>}
          {profiles && profiles.length === 0 && (
            <div className='muted pad'>no saved {noun}s yet</div>
          )}
          {profiles?.map((p) => (
            <div key={p.id} className='saveprofile-row'>
              <button
                className='saveprofile-name'
                title={`Load "${p.name}"`}
                onClick={() => onPick(p)}
              >
                {p.name}
              </button>
              <button
                className='saveprofile-del'
                title='delete'
                aria-label={`delete ${p.name}`}
                onClick={(e) => onDelete(p, e)}
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
