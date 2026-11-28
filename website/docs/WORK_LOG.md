
## 2026-11-24 — Services hero: films, sticky hero, film controls (Claude)
- Couture image swapped to the couple in the green-and-gold gown.
- Hero now plays the Our Story films full screen (`src/storyVideos.js` holds each film's focal point for wide screens; phones show the film whole).
- Services now behaves like Home: header floats transparent over the hero and turns petrol after it; the hero is sticky and a rounded cream sheet (`.svc-after-hero`) rolls over it; the film pauses once covered.
- Film controls: progress bars (jump to any film), previous / pause / next buttons, and an "01 / 06" counter on wide screens.
- Still to do before going live: compress the six films (~56 MB); `public/images/services/hero-rope.webp` is now unused.
