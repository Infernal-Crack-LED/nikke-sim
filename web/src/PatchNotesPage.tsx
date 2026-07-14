import patchNotes from './patch-notes.json';

interface PatchNote {
  date: string;
  title: string;
  notes: string[];
}

export function PatchNotesPage() {
  // newest first — the file is prepend-only history, but sort defensively
  const notes = [...(patchNotes as PatchNote[])].sort((a, b) =>
    b.date.localeCompare(a.date),
  );
  return (
    <div className='app patch-notes'>
      <header>
        <h1>Patch notes</h1>
        <p className='muted'>
          What’s changed in the sim — accuracy improvements, newly modeled units
          and mechanics, and fixes.
        </p>
      </header>
      {notes.map((n) => (
        <article className='patch-entry' key={n.date + n.title}>
          <div className='patch-head'>
            <span className='patch-title'>{n.title}</span>
            <span className='patch-date'>{n.date}</span>
          </div>
          <ul>
            {n.notes.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </article>
      ))}
    </div>
  );
}
