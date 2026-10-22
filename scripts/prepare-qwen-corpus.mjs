import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const directory = 'tests/fixtures/qwen';
await mkdir(directory, { recursive: true });
const prior = new Set();
for (const file of ['tests/fixtures/phase03/sources.json', 'tests/fixtures/phase03-final/sources.json', 'tests/fixtures/phase03-places/sources.json']) {
  const content = await readFile(file, 'utf8');
  for (const title of content.matchAll(/"title":\s*"([^"]+)"/g)) prior.add(title[1]);
}
const queries = ['street market vegetables photograph', 'workshop tools workbench photograph', 'bird perched branch photograph', 'fog forest path photograph', 'kayak lake photograph', 'restaurant table meal photograph'];
let records = [];
try { records = JSON.parse(await readFile(`${directory}/sources.json`, 'utf8')).records; } catch {}
for (let i = records.length; i < queries.length; i++) {
  const api = new URL('https://commons.wikimedia.org/w/api.php');
  Object.entries({ action:'query', format:'json', generator:'search', gsrsearch:`${queries[i]} filetype:bitmap`, gsrnamespace:'6', gsrlimit:'15', prop:'imageinfo', iiprop:'url|extmetadata|size', iiurlwidth:'768' }).forEach(([k,v])=>api.searchParams.set(k,v));
  const response = await fetch(api, { headers: {'User-Agent':'HiddenData-local-evaluation/1.0 (licensed photograph verification)'} });
  if (!response.ok) throw Error(`Metadata HTTP ${response.status}`);
  const raw = await response.json();
  await writeFile(`${directory}/query-${i}.json`, JSON.stringify(raw,null,2));
  const selected = Object.values(raw.query?.pages ?? {}).sort((a,b)=>a.index-b.index).find(p=>{
    const info=p.imageinfo?.[0], license=info?.extmetadata?.LicenseShortName?.value ?? '';
    return info && /\.jpe?g$/i.test(p.title) && /^(CC0|CC BY|Public domain)/i.test(license) && !prior.has(p.title) && !records.some(r=>r.title===p.title);
  });
  if (!selected) throw Error(`No licensed distinct photograph for ${queries[i]}`);
  const info=selected.imageinfo[0], downloadUrl=info.thumburl ?? info.url;
  const image=await fetch(downloadUrl);
  if (!image.ok) throw Error(`Image HTTP ${image.status}`);
  const bytes=Buffer.from(await image.arrayBuffer()), file=`${directory}/heldout-${i}.jpg`;
  await writeFile(file,bytes);
  records.push({id:`heldout-${i}`, split:'heldout', query:queries[i], title:selected.title, source:info.descriptionurl, downloadUrl, license:info.extmetadata.LicenseShortName.value, licenseUrl:info.extmetadata.LicenseUrl?.value, authorHtml:info.extmetadata.Artist?.value, file, bytes:bytes.length, sha256:createHash('sha256').update(bytes).digest('hex')});
  await writeFile(`${directory}/sources.json`, JSON.stringify({selection:'Six fixed queries; first distinct licensed JPEG in search order. No model outputs inspected during selection. All held out from prompt development.',records},null,2));
  console.log(`${i+1}/6 ${selected.title}`);
}
