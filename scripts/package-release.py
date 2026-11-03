"""Create a clean development-plugin ZIP; no local screenshots or history."""
import hashlib
import json
import zipfile
from pathlib import Path

root = Path(__file__).resolve().parents[1]
version = json.loads((root / 'package.json').read_text())['version']
files = ['manifest.json', 'code.js', 'ui.html', 'LICENSE', 'THIRD_PARTY_NOTICES.md', 'PRIVACY.md']
files += [str(p.relative_to(root)) for p in sorted((root / 'vendor').iterdir()) if 'LICENSE' in p.name]
files += ['assets/sequences/SOURCES.md', 'assets/sequences/catalog.json']
for file in files:
    if not (root / file).is_file():
        raise SystemExit(f'Missing release file: {file}')
out = root / 'dist'
out.mkdir(exist_ok=True)
archive = out / f'figma-motion-presets-svga-v{version}.zip'
with zipfile.ZipFile(archive, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    for name in files:
        info = zipfile.ZipInfo(name, date_time=(2026, 1, 1, 0, 0, 0))
        info.compress_type = zipfile.ZIP_DEFLATED
        info.external_attr = 0o100644 << 16
        z.writestr(info, (root / name).read_bytes())
checksum = hashlib.sha256(archive.read_bytes()).hexdigest()
(archive.with_suffix('.zip.sha256')).write_text(f'{checksum}  {archive.name}\n')
print(archive)
print(f'SHA-256 {checksum}')
