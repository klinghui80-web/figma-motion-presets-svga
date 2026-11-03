// Additional encoders consume the existing, frozen scene renderer. No effect
// definitions, motion clocks, compositing or SVGA encoding are changed here.
const exportFormats={svga:{label:'SVGA',ext:'svga'},webp:{label:'WebP',ext:'webp'},gif:{label:'GIF',ext:'gif'},lottie:{label:'Lottie JSON',ext:'json'},webm:{label:'WebM',ext:'webm'}};
let motionWebPModule=null;
function exportBytesBase64(bytes){let out='';for(let i=0;i<bytes.length;i+=32768)out+=String.fromCharCode(...bytes.subarray(i,i+32768));return btoa(out)}
function exportLE(value,size){const b=new Uint8Array(size);for(let i=0;i<size;i++){b[i]=value%256;value=Math.floor(value/256)}return b}
function exportBE(value,size){return exportLE(value,size).reverse()}
function exportText(s){return new TextEncoder().encode(s)}
function exportTick(i,fps,units=1000){return Math.round(i*units/fps)}
function exportDelay(i,fps,units=1000){return exportTick(i+1,fps,units)-exportTick(i,fps,units)}
function exportYield(){return new Promise(resolve=>setTimeout(resolve,0))}
function webpChunk(id,data){return joinBytes([exportText(id),exportLE(data.length,4),data,...(data.length%2?[new Uint8Array(1)]:[])])}
function webpImageChunks(bytes){
 if(String.fromCharCode(...bytes.subarray(0,4))!=='RIFF'||String.fromCharCode(...bytes.subarray(8,12))!=='WEBP')throw Error('WebP 编码结果无效。');
 const parts=[];for(let p=12;p+8<=bytes.length;){const id=String.fromCharCode(...bytes.subarray(p,p+4)),size=new DataView(bytes.buffer,bytes.byteOffset+p+4,4).getUint32(0,true),end=p+8+size;if(end>bytes.length)throw Error('WebP 帧数据不完整。');if(['ALPH','VP8 ','VP8L'].includes(id))parts.push(bytes.slice(p,end+(size%2)));p=end+(size%2)}
 if(!parts.length)throw Error('WebP 缺少图像数据。');return joinBytes(parts);
}
function encodeAnimatedWebP(width,height,fps,frames,once=false){
 const header=joinBytes([new Uint8Array([0x12,0,0,0]),exportLE(width-1,3),exportLE(height-1,3)]),parts=[webpChunk('VP8X',header),webpChunk('ANIM',joinBytes([new Uint8Array(4),exportLE(once?1:0,2)]))];
 frames.forEach((frame,i)=>{const info=joinBytes([new Uint8Array(6),exportLE(width-1,3),exportLE(height-1,3),exportLE(exportDelay(i,fps),3),new Uint8Array([2])]);parts.push(webpChunk('ANMF',joinBytes([info,webpImageChunks(frame)])))});
 const body=joinBytes([exportText('WEBP'),...parts]);return joinBytes([exportText('RIFF'),exportLE(body.length,4),body]);
}
async function losslessWebP(imageData){
 if(!motionWebPModule){const binary=Uint8Array.from(atob($('export-webp-wasm').textContent.trim()),c=>c.charCodeAt(0));motionWebPModule=createMotionWebPModule({wasmBinary:binary,locateFile:()=>''}).catch(e=>{motionWebPModule=null;throw e})}
 const module=await motionWebPModule,result=module.encode(imageData.data,imageData.width,imageData.height,{...motionWebPDefaults,lossless:1,quality:100,method:4,exact:1});
 if(!result)throw Error('无损 WebP 编码失败。');return new Uint8Array(result);
}
function lottieFromPNGs(width,height,fps,frames,title){
 const assets=frames.map((data,i)=>({id:'frame_'+i,w:width,h:height,u:'',p:'data:image/png;base64,'+exportBytesBase64(data),e:1}));
 const layers=assets.map((asset,i)=>({ddd:0,ind:i+1,ty:2,nm:'Frame '+(i+1),refId:asset.id,sr:1,ks:{o:{a:0,k:100},r:{a:0,k:0},p:{a:0,k:[0,0,0]},a:{a:0,k:[0,0,0]},s:{a:0,k:[100,100,100]}},ao:0,ip:i,op:i+1,st:0,bm:0}));
 return {v:'5.12.2',fr:fps,ip:0,op:frames.length,w:width,h:height,nm:title,ddd:0,assets,layers,markers:[]};
}
function gifFramePixels(source,background){
 const pixels=new Uint8ClampedArray(source),transparent=background==='transparent',matte=background==='black'?0:255;
 for(let p=0;p<pixels.length;p+=4){const alpha=pixels[p+3]/255;
  if(transparent){if(alpha<.5){pixels[p]=pixels[p+1]=pixels[p+2]=0;pixels[p+3]=0}else pixels[p+3]=255}
  else{for(let k=0;k<3;k++)pixels[p+k]=Math.round(pixels[p+k]*alpha+matte*(1-alpha));pixels[p+3]=255}
 }
 return pixels;
}
function writeGIFFrame(gif,source,width,height,index,fps,background,once){
 const rgba=gifFramePixels(source,background),transparent=background==='transparent',palette=motionGif.quantize(rgba,transparent?255:256,{format:'rgb565'}),indices=motionGif.applyPalette(rgba,palette,'rgb565');
 if(transparent){const clear=palette.length;palette.push([0,0,0]);for(let p=0,j=0;p<rgba.length;p+=4,j++)if(!rgba[p+3])indices[j]=clear;gif.writeFrame(indices,width,height,{palette,transparent:true,transparentIndex:clear,dispose:2,delay:exportDelay(index,fps,100)*10,repeat:once?-1:0})}
 else gif.writeFrame(indices,width,height,{palette,dispose:1,delay:exportDelay(index,fps,100)*10,repeat:once?-1:0});
}
function ebmlSize(value){for(let n=1;n<=8;n++)if(value<Math.pow(2,7*n)-1){const b=exportBE(value,n);b[0]|=1<<(8-n);return b}throw Error('WebM 文件过大。')}
function ebmlId(value){let size=1;while(value>=Math.pow(256,size))size++;return exportBE(value,size)}
function ebml(id,data){return joinBytes([ebmlId(id),ebmlSize(data.length),data])}
function ebmlUInt(id,value){let size=1;while(value>=Math.pow(256,size))size++;return ebml(id,exportBE(value,size))}
function ebmlFloat(id,value){const b=new Uint8Array(8);new DataView(b.buffer).setFloat64(0,value);return ebml(id,b)}
function encodeWebM(width,height,fps,colors,alphas){
 if(!colors.length||colors.length!==alphas.length)throw Error('WebM 帧不完整。');
 const header=ebml(0x1a45dfa3,joinBytes([ebmlUInt(0x4286,1),ebmlUInt(0x42f7,1),ebmlUInt(0x42f2,4),ebmlUInt(0x42f3,8),ebml(0x4282,exportText('webm')),ebmlUInt(0x4287,4),ebmlUInt(0x4285,2)]));
 const info=ebml(0x1549a966,joinBytes([ebmlUInt(0x2ad7b1,1000000),ebmlFloat(0x4489,colors.length*1000/fps),ebml(0x4d80,exportText('Motion')),ebml(0x5741,exportText('Motion'))]));
 const video=ebml(0xe0,joinBytes([ebmlUInt(0xb0,width),ebmlUInt(0xba,height),ebmlUInt(0x53c0,1)]));
 const tracks=ebml(0x1654ae6b,ebml(0xae,joinBytes([ebmlUInt(0xd7,1),ebmlUInt(0x73c5,1),ebmlUInt(0x83,1),ebmlUInt(0x9c,0),ebmlUInt(0x23e383,Math.round(1e9/fps)),ebml(0x86,exportText('V_VP8')),video])));
 const clusters=[],cues=[];let offset=info.length+tracks.length;
 // One independently decodable key frame and alpha side stream per cluster.
 colors.forEach((color,i)=>{const time=exportTick(i,fps),block=ebml(0xa1,joinBytes([new Uint8Array([0x81,0,0,0]),color])),extra=ebml(0x75a1,ebml(0xa6,joinBytes([ebmlUInt(0xee,1),ebml(0xa5,alphas[i])]))),group=ebml(0xa0,joinBytes([block,ebmlUInt(0x9b,exportDelay(i,fps)),extra])),cluster=ebml(0x1f43b675,joinBytes([ebmlUInt(0xe7,time),group]));
  cues.push(ebml(0xbb,joinBytes([ebmlUInt(0xb3,time),ebml(0xb7,joinBytes([ebmlUInt(0xf7,1),ebmlUInt(0xf1,offset)]))])));clusters.push(cluster);offset+=cluster.length;
 });
 return joinBytes([header,ebml(0x18538067,joinBytes([info,tracks,...clusters,ebml(0x1c53bb6b,joinBytes(cues))]))]);
}
function webMAlphaPlanes(data,width,height){
 const ySize=width*height,chroma=Math.ceil(width/2)*Math.ceil(height/2),bytes=new Uint8Array(ySize+chroma*2);bytes.fill(128,ySize);
 for(let i=0;i<ySize;i++)bytes[i]=data[i*4+3];return bytes;
}
async function createWebMEncoder(width,height,fps){
 if(typeof VideoEncoder!=='function'||typeof VideoFrame!=='function')throw Error('当前 Figma 环境不支持 WebM 编码，请更新 Figma，或使用无损 WebP / SVGA。');
 const config={codec:'vp8',width,height,framerate:fps,bitrate:Math.max(2000000,Math.min(80000000,width*height*fps*2)),latencyMode:'quality',hardwareAcceleration:'prefer-software'};
 const supported=await VideoEncoder.isConfigSupported(config);if(!supported.supported)throw Error('当前环境未提供 VP8 编码器，请使用 WebP / SVGA。');
 const colors=[],alphas=[];let failure=null,submitted=0;
 const encoder=target=>new VideoEncoder({output:chunk=>{const data=new Uint8Array(chunk.byteLength);chunk.copyTo(data);target.push({timestamp:chunk.timestamp,data})},error:e=>{failure=e}});
 const colorEncoder=encoder(colors),alphaEncoder=encoder(alphas);
 try{colorEncoder.configure(config);alphaEncoder.configure(config)}catch(e){colorEncoder.close();alphaEncoder.close();throw e}
 const close=()=>{for(const e of [colorEncoder,alphaEncoder])if(e.state!=='closed')e.close()};
 return {async add(canvas,i){
  if(failure)throw failure;const timestamp=exportTick(i,fps,1e6),duration=exportDelay(i,fps,1e6),color=new VideoFrame(canvas,{timestamp,duration,alpha:'discard'}),rgba=canvas.getContext('2d').getImageData(0,0,width,height).data,alpha=new VideoFrame(webMAlphaPlanes(rgba,width,height),{format:'I420',codedWidth:width,codedHeight:height,timestamp,duration,colorSpace:{primaries:'bt709',transfer:'bt709',matrix:'bt709',fullRange:true}});
  try{colorEncoder.encode(color,{keyFrame:true});alphaEncoder.encode(alpha,{keyFrame:true});submitted++}finally{color.close();alpha.close()}
  if(colorEncoder.encodeQueueSize>3||alphaEncoder.encodeQueueSize>3)await Promise.all([colorEncoder.flush(),alphaEncoder.flush()]);if(failure)throw failure;
 },async finish(){try{await Promise.all([colorEncoder.flush(),alphaEncoder.flush()]);if(failure)throw failure;if(colors.length!==submitted||alphas.length!==submitted)throw Error('WebM 编码帧数不完整。');const sorted=list=>list.sort((a,b)=>a.timestamp-b.timestamp).map(x=>x.data);return encodeWebM(width,height,fps,sorted(colors),sorted(alphas))}finally{close()}},close};
}
function updateExportUI(){
 const format=$('exportFormat').value||'svga',spec=exportFormats[format];exportBtn.textContent='导出为 '+spec.label;$('gifExportOptions').hidden=format!=='gif';
 const notes={svga:'SVGA 2.0 · 默认格式 · 保留透明背景',webp:'无损动态 WebP · 保留颜色与半透明柔光',gif:'GIF 限 256 色，不支持半透明；背景仅用于本次 GIF 导出。',lottie:'逐帧 PNG 内嵌 JSON · 保留画面；文件较大，非矢量关键帧。',webm:'高质量透明 WebM · 视频压缩有损，透明播放需播放器支持。'};
 $('exportFormatNote').textContent=notes[format];
}
function createExportJob(){
 captureActiveLayer();const scene=compositionScene(),fps=Number($('fps').value)||20,sec=sceneDuration(scene);
 return {scene,fps,sec,count:Math.max(1,Math.ceil(sec*fps)),scale:Number($('scale').value)||1,title:(img?name:'motion')+'-'+scene.layers.filter(layer=>layer.visible).length+'层动效合成',once:scene.layers.some(layer=>layer.visible)&&scene.layers.filter(layer=>layer.visible).every(layer=>layer.kind==='sequence'&&layer.prefs.mode==='once')};
}
function exportFrameAt(canvas,job,index){draw(canvas,Math.min(job.sec,index/job.fps),job.scale,job.scene)}
function saveAnimationFile(blob,title,ext){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=(title||'motion').replace(/[\\/:*?"<>|]/g,'_')+'.'+ext;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000)}
async function exportAnimation(){
 const format=$('exportFormat').value||'svga';if(format==='svga')return exportSVGA();
 if(exporting||sceneIsLoading()||(!img&&!hasVisibleEffects()))return;
 const job=createExportJob(),spec=exportFormats[format],background=$('gifBackground').value;
 stop();exporting=true;syncMotionExport();let webm=null;
 try{
  const frame=document.createElement('canvas');exportFrameAt(frame,job,0);const width=frame.width,height=frame.height,frames=[],gif=format==='gif'?motionGif.GIFEncoder():null;
  if(format==='webm')webm=await createWebMEncoder(width,height,job.fps);
  for(let i=0;i<job.count;i++){
   if(i)exportFrameAt(frame,job,i);if(frame.width!==width||frame.height!==height)throw Error('导出画面尺寸发生变化。');
   if(format==='lottie')frames.push(await png(frame));
   else if(format==='webp')frames.push(await losslessWebP(frame.getContext('2d').getImageData(0,0,width,height)));
   else if(format==='gif')writeGIFFrame(gif,frame.getContext('2d').getImageData(0,0,width,height).data,width,height,i,job.fps,background,job.once);
   else if(webm)await webm.add(frame,i);
   msg('正在导出 '+spec.label+' · '+(i+1)+' / '+job.count+' 帧…');await exportYield();
  }
  let data,type;if(format==='webp'){data=encodeAnimatedWebP(width,height,job.fps,frames,job.once);type='image/webp'}
  else if(format==='gif'){gif.finish();data=gif.bytes();type='image/gif'}
  else if(format==='lottie'){data=JSON.stringify(lottieFromPNGs(width,height,job.fps,frames,job.title));type='application/json'}
  else{data=await webm.finish();type='video/webm'}
  const blob=new Blob([data],{type});saveAnimationFile(blob,job.title,spec.ext);msg('已导出 '+spec.label+' · '+job.count+' 帧 · '+job.fps+' FPS · '+width+' × '+height+' · '+(blob.size/1048576).toFixed(2)+' MB','ok');
 }catch(e){msg('导出失败：'+(e.message||String(e)),'error')}finally{if(webm)webm.close();exporting=false;syncMotionExport()}
}
function initExportUI(){
 for(const id of ['exportFormat','gifBackground'])$(id).addEventListener('change',updateExportUI);updateExportUI();
}
