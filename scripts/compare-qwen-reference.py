"""Controlled comparisons using actual reference code, without modifying it (-B)."""
import base64
import hashlib
import http.client
import io
import json
from pathlib import Path
import sys
import threading
import time
import urllib.request
from PIL import Image

sys.dont_write_bytecode = True
ROOT=Path(__file__).resolve().parents[1]
REF=ROOT.parent/'ouahad-ai'
sys.path.insert(0,str(REF/'vision_engine'))
sys.path.insert(0,str(ROOT/'companion'))
from engine.images import prepare_image
from engine.config import load_settings, load_prompt
from engine.providers import SAFETY_INSTRUCTIONS, validate_content
from engine.schemas import VisionContent
import service

OUT=ROOT/'docs/phase-03/evidence/qwen/resolution'
OUT.mkdir(parents=True,exist_ok=True)
settings=load_settings()
prompt=load_prompt()
schema=VisionContent.model_json_schema()
old=json.loads((ROOT/'companion/contract.json').read_text())
(OUT/'previous-contract.json').write_text(json.dumps(old,indent=2))
record={'design':{'A':'Exact current OUAHAD AI prompts/schema/options + reference prepare_image + installed Ollama',
    'B':'Unmodified Hidden Data Runtime.infer + old768/J85×2 preprocessing, through gateway',
    'C':'Exact reference prompts/schema/900 bound on native runtime, reference preprocessing through same gateway',
    'D':'Same as C except old768/J85×2 pixels, isolating preprocessing relative to C'},
    'referenceSources':{},'rows':[]}
for name in ['engine/providers.py','engine/images.py','engine/quality.py','engine/schemas.py','config/prompt.json','config/settings.json']:
    record['referenceSources'][name]=hashlib.sha256((REF/'vision_engine'/name).read_bytes()).hexdigest()
record['configs']={'old':old,'reference':{'system':SAFETY_INSTRUCTIONS,'instruction':prompt.analysis_instructions,'schema':schema,'settings':settings.model_dump(),'options':{'temperature':0,'num_predict':900}}}
def save(): (OUT/'comparisons.json').write_text(json.dumps(record,indent=2),encoding='utf-8')
def old_pixels(raw):
    with Image.open(io.BytesIO(raw)) as source:
        image=source.convert('RGB');image.thumbnail((768,768));out=io.BytesIO();image.save(out,'JPEG',quality=85)
    return service.decode_pixels(base64.b64encode(out.getvalue()).decode())
opener=urllib.request.build_opener(urllib.request.ProxyHandler({}))
def ollama(pixels):
    payload={'model':settings.model,'stream':False,'think':False,'format':schema,
        'messages':[{'role':'system','content':SAFETY_INSTRUCTIONS},{'role':'user','content':prompt.analysis_instructions,'images':[base64.b64encode(pixels).decode()]}],
        'options':{'temperature':0,'num_predict':settings.max_output_tokens}}
    req=urllib.request.Request('http://127.0.0.1:11434/api/chat',data=json.dumps(payload).encode(),headers={'Content-Type':'application/json'})
    with opener.open(req,timeout=180) as response:return json.load(response)
runtime=service.Runtime()
original_infer=runtime.infer
original_decoder=service.decode_pixels
app=service.Companion(runtime,observations_enabled=True)
server=service.Server(app,port=0)
threading.Thread(target=server.serve_forever,daemon=True).start()
record['nativeArgsBase']='Same Runtime.start, exact GGUF/projector; native embedded template differs from Ollama renderer.'
def gateway(pixels):
    origin=service.PRODUCTION_ORIGIN
    code=app.offer_pairing(origin)
    token=app.pair(origin,code)['token']
    connection=http.client.HTTPConnection('127.0.0.1',server.server_port,timeout=185)
    connection.request('POST','/v1/analyze',json.dumps({'id':'comparison','image':base64.b64encode(pixels).decode()}),
        {'Content-Type':'application/json','Origin':origin,'Authorization':'Bearer '+token})
    response=connection.getresponse();value=json.loads(response.read());connection.close()
    return {'status':response.status,'value':value}
def tuned(pixels,expected_epoch=None):
    payload={'temperature':0,'top_k':20,'top_p':.95,'max_tokens':900,'stream':False,
        'response_format':{'type':'json_object','schema':schema},
        'messages':[{'role':'system','content':SAFETY_INSTRUCTIONS},{'role':'user','content':[{'type':'text','text':prompt.analysis_instructions},{'type':'image_url','image_url':{'url':'data:image/jpeg;base64,'+base64.b64encode(pixels).decode()}}]}]}
    raw=runtime._request('/v1/chat/completions',payload)
    record['pendingRaw']=raw
    choice=raw['choices'][0]
    result={'finish':choice['finish_reason'],'rawText':choice['message']['content']}
    try: result['acceptedReference']=validate_content(result['rawText']).model_dump()
    except Exception as error: result['referenceValidationError']=str(getattr(error,'detail',type(error).__name__))
    return result
try:
    runtime.import_package(REF/'models/qwen3-vl-2b-instruct')
    runtime.start();record['nativeLoadingSeconds']=runtime.loading_seconds
    for ident,file in [('market',ROOT/'tests/fixtures/qwen/heldout-0.jpg'),('dog-bed',REF/'vision_engine/evaluation/data/images/03646bb2f288eaae.jpg')]:
        raw=file.read_bytes();prepared=prepare_image(raw,'image/jpeg',settings);oldpix=old_pixels(raw)
        for mode in ['A','B','C','D']:
            pixels=prepared if mode in ('A','C') else oldpix
            row={'image':ident,'sourceSha256':hashlib.sha256(raw).hexdigest(),'mode':mode,'inputSha256':hashlib.sha256(pixels).hexdigest(),'inputBytes':len(pixels)}
            with Image.open(io.BytesIO(pixels)) as image:row['inputDimensions']=image.size
            start=time.monotonic()
            if mode=='A':
                result=ollama(pixels);row['raw']=result
                try: row['acceptedReference']=validate_content(result['message']['content']).model_dump()
                except Exception as error:row['referenceValidationError']=str(getattr(error,'detail',type(error).__name__))
            else:
                runtime.infer=original_infer if mode=='B' else tuned
                service.decode_pixels=lambda encoded:base64.b64decode(encoded,validate=True)
                # Test-only bypass of the old768 decoder: exact pixels were already prepared/hashed above.
                row['transport']=gateway(pixels)
                if 'pendingRaw' in record:row['raw']=record.pop('pendingRaw')
            row['seconds']=time.monotonic()-start
            record['rows'].append(row);save()
            print(json.dumps({'image':ident,'mode':mode,'seconds':row['seconds'],'accepted':row.get('acceptedReference') or row.get('transport')}),flush=True)
finally:
    runtime.stop();app.disconnect();server.shutdown();server.server_close()
    service.decode_pixels=original_decoder
    record['nativeStopped']=runtime.process is None
    save()
