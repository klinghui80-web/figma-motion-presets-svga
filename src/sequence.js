// Source FPS controls playback time; export FPS only samples this same timeline.
function sequenceTiming(o){
 const count=Math.max(0,Math.floor(Number(o.frameCount)||0));
 const fps=clamp(Number(o.fps)||30,1,120),speed=clamp(Number(o.speed)||1,.25,3);
 const steps=o.mode==='pingpong'&&count>1?2*count-2:count;
 const lead=Math.max(0,Number(o.delay)||0),gap=o.mode==='once'?0:Math.max(0,Number(o.gap)||0);
 const active=steps/(fps*speed);
 return {count,steps,rate:fps*speed,lead,gap,active,duration:lead+active+gap};
}
function sequenceFrameAt(t,o){
 const q=sequenceTiming(o);
 if(!q.count||t<q.lead)return {index:0,visible:false};
 const elapsed=Math.max(0,t-q.lead);
 if(elapsed>=q.active&&q.gap>0)return {index:q.count-1,visible:false};
 const step=Math.min(q.steps-1,Math.floor(elapsed*q.rate+1e-8));
 const index=o.mode==='reverse'?q.count-1-step:o.mode==='pingpong'&&step>=q.count?q.steps-step:step;
 return {index:clamp(index,0,q.count-1),visible:true};
}
function naturalFrameOrder(items){return [...items].sort((a,b)=>a.name.localeCompare(b.name,'en',{numeric:true,sensitivity:'base'}))}
const sequenceCatalog=JSON.parse($('sequence-library-data').textContent);
// These aliases are only for the selected layer’s inspector; the scene owns every clip.
let sequenceClip=null,sequenceLoading=false,sequenceLoadVersion=0,sequenceAnchor=null,sequenceOffset=0;
let sequenceSearch='',sequenceFilter='全部',sequenceLibraryTab='library';
const sequenceCache=new Map();
const sequenceDefaultPrefs={mode:'loop',fps:30,speed:1,delay:0,gap:0,opacity:100,size:100,x:50,y:50,composition:'auto',blend:'source-over',follow:true,order:'above'};
const sequencePrefs={...sequenceDefaultPrefs};
function sequenceOptions(){return {...sequencePrefs,frameCount:sequenceClip?sequenceClip.frameCount:0}}
function sequenceTotal(){return sequenceTiming(sequenceOptions()).duration||2}
function sequenceScene(){return {clip:sequenceClip,prefs:{...sequencePrefs},base:img,baseWidth:w,baseHeight:h,hasBase:!!img&&selected,baseVisible:typeof objectVisible==='undefined'||objectVisible,sequenceVisible:typeof sequenceVisible==='undefined'||sequenceVisible,objectMotion:typeof currentObjectSnapshot==='function'?currentObjectSnapshot():null}}
function sequenceDimensions(scene=sequenceScene()){const {clip,prefs}=scene;return prefs.composition!=='asset'&&scene.base&&scene.hasBase?{width:scene.baseWidth,height:scene.baseHeight}:{width:clip?clip.frameWidth:128,height:clip?clip.frameHeight:128}}
function paintSequenceFrame(c,clip,prefs,t,W,H){
 const duration=sequenceTiming({...prefs,frameCount:clip.frameCount}).duration,local=prefs.mode==='once'?t:duration>0?t%duration:0;
 const frame=sequenceFrameAt(local,{...prefs,frameCount:clip.frameCount});if(!frame.visible)return;
 const source=clip.kind==='sheet'?clip.image:clip.frames[frame.index],sw=clip.kind==='sheet'?clip.frameWidth:source.naturalWidth,sh=clip.kind==='sheet'?clip.frameHeight:source.naturalHeight;
 const fit=Math.min(W/clip.frameWidth,H/clip.frameHeight)*prefs.size/100,dw=sw*fit,dh=sh*fit,dx=W*prefs.x/100-dw/2,dy=H*prefs.y/100-dh/2;
 c.save();c.globalAlpha=prefs.opacity/100;c.globalCompositeOperation=prefs.blend;
 if(clip.kind==='sheet')c.drawImage(source,(frame.index%clip.columns)*sw,Math.floor(frame.index/clip.columns)*sh,sw,sh,dx,dy,dw,dh);else c.drawImage(source,dx,dy,dw,dh);
 c.restore();
}
function drawSequenceEffect(target,t,scale,scene=sequenceScene()){
 const dims=sequenceDimensions(scene),W=Math.max(1,Math.round(dims.width*scale)),H=Math.max(1,Math.round(dims.height*scale)),{clip,prefs}=scene;
 target.width=W;target.height=H;const c=target.getContext('2d');c.clearRect(0,0,W,H);
 const drawBase=()=>{if(prefs.composition!=='asset'&&scene.base&&scene.hasBase&&scene.baseVisible!==false)c.drawImage(scene.base,0,0,W,H)};
 if(prefs.order!=='below')drawBase();if(clip&&scene.sequenceVisible!==false)paintSequenceFrame(c,clip,prefs,t,W,H);if(prefs.order==='below')drawBase();
}
function loadSequenceSheet(item){
 if(!sequenceCache.has(item.id))sequenceCache.set(item.id,new Promise((resolve,reject)=>{
  const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>{sequenceCache.delete(item.id);reject(Error('素材读取失败，请重新选择。'))};image.src=item.data;
 }));
 return sequenceCache.get(item.id);
}
function sequenceMeta(){
 if(!preset.startsWith('sequence'))return;
 const clip=sequenceClip;
 $('meta').textContent=clip?clip.name+' · '+clip.frameCount+' 帧 · '+sequenceTotal().toFixed(2)+'s':'请选择序列帧素材';
 $('sequenceInfo').textContent=clip?clip.name+' · '+clip.frameCount+' 帧 · '+clip.frameWidth+' × '+clip.frameHeight+' · '+sequencePrefs.fps+' FPS':'选择素材后即可预览和导出，无需先选择图层。';
 if($('seqDuration'))$('seqDuration').textContent='本轮 '+sequenceTotal().toFixed(2)+' 秒';
}
function startSequencePlayback(){
 if(!hasVisibleEffects())return;
 cancelAnimationFrame(raf);sequenceAnchor=null;sequenceOffset=pct()*total();playing=true;playBtn.textContent='❚❚ 暂停';raf=requestAnimationFrame(tick);
}
function restartSequence(){restartScenePlayback()}
function setSequenceClip(clip,layerId){finishSequenceLayer(layerId,clip)}
async function chooseSequence(id){
 const item=sequenceCatalog.find(x=>x.id===id);if(!item)return;
 const existing=effectLayers[0];
 if(effectMode==='single'&&effectLayers.length===1&&existing.kind==='sequence'&&existing.clip?.id===id){existing.visible=true;selectEffectLayer(existing.id);restartScenePlayback();return}
 const layer=beginSequenceLayer(item.name);msg('正在添加 '+item.name+'…');
 try{const image=await loadSequenceSheet(item);if(!effectLayers.includes(layer))return;
  finishSequenceLayer(layer.id,{...item,kind:'sheet',image});msg((effectMode==='stack'?'已添加 ':'正在预览 ')+item.name+' · '+item.frameCount+' 帧'+(effectMode==='stack'?' · 可继续叠加其他素材':''),'ok');
 }catch(e){if(effectLayers.includes(layer))failSequenceLayer(layer.id,e.message)}
}
function renderSequenceCards(){
 const list=sequenceCatalog.filter(x=>(sequenceFilter==='全部'||x.category===sequenceFilter)&&(!sequenceSearch||(x.name+x.category).includes(sequenceSearch)));
 const cards=$('sequenceCards');cards.replaceChildren();
 for(const item of list){
  const button=document.createElement('button');button.type='button';button.className='sequenceCard'+(sequenceClip&&sequenceClip.id===item.id?' active':'');button.dataset.sequenceId=item.id;
  button.setAttribute('aria-label',(effectMode==='stack'?'添加':'预览')+item.name+'，'+item.frameCount+' 帧，'+item.fps+' FPS');button.title=effectMode==='stack'?'添加为独立序列帧图层':'单独预览此序列帧';
  const thumb=document.createElement('img');thumb.src=item.poster;thumb.alt='';thumb.loading='lazy';
  const title=document.createElement('b');title.textContent=item.name;
  const detail=document.createElement('span');detail.textContent=item.frameCount+' 帧 · '+item.fps+' FPS';
  button.append(thumb,title,detail);button.addEventListener('click',()=>chooseSequence(item.id));cards.appendChild(button);
 }
 $('sequenceCount').textContent=list.length+' / '+sequenceCatalog.length+' 个素材';
 if(!list.length){const empty=document.createElement('div');empty.className='libraryNote';empty.textContent='没有匹配的素材，试试其他名称或分类。';cards.appendChild(empty)}
}
function initSequenceLibrary(){
 const panel=$('sequenceLibrary');panel.innerHTML=`
  <div class="segmented sequenceTabs"><button type="button" id="seqLibraryTab" class="active">素材库</button><button type="button" id="seqCustomTab">自定义帧</button></div>
  <div id="seqLibraryPane"><input id="seqSearch" type="search" placeholder="搜索火焰、烟雾、光环…" aria-label="搜索序列帧素材"><div class="cats" id="seqFilters"></div><div class="sequenceCards" id="sequenceCards"></div><div class="sequenceFoot"><span id="sequenceCount"></span><span>透明素材 · CC0</span></div></div>
  <div id="seqCustomPane" hidden><label class="sequenceUpload" for="seqFiles">导入 PNG 序列帧<input id="seqFiles" type="file" accept="image/png,.png" multiple></label><button type="button" id="seqFromFigma">读取 Figma 所选图层</button><div class="libraryNote">导入 2–240 张 PNG，或多选 Figma 中的各帧。按名称中的数字自然排序，例如 frame_2 在 frame_10 前；不同尺寸的帧按中心对齐。</div></div>
  <div class="libraryNote" id="sequenceInfo"></div>`;
 for(const label of ['全部','火焰','光效','烟雾','爆发','其他']){
  const b=document.createElement('button');b.type='button';b.className='cat'+(sequenceFilter===label?' active':'');b.textContent=label;
  b.addEventListener('click',()=>{sequenceFilter=label;$('seqFilters').querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b));renderSequenceCards()});$('seqFilters').appendChild(b);
 }
 $('seqSearch').addEventListener('input',e=>{sequenceSearch=e.target.value.trim();renderSequenceCards()});
 const tab=custom=>{sequenceLibraryTab=custom?'custom':'library';$('seqCustomPane').hidden=!custom;$('seqLibraryPane').hidden=custom;$('seqLibraryTab').classList.toggle('active',!custom);$('seqCustomTab').classList.toggle('active',custom)};
 $('seqLibraryTab').addEventListener('click',()=>tab(false));$('seqCustomTab').addEventListener('click',()=>tab(true));
 $('seqFromFigma').addEventListener('click',requestSequence);
 $('seqFiles').addEventListener('change',e=>{const files=[...e.target.files];if(files.length)importSequenceFiles(files);e.target.value=''});
 renderSequenceCards();
}
async function importSequenceFiles(files){
 if(files.length<2||files.length>240){msg('请选择 2–240 张 PNG 序列帧。','error');return}
 if(files.some(f=>!f.name.toLowerCase().endsWith('.png'))){msg('序列帧请使用 PNG 文件。','error');return}
 const layer=beginSequenceLayer('PNG 序列帧');msg('正在读取 PNG 序列帧…');
 try{
  const ordered=naturalFrameOrder(files),frames=[];
  for(const file of ordered){frames.push(await decodeImage(new Uint8Array(await file.arrayBuffer())));if(!effectLayers.includes(layer))return}
  finishSequenceLayer(layer.id,{id:'import-'+layer.requestId,name:ordered[0].name.replace(/\.[^.]+$/,'')+' 序列',kind:'frames',frames,frameCount:frames.length,frameWidth:Math.max(...frames.map(f=>f.naturalWidth)),frameHeight:Math.max(...frames.map(f=>f.naturalHeight)),fps:30});
  msg('已添加 '+frames.length+' 帧的序列图层，按文件名自然排序。','ok');
 }catch(e){if(effectLayers.includes(layer))failSequenceLayer(layer.id,e.message||'PNG 序列帧读取失败。')}
}
function buildSequenceSettings(){
 const area=$('effectSettings');area.innerHTML=`<div class="sequenceSummary"><b>序列帧播放</b><span id="seqDuration"></span></div>
  <div class="row"><label for="seqMode">播放方式</label><select id="seqMode"><option value="loop">循环</option><option value="pingpong">往返</option><option value="reverse">倒序循环</option><option value="once">单次 · 末帧停留</option></select></div>
  <div class="row"><label for="seqFps">素材帧率（FPS）</label><input id="seqFps" type="number" min="1" max="120" step="1"></div>
  <div class="effectTools" id="sequenceTools"></div>
  <label class="check sequenceBind"><input id="seqFollow" type="checkbox">跟随下方动效的位移、缩放与旋转</label><div class="row"><label for="seqBlend">混合方式</label><select id="seqBlend"><option value="source-over">正常</option><option value="screen">滤色</option></select></div>
  <div class="libraryNote" id="sequenceCompositionHint"></div><div class="libraryNote">素材帧率 × 播放速度决定动画时长；导出帧率只控制采样密度。单次播放在预览中停在末帧，导出的 SVGA 是否重播由播放器控制。</div>`;
 const fields=[['speed','播放速度',.25,3,.05,v=>v.toFixed(2)+'×'],['opacity','不透明度',0,100,1,v=>v+'%'],['delay','延后时间',0,3,.05,v=>v.toFixed(2)+'s'],['gap','循环间隔',0,3,.05,v=>v.toFixed(2)+'s'],['size','素材大小',10,300,1,v=>v+'%'],['x','水平位置',0,100,1,v=>v+'%'],['y','垂直位置',0,100,1,v=>v+'%']];
 for(const [key,label,min,max,step,format] of fields){
  const box=document.createElement('div');box.className='effectTool';
  const id='seq_'+key;box.innerHTML='<label for="'+id+'">'+label+' <output id="'+id+'_out"></output></label><input id="'+id+'" type="range" min="'+min+'" max="'+max+'" step="'+step+'">';
  $('sequenceTools').appendChild(box);$(id).value=sequencePrefs[key];$(id+'_out').textContent=format(sequencePrefs[key]);
  $(id).disabled=key==='gap'&&sequencePrefs.mode==='once';
  $(id).addEventListener('input',()=>{sequencePrefs[key]=Number($(id).value);$(id+'_out').textContent=format(sequencePrefs[key]);sequenceSettingChanged(['speed','delay','gap'].includes(key))});
 }
 $('seqMode').value=sequencePrefs.mode;$('seqFps').value=sequencePrefs.fps;$('seqBlend').value=sequencePrefs.blend;$('seqFollow').checked=sequencePrefs.follow;
 $('seqMode').addEventListener('change',()=>{sequencePrefs.mode=$('seqMode').value;preset='sequence-'+sequencePrefs.mode;$('seq_gap').disabled=sequencePrefs.mode==='once';sequenceSettingChanged(true)});
 $('seqFps').addEventListener('change',()=>{sequencePrefs.fps=clamp(Math.round(Number($('seqFps').value)||30),1,120);$('seqFps').value=sequencePrefs.fps;sequenceSettingChanged(true)});
 $('seqFollow').addEventListener('change',()=>{sequencePrefs.follow=$('seqFollow').checked;sequenceSettingChanged(false)});
 $('seqBlend').addEventListener('change',()=>{sequencePrefs.blend=$('seqBlend').value;sequenceSettingChanged(false)});
 sequenceSettingChanged(false);
}
function sequenceSettingChanged(timing){
 if(restoringLayer)return;
 captureActiveLayer();
 if(timing){const resume=playing;stop();scrub.value=0;sequenceAnchor=null;sequenceOffset=0;if(resume)startSequencePlayback()}
 if($('sequenceCompositionHint'))$('sequenceCompositionHint').textContent=effectMode==='stack'?'此素材是独立效果层，可在左侧隐藏或移除；选择新素材会继续叠加。':'单选模式只预览当前效果。选择新素材会替换，切到动效叠加可同时使用多个效果。';
 sequenceMeta();syncMotionExport();render();
}
