const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert'),crypto=require('crypto');
const root=path.join(__dirname,'..');
const catalog=JSON.parse(fs.readFileSync(path.join(root,'assets/sequences/catalog.json'),'utf8'));
const engine=fs.readFileSync(path.join(root,'src/sequence.js'),'utf8');
const context={Math,Map,JSON,clamp:(x,a,b)=>Math.max(a,Math.min(b,x)),$:()=>({textContent:JSON.stringify(catalog)})};
vm.createContext(context);vm.runInContext(engine+'\nthis.timing=sequenceTiming;this.frame=sequenceFrameAt;this.order=naturalFrameOrder;',context);
const options={frameCount:64,fps:30,speed:1,mode:'loop',delay:0,gap:0};
assert.strictEqual(context.timing(options).duration,64/30);
assert.strictEqual(context.timing({...options,speed:2}).duration,64/60);
assert.strictEqual(context.timing({...options,speed:.5}).duration,128/30);
for(const speed of [.25,.5,1,2,3]){
 const o={...options,speed},q=context.timing(o);
 for(let i=0;i<64;i++)assert.strictEqual(context.frame((i+.1)/q.rate,o).index,i);
 assert.strictEqual(context.frame(q.duration-1e-6,o).index,63);
}
const short={...options,frameCount:5,fps:10};
assert.deepStrictEqual(Array.from({length:5},(_,i)=>context.frame((i+.1)/10,{...short,mode:'reverse'}).index),[4,3,2,1,0]);
const ping={...short,mode:'pingpong'};
assert.strictEqual(context.timing(ping).duration,.8);
assert.deepStrictEqual(Array.from({length:8},(_,i)=>context.frame((i+.1)/10,ping).index),[0,1,2,3,4,3,2,1]);
assert.strictEqual(context.frame(20,{...short,mode:'once'}).index,4);
assert.strictEqual(context.timing({...short,mode:'once',gap:2}).duration,.5);
const spaced={...short,delay:.3,gap:.7};
assert.strictEqual(context.frame(.299,spaced).visible,false);
assert.strictEqual(context.frame(.3,spaced).index,0);
assert.strictEqual(context.frame(.799,spaced).visible,true);
assert.strictEqual(context.frame(.8,spaced).visible,false);
assert.strictEqual(context.timing(spaced).duration,1.5);
assert.strictEqual(context.frame(0,{...options,frameCount:0}).visible,false);
assert.strictEqual(context.timing({...options,frameCount:1,mode:'pingpong'}).steps,1);
assert.deepStrictEqual(Array.from(context.order([{name:'frame_10.png'},{name:'frame_1.png'},{name:'frame_2.png'}]),x=>x.name),['frame_1.png','frame_2.png','frame_10.png']);
console.log('PASS: source FPS; 0.25–3× speed; reverse; ping-pong without duplicate endpoints; once; delay; loop gap; empty/single frames; natural ordering.');
const ui=fs.readFileSync(path.join(root,'ui.html'),'utf8');
new vm.Script(ui.match(/<script>\s*([\s\S]*?)<\/script>/)[1]);
assert(ui.includes(engine),'embedded sequence engine must match its source');
const embedded=JSON.parse(ui.match(/id="sequence-library-data">([\s\S]*?)<\/script>/)[1]);
assert.strictEqual(catalog.length,24);assert.strictEqual(embedded.length,catalog.length);
const ids=new Set();
for(const c of catalog){
 assert(!ids.has(c.id));ids.add(c.id);assert(c.frameCount>1&&c.frameCount<=c.columns*c.rows);
 assert(c.posterFrame>=0&&c.posterFrame<c.frameCount);assert(c.fps>0);assert.strictEqual(c.license,'CC0-1.0');
 const file=fs.readFileSync(path.join(root,'assets/sequences',c.file));
 assert.strictEqual(crypto.createHash('sha256').update(file).digest('hex'),c.sha256);
 assert.strictEqual(file.toString('ascii',0,4),'RIFF');assert.strictEqual(file.toString('ascii',8,12),'WEBP');
 const e=embedded.find(x=>x.id===c.id);assert(Buffer.from(e.data.split(',')[1],'base64').equals(file));
 assert(Buffer.from(e.poster.split(',')[1],'base64').equals(fs.readFileSync(path.join(root,'assets/sequences',c.posterFile))));
}
console.log('PASS: 24 offline assets; valid grids and poster indices; provenance; hashes; embedded sheets/posters; UI syntax.');
// Exercise the real draw dispatch: standalone sequence needs no Figma image, and
// changing opacity/placement must not alter which source frame is sampled.
const calls=[],paint=new Proxy({}, {get:(_,key)=>(...args)=>calls.push([key,...args]),set:(obj,key,value)=>{obj[key]=value;calls.push([key,value]);return true}});
context.target={getContext:()=>paint};context.preset='sequence-loop';context.img=null;context.selected=false;context.selectionCount=0;context.w=0;context.h=0;
vm.runInContext(`sequenceClip={kind:'sheet',image:{id:'sheet'},columns:8,frameCount:64,frameWidth:128,frameHeight:128};sequencePrefs.fps=30;sequencePrefs.opacity=45;sequencePrefs.x=25;drawSequenceEffect(target,.5,2)`,context);
assert.strictEqual(context.target.width,256);assert.strictEqual(context.target.height,256);
const draw=calls.find(x=>x[0]==='drawImage');assert.strictEqual(draw[2],7*128);assert.strictEqual(draw[3],128);assert.strictEqual(draw[6],-64);
assert(calls.some(x=>x[0]==='globalAlpha'&&x[1]===.45));
calls.length=0;context.img={id:'base'};context.selected=true;context.selectionCount=1;context.w=300;context.h=200;
vm.runInContext(`sequencePrefs.composition='overlay';drawSequenceEffect(target,.5,1)`,context);
assert.strictEqual(context.target.width,300);assert.strictEqual(context.target.height,200);
assert.strictEqual(calls.filter(x=>x[0]==='drawImage').length,2);
// A preview at 20 FPS and an export at 30 FPS sample the identical timeline.
for(const fps of [12,15,20,30])for(let i=0;i<Math.ceil(64/30*fps);i++)assert.strictEqual(context.frame(i/fps,options).index,Math.min(63,Math.floor(i/fps*30+1e-8)));
console.log('PASS: standalone draw; 2× output dimensions; source-sheet crop; alpha and placement; selected-layer overlay; export FPS does not change playback duration.');

// Export captures the source and parameters even if the live UI changes.
vm.runInContext(`this.frozen=sequenceScene();sequencePrefs.opacity=10;sequencePrefs.size=20;sequenceClip={...sequenceClip,image:{id:'new-sheet'}};`,context);
calls.length=0;vm.runInContext(`drawSequenceEffect(target,.5,1,frozen)`,context);
assert(calls.some(x=>x[0]==='globalAlpha'&&x[1]===.45));
assert.strictEqual(calls.filter(x=>x[0]==='drawImage')[1][1].id,'sheet');
console.log('PASS: sequence export retains its captured scene during UI edits.');

// Figma selection order is not a frame order: the host must sort names and
// retain the request id so a late response cannot replace a newer asset.
(async()=>{
 const messages=[],make=name=>({name,width:32,height:24,exportAsync:async()=>new Uint8Array([1,2])});
 const figma={currentPage:{selection:[make('frame_10'),make('frame_2')]},ui:{postMessage:m=>messages.push(m)},showUI:()=>{},on:()=>{}};
 const host={figma,__html__:'',Uint8Array};vm.createContext(host);vm.runInContext(fs.readFileSync(path.join(root,'code.js'),'utf8'),host);
 await figma.ui.onmessage({type:'loadSequence',scale:1,requestId:7});
 const reply=messages.find(m=>m.type==='sequenceData');assert.strictEqual(reply.requestId,7);
 assert.deepStrictEqual(Array.from(reply.frames,x=>x.name),['frame_2','frame_10']);
 assert(messages.filter(x=>x.type==='progress').every(x=>x.requestId===7));
 figma.currentPage.selection=Array.from({length:241},(_,i)=>make('frame_'+i));
 await figma.ui.onmessage({type:'loadSequence',requestId:8});
 assert(messages.some(x=>x.type==='sequenceError'&&x.requestId===8&&x.message.includes('240')));
 console.log('PASS: Figma host natural ordering; request identity; progress identity; frame limit.');
})().catch(e=>{console.error(e);process.exitCode=1});
