---
name: CuraTrack Branding
description: CuraTrack visual identity — logo, colors, typography
type: design
---

**Logo:** `src/assets/curatrack-logo.png` — blue medical cross with white check inside and a green swoosh, wordmark "CuraTrack" with blue→green gradient.

**Colors (HSL, defined in src/index.css):**
- `--primary`: `217 89% 38%` (CuraTrack blue)
- `--brand-green`: `142 71% 45%`
- `--brand-blue`: `217 89% 38%`
- `--accent`: `142 50% 92%` (light green tint), accent-foreground deep blue
- Gradient hero: dark blue → blue → green (`.gradient-hero`)
- Gradient brand text utility: `.gradient-brand-text` (blue→green text fill)

**Typography:** Montserrat (headings, `.heading-display`), Open Sans (body). Both via Google Fonts.

**Usage rules:**
- Always use semantic tokens (`bg-primary`, `text-primary`, etc.) — never raw colors.
- Use `.gradient-hero` for marketing hero sections, `.gradient-primary` for CTAs/accents.
- Logo on dark backgrounds: apply `brightness-0 invert` to render white.
