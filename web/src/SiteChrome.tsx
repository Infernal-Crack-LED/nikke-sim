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
  { route: 'tools', label: 'Tools' },
  { route: 'howto', label: 'How to' },
  { route: 'mechanics', label: 'Mechanics' },
];

// Intercept left-clicks for in-app (pushState) navigation; let modified clicks
// (open-in-new-tab, etc.) and the real href behave natively. Page links carry no
// sim query params, so navigating to a page yields a clean URL.
function navClick(e: MouseEvent, route: Route) {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  e.preventDefault();
  navigate(hrefFor(route));
}

// Slim top nav shared by every page. Left: the Sim / Mechanics tabs. Right:
// Testing Requested stays visible for reach; everything else (Discord auth,
// Patch Notes, Meet the dev, Credits) collapses into a hamburger menu.
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
  const menuRef = useRef<HTMLDivElement>(null);
  const mobile = useMediaQuery('(max-width: 640px)'); // page nav → focused dropdown

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
        </div>
        <div className='site-nav-right'>
          <a
            className={
              'nav-btn' + (current === 'testing-requests' ? ' on' : '')
            }
            href={hrefFor('testing-requests')}
            onClick={(e) => navClick(e, 'testing-requests')}
          >
            Testing Requested
          </a>
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
                {user ? (
                  <div className='nav-menu-user'>
                    <span className='nav-menu-user-name' title='logged in'>
                      {user.username}
                    </span>
                    <button
                      className='nav-menu-item'
                      role='menuitem'
                      onClick={() => {
                        onLogout();
                        setMenuOpen(false);
                      }}
                    >
                      Log out
                    </button>
                  </div>
                ) : (
                  <button
                    className='nav-menu-item discord'
                    role='menuitem'
                    onClick={() => {
                      onLogin();
                      setMenuOpen(false);
                    }}
                    title='save teams to your Discord account'
                  >
                    <span className='discord-icon' aria-hidden='true'>
                      <BrandIcon name='discord' />
                    </span>
                    <span>Log in with Discord</span>
                  </button>
                )}
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
        made by <a href={hrefFor('dev')} onClick={(e) => navClick(e, 'dev')}>Max</a>
        {' · '}
        <a href={hrefFor('credits')} onClick={(e) => navClick(e, 'credits')}>Credits</a>
        {' · '}NIKKE Solo Raid Sim
      </div>
    </footer>
  );
}
