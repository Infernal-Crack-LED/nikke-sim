import { useEffect, useRef, useState, type MouseEvent } from 'react';

// Tiny path router — no dependency. Every view is addressed by URL PATH (not a
// hash): the sim owns "/" plus its own sub-tab paths (/dpschart, /team, …), and
// each top-level page is its own path (/howto, /mechanics, …). This matches how
// the sim's tabs already work, so the whole app uses ONE strategy, and — because
// the paths reach the server — each is independently crawlable with its own embed
// card (see scripts/serve.mjs). The static server SPA-falls-back every unknown
// path to index.html, and the web-smoke loads at "/?team=…" which resolves to sim.
export type Route =
  | 'sim'
  | 'rankings'
  | 'overload'
  | 'tools'
  | 'howto'
  | 'mechanics'
  | 'dev'
  | 'patch-notes'
  | 'testing-requests'
  | 'roster-sync'
  | 'credits'
  | 'characters'
  | 'unit';

// Flat list of nav/analytics routes. Parameterized routes (e.g. /unit/:slug)
// are intentionally excluded — hrefFor('unit') would produce /unit, which only
// renders "Unit not found"; unit pages are driven by the slug in the path.
export const ROUTES: Route[] = [
  'sim',
  'rankings',
  'overload',
  'tools',
  'howto',
  'mechanics',
  'dev',
  'patch-notes',
  'testing-requests',
  'roster-sync',
  'credits',
  'characters',
];

// Top-level PAGE routes. The sim app owns "/" plus its sub-tab paths
// (/ranks, /overload, …); any segment that isn't a page or a section path
// resolves to sim.
const PAGE_ROUTES: Route[] = [
  'howto',
  'mechanics',
  'dev',
  'patch-notes',
  'testing-requests',
  'roster-sync',
  'credits',
  'characters',
];
// The App hosts four tool SECTIONS — Sim, Rankings, Overload, Tools. Each sub-tab
// is still served by the App at its own path; these maps group the paths under
// their section in the top nav.
const RANKINGS_PATHS = ['ranks', 'dpschart', 'dps'];
const OVERLOAD_PATHS = ['overload', 'olsim', 'charge'];
// Team Generator + Roster Generator live in the Sim section, so their paths
// (/team, /roster) fall through to 'sim' below.
const TOOL_PATHS = ['teambuilder', 'builder', 'doll', 'resources'];
// Where each section's nav link lands — the section's first tab.
const SECTION_LANDING: Record<'rankings' | 'overload' | 'tools', string> = {
  rankings: '/ranks',
  overload: '/overload',
  tools: '/teambuilder',
};

// map the first path segment to a Route; section paths → their section route,
// other sim-app paths (and "/") → sim
export function routeFromPath(pathname: string): Route {
  const seg = pathname
    .replace(/^\/+|\/+$/g, '')
    .split('/')[0]
    .toLowerCase();
  if (seg === 'unit') {
    return 'unit';
  }
  if ((PAGE_ROUTES as string[]).includes(seg)) {
    return seg as Route;
  }
  if (RANKINGS_PATHS.includes(seg)) {
    return 'rankings';
  }
  if (OVERLOAD_PATHS.includes(seg)) {
    return 'overload';
  }
  if (TOOL_PATHS.includes(seg)) {
    return 'tools';
  }
  return 'sim';
}

export function unitSlugFromPath(pathname: string): string | null {
  const segs = pathname
    .toLowerCase()
    .replace(/\/{2,}/g, '/')
    .replace(/^\/+|\/+$/g, '')
    .split('/');
  if (segs[0] !== 'unit') {
    return null;
  }
  return segs[1] ?? null;
}

// href for a route — a real path so links are hyperlinkable and crawlable
export const hrefFor = (route: Route): string =>
  route === 'sim'
    ? '/'
    : route === 'rankings' || route === 'overload' || route === 'tools'
      ? SECTION_LANDING[route]
      : `/${route}`;

// SPA navigation: update the URL via pushState (no full reload), then notify every
// listener (this router + the sim App's tab sync) with a popstate event. Callers
// pass the full target (path + any search/hash they want to keep); page links pass
// a bare path so sim query params don't leak onto a page URL.
export function navigate(url: string): void {
  window.history.pushState({}, '', url);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

// Single subscription to the browser location pathname. Both useRoute and
// useUnitSlug derive from this so they can never desync on the event type.
export function useLocationPathname(): string {
  const [pathname, setPathname] = useState<string>(
    () => window.location.pathname
  );
  useEffect(() => {
    const onNav = () =>
      setPathname((p) =>
        p === window.location.pathname ? p : window.location.pathname
      );
    window.addEventListener('popstate', onNav);
    return () => window.removeEventListener('popstate', onNav);
  }, []);
  return pathname;
}

export function useRoute(): Route {
  const pathname = useLocationPathname();
  const route = routeFromPath(pathname);
  const prev = useRef(route);
  useEffect(() => {
    if (route !== prev.current) {
      prev.current = route;
      window.scrollTo(0, 0); // jump to top only when the page actually changes
    }
  }, [route]);
  return route;
}

// Single subscription that yields both the route and the unit slug. Use this
// in Root instead of calling useRoute separately; this keeps only one popstate
// listener and avoids re-rendering the tree twice per navigation.
export function useRouteAndSlug(): { route: Route; unitSlug: string | null } {
  const pathname = useLocationPathname();
  const route = routeFromPath(pathname);
  const unitSlug = unitSlugFromPath(pathname);
  const prev = useRef(route);
  useEffect(() => {
    if (route !== prev.current) {
      prev.current = route;
      window.scrollTo(0, 0); // jump to top only when the page actually changes
    }
  }, [route]);
  return { route, unitSlug };
}

// Click handler for in-app anchor links. Lets Ctrl/Cmd/Shift/Alt-clicks and
// middle-clicks fall through to the browser; otherwise converts the click into
// an SPA navigate.
export function onSpaLinkClick(
  href: string
): (e: MouseEvent<HTMLAnchorElement>) => void {
  return (e: MouseEvent<HTMLAnchorElement>) => {
    if (
      e.defaultPrevented ||
      e.button !== 0 ||
      e.metaKey ||
      e.ctrlKey ||
      e.shiftKey ||
      e.altKey
    ) {
      return;
    }
    e.preventDefault();
    navigate(href);
  };
}
