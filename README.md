# Cross Sector — Thorsten V7

This build keeps the V6 About/Team work and changes only the Home scrolling architecture.

## Home
- Lenis owns the vertical wheel/trackpad input.
- GSAP + ScrollTrigger map that smooth vertical progress to the horizontal rail.
- EN: scroll down reveals projects toward the right.
- AR: the rail is mirrored and scroll down reveals projects toward the left.
- The first desktop view is exactly one screen: intro copy + hero image, with no third card peeking in.
- Hash links such as `#research` and `#articles` scroll to the matching horizontal panel.

## Language
Arabic text stays RTL, and Home also mirrors the project rail itself. Switching languages preserves the logical horizontal position.

## Run
Open with a local server (for example VS Code Live Server), because Lenis, GSAP, Three.js, Font Awesome and Google Fonts are loaded from CDNs.
