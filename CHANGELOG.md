# Changelog

## 1.0.1 — 2026-11-03

- Register the Figma-assigned plugin ID for Community submission.
- Submitted to Figma Community for review on 2026-11-03; approval is pending.
- Prepare the Community listing, icon, cover and data security disclosures.
- Load the same 24 original sequence sheets on demand from an immutable public GitHub commit to meet Figma's 15 MB code limit. Verify SHA-256, reuse loaded images in session memory and keep posters/export encoders bundled. Motion and export continue to run locally; preset sheet loading needs network access.
- Motion rendering and export behavior are unchanged.

## 1.0.0 — 2026-11-03

First open-source release candidate.

- Motion presets with live preview and independent parameters.
- Single-effect selection or stack mode; per-layer visibility and removal.
- Consolidated sweep effect using the flowing-highlight renderer.
- Preset-specific particle shapes, sizes and opacity lifecycles.
- 24 offline CC0 animation sheets, PNG sequence import and Figma frame import.
- Default SVGA 2.0 export plus lossless animated WebP, GIF, raster-frame Lottie JSON and transparent WebM.
- Offline processing with no external network access.
