"""One pass of the frozen Qwen observations evaluation, with actual native metrics."""
import base64
import hashlib
import io
import json
from pathlib import Path
import platform
import sys
import threading
import time
from PIL import Image, ImageEnhance, ImageFilter, ImageOps
import psutil

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT/'companion'))
from service import Runtime, SafeError, decode_pixels


def main():
    sources = json.loads((ROOT/'tests/fixtures/qwen/sources.json').read_text())
    frozen = json.loads((ROOT/'tests/fixtures/qwen/evaluation.json').read_text())
    assert frozen['contractSha256'] == hashlib.sha256((ROOT/'companion/contract.json').read_bytes()).hexdigest()
    output = ROOT/'docs/phase-03/evidence/qwen/quality.json'
    if output.exists():
        raise SystemExit('Held-out outputs already exist. Refusing to rerun/tune.')
    runtime = Runtime()
    record = {'contractSha256':frozen['contractSha256'], 'platform':platform.platform(), 'logicalCPUs':psutil.cpu_count(),
        'physicalRAM':psutil.virtual_memory().total, 'cpuThreads':4, 'gpuLayers':0, 'rows':[]}
    def save():
        output.write_text(json.dumps(record,indent=2),encoding='utf-8')
    try:
        start = time.monotonic()
        runtime.import_package(ROOT.parent/'ouahad-ai/models/qwen3-vl-2b-instruct')
        record['integritySeconds'] = time.monotonic()-start
        runtime.start()
        record['loadingSeconds'] = runtime.loading_seconds
        record['runtimePID'] = runtime.process.pid
        process = psutil.Process(runtime.process.pid)
        stop = threading.Event()
        samples = []
        def sample():
            while not stop.wait(.1):
                try:
                    memory=process.memory_info()
                    samples.append({'rss':memory.rss,'private':getattr(memory,'private',None)})
                except psutil.Error:
                    break
        sampler = threading.Thread(target=sample, daemon=True)
        sampler.start()
        for source in sources['records']:
            transforms = ['original'] + (['dim','blur'] if source['id'] in frozen['transforms']['cases'] else [])
            for transform in transforms:
                raw=(ROOT/source['file']).read_bytes()
                assert hashlib.sha256(raw).hexdigest() == source['sha256']
                row = {'id':source['id'],'transform':transform}
                start = time.monotonic()
                with Image.open(io.BytesIO(raw)) as image:
                    image = ImageOps.exif_transpose(image).convert('RGB')
                    image.thumbnail((768,768))
                    if transform == 'dim':
                        image=ImageEnhance.Brightness(image).enhance(.6)
                    if transform == 'blur':
                        image=image.filter(ImageFilter.GaussianBlur(1.5))
                    out=io.BytesIO()
                    image.save(out,'JPEG',quality=85)
                    image.close()
                pixels=decode_pixels(base64.b64encode(out.getvalue()).decode())
                row['preprocessSeconds']=time.monotonic()-start
                row['pixelBytes']=len(pixels)
                before=process.cpu_times()
                start=time.monotonic()
                try:
                    row['result']=runtime.infer(pixels)
                    row['metrics']=runtime.last_metrics
                except SafeError as error:
                    row['failure']={'status':error.status,'message':error.message}
                row['wallSeconds']=time.monotonic()-start
                after=process.cpu_times()
                row['nativeCPUSeconds']=(after.user+after.system)-(before.user+before.system)
                record['rows'].append(row)
                save()
                print(json.dumps(row),flush=True)
        stop.set()
        sampler.join(2)
        record['peakRSS']=max(s['rss'] for s in samples)
        record['peakPrivate']=max(s['private'] or 0 for s in samples)
        record['sampleCount']=len(samples)
    finally:
        start=time.monotonic()
        runtime.stop()
        record['unloadSeconds']=time.monotonic()-start
        record['ownedProcessStopped']=not psutil.pid_exists(record.get('runtimePID',-1))
        save()


if __name__ == '__main__':
    main()
