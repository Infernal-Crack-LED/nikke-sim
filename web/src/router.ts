import { useEffect, useState } from 'react';

// Tiny hash router — no dependency, works with static hosting. The sim keeps
// the default (empty / #/ / #/sim) route so the web-smoke test, which loads at
// `/?team=...` with no hash, still renders the sim.
export type Route = 'sim' | 'mechanics' | 'dev';

export const ROUTES: Route[] = ['sim', 'mechanics', 'dev'];

// map the location hash to a Route; anything unrecognized falls back to the sim
export function routeFromHash(hash: string): Route {
  const h = hash.replace(/^#\/?/, '').split(/[/?]/)[0].toLowerCase();
  if (h === 'mechanics') return 'mechanics';
  if (h === 'dev') return 'dev';
  return 'sim';
}

// href for a route (used by nav links / the dev badge)
export const hrefFor = (route: Route): string =>
  route === 'sim' ? '#/' : `#/${route}`;

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() =>
    routeFromHash(window.location.hash),
  );
  useEffect(() => {
    const onHash = () => {
      setRoute(routeFromHash(window.location.hash));
      // jump to top when switching pages
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  return route;
}
