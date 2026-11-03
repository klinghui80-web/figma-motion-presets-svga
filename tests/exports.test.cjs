const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const root=path.join(__dirname,'..'),runtime=path.join(require('os').homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
let canvasPackage;try{canvasPackage=require('@napi-rs/canvas')}catch{canvasPackage=require(process.env.MOTION_CANVAS_MODULE||path.join(runtime,'@napi-rs/canvas'))}
const {createCanvas,ImageData}=canvasPackage;
const wasm=fs.readFileSync(path.join(root,'vendor/webp-encoder.wasm'));
const context={Uint8Array,Uint8ClampedArray,DataView,TextEncoder,Blob,Response,ImageData,WebAssembly,console,atob,btoa,setTimeout,clearTimeout,window:{},document:{currentScript:null},$:()=>({textContent:wasm.toString('base64')}),joinBytes:parts=>{const out=new Uint8Array(parts.reduce((sum,p)=>sum+p.length,0));let offset=0;for(const p of parts){out.set(p,offset);offset+=p.length}return out}};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root,'vendor/webp-encoder.js'),'utf8')+'\n'+fs.readFileSync(path.join(root,'vendor/webp-options.js'),'utf8')+'\nconst motionGif=(()=>{const exports={};\n'+fs.readFileSync(path.join(root,'vendor/gifenc.cjs'),'utf8')+'\nreturn exports;})();\n'+fs.readFileSync(path.join(root,'src/export.js'),'utf8')+'\nthis.api={losslessWebP,encodeAnimatedWebP,lottieFromPNGs,gifFramePixels,writeGIFFrame,exportTick,exportDelay,webMAlphaPlanes,encodeWebM,GIFEncoder:motionGif.GIFEncoder,exportFrameAt};',context);
const api=context.api,output=process.env.MOTION_EXPORT_OUTPUT||'/tmp/motion-exports-test';fs.mkdirSync(output,{recursive:true});
(async()=>{
 const W=33,H=25,fps=24,N=7,pngs=[],webps=[],gif=api.GIFEncoder(),clearGif=api.GIFEncoder();
 for(let i=0;i<N;i++){
  const c=createCanvas(W,H),x=c.getContext('2d');x.fillStyle='rgba(20,70,220,0.4)';x.fillRect(2+i,3,14,18);const g=x.createRadialGradient(21,12,1,21,12,11);g.addColorStop(0,'rgba(255,100,0,.8)');g.addColorStop(1,'rgba(255,100,0,0)');x.fillStyle=g;x.fillRect(10,1,23,23);
  const rgba=x.getImageData(0,0,W,H);pngs.push(c.toBuffer('image/png'));webps.push(await api.losslessWebP(rgba));
  fs.writeFileSync(path.join(output,`source-${i}.png`),pngs[i]);api.writeGIFFrame(gif,rgba.data,W,H,i,fps,'black',false);api.writeGIFFrame(clearGif,rgba.data,W,H,i,fps,'transparent',false);
  assert(rgba.data.some((v,j)=>j%4===3&&v>0&&v<255));
 }
 fs.writeFileSync(path.join(output,'animation.webp'),api.encodeAnimatedWebP(W,H,fps,webps));
 gif.finish();clearGif.finish();fs.writeFileSync(path.join(output,'animation.gif'),gif.bytes());fs.writeFileSync(path.join(output,'transparent.gif'),clearGif.bytes());
 const lottie=api.lottieFromPNGs(W,H,fps,pngs,'Regression');fs.writeFileSync(path.join(output,'animation.json'),JSON.stringify(lottie));
 assert.strictEqual(lottie.assets.length,N);assert.strictEqual(lottie.layers.length,N);
 for(let i=0;i<N;i++){assert(Buffer.from(lottie.assets[i].p.split(',')[1],'base64').equals(pngs[i]));assert.strictEqual(lottie.layers.filter(l=>l.ip<=i&&l.op>i).length,1);assert.strictEqual(lottie.layers[i].refId,lottie.assets[i].id)}
 for(const fps of [12,15,20,24,30])for(const units of [100,1000,1e6]){const ticks=Array.from({length:113},(_,i)=>api.exportDelay(i,fps,units));assert.strictEqual(ticks.reduce((a,b)=>a+b,0),Math.round(113*units/fps));assert(Math.max(...ticks)-Math.min(...ticks)<=1)}
 assert.throws(()=>api.encodeAnimatedWebP(1,1,24,[new Uint8Array(5)]),/WebP/);
 const rgba=new Uint8Array([10,20,30,0,10,20,30,128,10,20,30,255]);assert.deepStrictEqual(Array.from(api.gifFramePixels(rgba,'black')),[0,0,0,255,5,10,15,255,10,20,30,255]);assert.deepStrictEqual(Array.from(api.webMAlphaPlanes(rgba,3,1)).slice(0,3),[0,128,255]);assert.strictEqual(rgba[7],128);
 const calls=[];context.draw=(...args)=>calls.push(args);const frozen={fps:24,count:7,sec:7/24,scale:.5,scene:{frozen:true}},target={};api.exportFrameAt(target,frozen,5);assert.strictEqual(calls[0][1],5/24);assert.strictEqual(calls[0][2],.5);assert.strictEqual(calls[0][3],frozen.scene);
 const ui=fs.readFileSync(path.join(root,'ui.html'),'utf8');assert(ui.includes(fs.readFileSync(path.join(root,'src/export.js'),'utf8')));new vm.Script(ui.match(/<script>\s*([\s\S]*?)<\/script>/)[1]);
 console.log('PASS: lossless WebP/GIF/Lottie encoded; PNG payloads unchanged; exactly one Lottie frame visible; fractional-FPS timing; GIF matte/alpha planes; frozen renderer dispatch; offline embedding and syntax.');console.log(output);
})().catch(e=>{console.error(e);process.exitCode=1});
