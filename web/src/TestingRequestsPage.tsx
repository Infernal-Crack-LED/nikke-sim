import { dev } from './site-data';
import requests from './testing-requests.json';

// #testing-requests channel in the Maiden Discord — the invite from site-data.
const DISCORD_INVITE = dev.maiden.discordInvite;

interface TestRequest {
  id: number;
  team: string;
  note?: string;
}

export function TestingRequestsPage() {
  // lowest number first, so the list reads like a stable, cite-able index
  const open = [...(requests as TestRequest[])].sort((a, b) => a.id - b.id);
  return (
    <div className='app patch-notes testing-requests'>
      <header>
        <h1>Testing requested</h1>
        <p className='muted'>
          The sim is calibrated against Union Shooting Range on 3-Minute Boss
          Mode with scope-lock enabled. The more team tests the community
          submits, the tighter its accuracy gets — every verified run helps
          close the gap between prediction and reality. If you can run a clean
          fight, please share it.
        </p>
      </header>

      <article className='patch-entry'>
        <div className='patch-head'>
          <span className='patch-title'>How to run a test fight</span>
        </div>
        <ul>
          <li>
            <b>Use the scope-lock preset.</b> Every unit at skills 10 / 10 / 10,
            no cube, no favorite item (doll), Overload gear at 0 lines, 3★ /
            core 7, Synchro level 400. This is the fixed baseline the sim is
            validated against — a run under any other setup can’t be compared.
          </li>
          <li>
            <b>Fight in the Union Shooting Range on 3-minute boss mode.</b> Pick
            the boss so it is the same 180-second fight the sim models, and note
            the boss’s element (the element your team is advantaged against).
          </li>
          <li>
            <b>Report which unit was camera-focused</b> — but only if it wasn’t
            the default. Focus defaults to the middle slot (position 3); if you
            focused a different unit, tell us which one, since the focused unit
            generates extra burst gauge and that changes the rotation.
          </li>
          <li>
            <b>Capture the result.</b> A screenshot of the end-of-fight damage
            breakdown (per-unit totals) plus, ideally, a video of the full
            fight so full-burst counts and rotation can be checked.
          </li>
        </ul>
      </article>

      <article className='patch-entry'>
        <div className='patch-head'>
          <span className='patch-title'>Where to submit</span>
        </div>
        <ul>
          <li>
            Post it in <b>#testing-requests</b> in the Maiden Discord. Every
            submission needs, at minimum:
          </li>
          <li>
            <b>A screenshot of the end-of-fight damage screen</b> — the per-unit
            damage breakdown from the results screen. This is required.
          </li>
          <li>
            <b>Which unit was camera-focused</b>, if it wasn’t the default
            middle slot.
          </li>
          <li>Your team, the boss element, and a video of the fight if you have one.</li>
        </ul>
        <div className='dev-callout-links' style={{ marginTop: 12 }}>
          <a
            className='dev-link'
            href={DISCORD_INVITE}
            target='_blank'
            rel='noreferrer'
          >
            Join the Maiden Discord
          </a>
        </div>
      </article>

      <article className='patch-entry'>
        <div className='patch-head'>
          <span className='patch-title'>Open requests</span>
        </div>
        <p className='muted' style={{ marginBottom: 10 }}>
          When you report a fight, quote the request number below so we know
          which one it’s for.
        </p>
        {open.length ? (
          <ol className='test-request-list'>
            {open.map((rq) => (
              <li className='test-request' value={rq.id} key={rq.id}>
                <span className='test-request-team'>{rq.team}</span>
                {rq.note && (
                  <span className='test-request-note muted'> — {rq.note}</span>
                )}
              </li>
            ))}
          </ol>
        ) : (
          <p className='muted'>No open requests right now — check back soon.</p>
        )}
      </article>
    </div>
  );
}
