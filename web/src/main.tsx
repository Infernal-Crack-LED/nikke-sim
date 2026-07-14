import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { MechanicsPage } from './MechanicsPage';
import { DevPage } from './DevPage';
import { PatchNotesPage } from './PatchNotesPage';
import { TestingRequestsPage } from './TestingRequestsPage';
import { SiteFooter, SiteNav } from './SiteChrome';
import { useRoute } from './router';
import {
  captureTokenFromUrl,
  clearToken,
  fetchMe,
  getToken,
  loginUrl,
  type AuthUser,
} from './auth';
import './styles.css';

function Root() {
  const route = useRoute();

  // Discord auth lives here so the login control can sit in the shared header
  // on every page; the sim (App) still owns team save/load and reads `user`.
  const [user, setUser] = useState<AuthUser | null>(null);
  useEffect(() => {
    captureTokenFromUrl();
    if (getToken()) fetchMe().then(setUser).catch(() => setUser(null));
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
      {route === 'mechanics' ? (
        <MechanicsPage />
      ) : route === 'dev' ? (
        <DevPage />
      ) : route === 'patch-notes' ? (
        <PatchNotesPage />
      ) : route === 'testing-requests' ? (
        <TestingRequestsPage />
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
  </React.StrictMode>
);
