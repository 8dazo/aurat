# Image and motion polish

## Direction
Transparent pearl objects live directly on the page. Thin rails, registration crosses and dashed connectors provide a precise visual frame; motion is limited to decorative artwork and interaction feedback. Existing page structure and saved-data behavior are preserved.

## Reference details
Reviewed the same Linear, Browserbase and Raindrop references. Browserbase's downloaded CSS includes reveal transitions, button-arrow movement and explicit reduced-motion fallbacks. Its structural rails inform the section separators. Raindrop's compact list/detail hierarchy informs dashboard density. These are adaptations, not copied source or brand artwork.

## Asset edits
`hero-replay`, `evidence-stack`, `regression-fracture`, and `release-orbit` were edited with image generation to remove the black background, floor and reflections. Original sculpture arrangement, pearl material and cyan highlights are retained. All eleven shipped WebP images now contain true alpha transparency. Four new source PNGs preserve the original canvas dimensions; WebP encoding retains alpha.

## Motion behavior
- 8–11 second floating/rocking cycles on artwork; small mouse-only hero parallax.
- Once-per-element 650ms section reveals through IntersectionObserver, without hiding content before JavaScript.
- 180–250ms button, row, navigation and card feedback; 350ms dashboard and detail-panel entrances.
- Decorative moving highlight on the report preview border; dots and dashed lines carry no false live status.
- Pause control saves a device-local preference; system reduced-motion overrides all decorative animation. Animation pauses offscreen and when the document is hidden. Data tables never loop or pulse.
- No video or heavy animation library added. Existing reports, projects, APIs and database schema remain compatible.

## Dashboard
Readable labels and status badges, more distinct selected projects, consistent olive/pearl surfaces, sticky context bar, skeleton loading, dashed step connectors, and an evidence timeline. Empty states retain transparent artwork.

## Verification scope
TypeScript, existing route tests, production build, and built-Worker route/storage smoke checks. Managed browser control is unavailable in this environment, so visual desktop/mobile and actual pointer/keyboard interaction checks remain unverified.
