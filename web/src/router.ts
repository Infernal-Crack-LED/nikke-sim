import { useEffect, useRef, useState } from 'react';

// Tiny path router — no dependency. Every view is addressed by URL PATH (not a
// hash): the sim owns "/" plus its own sub-tab paths (/dpschart, /team, …), and
// each top-level page is its own path (/howto, /mechanics, …). This matches how
// the sim's tabs already work, so the whole app uses ONE strategy, and — because
// the paths reach the server — each is independently crawlable with its own embed
// card (see scripts/serve.mjs). The static server SPA-falls-back every unknown
// path to index.html, and the web-smoke loads at "/?team=…" which resolves to sim.
export type Route =
  | 'sim'
  | 'howto'
  | 'mechanics'
  | 'dev'
  | 'patch-notes'
  | 'testing-requests';

export const ROUTES: Route[] = [
  'sim',
  'howto',
  'mechanics',
  'dev',
  'patch-notes',
  'testing-requests',
];

// Top-level PAGE routes. The sim app owns "/" plus its sub-tab paths
// (/dpschart, /team, …); any segment that isn't a page resolves to the sim.
const PAGE_ROUTES: Route[] = ['howto', 'mechanics', 'dev', 'patch-notes', 'testing-requests'];

// map the first path segment to a Route; sim-app paths (and "/") fall back to sim
export function routeFromPath(pathname: string): Route {
  const seg = pathname.replace(/^\/+|\/+$/g, '').split('/')[0].toLowerCase();
  return (PAGE_ROUTES as string[]).includes(seg) ? (seg as Route) : 'sim';
}

// href for a route — a real path so links are hyperlinkable and crawlable
export const hrefFor = (route: Route): string => (route === 'sim' ? '/' : `/${route}`);

// SPA navigation: update the URL via pushState (no full reload), then notify every
// listener (this router + the sim App's tab sync) with a popstate event. Callers
// pass the full target (path + any search/hash they want to keep); page links pass
// a bare path so sim query params don't leak onto a page URL.
export function navigate(url: string): void {
  window.history.pushState({}, '', url);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => routeFromPath(window.location.pathname));
  const prev = useRef(route);
  useEffect(() => {
    const onNav = () => {
      const next = routeFromPath(window.location.pathname);
      if (next !== prev.current) {
        prev.current = next;
        window.scrollTo(0, 0); // jump to top only when the page actually changes
        setRoute(next);
      }
    };
    window.addEventListener('popstate', onNav);
    return () => window.removeEventListener('popstate', onNav);
  }, []);
  return route;
}
