"""Build a portable Windows package from installed, local files only. No downloads."""
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import sys

ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', required=True)
    args = parser.parse_args()
    output = Path(args.output).resolve()
    if not output.is_relative_to(ROOT / 'companion-dist') or output.exists():
        raise SystemExit('Use a fresh directory inside companion-dist; nothing is overwritten.')
    if sys.platform != 'win32' or sys.version_info[:2] != (3, 12):
        raise SystemExit('The tested builder requires installed Windows x64 Python 3.12.')
    from PIL import __file__ as pillow_file
    base = Path(sys.base_prefix)
    output.mkdir(parents=True)
    app = output / 'app'
    shutil.copytree(ROOT / 'companion', app, ignore=shutil.ignore_patterns('__pycache__', 'tests'))
    python = output / 'python'
    python.mkdir()
    for pattern in ('python.exe', 'pythonw.exe', 'python3.dll', 'python312.dll', 'vcruntime*.dll', 'LICENSE.txt'):
        for source in base.glob(pattern):
            shutil.copy2(source, python / source.name)
    shutil.copytree(base / 'DLLs', python / 'DLLs', ignore=shutil.ignore_patterns('__pycache__'))
    shutil.copytree(base / 'Lib', python / 'Lib', ignore=shutil.ignore_patterns(
        'site-packages', '__pycache__', 'test', 'tests', 'idlelib', 'ensurepip', 'turtledemo'))
    shutil.copytree(base / 'tcl', python / 'tcl')
    packages = python / 'Lib/site-packages'
    packages.mkdir()
    pillow = Path(pillow_file).parent
    shutil.copytree(pillow, packages / 'PIL', ignore=shutil.ignore_patterns('__pycache__'))
    for source in pillow.parent.glob('pillow-*.dist-info'):
        shutil.copytree(source, packages / source.name)
    # Isolated import paths: no user site-packages, registry Python, PYTHONPATH or network installation.
    (python / 'python312._pth').write_text('DLLs\nLib\nLib/site-packages\n../app\n', encoding='utf-8')
    (output / 'Start Companion.vbs').write_text(
        'Set fso = CreateObject("Scripting.FileSystemObject")\r\n'
        'base = fso.GetParentFolderName(WScript.ScriptFullName)\r\n'
        'Set shell = CreateObject("WScript.Shell")\r\n'
        'shell.Run Chr(34) & base & "\\python\\pythonw.exe" & Chr(34) & " " & Chr(34) & base & "\\app\\app.py" & Chr(34), 0, False\r\n', encoding='utf-8')
    shutil.copy2(ROOT / 'companion/README.md', output / 'README.md')
    record = {'platform': 'Windows x64', 'python': sys.version, 'files': []}
    for path in sorted(output.rglob('*')):
        if path.is_file():
            with path.open('rb') as stream:
                record['files'].append({'path': path.relative_to(output).as_posix(),
                    'bytes': path.stat().st_size, 'sha256': hashlib.file_digest(stream, 'sha256').hexdigest()})
    record['totalBytes'] = sum(item['bytes'] for item in record['files'])
    (output / 'PACKAGE-SHA256.json').write_text(json.dumps(record, indent=2), encoding='utf-8')
    print(json.dumps({'output': str(output), 'bytes': record['totalBytes'], 'files': len(record['files'])}))


if __name__ == '__main__':
    main()
