import type { Route } from './router';
import { hrefFor } from './router';
import { socials } from './site-data';
import { BrandIcon } from './social-icons';

const NAV: { route: Route; label: string }[] = [
  { route: 'sim', label: 'Sim' },
  { route: 'mechanics', label: 'Mechanics' },
];

// Slim top nav shared by every page. The dev page is reached via the floating
// badge (below), not from here.
export function SiteNav({ current }: { current: Route }) {
  return (
    <nav className='site-nav'>
      <div className='site-nav-inner'>
        {NAV.map((n) => (
          <a
            key={n.route}
            href={hrefFor(n.route)}
            className={current === n.route ? 'on' : ''}
          >
            {n.label}
          </a>
        ))}
      </div>
    </nav>
  );
}

// Ko-fi-style floating pill that opens the dev page. Hidden while already there.
export function DevBadge({ current }: { current: Route }) {
  if (current === 'dev') return null;
  return (
    <a className='dev-badge' href={hrefFor('dev')} title='About the developer'>
      Meet the dev
    </a>
  );
}

// Shared social footer rendered on every page — brand tiles, rounded corners.
export function SiteFooter() {
  return (
    <footer className='site-footer'>
      <div className='social-row'>
        {socials.map((s) => (
          <a
            key={s.label}
            className={
              'social-tile' + (s.icon.kind === 'img' && s.icon.round ? ' round' : '')
            }
            href={s.href}
            target='_blank'
            rel='noreferrer'
            aria-label={s.label}
            title={s.label}
            style={{ background: s.brand }}
          >
            {s.icon.kind === 'brand' ? (
              <BrandIcon name={s.icon.name} />
            ) : (
              <img src={s.icon.src} alt='' />
            )}
            <span className='sr-only'>{s.label}</span>
          </a>
        ))}
      </div>
      <div className='site-footer-by'>
        made by <a href={hrefFor('dev')}>Max</a> · NIKKE Solo Raid Sim
      </div>
    </footer>
  );
}
