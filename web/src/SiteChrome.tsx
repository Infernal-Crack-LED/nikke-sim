import type { Route } from './router';
import { hrefFor } from './router';
import { socials } from './site-data';
import { BrandIcon } from './social-icons';
import type { AuthUser } from './auth';

const NAV: { route: Route; label: string }[] = [
  { route: 'sim', label: 'Sim' },
  { route: 'mechanics', label: 'Mechanics' },
];

// Slim top nav shared by every page. Left: the Sim / Mechanics tabs. Right: the
// Patch Notes + Meet the dev page buttons and the Discord auth control.
export function SiteNav({
  current,
  user,
  onLogin,
  onLogout,
}: {
  current: Route;
  user: AuthUser | null;
  onLogin: () => void;
  onLogout: () => void;
}) {
  return (
    <nav className='site-nav'>
      <div className='site-nav-inner'>
        <div className='site-nav-left'>
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
        <div className='site-nav-right'>
          <a
            className={'nav-btn' + (current === 'patch-notes' ? ' on' : '')}
            href={hrefFor('patch-notes')}
          >
            Patch Notes
          </a>
          <a
            className={
              'nav-btn' + (current === 'testing-requests' ? ' on' : '')
            }
            href={hrefFor('testing-requests')}
          >
            Testing Requested
          </a>
          <a
            className={'nav-btn' + (current === 'dev' ? ' on' : '')}
            href={hrefFor('dev')}
          >
            Meet the dev
          </a>
          {user ? (
            <span className='user-chip' title='logged in'>
              {user.username}
              <button className='logout' onClick={onLogout} title='log out'>
                ⏻
              </button>
            </span>
          ) : (
            <button
              className='nav-btn discord'
              onClick={onLogin}
              title='save teams to your Discord account'
            >
              Log in with Discord
            </button>
          )}
        </div>
      </div>
    </nav>
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
