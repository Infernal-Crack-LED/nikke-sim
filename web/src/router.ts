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
  | 'tools'
  | 'howto'
  | 'mechanics'
  | 'dev'
  | 'patch-notes'
  | 'testing-requests'
  | 'credits';

export const ROUTES: Route[] = [
  'sim',
  'tools',
  'howto',
  'mechanics',
  'dev',
  'patch-notes',
  'testing-requests',
  'credits',
];

// Top-level PAGE routes. The sim app owns "/" plus its sub-tab paths
// (/dpschart, /overload, …); any segment that isn't a page or a tool resolves to sim.
const PAGE_ROUTES: Route[] = ['howto', 'mechanics', 'dev', 'patch-notes', 'testing-requests', 'credits'];
// The App also hosts the "Tools" section — these sub-tab paths group under /tools in
// the top nav (but are still served by the App, addressed by their own path).
const TOOL_PATHS = ['olsim', 'doll', 'charge', 'team', 'roster'];
const TOOL_LANDING = '/olsim'; // where the "Tools" nav link points (Overload Rolling)

// map the first path segment to a Route; tool paths → 'tools', other sim-app paths (and "/") → sim
export function routeFromPath(pathname: string): Route {
  const seg = pathname.replace(/^\/+|\/+$/g, '').split('/')[0].toLowerCase();
  if ((PAGE_ROUTES as string[]).includes(seg)) return seg as Route;
  if (TOOL_PATHS.includes(seg)) return 'tools';
  return 'sim';
}

// href for a route — a real path so links are hyperlinkable and crawlable
export const hrefFor = (route: Route): string =>
  route === 'sim' ? '/' : route === 'tools' ? TOOL_LANDING : `/${route}`;

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
