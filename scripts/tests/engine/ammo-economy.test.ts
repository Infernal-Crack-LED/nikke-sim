// Engine-primitive backfill: `instantReload` (8 carriers) + `consumeAmmo` (2) — the ammo-economy
// pair (TDD transition step 2, docs/handoffs/2026-07-23-tdd-transition-plan.md; primitive census in
// docs/engine-modeling-gaps.md). Literal inverses in sim.ts, but their clamps run in OPPOSITE
// directions — instantReload clamps at the magazine's TOP (`min(max, ammo + add)`), consumeAmmo
// clamps at the BOTTOM (`max(0, ammo - drain)`) — so a naive "sets ammo to round(max*fraction)"
// reading would get both wrong in exactly the cases below, where the effect is chained onto a
// KNOWN prior ammo state (via a preceding instantReload/consumeAmmo in the SAME block) so every
// assertion is deterministic and never depends on organic pre-trigger firing history.
//
// Method: the same zeroed-kit AR carrier pattern as weapon-swap.test.ts (`blanc`, `crown` as a
// bare-weapon filler), a synthetic `interval`-triggered skill1 block, and `sec`/`ammoAfter` off the
// `shot`/`reload`/`buffApply` events.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { bareWeaponOverride, data, runComp } from '../lib/harness.js';

type ShotEvent = Extract<SimEvent, { kind: 'shot' }>;
type ReloadEvent = Extract<SimEvent, { kind: 'reload' }>;
type BuffApplyEvent = Extract<SimEvent, { kind: 'buffApply' }>;

const CARRY = 'blanc'; // AR, ammo 60, reloadFrames 81 (~1.35s) — same plain carrier as weapon-swap.test.ts
const MAX_AMMO = data.characters[CARRY].ammo; // 60, deterministic (zeroed kit ⇒ no maxAmmoPct/Flat buffs)

const INTERVAL_SEC = 30; // fires t=30,60,90,120,150 — 5 firings across the 180s fight
const LAST_BULLET_STAT = 'critDamagePct'; // arbitrary marker stat for the lastBullet-triggered probe

// blanc keeps firing NORMALLY between our forced interval triggers, so her mag also empties and
// reloads organically every ~5s (12/s into a 60-round mag) — each of THOSE also fires lastBullet.
// A forced consumeAmmo's lastBullet fires SYNCHRONOUSLY in the same frame as the interval trigger,
// so a tight epsilon isolates the forced firings from the ~24 organic ones elsewhere in the fight.
const isTriggerSec = (sec: number) => {
  const nearest = Math.round(sec / INTERVAL_SEC) * INTERVAL_SEC;
  return nearest > 0 && Math.abs(sec - nearest) < 0.05;
};

/** Run blanc with a synthetic interval-triggered effect chain in skill1, plus a lastBullet probe. */
function ammoComp(effects: Record<string, unknown>[]) {
  const events: SimEvent[] = [];
  runComp({
    slugs: [CARRY, 'crown'],
    bossElement: 'Iron',
    focusSlug: CARRY,
    overrides: {
      [CARRY]: {
        slug: CARRY,
        skill1: [
          {
            slot: 'skill1',
            trigger: { kind: 'interval', sec: INTERVAL_SEC },
            target: { kind: 'self' },
            effects,
          },
          {
            slot: 'skill1',
            trigger: { kind: 'lastBullet' },
            target: { kind: 'self' },
            effects: [{ kind: 'buff', stat: LAST_BULLET_STAT, value: 1 }],
          },
        ],
        skill2: [],
        burst: [],
      } as any,
      crown: bareWeaponOverride('crown'),
    },
    cfg: { disableBursts: true, onEvent: (e) => events.push(e) },
  });
  const shots = events.filter(
    (e): e is ShotEvent => e.kind === 'shot' && e.slug === CARRY
  );
  const reloads = events.filter(
    (e): e is ReloadEvent => e.kind === 'reload' && e.slug === CARRY
  );
  const lastBullets = events.filter(
    (e): e is BuffApplyEvent =>
      e.kind === 'buffApply' &&
      e.targetSlug === CARRY &&
      e.stat === LAST_BULLET_STAT
  );
  /** The first shot at or after `sec`, or undefined if the fight ended first. */
  const firstShotAfter = (sec: number) => shots.find((s) => s.sec >= sec);
  return { events, shots, reloads, lastBullets, firstShotAfter };
}

describe('instantReload / consumeAmmo (ammo economy)', () => {
  it('fixture check — blanc has a plain 60-round mag and a non-trivial reload', () => {
    const c = data.characters[CARRY];
    expect(MAX_AMMO).toBe(60);
    expect(c.reloadFrames).toBeGreaterThan(0);
  });

  it('DISCRIMINATING: instantReload ADDS and CAPS at max — saturates from a known-full base, does not overshoot', () => {
    // Chain instantReload() [→ guaranteed ammo=60] then instantReload(0.5) immediately after in the
    // SAME block. A "set ammo = round(max*fraction)" misreading would drop this to 30; the real ADD
    // semantics (min(max, ammo+add)) leaves it saturated at 60 — the next shot's ammoAfter is 59.
    const { firstShotAfter } = ammoComp([
      { kind: 'instantReload' },
      { kind: 'instantReload', fraction: 0.5 },
    ]);
    const shot = firstShotAfter(INTERVAL_SEC);
    expect(
      shot,
      'no shot observed after the first interval firing'
    ).toBeDefined();
    expect(
      shot!.ammoAfter,
      'a fractional instantReload on top of a full mag should stay capped at max, not overshoot'
    ).toBe(MAX_AMMO - 1);
  });

  it('DISCRIMINATING: instantReload ADDS from a known-empty base — a genuine partial refill, not zero and not full', () => {
    // Chain consumeAmmo() [→ guaranteed ammo=0] then instantReload(0.5) immediately after. From a
    // zero base the ADD is unambiguous: round(60*0.5)=30, so the next shot's ammoAfter is 29 — proof
    // this is a real partial add, not a full refill (would read 59) and not a no-op (would read -1,
    // impossible, or force a reload instead of firing).
    const { firstShotAfter } = ammoComp([
      { kind: 'consumeAmmo' },
      { kind: 'instantReload', fraction: 0.5 },
    ]);
    const shot = firstShotAfter(INTERVAL_SEC);
    expect(
      shot,
      'no shot observed after the first interval firing'
    ).toBeDefined();
    expect(
      shot!.ammoAfter,
      'a 0.5-fraction instantReload from an empty mag should add round(max*0.5), capped nowhere near here'
    ).toBe(30 - 1);
  });

  it('DISCRIMINATING: instantReload interrupts an in-progress forced reload — firing resumes immediately, no reload-timer wait', () => {
    // consumeAmmo() drains to 0 and forces reloading=true; instantReload() immediately after (same
    // block, same frame) should both refill the mag AND clear the reload-in-progress state, so the
    // very next frame's shot fires with no gap — not after blanc's ~1.35s reload timer elapses.
    const { firstShotAfter } = ammoComp([
      { kind: 'consumeAmmo' },
      { kind: 'instantReload' },
    ]);
    const shot = firstShotAfter(INTERVAL_SEC);
    expect(
      shot,
      'no shot observed after the first interval firing'
    ).toBeDefined();
    // A real reload gap would push this well past the trigger second (reloadFrames 81 ≈ 1.35s on top
    // of the ~1/12s inter-shot gap); an interrupted reload should fire again almost immediately.
    expect(
      shot!.sec - INTERVAL_SEC,
      'firing should resume within a couple of frames of the interval trigger, not after a full reload'
    ).toBeLessThan(0.2);
  });

  it("DISCRIMINATING: consumeAmmo forces a real magazine reload and fires 'lastBullet' — only when it actually reaches empty", () => {
    // Guarantee a known full base via instantReload() first, then drain with a fraction that leaves
    // ammo > 0 (0.2 × 60 = 12 ⇒ 48 left): no reload should be forced, no lastBullet should fire, and
    // the next shot should continue immediately from 47 — no gap.
    const partial = ammoComp([
      { kind: 'instantReload' },
      { kind: 'consumeAmmo', fraction: 0.2 },
    ]);
    const partialShot = partial.firstShotAfter(INTERVAL_SEC);
    expect(
      partialShot!.ammoAfter,
      'a partial drain that leaves ammo > 0 must not force a reload'
    ).toBe(48 - 1);
    expect(
      partial.lastBullets.filter((b) => isTriggerSec(b.sec)).length,
      'a partial drain (ammo left > 0) should not fire the lastBullet trigger'
    ).toBe(0);

    // The default (fraction omitted, from a known full base) drains to exactly 0 — this SHOULD force
    // a genuine reload cycle (a 'reload' event with cause 'magazine' after ~reloadFrames) and fire
    // 'lastBullet' exactly once per interval firing (never zero, never double-fired). Filtered to the
    // trigger frame — blanc's mag also cycles ORGANICALLY every ~5s between our 30s-spaced triggers,
    // and each of those cycles fires its own lastBullet + reload too.
    const full = ammoComp([{ kind: 'instantReload' }, { kind: 'consumeAmmo' }]);
    expect(
      full.lastBullets.filter((b) => isTriggerSec(b.sec)).length,
      'consumeAmmo() should fire lastBullet exactly once per interval firing (5 windows)'
    ).toBe(5);
    const firstReload = full.reloads.find((r) => r.sec >= INTERVAL_SEC);
    expect(
      firstReload,
      'draining to empty should force a real magazine reload'
    ).toBeDefined();
    expect(firstReload!.cause).toBe('magazine');
    const reloadFrames = data.characters[CARRY].reloadFrames;
    expect(
      firstReload!.sec - INTERVAL_SEC,
      `the forced reload should take about reloadFrames (${reloadFrames}/60s), not resolve instantly`
    ).toBeGreaterThan((reloadFrames / 60) * 0.5);
  });

  it("DISCRIMINATING: consumeAmmo's empty-check runs PER CALL, and the !reloading guard stops a double-fire", () => {
    // Two 0.5-fraction drains chained in one block, from a known full base: the FIRST call (60→30)
    // must not force a reload (still > 0); only the SECOND (30→0) should. If the boundary were
    // checked once up front instead of per-call, both or neither would fire.
    const staged = ammoComp([
      { kind: 'instantReload' },
      { kind: 'consumeAmmo', fraction: 0.5 },
      { kind: 'consumeAmmo', fraction: 0.5 },
    ]);
    expect(
      staged.lastBullets.filter((b) => isTriggerSec(b.sec)).length,
      'exactly one of the two chained 0.5-fraction drains should reach empty and fire lastBullet'
    ).toBe(5); // once per interval firing — the second call in each firing is the one that empties it

    // Two FULL (fraction omitted) drains chained back to back: the first empties the mag and starts
    // reloading; the second must see `!t.reloading` fail and NOT fire lastBullet again — the guard is
    // against a double-fire in the SAME frame, not against ever reloading twice across the fight.
    const doubled = ammoComp([
      { kind: 'instantReload' },
      { kind: 'consumeAmmo' },
      { kind: 'consumeAmmo' },
    ]);
    expect(
      doubled.lastBullets.filter((b) => isTriggerSec(b.sec)).length,
      'a second consumeAmmo in the same frame, while already reloading, must not double-fire lastBullet'
    ).toBe(5); // still once per interval firing, not twice
  });
});
