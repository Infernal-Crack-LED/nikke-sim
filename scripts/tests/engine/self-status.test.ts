// Engine primitive: the SELF-STATUS channel — `selfStatus` effect + `requiresSelfStatus` gate
// (2026-08-24, kit-faithfulness-audit follow-up). A unit "enters <Name>" and her own blocks gate
// on being in it. The channel's whole value over the boss-status proxy it replaced is ISOLATION,
// so that is what this file pins: windows are per (unit, name), and neither direction of
// cross-unit read is possible — another kit's `requiresTargetStatus` of the same name never sees
// a self mode (the asuka-wille 'Annihilation State' side-channel hazard), and a
// `requiresSelfStatus` gate never opens off a boss `targetStatus` window.
//
// Method: the control comp with synthetic blocks patched into the carry's kit (committed JSON
// never touched). `ada` opens a 9s self status on her own burstCast; a gated flatDamage probe on
// her shotFired cadence logs exactly which pulls the gate admitted. Deterministic runs.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { controlComp, runComp, withPatchedOverride } from '../lib/harness.js';

type DamageEvent = Extract<SimEvent, { kind: 'damage' }>;
type BurstCastEvent = Extract<SimEvent, { kind: 'burstCast' }>;

const STATUS = 'Test Mode';
const WINDOW_SEC = 9;
const FPS = 60;

function run(patch: (ov: any) => void, extra: Record<string, any> = {}) {
  const patched = withPatchedOverride('ada', patch);
  const events: SimEvent[] = [];
  runComp({
    ...controlComp('ada'),
    overrides: { ada: patched, ...extra },
    cfg: { onEvent: (e) => events.push(e) },
  });
  return {
    events,
    procsOf: (slug: string) =>
      events.filter(
        (e): e is DamageEvent =>
          e.kind === 'damage' && e.slug === slug && e.srcSlot === 'skill1'
      ),
    castsOf: (slug: string) =>
      events.filter(
        (e): e is BurstCastEvent => e.kind === 'burstCast' && e.slug === slug
      ),
  };
}

/** ada: burst opens the self status; skill1 probe fires per pull ONLY inside the window. */
const selfMode = (ov: any) => {
  ov.skill1 = [
    {
      slot: 'skill1',
      trigger: { kind: 'shotFired' },
      target: { kind: 'self' },
      requiresSelfStatus: STATUS,
      effects: [{ kind: 'flatDamage', atkPct: 100 }],
    },
  ];
  ov.skill2 = [];
  ov.burst = [
    {
      slot: 'burst',
      trigger: { kind: 'burstCast' },
      target: { kind: 'self' },
      effects: [{ kind: 'selfStatus', name: STATUS, durationSec: WINDOW_SEC }],
    },
  ];
};

describe('selfStatus / requiresSelfStatus', () => {
  it('the gate admits pulls only inside the owner’s own status window', () => {
    const { procsOf, castsOf, events } = run(selfMode);
    const casts = castsOf('ada');
    expect(casts.length, 'the carry never burst').toBeGreaterThan(0);
    const windows = casts.map(
      (c) => [c.frame, c.frame + WINDOW_SEC * FPS] as const
    );
    const inWindow = (f: number) => windows.some(([a, b]) => f >= a && f < b);
    const procs = procsOf('ada');
    expect(procs.length, 'the gated probe never fired').toBeGreaterThan(0);
    for (const p of procs) {
      expect(inWindow(p.frame), `proc at frame ${p.frame} outside window`).toBe(
        true
      );
    }
    // and it is a real gate, not a pass-through: pulls exist outside the windows
    const shots = events.filter((e) => e.kind === 'shot' && e.slug === 'ada');
    expect(shots.some((s) => !inWindow(s.frame))).toBe(true);
    expect(procs.length).toBeLessThan(shots.length);
  });

  it('ISOLATION: an unrelated kit’s requiresTargetStatus of the same name never sees the self mode', () => {
    // helm carries a shotFired probe gated on a BOSS status named identically to ada's self
    // status. Under the retired proxy encoding this fired all through ada's windows — the
    // side-channel hazard. With the per-unit channel it must never fire.
    const helmProbe = withPatchedOverride('helm', (ov: any) => {
      ov.skill1 = [
        {
          slot: 'skill1',
          trigger: { kind: 'shotFired' },
          target: { kind: 'self' },
          requiresTargetStatus: STATUS,
          effects: [{ kind: 'flatDamage', atkPct: 100 }],
        },
      ];
      ov.skill2 = [];
      ov.burst = [];
    });
    const { procsOf } = run(selfMode, { helm: helmProbe });
    expect(procsOf('helm').length).toBe(0);
  });

  it('ISOLATION: a requiresSelfStatus gate never opens off a boss targetStatus window', () => {
    // Inverse direction: ada's gated probe with the status opened on the BOSS (targetStatus)
    // instead of herself. The gate reads her own per-unit map, so it must never fire.
    const bossMode = (ov: any) => {
      selfMode(ov);
      ov.burst = [
        {
          slot: 'burst',
          trigger: { kind: 'burstCast' },
          target: { kind: 'enemy' },
          effects: [
            { kind: 'targetStatus', name: STATUS, durationSec: WINDOW_SEC },
          ],
        },
      ];
    };
    const { procsOf } = run(bossMode);
    expect(procsOf('ada').length).toBe(0);
  });
});
