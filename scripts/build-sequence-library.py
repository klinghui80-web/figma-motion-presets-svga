"""Bundle posters and codecs; pin original sequence sheets to immutable URLs."""
import base64
import json
import re
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'assets' / 'sequences'
items = json.loads((ASSETS / 'catalog.json').read_text())
asset_base = json.loads((ASSETS / 'hosting.json').read_text())['baseUrl']
if not re.fullmatch(r'https://raw\.githubusercontent\.com/klinghui80-web/figma-motion-presets-svga/[0-9a-f]{40}/assets/sequences/', asset_base):
    raise SystemExit('Sequence sheets must use an immutable public GitHub commit URL')
for item in items:
    item['data'] = asset_base + quote(item['file'])
    item['poster'] = 'data:image/webp;base64,' + base64.b64encode((ASSETS / item['posterFile']).read_bytes()).decode()
block = '<!-- SEQUENCE_ASSETS_START -->\n<script type="application/json" id="sequence-library-data">' + json.dumps(items, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/') + '</script>\n<!-- SEQUENCE_ASSETS_END -->\n'
ui_path = ROOT / 'ui.html'
original_ui = ui_path.read_text()
ui = original_ui
notice_files = ['LICENSE', 'THIRD_PARTY_NOTICES.md', 'vendor/gifenc.LICENSE.md', 'vendor/webp.LICENSE', 'vendor/libwebp.LICENSE.md', 'assets/sequences/SOURCES.md']
notices = {name: (ROOT / name).read_text() for name in notice_files}
notice_block = '<!-- LICENSE_NOTICES_START -->\n<script type="application/json" id="license-notices">' + json.dumps(notices, ensure_ascii=False).replace('</', '<\\/') + '</script>\n<!-- LICENSE_NOTICES_END -->\n'
ui = re.sub(r'\n?<!-- LICENSE_NOTICES_START -->.*?<!-- LICENSE_NOTICES_END -->\n?', '', ui, flags=re.S)
ui = ui.replace('<meta charset="utf-8">', '<meta charset="utf-8">\n' + notice_block, 1)
ui = re.sub(r'<!-- SEQUENCE_ASSETS_START -->.*?<!-- SEQUENCE_ASSETS_END -->\n?', '', ui, flags=re.S)
ui = ui.replace('<script>\n(function(){', block + '<script>\n(function(){', 1)
engine = '// Sequence library: generated from src/sequence.js\n' + (ROOT / 'src' / 'sequence.js').read_text() + '\n' + (ROOT / 'src' / 'scene.js').read_text() + '\n// End sequence library\n'
if '// Sequence library: generated' in ui:
    ui = re.sub(r'// Sequence library: generated.*?// End sequence library\n', lambda _: engine, ui, count=1, flags=re.S)
else:
    ui = ui.replace('// Particle simulation', engine + '// Particle simulation', 1)
# All export codecs remain embedded locally; only preset sheets load on demand.
wasm = base64.b64encode((ROOT / 'vendor/webp-encoder.wasm').read_bytes()).decode()
codec_data = '<!-- EXPORT_CODECS_START -->\n<script type="application/octet-stream" id="export-webp-wasm">' + wasm + '</script>\n<!-- EXPORT_CODECS_END -->\n'
ui = re.sub(r'<!-- EXPORT_CODECS_START -->.*?<!-- EXPORT_CODECS_END -->\n?', '', ui, flags=re.S)
ui = ui.replace('<!-- SEQUENCE_ASSETS_START -->', codec_data + '<!-- SEQUENCE_ASSETS_START -->', 1)
gif = (ROOT / 'vendor/gifenc.cjs').read_text().split('//# sourceMappingURL=')[0]
exports = ('// Export formats: generated from src/export.js and vendor/\n'
           + 'const motionGif=(()=>{const exports={};\n' + gif + '\nreturn exports;})();\n'
           + (ROOT / 'vendor/webp-encoder.js').read_text() + '\n'
           + (ROOT / 'vendor/webp-options.js').read_text() + '\n'
           + (ROOT / 'src/export.js').read_text() + '\n// End export formats\n')
if '// Export formats: generated' in ui:
    ui = re.sub(r'// Export formats: generated.*?// End export formats\n', lambda _: exports, ui, count=1, flags=re.S)
else:
    ui = ui.replace('function decodeImage(bytes)', exports + 'function decodeImage(bytes)', 1)
total = len(ui.encode()) + (ROOT / 'code.js').stat().st_size
if total >= 15_000_000:
    raise SystemExit(f'Plugin code exceeds the 15 MB Community limit: {total:,} bytes')
if ui != original_ui:
    ui_path.write_text(ui)
print(f'Bundled {len(items)} posters and pinned sequence URLs; code {total:,} bytes / 15,000,000')
