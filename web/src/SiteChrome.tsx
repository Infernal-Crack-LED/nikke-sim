import { useEffect, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import type { Route } from './router';
import { hrefFor, navigate } from './router';
import { socials } from './site-data';
import { BrandIcon } from './social-icons';
import { TabDropdown, useMediaQuery } from './TabDropdown';
import type { AuthUser } from './auth';

const NAV: { route: Route; label: string }[] = [
  { route: 'sim', label: 'Sim' },
  { route: 'rankings', label: 'Rankings' },
  { route: 'overload', label: 'Overload' },
  { route: 'tools', label: 'Tools' },
  { route: 'howto', label: 'How to' },
  { route: 'mechanics', label: 'Mechanics' },
];

// Intercept left-clicks for in-app (pushState) navigation; let modified clicks
// (open-in-new-tab, etc.) and the real href behave natively. Page links carry no
// sim query params, so navigating to a page yields a clean URL.
function navClick(e: MouseEvent, route: Route) {
  if (
    e.defaultPrevented ||
    e.button !== 0 ||
    e.metaKey ||
    e.ctrlKey ||
    e.shiftKey ||
    e.altKey
  )
    return;
  e.preventDefault();
  navigate(hrefFor(route));
}

// Slim top nav shared by every page. Left: the four tool sections (Sim /
// Rankings / Overload / Tools) plus the How to and Mechanics pages. Right:
// the Discord login / account control stays visible (team saving and roster
// sync depend on it); Testing Requested, Sync my roster, Patch Notes, Meet
// the dev and Credits collapse into a hamburger menu.
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [betaToastOpen, setBetaToastOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const betaToastRef = useRef<HTMLDivElement>(null);
  const mobile = useMediaQuery('(max-width: 640px)'); // page nav → focused dropdown

  // The beta toast dismisses on Escape or a click anywhere outside it (the
  // Okay button is the third exit) — same pattern as the hamburger menu.
  useEffect(() => {
    if (!betaToastOpen) return;
    const onDocDown = (e: globalThis.MouseEvent) => {
      if (
        betaToastRef.current &&
        !betaToastRef.current.contains(e.target as Node)
      ) {
        setBetaToastOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setBetaToastOpen(false);
    };
    document.addEventListener('mousedown', onDocDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [betaToastOpen]);

  // Close the menu on an outside click or Escape.
  useEffect(() => {
    if (!menuOpen) return;
    const onDocDown = (e: globalThis.MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDocDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  // A menu link both navigates and closes the menu.
  const menuNav = (e: MouseEvent, route: Route) => {
    navClick(e, route);
    setMenuOpen(false);
  };

  return (
    <nav className='site-nav'>
      <div className='site-nav-inner'>
        <div className='site-nav-left'>
          {mobile ? (
            <TabDropdown
              label='Page'
              items={NAV.map((n) => ({
                key: n.route,
                label: n.label,
                active: current === n.route,
                href: hrefFor(n.route),
                onSelect: (e) => navClick(e, n.route),
              }))}
            />
          ) : (
            NAV.map((n) => (
              <a
                key={n.route}
                href={hrefFor(n.route)}
                onClick={(e) => navClick(e, n.route)}
                className={current === n.route ? 'on' : ''}
              >
                {n.label}
              </a>
            ))
          )}
          {/* Beta flag — sits inline after Mechanics on every breakpoint and
              pops the status toast instead of navigating anywhere. */}
          <button
            type='button'
            className='nav-beta-chip'
            onClick={() => setBetaToastOpen(true)}
            aria-haspopup='dialog'
          >
            <span className='nav-beta-sign' aria-hidden='true'>
              ⚠
            </span>
            Beta
          </button>
        </div>
        <div className='site-nav-right'>
          {/* Discord auth stays visible — team saving and roster sync depend
              on it; icon-only on mobile to save width */}
          {user ? (
            <div className='nav-user'>
              <span className='nav-user-name' title='logged in'>
                {user.username}
              </span>
              <button className='nav-btn nav-logout' onClick={onLogout}>
                Log out
              </button>
            </div>
          ) : (
            <button
              className='nav-btn discord nav-login'
              onClick={onLogin}
              title='save teams to your Discord account'
            >
              <span className='discord-icon' aria-hidden='true'>
                <BrandIcon name='discord' />
              </span>
              {!mobile && <span>Log in with Discord</span>}
            </button>
          )}
          <div className='nav-menu' ref={menuRef}>
            <button
              className={'nav-btn nav-menu-btn' + (menuOpen ? ' on' : '')}
              aria-label='More'
              aria-haspopup='true'
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((o) => !o)}
            >
              <span aria-hidden='true'>☰</span>
            </button>
            {menuOpen && (
              <div className='nav-menu-panel' role='menu'>
                <a
                  className={
                    'nav-menu-item' +
                    (current === 'testing-requests' ? ' on' : '')
                  }
                  role='menuitem'
                  href={hrefFor('testing-requests')}
                  onClick={(e) => menuNav(e, 'testing-requests')}
                >
                  Testing Requested
                </a>
                <a
                  className={
                    'nav-menu-item' + (current === 'roster-sync' ? ' on' : '')
                  }
                  role='menuitem'
                  href={hrefFor('roster-sync')}
                  onClick={(e) => menuNav(e, 'roster-sync')}
                >
                  Sync my roster
                </a>
                <a
                  className={
                    'nav-menu-item' + (current === 'patch-notes' ? ' on' : '')
                  }
                  role='menuitem'
                  href={hrefFor('patch-notes')}
                  onClick={(e) => menuNav(e, 'patch-notes')}
                >
                  Patch Notes
                </a>
                <a
                  className={'nav-menu-item' + (current === 'dev' ? ' on' : '')}
                  role='menuitem'
                  href={hrefFor('dev')}
                  onClick={(e) => menuNav(e, 'dev')}
                >
                  Meet the dev
                </a>
                <a
                  className={
                    'nav-menu-item' + (current === 'credits' ? ' on' : '')
                  }
                  role='menuitem'
                  href={hrefFor('credits')}
                  onClick={(e) => menuNav(e, 'credits')}
                >
                  Credits
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
      {betaToastOpen && (
        <div
          className='beta-toast'
          role='alertdialog'
          aria-label='Beta status'
          ref={betaToastRef}
        >
          <span className='beta-toast-sign' aria-hidden='true'>
            ⚠
          </span>
          <p className='beta-toast-msg'>
            Exact sim calculations and character kits are still under
            development
          </p>
          <button
            type='button'
            className='beta-toast-ok'
            autoFocus
            onClick={() => setBetaToastOpen(false)}
          >
            Okay
          </button>
        </div>
      )}
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
              'social-tile' +
              (s.icon.kind === 'img' && s.icon.round ? ' round' : '')
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
        made by{' '}
        <a href={hrefFor('dev')} onClick={(e) => navClick(e, 'dev')}>
          Max
        </a>
        {' · '}
        <a href={hrefFor('credits')} onClick={(e) => navClick(e, 'credits')}>
          Credits
        </a>
        {' · '}NIKKE Solo Raid Sim
      </div>
    </footer>
  );
}
