const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.join(__dirname,'..'),ui=fs.readFileSync(path.join(root,'ui.html'),'utf8');
const catalog=JSON.parse(ui.match(/id="sequence-library-data">([\s\S]*?)<\/script>/)[1]);
let requests=0,decodes=0,revoked=0,mode='ok',lastOptions;
const responseBytes=()=>fs.readFileSync(path.join(root,'assets/sequences',catalog[0].file));
const context={Math,Map,JSON,Uint8Array,AbortController,setTimeout,clearTimeout,Blob,crypto:crypto.webcrypto,
 clamp:(x,a,b)=>Math.max(a,Math.min(b,x)),$:()=>({textContent:JSON.stringify(catalog)}),
 fetch:async(url,options)=>{requests++;lastOptions=options;assert.equal(url,catalog[0].data);if(mode==='network')throw Error('offline');return {ok:mode!=='http',status:503,arrayBuffer:async()=>{const b=mode==='corrupt'?Buffer.from('bad'):responseBytes();return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)}}},
 URL:{createObjectURL:()=> 'blob:local-sheet',revokeObjectURL:()=>{revoked++}},
 Image:class{set src(value){assert.equal(value,'blob:local-sheet');decodes++;queueMicrotask(()=>mode==='decode'?this.onerror():this.onload())}}
};
vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(root,'src/sequence.js'),'utf8')+'\nthis.load=loadSequenceSheet;this.clear=()=>sequenceCache.clear();',context);
(async()=>{
 const first=context.load(catalog[0]),second=context.load(catalog[0]);assert.equal(first,second);await first;
 assert.equal(requests,1);assert.equal(decodes,1);assert.equal(revoked,1);
 assert.equal(lastOptions.credentials,'omit');assert.equal(lastOptions.referrerPolicy,'no-referrer');assert.equal(lastOptions.body,undefined);
 await context.load(catalog[0]);assert.equal(requests,1,'loaded sheets reuse session memory');
 for(const failure of ['network','http','corrupt','decode']){
  context.clear();mode=failure;await assert.rejects(context.load(catalog[0]),/素材/);
  mode='ok';await context.load(catalog[0]);
 }
 context.clear();await assert.rejects(context.load({...catalog[0],data:'https://example.com/asset.webp'}),/地址/);
 console.log('PASS: original sheet SHA-256; deduplicated download and cache; retry after network/HTTP/hash/decode failure; no credentials, referrer or artwork transmitted.');
})().catch(e=>{console.error(e);process.exitCode=1});
