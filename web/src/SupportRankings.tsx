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
import { RankBarChart } from './components/RankBarChart';
import {
  buildBurstGenTable,
  buildBurstCdrTable,
  buildSustainTable,
  buildBufferTable,
} from '../../src/infographics/core/rankTables';
import { copyTableCardImage } from './tableShare';
import { copyTextToClipboard } from './clipboard';
import {
  loadBurstGen,
  loadBurstCdr,
  loadSustain,
  loadBufferChart,
  type BoardId,
  type BufferBoard,
  type BurstGenBoard,
  type BurstGenArtifact,
  type BurstCdrArtifact,
  type SustainArtifact,
  type BufferChartArtifact,
} from './rankBoardsData';
import {
  profileLabel,
  barsForBoard,
  type AnyRankArtifact,
} from './rankChartBars';

const BOARDS: { id: BoardId; label: string; title: string }[] = [
  { id: 'buffer', label: 'Buffer', title: 'Buffer' },
  { id: 'burstgen', label: 'Burst Gen', title: 'Burst Generation' },
  { id: 'sustain', label: 'Sustain', title: 'Sustain' },
  { id: 'burstcdr', label: 'Burst CDR', title: 'Burst Cooldown Reduction' },
];

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
    <details className="dpschart-frameworks ranks-method">
      <summary>How this works</summary>
      <p className="muted">{methodology}</p>
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

export function SupportRankings() {
  const params = new URLSearchParams(window.location.search);
  const [board, setBoard] = useState<BoardId>(() => {
    const p = params.get('board');
    return BOARDS.some((b) => b.id === p) ? (p as BoardId) : 'buffer';
  });
  const [bufferBoard, setBufferBoard] = useState<BufferBoard>(() =>
    params.get('bb') === 'typed' ? 'typed' : 'generic'
  );
  const [burstGenBoard, setBurstGenBoard] = useState<BurstGenBoard>(() =>
    params.get('bg') === 'focused' ? 'focused' : 'unfocused'
  );
  const [arts, setArts] = useState<Partial<Record<BoardId, AnyRankArtifact>>>(
    {}
  );
  const [err, setErr] = useState<string | null>(null);

  // lazy per-board fetch — only the active board's artifact downloads
  useEffect(() => {
    if (arts[board]) {
      return;
    }
    const loaders = {
      burstgen: loadBurstGen,
      burstcdr: loadBurstCdr,
      sustain: loadSustain,
      buffer: loadBufferChart,
    } as const;
    let alive = true;
    loaders[board]()
      .then((a) => {
        if (alive) {
          setArts((prev) => ({ ...prev, [board]: a }));
        }
      })
      .catch((e) => {
        if (alive) {
          setErr(String(e?.message ?? e));
        }
      });
    return () => {
      alive = false;
    };
  }, [board, arts]);

  const art = arts[board];
  const meta = BOARDS.find((b) => b.id === board)!;

  // Share the ACTIVE board as the same windowed table card the server
  // pre-renders (core/rankTables.ts builders — top-10 §6.6 window; the tab
  // has no selected unit to center on). The buffer board shares whichever
  // sub-board (generic/typed) is on screen.
  const onShareImage = (): Promise<'copied' | 'downloaded' | 'unsupported'> => {
    if (!art) {
      return Promise.resolve('unsupported');
    }
    const data =
      board === 'burstgen'
        ? buildBurstGenTable(art as BurstGenArtifact, burstGenBoard)
        : board === 'burstcdr'
          ? buildBurstCdrTable(art as BurstCdrArtifact)
          : board === 'sustain'
            ? buildSustainTable(art as SustainArtifact)
            : buildBufferTable(art as BufferChartArtifact, bufferBoard);
    return copyTableCardImage(data, `nikke-ranks-${board}.png`);
  };

  // Share a link to the active board (+ sub-board, for buffer) — mirrors
  // DpsChartTab's shareLink.
  const onShareLink = (): Promise<boolean> => {
    const u = new URL(window.location.href);
    u.searchParams.set('board', board);
    if (board === 'buffer') {
      u.searchParams.set('bb', bufferBoard);
    } else {
      u.searchParams.delete('bb');
    }
    if (board === 'burstgen') {
      u.searchParams.set('bg', burstGenBoard);
    } else {
      u.searchParams.delete('bg');
    }
    return copyTextToClipboard(u.toString());
  };

  // Map the active board's typed rows into the chart's uniform bar shape.
  const bars = art
    ? barsForBoard(board, art, { bufferBoard, burstGenBoard })
    : [];
  const profiles = art?.profiles ?? {};

  return (
    <section className="calc-tab">
      <h2>Support Rankings</h2>
      <p className="muted">
        Four precomputed boards over the same standardized solo-raid frameworks:
        burst gauge generation, burst cooldown reduction, team sustain, and
        buffer value added to two standard carries. Units with a comp profile
        appear twice — plain and profiled — so both standings are comparable at
        a glance.
      </p>

      <div className="pills ranks-boards">
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
        <div className="pills ranks-subboards">
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
      {board === 'burstgen' && (
        <div className="pills ranks-subboards">
          {(['unfocused', 'focused'] as BurstGenBoard[]).map((bg) => (
            <button
              key={bg}
              className={burstGenBoard === bg ? 'on' : ''}
              onClick={() => setBurstGenBoard(bg)}
              title={
                bg === 'unfocused'
                  ? 'camera focus parked off the tested unit — the fair, nobody-favored baseline for comparing across weapon classes'
                  : "camera focus on the tested unit itself — its ceiling as your team's designated burst-gen carry (SR/RL only change; non-charge weapons get no focus bonus)"
              }
            >
              {bg === 'unfocused' ? 'Unfocused' : 'Focused'}
            </button>
          ))}
        </div>
      )}

      {err && !art ? (
        <p className="muted">
          The rankings data failed to load ({err}). Try refreshing the page — if
          it keeps failing, report it in the Discord (link in the footer).
        </p>
      ) : !art ? (
        <p className="muted">Loading {meta.label} data…</p>
      ) : (
        <>
          <RankBarChart
            title={
              board === 'buffer'
                ? `${meta.title} · ${bufferBoard}`
                : board === 'burstgen'
                  ? `${meta.title} · ${burstGenBoard}`
                  : meta.title
            }
            subtitle={`${bars.length} entries · generated ${new Date(
              art.generatedAt
            ).toLocaleDateString()}`}
            bars={bars}
            onShareImage={onShareImage}
            onShareLink={onShareLink}
          />
          <Methodology
            methodology={
              board === 'burstgen' && burstGenBoard === 'focused'
                ? (art as BurstGenArtifact).focusedMethodology
                : art.methodology
            }
            profiles={profiles}
          />
        </>
      )}
    </section>
  );
}
