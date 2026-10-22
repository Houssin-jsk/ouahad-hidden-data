"""Verify or restore the frozen pure-Python reference dependencies, offline."""
import argparse
import hashlib
import json
from pathlib import Path
import shutil

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / 'docs/phase-03/evidence/qwen/resolution/reference-vendor.json'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    parser.add_argument('--source', type=Path, help='Existing reference site-packages or preserved vendor backup')
    args = parser.parse_args()
    if not args.check and args.source is None:
        parser.error('Use --check, or --source with an existing offline package directory.')
    destination = (ROOT / 'companion/vendor').resolve()
    source = args.source.resolve() if args.source is not None else destination
    records = json.loads(MANIFEST.read_text(encoding='utf-8'))['files']
    planned = []
    for record in records:
        original = (source / record['path']).resolve()
        target = (destination / record['path']).resolve()
        if not original.is_relative_to(source) or not target.is_relative_to(destination):
            raise SystemExit('Manifest path is outside the dependency directory.')
        data = original.read_bytes()
        if len(data) != record['bytes'] or hashlib.sha256(data).hexdigest() != record['sha256']:
            raise SystemExit('Dependency does not match the frozen reference inventory; nothing copied.')
        if target.exists() and target.read_bytes() != data:
            raise SystemExit('An existing dependency differs; nothing overwritten.')
        planned.append((original, target))
    if not args.check:
        for original, target in planned:
            if not target.exists():
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(original, target)
    print(json.dumps({'verifiedFiles': len(records), 'copiedMissingOnly': not args.check,
                      'networkRequests': 0, 'overwrittenFiles': 0}))


if __name__ == '__main__':
    main()
