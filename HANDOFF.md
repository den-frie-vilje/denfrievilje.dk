# Hand-off — feature/research-section

A continuation note for the next Claude session. Delete this file before
opening the PR to staging.

## State

- Branch: `feature/research-section` (origin), HEAD at `be5bb73`
- Base: `origin/staging` (the worktree's local-branch tracking is set to
  `origin/main` cosmetically, but the commit history is rebased onto
  staging's `3f35b4b Merge origin/main into staging`)
- Dev: `pkgx pnpm install && pkgx pnpm dev` — preview at `http://localhost:5173/`
- Project dev servers are described in `.claude/launch.json` (tracked).

## What landed

See `git log --stat origin/feature/research-section` for the precise diff.
At a glance:

1. **Research section** parallel to Works/Consultancies. List route at
   `/research/`, detail at `/research/[slug]/`. Mirrored OG image route
   under `/_og/research/[slug]/`.
2. **First entry**: `src/content/research/1.telematisk-performance-laboratorium/`
   covering the 2004–2005 Telematisk Performance Laboratorium with
   Boxiganga at Kanonhallen. 15 gallery photographs, 13 inline setup
   schematics (in `setups/` subfolder), 2 PDF publications, 4
   appearances (3 labs + PARIP 2005). Body rewritten several times with
   the user; see "Tone" below before touching it again.
3. **Publications schema** on `ContentMeta`: optional `publications: [{ title, file, year, type, author?, language? }]`. PDFs co-located with the
   markdown. First-page thumbnails generated at build time via
   `pdf-to-img` (added as devDependency). Rendered into the right-rail
   sidebar of the detail page.
4. **Works ↔ research linking** via optional `research: <slug>` field
   on `ContentMeta`. Surfaces:
   - As a sidebar link "Part of research →" on the work/consultancy
     detail page.
   - As an "Outcomes" grid on the research detail page (combining works
     + consultancies that name this research).
   - Nothing currently links yet — when the LEDlys entry lands, set
     `research: ledlys` on `works/16.digital-weather/index.md`.
5. **Markdown subfolder image rewriting** in `src/lib/content.ts`'s
   `renderBody`: `![](setups/01.foo.jpg)` is rewritten to
   `/content/<section>/<slug>/setups/01.foo.jpg` at render time. The
   image pipeline recursively copies subfolder images to `static/`.
6. **Frontmatter consolidation**: every section's summary lives in
   `src/content/<section>/index.md` as `lead` (plain text) and
   optionally `teaser_lead`, `teaser_label`. `llms.txt`, page H1/SEO,
   `CollectionPage` JSON-LD, and homepage teasers all read from there.
   Hardcoded fallback strings in route `.svelte` files were removed.
   `about/index.md` had its HTML-laden `lead` flattened to plain text.
   `contact/index.md` gained a `lead`.
7. **Dev-only picker**: `/_picker/<section>/<slug>/?source=<absolute-path>`.
   Lists current gallery photos + photos in the source folder, click to
   add/remove, drag-free reorder via ← →, save action renumbers
   sequentially. Source images are served resized through
   `/_picker/raw?path=...&size=...`. Safe-path checks restrict reads
   to `$HOME` and `/Volumes`. Gated by `import.meta.env.DEV` and
   `prerender = false` — does not exist in production build.
8. **`.env.development`** with `PUBLIC_SITE_HOST=denfrievilje.dk`,
   `PUBLIC_DOMAIN_MODE=bureau`, `PUBLIC_SHOW_PALETTE_TOGGLE=true`.
   Without this, `$env/static/public` imports throw at hydration and
   the entire page is non-interactive in dev. Production/staging builds
   inject equivalents via `deploy/Dockerfile` build-args.
9. **Layout chrome opt-out** extended from `/_og/*` to `/_picker/*` —
   picker pages render without site header/footer.

## Tone & style — read before touching the prose

The user is European and very particular. The body went through several
rewrites; the current state took deliberate work to land. Things they
explicitly rejected:

- **No Americanised boasting.** Out: "flagship lab", "cheapest", "stress-tested", "explicit point of departure", "in our orbit", "the most complex", "main methodological claim", "what the labs taught me / I have carried into every installation since".
- **Do not headline "My contribution".** They prefer the work folded
  into descriptive narrative. The detail page used to have a
  `## My contribution` heading — gone, content folded into "Method".
- **Don't introduce concepts that aren't in the sources.** Specifically
  called out: "domestication", "minimal scenography", "mediated
  situational arguments", "the scenography is the argument" — all my
  coinages, all removed.
- **Allowed and explicitly endorsed by the user**:
  - "*situational arguments*" — their phrase. Frame as: "We saw the
    minimally staged situations as *situational arguments* about
    human presence and relationships."
  - "*minimally staged situations*" — their phrase.
  - "*fixation mechanism*", "*mirrored symmetric experience of a
    simultaneous now*", "*delay-synchronised loops of gesture*",
    "*conflation of the two spaces*" — their phrasing for the
    table-and-chair setups.
  - "*Mirrechophone*" — Boxiganga's coinage, kept.

The user's correction on locality confusion: it requires the **delay**.
Without delay (#12 Videophone with table and chair) the situation is
just recognisable as a video conversation. With delay (#9 Delay
videophone with table and chair) participants lost track of whether
the screen was mirroring their own situation or transmitting from the
opposite side. #13 (Single frame double lightroom with table and chair)
has compositional conflation, not delay-induced locality confusion.

When in doubt, **ask before rewording**. The user has high standards
and a precise ear.

## Pending work

In rough priority order, but the user drives:

1. **LEDlys research entry** (`src/content/research/2.ledlys/`). The
   user said "there will be a LED-lys project too" and confirmed
   Digital Weather is one of its outcomes. Once it lands, set
   `research: ledlys` on `src/content/works/16.digital-weather/index.md`
   and the Outcomes block on the LEDlys detail will populate. The
   research arc covers 2010–2017 between ITU and KADK. See "LEDlys
   agent findings" below for the material to work from.
2. **More photo curation for Telematisk** via the picker. The user
   asked for "more photos" once and the picker exists for ongoing
   tweaks. Suggested source folders not yet exhausted:
   `/Volumes/home/Projects/2004 - 2005 telematisk performance lab/II/billeder 17.02/`
   `/Volumes/home/Projects/2004 - 2005 telematisk performance lab/II/billeder 24.02/`
   `/Volumes/home/Projects/2004 - 2005 telematisk performance lab/II/billeder 27.02/`
3. **Verify PARIP 2005 location**. The appearance says "University of
   Leeds" — the user noted the conference's host university is worth
   checking. The original PARIP project was Bristol-based (hence
   `bris.ac.uk` URL); the 2005 conference may have been at Leeds, may
   have been at Bristol. Look in
   `/Volumes/home/Projects/2004 - 2005 telematisk performance lab/II/interviews og noter/Conference Abstract Kjell.doc` —
   it has the date range (29 June – 3 July 2005) but not the venue.
4. **Decide on Digital Weather framing**. The user said it's one of
   the LEDlys works. Open question: should it stay in `works/` and
   link to the research, or move to `research/` as a primary
   outcome? My recommendation was to keep it in `works/` since it's
   an installation; only the research umbrella lives in `research/`.
   User hasn't ruled definitively.
5. **Open PR to staging** once content is settled. PR base: `staging`.
   Title suggestion: `Research section + Telematisk Performance Laboratorium entry`.

## Source material paths (not in repo)

These are on the user's NAS mount and won't exist on other machines:

- **Telematisk PL**:
  `/Volumes/home/Projects/2004 - 2005 telematisk performance lab/`
  - `I/installation/` — 9 composite photos from Lab I (Nov 2004)
  - `I/logoer/` — high-res versions of the schematic logos
  - `II/billeder til rapporten/` — curated photos used in current entry
  - `II/billeder 13.02, 16.02, 17.02, 23.02, 24.02, 27.02/` — raw lab
    photos by date
  - `II/portrætter/` — participant portraits (not used per the project's
    framing; user wants names in text, not portrait galleries)
  - `II/interviews og noter/` — interview transcripts. **DO NOT publish**
    per user instruction. Names of participants are fine in the body.
  - `II/setups/00 logos/` — schematic logos for all 13 setups (already
    copied into `src/content/research/.../setups/`)

- **LEDlys**:
  - `/Volumes/home/Projects/2010 - IT Universitetet/LEDlys/`
    Contains: `LED i Danmark.pdf`, `MTI Leger Med Lyset .pdf`,
    `Til Ole_RÅKLIP.mov`, `White Cube fotos JK/`, `led binning/`,
    `software sketches/`, `vandalorum/`, `websites/`, `writings/`,
    `20110802 Seminar 1/`, `ITU timelapse/`, `LED Branchedag/`.
  - `/Volumes/home/Projects/2010 - IT Universitetet/2015 Elforsk/`
    Contains: `Box design/`, `Cirquit/`, `Digital Weather/`,
    `Inspirations/`, `Writings/`, `ledSynthMaster Release 2016-...`.

## LEDlys agent findings (preserved verbatim from the spawned agent)

Saves a re-research pass. Treat as **starting material, not final
prose** — needs to be filtered through the tone guidelines above.

**Project arc.** Practice-led research investigating dynamic daylight +
adaptive LED lighting in architectural spaces. ITU + KADK. Two phases:
2010–2014 observational-instrument phase producing *Adaptive Light*
and *Pixel Experiments* books and the tessellated Observational
Instrument; 2015–2017 Elforsk-funded follow-on extending into
energy-optimisation / user-welfare ("Light at eye level"). Petersen's
project won Elforsk's "best research project 2018".

**People.** Kjell Yngve Petersen (ITU, head of Adaptive Environments
group); Karin Søndergaard (KADK); Karina Munkholm Madsen (KADK
architect, instrument designer); Ole Kristensen (ITU, software);
Christina Augustesen, Jesper Kongshaug, Nina Rask (later phase).
Industry partners in the Elforsk phase: Spektra LED, CreaSign, Grontmij,
Kongshaug & Søn.

**Recommended publications** (with public URLs as fallback for the
local files):
1. Søndergaard & Petersen, *"An Exploration into Integrating Daylight
   and Artificial Light via an Observational Instrument"* (KADK, c.
   2012) — headline publication. Software by Ole.
   <https://issuu.com/kadk/docs/exploration_into_integrating_daylig>
2. Petersen, Kongshaug, Søndergaard, *"Adaptivt Lys"* (KADK, c. 2012).
   <https://issuu.com/kadk/docs/adaptivtlys_hq>
3. Augustesen, Petersen, Søndergaard, *"Pixel Experiments"* (KADK,
   c. 2012). <https://issuu.com/kadk/docs/pixel_experiments>
4. Petersen & Kristensen, *"The Experience of Dynamic Lighting"*,
   DeSForM 2017 proceedings (InTechOpen 2017).
   <https://pure.itu.dk/en/publications/the-experience-of-dynamic-lighting>
5. Petersen & Rask, *"Light at eye level is a means to create energy
   savings and space for learning, focus and concentration"* (Elforsk
   report, 2018).
   <https://orbit.dtu.dk/en/publications/light-at-eye-level-is-a-means-to-create-energy-savings-and-space->

**Installations / outputs.** Observational Instrument (a.k.a. White
Cube / White Box) — tessellated wall-mounted cardboard-and-LED cubes
controlled by Ole's software; Digital Weather (2017, Vandalorum —
already on site at `/works/digital-weather/`); Pixel Experiments
installations; Light at Eye Level deployments in schools and offices.

**Ole's role.** Adaptive control software and interface for the
Observational Instrument (openFrameworks + bespoke code, DMX/OLA
via openFrameworks add-ons). Co-author on Petersen & Kristensen 2017.
Real-time feedback systems for several installations across both
phases.

**Suggested entry shape.**
- title: `LEDlys` (or `LEDlys — Integrating Daylight and Adaptive LED
  Light`)
- date: `2010–2017`
- lead: something like *"An interdisciplinary research project at the
  IT University of Copenhagen and the Royal Danish Academy on the
  integration of daylight and adaptive LED light through observational
  instruments and adaptive software."* — but filter through the tone
  guidelines and pull phrasing from the actual sources.

**Caveat about tone.** The agent's drafted lead is workable but its
prose elsewhere (e.g. "shifted from initial observational instrument
development … to energy-optimisation and user-welfare applications")
reads as American consulting-deck speak — exactly what the user
doesn't want. Use the agent's *facts*, write the *prose* fresh.

## Verification recipe

For the next session:

```sh
git fetch origin
git checkout feature/research-section
pkgx pnpm install
pkgx pnpm dev
```

Then visit:

- `/` — homepage with Research teaser
- `/research/` — section list
- `/research/telematisk-performance-laboratorium/` — flagship entry
- `/_picker/research/telematisk-performance-laboratorium/?source=/Volumes/home/Projects/2004%20-%202005%20telematisk%20performance%20lab/II/billeder%2017.02` —
  picker, source = Lab II photographs from Feb 17

## Known pre-existing issues (not introduced by this branch)

- `pkgx pnpm check` shows 4 errors about the `PUBLIC_*` env-var
  imports. These pre-date this branch (same errors against
  `origin/staging` baseline). The runtime fix (`.env.development`)
  doesn't help `svelte-check` because that runs `tsc` which doesn't
  read the env file. Could be worth a separate fix — e.g. typed env
  declarations in `app.d.ts`.
- `pkgx pnpm test:e2e` fails on a URL-convention regression — old
  test URLs include the numeric prefix (`/works/1.body-navigation`)
  that the route-resolver now strips. Also pre-existing on staging.
- `pkgx pnpm lint` fails because `@eslint/js` is missing from
  `node_modules`; prettier errors first regardless. Pre-existing.

## Open questions for the user

1. **PARIP 2005 venue** — Leeds or Bristol? (See pending #3.)
2. **Digital Weather framing** — work + link, or move to research? (See
   pending #4.)
3. **Are there other works that link back to Telematisk PL?** I
   audited and didn't find obvious 2004–2005 vintage works in `works/`,
   so probably no. Worth a sanity check.
4. **Should the Three Laboratories section list named participants?**
   It currently does — full roster of Lab II scholars. Keep, trim, or
   move to a separate "Participants" subsection?

## Cleanup before merging to staging

- Delete this file (`HANDOFF.md`).
- Consider whether `.env.development` should ship to production. (Yes
  for dev convenience; production overrides via Dockerfile build-args
  anyway.)
- Consider whether `/_picker/` should ship in the codebase. (Yes — it's
  dev-only at runtime, excluded from the static build, and the picker
  is useful tooling for ongoing content curation.)

— end —
