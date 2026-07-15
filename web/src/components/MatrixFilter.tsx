// Reusable 4-axis matrix selector (framework · element · core · investment).
// Shared by the DPS Chart tab and the DPS Tester tab's matrix mode. Emits the full Cell.
import {
  FRAMEWORKS, ELEADVS, CORES, INVESTS,
  FRAMEWORK_IDS, ELEADV_IDS, CORE_IDS, INVEST_IDS,
  type Cell,
} from '../../../src/dpschart/matrix';

function Row<T extends string>({ label, ids, labelOf, value, onPick }: {
  label: string;
  ids: T[];
  labelOf: (id: T) => string;
  value: T;
  onPick: (id: T) => void;
}) {
  return (
    <div className='matrix-row'>
      <span className='matrix-axis'>{label}</span>
      <div className='pills'>
        {ids.map((id) => (
          <button key={id} className={`pill${id === value ? ' on' : ''}`} onClick={() => onPick(id)}>
            {labelOf(id)}
          </button>
        ))}
      </div>
    </div>
  );
}

// `hideInvest` drops the Investment axis — the Overload Calc pins it (8/12) so the
// only thing that varies is the tested unit's overload lines.
export function MatrixFilter({ cell, onChange, hideInvest }: { cell: Cell; onChange: (c: Cell) => void; hideInvest?: boolean }) {
  return (
    <div className='matrix-filter'>
      <Row label='Framework' ids={FRAMEWORK_IDS} labelOf={(id) => FRAMEWORKS[id].label}
        value={cell.framework} onPick={(framework) => onChange({ ...cell, framework })} />
      <Row label='Element' ids={ELEADV_IDS} labelOf={(id) => ELEADVS[id].label}
        value={cell.eleadv} onPick={(eleadv) => onChange({ ...cell, eleadv })} />
      <Row label='Core' ids={CORE_IDS} labelOf={(id) => CORES[id].label}
        value={cell.core} onPick={(core) => onChange({ ...cell, core })} />
      {!hideInvest && (
        <Row label='Investment' ids={INVEST_IDS} labelOf={(id) => INVESTS[id].label}
          value={cell.invest} onPick={(invest) => onChange({ ...cell, invest })} />
      )}
    </div>
  );
}
