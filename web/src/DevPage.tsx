import { dev } from './site-data';

export function DevPage() {
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
              href={dev.maiden.addToServer}
              target='_blank'
              rel='noreferrer'
            >
              Add Maiden to your server
            </a>
            <a
              className='dev-link ghost'
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

      <p className='muted dev-foot-note'>
        Find me on Discord, X, Blablalink, and GitHub — links in the footer below.
      </p>
    </div>
  );
}
