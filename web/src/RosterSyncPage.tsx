import { useEffect, useMemo, useRef, useState } from 'react';
import charactersJson from '../../data/characters.json';
import { BrandIcon } from './social-icons';
import {
  ApiError,
  deleteNikkeAccount,
  fetchNikkeAccounts,
  fetchRoster,
  setNikkeAccount,
  type AuthUser,
  type NikkeAccount,
  type RosterCharacter,
  type RosterResponse,
} from './auth';

// Sync a logged-in user's NIKKE roster into the sim by pasting their blablalink
// profile link. The bakery-bot web service does the work (reads blablalink with a
// shared service account, caches rosters in Postgres, and auto-links the open id
// as the user's current account); this page is the happy-path UI over that API.
// See the roster-sync handoff for the full contract.

// name_code → known sim unit, so the roster summary can show portraits + names
// for units the sim models. Codes live at role.meta.name_code in characters.json;
// unmodeled units just render by their name_code + combat power.
const UNIT_BY_CODE: Record<number, { slug: string; name: string; imageUrl: string }> =
  (() => {
    const map: Record<number, { slug: string; name: string; imageUrl: string }> = {};
    const chars = (charactersJson as any).characters as Record<string, any>;
    for (const [slug, c] of Object.entries(chars)) {
      const code = c?.role?.meta?.name_code;
      if (code != null) map[code] = { slug, name: c.name, imageUrl: c.imageUrl };
    }
    return map;
  })();

// "3 minutes ago" / "just now" — coarse, good enough for staleness signalling.
function timeAgo(iso: string | null): string {
  if (!iso) return 'never';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 'unknown';
  const sec = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (sec < 45) return 'just now';
  const units: [number, string][] = [
    [60, 'second'],
    [60, 'minute'],
    [24, 'hour'],
    [30, 'day'],
    [12, 'month'],
    [Number.POSITIVE_INFINITY, 'year'],
  ];
  let val = sec;
  let unit = 'second';
  for (const [size, name] of units) {
    if (val < size) {
      unit = name;
      break;
    }
    val = Math.floor(val / size);
    unit = name;
  }
  const n = Math.max(1, val);
  return `${n} ${unit}${n === 1 ? '' : 's'} ago`;
}

// A friendly message for each error status, plus whether to surface the unprivate
// instructions (the 502 private-roster case is the failure we handle best).
function describeError(err: unknown): { msg: string; unprivate: boolean; retryAfterSec?: number } {
  if (err instanceof ApiError) {
    switch (err.status) {
      case 400:
        return { msg: "That doesn't look like a valid link or open id.", unprivate: false };
      case 401:
        return { msg: 'Please log in with Discord to sync your roster.', unprivate: false };
      case 429:
        return {
          msg: 'Too many syncs — please wait a moment and try again.',
          unprivate: false,
          retryAfterSec: err.body?.retryAfterSec,
        };
      case 502:
        return {
          msg: "Couldn't read that roster. It's usually because the roster is private — follow the steps below to make it visible, then Sync again.",
          unprivate: true,
        };
      case 500:
        return { msg: 'Roster sync is temporarily unavailable. Please try again later.', unprivate: false };
      default:
        return { msg: `Something went wrong (${err.status}).`, unprivate: false };
    }
  }
  return { msg: 'Something went wrong. Please try again.', unprivate: false };
}

function UnitTile({ c }: { c: RosterCharacter }) {
  const known = UNIT_BY_CODE[c.name_code];
  return (
    <div className='roster-unit' title={known ? known.name : `Unit ${c.name_code}`}>
      <div className='roster-unit-portrait'>
        {known ? (
          <img src={known.imageUrl} alt='' loading='lazy' />
        ) : (
          <span className='roster-unit-code'>{c.name_code}</span>
        )}
      </div>
      <div className='roster-unit-name'>{known ? known.name : `#${c.name_code}`}</div>
      <div className='roster-unit-cp muted'>{c.combat.toLocaleString()}</div>
    </div>
  );
}

// Unprivate-your-roster instructions — verbatim from the Discord /unprivate-blabla
// command. Auto-surfaced on a 502 (private roster); otherwise collapsible.
function UnprivateHelp({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <div className='patch-entry roster-unprivate'>
      <button className='roster-unprivate-head' onClick={onToggle} aria-expanded={open}>
        <span className='patch-title'>Roster private? Make it visible</span>
        <span className='muted'>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className='roster-unprivate-body'>
          <p className='muted' style={{ margin: '4px 0 10px' }}>
            A sync only works if your roster is public in SHIFTYPAD. If it isn't, follow these steps:
          </p>
          <ol>
            <li>
              Sign in to{' '}
              <a href='https://www.blablalink.com/' target='_blank' rel='noreferrer'>
                blablalink.com
              </a>
              .
            </li>
            <li>Click your <strong>profile icon</strong> in the top-right.</li>
            <li>Click your <strong>profile card</strong>.</li>
            <li>Click the <strong>padlock icon</strong> in the top-right (highlighted below).</li>
            <li>
              Set <strong>"In SHIFTYPAD, show my My Nikkes."</strong> to{' '}
              <strong>"Visible to All."</strong>
            </li>
          </ol>
          <img
            className='roster-unprivate-shot'
            src={`${import.meta.env.BASE_URL}blabla-padlock.png`}
            alt='blablalink profile card with the padlock icon highlighted in the top-right'
          />
        </div>
      )}
    </div>
  );
}

export function RosterSyncPage({
  user,
  onLogin,
}: {
  user: AuthUser | null;
  onLogin: () => void;
}) {
  const [accounts, setAccounts] = useState<NikkeAccount[] | null>(null);
  const [roster, setRoster] = useState<RosterResponse | null>(null);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false); // a live sync is in flight
  const [loadingInitial, setLoadingInitial] = useState(false);
  const [error, setError] = useState<ReturnType<typeof describeError> | null>(null);
  const [unprivateOpen, setUnprivateOpen] = useState(false);
  const [showSwitch, setShowSwitch] = useState(false);
  const didInit = useRef(false);

  const current = useMemo(() => accounts?.find((a) => a.current) ?? null, [accounts]);

  // On load (once we have a user): pull the account list, and if a current
  // account has been synced before, preload its roster from the DB (instant).
  useEffect(() => {
    if (!user || didInit.current) return;
    didInit.current = true;
    let cancelled = false;
    setLoadingInitial(true);
    (async () => {
      try {
        const accs = await fetchNikkeAccounts();
        if (cancelled) return;
        setAccounts(accs);
        const cur = accs.find((a) => a.current);
        if (cur && cur.syncedAt) {
          const r = await fetchRoster(cur.openId, { details: true });
          if (!cancelled) setRoster(r);
        }
      } catch (e) {
        if (!cancelled && e instanceof ApiError && e.status === 401) {
          // token expired mid-session — the header login control handles re-auth
        }
      } finally {
        if (!cancelled) setLoadingInitial(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Sync the pasted profile link (or a re-sync of the current account).
  const runSync = async (openid: string, refresh: boolean) => {
    const id = openid.trim();
    if (!id) {
      setError({ msg: "Paste your blablalink profile link (or open id) first.", unprivate: false });
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const r = await fetchRoster(id, { details: true, refresh });
      setRoster(r);
      setShowSwitch(false);
      setInput('');
      // A successful sync auto-links the account — refresh the account list so the
      // current-account panel reflects it.
      try {
        setAccounts(await fetchNikkeAccounts());
      } catch {
        /* non-fatal — roster already shown */
      }
    } catch (e) {
      const desc = describeError(e);
      setError(desc);
      if (desc.unprivate) setUnprivateOpen(true);
    } finally {
      setBusy(false);
    }
  };

  const switchAccount = async (openId: string) => {
    setBusy(true);
    setError(null);
    try {
      const accs = await setNikkeAccount(openId);
      setAccounts(accs);
      const cur = accs.find((a) => a.current);
      setRoster(cur?.syncedAt ? await fetchRoster(cur.openId, { details: true }) : null);
    } catch (e) {
      setError(describeError(e));
    } finally {
      setBusy(false);
    }
  };

  const forgetAccount = async (openId: string) => {
    try {
      await deleteNikkeAccount(openId);
      const accs = await fetchNikkeAccounts();
      setAccounts(accs);
      if (roster && roster.openId === openId) setRoster(null);
    } catch (e) {
      setError(describeError(e));
    }
  };

  // Top-CP units first — a compact, recognizable summary of a big roster.
  const topUnits = useMemo(
    () =>
      roster
        ? [...roster.characters].sort((a, b) => b.combat - a.combat).slice(0, 24)
        : [],
    [roster],
  );

  const history = accounts?.filter((a) => !a.current) ?? [];

  return (
    <div className='app roster-sync-page'>
      <header>
        <h1>Sync your NIKKE roster</h1>
        <p className='muted'>
          Paste your blablalink profile link to pull your roster into the sim — no manual
          entry. Your roster is remembered between sessions; just come back and it loads
          automatically.
        </p>
      </header>

      {!user ? (
        <div className='patch-entry roster-login'>
          <p className='muted' style={{ margin: '0 0 12px' }}>
            Log in with Discord to sync your roster.
          </p>
          <button className='share-btn discord' onClick={onLogin}>
            <span className='discord-icon' aria-hidden='true'>
              <BrandIcon name='discord' />
            </span>
            <span>Log in with Discord</span>
          </button>
        </div>
      ) : (
        <>
          {/* Current account panel — shown once a synced account exists. */}
          {current && current.syncedAt && !showSwitch && (
            <div className='patch-entry roster-current'>
              <div className='patch-head'>
                <span className='patch-title'>{current.label || 'My roster'}</span>
                <span className='patch-date'>synced {timeAgo(current.syncedAt)}</span>
              </div>
              <div className='roster-current-meta muted'>
                <span>open id ···{current.openId.slice(-6)}</span>
                {roster && <span>· {roster.count} units</span>}
              </div>
              <div className='roster-current-actions'>
                <button
                  className='share-btn'
                  disabled={busy}
                  onClick={() => runSync(current.openId, true)}
                >
                  {busy ? 'Syncing…' : 'Re-sync'}
                </button>
                <button className='share-btn ghost' disabled={busy} onClick={() => setShowSwitch(true)}>
                  Switch account
                </button>
              </div>
            </div>
          )}

          {/* Open id input — shown when there's no current account, or on "Switch". */}
          {(!current || !current.syncedAt || showSwitch) && (
            <div className='patch-entry roster-input-card'>
              <label className='roster-input-label' htmlFor='roster-openid'>
                Paste your blablalink profile link (or open id)
              </label>
              <div className='roster-input-row'>
                <input
                  id='roster-openid'
                  className='roster-openid-input'
                  type='text'
                  placeholder='https://www.blablalink.com/user?openid=…'
                  value={input}
                  disabled={busy}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') runSync(input, true);
                  }}
                />
                <button className='share-btn' disabled={busy} onClick={() => runSync(input, true)}>
                  {busy ? 'Syncing…' : 'Sync'}
                </button>
                {showSwitch && (
                  <button className='share-btn ghost' disabled={busy} onClick={() => setShowSwitch(false)}>
                    Cancel
                  </button>
                )}
              </div>
              <p className='muted roster-input-hint'>
                Open your blablalink profile — the address bar shows something like{' '}
                <code>blablalink.com/user?openid=…</code>. Paste that whole link.
              </p>
            </div>
          )}

          {error && (
            <div className='roster-error'>
              {error.msg}
              {error.retryAfterSec ? ` (try again in ${error.retryAfterSec}s)` : ''}
            </div>
          )}

          {loadingInitial && !roster && <p className='muted'>Loading your roster…</p>}

          {/* Roster summary. */}
          {roster && (
            <div className='patch-entry roster-summary'>
              <div className='patch-head'>
                <span className='patch-title'>{roster.count} units</span>
                <span className='patch-date'>
                  {roster.source === 'live' ? 'freshly synced' : `synced ${timeAgo(roster.syncedAt)}`}
                </span>
              </div>
              <div className='roster-unit-grid'>
                {topUnits.map((c) => (
                  <UnitTile key={c.name_code} c={c} />
                ))}
              </div>
              {roster.count > topUnits.length && (
                <p className='muted roster-more'>
                  + {roster.count - topUnits.length} more units
                </p>
              )}
            </div>
          )}

          {/* My accounts — history + forget/switch (kept subtle). */}
          {history.length > 0 && (
            <div className='patch-entry roster-accounts'>
              <div className='patch-head'>
                <span className='patch-title'>Other accounts</span>
              </div>
              <ul className='roster-account-list'>
                {history.map((a) => (
                  <li key={a.id}>
                    <span className='roster-account-id'>
                      {a.label || `···${a.openId.slice(-6)}`}
                    </span>
                    <span className='muted'>
                      {a.syncedAt ? `synced ${timeAgo(a.syncedAt)}` : 'never synced'}
                    </span>
                    <button className='roster-account-btn' disabled={busy} onClick={() => switchAccount(a.openId)}>
                      Use
                    </button>
                    <button className='roster-account-btn danger' onClick={() => forgetAccount(a.openId)}>
                      Forget
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <UnprivateHelp open={unprivateOpen} onToggle={() => setUnprivateOpen((o) => !o)} />
        </>
      )}
    </div>
  );
}
