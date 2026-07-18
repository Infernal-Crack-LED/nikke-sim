import { dev } from './site-data';
import requests from './testing-requests.json';

// Google Form recorders submit their test fights through — from site-data.
const FORM_URL = dev.testingFormUrl;

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
            <b>Use the scope-lock preset.</b> This is the fixed baseline the sim
            is validated against — a run under any other setup can’t be
            compared.
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
            <b>Record on the phone client, held horizontal (landscape).</b> Our
            reader pulls the numbers off the screen automatically, and it’s
            calibrated to the mobile UI in landscape orientation — so a
            screenshot from the PC client, or a phone held vertical, can’t be
            read. Please use the phone app in landscape for the damage screen (a
            landscape video, if you capture one, is ideal too).
          </li>
          <li>
            <b>Capture the result.</b> A screenshot of the end-of-fight damage
            breakdown (per-unit totals) plus, ideally, a video of the full fight
            so full-burst counts and rotation can be checked.
          </li>
          <li>
            <b>
              For video recordings on the phone client, game must be set to
              horizontal mode (landscape).
            </b>{' '}
            Our reader pulls the numbers off the screen automatically, and it’s
            calibrated to the mobile UI in landscape orientation — so a
            recording from the PC client, or the vertical combat UI, can’t be
            read. Please use the phone app in landscape for the recording.
          </li>
          <li>
            <b>Use these in-game settings when recording</b> so the fight
            matches what the sim models and every value is legible on screen:
            <ul>
              <li>Burst skill location: right</li>
              <li>Min firing rounds: on</li>
              <li>Skill cutscenes: off</li>
              <li>Switch Nikkes during auto combat: never</li>
              <li>Display values in battle: on (all)</li>
            </ul>
          </li>
        </ul>
      </article>

      <article className='patch-entry'>
        <div className='patch-head'>
          <span className='patch-title'>Where to submit</span>
        </div>
        <p className='muted' style={{ marginBottom: 10 }}>
          Everything goes through the submission form below — it uploads your
          files and captures the fight details in one step. Have these ready
          before you start:
        </p>
        <ul>
          <li>
            <b>The end-of-fight damage screenshot</b> — the per-unit damage
            breakdown from the results screen, captured on the{' '}
            <b>phone client held horizontal (landscape)</b> so our reader can
            parse it. Required.
          </li>
          <li>
            <b>A video of the full fight</b> — landscape, so full-burst counts
            and rotation can be checked.
          </li>
          <li>
            <b>Your team</b> (in slot order) and the <b>boss element</b> you
            were advantaged against.
          </li>
          <li>
            <b>Which request number</b> you’re fulfilling and{' '}
            <b>which unit was camera-focused</b>, if it wasn’t the default
            middle slot.
          </li>
        </ul>
        <div className='dev-callout-links' style={{ marginTop: 12 }}>
          <a
            className='dev-link'
            href={FORM_URL}
            target='_blank'
            rel='noreferrer'
          >
            Submit a test fight
          </a>
          <a
            className='dev-link'
            href={UPLOAD_FOLDER}
            target='_blank'
            rel='noreferrer'
          >
            Upload a recording
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
