# Horizontal Scroll Lab

A static HTML/CSS/JS portfolio experiment inspired by horizontal editorial layouts.

## Stack
- Lenis for smooth wheel/touch scrolling
- GSAP + ScrollTrigger for the vertical-to-horizontal scroll mapping, parallax and reveals
- Three.js for the short paper-drop intro
- Font Awesome for icons
- Google Fonts: DM Sans + Libre Caslon Display

## Run
Open `index.html` directly, or preferably use a local server:

```bash
python -m http.server 8080
```

Then open `http://localhost:8080`.

## Main files
- `index.html`
- `css/style.css`
- `js/app.js`
- `assets/images/*`

## Customizing
1. Replace images in `assets/images/`.
2. Edit panel copy inside `index.html`.
3. Tweak colors and fixed dimensions in `:root` at the top of `css/style.css`.
4. Horizontal motion is controlled in `buildHorizontalScroll()` inside `js/app.js`.
5. The paper-like project reveal is the `rotationX + curtain scaleY` sequence.

## Notes
Libraries load from CDN, while project images are bundled locally.
