import { spawn } from 'node:child_process';
import readline from 'node:readline';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const origin='https://hidden-data.ouahad.space';
const packageRoot=path.resolve(process.argv[2]??'companion-dist/windows-x64-final');
const evidenceRoot=process.argv[3]??'docs/phase-03/evidence/qwen';
const python=path.join(packageRoot,'python/python.exe');
const harness=spawn(python,['-B','tests/companion-harness.py',path.join(packageRoot,'app'),'--evaluation'],{windowsHide:true,stdio:['pipe','pipe','pipe']});
const replies=[];
readline.createInterface({input:harness.stdout}).on('line',line=>replies.shift()?.(JSON.parse(line)));
let stderr=''; harness.stderr.on('data',b=>{stderr+=b.toString();});
const receive=()=>new Promise((resolve,reject)=>{
  const timeout=setTimeout(()=>reject(Error('Test IPC timed out')),190000);
  replies.push(value=>{clearTimeout(timeout); if(value.error)reject(Error(value.error));else resolve(value);});
});
const ready=await receive();
assert.equal(ready.ready,true);
const rpc=async value=>{const pending=receive();harness.stdin.write(JSON.stringify(value)+'\n');return pending;};
const record={origin,transport:'HTTPS production origin to IPv4 loopback HTTP',browserSecurityExceptions:false,permissionMethod:'Playwright grants the standard local-network-access permission, equivalent to user approval; no security-disabling flags or certificate bypass.',testOnlyEvaluationMode:true,productionObservationsEnabled:false};
let browser;
try {
  browser=await chromium.launch({channel:'chrome',headless:true});
  record.browser=browser.version();
  const context=await browser.newContext();
  const page=await context.newPage();
  const response=await page.goto(origin,{waitUntil:'domcontentloaded',timeout:60000});
  assert.equal(new URL(page.url()).origin,origin);
  assert.ok(response.ok());
  record.httpsStatus=response.status();
  record.certificate=await response.securityDetails();
  record.secureContext=await page.evaluate(()=>isSecureContext);
  assert.equal(record.secureContext,true);
  const connections=[];
  page.on('request',r=>{if(r.url().startsWith('http://127.0.0.1:18431'))connections.push({path:new URL(r.url()).pathname,method:r.method()});});
  // Ordinary browser permission, scoped to this test context and exact HTTPS origin.
  await context.grantPermissions(['local-network-access'],{origin});
  const started=await rpc({op:'start'});
  record.modelLoadingSeconds=started.loadingSeconds;
  record.nativeLoopbackPort=started.port;
  // Verify the private native server independently denies unauthenticated generation.
  const direct=await fetch(`http://127.0.0.1:${started.port}/v1/chat/completions`,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
  record.rawRuntimeUnauthorizedStatus=direct.status;
  assert.equal(direct.status,401);
  const offered=await rpc({op:'pair',origin});
  const pairing=await page.evaluate(async ({code})=>{
    const response=await fetch('http://127.0.0.1:18431/v1/pair',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code}),credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer'});
    return {status:response.status,value:await response.json()};
  },{code:offered.code});
  assert.equal(pairing.status,200);
  const token=pairing.value.token;
  record.pairingStatus=pairing.status;
  const status=await page.evaluate(async token=>{
    const r=await fetch('http://127.0.0.1:18431/v1/status',{headers:{Authorization:'Bearer '+token},credentials:'omit',cache:'no-store'});
    return {status:r.status,value:await r.json()};
  },token);
  assert.equal(status.value.state,'ready');
  record.authorizedStatus=status.status;
  const jpeg=(await readFile('../ouahad-ai/models/qwen3-vl-2b-instruct/examples/cat.jpg')).toString('base64');
  // Canvas creates bounded pixels in the actual HTTPS page; no original metadata transferred.
  const preview=await page.evaluate(async jpeg=>{
    const image=new Image(); image.src='data:image/jpeg;base64,'+jpeg;await image.decode();
    const canvas=document.createElement('canvas');
    const scale=Math.min(1,1536/Math.max(image.width,image.height));canvas.width=Math.round(image.width*scale);canvas.height=Math.round(image.height*scale);
    canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
    const result=canvas.toDataURL('image/png').split(',')[1];image.src='';canvas.width=canvas.height=0;return result;
  },jpeg);
  const imageResult=await page.evaluate(async ({token,image})=>{
    const start=performance.now();
    const r=await fetch('http://127.0.0.1:18431/v1/analyze',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({id:'https-real-image',image}),credentials:'omit',cache:'no-store'});
    return {status:r.status,value:await r.json(),wallMs:performance.now()-start};
  },{token,image:preview});
  record.realImage=imageResult;
  assert.equal(imageResult.status,200);
  assert.match(imageResult.value.observations.image_description??imageResult.value.observations.summary,/cat/i);
  // Start another real generation, then cancel through HTTPS. Cancellation must unload.
  await page.evaluate(({token,image})=>{
    globalThis.companionCancellationResult=fetch('http://127.0.0.1:18431/v1/analyze',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({id:'https-cancel',image}),credentials:'omit',cache:'no-store'}).then(async r=>({status:r.status,value:await r.json()}));
  },{token,image:preview});
  for(let i=0;i<100;i++){
    const status=await rpc({op:'status'});
    if(status.state==='busy')break;
    await new Promise(resolve=>setTimeout(resolve,50));
    if(i===99)throw Error('Generation never started');
  }
  const cancel=await page.evaluate(async token=>{
    const start=performance.now();
    const r=await fetch('http://127.0.0.1:18431/v1/cancel',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({id:'https-cancel'}),credentials:'omit'});
    return {status:r.status,value:await r.json(),wallMs:performance.now()-start};
  },token);
  record.cancellation=cancel;
  const after=await rpc({op:'status'});
  assert.equal(after.state,'stopped');assert.equal(after.pid,null);
  record.afterCancel=after;
  record.cancelledResponse=await page.evaluate(()=>globalThis.companionCancellationResult);
  assert.notEqual(record.cancelledResponse.status,200);
  record.storage=await page.evaluate(()=>({local:localStorage.length,session:sessionStorage.length}));
  // Existing live-site storage is not ours; inspect values for the actual generated token/code.
  const secretPersisted=await page.evaluate(({token,code})=>[localStorage,sessionStorage].some(storage=>Object.values(storage).some(v=>v.includes(token)||v.includes(code))),{token,code:offered.code});
  assert.equal(secretPersisted,false);
  record.pairingSecretPersisted=false;
  record.requests=connections;
  record.success=true;
  await context.close();
} catch(error) {
  record.success=false;record.error=error.message;process.exitCode=1;
} finally {
  await browser?.close();
  harness.stdin.write('{"op":"exit"}\n');harness.stdin.end();
  const exited=await Promise.race([new Promise(resolve=>harness.once('exit',code=>resolve(code))),new Promise(resolve=>setTimeout(()=>resolve(null),10000))]);
  if(exited===null)harness.kill();
  record.harnessExitCode=exited;
  if(stderr)record.harnessError='Test harness wrote diagnostics; inspect locally without publishing credentials.';
  await writeFile(path.join(evidenceRoot,'https-loopback.json'),JSON.stringify(record,null,2));
  console.log(JSON.stringify({success:record.success,error:record.error,pairingStatus:record.pairingStatus,realImageStatus:record.realImage?.status,cancelState:record.afterCancel?.state}));
}
