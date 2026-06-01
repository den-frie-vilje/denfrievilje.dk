<script lang="ts">
	/**
	 * Live L-system tree that morphs from a rigid binary fractal to a
	 * naturalistic three-branched tree as t goes from 0 to MAX_T.
	 *
	 * DESIGN GOALS
	 *
	 * 1. RIGID START (t = 0):
	 *    Binary rectilinear L-system. Every joint spawns 2 children, each
	 *    at ±90° from its parent's local up-vector, each at 65 % of parent
	 *    length. Deterministic, symmetric, fully grown.
	 *
	 * 2. NATURAL END (t = MAX_T):
	 *    Up to 3 children per joint with noise-driven angles, length
	 *    perturbations, and a noise-driven sibling spread. The "extra"
	 *    third child per joint has emerged through the entropy range.
	 *
	 * 3. FLUID GROWTH:
	 *    The third child of every joint physically EXTENDS from its joint
	 *    as t increases — it doesn't fade in. At low t it's a sub-pixel
	 *    stub at the joint; at high t it has reached its full extension.
	 *    Growth cascades down nested third-child chains: a child #2 of a
	 *    child #2 has growth = parent.growth × t, so deeper entropy
	 *    branches emerge progressively later in the t range.
	 *
	 * 4. FOLIAGE (last 25 % of t):
	 *    Simple two-bezier teardrop leaves in the accent colour appear on
	 *    branches whose growth ≥ 50 %. Per-branch noise on size, rotation
	 *    and presence, so the foliage scatters naturally across the tree.
	 *    Threshold: filteredT > MAX_T × 0.75.
	 *
	 * MORPH MECHANICS
	 *
	 * Every branch carries a `growth` factor in [0, 1]. Rendered branch
	 * length = full length × growth. The trapezoid stem's tip width also
	 * interpolates from base-width at growth=0 to fully-tapered tipW at
	 * growth=1, so a half-grown branch reads as a stubby tip rather than
	 * a thin rectangle.
	 *
	 *   ownGrowth     = (isEntropyChild) ? t / MAX_T : 1
	 *   branch.growth = parent.growth × ownGrowth
	 *
	 * Path-stable per-branch noise via `pathSeed` (root = 1; child i =
	 * parent×7 + i+1) so each branch's angle, length, and spread are
	 * stable in time even as t drifts. Time-drift on the angle noise's
	 * second axis only, giving the random state a slow breathing motion.
	 *
	 * Theme-responsive: stem reads --color-ink-secondary, foliage reads
	 * --color-accent, both re-resolved every frame through a canvas
	 * fillStyle round-trip so oklch tokens are normalised to rgb() that
	 * p5 can parse. Canvas is transparent (clear() not background()) so
	 * the page surface shows through and the bureau/artist palette
	 * switch propagates immediately.
	 *
	 * Client-side mount only; SSR skips it.
	 */
	import { onMount, onDestroy } from 'svelte';

	let container: HTMLDivElement;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let p5Instance: any = null;
	let probe: HTMLSpanElement | null = null;

	onMount(async () => {
		const p5Module = await import('p5');
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const P5: any = p5Module.default;

		probe = document.createElement('span');
		probe.style.position = 'absolute';
		probe.style.visibility = 'hidden';
		probe.style.pointerEvents = 'none';
		document.body.appendChild(probe);

		const tempCtx = document.createElement('canvas').getContext('2d');

		const readVar = (varName: string, fallback: string): string => {
			if (!probe || !tempCtx) return fallback;
			probe.style.color = `var(${varName})`;
			const raw = getComputedStyle(probe).color || fallback;
			try {
				tempCtx.fillStyle = '#000000';
				tempCtx.fillStyle = raw;
				return tempCtx.fillStyle as string;
			} catch {
				return fallback;
			}
		};

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const sketch = (p: any) => {
			// — Control state —
			let targetT = 0;
			let filteredT = 0;
			let startingLen = 100;
			// p5 initialises mouseX/mouseY to 0, which the canvas-bounds check
			// would otherwise read as a real cursor sitting at (0,0). Track
			// real interaction so the autocycle can run before the user has
			// moved their cursor over the canvas at least once.
			let mouseHasInteracted = false;
			// Mouse-leave continuation state. When the cursor leaves the
			// canvas we resume the autocycle from the current targetT in the
			// direction the cursor was moving — instead of snapping to
			// sin(0). The phase offset is recomputed at the moment of leave.
			let mouseInsidePrev = false;
			let autocyclePhaseOffset = -Math.PI / 2; // start at sin=−1 → t=0
			let lastMouseT = 0;
			let mouseTDirection = 1; // +1 (rising sin) or −1 (falling sin)
			// Reseed the noise generator each time t cycles back through 0,
			// so every climb to max entropy reveals a new tree shape.
			let inLowZone = false;
			// Faked falling-leaf animation. The TRIGGER is t-based: a leaf
			// is spawned the moment filteredT crosses 0.95 going up, but
			// only if no other leaf is currently falling. Once spawned,
			// the falling animation runs entirely on its own real-time
			// clock — independent of t.
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			let fallingLeaf: any = null;
			let prevFilteredTForLeaf = 0;

			// — Tunable constants —
			const FILTER_TAU_MS = 250;
			const AUTOCYCLE_SPEED = 0.0002; // ~30 s full cycle
			// Wind = a 2D perlin noise field sampled at each joint's world
			// position. Outputs a small XY offset that is applied as a
			// local-space translate before the branch is drawn. Magnitude
			// scales with depth so the trunk and its tip stay anchored;
			// outer canopy moves most.
			const WIND_TIME_SPEED = 0.00035; // time axis of the noise field
			const WIND_SPATIAL_SCALE = 0.008; // smaller = larger coherent gusts
			const WIND_MAGNITUDE = 4; // peak px offset at the outermost depth
			// SHRINK varies with t. At rest (t=0) every level is 65 % of its
			// parent — the rectilinear-binary baseline. At full entropy each
			// level keeps up to ~78 % of its parent's length, so the tree
			// extends further outward and the segment-to-segment dropoff
			// feels less abrupt at both the trunk and the canopy.
			const SHRINK_AT_0 = 0.65;
			const SHRINK_AT_1 = 0.78;
			const STOP_LEN = 4; // safety floor, depth caps before this trips
			const MAX_DEPTH = 7; // recursion-depth cap (keeps tree bounded)
			const LEAF_DEPTH_MIN = 2; // no leaves on the inner 2 levels
			const MAX_BRANCH_ALPHA = 255; // full opacity — overlaps stay clean
			const STARTING_LEN_FRAC = 0.26;
			const MAX_T = 1; // full t range — growth-based mechanic handles the upper band
			const FOLIAGE_FRACTION = 0.6; // foliage window starts at t = 0.6
			const GROWTH_INVISIBLE = 0.001; // skip when this short
			const RENDERED_LEN_MIN = 0.5; // sub-pixel cutoff for the trapezoid


			/**
			 * Uniform hash → [0, 1). Unlike p5's perlin noise, which
			 * returns spatially-correlated values (siblings with adjacent
			 * pathSeeds get nearly-identical noise outputs), this hash
			 * gives uncorrelated values for adjacent inputs — so leaf-
			 * chance decisions don't cluster sibling branches together.
			 */
			const hashRand = (n: number) => {
				let x = Math.floor(n * 374761393) | 0;
				x = ((x ^ (x >> 13)) * 1274126177) | 0;
				x = x ^ (x >> 16);
				return ((x >>> 0) % 1000) / 1000;
			};

			/**
			 * Smoothstep (Hermite ease-in-ease-out) on [0, 1]. Used to
			 * shape `growth` so lengths and widths don't snap on or off
			 * at their growth-window edges — they ease in slowly,
			 * accelerate through the middle, and settle gently at full.
			 */
			const smoothstep = (x: number) => x * x * (3 - 2 * x);

			// — Theme-responsive colours, refreshed every frame —
			let stemR = 80;
			let stemG = 80;
			let stemB = 80;
			let accR = 95;
			let accG = 186;
			let accB = 122;

			const safeRGB = (
				cssColor: string,
				fallbackR: number,
				fallbackG: number,
				fallbackB: number
			) => {
				try {
					const c = p.color(cssColor);
					const r = p.red(c);
					const g = p.green(c);
					const b = p.blue(c);
					if (
						typeof r === 'number' &&
						!isNaN(r) &&
						typeof g === 'number' &&
						!isNaN(g) &&
						typeof b === 'number' &&
						!isNaN(b)
					) {
						return { r, g, b };
					}
				} catch {
					/* fall through */
				}
				return { r: fallbackR, g: fallbackG, b: fallbackB };
			};

			const refreshColors = () => {
				const stem = safeRGB(readVar('--color-ink-secondary', 'rgb(120, 120, 120)'), 120, 120, 120);
				stemR = stem.r;
				stemG = stem.g;
				stemB = stem.b;
				const acc = safeRGB(readVar('--color-accent', 'rgb(95, 186, 122)'), 95, 186, 122);
				accR = acc.r;
				accG = acc.g;
				accB = acc.b;
			};

			// — Canvas sizing —
			const sized = () => {
				const w = container.clientWidth;
				const h = Math.max(360, Math.min(620, Math.round(w * 0.6)));
				return { w, h };
			};

			p.setup = () => {
				const { w, h } = sized();
				p.createCanvas(w, h);
				p.pixelDensity(window.devicePixelRatio || 1);
				p.noiseSeed(Math.floor(Math.random() * 1_000_000));
				startingLen = h * STARTING_LEN_FRAC;
				refreshColors();
				// touch-action: pan-y lets the browser keep handling
				// vertical scroll on mobile, while horizontal touch
				// movements bubble to our handlers so the user can
				// scrub t by swiping left/right.
				if (p.canvas) p.canvas.style.touchAction = 'pan-y';
			};

			p.windowResized = () => {
				const { w, h } = sized();
				p.resizeCanvas(w, h);
				startingLen = h * STARTING_LEN_FRAC;
			};

			p.mouseMoved = () => {
				mouseHasInteracted = true;
			};

			// Touch handlers — p5 maps the first touch to mouseX/mouseY,
			// so the existing draw() loop reads touch position via mouseX
			// without further wiring. We just need to flag that interaction
			// has happened so the autocycle stops overriding it.
			p.touchStarted = () => {
				mouseHasInteracted = true;
				return true; // don't prevent default — allow scroll etc.
			};
			p.touchMoved = () => {
				mouseHasInteracted = true;
				return true;
			};

			p.draw = () => {
				try {
					p.clear();
					refreshColors();

					const mouseInside =
						mouseHasInteracted &&
						p.mouseX >= 0 &&
						p.mouseX <= p.width &&
						p.mouseY >= 0 &&
						p.mouseY <= p.height;
					if (mouseInside) {
						const newT = p.map(p.mouseX, 0, p.width, 0, MAX_T);
						// Track direction so we can resume the autocycle in
						// the same direction on leave. A tiny deadband
						// ignores frame-to-frame jitter for stationary
						// cursors.
						if (newT > lastMouseT + 0.002) mouseTDirection = 1;
						else if (newT < lastMouseT - 0.002) mouseTDirection = -1;
						lastMouseT = newT;
						targetT = newT;
					} else {
						if (mouseInsidePrev) {
							// Mouse just left. Pick a phase offset such that
							// the autocycle's sine sits exactly at our current
							// targetT and slopes in the direction the cursor
							// was tending.
							const sinVal = (targetT / MAX_T) * 2 - 1;
							const asinVal = Math.asin(p.constrain(sinVal, -1, 1));
							const targetPhase =
								mouseTDirection >= 0 ? asinVal : Math.PI - asinVal;
							autocyclePhaseOffset =
								targetPhase - p.millis() * AUTOCYCLE_SPEED;
						}
						const phase =
							p.millis() * AUTOCYCLE_SPEED + autocyclePhaseOffset;
						targetT = ((Math.sin(phase) + 1) / 2) * MAX_T;
					}
					mouseInsidePrev = mouseInside;

					const dt = p.deltaTime || 16;
					const alpha = 1 - Math.exp(-dt / FILTER_TAU_MS);
					filteredT += (targetT - filteredT) * alpha;

					// Re-seed noise once per low-t excursion. Threshold is
					// kept very close to 0 so the new noise lands when the
					// tree is at its most-rectilinear state — minimising
					// visible jitter from the shape change. Hysteresis on
					// the rearm threshold prevents re-seeding every frame
					// while t hovers near zero.
					if (filteredT < 0.005 && !inLowZone) {
						inLowZone = true;
						p.noiseSeed(Math.floor(Math.random() * 1_000_000));
					}
					if (filteredT > 0.03) inLowZone = false;

					// Leaf-fall trigger: fired the frame filteredT crosses
					// 0.95 going upward, provided no leaf is already in
					// flight. Once spawned the falling animation runs on
					// its own real-time clock — independent of t.
					if (
						!fallingLeaf &&
						prevFilteredTForLeaf < 0.95 &&
						filteredT >= 0.95
					) {
						const canopyTop = -p.height * 0.78;
						const canopyBottom = -p.height * 0.45;
						const canopyHalfWidth = p.width * 0.32;
						fallingLeaf = {
							spawnMs: p.millis(),
							originX: (Math.random() - 0.5) * canopyHalfWidth * 2,
							originY:
								canopyTop +
								Math.random() * (canopyBottom - canopyTop),
							fullSize: 10 + Math.random() * 6,
							lightnessShift: (Math.random() - 0.5) * 1.6,
							rotOffset: Math.random() * Math.PI * 2,
							driftDirection: Math.random() > 0.5 ? 1 : -1,
							spinSpeed: (Math.random() - 0.5) * 4,
							spiralPhase: Math.random() * Math.PI * 2,
							gustPhase: Math.random() * Math.PI * 2,
							// Fake-3D rotation rates around the leaf's
							// local horizontal/vertical axes — applied as
							// scale-based squash in drawFallingLeaf so
							// the leaf tumbles like paper in three axes.
							yawSpeed: (Math.random() - 0.5) * 5,
							pitchSpeed: (Math.random() - 0.5) * 4,
							yawPhase: Math.random() * Math.PI * 2,
							pitchPhase: Math.random() * Math.PI * 2
						};
					}
					prevFilteredTForLeaf = filteredT;

					// Measure tree extent so we can scale to fit the canvas.
					// Walks the full tree (mains + extras) so horizontal
					// overflow from lateral extras is caught, not just
					// vertical overflow from the main spine.
					frameMaxUp = 0;
					frameMaxL = 0;
					frameMaxR = 0;
					measureExtent(startingLen, 1, -1, -1, 0, 0, 0, 0, 0);
					const targetUp = p.height * 0.93;
					const targetHalfW = (p.width / 2) * 0.96;
					const fitScaleY = Math.min(1, targetUp / Math.max(frameMaxUp, 1));
					const fitScaleL = Math.min(1, targetHalfW / Math.max(frameMaxL, 1));
					const fitScaleR = Math.min(1, targetHalfW / Math.max(frameMaxR, 1));
					const fitScale = Math.min(fitScaleY, fitScaleL, fitScaleR);

					p.translate(p.width / 2, p.height);
					if (fitScale < 1) p.scale(fitScale);
					p.noStroke();

					// Draw the falling leaf FIRST so the tree's branches
					// and trunk render on top — the leaf appears to pass
					// behind the canopy and then behind the stem before
					// dropping out of sight below the canvas.
					drawFallingLeaf();

					// Root: childIndex=0, parent flagged rectilinear (parentEndT < 0),
					// depth=0.
					branch(startingLen, 1, -1, -1, 0, 0, 0, 0, 0);
				} catch (err) {
					// eslint-disable-next-line no-console
					console.error('LSystemTree draw error:', err);
				}
			};

			/**
			 * Draw a leaf at the current transform origin.
			 *
			 * Shape: round base, narrowing to a pointed tip. The stem
			 * root — where the leaf attaches to the branch — is at (0, 0).
			 * The round base bulges upward from there (negative y), and
			 * the tip extends further up to (0, -(h + r)).
			 *
			 * After the π rotation in maybeDrawLeaf the shape flips so the
			 * stem root stays at the rotation origin and the round base +
			 * tip hang downward (positive y in screen coords). Rotation
			 * wobble pivots AROUND the stem root, so the leaf swings on
			 * its attachment point — never floats off-centre.
			 */
			const SEGMENTS = 14; // per side
			const drawLeaf = (size: number, alpha: number, lightnessShift: number) => {
				const w = size * 1.05; // half-width factor — wider for round base
				const h = size * 1.55; // tip distance from top of round base
				const r = w * 0.5; // round-base diameter (origin → bulge top)
				// lightnessShift in [-1, +1] — shifts each RGB channel by up
				// to ±30 so leaves vary in lightness slightly from leaf to
				// leaf, breaking the flat single-tone look.
				const shift = lightnessShift * 30;
				const lr = p.constrain(accR + shift, 0, 255);
				const lg = p.constrain(accG + shift, 0, 255);
				const lb = p.constrain(accB + shift, 0, 255);
				p.fill(lr, lg, lb, alpha);
				p.beginShape();
				// Cubic bezier evaluator
				const bz = (t: number, p0: number, p1: number, p2: number, p3: number) => {
					const u = 1 - t;
					return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
				};
				// Right side: from stem root (0, 0) — bottom of round base
				// — curving wide out, then tapering up to tip (0, -(h+r)).
				for (let i = 0; i <= SEGMENTS; i++) {
					const t = i / SEGMENTS;
					const x = bz(t, 0, w * 1.05, w * 0.55, 0);
					const y = bz(t, 0, -r * 1.35, -h * 0.55 - r, -h - r);
					p.vertex(x, y);
				}
				// Left side: tip back down to stem root (0, 0)
				for (let i = 1; i <= SEGMENTS; i++) {
					const t = i / SEGMENTS;
					const x = bz(t, 0, -w * 0.55, -w * 1.05, 0);
					const y = bz(t, -h - r, -h * 0.55 - r, -r * 1.35, 0);
					p.vertex(x, y);
				}
				p.endShape(p.CLOSE);
			};

			/**
			 * Foliage decision and rendering at the current transform origin.
			 *  - filteredT must be in the last 25 % of MAX_T
			 *  - branch must be in the outer half of the tree's depth
			 *  - per-branch noise gate (≈ 40 % of eligible branches leaf)
			 *  - branch's own growth must be ≥ 50 % (no leaves on stubby tips)
			 */
			/**
			 * Scatter 1–3 leaves around each branch tip. The placement
			 * model is polar around the tip — angle + radius — so leaves
			 * fill the CROWN space surrounding each tip rather than
			 * stacking on the branch itself.
			 *
			 *  - Leaves SCALE UP (size × bloomFactor) instead of fading
			 *    in via opacity. Each leaf grows from a point.
			 *  - Each leaf at a joint claims its own angular band
			 *    (li / leafCount × 2π) with a wobble inside the band,
			 *    so siblings spread out 360° around the tip and rarely
			 *    overlap.
			 *  - Radius is squared (radiusN²) so leaves cluster closer
			 *    to the tip but reach outward occasionally.
			 *  - Rotation defaults to π (downward) with ±40° wobble so
			 *    every leaf droops from its position.
			 *
			 * `renderedLen` is unused now — kept in the signature for
			 * call-site stability — placement scale uses `len` so it's
			 * consistent across the growth window.
			 */
			const maybeDrawLeaf = (
				pathSeed: number,
				len: number,
				growth: number,
				_renderedLen: number,
				depth: number,
				isTerminal: boolean,
				geomX: number,
				geomY: number
			) => {
				const foliageThreshold = MAX_T * FOLIAGE_FRACTION;
				// SMOOTH gates only — no hard cuts that would pop a leaf
				// in or out as conditions change frame-to-frame.
				//
				//   branchScale: leaves on a low-growth branch shrink to
				//   zero instead of disappearing. 0 at growth ≤ 0.20, 1 at
				//   growth ≥ 0.40. So as a cascade branch's growth ramps,
				//   its leaves grow with it; if growth ever decreases, they
				//   shrink back rather than cutting.
				//
				//   The filteredT-vs-foliageThreshold gate is now handled by
				//   the per-leaf bloomFactor below — leaves with a startT
				//   higher than the current filteredT compute bloomFactor=0
				//   naturally and skip via the size-min cutoff.
				const branchScale = p.constrain((growth - 0.2) / 0.2, 0, 1);
				if (branchScale <= 0) return;

				// Static gates (depth + leafChance) — these are constant per
				// branch so they can't cause flicker.
				if (isTerminal) {
					// Terminals: 50 % chance of leafing.
					const termChance = hashRand(pathSeed + 211);
					if (termChance >= 0.5) return;
				} else {
					if (depth < LEAF_DEPTH_MIN) return;
					const leafChance = hashRand(pathSeed + 137);
					if (leafChance >= 0.06) return; // ~6 % of non-terminal
				}

				const leafAlpha = 235;
				// Per-leaf growth window inside the foliage band so leaves
				// emerge progressively rather than blooming in unison.
				// Each leaf gets its own startT seeded by pathSeed + li and
				// takes LEAF_GROWTH_DUR of t to scale from 0 to full size.
				const LEAF_GROWTH_DUR = 0.08;
				const leafBudget = MAX_T - foliageThreshold - LEAF_GROWTH_DUR;

				// 1 leaf per leafing joint — uniform distribution comes from
				// having MORE joints leaf rather than more leaves per joint.
				const leafCount = 1;

				// Per-joint angular phase so adjacent joints' leaves don't
				// all start at the same compass position.
				const phaseN = p.noise(pathSeed * 0.187 + 113);
				const phase = phaseN * Math.PI * 2;

				for (let li = 0; li < leafCount; li++) {
					const sizeN = p.noise(pathSeed * 0.211 + li * 11 + 13);
					const angleN = p.noise(pathSeed * 0.7 + li * 11 + 23);
					const radiusN = p.noise(pathSeed * 0.81 + li * 17 + 41);
					const rotN = p.noise(pathSeed * 0.331 + li * 19 + 7);

					// Per-leaf startT and bloom — each leaf grows on its
					// own schedule inside the [foliageThreshold, MAX_T]
					// window. Staggered so leaves emerge one-by-one rather
					// than popping into view together.
					const startTN = hashRand(pathSeed * 17 + li * 3 + 11);
					const leafStartT = foliageThreshold + startTN * leafBudget;
					const bloomRaw = p.constrain(
						(filteredT - leafStartT) / LEAF_GROWTH_DUR,
						0,
						1
					);
					const bloomFactor = smoothstep(bloomRaw);
					// Combined size scale: bloom AND branch growth.
					// Both can decrease over time (filteredT moves both ways
					// in the autocycle, branch growth ebbs and flows in the
					// cascade). The leaf's visible size tracks both, so it
					// continuously grows and shrinks rather than cutting.
					const sizeScale = bloomFactor * branchScale;
					if (sizeScale < 0.02) continue;

					// Angular band: each leaf gets 2π/leafCount of arc.
					const bandWidth = (Math.PI * 2) / leafCount;
					const wobble = (angleN - 0.5) * bandWidth * 0.7;
					const a = phase + li * bandWidth + wobble;

					// Linear radius — uniform spread from 0 to `len × 0.9`
					// around the tip — rather than squared (which would
					// cluster leaves at the tip and leave the outer crown
					// thin). Linear gives a more even canopy fill.
					const r = radiusN * len * 0.9;
					const x = Math.cos(a) * r;
					const y = Math.sin(a) * r;

					// Full size 5.5–14 px — 70 % of the previous 8–20 band.
					const fullSize = 5.5 + sizeN * 8.5;
					const size = fullSize * sizeScale;
					if (size < 1) continue;

					// Drooping: point downward (π) with ±40° wobble.
					const baseRot = Math.PI + (rotN - 0.5) * 1.4;

					// Subtle angular rustle anchored at the stem-root pivot.
					// We sample the wind field at the leaf's world position
					// to get a LOCAL strength. Cubing that strength gives
					// a patchy distribution: most positions read close to
					// zero (still leaves), occasional gusty pockets read
					// closer to one (active rustle). Both the amplitude
					// AND the frequency of the rustle scale with this
					// active strength, so calm leaves are at rest, mid-
					// strength leaves shimmer slowly, and gusty pockets
					// rustle quickly.
					const RUSTLE_MAGNITUDE = 0.4; // ≈ ±23° peak swing in fully-gusty pocket
					const rustleRamp = p.constrain(
						(filteredT - 0.1) / 0.9,
						0,
						1
					);
					const leafWorldX = geomX + x;
					const leafWorldY = geomY + y;
					const windPhaseT = p.millis() * WIND_TIME_SPEED;
					const windHereSample = p.noise(
						leafWorldX * WIND_SPATIAL_SCALE + 17,
						leafWorldY * WIND_SPATIAL_SCALE + 17,
						windPhaseT
					);
					const localWindStrength = Math.abs(windHereSample - 0.5) * 2;
					// Power 1.5 — gentler than squared, so more pockets are
					// actively rustling. Mid-strength positions read as
					// clearly moving, while only the calmest patches stay
					// at rest.
					const activeStrength = Math.pow(localWindStrength, 1.5);

					const rustleFreqMultiplier = 0.4 + activeStrength * 12;
					const rustleT =
						p.millis() * WIND_TIME_SPEED * rustleFreqMultiplier;
					const rustleN = p.noise(
						leafWorldX * WIND_SPATIAL_SCALE + 53,
						leafWorldY * WIND_SPATIAL_SCALE + 53,
						rustleT
					);
					const rustle =
						(rustleN - 0.5) *
						2 *
						RUSTLE_MAGNITUDE *
						activeStrength *
						rustleRamp *
						sizeScale;
					const rot = baseRot + rustle;

					// Per-leaf lightness shift — slight RGB offset so the
					// canopy reads as a mix of lighter and darker leaves
					// rather than a single uniform green.
					const lightnessN = hashRand(pathSeed * 23 + li * 5 + 67);
					const lightnessShift = (lightnessN - 0.5) * 2;

					p.push();
					p.translate(x, y);
					p.rotate(rot);
					drawLeaf(size, leafAlpha, lightnessShift);
					p.pop();
				}
			};

			/**
			 * Update + draw the currently-falling leaf (if any). Position
			 * follows a slow spiral with downward drift and rotation.
			 * Drawn BEFORE the tree so the trunk and branches obscure it
			 * as it descends past them — when it falls below the canvas
			 * bottom it's removed.
			 */
			const drawFallingLeaf = () => {
				if (!fallingLeaf) return;
				const elapsed = (p.millis() - fallingLeaf.spawnMs) / 1000;

				// VERTICAL — sheet-of-paper fall.
				//
				// Net downward drift accelerates over time, but a perlin-
				// driven lift wave can push the leaf UPWARDS for a moment
				// before gravity wins again. Early in the fall the lift is
				// big enough to fully reverse direction; later the net
				// downward acceleration dominates and the leaf settles.
				const baseFall = 5 * elapsed + 4 * elapsed * elapsed;
				const liftN = p.noise(
					elapsed * 0.7 + fallingLeaf.gustPhase,
					fallingLeaf.spiralPhase
				);
				const liftWave = (liftN - 0.5) * 80;
				const vertical = baseFall + liftWave;

				// HORIZONTAL — swooping arcs at two frequencies plus a
				// slower noise-driven wander. As the leaf descends, an
				// increasing "settle" pull bends its x toward 0 (behind
				// the stem) so it always lands out of sight there.
				const swoop1 =
					Math.sin(elapsed * 1.3 + fallingLeaf.spiralPhase) * 42;
				const swoop2 =
					Math.sin(elapsed * 2.8 + fallingLeaf.spiralPhase * 1.7) * 16;
				const wanderN = p.noise(
					elapsed * 0.5 + fallingLeaf.gustPhase,
					77
				);
				const wander = (wanderN - 0.5) * 80;

				// Settling pull toward x=0 as the fall progresses.
				const fallProgress = p.constrain(vertical / 280, 0, 1);
				const settleEase = fallProgress * fallProgress; // ease-in toward stem
				const settleX = -fallingLeaf.originX * settleEase;
				const swoopDamp = 1 - fallProgress * 0.85;

				const x =
					fallingLeaf.originX +
					(swoop1 + swoop2 + wander) * swoopDamp +
					settleX;
				const y = fallingLeaf.originY + vertical;

				// Once below the canvas bottom (local y > 30) the leaf is
				// out of sight — clear it so the next can spawn.
				if (y > 30) {
					fallingLeaf = null;
					return;
				}

				// ROTATION — chaotic, multi-frequency. The leaf tumbles
				// rather than spinning monotonically.
				const rotOsc1 =
					Math.sin(elapsed * 2.4 + fallingLeaf.gustPhase) * 1.4;
				const rotOsc2 =
					Math.sin(elapsed * 4.1 + fallingLeaf.spiralPhase) * 0.6;
				const rotN = p.noise(elapsed * 0.8 + fallingLeaf.gustPhase, 13);
				const rotNoise = (rotN - 0.5) * 3;
				const rot =
					fallingLeaf.rotOffset +
					fallingLeaf.spinSpeed * elapsed +
					rotOsc1 +
					rotOsc2 +
					rotNoise;

				// Fake 3D tumble: yaw (around the leaf's local vertical
				// axis) and pitch (around its horizontal axis) modulate
				// the leaf's X and Y scale via cosine. At ±π/2 the scale
				// passes through 0 (leaf edge-on, invisible for a
				// frame); past that, scale flips sign — the leaf is
				// drawn mirrored, simulating its back face.
				const yaw =
					fallingLeaf.yawSpeed * elapsed +
					Math.sin(elapsed * 1.6 + fallingLeaf.yawPhase) * 0.6 +
					fallingLeaf.yawPhase;
				const pitch =
					fallingLeaf.pitchSpeed * elapsed +
					Math.sin(elapsed * 2.1 + fallingLeaf.pitchPhase) * 0.5 +
					fallingLeaf.pitchPhase;
				const xScale = Math.cos(yaw);
				const yScale = Math.cos(pitch);

				p.push();
				p.translate(x, y);
				p.rotate(rot);
				p.scale(xScale, yScale);
				drawLeaf(fallingLeaf.fullSize, 235, fallingLeaf.lightnessShift);
				p.pop();
			};

			// — Growth schedule constants —
			// First-emerging entropy branch (child of a rectilinear parent)
			// gets a path-stable start time in [ENTROPY_START_MIN,
			// ENTROPY_START_MIN + ENTROPY_START_SPAN]. Each cascade level
			// starts at PARENT_GATE × parent's duration — well before the
			// parent finishes — so a growing branch and its descendants
			// grow OVERLAPPINGLY rather than strictly one-after-another.
			//
			// GROWTH_DURATION = 0.15 so each individual branch grows
			// quickly; combined with overlap, the cascade fills out the
			// canopy without stalling.
			const ENTROPY_START_MIN = 0.25;
			const ENTROPY_START_SPAN = 0.18;
			const GROWTH_DURATION = 0.15;
			const PARENT_GATE = 0.1; // descendants start at parent's 10 % — heavy overlap

			// Per-frame extent trackers — set in measureExtent, read in p.draw().
			let frameMaxUp = 0;
			let frameMaxL = 0;
			let frameMaxR = 0;

			/**
			 * Estimate the tree's maximum extent in three directions
			 * (up, left, right) so we can scale to fit the canvas in both
			 * axes. Walks ALL children (not just mains) because extras
			 * live in lateral bands and contribute most of the horizontal
			 * spread. Replicates the full branch()'s angle logic.
			 */
			const measureExtent = (
				len: number,
				pathSeed: number,
				parentStartT: number,
				parentEndT: number,
				childIndex: number,
				depth: number,
				absAngle: number,
				currentX: number,
				currentY: number
			): void => {
				if (depth > MAX_DEPTH) return;

				// Growth state (same logic as branch()).
				const parentIsRectilinear = parentEndT < 0;
				let startT: number;
				let endT: number;
				let isRectilinear: boolean;
				if (parentIsRectilinear && childIndex < 2) {
					isRectilinear = true;
					startT = -1;
					endT = -1;
				} else if (parentIsRectilinear) {
					const baseStart =
						childIndex === 2 ? ENTROPY_START_MIN : ENTROPY_START_MIN + 0.1;
					const offset = p.noise(pathSeed * 0.137 + 200);
					startT = baseStart + offset * ENTROPY_START_SPAN;
					endT = startT + branchDurationFor(pathSeed);
					isRectilinear = false;
				} else {
					const parentGate =
						parentStartT + (parentEndT - parentStartT) * PARENT_GATE;
					const offset = p.noise(pathSeed * 0.241 + 17);
					startT = parentGate + offset * 0.16;
					endT = startT + branchDurationFor(pathSeed);
					isRectilinear = false;
				}
				const rawGrowth = isRectilinear
					? 1
					: p.constrain((filteredT - startT) / (endT - startT), 0, 1);
				const growth = isRectilinear ? 1 : smoothstep(rawGrowth);
				if (growth < GROWTH_INVISIBLE) return;

				// Length (same logic as branch()).
				const nLen = hashRand(pathSeed + 71);
				const sLen = p.constrain((nLen - 0.5) * 2.5 + 0.5, 0, 1);
				let lenLo = 0.25;
				let lenHi = 1.41;
				if (depth === 0) {
					lenLo = 1.0;
					lenHi = 1.3;
				} else if (depth === 1 || depth === 2) {
					lenLo = 0.2;
					lenHi = 1.3;
				} else {
					const tighten = Math.min(1, (depth - 2) * 0.2);
					lenLo = p.lerp(0.25, 0.7, tighten);
					lenHi = p.lerp(1.41, 1.0, tighten);
				}
				const naturalLenScale = lenLo + sLen * (lenHi - lenLo);
				const lenScale = p.lerp(1, naturalLenScale, filteredT);
				const renderedLen = len * lenScale * growth;
				if (renderedLen < RENDERED_LEN_MIN) return;

				// Tip in absolute coords (X: + right, − left; Y: − up).
				const tipX = currentX + renderedLen * Math.sin(absAngle);
				const tipY = currentY - renderedLen * Math.cos(absAngle);
				if (-tipY > frameMaxUp) frameMaxUp = -tipY;
				if (-tipX > frameMaxL) frameMaxL = -tipX;
				if (tipX > frameMaxR) frameMaxR = tipX;

				const dynamicShrink = p.lerp(SHRINK_AT_0, SHRINK_AT_1, filteredT);
				const nextLen = len * dynamicShrink;
				if (depth >= MAX_DEPTH || nextLen <= STOP_LEN) return;

				// Child-count + side info needed to compute MAIN bands.
				const nCount = p.noise(pathSeed * 0.421 + 7);
				// Branching density decreases with depth — shallow joints
				// near the trunk get 3-4 children at the original (dense)
				// rate, tip joints settle into mostly-binary forks.
				const depthT = depth / MAX_DEPTH;
				const fourThresh = p.lerp(0.73, 0.92, depthT);
				const threeThresh = p.lerp(0.4, 0.7, depthT);
				const childCount = nCount > fourThresh ? 4 : nCount > threeThresh ? 3 : 2;
				const sideNoise = p.noise(pathSeed * 0.711 + 41);
				const thirdGoesRight = sideNoise > 0.5;
				const hasRightExtra =
					(childCount === 3 && thirdGoesRight) || childCount === 4;
				const hasLeftExtra =
					(childCount === 3 && !thirdGoesRight) || childCount === 4;

				// Extra growths (for push ramp on main bands).
				const extraStartTFor = (i: number): number => {
					const cps = pathSeed * 7 + i + 1;
					if (isRectilinear) {
						const baseStart =
							i === 2 ? ENTROPY_START_MIN : ENTROPY_START_MIN + 0.1;
						const offset = p.noise(cps * 0.137 + 200);
						return baseStart + offset * ENTROPY_START_SPAN;
					}
					const thisGate = startT + (endT - startT) * PARENT_GATE;
					const offset = p.noise(cps * 0.241 + 17);
					return thisGate + offset * 0.16;
				};
				const extraGrowthForLocal = (i: number) => {
					const cps = pathSeed * 7 + i + 1;
					const raw = p.constrain(
						(filteredT - extraStartTFor(i)) / branchDurationFor(cps),
						0,
						1
					);
					return smoothstep(raw);
				};
				let rightExtraI = -1;
				let leftExtraI = -1;
				if (childCount === 3) {
					if (thirdGoesRight) rightExtraI = 2;
					else leftExtraI = 2;
				} else if (childCount === 4) {
					rightExtraI = 2;
					leftExtraI = 3;
				}
				const rightExtraGrowth =
					rightExtraI >= 0 ? extraGrowthForLocal(rightExtraI) : 0;
				const leftExtraGrowth =
					leftExtraI >= 0 ? extraGrowthForLocal(leftExtraI) : 0;

				// Spread half-angle.
				const nAngle = p.noise(pathSeed * 0.073);
				const sAngle = p.constrain((nAngle - 0.5) * 2.5 + 0.5, 0, 1);
				const spreadAtT1 = 0.42 + sAngle * 0.88;

				const bandFor = (i: number): [number, number] => {
					if (i === 0) {
						if (hasRightExtra) {
							return [
								p.lerp(0.3, 0.05, rightExtraGrowth),
								p.lerp(0.85, 0.4, rightExtraGrowth)
							];
						}
						return [0.3, 0.85];
					}
					if (i === 1) {
						if (hasLeftExtra) {
							return [
								p.lerp(-0.85, -0.4, leftExtraGrowth),
								p.lerp(-0.3, -0.05, leftExtraGrowth)
							];
						}
						return [-0.85, -0.3];
					}
					if (i === 2) {
						if (childCount === 3) {
							return thirdGoesRight ? [0.7, 1.2] : [-1.2, -0.7];
						}
						return [0.7, 1.2];
					}
					return [-1.2, -0.7];
				};

				const easedT = 1 - Math.pow(1 - filteredT, 4);

				for (let i = 0; i < childCount; i++) {
					const [lo, hi] = bandFor(i);
					const posNoise = p.noise(pathSeed * 0.617 + i * 31 + 7);
					const frac = lo + posNoise * (hi - lo);
					const naturalAngle = frac * spreadAtT1;

					let childAngle: number;
					if (i < 2) {
						const rectAngle = i === 0 ? Math.PI / 2 : -Math.PI / 2;
						childAngle = p.lerp(rectAngle, naturalAngle, easedT);
					} else {
						childAngle = naturalAngle;
					}

					const cps = pathSeed * 7 + i + 1;
					measureExtent(
						nextLen,
						cps,
						startT,
						endT,
						i,
						depth + 1,
						absAngle + childAngle,
						tipX,
						tipY
					);
				}
			};

			/**
			 * Recursive branch drawer with absolute per-branch growth window.
			 *
			 *  @param len           conceptual length at this depth
			 *  @param pathSeed      unique stable identifier
			 *  @param parentStartT  parent's growth window start (−1 means
			 *                       parent is rectilinear / always full)
			 *  @param parentEndT    parent's growth window end (−1 means
			 *                       parent is rectilinear / always full)
			 *  @param childIndex    this branch's index in its parent's
			 *                       child array (0..3)
			 *
			 * The tree exists in two regimes:
			 *
			 *  (a) RECTILINEAR — children 0 and 1 of a rectilinear parent
			 *      inherit the rectilinear state: fully present at t = 0,
			 *      angled at ±π/2 from parent. These form the binary spine
			 *      visible at t = 0.
			 *
			 *  (b) GROWING — child indices 2/3 of a rectilinear parent are
			 *      the first emerging branches (entropy start window). Once
			 *      a branch is growing, ALL its children are growing too,
			 *      each waiting for THIS branch to reach 80 % before they
			 *      start. The cascade naturally produces a wavefront.
			 */
			// Per-branch growth duration helper. Uniform hash so siblings
			// finish growing at genuinely distinct moments (perlin would
			// give nearly-identical values for adjacent pathSeeds).
			const branchDurationFor = (cps: number) => {
				const durNoise = hashRand(cps + 99);
				return GROWTH_DURATION * (0.6 + durNoise * 0.8);
			};

			const branch = (
				len: number,
				pathSeed: number,
				parentStartT: number,
				parentEndT: number,
				childIndex: number,
				depth: number,
				geomX: number,
				geomY: number,
				absAngle: number
			) => {
				if (depth > MAX_DEPTH) return;
				const parentIsRectilinear = parentEndT < 0;

				// — Wind translation —
				// Sample a 2D perlin noise field at this joint's world
				// position to get a position-coherent XY offset, scaled
				// by depth so the trunk's base (depth 0) and the trunk's
				// tip (depth 1's joint) stay fixed and the outer canopy
				// moves most. The offset is in world coords, converted to
				// local-space via inverse rotation before translating so
				// the wind always blows in the same canvas direction
				// regardless of branch orientation.
				if (depth >= 2) {
					const windScale = (depth - 1) / (MAX_DEPTH - 1);
					const windT = p.millis() * WIND_TIME_SPEED;
					const wnX = p.noise(
						geomX * WIND_SPATIAL_SCALE + 17,
						geomY * WIND_SPATIAL_SCALE + 17,
						windT
					);
					const wnY = p.noise(
						geomX * WIND_SPATIAL_SCALE + 311,
						geomY * WIND_SPATIAL_SCALE + 311,
						windT * 1.2
					);
					// Linear ramp with filteredT — no wind at the rectilinear
					// (t=0) state, full magnitude at t=1.
					const worldDx =
						(wnX - 0.5) * 2 * WIND_MAGNITUDE * windScale * filteredT;
					const worldDy =
						(wnY - 0.5) * 2 * WIND_MAGNITUDE * 0.35 * windScale * filteredT;
					const cosA = Math.cos(absAngle);
					const sinA = Math.sin(absAngle);
					const localDx = worldDx * cosA + worldDy * sinA;
					const localDy = -worldDx * sinA + worldDy * cosA;
					p.translate(localDx, localDy);
				}

				let startT: number;
				let endT: number;
				let isRectilinear: boolean;

				if (parentIsRectilinear && childIndex < 2) {
					// Rectilinear base child — exists at t=0, fully grown.
					isRectilinear = true;
					startT = -1;
					endT = -1;
				} else if (parentIsRectilinear) {
					// First emerging branch in this lineage. The 3rd child
					// (index 2) starts earlier than the 4th (index 3).
					isRectilinear = false;
					const baseStart =
						childIndex === 2
							? ENTROPY_START_MIN
							: ENTROPY_START_MIN + 0.1;
					const offset = p.noise(pathSeed * 0.137 + 200);
					startT = baseStart + offset * ENTROPY_START_SPAN;
					endT = startT + branchDurationFor(pathSeed);
				} else {
					// Descendant of a growing branch. Wait for parent to
					// reach 80 % of its own window before sprouting. Siblings
					// stagger by a wide per-child offset so the cascade
					// isn't synchronous: one sibling can finish its growth
					// before another even starts.
					isRectilinear = false;
					const parentGate =
						parentStartT + (parentEndT - parentStartT) * PARENT_GATE;
					const offset = p.noise(pathSeed * 0.241 + 17);
					startT = parentGate + offset * 0.16;
					endT = startT + branchDurationFor(pathSeed);
				}

				const rawGrowth = isRectilinear
					? 1
					: p.constrain((filteredT - startT) / (endT - startT), 0, 1);
				// Ease-in-ease-out so lengths, widths and the push ramp all
				// transition smoothly instead of starting/stopping abruptly.
				const growth = isRectilinear ? 1 : smoothstep(rawGrowth);

				if (growth < GROWTH_INVISIBLE) return;

				// Path-stable per-branch noise samples. No time component:
				// the tree's STRUCTURE is fixed; only the wind field (a
				// separate position-based perlin sample) moves the canopy.
				const nAngle = p.noise(pathSeed * 0.073); // spread half-angle
				const nLen = hashRand(pathSeed + 71); // length (uniform per-branch)
				const nCount = p.noise(pathSeed * 0.421 + 7); // # children

				// Stretch [0.3, 0.7] perlin to ~[0, 1] so the variance shows
				// at T_MAX. Without this stretch the angle/length swings
				// stay timid.
				const stretch = (n: number) =>
					p.constrain((n - 0.5) * 2.5 + 0.5, 0, 1);
				const sAngle = stretch(nAngle);
				const sLen = stretch(nLen);

				// Length scale at T_MAX. Variance is widest near the trunk
				// (depths 1–2) and gradually narrows toward the tips so
				// outer branches stay close to their conceptual length —
				// no random super-long branches near the canopy edges.
				//
				// Depth 0 (the trunk) never shrinks below its rectilinear
				// length.
				let lenLo = 0.25;
				let lenHi = 1.41;
				if (depth === 0) {
					lenLo = 1.0; // trunk never shrinks
					lenHi = 1.3;
				} else if (depth === 1 || depth === 2) {
					lenLo = 0.2;
					lenHi = 1.3; // widest variance near the trunk
				} else {
					// Depths 3+ : tighten both bounds toward [0.7, 1.0] as
					// depth increases. Variance shrinks gradually so tips
					// stay close to conceptual length.
					const tighten = Math.min(1, (depth - 2) * 0.2);
					lenLo = p.lerp(0.25, 0.7, tighten);
					lenHi = p.lerp(1.41, 1.0, tighten);
				}
				const naturalLenScale = lenLo + sLen * (lenHi - lenLo);
				const lenScale = p.lerp(1, naturalLenScale, filteredT);

				const fullLen = len * lenScale;
				const renderedLen = fullLen * growth;

				if (renderedLen < RENDERED_LEN_MIN) return;

				// Current shrink ratio — used only for the nextLen calculation
				// further down. Stem WIDTH uses a fixed depth-based taper
				// (next block) so the trapezoid thickness doesn't grow with
				// entropy when the conceptual length decays more slowly.
				const shrink = p.lerp(SHRINK_AT_0, SHRINK_AT_1, filteredT);

				// Depth-based stem width with growth-driven thickening.
				//
				// The trunk widens from its rectilinear thickness (1×) at
				// t=0 up to 4× thickness at t=1. The shrink ratio per
				// depth is recomputed each frame so the cascade still
				// terminates at the SAME outer tip width regardless of t.
				// So a fat trunk at t=1 tapers more aggressively to reach
				// the same final tip as the thin trunk at t=0.
				//
				// A new branch emerges as a TINY TWIG — uniform thickness
				// equal to the tree's thinnest tips. As it grows, BOTH
				// base and tip widen toward their full values.
				const widthFactor = 1 + filteredT * 3; // 1 at t=0, 4 at t=1
				const baseW0 = startingLen * 0.1;
				const tipW0 = baseW0 * Math.pow(SHRINK_AT_0, MAX_DEPTH + 1);
				const baseWt = baseW0 * widthFactor;
				const shrinkWt = Math.pow(tipW0 / baseWt, 1 / (MAX_DEPTH + 1));
				const widthAtDepth = (d: number) =>
					baseWt * Math.pow(shrinkWt, d) + 1;
				const twigW = widthAtDepth(MAX_DEPTH + 1);
				const fullBaseW = widthAtDepth(depth);
				const fullTipW = widthAtDepth(depth + 1);
				const baseW = twigW + (fullBaseW - twigW) * growth;
				const tipW = twigW + (fullTipW - twigW) * growth;

				p.fill(stemR, stemG, stemB, MAX_BRANCH_ALPHA);
				p.beginShape();
				p.vertex(-baseW / 2, 0);
				p.vertex(baseW / 2, 0);
				p.vertex(tipW / 2, -renderedLen);
				p.vertex(-tipW / 2, -renderedLen);
				p.endShape(p.CLOSE);
				p.circle(0, -renderedLen, tipW);

				p.translate(0, -renderedLen);

				// Terminal = this branch has no children. Every terminal
				// gets a leaf so no isolated tip is bare.
				const nextLen = len * shrink;
				const isTerminal = depth >= MAX_DEPTH || nextLen <= STOP_LEN;

				// Geometric tip in world coords (same formula used to
				// recurse). Leaves use it to sample the wind field for
				// their rustle.
				const leafGeomX = geomX + Math.sin(absAngle) * renderedLen;
				const leafGeomY = geomY - Math.cos(absAngle) * renderedLen;

				maybeDrawLeaf(
					pathSeed,
					len,
					growth,
					renderedLen,
					depth,
					isTerminal,
					leafGeomX,
					leafGeomY
				);

				if (isTerminal) return;

				// Child count: 2..4 with inverse-exponential decay.
				// Shifted denser than before so the end-state canopy fills
				// out instead of staying mostly-binary.
				//   nCount <= 0.40 → 2  (≈40 %)
				//   nCount <= 0.73 → 3  (≈33 %)
				//   else           → 4  (≈27 %)
				// Branching density decreases with depth — shallow joints
				// near the trunk get 3-4 children at the original (dense)
				// rate, tip joints settle into mostly-binary forks.
				const depthT = depth / MAX_DEPTH;
				const fourThresh = p.lerp(0.73, 0.92, depthT);
				const threeThresh = p.lerp(0.4, 0.7, depthT);
				const childCount = nCount > fourThresh ? 4 : nCount > threeThresh ? 3 : 2;

				// Spread half-angle at T_MAX: ≈ 24°–74° (much wider variance)
				const spreadAtT1 = 0.42 + sAngle * 0.88;

				// Per-child angle fractions are placed inside randomized
				// bands rather than at fixed evenly-spaced positions.
				//
				//   Main pair (i=0, i=1) — the two trunk-like branches —
				//     live in the "upward" bands [0.30..0.85] and
				//     [−0.85..−0.30]. Magnitudes < 1.0 so they lean upward
				//     rather than splaying horizontally.
				//
				//   Extras (i ≥ 2) — sprouts that emerge once the joint is
				//     in entropy mode — go to the LATERAL bands beyond the
				//     mains: [0.70..1.20] or [−1.20..−0.70]. They never sit
				//     in the central gap between the mains.
				//
				//   For childCount=3 the single extra picks its side via
				//   path-stable noise. For childCount=4 the two extras
				//   take opposite sides.
				//
				// PUSH MECHANIC tied to per-side extra GROWTH.
				//
				// Each side's main is pushed toward vertical in step with
				// the extra emerging on that side. The push ramp is the
				// extra's own growth (0 → 1 over its growth window) rather
				// than global t — so the main visibly tilts back AS the
				// side branch sprouts.
				//
				// Combined with the "extra emerges at rectAngle" rule
				// below, this gives a clean cross-free push: at extra
				// emergence both extra and main share the same starting
				// angle (the extra is 0-length, so invisible), then they
				// rotate inward together with main moving faster, extra
				// staying outside.
				const sideNoise = p.noise(pathSeed * 0.711 + 41);
				const thirdGoesRight = sideNoise > 0.5;
				const hasRightExtra =
					(childCount === 3 && thirdGoesRight) || childCount === 4;
				const hasLeftExtra =
					(childCount === 3 && !thirdGoesRight) || childCount === 4;

				// Compute each extra child's startT and growth — same
				// formula used inside the recursive call, just evaluated
				// at THIS branch's level so the push can react to it.
				// "isRectilinear" here refers to THIS branch (not its
				// parent), so the extras are gated by THIS branch's own
				// growth window when it's itself a cascade descendant.
				const extraStartTFor = (i: number): number => {
					const cps = pathSeed * 7 + i + 1;
					if (isRectilinear) {
						const baseStart =
							i === 2 ? ENTROPY_START_MIN : ENTROPY_START_MIN + 0.1;
						const offset = p.noise(cps * 0.137 + 200);
						return baseStart + offset * ENTROPY_START_SPAN;
					}
					const thisGate = startT + (endT - startT) * PARENT_GATE;
					const offset = p.noise(cps * 0.241 + 17);
					return thisGate + offset * 0.16;
				};
				const extraGrowthFor = (i: number): number => {
					const cps = pathSeed * 7 + i + 1;
					const cStartT = extraStartTFor(i);
					const raw = p.constrain(
						(filteredT - cStartT) / branchDurationFor(cps),
						0,
						1
					);
					return smoothstep(raw);
				};

				let rightExtraI = -1;
				let leftExtraI = -1;
				if (childCount === 3) {
					if (thirdGoesRight) rightExtraI = 2;
					else leftExtraI = 2;
				} else if (childCount === 4) {
					rightExtraI = 2;
					leftExtraI = 3;
				}
				const rightExtraGrowth =
					rightExtraI >= 0 ? extraGrowthFor(rightExtraI) : 0;
				const leftExtraGrowth =
					leftExtraI >= 0 ? extraGrowthFor(leftExtraI) : 0;

				const bandFor = (i: number, count: number): [number, number] => {
					if (i === 0) {
						// Main right. If a right-side extra exists, lerp the
						// natural band toward a tighter, more vertical one
						// as the extra's growth ramps up.
						if (hasRightExtra) {
							const ramp = rightExtraGrowth;
							const lo = p.lerp(0.3, 0.05, ramp);
							const hi = p.lerp(0.85, 0.4, ramp);
							return [lo, hi];
						}
						return [0.3, 0.85];
					}
					if (i === 1) {
						if (hasLeftExtra) {
							const ramp = leftExtraGrowth;
							const lo = p.lerp(-0.85, -0.4, ramp);
							const hi = p.lerp(-0.3, -0.05, ramp);
							return [lo, hi];
						}
						return [-0.85, -0.3];
					}
					if (i === 2) {
						if (count === 3) {
							return thirdGoesRight ? [0.7, 1.2] : [-1.2, -0.7];
						}
						return [0.7, 1.2]; // count===4: right lateral
					}
					return [-1.2, -0.7]; // i===3, count===4: left lateral
				};

				// Continuous main motion, ease-in shape.
				//
				// Mains lerp from rectilinear (±π/2) toward their natural
				// pushed angle. The lerp factor uses a quartic ease-in so
				// mains move FAST early — they pass through the extras'
				// lateral angle range (~63°) before the earliest extra can
				// emerge at t = ENTROPY_START_MIN = 0.25. By the time any
				// extra appears, the main is already well inside its
				// position, so the extra (which sits at a fixed lateral
				// angle from emergence) never appears to be crossed by
				// the main.
				//
				// Extras don't rotate — they emerge at their natural
				// lateral angle and grow in length only. Per-extra
				// individual startT and duration ensure they don't grow
				// in lockstep.
				const easedT = 1 - Math.pow(1 - filteredT, 4);

				// Reuse the leaf's geometric tip position for child wind
				// sampling — same formula, same value, just one alias.
				const geomTipX = leafGeomX;
				const geomTipY = leafGeomY;

				for (let i = 0; i < childCount; i++) {
					const [lo, hi] = bandFor(i, childCount);
					const posNoise = p.noise(pathSeed * 0.617 + i * 31 + 7);
					const frac = lo + posNoise * (hi - lo);
					const naturalAngle = frac * spreadAtT1;

					let angle: number;
					if (i < 2) {
						const rectAngle = i === 0 ? Math.PI / 2 : -Math.PI / 2;
						angle = p.lerp(rectAngle, naturalAngle, easedT);
					} else {
						// Extra: fixed at its natural lateral angle from
						// emergence — no rotation, just length growth.
						angle = naturalAngle;
					}

					p.push();
					p.rotate(angle);
					branch(
						nextLen,
						pathSeed * 7 + i + 1,
						startT,
						endT,
						i,
						depth + 1,
						geomTipX,
						geomTipY,
						absAngle + angle
					);
					p.pop();
				}
			};
		};

		p5Instance = new P5(sketch, container);
	});

	onDestroy(() => {
		if (p5Instance) {
			p5Instance.remove();
			p5Instance = null;
		}
		if (probe && probe.parentNode) {
			probe.parentNode.removeChild(probe);
			probe = null;
		}
	});
</script>

<div bind:this={container} class="w-full"></div>
