#!/usr/bin/env python3
"""Rebuild downloadable examples; --check compares every archive with its sources."""
from pathlib import Path
import argparse
import zipfile

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / 'public/examples'
COORDINATES = PUBLIC / 'coordinates'
PACKAGES = {'coordinate_receivers.zip': (COORDINATES, ['.'])}
for name, directory in [('processing', 'Processing'), ('openframeworks', 'openFrameworks'), ('max', 'Max'), ('p5js', 'p5js'), ('touchdesigner', 'TouchDesigner')]:
    PACKAGES[name + '_coordinates.zip'] = (COORDINATES, ['README.md', directory, 'screenshots'])
PACKAGES['processing_trigger.zip'] = (ROOT / 'docs/examples', ['ProcessingTrigger'])
PACKAGES['openframeworks_value.zip'] = (ROOT / 'docs/examples', ['ContinuousOSC'])

def sources(base, entries):
    result = {}
    for entry in entries:
        path = base / entry
        for file in ([path] if path.is_file() else sorted(path.rglob('*'))):
            if file.is_file() and not any(part.startswith('.') or part == '__pycache__' for part in file.relative_to(base).parts):
                result[file.relative_to(base).as_posix()] = file.read_bytes()
    return result

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    for name, (base, entries) in PACKAGES.items():
        expected = sources(base, entries)
        if args.check:
            with zipfile.ZipFile(PUBLIC / name) as archive:
                actual = {file: archive.read(file) for file in archive.namelist() if not file.endswith('/')}
                if actual != expected:
                    raise SystemExit(name + ' differs from sources; run python3 scripts/package-examples.py')
        else:
            with zipfile.ZipFile(PUBLIC / name, 'w', zipfile.ZIP_DEFLATED) as archive:
                for file, data in sorted(expected.items()):
                    info = zipfile.ZipInfo(file, (2026, 11, 13, 0, 0, 0))
                    info.compress_type = zipfile.ZIP_DEFLATED
                    info.external_attr = 0o644 << 16
                    archive.writestr(info, data)
        print(name + (' verified' if args.check else ' rebuilt'))

if __name__ == '__main__':
    main()
