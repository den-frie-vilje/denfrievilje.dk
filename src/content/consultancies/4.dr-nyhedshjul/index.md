---
title: DR Nyhedshjul
date: Sep 2021
lead: Centrepiece wrap-around circular display for DR's Newsroom.
tags:
  - Broadcast
  - Installation
  - Motion Graphics
  - News
materials: Node.js, SvelteKit, WebRTC, Server-Sent Events, Redis, Tailwind, Chrome, Kubernetes.
partners: DR Design, DR Medieteknologi, Johan Bichel Lindegaard
client: DR Nyheder
photocredits: Copyright 2021 DR
videos:
  - id: '1153135945'
    title: Copyright 2021 DR
---

When DR remodelled their newsroom they ordered a giant round structure covered in bendable high resolution led screen panels on the inside and outside. But there was not a commercially available system that could handle their design wishes.

The inside should show 11 realtime HD feeds of various news channels, the outside a news ticker with strict typographic demands and live updates. The news display and video streams should slide ever so slightly to create the illusion that the wheel was turning continuously.

The solution was a browser based SvelteKit application that solved all animations using CSS transitions to ensure a jitter-free smooth experience while minimising full content redraws as much as possible.

The frontend application continues to work, even if offline, degrading gracefully to calm fall-back css animations of the well-known DR News logo resembling an eye. When the backend responds again it recovers just as gracefully.

The news room is seen daily by millions of Danish viewers.
