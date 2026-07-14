import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { MechanicsPage } from './MechanicsPage';
import { DevPage } from './DevPage';
import { DevBadge, SiteFooter, SiteNav } from './SiteChrome';
import { useRoute } from './router';
import './styles.css';

function Root() {
  const route = useRoute();
  return (
    <>
      <SiteNav current={route} />
      {route === 'mechanics' ? (
        <MechanicsPage />
      ) : route === 'dev' ? (
        <DevPage />
      ) : (
        <App />
      )}
      <SiteFooter />
      <DevBadge current={route} />
    </>
  );
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
