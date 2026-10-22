"""Verify the reference without modifying it; evidence stays in Hidden Data."""
import base64
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import time
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
REFERENCE = ROOT.parent / 'ouahad-ai/models/qwen3-vl-2b-instruct'
sys.path.insert(0, str(REFERENCE / 'tools'))
from serve import command, environment
from verify_image import process_files


def main():
    output = ROOT / 'docs/phase-03/evidence/qwen'
    output.mkdir(parents=True, exist_ok=True)
    record = {'reference': str(REFERENCE), 'artifacts': {}}
    for name in ['weights/model-q4_k_m.gguf', 'vision/mmproj.gguf',
                 'runtime/windows-x64-cpu/llama-server.exe']:
        path = REFERENCE / name
        record['artifacts'][name] = {'bytes': path.stat().st_size,
            'sha256': hashlib.file_digest(path.open('rb'), 'sha256').hexdigest()}
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
    def request(path, body=None):
        req = urllib.request.Request('http://127.0.0.1:18081' + path,
            data=None if body is None else json.dumps(body).encode(),
            headers={'Content-Type': 'application/json'})
        return json.loads(opener.open(req, timeout=240).read())
    import socket
    with socket.socket() as probe:
        if probe.connect_ex(('127.0.0.1', 18081)) == 0:
            raise RuntimeError('Owned verification port unavailable')
    start = time.monotonic()
    with (output / 'reference-runtime.log').open('wb') as log:
        process = subprocess.Popen(command(18081), cwd=REFERENCE, env=environment(),
            stdout=log, stderr=log, creationflags=subprocess.CREATE_NO_WINDOW)
        try:
            while time.monotonic() - start < 180:
                if process.poll() is not None:
                    raise RuntimeError('Reference runtime exited')
                try:
                    if request('/health')['status'] == 'ok':
                        break
                except Exception:
                    time.sleep(0.5)
            else:
                raise TimeoutError('Reference startup timed out')
            record['loadingSeconds'] = time.monotonic() - start
            record['processFiles'] = process_files(process.pid)
            payload = {'stream': False, 'temperature': 0, 'top_k': 20, 'top_p': .95,
                'max_tokens': 128, 'messages': [
                    {'role': 'system', 'content': 'Describe only visible image evidence in English. Do not invent hidden details.'},
                    {'role': 'user', 'content': [
                        {'type': 'text', 'text': 'Describe the main visible animal, its color, and its position in one or two concise sentences.'},
                        {'type': 'image_url', 'image_url': {'url': 'data:image/jpeg;base64,' + base64.b64encode((REFERENCE / 'examples/cat.jpg').read_bytes()).decode()}}]}]}
            start = time.monotonic()
            response = request('/v1/chat/completions', payload)
            record['inferenceSeconds'] = time.monotonic() - start
            record['response'] = response
            record['genuineImageInput'] = True
            record['success'] = response['choices'][0]['finish_reason'] == 'stop' and 'cat' in response['choices'][0]['message']['content'].lower()
            print(json.dumps({k:v for k,v in record.items() if k != 'processFiles'}), flush=True)
        finally:
            process.terminate()
            process.wait(timeout=15)
            record['processStopped'] = process.poll() is not None
            (output / 'reference-smoke.json').write_text(json.dumps(record, indent=2), encoding='utf-8')


if __name__ == '__main__':
    main()
