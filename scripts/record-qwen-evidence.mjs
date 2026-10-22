import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const directory='docs/phase-03/evidence/qwen';
const json=async name=>JSON.parse(await readFile(`${directory}/${name}`,'utf8'));
const packaged=await json('package-verification.json');
assert.equal(packaged.success,true);assert.equal(packaged.modelWeightsIncluded,false);
const baseline=await json('browser-50.json'),ui=await json('companion-browser.json'),quality=await json('quality.json'),review=await json('quality-review.json'),https=await json('https-loopback.json'),ownership=await json('ownership.json'),release=await json('release-verification.json'),reference=await json('reference-smoke.json');
assert.equal(baseline.stats.expected,50);assert.equal(baseline.stats.unexpected,0);
assert.equal(ui.stats.expected,5);assert.equal(ui.stats.unexpected,0);
assert.equal(reference.success,true);assert.equal(reference.processStopped,true);
assert.equal(https.success,true);assert.equal(https.browserSecurityExceptions,false);assert.equal(https.pairingSecretPersisted,false);
assert.equal(ownership.success,true);assert.equal(quality.ownedProcessStopped,true);
assert.equal(release.modelAssetsFound,false);assert.equal(release.aiTokensFound,false);
assert.equal(quality.rows.length,10);assert.equal(review.decision,'BLOCKED');
const promotion=JSON.parse(await readFile('companion/promotion.json','utf8'));
assert.equal(promotion.approved,false);
const contractSha=createHash('sha256').update(await readFile('companion/contract.json')).digest('hex');
assert.equal(contractSha,quality.contractSha256);assert.equal(contractSha,promotion.contractSha256);
const unit=await readFile(`${directory}/unit-tests.log`,'utf8');assert.match(unit,/tests 87/);assert.match(unit,/fail 0/);
const security=await readFile(`${directory}/security-tests.log`,'utf8');assert.match(security,/Ran 20 tests/);assert.match(security,/OK/);
for(const file of ['typecheck.log','lint.log','build.log'])assert.ok((await readFile(`${directory}/${file}`,'utf8')).length>0);
const sources=JSON.parse(await readFile('tests/fixtures/qwen/sources.json','utf8'));
for(const row of sources.records)assert.equal(createHash('sha256').update(await readFile(row.file)).digest('hex'),row.sha256);
const first=quality.rows[0].wallSeconds,warm=quality.rows.slice(1).map(r=>r.wallSeconds).sort((a,b)=>a-b);
const result={phase:'03',status:'BLOCKED',scope:'Approved optional native local companion',reason:promotion.reason,productionObservationsEnabled:false,
  tests:{unit:87,security:20,existingProductionChrome:50,companionProductionChrome:5,allPassed:true},
  realImageInference:{reference:true,heldoutOriginals:6,transformations:4,structuredValid:10,groundingGate:'FAIL',independentHumanReview:false},
  transport:{origin:https.origin,browser:https.browser,httpsVerified:true,permission:'standard local-network-access granted in isolated test context',securityExceptions:false,productionSiteChanged:false,controlledEvaluationHarness:true},
  measurements:{loadingSeconds:quality.loadingSeconds,referenceLoadingSeconds:reference.loadingSeconds,coldSeconds:first,warmMinSeconds:warm[0],warmMedianSeconds:warm[Math.floor(warm.length/2)],warmMaxSeconds:warm.at(-1),preprocessMinSeconds:Math.min(...quality.rows.map(r=>r.preprocessSeconds)),preprocessMaxSeconds:Math.max(...quality.rows.map(r=>r.preprocessSeconds)),peakNativeRSSBytes:quality.peakRSS,peakNativePrivateBytes:quality.peakPrivate,physicalRAMBytes:quality.physicalRAM,logicalCPUs:quality.logicalCPUs,inferenceThreads:4,gpuLayers:0,maxOutputTokens:384,actualOutputTokens:quality.rows.map(r=>r.metrics.usage.completion_tokens),normalUnloadSeconds:quality.unloadSeconds,httpsCancellationMs:https.cancellation.wallMs,parentCrashChildTerminationSeconds:ownership.stopSeconds},
  release:{routes:release.routes,inspectedOutputFiles:release.inspectedOutputFiles,modelAssetsFound:false,companionSourceExcludedFromCliUpload:true},
  distribution:{platform:'Windows x64',archive:'companion-dist/HiddenData-AI-Companion-Windows-x64.zip',archiveBytes:packaged.archiveBytes,archiveSha256:packaged.archiveSha256,uncompressedBytes:packaged.uncompressedBytes,verifiedFiles:packaged.verifiedFiles,signed:false,published:false,modelWeightsIncluded:false},
  limitations:['Grounding gate failed: no production promotion.', 'No independent human quality review.', 'Windows x64 only; unsigned portable package, no public model distribution or installer publication.', 'Native window launch/initial layout/exit observed; complete final GUI import/start/stop interaction not verified because computer-use capture repeatedly returned the foreground browser rather than the companion. Packaged-runtime import/start/stop/cancel/crash cleanup verified independently.', 'Other browsers, physical mobile, GPU, lower-memory devices and cross-platform distribution untested.'],
  prohibitedActions:{commit:false,push:false,merge:false,deploy:false,phase04:false}};
await writeFile(`${directory}/verification-summary.json`,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({status:result.status,tests:result.tests,https:true,promotion:false}));
