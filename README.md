# Cross Sector — V30

This version fixes the Home mobile behavior by removing the separate mobile scrolling architecture.

- Mobile now starts **exactly like desktop**: intro copy + hero image share the first viewport.
- The phone Home uses the same **Lenis vertical scroll -> GSAP horizontal movement** as desktop.
- Swipe up/down on touch drives the same horizontal story naturally through Lenis.
- Arabic uses the same mirrored GSAP logic as desktop.
- V29/V27 brand, RTL, blog, team, footer, and icon refinements are preserved.


V31 fixes the phone home so it scrolls horizontally again using the same opening composition as desktop, with mobile-native horizontal ownership and vertical/touch gesture bridging.
