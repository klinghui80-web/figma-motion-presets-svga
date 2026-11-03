const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
let canvasPackage;try{canvasPackage=require('@napi-rs/canvas')}catch{canvasPackage=require(process.env.MOTION_CANVAS_MODULE||path.join(require('os').homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas'))}
const {createCanvas}=canvasPackage,ui=fs.readFileSync(path.join(__dirname,'../ui.html'),'utf8');
// Use the actual static control defaults rather than mirroring renderer defaults.
const controls={},html=ui.slice(0,ui.indexOf('<!-- SEQUENCE_ASSETS_START -->'));
for(const tag of html.matchAll(/<input\b[^>]*>/g)){const id=tag[0].match(/\bid="([^"]+)"/);if(!id)continue;controls[id[1]]={id:id[1],value:tag[0].match(/\bvalue="([^"]*)"/)?.[1]||'',checked:/\bchecked\b/.test(tag[0]),type:tag[0].match(/\btype="([^"]+)"/)?.[1]||'text'}}
for(const tag of html.matchAll(/<select\b[^>]*id="([^"]+)"[^>]*>([\s\S]*?)<\/select>/g)){const option=tag[2].match(/<option\b([^>]*)>([^<]*)/);controls[tag[1]]={id:tag[1],value:option[1].match(/value="([^"]*)"/)?.[1]||option[2],type:'select-one'}}
controls.preview=createCanvas(1,1);controls['sequence-library-data']={textContent:'[]'};
for(const id of ['export','play','status','time'])controls[id]={textContent:'',disabled:false};
const document={getElementById:id=>controls[id]||null,querySelectorAll:q=>q.startsWith('#parameterPanel')?Object.values(controls).filter(x=>x.id):[],createElement:type=>{assert.strictEqual(type,'canvas');return createCanvas(1,1)}};
const context={document,window:{},Math,Map,Set,JSON,console,Uint8Array,TextEncoder,DataView,Blob,Response,CompressionStream,requestAnimationFrame:()=>1,cancelAnimationFrame:()=>{}};vm.createContext(context);
let code=ui.match(/<script>\s*([\s\S]*?)<\/script>/)[1];
const handler=code.slice(code.indexOf('window.onmessage=e=>'),code.indexOf('};initExportUI();')+2);
code=code.slice(0,code.indexOf('function placeLightSource'))+handler+`
this.api={compositionScene,draw,sceneDimensions,sceneDuration,scenePlaysOnce,basicMotionState,multiplyMatrix,captureActiveLayer,removeEffectLayer,setEffectMode,addEffectLayer,
 defaults:()=>readInspectorValues(),definitions:effectDefinitions,looks:particleSettingsFor,
 set:(o)=>{if('base' in o){img=o.base;w=o.width;h=o.height;selected=!!img}if('layers' in o)effectLayers=o.layers;if('active' in o)activeLayerId=o.active;if('preset' in o)preset=o.preset;if('visible' in o)objectVisible=o.visible;},
 layers:()=>effectLayers,
 mode:()=>effectMode,
 testEditor:()=>{configureLayerInspector=layer=>{preset=layer?.preset||'none'};renderEffectCards=()=>{};renderSequenceCards=()=>{};restartScenePlayback=()=>{};},
 beginSequenceLayer,finishSequenceLayer,chooseSequence,setLoader:fn=>{loadSequenceSheet=fn}
};})();`;
vm.runInContext(code,context);const api=context.api;
const staticValues=api.defaults();let id=0;
function effect(preset,changes={}){
 const values=Object.fromEntries(Object.entries(staticValues).map(([k,v])=>[k,{...v}]));
 for(const [key,,min,max,value] of api.definitions[preset]?.fields||[])values['ef_'+key]={value:String(value)};
 let appearance=null,seed=191;if(preset.startsWith('particle-')){appearance=api.looks(preset);seed=appearance.seed;values.duration={value:'4'};values.particleShape={value:appearance.shape};values.particleSource={value:appearance.source};values.particleStarsMode={value:appearance.starsMode};values.fxColor={value:appearance.color};for(const [k,v] of Object.entries(appearance.fields))values['ef_'+k]={value:String(v)}}
 for(const [key,value] of Object.entries(changes))values[key]={...(values[key]||{}),value:String(value)};
 return {id:'test-'+(++id),kind:'effect',title:preset,preset,visible:true,settings:{preset,values,quality:'soft',lightSource:{x:50,y:46},lightDynamics:true,particleSeed:seed,particleSprite:null,particleAppearance:appearance}};
}
const prefs={mode:'loop',fps:2,speed:1,delay:0,gap:0,opacity:100,size:10,x:50,y:65,composition:'auto',blend:'source-over',follow:false,order:'above'};
const base=createCanvas(100,120),b=base.getContext('2d');b.fillStyle='rgba(0,128,255,.5)';b.fillRect(25,25,50,70);
const sheet=createCanvas(32,16),c=sheet.getContext('2d');c.fillStyle='#ff0000';c.fillRect(0,0,16,16);c.fillStyle='#ffff00';c.fillRect(16,0,16,16);
const clip={id:'test',name:'test',kind:'sheet',image:sheet,columns:2,frameCount:2,frameWidth:16,frameHeight:16,fps:2};
function sequence(changes={}){return {id:'test-'+(++id),kind:'sequence',title:'sequence',preset:'sequence-loop',visible:true,clip,prefs:{...prefs,...changes}}}
const out=createCanvas(1,1);api.set({base,width:100,height:120,layers:[],active:null,visible:true});
function draw(t,scene=api.compositionScene(),scale=1){api.draw(out,t,scale,scene);return Buffer.from(out.getContext('2d').getImageData(0,0,out.width,out.height).data)}
const original=draw(.23);
const sweepReference=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/sweep-reference.json'),'utf8'));
for(const reference of sweepReference.cases){
 api.set({layers:[effect('sweep',reference.changes)]});const pixels=draw(reference.t,api.compositionScene(),reference.scale);
 assert.strictEqual(require('crypto').createHash('sha256').update(pixels).digest('hex'),reference.sha256,'new sweep must match the previous flowing highlight at '+JSON.stringify(reference));
}
assert(api.definitions.sweep&&!api.definitions.shine,'only the consolidated sweep definition is available');
assert(!ui.includes('data-quality=')&&!ui.includes('硬切扫光')&&!ui.includes('柔和扫光')&&!ui.includes('data-motion-preset="shine"'));
console.log('PASS: the consolidated sweep matches ten captured flowing-highlight frames across colors, size, speed, delay, zero intensity and output scales.');
for(const neutral of [effect('sweep',{ef_intensity:0}),effect('particle-fall',{ef_count:0}),effect('flicker',{ef_intensity:0}),effect('water',{ef_amount:0})]){
 api.set({layers:[neutral]});assert(draw(.23).equals(original),neutral.preset+' must not duplicate/solidify the shared image');
}
console.log('PASS: the shared image is drawn once; neutral sweep, particles, flicker and displacement preserve its alpha.');
api.set({layers:[]});const scaledOriginal=draw(.23,api.compositionScene(),.5);api.set({layers:[effect('water',{ef_amount:0})]});assert(draw(.23,api.compositionScene(),.5).equals(scaledOriginal),'displacement samples canvas coordinates correctly at half resolution');
const delayed=effect('fade',{duration:1,delay:50,easing:'LINEAR'});api.set({layers:[delayed]});assert.strictEqual(api.sceneDuration(),1.5);assert(draw(.25).every((v,i)=>i%4!==3||v===0));assert(draw(.75).some((v,i)=>i%4===3&&v>0));
api.set({layers:[effect('customlight',{delay:50})]});assert(draw(.25).equals(original),'delayed light leaves the incoming image intact before its start');
console.log('PASS: per-layer delay contributes to the project timeline; half-resolution displacement preserves source alpha.');

const bounce=effect('bounce'),sweep=effect('sweep'),particle=effect('particle-stars',{ef_size:5}),glow=effect('glow',{gParticleSize:25,gRayCount:4}),seq1=sequence({x:20,y:20}),seq2=sequence({x:80,y:80,fps:4,opacity:50});
api.set({layers:[bounce,sweep,particle,glow,seq1,seq2]});const all=draw(.23);assert.strictEqual(api.compositionScene().layers.length,6);assert(out.width>100&&out.height>120,'glow expansion is retained in the composed output');
for(const layer of [bounce,sweep,particle,glow,seq1,seq2]){layer.visible=false;const without=draw(.23);assert(!without.equals(all),layer.title+' must contribute to the combined frame');layer.visible=true}
const secondParticle=effect('particle-stars',{ef_size:12,ef_opacity:30});api.set({layers:[particle,secondParticle]});const snapshot=api.compositionScene();assert.notStrictEqual(snapshot.layers[0].settings.values,snapshot.layers[1].settings.values);snapshot.layers[0].settings.values.ef_size.value='70';assert.strictEqual(secondParticle.settings.values.ef_size.value,'12');assert.strictEqual(particle.settings.values.ef_size.value,'5');
console.log('PASS: six independent layers contribute pixels; glow bounds survive; repeated presets keep separate settings.');
const fade=effect('fade',{duration:1,easing:'LINEAR'}),red=sequence({follow:false,x:50,y:50});api.set({layers:[red,fade]});const faded=draw(0);assert(faded.every((v,i)=>i%4!==3||v===0));api.set({layers:[fade,red]});assert(draw(0).some((v,i)=>i%4===3&&v>0),'sequence above fade changes the actual output');api.removeEffectLayer(fade.id);assert.strictEqual(api.layers().length,1);assert.strictEqual(api.layers()[0].id,red.id);assert(draw(.2).some((v,i)=>i%4===3&&v>0));
const rise=effect('rise',{duration:1,riseDistance:40,easing:'LINEAR'}),bound=sequence({follow:true});api.set({layers:[rise,bound]});const moving=draw(.5);bound.prefs.follow=false;assert(!draw(.5).equals(moving),'sequence follows lower transform layers when binding is enabled');
api.set({layers:[seq1,seq2],active:null});assert.strictEqual(api.sceneDuration(),1);assert(!api.scenePlaysOnce());seq1.prefs.mode='once';seq2.prefs.mode='once';assert(api.scenePlaysOnce());seq2.prefs.mode='loop';assert(!api.scenePlaysOnce());
const frozen=api.compositionScene(),before=draw(.3,frozen);seq1.prefs.opacity=0;seq2.prefs.x=2;api.set({base:createCanvas(20,20),width:20,height:20,layers:[effect('rotate')]});draw(.4);assert(draw(.3,frozen).equals(before),'export freezes every layer and the linked image, independently of live UI and canvas-pool reuse');
console.log('PASS: order, visibility and deletion affect rendering; sequence binding; independent source FPS; shared timeline; stable export snapshot.');
// Exercise every advertised non-sequence effect through the same stack renderer.
api.set({base,width:100,height:120});const presets=['fade','rise','pop','rotate','bounce','sweep','glow',...Object.keys(api.definitions).filter(x=>!x.startsWith('sequence'))];
for(const name of new Set(presets)){const layer=effect(name);api.set({layers:[layer,sequence({size:8})]});const pixels=draw(.31);assert(pixels.length>0&&out.width>0&&out.height>0,name);assert(pixels.some((v,i)=>i%4===3&&v>0),name+' preserves visible content')}
console.log('PASS: every advertised effect renders as a stack layer alongside sequence artwork.');
api.set({base,width:100,height:120,layers:[sequence()],active:null});context.window.onmessage({data:{pluginMessage:{type:'state',count:0,revision:10}}});assert.strictEqual(api.compositionScene().base,base);context.window.onmessage({data:{pluginMessage:{type:'state',count:2,revision:11}}});assert.strictEqual(api.compositionScene().base,base);context.window.onmessage({data:{pluginMessage:{type:'preview',bytes:[1,2],revision:10,name:'stale'}}});assert.strictEqual(api.compositionScene().base,base);
console.log('PASS: selection changes preserve the shared image and ignore stale preview replies.');
const editA=effect('particle-stars',{ef_size:5}),editB=effect('particle-stars',{ef_size:12});api.set({layers:[editA,editB],active:editA.id,preset:'particle-stars'});controls.ef_size={id:'ef_size',value:'17'};api.captureActiveLayer();assert.strictEqual(editA.settings.values.ef_size.value,'17');assert.strictEqual(editB.settings.values.ef_size.value,'12');api.set({active:editB.id});controls.ef_size.value='9';api.captureActiveLayer();assert.strictEqual(editA.settings.values.ef_size.value,'17');assert.strictEqual(editB.settings.values.ef_size.value,'9');api.set({active:null});
console.log('PASS: live inspector capture updates only the selected instance of a repeated preset.');

// Resolving two concurrent asset loads must add both resources, in the order requested.
(async()=>{
 api.testEditor();api.set({layers:[],active:null});assert.strictEqual(api.mode(),'single');
 const first=api.addEffectLayer('bounce'),replacing=api.addEffectLayer('sweep');
 assert.deepStrictEqual(Array.from(api.layers(),l=>l.id),[replacing.id]);assert(!api.layers().includes(first));assert.strictEqual(api.compositionScene().base,base);
 controls.duration.value='1.4';api.captureActiveLayer();const repeated=api.addEffectLayer('sweep');assert.strictEqual(repeated.id,replacing.id);assert.strictEqual(repeated.settings.values.duration.value,'1.4');
 const imported=api.beginSequenceLayer('single-sequence');api.finishSequenceLayer(imported.id,clip);assert.deepStrictEqual(Array.from(api.layers(),l=>l.id),[imported.id]);
 api.addEffectLayer('bounce');assert.strictEqual(api.layers().length,1);assert.strictEqual(api.layers()[0].kind,'effect');
 api.setEffectMode('stack');const sweepLayer=api.addEffectLayer('sweep'),duplicate=api.addEffectLayer('sweep');assert.strictEqual(api.layers().length,3);assert.notStrictEqual(sweepLayer.id,duplicate.id);
 api.set({active:sweepLayer.id,preset:'sweep'});controls.duration.value='1.7';api.setEffectMode('single');assert.deepStrictEqual(Array.from(api.layers(),l=>l.id),[sweepLayer.id]);assert.strictEqual(api.layers()[0].settings.values.duration.value,'1.7');
 assert.strictEqual(api.compositionScene().layers.length,1);assert.strictEqual(api.compositionScene().base,base);
 console.log('PASS: single mode replaces across all effect types; repeat selection preserves settings; stack adds duplicates; returning to single keeps only the selected layer and its parameters.');
 api.setEffectMode('stack');api.set({layers:[],active:null});
 // Resolve two source jobs in reverse order, retaining the original layer order.
 const loadA=api.beginSequenceLayer('A'),loadB=api.beginSequenceLayer('B');api.set({active:null});api.finishSequenceLayer(loadB.id,{...clip,id:'B',name:'B'});api.finishSequenceLayer(loadA.id,{...clip,id:'A',name:'A'});assert.deepStrictEqual(Array.from(api.layers(),l=>l.clip.id),['A','B']);
 api.removeEffectLayer(loadA.id);api.finishSequenceLayer(loadA.id,{...clip,id:'late',name:'late'});assert.deepStrictEqual(Array.from(api.layers(),l=>l.clip.id),['B']);
 console.log('PASS: out-of-order resource completion keeps both layers; removed loading layers cannot be resurrected.');
 const pendingA=api.beginSequenceLayer('pending-A'),pendingB=api.beginSequenceLayer('pending-B');api.set({active:pendingA.id,preset:'sequence-loop'});api.setEffectMode('single');
 api.finishSequenceLayer(pendingB.id,{...clip,id:'discarded'});api.finishSequenceLayer(pendingA.id,{...clip,id:'kept'});
 assert.deepStrictEqual(Array.from(api.layers(),l=>l.clip.id),['kept']);
 const later=api.beginSequenceLayer('later');api.finishSequenceLayer(pendingA.id,{...clip,id:'stale'});api.finishSequenceLayer(later.id,{...clip,id:'latest'});assert.deepStrictEqual(Array.from(api.layers(),l=>l.clip.id),['latest']);
 console.log('PASS: switching modes or replacing an asset during loading ignores discarded replies and completes the retained layer.');
})().catch(e=>{console.error(e);process.exitCode=1});
