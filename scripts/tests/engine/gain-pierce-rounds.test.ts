// Functional test for the ROUND-COUNT form of `gainPierce` (durationShots).
//
// "Gain Pierce for N round(s)" is a ROUND budget: the tag is spent by FIRING, not by the clock.
// Five kits print it — `nihilister` and `harran` (1 round), `neve` (2), `dorothy-serendipity` (3),
// `d-killer-wife` ("for 1 shot") — and until this primitive existed every one of them shipped a
// wall-clock stand-in (`durationSec`) or a permanent tag, because `gainPierce` took only seconds.
//
// The distinction is invisible while a holder fires steadily and decisive the moment she STOPS:
// a seconds window keeps draining through a reload, a burst animation or any lull, so the next
// round she fires can come up untagged. A round budget waits for the round. That is not a corner
// case — it is the bug this primitive was built for: `nihilister`'s 4s stand-in was derived as
// "the longest inter-shot gap she actually fires across (~3.7s)", and her real fixture holds one
// 4.50s gap, so exactly one shot per fight fired untagged (measured 2026-08-11).
//
// Fixture: the nihilister comp (d-killer-wife / nihilister / ada), because d-killer-wife's S1
// grants Pierce Damage ▲13.55% to SR allies — the ENVIRONMENT SOURCE that makes the tag visible in
// damage at all. `gainPierce` emits no event (it writes pierce state directly), so every assertion
// here reads through damage multipliers. Only nihilister's block is patched, in memory; her
// committed override is untouched. Deterministic (no seed).
//
// Assertions:
//   1. LOAD-BEARING     — removing the grant drops her damage (the tag is what lets the 13.55 land).
//   2. SURVIVES A LULL  — durationShots 1 ≥ a seconds stand-in on the SAME trigger, and the shot after
//      her longest inter-shot gap is tagged under rounds and untagged under seconds. This is the
//      assertion that discriminates rounds from seconds.
//   3. BUDGET IS SPENT BY ROUNDS — on a NON-refreshing trigger (burstCast), N=1/2/3 tags strictly
//      more shots. A time proxy would plateau; a budget that never decremented would not differ.
//   4. THE GRANTING ROUND DOES NOT SPEND THE BUDGET — same carve-out as round-scoped buffs
//      (`startFrame === frame`): "for N round(s)" reads as N rounds AFTER the grant.
//   5. A ROUND IS A PULL — on `neve` (SG, hitsPerShot 10) a fullBurstEnter grant of 2 rounds covers
//      exactly 2 PULLS per Full Burst, not 1 (pellet-based decrement) and not all of them (no
//      decrement). Measured by differencing two otherwise-identical runs, since `dmgUp` carries
//      every Damage-Up source and the tag cannot be read off an absolute threshold.
//   6. SELF-SCOPED      — teammates are byte-identical across every form.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { runComp, totals, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
const NIHILISTER = 1; // slot order: d-killer-wife 0 / nihilister 1 / ada 2
const PIERCE_BUFF = 13.55; // d-killer-wife's Pierce Damage ▲ to SR allies

const comp = {
  slugs: ['d-killer-wife', 'nihilister', 'ada'],
  bossElement: null,
  focusSlug: 'nihilister',
};

/** Run with nihilister's gainPierce replaced by `form` (or removed when null). */
function run(
  form: { durationSec?: number; durationShots?: number } | null,
  trigger?: { kind: string }
) {
  const events: SimEvent[] = [];
  const ov = withPatchedOverride('nihilister', (o: any) => {
    for (const b of o.skill1) {
      const gp = (b.effects ?? []).find((e: any) => e.kind === 'gainPierce');
      if (!gp) {
        continue;
      }
      if (form === null) {
        b.effects = b.effects.filter((e: any) => e.kind !== 'gainPierce');
        continue;
      }
      delete gp.durationSec;
      delete gp.durationShots;
      Object.assign(gp, form);
      if (trigger) {
        b.trigger = trigger;
      }
    }
  });
  const res = runComp({
    ...comp,
    overrides: { nihilister: ov },
    cfg: { onEvent: (e: SimEvent) => events.push(e) },
  } as any);
  return { events, totals: totals(res), res };
}

const herNormals = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is Extract<SimEvent, { kind: 'damage' }> =>
      e.kind === 'damage' && e.slug === 'nihilister' && e.bucket === 'normal'
  );

/** Her shots that land inside a live pierceDamagePct window, split by whether the tag was ON. */
function coverage(evs: SimEvent[]) {
  const windows = evs.filter(
    (e): e is Extract<SimEvent, { kind: 'buffApply' }> =>
      e.kind === 'buffApply' &&
      e.stat === 'pierceDamagePct' &&
      e.value === PIERCE_BUFF &&
      e.targetIdx === NIHILISTER
  );
  const inWindow = herNormals(evs).filter((d) =>
    windows.some(
      (w) => d.frame >= w.frame && d.frame <= (w.expiresFrame ?? Infinity)
    )
  );
  // A tagged shot carries the 13.55 in its Damage-Up multiplier; an untagged one does not.
  const tagged = inWindow.filter(
    (d) => d.mult.dmgUp >= 1 + PIERCE_BUFF / 100 - 1e-9
  );
  return { inWindow, tagged, untagged: inWindow.length - tagged.length };
}

/** The frame of the shot that follows her LONGEST inter-shot gap. */
function shotAfterLongestGap(evs: SimEvent[]) {
  const frames = herNormals(evs)
    .map((d) => d.frame)
    .sort((a, b) => a - b);
  let best = { gap: -1, frame: -1 };
  for (let i = 1; i < frames.length; i++) {
    const gap = frames[i] - frames[i - 1];
    if (gap > best.gap) {
      best = { gap, frame: frames[i] };
    }
  }
  return best;
}

describe('gainPierce — round-count windows (durationShots)', () => {
  const rounds1 = run({ durationShots: 1 });
  // The wall-clock stand-in has to be SHORTER than the fixture's longest firing lull, or it covers
  // every gap and stops discriminating. That lull was >4s until the 10s chain timeout landed
  // (2026-08-13) shifted the rotation and shortened it to 3.87s, so the stand-in moved 4s → 3s.
  // The arm below asserts the relationship rather than the literal, so it cannot rot silently again.
  const SECS_STANDIN = 3;
  const secs4 = run({ durationSec: SECS_STANDIN });
  const none = run(null);

  it('1. the tag is LOAD-BEARING: removing it drops her damage', () => {
    expect(none.totals.nihilister).toBeLessThan(rounds1.totals.nihilister);
  });

  it('2. DISCRIMINATING: a round budget survives a lull that drains a seconds window', () => {
    const gap = shotAfterLongestGap(secs4.events);
    expect(
      gap.gap / FPS,
      `fixture has no gap longer than the ${SECS_STANDIN}s stand-in`
    ).toBeGreaterThan(SECS_STANDIN);

    // Under seconds, the shot after that gap is untagged; under rounds it is tagged.
    const taggedAt = (r: ReturnType<typeof run>) =>
      coverage(r.events).tagged.some((d) => d.frame === gap.frame);
    expect(taggedAt(secs4), 'seconds window somehow covered the long gap').toBe(
      false
    );
    expect(taggedAt(rounds1), 'round budget failed to survive the lull').toBe(
      true
    );

    expect(coverage(rounds1.events).untagged).toBeLessThan(
      coverage(secs4.events).untagged
    );
    expect(rounds1.totals.nihilister).toBeGreaterThan(secs4.totals.nihilister);
  });

  it('3. the budget is spent by ROUNDS: N=1/2/3 on a non-refreshing trigger tags strictly more', () => {
    // burstCast fires ~9 times in 180s and does NOT re-grant per shot, so the budget is
    // observable: each extra round buys exactly one more tagged shot per cast.
    const ladder = [1, 2, 3].map(
      (n) =>
        coverage(run({ durationShots: n }, { kind: 'burstCast' }).events).tagged
          .length
    );
    expect(ladder[1]).toBeGreaterThan(ladder[0]);
    expect(ladder[2]).toBeGreaterThan(ladder[1]);
  });

  it('4. the GRANTING round does not spend the budget (N rounds AFTER the grant)', () => {
    // Same carve-out as round-scoped buffs. With a per-shot trigger and N=1, the grant refreshes
    // on every shot and the tag therefore never lapses while she fires — if the granting round
    // spent its own budget, the tag would flicker off on alternating shots instead.
    const cov = coverage(rounds1.events);
    expect(cov.untagged, 'the tag lapsed on shots she fired back-to-back').toBe(
      0
    );
  });

  it('5. A ROUND IS A PULL, NOT A PELLET — a shotgun spends exactly one round per trigger pull', () => {
    // `neve` is the SG carrier of this primitive (hitsPerShot 10, "Gain Pierce for 2 round(s)"),
    // and the decrement reads `weapon === 'MG' ? hitsPerShot : 1`. If a future edit broadened that
    // branch to "not SR", her whole 2-round budget would vanish on her first pull — and nothing
    // else in the suite would notice, because her own spec can only assert inertness (no Pierce
    // Damage ▲ carrier reaches a Water SG at scope lock).
    //
    // So make it observable. `dmgUp` carries EVERY Damage-Up source (liter/crown/helm buffs all
    // land in it), so the tag cannot be read off an absolute threshold — instead run the fixture
    // twice, identical but for an injected self pierceDamagePct, and diff per frame. A frame whose
    // dmgUp rises by exactly the injected amount is a PULL that was Pierce-tagged.
    const PIERCE = 20;
    const inject = (add: boolean) =>
      withPatchedOverride('neve', (o: any) => {
        if (!add) {
          return;
        }
        o.skill1 = [
          ...(o.skill1 ?? []),
          {
            slot: 'skill1',
            trigger: { kind: 'passive' },
            target: { kind: 'self' },
            effects: [{ kind: 'buff', stat: 'pierceDamagePct', value: PIERCE }],
          },
        ];
      });
    const sgRun = (add: boolean) => {
      const events: SimEvent[] = [];
      runComp({
        slugs: ['liter', 'crown', 'neve', 'helm'],
        bossElement: 'Fire',
        focusSlug: 'neve',
        overrides: { neve: inject(add) },
        cfg: { onEvent: (e: SimEvent) => events.push(e) },
      } as any);
      const byFrame = new Map<number, number>();
      for (const e of events) {
        if (e.kind === 'damage' && e.slug === 'neve' && e.bucket === 'normal') {
          byFrame.set(e.frame, e.mult.dmgUp);
        }
      }
      return {
        byFrame,
        fbs: events.filter((x) => x.kind === 'fullBurstStart').length,
      };
    };
    const withP = sgRun(true);
    const withoutP = sgRun(false);
    expect(
      withoutP.byFrame.size,
      'neve never fired — fixture is stale'
    ).toBeGreaterThan(0);
    expect(
      withP.fbs,
      'no Full Burst — her fullBurstEnter grant never fired'
    ).toBeGreaterThan(0);

    const taggedPulls = [...withP.byFrame].filter(
      ([f, up]) =>
        Math.abs(up - (withoutP.byFrame.get(f) ?? up) - PIERCE / 100) < 1e-9
    ).length;

    // durationShots 2 on a fullBurstEnter grant ⇒ exactly 2 tagged PULLS per grant. A pellet-based
    // decrement would spend all 10 of a pull's pellets and tag only 1; a decrement that never ran
    // would tag every pull in the fight.
    expect(
      taggedPulls,
      `expected 2 tagged pulls per Full Burst (${withP.fbs} FBs), got ${taggedPulls}`
    ).toBe(withP.fbs * 2);
    expect(taggedPulls).toBeLessThan(withoutP.byFrame.size);
  });

  it('6. the tag is SELF-scoped: teammates are byte-identical across every form', () => {
    for (const slug of ['d-killer-wife', 'ada']) {
      expect(secs4.totals[slug]).toBe(rounds1.totals[slug]);
      expect(none.totals[slug]).toBe(rounds1.totals[slug]);
    }
  });
});
