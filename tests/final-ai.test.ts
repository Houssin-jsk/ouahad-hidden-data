import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import tiny from './fixtures/phase03-final/benchmark.json';
import places from './fixtures/phase03-places/benchmark.json';
test('Places365 labels retain official index ordering and every annotation is in taxonomy',async()=>{
 const screen=JSON.parse(await readFile('docs/phase-03/evidence/final/places-screen.json','utf8'));
 const rows=screen.find((r:{url:string})=>r.url.endsWith('categories_places365.txt')).text.trim().split('\n');
 assert.equal(rows.length,365);
 rows.forEach((line:string,i:number)=>{const [name,index]=line.trim().split(/\s+/);assert.equal(Number(index),i);assert.equal(places.labels[i],name.slice(3));});
 for(const c of places.cases)for(const label of c.acceptedIds)assert(places.labels.includes(label));
});
test('final evaluation images match recorded hashes and held-out sets are disjoint',async()=>{
 const hashes=new Set<string>();
 for(const benchmark of [tiny,places])for(const c of benchmark.cases){
  assert.match(c.license,/^(CC0|CC BY|Public domain)/);
  assert.equal(createHash('sha256').update(await readFile(c.file)).digest('hex'),c.sha256);
  if(c.split==='test'){assert(!hashes.has(c.sha256));hashes.add(c.sha256);}
 }
 assert.equal(hashes.size,24);
});
test('pinned TinyCLIP and locally exported Places365 graphs retain verified hashes',async()=>{
 const a=JSON.parse(await readFile('docs/phase-03/evidence/final/tiny-assets.json','utf8'));
 for(const r of a.records){const bytes=await readFile(`research/assets/experiments/ai/tiny/${r.name}`);assert.equal(bytes.length,r.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),r.sha256);}
 const b=JSON.parse(await readFile('docs/phase-03/evidence/final/places-conversion.json','utf8'));
 assert.equal(createHash('sha256').update(await readFile('research/assets/experiments/ai/places/model.onnx')).digest('hex'),b.sha256);
 assert.equal(b.referenceLogits.length,365);assert(b.referenceLogits.every(Number.isFinite));
});
