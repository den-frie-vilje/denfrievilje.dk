---
title: TimeMap#3
date: April 2009
lead: Typing, sampling and tracking dance
tags:
  - Modern Dance
  - Projection Mapping
  - Infrared Tracking
  - Interactive
  - Set Design
  - OpenFrameworks
technologies:
  - OpenFrameworks
  - Infrared Tracking
  - Projection Mapping
  - MIDI
  - OSC
  - Cocoa
materials: Infrared camera, videoprojectors, custom software
partners: Jonas Jongejan, Tina Tarpgaard
client: Recoil Performance Group
github:
  user: RecoilPerformanceGroup
  repo: Livingroom
photocredits: Søren Meisner
appearances:
  - date: April 2009
    occasion: Premiere
    place: Dansehallerne, Copenhagen
    url: ''
videos:
  - id: '6209620'
    title: Trailer by Søren Meisner
  - id: '6174154'
    title: Full documentation of Act I by Tina Tarpgaard
  - id: '5082249'
    title: Full documentation of Act II by Tina Tarpgaard
  - id: '3548185'
    title: Behind the scenes by Ole Kristensen and Jonas Jongejan
---

Time Map is a dance performance that is sampled, manipulated and reconstructed, as if you where in a film set and part of a live editing process.
In this time displaced universe 3 people meet. Ottilia 1886, Rose 2008, Keem 2258 – each of them seeking to find justice.

The three dancers have worked from a base of true stories from past, present and future.
Being placed in past, present and future their stories are portrayed visually, physically and dramatically.

They meet in the court room in a battle with words – from taking orders to making them fly across the screens.

## Technical Approach

Ole Kristensen and Jonas Jongejan created the videoscenography using infrared motion tracking implemented in [openFrameworks](http://openframeworks.cc). All video and lights were cued from qLab using midi to Isadora through to a GrandMA node, our own custom OSC server, openGL renderer and scene and text editor. During the performance all text was typed live by the author Gritt Uldall on stage. The choreographer had control over some of the scenes from her own laptop. Some parts of the first act were filmed and edited on stage during second act for an epilogue shown in the lobby.

The source code is built on ofxCocoaPlugins, a custom Objective-C wrapper for [openFrameworks](http://openframeworks.cc) that integrates MIDI and OSC-addressable infrared tracking, projection mapping and Cocoa UI into a single Mac OS X application.
