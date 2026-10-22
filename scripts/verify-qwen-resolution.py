"""Single frozen qualification pass through the actual authenticated companion API."""
import base64
import hashlib
import http.client
import io
import json
from pathlib import Path
import sys
import threading
import time
from PIL import Image, ImageOps
import psutil
ROOT=Path(__file__).resolve().parents[1]
sys.dont_write_bytecode=True
sys.path.insert(0,str(ROOT/'companion'))
from service import Runtime, Companion, Server, PRODUCTION_ORIGIN
OUT=ROOT/'docs/phase-03/evidence/qwen/resolution'
output=OUT/'qualification.json'
assert not output.exists(), 'Qualification already run; do not tune and relabel as independent.'
plan=json.loads((OUT/'heldout-plan.json').read_text(encoding='utf-8'))
contract=(ROOT/'companion/contract.json').read_bytes()
assert plan['configuration']['sha256']==hashlib.sha256(contract).hexdigest()
sources=json.loads((ROOT/'tests/fixtures/qwen-resolution/sources.json').read_text(encoding='utf-8'))['records']
transforms=json.loads((ROOT/'tests/fixtures/qwen-resolution/transformations.json').read_text(encoding='utf-8'))
if isinstance(transforms,dict): transforms=transforms.get('transforms',[])
runtime=Runtime()
app=Companion(runtime,observations_enabled=True)
server=Server(app,port=0)
threading.Thread(target=server.serve_forever,daemon=True).start()
record={'contractSha256':hashlib.sha256(contract).hexdigest(),'humanReview':'PENDING; automated judgments cannot certify grounding',
    'protocol':'Actual companion API, same private native runtime, exact production Origin and memory-only auth; controlled licensed fixtures bypass promotion only in test process.',
    'rows':[],'systemRAM':psutil.virtual_memory().total,'threads':4,'gpuLayers':0}
def save():output.write_text(json.dumps(record,indent=2),encoding='utf-8')
old_request=runtime._request
captured={}
def capture(path,payload=None,timeout=180):
    result=old_request(path,payload,timeout)
    if path=='/v1/chat/completions':captured['raw']=result
    return result
runtime._request=capture
stop=threading.Event();memory=[]
try:
    runtime.import_package(ROOT.parent/'ouahad-ai/models/qwen3-vl-2b-instruct')
    runtime.start();record['loadingSeconds']=runtime.loading_seconds
    process=psutil.Process(runtime.process.pid)
    def sample():
        while not stop.wait(.2):
            try: memory.append(process.memory_info()._asdict())
            except psutil.Error:return
    threading.Thread(target=sample,daemon=True).start()
    for item in [*sources,*transforms]:
        if runtime.state!='ready':runtime.start();process=psutil.Process(runtime.process.pid)
        raw=(ROOT/item['file']).read_bytes()
        assert hashlib.sha256(raw).hexdigest()==item['sha256']
        start=time.monotonic()
        with Image.open(io.BytesIO(raw)) as source:
            image=ImageOps.exif_transpose(source).convert('RGB');image.thumbnail((1536,1536))
            out=io.BytesIO();image.save(out,'PNG');image.close()
        png=out.getvalue()
        row={'id':item['id'],'sourceSha256':item['sha256'],'kind':'original' if item in sources else 'transform','preprocessSeconds':time.monotonic()-start,
            'transportBytes':len(png),'transportSha256':hashlib.sha256(png).hexdigest()}
        code=app.offer_pairing(PRODUCTION_ORIGIN);token=app.pair(PRODUCTION_ORIGIN,code)['token']
        before=process.cpu_times();start=time.monotonic()
        connection=http.client.HTTPConnection('127.0.0.1',server.server_port,timeout=190)
        body=json.dumps({'id':item['id'],'image':base64.b64encode(png).decode()})
        headers={'Content-Type':'application/json','Origin':PRODUCTION_ORIGIN,'Authorization':'Bearer '+token}
        connection.request('POST','/v1/analyze',body,headers)
        response=connection.getresponse();row['status']=response.status;row['response']=json.loads(response.read());connection.close()
        row['wallSeconds']=time.monotonic()-start
        if 'raw' in captured:row['raw']=captured.pop('raw')
        try:
            after=process.cpu_times();row['nativeCPUSeconds']=(after.user+after.system)-(before.user+before.system)
        except psutil.Error:row['nativeCPUSeconds']=None
        record['rows'].append(row);save()
        print(json.dumps({'id':row['id'],'status':row['status'],'seconds':round(row['wallSeconds'],2)}),flush=True)
finally:
    stop.set();start=time.monotonic();app.disconnect();runtime.stop();server.shutdown();server.server_close()
    record['unloadSeconds']=time.monotonic()-start
    record['nativeStopped']=runtime.process is None
    record['peakNativeRSS']=max((s['rss'] for s in memory),default=0)
    record['peakNativePrivate']=max((s.get('private',0) for s in memory),default=0)
    save()
