---
title: Longing - Fast Forward
date: September 2015
lead: Full year timelapse from Kullorsuaq, Greenland
tags:
  - Timelapse
  - Cinder
  - Photography
  - Featured
  - Installation
technologies:
  - Cinder
  - Allied Vision Camera
  - Mac mini
  - Python
  - Lightroom
  - VPN
materials: Industrial camera, bespoke software, raid system
partners: Annesofie Norn, Daniel Plewe
github:
  user: olekristensen
  repo: LongingFastForward
photocredits: Ole Kristensen
embeds:
  - url: https://longing.gl/player/?embed
    title: The full-year timelapse, live from longing.gl — drag the ring to travel through the year

videos:
  - id: '122337270'
    title: Short edit from the 11 hour timelapse
---

Longing - Fast Forward is a long-term art project with the people living on the edge of the Greenland inland-ice.

## Background and Motivation

In 2012, Annesofie and I spent a month traveling up Greenland’s west coast, meeting local communities and listening to their experiences of climate change and shifting animal migrations. We noticed that media narratives about Greenland often separated people from the landscape and animals. Our aim was to merge these perspectives and create a collaborative work with local partners.

Arriving in Kullorsuaq, we found a community of hunters and catchers, deeply connected to the land and sea, but also with a vibrant cultural life—music, theatre, and more. Friendships formed quickly, especially with Svend, who later became our camera host and a key collaborator. These relationships became the foundation for the project.

## Technical Approach

The timelapse station was built around an Allied Vision industrial camera (1920×1080), connected to a Mac mini and RAID storage, running custom capture software written in C++ using libcinder. The system was designed for autonomous operation in Arctic conditions, hosted in Svend’s home for power and network access. Remote management was handled via a serverless VPN and SSH, with daily email alerts and thumbnail images sent to monitor system health and camera alignment. USB hard drives were mailed to Svend for periodic backup of the raw data.

Technologies referenced: [libcinder](https://libcinder.org/), Allied Vision Camera, Mac mini, C++, Python, VPN, SSH, Lightroom

The capture application (lffCinderCapture) managed hardware integration, frame acquisition, and error handling. Camera parameters (gain, exposure, bracketing) were set programmatically, and the app monitored dropped frames, packet loss, and disk space. The camera streamed raw Bayer frames at fixed intervals, with each frame processed as a floating-point temporal average over 30 seconds (using a custom BracketBuffer class). This averaging reduced noise, created natural motion blur, and protected privacy by blurring moving subjects.

Autoexposure was implemented in software, prioritizing detail in snowy landscapes and smooth transitions for sped-up playback. Exposure and gain were dynamically adjusted based on histogram analysis and brightness metrics. The app used shaders for debayering and display, and provided a live status interface (clock, date, camera state) for the host family.

Raw frames (12MB gzipped Bayer) were saved with metadata (timestamp, exposure, difference metrics) and converted to DNG for grading in Adobe Lightroom. Color calibration used a reference test pattern, and Lightroom was scripted to process one day at a time from a watchfolder. The workflow included automated restarts to handle batch processing. The final timelapse was assembled as a ten-hour loopable video.

The software stack included C++/libcinder for acquisition and averaging, and Python for automation.

## Community Involvement

We kept the process open and inclusive. To explain the camera and its privacy features, we held a “kaffemik” in the school gym, projecting the live averaged camera view so everyone could see how it worked. Kids and adults played with the camera, learning that only by standing still would they appear in the frame.

## The Installation Experience

The final installation compresses a year into ten hours, set to a generative soundscape. Patterns emerge that are hard to see in real time: the movement of icebergs, the break-up of sea ice, and the subtle rhythms of the settlement. People often linger in the exhibition, and sometimes return with friends to witness key moments together.

## Soundscape Collaboration

Daniel Plewe’s soundscape complements the visuals. He began by recording natural sounds, but the quiet of Kullorsuaq led him to focus on people instead. Using a super-slowing algorithm in Max/MSP, he stretched a recording of the local church choir singing Greenlandic hymns to the full duration of the piece, with moments of real-time playback. The result is a sonic landscape that deepens the sense of time and place.
