const fs=require('fs'),vm=require('vm'),assert=require('assert');
const path=require("path");
const source=fs.readFileSync(path.join(__dirname,"../ui.html"),"utf8");const engine=source.slice(source.indexOf('// Particle simulation'),source.indexOf('function draw(target'));
const ctx={Math,clamp:(x,a,b)=>Math.max(a,Math.min(b,x)),rgba:(h,a)=>`rgba(${parseInt(h.slice(1,3),16)},${parseInt(h.slice(3,5),16)},${parseInt(h.slice(5,7),16)},${a})`};vm.createContext(ctx);vm.runInContext(engine+'\nthis.sample=sampleParticle;this.paint=paintParticle;this.options=particleOptions;this.reseed=()=>particleSeed+=104729;this.settings=particleSettingsFor;this.remember=rememberParticleSettings;this.capture=captureParticleAppearance;',ctx);
const base={count:30,size:8,speed:1,randomness:.5,opacity:.75,opacityRandom:.7,life:1,decay:.2,twinkle:1,softness:0,glow:0,glowSize:.75,trail:0,startX:.5,startY:.5,angle:Math.PI*1.5,spread:Math.PI/4,range:.7,sides:6,appearance:'snow',source:'canvas',starsMode:'random'};
for(const mode of ['fall','emit','flame','wave','vortex','stars']){
 const o={...base,mode};
 for(let i=0;i<200;i++){
  const q=ctx.sample(i,.4,4,811,1077,o),again=ctx.sample(i,.4,4,811,1077,o);assert.deepStrictEqual(q,again);
  for(const key of ['x','y','radius','alpha','rotation'])assert(Number.isFinite(q[key]),`${mode} ${key}`);
  assert(q.alpha>=0&&q.alpha<=1);
  const first=ctx.sample(i,0,4,811,1077,o),last=ctx.sample(i,4,4,811,1077,o);
  for(const key of ['x','y','radius','alpha','rotation'])assert(Math.abs(first[key]-last[key])<1e-7,`${mode} loop ${key}`);
 }
}
const emit={...base,mode:'emit',spread:0,randomness:0};
let found=false;for(let i=0;i<30;i++){let a=ctx.sample(i,0,4,811,1077,emit),b=ctx.sample(i,.05,4,811,1077,emit);if(b.age>a.age){assert(b.y<a.y);assert(Math.abs(b.x-a.x)<1e-7);found=true;break}}assert(found,'upward emitter checked');
const vortex={...base,mode:'vortex'};for(let i=0;i<30;i++){const a=ctx.sample(i,0,4,811,1077,vortex),b=ctx.sample(i,.05,4,811,1077,vortex);if(b.age>a.age)assert(Math.hypot(b.x-405.5,b.y-538.5)<Math.hypot(a.x-405.5,a.y-538.5))}
const frozen={...base,mode:'fall',speed:0,twinkle:0};assert.deepStrictEqual(ctx.sample(1,0,4,811,1077,frozen),ctx.sample(1,2,4,811,1077,frozen));
const regular=ctx.sample(3,1,4,811,1077,{...base,mode:'fall',randomness:0});assert.strictEqual(regular.radius,8,'size is the core radius in source pixels');
const before=ctx.sample(3,1,4,811,1077,{...base,mode:'fall'});ctx.reseed();assert.notStrictEqual(ctx.sample(3,1,4,811,1077,{...base,mode:'fall'}).x,before.x);
// Exercise short lifetimes and trail samples before time zero, including inactive particles.
for(const mode of ['fall','emit','flame','wave','vortex','stars'])for(const time of [-.1,0,.03,3.99,4])for(let i=0;i<200;i++){
 const q=ctx.sample(i,time,4,811,1077,{...base,mode,life:.1,speed:3,randomness:1,decay:1});
 assert(Object.values(q).every(Number.isFinite),`${mode}: finite state at lifetime/speed extremes`);
}
// Changing the contour changes the vortex origin as well as ordinary emission.
const layerVortex={...vortex,source:'layer'};
assert.notStrictEqual(ctx.sample(0,.2,4,811,1077,layerVortex,[{x:.1,y:.1}]).x,ctx.sample(0,.2,4,811,1077,layerVortex,[{x:.9,y:.9}]).x);
console.log('PASS: six particle modes; deterministic scrubbing; loop endpoints; direction; convergence; zero speed; pixel radius; reseeding; parameter extremes; layer contour.');

// Opacity has a continuous lifecycle and a different peak for each particle.
const alphaOptions={...base,mode:'stars',randomness:0,twinkle:0};
function atLife(index,u,options=alphaOptions){
 const phase=ctx.sample(index,0,4,811,1077,options).age;
 const t=((u-phase+1)%1)*4;
 return ctx.sample(index,t,4,811,1077,options);
}
const birth=atLife(0,.03).alpha,rising=atLife(0,.25).alpha,peak=atLife(0,.5).alpha,falling=atLife(0,.75).alpha,dying=atLife(0,.97).alpha;
assert(birth<rising&&rising<peak&&dying<falling&&falling<peak,'particle fades in and out rather than holding a solid plateau');
const peaks=Array.from({length:100},(_,i)=>atLife(i,.5).alpha);
assert(Math.max(...peaks)-Math.min(...peaks)>.3,'simultaneous particles have visibly different peak opacity');
assert(Math.max(...peaks)<=alphaOptions.opacity,'opacity is a cap, not clipped random amplification');
const uniform={...alphaOptions,opacityRandom:0};
assert(Math.abs(atLife(0,.5,uniform).alpha-atLife(1,.5,uniform).alpha)<1e-10,'random opacity can be disabled');
for(const mode of ['fall','emit','flame','wave','vortex','stars'])for(let i=0;i<30;i++){
 const o={...base,mode},q=ctx.sample(i,1,4,811,1077,o),dim=ctx.sample(i,1,4,811,1077,{...o,opacity:.375}),hidden=ctx.sample(i,1,4,811,1077,{...o,opacity:0});
 assert(Math.abs(dim.alpha-q.alpha*.5)<1e-10);assert.strictEqual(hidden.alpha,0);
 for(const key of ['x','y','radius','rotation','age'])assert.strictEqual(q[key],dim[key],`opacity must not change ${key}`);
}
console.log('PASS: smooth alpha lifecycle; varied per-particle peaks; adjustable opacity cap and variance; geometry preserved.');

// Each preset opens with its own visual identity, even when another preset was edited.
const looks={fall:['snow',12],emit:['dot',16],flame:['ember',18],wave:['dot',14],vortex:['dot',16],stars:['polygon',40]};
for(const [mode,[shape,size]] of Object.entries(looks)){
 const look=ctx.settings('particle-'+mode);assert.strictEqual(look.shape,shape);assert.strictEqual(look.fields.size,size);
}
assert.strictEqual(ctx.settings('particle-stars').fields.sides,6);
assert(ctx.settings('particle-flame').fields.particleGlow>0);
const editedControls={particleShape:{value:'snow'},fxColor:{value:'#ffffff'},ef_size:{value:'25'},ef_opacity:{value:'45'},ef_opacityRandom:{value:'85'}};
ctx.$=id=>editedControls[id]||null;ctx.preset='particle-fall';ctx.capture();
assert.strictEqual(ctx.settings('particle-fall').fields.size,25);
assert.strictEqual(ctx.settings('particle-fall').fields.opacity,45);
assert.strictEqual(ctx.settings('particle-fall').fields.opacityRandom,85);
assert.strictEqual(ctx.settings('particle-stars').fields.opacity,85);
assert.strictEqual(ctx.settings('particle-stars').fields.size,40);
assert.strictEqual(ctx.settings('particle-stars').shape,'polygon');
ctx.preset='particle-flame';editedControls.particleShape.value='ember';editedControls.ef_size.value='35';ctx.capture();
assert.strictEqual(ctx.settings('particle-fall').fields.size,25);
assert.strictEqual(ctx.settings('particle-flame').fields.size,35);
const copy=ctx.settings('particle-flame');copy.fields.size=1;
assert.strictEqual(ctx.settings('particle-flame').fields.size,35,'returned settings cannot mutate another preset');
// Dedicated fire is a soft gradient; the six-sided default has exactly six vertices.
const calls=[],fakeContext=new Proxy({}, {get:(_,key)=> (...args)=>{calls.push([key,...args]);return key==='createRadialGradient'?{addColorStop:(...v)=>calls.push(['stop',...v])}:undefined},set:()=>true});
ctx.paint(fakeContext,{x:10,y:10,radius:18,alpha:1,rotation:0},1,{...base,appearance:'ember',glow:.7},'#ff8b2d');
assert(calls.some(x=>x[0]==='createRadialGradient'));assert(!calls.some(x=>x[0]==='lineTo'));
calls.length=0;
ctx.paint(fakeContext,{x:10,y:10,radius:40,alpha:1,rotation:0},1,{...base,appearance:'polygon',sides:6},'#ffffff');
assert.strictEqual(calls.filter(x=>x[0]==='moveTo'||x[0]==='lineTo').length,6);
console.log('PASS: per-preset sizes and shapes; isolated saved edits; soft fire sprite; six-sided star geometry.');

// Real-size frame data must drain while compressing, rather than deadlock on backpressure.
const compressSource=source.slice(source.indexOf('async function compressSVGA'),source.indexOf('async function png'));
const compress=vm.runInNewContext('('+compressSource+')',{Blob,Response,CompressionStream,Uint8Array});
(async()=>{
 const input=require('crypto').randomBytes(1024*1024);let timeout;
 try {
  const packed=await Promise.race([compress(input),new Promise((_,reject)=>{timeout=setTimeout(()=>reject(Error('SVGA compression stalled')),3000)})]);
  assert.deepStrictEqual(require('zlib').inflateSync(packed),input);
  console.log('PASS: 1 MiB SVGA compression completes and decompresses byte-for-byte.');
 } finally {clearTimeout(timeout)}
})().catch(error=>{console.error(error);process.exitCode=1});
