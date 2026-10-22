"""Verify and archive the delivery package without installing/publishing it."""
import hashlib
import json
from pathlib import Path
import shutil
import subprocess

ROOT=Path(__file__).resolve().parents[1]
package=ROOT/'companion-dist/windows-x64-delivery'
manifest=json.loads((package/'PACKAGE-SHA256.json').read_text())
for item in manifest['files']:
    target=package/item['path']
    assert target.stat().st_size==item['bytes']
    with target.open('rb') as stream:
        assert hashlib.file_digest(stream,'sha256').hexdigest()==item['sha256']
    assert target.suffix.lower() not in ('.gguf','.onnx')
tested=ROOT/'companion-dist/windows-x64-final'
identical=[]
for name in ('app.py','service.py','contract.json','promotion.json','artifacts.json'):
    assert (tested/'app'/name).read_bytes()==(package/'app'/name).read_bytes()
    identical.append(name)
code="import json,sys,tkinter,PIL;sys.path.insert(0,sys.argv[1]);import service;print(json.dumps({'python':sys.version,'pillow':PIL.__version__,'tcl':tkinter.Tcl().eval('info patchlevel'),'observationsEnabled':service.APPROVED,'origin':service.PRODUCTION_ORIGIN,'isolated':sys.flags.isolated}))"
smoke=subprocess.run([str(package/'python/python.exe'),'-B','-c',code,str(package/'app')],
    check=True,capture_output=True,text=True,creationflags=subprocess.CREATE_NO_WINDOW)
probe=json.loads(smoke.stdout)
assert probe['observationsEnabled'] is False
assert probe['isolated']==1
archive=ROOT/'companion-dist/HiddenData-AI-Companion-Windows-x64.zip'
assert not archive.exists(), 'Archive already exists; do not overwrite verified output.'
shutil.make_archive(str(archive.with_suffix('')),'zip',package)
with archive.open('rb') as stream:
    digest=hashlib.file_digest(stream,'sha256').hexdigest()
result={'success':True,'verifiedFiles':len(manifest['files']),'uncompressedBytes':manifest['totalBytes'],
    'archiveBytes':archive.stat().st_size,'archiveSha256':digest,'modelWeightsIncluded':False,
    'identicalToTestedAppFiles':identical,'runtimeSmoke':probe,'signedInstaller':False,
    'nativeGUI':'Launch/initial layout/exit observed; final complete import/start/stop UI interaction unverified. Packaged runtime lifecycle tested separately.',
    'publication':False}
(ROOT/'docs/phase-03/evidence/qwen/package-verification.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
print(json.dumps(result))
