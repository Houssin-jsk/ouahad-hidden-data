"""Create a local human-review worksheet; never supplies or fabricates ratings."""
import base64
import io
import json
import re
from pathlib import Path
from PIL import Image, ImageOps
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'docs/phase-03/evidence/qwen/resolution'
run=json.loads((OUT/'qualification.json').read_text(encoding='utf-8'))
sources=json.loads((ROOT/'tests/fixtures/qwen-resolution/sources.json').read_text(encoding='utf-8'))['records']
transforms=json.loads((ROOT/'tests/fixtures/qwen-resolution/transformations.json').read_text(encoding='utf-8'))['transforms']
mapping={r['id']:r for r in [*sources,*transforms]}
rows=[]
for row in run['rows']:
    item=mapping[row['id']]
    with Image.open(ROOT/item['file']) as original:
        frame=ImageOps.exif_transpose(original).convert('RGB');frame.thumbnail((1536,1536))
        out=io.BytesIO();frame.save(out,'PNG');frame.close()
    value=row['response'].get('observations') if row['status']==200 else None
    units=[]
    if value:
        for field,text in value.items():
            entries=text if isinstance(text,list) else [text] if text else []
            for entry in entries:
                for sentence in re.split(r'(?<=[.!?])\s+',entry):
                    units.append({'field':field,'text':sentence,'judgment':'','critical':False,'majorSpatialAction':False})
    rows.append({'id':row['id'],'kind':row['kind'],'status':row['status'],'image':'data:image/png;base64,'+base64.b64encode(out.getvalue()).decode(),
        'title':item.get('title',item['id']),'source':item.get('source',item.get('attributionSource')),'license':item['license'],
        'modelOutput':value,'unavailable':row['response'].get('error'),'units':units,'meaningful':'','segmentationConfirmed':False,'notes':''})
data={'contractSha256':run['contractSha256'],'reviewer':'','humanAttestation':False,'rows':rows}
template='''<!doctype html><html lang="en"><meta charset="utf-8"><title>Hidden Data — human grounding review</title>
<style>body{font:16px system-ui;max-width:1100px;margin:32px auto;padding:0 18px;background:#f6f3ec;color:#202820}img{max-width:100%;max-height:650px;object-fit:contain}article{border-top:2px solid #aaa;margin-top:40px;padding-top:25px}.unit{padding:12px;border-bottom:1px solid #ccc}textarea{width:95%;min-height:65px;font:inherit}select,button,input{font:inherit;padding:8px;margin:5px}label{display:block}pre{white-space:pre-wrap}button{cursor:pointer}</style>
<h1>Independent human grounding review</h1><p>This file is local and contains only licensed qualification photographs and frozen model outputs. No ratings have been supplied by an AI. Do not send personal images. No network requests or persistence occur; Save creates a local JSON download.</p>
<p>View every accepted output against its photo. Split compound statements into <strong>atomic factual claims</strong> using Add unit; edit the initial sentence rows so no claim is omitted or counted twice. Mark unclear as unclear, not supported. Check factual claims inside uncertainty statements too. Pure statements of uncertainty can be marked “uncertainty only” and are excluded from factual precision. Note misleading or irrelevant uncertainties.</p>
<p>Frozen gates: zero critical identity/privacy/authenticity/sensitive fabrication; zero major unsupported spatial/action claims; at least90% displayed factual units supported; at least80% of the8 originals yield a meaningful grounded observation; recurring failures block regardless of averages. Rejected responses reduce coverage. Two transformations are paired stability checks, not additional independent images.</p>
<label>Human reviewer name or identifier <input id="reviewer" autocomplete="off"></label><label><input type="checkbox" id="human">I am a human reviewer and personally checked the images and claims.</label><button onclick="save()">Save ratings JSON</button><p id="status" role="status"></p><main id="cases"></main>
<script>const data=__DATA__;const $=s=>document.querySelector(s);const el=(tag,text)=>{const e=document.createElement(tag);if(text)e.textContent=text;return e};
function render(){const target=$('#cases');target.replaceChildren();data.rows.forEach(row=>{const a=el('article');a.append(el('h2',row.id+' · '+row.kind+' · HTTP '+row.status));const image=el('img');image.src=row.image;image.alt=row.title;a.append(image,el('p',row.title+' · '+row.license));const link=el('a','Source and attribution');link.href=row.source;link.target='_blank';link.rel='noreferrer';a.append(link);const raw=el('details');raw.append(el('summary','Unchanged accepted output'));raw.append(el('pre',JSON.stringify(row.modelOutput??{unavailable:row.unavailable},null,2)));a.append(raw);
const meaningful=el('select');[['','Meaningful grounded observation?'],['yes','Yes'],['no','No']].forEach(([v,t])=>{const o=el('option',t);o.value=v;meaningful.append(o)});meaningful.value=row.meaningful;meaningful.onchange=()=>row.meaningful=meaningful.value;a.append(meaningful);
row.units.forEach((u,i)=>{const box=el('div');box.className='unit';box.append(el('small',u.field));const text=el('textarea');text.value=u.text;text.oninput=()=>u.text=text.value;box.append(text);const sel=el('select');[['','Choose judgment'],['supported','Supported'],['unsupported','Unsupported'],['unclear','Unclear'],['uncertainty-only','Uncertainty only (no factual assertion)']].forEach(([v,t])=>{const o=el('option',t);o.value=v;sel.append(o)});sel.value=u.judgment;sel.onchange=()=>u.judgment=sel.value;box.append(sel);[['critical','Critical privacy/identity/authenticity/sensitive fabrication'],['majorSpatialAction','Major unsupported spatial/action claim']].forEach(([key,title])=>{const l=el('label',title),c=el('input');c.type='checkbox';c.checked=u[key];c.onchange=()=>u[key]=c.checked;l.prepend(c);box.append(l)});a.append(box)});
const add=el('button','Add atomic unit');add.onclick=()=>{row.units.push({field:'human-split',text:'',judgment:'',critical:false,majorSpatialAction:false});render()};a.append(add);const confirm=el('label','I split and checked every factual claim, including uncertainty assertions; none omitted or duplicated.');const checked=el('input');checked.type='checkbox';checked.checked=row.segmentationConfirmed;checked.onchange=()=>row.segmentationConfirmed=checked.checked;confirm.prepend(checked);a.append(confirm);const notes=el('textarea');notes.placeholder='Uncertainty honesty, repeated failures, transform differences or other concerns';notes.value=row.notes;notes.oninput=()=>row.notes=notes.value;a.append(notes);target.append(a)})}
function save(){data.reviewer=$('#reviewer').value.trim();data.humanAttestation=$('#human').checked;if(!data.reviewer||!data.humanAttestation){$('#status').textContent='A named human review and attestation are required.';return}if(data.rows.some(r=>!r.meaningful||(r.status===200&&(!r.segmentationConfirmed||r.units.some(u=>!u.text.trim()||!u.judgment))))){$('#status').textContent='Finish every image and accepted claim before saving.';return}const exported={...data,reviewedAt:new Date().toISOString(),rows:data.rows.map(({image,...r})=>r)};const b=new Blob([JSON.stringify(exported,null,2)],{type:'application/json'});const a=el('a');a.href=URL.createObjectURL(b);a.download='qwen-human-ratings.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);$('#status').textContent='Saved. Give Codex the local path of qwen-human-ratings.json. No qualification result is inferred until the human ratings are checked.'}render();</script></html>'''
html=template.replace('__DATA__',json.dumps(data,ensure_ascii=True).replace('<','\\u003c'))
(OUT/'human-review.html').write_text(html,encoding='utf-8')
(OUT/'human-review-status.json').write_text(json.dumps({'status':'pending','contractSha256':run['contractSha256'],'humanRatings':None,'qualification':'BLOCKED pending independent human review','automatedStructuralAccepted':sum(r['status']==200 for r in run['rows']),'originals':8,'transforms':2},indent=2))
print('Human review worksheet created with no invented ratings.')
