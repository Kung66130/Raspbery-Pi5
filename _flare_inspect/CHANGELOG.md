# Flare Social - Changelog

## [2.1.0] - 2026-02-16

### Brand Identity
- **Rebranding**: Complete migration from "Spark" to "Flare".
- **Assets**: Updated logo files and references to `flare_logo.svg`.
- **Theme**: Refined color palette and glassmorphism styling.

### User Experience (UX)
- **Mobile-First**: Added safe-area support for modern devices (notch/island).
- **Interactions**: Implemented Pull-to-Refresh gesture in Feed.
- **Feedback**: Added haptic feedback for interactions (e.g., Like).
- **Loading**: Introduced skeleton loaders for smoother perceived performance.

### Features
- **Profile Stats**: Now displays dynamic Follower/Following counts instead of placeholders.
- **PWA**: Added full Progressive Web App support with `manifest.json`.

### Technical
- **Security**: Removed legacy admin bypass.
- **Styling**: Consolidated global styles and removed inline CSS-in-JS.
- **Backend**: Optimized `GET /api/users/profile` query to fetch social graph stats.
