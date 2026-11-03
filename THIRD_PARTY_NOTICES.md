# Third-party notices

The project license applies to original project code. Third-party libraries and bundled animation assets retain their own licenses.

## gifenc 1.0.3

- Author: Matt DesLauriers and contributors
- Source: https://github.com/mattdesl/gifenc
- Distribution: https://registry.npmjs.org/gifenc/-/gifenc-1.0.3.tgz
- License: MIT; see [vendor/gifenc.LICENSE.md](vendor/gifenc.LICENSE.md).
- Local copy: `vendor/gifenc.cjs`, embedded in the plugin UI without remote fetching.

## jSquash WebP 1.5.0 / Squoosh / libwebp

- Sources: https://github.com/jamsinclair/jSquash and https://github.com/webmproject/libwebp
- Distribution: https://registry.npmjs.org/@jsquash/webp/-/webp-1.5.0.tgz
- jSquash/Squoosh wrapper license: Apache-2.0; see [vendor/webp.LICENSE](vendor/webp.LICENSE).
- libwebp license: BSD-3-Clause; see [vendor/libwebp.LICENSE.md](vendor/libwebp.LICENSE.md).
- Adaptation: the WebP encoder's ES-module export and `import.meta.url` were replaced with a local JavaScript factory; encoder defaults and the original non-SIMD WASM binary are embedded offline. The encoder is initialized with local WASM bytes and no network fetch.
- Copies and SHA-256 hashes: [vendor/SOURCES.json](vendor/SOURCES.json).

## Bundled animation sheets

24 built-in animation presets use CC0 assets by para and Soluna Software from OpenGameArt. The selected license for assets with multiple license options is CC0-1.0. Sheets were converted to lossless WebP and representative frames were used as posters; dimensions and transparency were preserved.

Source pages, authors, original filenames and frame rates are documented in [assets/sequences/SOURCES.md](assets/sequences/SOURCES.md). Per-file provenance and checksums are in [assets/sequences/catalog.json](assets/sequences/catalog.json).

These resources are not proprietary assets extracted from SVGA Editor. This project is independent of Figma and other animation plugins and is not endorsed by them.
