import { useMemo, useState } from 'react';
import { runSim, type SimResult } from '../../src/engine/sim';
import { prepareTeam, type UnitOptions } from '../../src/prepare';
import type { OverrideFile } from '../../src/skills/index';
import type {
  DataFile,
  Element,
  LevelMultiplier,
  SimConfig,
} from '../../src/types';
import charactersJson from '../../data/characters.json';
import cubesJson from '../../data/cubes.json';
import multJson from '../../data/level-multiplier.json';

const data = charactersJson as unknown as DataFile;
const cubes = cubesJson as any;
const mult = multJson as unknown as LevelMultiplier;

// bundle the hand-verified skill overrides
const overrideModules = import.meta.glob('../../src/skills/overrides/*.json', {
  eager: true,
});
const overrides: Record<string, OverrideFile | undefined> = {};
for (const [path, mod] of Object.entries(overrideModules)) {
  const slug = path.split('/').pop()!.replace('.json', '');
  overrides[slug] = (mod as any).default ?? (mod as any);
}

const ELEMENTS: (Element | null)[] = [
  null,
  'Fire',
  'Water',
  'Wind',
  'Electric',
  'Iron',
];
const CUBE_IDS = ['resilience', 'bastion', 'other'] as const;
const CUBE_LEVELS = [7, 10, 15] as const;
const CORE_PRESETS = [
  { label: 'No Core', value: 0 },
  { label: '25%', value: 0.25 },
  { label: '50%', value: 0.5 },
  { label: '75%', value: 0.75 },
  { label: '100%', value: 1 },
] as const;

const allChars = Object.values(data.characters).sort((a, b) =>
  a.name.localeCompare(b.name),
);

interface SlotState {
  slug: string | null;
  cubeId: (typeof CUBE_IDS)[number];
  cubeLevel: number;
  cubeCustom: boolean;
  ol: 0 | 5;
  doll: boolean;
}

const defaultSlot = (slug: string | null): SlotState => ({
  slug,
  cubeId: 'other',
  cubeLevel: 15,
  cubeCustom: false,
  ol: 0,
  doll: false,
});

const fmt = (n: number) =>
  n >= 1e9
    ? `${(n / 1e9).toFixed(2)}B`
    : n >= 1e6
      ? `${(n / 1e6).toFixed(2)}M`
      : n >= 1e3
        ? `${(n / 1e3).toFixed(1)}K`
        : n.toFixed(0);

function CharPicker({
  slot,
  onPick,
}: {
  slot: SlotState;
  onPick: (slug: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const selected = slot.slug ? data.characters[slot.slug] : null;
  const q = query.toLowerCase();
  const matches = q
    ? allChars
        .filter((c) => c.slug.includes(q) || c.name.toLowerCase().includes(q))
        .slice(0, 12)
    : allChars.slice(0, 12);
  return (
    <div className='picker'>
      <input
        value={open ? query : (selected?.name ?? '')}
        placeholder='search nikke…'
        onFocus={() => {
          setOpen(true);
          setQuery('');
        }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onChange={(e) => setQuery(e.target.value)}
      />
      {open && (
        <div className='picker-list'>
          {matches.map((c) => (
            <button
              key={c.slug}
              onMouseDown={() => {
                onPick(c.slug);
                setOpen(false);
              }}
            >
              {c.imageUrl && <img src={c.imageUrl} alt='' loading='lazy' />}
              <span>{c.name}</span>
              <span className='muted'>
                B{c.burst} · {c.weapon} · {c.element}
              </span>
            </button>
          ))}
          {!matches.length && <div className='muted pad'>no matches</div>}
        </div>
      )}
    </div>
  );
}

export function App() {
  const [slots, setSlots] = useState<SlotState[]>([
    defaultSlot('liter'),
    defaultSlot('crown'),
    defaultSlot('naga'),
    defaultSlot('modernia'),
    defaultSlot('alice'),
  ]);
  const [element, setElement] = useState<Element | null>(null);
  const [bossDef, setBossDef] = useState('0');
  const [core, setCore] = useState<number>(0);
  const [coreCustom, setCoreCustom] = useState(false);
  const [coreCustomVal, setCoreCustomVal] = useState('10');
  const [level, setLevel] = useState('400');
  const [copies, setCopies] = useState('3');
  const [showRotation, setShowRotation] = useState(false);
  const [showNotes, setShowNotes] = useState(false);

  const setSlot = (i: number, patch: Partial<SlotState>) =>
    setSlots((s) =>
      s.map((slot, j) => (j === i ? { ...slot, ...patch } : slot)),
    );

  const sim = useMemo((): {
    result?: SimResult;
    error?: string;
    compWarning?: string;
  } => {
    if (slots.some((s) => !s.slug))
      return { error: 'pick 5 nikkes to run the sim' };
    const chars = slots.map((s) => data.characters[s.slug!]);
    const counts: Record<string, number> = { I: 0, II: 0, III: 0, Λ: 0 };
    chars.forEach((c) => counts[c.burst]++);
    const compOk =
      (counts.I >= 1 && counts.II >= 1 && counts.III >= 2) || counts['Λ'] > 0;
    const coreRate = coreCustom
      ? Math.min(1, Math.max(0, Number(coreCustomVal) / 100 || 0))
      : core;
    const cfg: SimConfig = {
      slugs: slots.map((s) => s.slug!),
      bossElement: element,
      bossDef: Number(bossDef) || 0,
      level: Math.min(1200, Math.max(1, Number(level) || 400)),
      copies: Math.min(10, Math.max(0, Number(copies) || 3)),
      doll: false,
      ol: 0,
      coreHitRate: coreRate,
      rangeBonus: true,
      durationSec: 180,
    };
    const unitOpts: UnitOptions[] = slots.map((s) => ({
      cube: {
        id: s.cubeId,
        level: Math.min(15, Math.max(1, s.cubeLevel || 15)),
      },
      ol: s.ol,
      doll: s.doll,
    }));
    try {
      const prepared = prepareTeam(chars, unitOpts, {
        overrides,
        skillLevels: {},
        cubes,
        olLines: { lines: {} },
      });
      const result = runSim(chars as any, mult, cfg, prepared);
      return {
        result,
        compWarning: compOk
          ? undefined
          : `composition is ${counts.I}×BI ${counts.II}×BII ${counts.III}×BIII ${counts['Λ']}×BΛ — expected 1×BI, 1×BII, 2×BIII + flex; rotation may stall`,
      };
    } catch (e) {
      return { error: (e as Error).message };
    }
  }, [
    slots,
    element,
    bossDef,
    core,
    coreCustom,
    coreCustomVal,
    level,
    copies,
  ]);

  const r = sim.result;

  return (
    <div className='app'>
      <header>
        <h1>NIKKE Solo Raid Sim</h1>
        <p className='muted'>
          180s fight · all skills factored at 10/10/10 · leftmost burst priority
          · gear + doll from your recorded stats
        </p>
      </header>

      <section className='global'>
        <div className='field'>
          <label>Boss element</label>
          <div className='pills'>
            {ELEMENTS.map((e) => (
              <button
                key={e ?? 'none'}
                className={element === e ? 'on' : ''}
                onClick={() => setElement(e)}
              >
                {e ?? 'None'}
              </button>
            ))}
          </div>
        </div>
        <div className='field'>
          <label>Boss DEF</label>
          <input
            className='num'
            value={bossDef}
            onChange={(e) => setBossDef(e.target.value)}
          />
        </div>
        <div className='field'>
          <label>Core visibility</label>
          <div className='pills'>
            {CORE_PRESETS.map((p) => (
              <button
                key={p.label}
                className={!coreCustom && core === p.value ? 'on' : ''}
                onClick={() => {
                  setCore(p.value);
                  setCoreCustom(false);
                }}
              >
                {p.label}
              </button>
            ))}
            <button
              className={coreCustom ? 'on' : ''}
              onClick={() => setCoreCustom(true)}
            >
              Custom
            </button>
            {coreCustom && (
              <input
                className='num'
                value={coreCustomVal}
                onChange={(e) => setCoreCustomVal(e.target.value)}
                placeholder='%'
              />
            )}
          </div>
        </div>
        <div className='field'>
          <label>Synchro / Dupes</label>
          <div className='pills'>
            <input
              className='num'
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              title='synchro level'
            />
            <input
              className='num'
              value={copies}
              onChange={(e) => setCopies(e.target.value)}
              title='copies (0-3 LB, 4-10 core)'
            />
          </div>
        </div>
      </section>

      <section className='team'>
        {slots.map((slot, i) => {
          const c = slot.slug ? data.characters[slot.slug] : null;
          return (
            <div className='card' key={i}>
              <div className='slot-head'>
                <span className='muted'>slot {i + 1}</span>
                {c && (
                  <span className='tag'>
                    B{c.burst} · {c.weapon} · {c.element}
                  </span>
                )}
              </div>
              {c?.imageUrl ? (
                <img className='portrait' src={c.imageUrl} alt={c.name} />
              ) : (
                <div className='portrait empty'>?</div>
              )}
              <CharPicker slot={slot} onPick={(slug) => setSlot(i, { slug })} />
              <div className='pills small'>
                <button
                  className={slot.ol === 0 ? 'on' : ''}
                  onClick={() => setSlot(i, { ol: 0 })}
                >
                  OL 0
                </button>
                <button
                  className={slot.ol === 5 ? 'on' : ''}
                  onClick={() => setSlot(i, { ol: 5 })}
                >
                  OL 5
                </button>
                <button
                  className={slot.doll ? 'on' : ''}
                  onClick={() => setSlot(i, { doll: !slot.doll })}
                >
                  Doll 15
                </button>
              </div>
              <div className='cube'>
                {CUBE_IDS.map((id) => (
                  <button
                    key={id}
                    title={cubes.cubes[id].name}
                    className={slot.cubeId === id ? 'on' : ''}
                    onClick={() => setSlot(i, { cubeId: id })}
                  >
                    {cubes.cubes[id].image ? (
                      <img
                        src={'/' + cubes.cubes[id].image.replace('img/', '')}
                        alt={id}
                      />
                    ) : (
                      'Other'
                    )}
                  </button>
                ))}
              </div>
              <div className='pills small'>
                {CUBE_LEVELS.map((l) => (
                  <button
                    key={l}
                    className={
                      !slot.cubeCustom && slot.cubeLevel === l ? 'on' : ''
                    }
                    onClick={() =>
                      setSlot(i, { cubeLevel: l, cubeCustom: false })
                    }
                  >
                    L{l}
                  </button>
                ))}
                <button
                  className={slot.cubeCustom ? 'on' : ''}
                  onClick={() => setSlot(i, { cubeCustom: true })}
                >
                  …
                </button>
                {slot.cubeCustom && (
                  <input
                    className='num'
                    value={slot.cubeLevel}
                    onChange={(e) =>
                      setSlot(i, { cubeLevel: Number(e.target.value) || 1 })
                    }
                  />
                )}
              </div>
            </div>
          );
        })}
      </section>

      {sim.error && <div className='banner'>{sim.error}</div>}
      {sim.compWarning && <div className='banner warn'>{sim.compWarning}</div>}

      {r && (
        <section className='results'>
          <div className='summary muted'>
            team <b className='big'>{fmt(r.teamDamage)}</b> · {fmt(r.teamDps)}{' '}
            DPS · {r.fullBursts} full bursts ·{' '}
            {(r.fullBurstUptime * 100).toFixed(0)}% FB uptime ·{' '}
            {r.rotationStallSec.toFixed(1)}s stalled
          </div>
          <table>
            <thead>
              <tr>
                <th></th>
                <th>nikke</th>
                <th className='r'>damage</th>
                <th className='r'>share</th>
                <th className='r'>DPS</th>
                <th className='r'>normal / skill / burst</th>
                <th className='r'>bursts</th>
              </tr>
            </thead>
            <tbody>
              {r.units.map((u) => (
                <tr key={u.position}>
                  <td className='muted'>{u.position}</td>
                  <td>
                    {u.name}
                    {u.advantaged && (
                      <span className='adv' title='elemental advantage'>
                        {' '}
                        ▲
                      </span>
                    )}
                  </td>
                  <td className='r'>{fmt(u.totalDamage)}</td>
                  <td className='r share'>{(u.share * 100).toFixed(1)}%</td>
                  <td className='r'>{fmt(u.dps)}</td>
                  <td className='r muted'>
                    {fmt(u.breakdown.normal)} / {fmt(u.breakdown.skill)} /{' '}
                    {fmt(u.breakdown.burst)}
                  </td>
                  <td className='r'>{u.burstCasts}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className='toggles'>
            <button onClick={() => setShowNotes(!showNotes)}>
              {showNotes ? 'hide' : 'show'} modeling notes
            </button>
            <button onClick={() => setShowRotation(!showRotation)}>
              {showRotation ? 'hide' : 'show'} rotation log
            </button>
          </div>
          {showNotes && (
            <div className='notes'>
              {r.units.map((u) => {
                const notes = [...u.warnings];
                if (u.skillSource === 'parser')
                  notes.unshift('skills auto-parsed (not hand-verified)');
                else if (u.skillSource === 'parser+override')
                  notes.unshift('skills partially hand-verified');
                else notes.unshift('skills hand-verified');
                if (u.loadout.length)
                  notes.unshift(`loadout: ${u.loadout.join(' | ')}`);
                return (
                  <div key={u.position}>
                    <b>{u.name}</b>
                    <ul>
                      {notes.map((n, i) => (
                        <li key={i}>{n}</li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
          {showRotation && (
            <pre className='rotation'>{r.rotationLog.join('\n')}</pre>
          )}
        </section>
      )}

      <footer className='muted'>
        v1 assumptions: 0 enemy debuffs · full HP · expected-value crits ·
        always in effective range · damage-taken debuffs from allies modeled ·
        parts &amp; pierce in a later version
      </footer>
    </div>
  );
}
