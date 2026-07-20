import React, { Suspense, lazy, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { SiteFooter, SiteNav } from './SiteChrome';
import { useRoute } from './router';
import { useDocumentHead } from './useDocumentHead';
import {
  captureTokenFromUrl,
  clearToken,
  fetchMe,
  getToken,
  loginUrl,
  type AuthUser,
} from './auth';
import './styles.css';
import { PORTRAIT_CROP_TOP } from '../../src/share/teamCard';

// Route-level code splitting: every page — above all the sim App, which carries
// the engine, unit data and skill overrides — loads as its own chunk. Static
// pages (/howto, /credits, …) no longer download the whole sim; the sim chunk
// is only fetched on sim-family routes. The nav/footer chrome stays eager so
// the shell paints immediately while the page chunk streams in.
const App = lazy(() => import('./App').then((m) => ({ default: m.App })));
const HowToPage = lazy(() =>
  import('./HowToPage').then((m) => ({ default: m.HowToPage })),
);
const MechanicsPage = lazy(() =>
  import('./MechanicsPage').then((m) => ({ default: m.MechanicsPage })),
);
const DevPage = lazy(() =>
  import('./DevPage').then((m) => ({ default: m.DevPage })),
);
const PatchNotesPage = lazy(() =>
  import('./PatchNotesPage').then((m) => ({ default: m.PatchNotesPage })),
);
const TestingRequestsPage = lazy(() =>
  import('./TestingRequestsPage').then((m) => ({
    default: m.TestingRequestsPage,
  })),
);
const RosterSyncPage = lazy(() =>
  import('./RosterSyncPage').then((m) => ({ default: m.RosterSyncPage })),
);
const CreditsPage = lazy(() =>
  import('./CreditsPage').then((m) => ({ default: m.CreditsPage })),
);

// Feed the shared portrait-crop constant into CSS as `--portrait-crop-top` (a
// percentage), so the `object-position` on portrait <img>s stays in lockstep with
// the canvas crops. Set before React renders any portrait, so no reframe flash.
document.documentElement.style.setProperty(
  '--portrait-crop-top',
  `${PORTRAIT_CROP_TOP * 100}%`,
);

function PageFallback() {
  return (
    <div className='page-fallback'>
      <span className='page-fallback-spin' aria-hidden='true' />
      Loading…
    </div>
  );
}

function Root() {
  const route = useRoute();
  useDocumentHead();

  // Discord auth lives here so the login control can sit in the shared header
  // on every page; the sim (App) still owns team save/load and reads `user`.
  const [user, setUser] = useState<AuthUser | null>(null);
  useEffect(() => {
    captureTokenFromUrl();
    if (getToken())
      fetchMe()
        .then(setUser)
        .catch(() => setUser(null));
  }, []);
  const onLogin = () => {
    window.location.href = loginUrl();
  };
  const onLogout = () => {
    clearToken();
    setUser(null);
  };

  return (
    <>
      <SiteNav
        current={route}
        user={user}
        onLogin={onLogin}
        onLogout={onLogout}
      />
      <Suspense fallback={<PageFallback />}>
        {route === 'howto' ? (
          <HowToPage />
        ) : route === 'mechanics' ? (
          <MechanicsPage />
        ) : route === 'dev' ? (
          <DevPage />
        ) : route === 'patch-notes' ? (
          <PatchNotesPage />
        ) : route === 'testing-requests' ? (
          <TestingRequestsPage />
        ) : route === 'roster-sync' ? (
          <RosterSyncPage user={user} onLogin={onLogin} />
        ) : route === 'credits' ? (
          <CreditsPage />
        ) : (
          <App user={user} />
        )}
      </Suspense>
      <SiteFooter />
    </>
  );
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);
