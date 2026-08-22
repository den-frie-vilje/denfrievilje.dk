---
title: TV 2 AGIS
date: 2023 — 2025
lead: An in-house system for packaging, rendering, and quality-controlling every trailer that goes to air on TV 2 Denmark.
tags:
  - Rendering
  - Airlook
  - Broadcast
  - Motion Graphics
  - Audio
  - Kubernetes
  - Featured
materials: SvelteKit, Svelte 4, TypeScript, Tailwind, Flowbite, MongoDB, Kubernetes, Helm, FluxCD, Ansible, Adobe After Effects, ExtendScript, nexrender, Web Audio API, scenedetect, EBU R128 loudness, Mac Studio render nodes, AWS EKS.
partners: TV 2 Marketing, Johan Bichel Lindegaard, Benjamin Malmgren-Hansen
client: TV 2 Danmark
photocredits: Copyright 2026 TV 2 Danmark.
videos:
  - id: '1189453742'
    title: AGIS walkthrough
  - id: '817280703'
    title: Reel — Copyright 2022 TV 2 Danmark
---

AGIS — _Automatisk Grafik Indpaknings System_ — is the in-house tool TV 2 Danmark's marketing department uses to package, render, and QC every trailer that goes to air. It replaced _Vertigo XG_, the end-of-life Miranda character generator that until 2023 had required manual data entry for every promo. We were brought in alongside TV 2's rollout of a Pixel Power-based playout system, and the brief was deliberately _not_ live graphics: marketing wanted prerendered graphics with a QC workflow on the final files, not branding composited at playout time.

Live graphics belongs to the layers that depend on real-time data — alerts, scoreboards, breaking-news lower-thirds. Trailers and promos are premade. Live-rendering them at playout adds load, risk, and complexity to the playout chain, and producers lose the frame-accurate timing of lower-thirds and graphical elements that the trailer form depends on. The right place for those graphics is one render earlier: in After Effects, on a render farm, with a QC step before the file ever touches playout.

## Architecture

We landed on a vendor-neutral Kubernetes microservices stack, with an on-prem render farm of Mac Studios running Adobe After Effects via [nexrender](https://github.com/inlife/nexrender). The motion designers' original After Effects projects were cleaned up and structured rather than re-implemented in a black-box graphics engine — preserving the creative freedom of the authoring tool all the way into production. Around it sits a SvelteKit application providing both the frontend and the API, MongoDB for document persistence, and a small mesh of stateless services: _scenedetect_ for shot-cut detection on source media, _loudness_ for EBU R128 measurements, _mediainfo_ for file metadata, and _storage_ for the SMB-mounted Isilon shares the marketing team works in. The microservices are open-sourced under the [airlookjs](https://github.com/airlookjs) organisation so they can be re-used outside the TV 2 stack.

TV 2's IT strategy was in flux when we started, so we picked an architecture that could move. We ran first on an on-prem Rancher cluster with a hand-provisioned render farm reachable over SMB; by the end of the project the Kubernetes stack had migrated to AWS EKS without a rewrite. The portability was the point of the design, and it got used.

I led the front-end and the deployment story — most of the Tailwind design system, the Helm charts, the FluxCD GitOps wiring, the Ansible-managed render server provisioning, and the on-prem-to-AWS migration. Johan founded the repo and owned the deeper After Effects and ExtendScript work; we co-authored the Svelte component model that turned AE template parameters into a structured form. Benjamin joined later and ran the form-driven flows — approvals, the media batch tools, the WO integration that pulls metadata from TV 2's _What's On_ scheduling system.

## A bespoke timeline editor

The single hardest UI problem in the system is the timeline. A trailer in AGIS isn't a flat sequence of clips — it's a recursively nested structure: a _Salg_ promoter block contains layers of _signs_ (an _Anslag_ opener, an _Endboard_ sign, a _Lukker_ closer) and _logobugs_ (a _Vandmærke_ watermark, with its own nested layer of text blocks). Each block type carries its own validation rules — minimum and maximum durations, fixed in-points where applicable — and siblings refuse to overlap. On a separate track sits the source footage with scene-cut markers from the scenedetect microservice, and the editor needs to snap to those markers within a configurable threshold during a drag.

Nothing off-the-shelf fit. Johan wrote a Svelte sequence editor from scratch — a recursive constraint solver behind a small UI — and we open-sourced it as [@airlookjs/svelte-sequence-editor](https://www.npmjs.com/package/@airlookjs/svelte-sequence-editor). I layered the AGIS look templates on top: source-media handling, the snap-to-scenedetect integration, scrubbing into the source player while dragging the trailer's timeline. The editor enforces the rules in flight — drag a block past its parent's bounds and it refuses; drag it onto a sibling and the parent intervenes; drag the IN-handle near a scene cut and it snaps. A producer can't construct an invalid graphics state by dragging.

## QC in the browser

When a delivery renders, an approver opens a modal with the rendered file. The modal stands in for the rack of dedicated broadcast scopes this kind of QC has traditionally required.

The video plays inside [vidstack](https://www.vidstack.io/), and the audio routes through Web Audio API: a stereo splitter feeds two analyser nodes for the canvas vectorscope, and the same source feeds [@airlookjs/web-audio-peak-meter](https://github.com/airlookjs/web-audio-peak-meter) — our fork of the upstream peak meter — calibrated to the _Nordic PPM_ scale with IEC Type I ballistics, the meter ballistics broadcast engineering at TV 2 expects. Beside it, a real-time loudness graph plots against the EBU R128 measurements the loudness microservice emitted at render time.

The PPM calibration was the hardest single piece of work in the project. Off-the-shelf web audio peak meters target podcast and music-production workflows; matching the dB range, integration time, peak hold, and gradient zones to what broadcast operators read off a Vu-720 took several iterations with the TV 2 broadcast engineering team. The vectorscope was written from scratch — a 2D canvas drawing mid/side as X/Y from the time-domain data, coloured by the dominant frequency from a parallel FFT, with a semi-transparent persistence trail.

The metering exists because TV 2 broadcast standards require compliant readings on every approval. The calibration work was driven by what the broadcast engineering team actually reads.

## Deployment

The deployment story is GitOps end-to-end. Helm charts in the monorepo describe every service; FluxCD reconciles a `flux` branch into each cluster; secrets-at-rest are SOPS-encrypted with age and committed alongside their kustomizations. The render farm provisions through Ansible from the same repo: macOS bootstrap, After Effects install, our [airlook-global-expression-lib](https://github.com/airlookjs) deployed into the AE Scripts folder so all the templates share a single source of truth for global expressions. Rolling a new render node is a single playbook run.

The same Helm/FluxCD setup handles a fully local development cluster — `minikube` with hostPath fixtures for sample media — so a fresh checkout can run the full stack offline. That pays back when iterating on render pipelines, where round-tripping through the production cluster would be untenable.

## What we'd do differently

The project went into production in 2023 and is in maintenance now. Three things have shifted in the industry since that we'd revisit if we were starting over.

Open standards arrived. **OGRAF** is on its way as a portable graphics interchange format, and **EBU DMF** is underway as a reference architecture for media-facility operations in IT environments. Either would let us interoperate with adjacent broadcast tooling rather than holding all the metadata internal to AGIS.

Cloud render is now credible. In 2023 the macOS-on-prem render farm was the only realistic answer; **Adobe Generative Render** and the latest **nexrender** cloud integrations have matured enough that a fresh AGIS could consider a cloud-only render path.

Broadcast security posture has moved. The 2022/23 thinking was _on-prem, offline, off-grid fallback ops from secured locations_; by 2026 broadcasters have largely moved to _in-cloud redundancy_ as the default. Our hybrid architecture survived that shift — the EKS migration covered it — but a green-field design today would lean further into cloud than we did.

## Scope

AGIS pulls together every layer we work in: a SvelteKit front-end with a recursive timeline editor and broadcast-calibrated audio QC; a Kubernetes microservices stack with GitOps deployment; an on-prem render farm of Macs running After Effects, provisioned with Ansible from the same repo; and a small open-source ecosystem extracted along the way. It runs in production at a national broadcaster, and survived a mid-project migration from on-prem Rancher to AWS EKS without a rewrite.
