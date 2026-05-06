// _og routes are render targets for the Puppeteer-based OG image generator
// (scripts/generate-og-images.js). They must NOT be prerendered into the
// final build — the generator visits them in dev/build mode and screenshots
// them, then the static site ships only the resulting PNGs in static/og/.
export const prerender = false;
// No need for client-side hydration; we render once and screenshot.
export const csr = false;
