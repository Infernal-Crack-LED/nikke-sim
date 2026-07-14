import { dev } from './site-data';
import patchNotes from './patch-notes.json';

interface PatchNote {
  date: string;
  title: string;
  notes: string[];
}

export function DevPage() {
  const notes = patchNotes as PatchNote[];
  return (
    <div className='app dev-page'>
      <section className='dev-hero'>
        <h1>{dev.greeting}</h1>
        <p>{dev.bio}</p>
      </section>

      <section className='dev-callout'>
        <img
          className='dev-callout-avatar'
          src='/maiden.gif'
          alt='Maiden bot avatar'
        />
        <div className='dev-callout-body'>
          <h2>{dev.maiden.name}</h2>
          <p>{dev.maiden.blurb}</p>
          <div className='dev-callout-links'>
            <a
              className='dev-link'
              href={dev.maiden.discordInvite}
              target='_blank'
              rel='noreferrer'
            >
              Join the Discord
            </a>
            <a
              className='dev-link ghost'
              href={dev.maiden.botUrl}
              target='_blank'
              rel='noreferrer'
            >
              View the bot on GitHub
            </a>
          </div>
        </div>
      </section>

      <section className='patch-notes'>
        <h2>Patch notes</h2>
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
      </section>

      <p className='muted dev-foot-note'>
        Find me on Discord, X, Blablalink, and GitHub — links in the footer below.
      </p>
    </div>
  );
}
