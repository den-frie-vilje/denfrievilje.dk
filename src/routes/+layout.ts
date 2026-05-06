export const prerender = true;
// Per the SvelteKit docs (https://svelte.dev/docs/kit/page-options#trailingSlash):
// "If `trailingSlash` is `always`, a route like `/about` will result in an
// `about/index.html` file, otherwise it will create `about.html`, mirroring
// static webserver conventions." The `always` shape pairs cleanly with nginx
// directory-index serving and gives us canonical URLs that always end in `/`.
export const trailingSlash = 'always';
