// Support Rankings tab (/ranks/support, inside the sim App's rankings
// section) — four ranked boards over the precomputed artifacts: Burst
// Generation, Burst CDR, Sustain, Buffer. One shared ranked-bar UI
// (RankBarChart) with a board pill-switcher; the buffer board gets a second
// pill row (Generic / Typed carries). Only the active board's artifact
// fetches. Every board's `methodology` string sits in a collapsible
// "How this works" card — mirroring the DPS chart's Custom Profiles
// disclosure (DpsChartTab). No row links into the sim: the sustain board
// includes non-simSupported units, so no links at all is the simplest truth.
import { useEffect, useState } from 'react';
import { RankBarChart, type RankChartBar } from './components/RankBarChart';
import {
  loadBurstGen,
  loadBurstCdr,
  loadSustain,
  loadBufferChart,
  burstGenBars,
  burstCdrBars,
  sustainBars,
  bufferBars,
  type BoardId,
  type BufferBoard,
  type BurstGenArtifact,
  type BurstCdrArtifact,
  type SustainArtifact,
  type BufferChartArtifact,
} from './rankBoardsData';

// K/M/B magnitude formatting, same shape as DpsBarChart's fmt
const fmt = (n: number) =>
  n >= 1e9
    ? `${(n / 1e9).toFixed(2)}B`
    : n >= 1e6
      ? `${(n / 1e6).toFixed(2)}M`
      : n >= 1e3
        ? `${(n / 1e3).toFixed(1)}K`
        : n.toFixed(0);

const BOARDS: { id: BoardId; label: string; title: string }[] = [
  { id: 'buffer', label: 'Buffer', title: 'Buffer' },
  { id: 'burstgen', label: 'Burst Gen', title: 'Burst Generation' },
  { id: 'sustain', label: 'Sustain', title: 'Sustain' },
  { id: 'burstcdr', label: 'Burst CDR', title: 'Burst Cooldown Reduction' },
];

// Short chip label for a comp-profile variant (tooltip = the artifact's
// profiles[id] note). Explicit map for the known ids; fallback humanizes
// `with-<x>` → `w/ <X>` so a new profile still renders sensibly.
const PROFILE_LABELS: Record<string, string> = {
  'with-2mg': 'w/ 2 MG',
  'with-1mg': 'w/ 1 MG',
  'with-mint': 'w/ Mint',
  'with-healer': 'w/ Healer',
  'with-mast-rm': 'w/ Mast RM',
  'with-shielder': 'w/ Shielder',
};
function profileLabel(id: string): string {
  if (PROFILE_LABELS[id]) return PROFILE_LABELS[id];
  const rest = id.startsWith('with-') ? id.slice(5) : id;
  return `w/ ${rest.replace(/-/g, ' ').toUpperCase()}`;
}

type AnyArtifact =
  | BurstGenArtifact
  | BurstCdrArtifact
  | SustainArtifact
  | BufferChartArtifact;

// Methodology disclosure — the Custom Profiles pattern from DpsChartTab:
// a collapsible card with the board's conventions one click away, plus the
// comp-profile legend when the board has profiles.
function Methodology({
  methodology,
  profiles,
}: {
  methodology: string;
  profiles: Record<string, string>;
}) {
  const ids = Object.keys(profiles);
  return (
    <details className='dpschart-frameworks ranks-method'>
      <summary>How this works</summary>
      <p className='muted'>{methodology}</p>
      {ids.length > 0 && (
        <dl>
          {ids.map((id) => (
            <div key={id}>
              <dt>{profileLabel(id)}</dt>
              <dd>{profiles[id]}</dd>
            </div>
          ))}
        </dl>
      )}
    </details>
  );
}

// burstcdr ramp ladder → "1st FB 2.0 · 2nd 4.5 · 3rd+ 7.2" (last value is
// the capped steady-state, hence the "+")
const ORDINALS = ['1st', '2nd', '3rd', '4th', '5th'];
function rampText(ramp: number[]): string {
  return ramp
    .map((v, i) => {
      const ord = ORDINALS[i] ?? `${i + 1}th`;
      return `${i === 0 ? `${ord} FB` : i === ramp.length - 1 ? `${ord}+` : ord} ${v.toFixed(1)}`;
    })
    .join(' · ');
}

export function SupportRankings() {
  const [board, setBoard] = useState<BoardId>('buffer');
  const [bufferBoard, setBufferBoard] = useState<BufferBoard>('generic');
  const [arts, setArts] = useState<Partial<Record<BoardId, AnyArtifact>>>({});
  const [err, setErr] = useState<string | null>(null);

  // lazy per-board fetch — only the active board's artifact downloads
  useEffect(() => {
    if (arts[board]) return;
    const loaders = {
      burstgen: loadBurstGen,
      burstcdr: loadBurstCdr,
      sustain: loadSustain,
      buffer: loadBufferChart,
    } as const;
    let alive = true;
    loaders[board]()
      .then((a) => {
        if (alive) setArts((prev) => ({ ...prev, [board]: a }));
      })
      .catch((e) => {
        if (alive) setErr(String(e?.message ?? e));
      });
    return () => {
      alive = false;
    };
  }, [board, arts]);

  const art = arts[board];
  const meta = BOARDS.find((b) => b.id === board)!;

  // Map the active board's typed rows into the chart's uniform bar shape.
  let bars: RankChartBar[] = [];
  let profiles: Record<string, string> = {};
  if (art) {
    profiles = art.profiles;
    const badge = (b: { slug: string; profile: string | null }) =>
      b.profile
        ? { badge: profileLabel(b.profile), badgeTitle: profiles[b.profile] }
        : {};
    if (board === 'burstgen') {
      bars = burstGenBars(art as BurstGenArtifact).map((b) => ({
        ...b,
        key: `${b.slug}:${b.profile ?? ''}`,
        value: b.gaugeTotal,
        valueText: `${(b.gaugeTotal / 100).toFixed(1)} bars`,
        valueSub: `${Math.round(b.gaugeTotal)} gauge`,
        valueTitle: 'uncapped total burst gauge over 180s (100 = one bar)',
        ...badge(b),
      }));
    } else if (board === 'burstcdr') {
      bars = burstCdrBars(art as BurstCdrArtifact).map((b) => ({
        ...b,
        key: `${b.slug}:${b.profile ?? ''}`,
        value: b.cdrPer40s,
        valueText: `${b.cdrPer40s.toFixed(1)}s/40s`,
        valueTitle: 'nominal team CDR seconds per 40s of fight',
        condition: b.condition,
        sub:
          [
            b.ramp ? rampText(b.ramp) : null,
            b.selfCdr != null ? `self-only ${b.selfCdr.toFixed(1)}s` : null,
          ]
            .filter(Boolean)
            .join(' · ') || null,
        ...badge(b),
      }));
    } else if (board === 'sustain') {
      bars = sustainBars(art as SustainArtifact).map((b) => ({
        ...b,
        key: `${b.slug}:${b.profile ?? ''}`,
        value: b.totalHp,
        valueText: fmt(b.totalHp),
        valueSub: `${b.totalPct.toFixed(0)}% of max HP`,
        valueTitle: 'effective HP restored + shielded over 180s (team total)',
        split:
          b.totalPct > 0
            ? [
                Math.min(1, b.healPct / b.totalPct),
                Math.min(1, b.shieldPct / b.totalPct),
                Math.min(1, b.lifestealPct / b.totalPct),
              ]
            : null,
        splitTitle: `heal ${b.healPct.toFixed(1)}% · shield ${b.shieldPct.toFixed(1)}% · lifesteal ${b.lifestealPct.toFixed(1)}% of max HP`,
        ...badge(b),
      }));
    } else {
      bars = bufferBars(art as BufferChartArtifact, bufferBoard).map((b) => ({
        ...b,
        key: `${b.slug}:${b.profile ?? ''}`,
        value: b.addedDps,
        valueText: `${b.addedDps >= 0 ? '+' : '−'}${fmt(Math.abs(b.addedDps))}`,
        valueSub: `carry ${fmt(b.carryDps)}`,
        valueTitle: 'added carry DPS vs the no-op baseline',
        info: b.rules?.length ? b.rules.join('\n') : null,
        ...badge(b),
      }));
    }
  }

  return (
    <section className='calc-tab'>
      <h2>Support Rankings</h2>
      <p className='muted'>
        Four precomputed boards over the same standardized solo-raid
        frameworks: burst gauge generation, burst cooldown reduction, team
        sustain, and buffer value added to two standard carries. Units with a
        comp profile appear twice — plain and profiled — so both standings are
        comparable at a glance.
      </p>

      <div className='pills ranks-boards'>
        {BOARDS.map((b) => (
          <button
            key={b.id}
            className={board === b.id ? 'on' : ''}
            onClick={() => setBoard(b.id)}
          >
            {b.label}
          </button>
        ))}
      </div>
      {board === 'buffer' && (
        <div className='pills ranks-subboards'>
          {(['generic', 'typed'] as BufferBoard[]).map((bb) => (
            <button
              key={bb}
              className={bufferBoard === bb ? 'on' : ''}
              onClick={() => setBufferBoard(bb)}
              title={
                bb === 'generic'
                  ? 'plain MG+RL carries — only requirement-free buffs counted'
                  : 'carries adapt to the buffer’s kit (weapon, pierce, element…)'
              }
            >
              {bb === 'generic' ? 'Generic' : 'Typed'}
            </button>
          ))}
        </div>
      )}

      {err && !art ? (
        <p className='muted'>
          The rankings data failed to load ({err}). Try refreshing the page —
          if it keeps failing, report it in the Discord (link in the footer).
        </p>
      ) : !art ? (
        <p className='muted'>Loading {meta.label} data…</p>
      ) : (
        <>
          <RankBarChart
            title={board === 'buffer' ? `${meta.title} · ${bufferBoard}` : meta.title}
            subtitle={`${bars.length} entries · generated ${new Date(
              art.generatedAt,
            ).toLocaleDateString()}`}
            bars={bars}
          />
          <Methodology methodology={art.methodology} profiles={profiles} />
        </>
      )}
    </section>
  );
}
