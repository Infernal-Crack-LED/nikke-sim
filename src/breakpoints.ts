// Charge-speed and max-ammo breakpoint math. Pure, isomorphic — used by the web
// app (App.tsx) and the bakery-bot /bp command. Extracted from web/src/App.tsx.

export const CHARGE_SPEED_BREAKPOINTS = [5, 8, 11, 15, 18, 21]; // %, RL/SR targets

export const FRAME_MS = 1000 / 60; // engine runs at 60 fps
export const RELEASE_LATENCY_FRAMES = 22;
export const FULL_BURST_FRAMES = 600;

/** NIKKE max ammo = floor(base * (1 + totalAmmoPct/100)) */
export function ammoLineRows(base: number, perLinePct: number) {
  return [1, 2, 3, 4].map((lines) => {
    const pct = lines * perLinePct;
    return { lines, pct, ammo: Math.floor(base * (1 + pct / 100)) };
  });
}

export function ammoBreakpoints(base: number, perLinePct: number) {
  const maxAmmo = Math.floor(base * (1 + (4 * perLinePct) / 100));
  const out: { ammo: number; minPct: number; linesNeeded: number }[] = [];
  for (let v = base + 1; v <= maxAmmo; v++) {
    const minPct = (v / base - 1) * 100;
    const linesNeeded = Math.ceil(minPct / perLinePct - 1e-9);
    if (linesNeeded <= 4) out.push({ ammo: v, minPct, linesNeeded });
  }
  return out;
}

export function chargeSpeedRows(perLinePct: number) {
  return CHARGE_SPEED_BREAKPOINTS.map((target) => {
    const linesNeeded = Math.ceil(target / perLinePct - 1e-9);
    return { target, linesNeeded, actual: linesNeeded * perLinePct };
  });
}

/**
 * Charge-speed FRAME breakpoints: the least CS% that shaves one more frame off
 * a charge weapon's charge time. Mirrors the engine's charge math
 * (src/engine/sim.ts): needed = max(1, round(baseFrames * (1 - cs/100))).
 */
export function chargeFrameBreakpoints(baseFrames: number) {
  const rows: {
    frames: number;
    csNeeded: number;
    seconds: number;
    ms: number;
  }[] = [];
  for (let n = baseFrames - 1; n >= 1; n--) {
    const infimum = 100 * (1 - (n + 0.5) / baseFrames);
    const csNeeded = Math.ceil((infimum + 1e-9) * 100) / 100;
    rows.push({ frames: n, csNeeded, seconds: n / 60, ms: n * FRAME_MS });
  }
  return rows;
}
