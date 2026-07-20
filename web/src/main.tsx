import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { ResourcesPage } from './ResourcesPage';
import { HowToPage } from './HowToPage';
import { MechanicsPage } from './MechanicsPage';
import { DevPage } from './DevPage';
import { PatchNotesPage } from './PatchNotesPage';
import { TestingRequestsPage } from './TestingRequestsPage';
import { RosterSyncPage } from './RosterSyncPage';
import { CreditsPage } from './CreditsPage';
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

// Feed the shared portrait-crop constant into CSS as `--portrait-crop-top` (a
// percentage), so the `object-position` on portrait <img>s stays in lockstep with
// the canvas crops. Set before React renders any portrait, so no reframe flash.
document.documentElement.style.setProperty(
  '--portrait-crop-top',
  `${PORTRAIT_CROP_TOP * 100}%`,
);

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
      {route === 'resources' ? (
        <ResourcesPage />
      ) : route === 'howto' ? (
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
      <SiteFooter />
    </>
  );
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);
