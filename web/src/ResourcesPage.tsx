import { Fragment, useState } from 'react';
import {
  BOSS_TABLES,
  RUNS_PER_DAY,
  avgModuleQtyPerDrop,
  expectedModulesPerRun,
  type ModuleBoss,
} from './resources-data';

// Resource calculators, one tab per resource family. Custom Modules is the
// first; new tabs (doll mats, skill books, …) join RES_TABS as they land.
type ResTab = 'modules';
const RES_TABS: { key: ResTab; label: string }[] = [
  { key: 'modules', label: 'Custom Modules' },
];

const pct = (p: number) => `${(p * 100).toFixed(2)}%`;

export function ResourcesPage() {
  const [tab, setTab] = useState<ResTab>('modules');
  return (
    <div className='app res-page'>
      <header>
        <h1>Resource Calculator</h1>
        <p className='muted'>
          Expected daily income from solo-raid farming — pick what you’re after
          and how far you’ve pushed, and see what a day is worth.
        </p>
      </header>
      <nav className='tabs-bar'>
        {RES_TABS.map((t) => (
          <button
            key={t.key}
            className={tab === t.key ? 'on' : ''}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </nav>
      {tab === 'modules' && <CustomModulesTab />}
    </div>
  );
}

interface StatTile {
  label: string;
  value: string;
  sub: string;
  main?: boolean;
}

function CustomModulesTab() {
  const [boss, setBoss] = useState<ModuleBoss>('kraken');
  const [tier, setTier] = useState(9);
  const table = BOSS_TABLES.find((b) => b.key === boss) ?? BOSS_TABLES[0];
  const stage =
    table.stages.find((s) => s.stage === tier) ??
    table.stages[table.stages.length - 1];
  const perRun = expectedModulesPerRun(stage);
  const hasGear = table.stages.some((s) => s.gearRate !== null);

  // The drop pool is boss-dependent: modules + locks + fodder are shared, but
  // Kraken pays module fragments while other bosses pay T10 fragments plus a
  // chance at a T10 gear piece — so the tiles are built, not hardcoded.
  const tiles: StatTile[] = [
    {
      label: 'Custom modules',
      value: (perRun * RUNS_PER_DAY).toFixed(2),
      sub: `expected / day · ${perRun.toFixed(2)} per run`,
      main: true,
    },
    {
      label: table.fragmentLabel,
      value: String(stage.fragments * RUNS_PER_DAY),
      sub: `${stage.fragments} per run · guaranteed`,
    },
  ];
  if (stage.gearRate !== null) {
    tiles.push({
      label: 'T10 gear',
      value: (stage.gearRate * RUNS_PER_DAY).toFixed(2),
      sub: `1 per drop · ${pct(stage.gearRate)} per run`,
    });
  }
  tiles.push(
    {
      label: 'Locks',
      value: String(stage.locks * RUNS_PER_DAY),
      sub: `${stage.locks} per run`,
    },
    {
      label: 'XP fodder',
      value: String(stage.xpFodder * RUNS_PER_DAY),
      sub: `${stage.xpFodder} per run`,
    },
  );

  return (
    <section className='calc-tab'>
      <h2>Overload Custom Modules</h2>
      <p className='muted'>
        Every solo-raid boss run can drop overload custom modules —{' '}
        {RUNS_PER_DAY} runs per boss per day. Side drops differ by boss: Kraken
        pays module fragments and more locks; other bosses drop T10 fragments
        and a chance at T10 gear. Pick your boss and stage to see the expected
        daily haul.
      </p>

      <div className='res-controls'>
        <div className='pills'>
          {BOSS_TABLES.map((b) => (
            <button
              key={b.key}
              className={boss === b.key ? 'on' : ''}
              onClick={() => setBoss(b.key)}
            >
              {b.label}
            </button>
          ))}
        </div>
        <label className='res-tier'>
          Stage
          <select value={tier} onChange={(e) => setTier(+e.target.value)}>
            {table.stages.map((s) => (
              <option key={s.stage} value={s.stage}>
                Tier {s.stage}
              </option>
            ))}
          </select>
        </label>
      </div>

      <h3 className='res-heading'>
        Daily income — {table.fullName}, Tier {stage.stage}
        <span className='muted'> · {RUNS_PER_DAY} runs</span>
      </h3>
      {/* keyed on boss+tier so the tiles replay their entrance on every
          change — perceptible feedback that the numbers re-rolled */}
      <div className='res-stats' key={`${boss}-${stage.stage}`}>
        {tiles.map((t) => (
          <div key={t.label} className={'res-stat' + (t.main ? ' main' : '')}>
            <div className='res-stat-label'>{t.label}</div>
            <div className='res-stat-value'>{t.value}</div>
            <div className='res-stat-sub'>{t.sub}</div>
          </div>
        ))}
      </div>

      <p className='res-detail'>
        Per run: <b>{pct(stage.moduleDropRate)}</b> chance a module drops — then{' '}
        {stage.moduleBreakdown.map((b, i) => (
          <Fragment key={b.qty}>
            {i > 0 && ' · '}×{b.qty} {pct(b.p)}
          </Fragment>
        ))}{' '}
        (avg {avgModuleQtyPerDrop(stage).toFixed(2)} per drop).
        {stage.gearRate !== null && (
          <>
            {' '}
            T10 gear drops at <b>{pct(stage.gearRate)}</b> per run (1 piece when
            it drops).
          </>
        )}
      </p>

      <div className='table-scroll res-ladder'>
        <table className='breakpoint-table'>
          <thead>
            <tr>
              <th>Tier</th>
              <th>Module chance / run</th>
              <th>Expected modules / run</th>
              <th>Expected modules / day</th>
              <th>{table.fragmentLabel} / day</th>
              {hasGear && <th>T10 gear / day</th>}
              <th>Locks / day</th>
            </tr>
          </thead>
          <tbody>
            {table.stages.map((s) => {
              const e = expectedModulesPerRun(s);
              return (
                <tr
                  key={s.stage}
                  className={s.stage === tier ? 'on' : ''}
                  title='select this tier'
                  onClick={() => setTier(s.stage)}
                >
                  <td>
                    <b>T{s.stage}</b>
                  </td>
                  <td className='r'>{pct(s.moduleDropRate)}</td>
                  <td className='r'>{e.toFixed(2)}</td>
                  <td className='r share'>{(e * RUNS_PER_DAY).toFixed(2)}</td>
                  <td className='r'>{s.fragments * RUNS_PER_DAY}</td>
                  {hasGear && (
                    <td className='r'>
                      {s.gearRate === null
                        ? '—'
                        : (s.gearRate * RUNS_PER_DAY).toFixed(2)}
                    </td>
                  )}
                  <td className='r'>{s.locks * RUNS_PER_DAY}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className='notes'>
        <b>How to read this</b>
        <ul>
          <li>
            You get <b>{RUNS_PER_DAY} runs per boss per day</b> — every value
            above is the per-run drop × {RUNS_PER_DAY}.
          </li>
          <li>
            <b>Custom modules</b> roll twice: first the base drop chance, then
            the ×1 / ×2 / ×3 split — which only applies when a module actually
            drops. The expected value is drop chance × average quantity ×{' '}
            {RUNS_PER_DAY} runs; real days will swing around it.
          </li>
          <li>
            <b>Side drops are boss-dependent.</b> Kraken pays custom-module
            fragments (and more locks); other bosses pay T10 fragments and a
            per-run chance at one T10 gear piece instead.
          </li>
          <li>
            Higher tiers raise the module drop chance, the ×2 / ×3 odds, and the
            fragment count — and for other bosses, the T10 gear rate (guaranteed
            at T9).
          </li>
        </ul>
      </div>
    </section>
  );
}
