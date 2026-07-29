// Daily solo-raid resource drops — re-exported from the shared, server-renderable
// core so the web Resource Calculator and the nikkesim.app resources image API
// (src/infographics/core/resourcesCard.ts) read the exact same table. Moved
// there 2026-07-29; this file is kept so existing `./resources-data` imports in
// web/src don't need to change.
export * from '../../src/infographics/core/resourcesData';
