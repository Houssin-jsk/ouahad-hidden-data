"""Verify packaged-runtime process ownership, including abrupt parent termination."""
import json
from pathlib import Path
import subprocess
import time
import sys
import psutil

ROOT = Path(__file__).resolve().parents[1]
package = ROOT/(sys.argv[1] if len(sys.argv)>1 else 'companion-dist/windows-x64-final')
evidence = ROOT/(sys.argv[2] if len(sys.argv)>2 else 'docs/phase-03/evidence/qwen')
process = subprocess.Popen([str(package/'python/python.exe'), '-B', str(ROOT/'tests/companion-harness.py'), str(package/'app')],
    stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True,
    creationflags=subprocess.CREATE_NO_WINDOW)
record = {'portablePython': True, 'test': 'abrupt parent exit must terminate owned model via Windows job object'}
try:
    assert json.loads(process.stdout.readline())['ready']
    process.stdin.write('{"op":"start"}\n')
    process.stdin.flush()
    started=json.loads(process.stdout.readline())
    assert started.get('state') == 'ready', started
    record['loadingSeconds']=started['loadingSeconds']
    child=psutil.Process(started['pid'])
    record['childPID']=child.pid
    record['childExecutable']=Path(child.exe()).name
    record['listenerAddresses']=[c.laddr.ip for c in child.net_connections(kind='inet') if c.status==psutil.CONN_LISTEN]
    assert record['listenerAddresses'] == ['127.0.0.1']
    start=time.monotonic()
    process.kill()
    process.wait(timeout=5)
    child.wait(timeout=10)
    record['childStoppedAfterParentKill']=True
    record['stopSeconds']=time.monotonic()-start
    record['success']=True
finally:
    if process.poll() is None:
        process.kill()
        process.wait(timeout=5)
    (evidence/'ownership.json').write_text(json.dumps(record,indent=2),encoding='utf-8')
print(json.dumps(record))
