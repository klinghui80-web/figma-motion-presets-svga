# Contributing

欢迎提交 bug、改进建议和 Pull Request。复现问题时请注明 Figma 桌面版、系统版本、效果预设、导出格式及参数；示例请使用可公开的素材。

## Local setup

Requirements: Node.js 22 or later, npm, Python 3.10 or later, and Figma Desktop for manual verification.

```sh
npm ci
npm run build
npm test
```

Import `manifest.json` in Figma Desktop's development plugins menu. The checked-in `ui.html` already contains the offline assets and can run without building.

## Source layout

- `code.js`: Figma host; selected-layer PNG export and naturally sorted frame loading.
- `ui.html`: editor markup/styles and the core Canvas renderers; generated sections are marked.
- `src/scene.js`: effect layers, per-layer settings and shared compositing.
- `src/sequence.js`: asset browser, imports and source-frame timing.
- `src/export.js`: additional export formats using the existing frozen scene renderer.
- `assets/sequences/`: CC0 sheets, posters, catalog and provenance.
- `vendor/`: offline third-party encoders and their licenses.

Edit source modules, then rebuild. Do not hand-edit generated sections in `ui.html`. If editing a core renderer directly in `ui.html`, keep source-frame timing, alpha compositing, output bounds and per-layer isolation intact.

## Validation

`npm test` runs particle, sequence, composition and encoding checks. The sweep reference fixture was captured from the previous flowing-highlight renderer before consolidation; update it only for an intentional, reviewed visual change.

Use fresh, redistributable demo assets for screenshots. Local screenshots, design files, backups and reports in `artifacts/` are intentionally excluded from Git.

Do not add network access, telemetry or remote asset fetching without clearly documenting the change in a proposal. Retain third-party license notices and provenance when changing dependencies or bundled assets.
