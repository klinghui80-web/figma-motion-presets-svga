// Effects are stored in bottom-to-top render order. The inspector only edits
// one layer; changing the inspector never changes the other layers.
let effectLayers=[],activeLayerId=null,nextEffectLayerId=1,objectVisible=true,effectMode='single';
let restoringLayer=false,latestSelectionRevision=0,sequenceDragging=false;
let defaultControlValues=null,layerListSignature='';
const presetLayerDefaults=new Map(),pendingFigmaSequences=new Map();
const basicMotionPresets=new Set(['fade','rise','pop','rotate','bounce']);
const objectPresetNames={fade:'淡入',rise:'上浮淡入',pop:'弹入',rotate:'旋转入场',bounce:'上下弹跳',sweep:'扫光',glow:'外发光',pulse:'呼吸发光'};
const layerCanvasPool=[];
function objectTitle(id){return objectPresetNames[id]||(effectDefinitions[id]&&effectDefinitions[id].title)||'动效'}
function activeEffectLayer(){return effectLayers.find(layer=>layer.id===activeLayerId)||null}
function retainEffectLayers(layers){
 effectLayers=layers;const ids=new Set(layers.map(layer=>layer.id));
 for(const [requestId,layerId] of pendingFigmaSequences)if(!ids.has(layerId))pendingFigmaSequences.delete(requestId);
 if(!ids.has(activeLayerId))activeLayerId=layers[layers.length-1]?.id||null;
}
function prepareEffectAddition(){captureActiveLayer();if(effectMode==='single')retainEffectLayers([])}
function setEffectMode(mode){
 const next=mode==='stack'?'stack':'single';if(next===effectMode)return;
 captureActiveLayer();
 if(next==='single'){
  const keep=activeEffectLayer()||[...effectLayers].reverse().find(layer=>layer.visible)||effectLayers[effectLayers.length-1];
  retainEffectLayers(keep?[keep]:[]);
 }
 effectMode=next;configureLayerInspector(activeEffectLayer());renderSequenceCards();restartScenePlayback();syncMotionExport();
 msg(next==='stack'?'已切换到动效叠加模式 · 继续点选即可添加效果':'已切换到单选模式 · 只保留当前效果','ok');
}
function visibilityIcon(visible){
 return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>'+(visible?'':'<path d="m3 3 18 18"/>')+'</svg>';
}
function updateEffectModeUI(){
 const stacking=effectMode==='stack';$('effectMode').value=stacking?'1':'0';$('effectMode').setAttribute('aria-valuetext',stacking?'动效叠加模式':'单选模式');
 $('singleModeLabel').classList.toggle('active',!stacking);$('stackModeLabel').classList.toggle('active',stacking);
 $('effectModeHint').textContent=stacking?'选择新效果会添加独立图层':'选择新效果会替换当前效果';
 $('addEffectHint').textContent=stacking?'点选效果添加新图层，已有效果保持叠加。':'点选效果单独预览，已有效果将被替换。';
 $('layersNote').textContent=stacking?'效果从下到上叠加。点击图层调参，眼睛切换显隐，右上角 × 移除。':'单选模式每次预览一个效果。切到动效叠加后，可继续添加更多效果。';
}
function cloneValues(values){return Object.fromEntries(Object.entries(values||{}).map(([id,value])=>[id,{...value}]))}
function cloneLayerSettings(settings){return settings?{...settings,values:cloneValues(settings.values),lightSource:{...settings.lightSource},particleAppearance:settings.particleAppearance?{...settings.particleAppearance,fields:{...settings.particleAppearance.fields}}:null}:null}
function readInspectorValues(){
 const values={};document.querySelectorAll('#parameterPanel input[id],#parameterPanel select[id]').forEach(el=>{if(el.type!=='file'&&!el.id.startsWith('seq'))values[el.id]={value:el.value,checked:el.checked}});return values;
}
function captureActiveLayer(){
 if(restoringLayer||renderValues)return;
 const layer=activeEffectLayer();if(!layer||layer.loading)return;
 if(layer.kind==='sequence'){
  layer.prefs={...sequencePrefs,composition:'auto',order:'above'};layer.preset='sequence-'+layer.prefs.mode;return;
 }
 if(isParticlePreset(preset))captureParticleAppearance();
 layer.settings={preset:layer.preset,values:readInspectorValues(),lightSource:{...lightSource},lightDynamics,particleSeed,particleSprite,particleAppearance:particleAppearance?{...particleAppearance,fields:{...particleAppearance.fields}}:null};
}
function objectDuration(motion){
 if(!motion)return 0;
 const v=motion.values||{},get=(id,fallback)=>v[id]?Number(v[id].value):fallback,d=clamp(get('duration',.8),.2,10),lead=get('delay',0)/100;
 return lead+d;
}
function layerDuration(layer){return layer.kind==='sequence'&&layer.clip?sequenceTiming({...layer.prefs,frameCount:layer.clip.frameCount}).duration:layer.kind==='effect'?objectDuration(layer.settings):0}
function hasSequenceLayer(){return effectLayers.some(layer=>layer.kind==='sequence'&&layer.visible&&layer.clip)}
function hasVisibleEffects(){return effectLayers.some(layer=>layer.visible&&!layer.loading&&(layer.kind==='effect'||layer.clip))}
function sceneIsLoading(){return effectLayers.some(layer=>layer.visible&&layer.loading)}
function sceneDuration(scene){return Math.max(0,...(scene?scene.layers:effectLayers).filter(layer=>layer.visible&&!layer.loading).map(layerDuration))||.8}
function scenePlaysOnce(){const layers=effectLayers.filter(layer=>layer.visible&&!layer.loading);return layers.length>0&&layers.every(layer=>layer.kind==='sequence'&&layer.prefs.mode==='once')}
function compositionScene(){
 return {base:img,baseWidth:w,baseHeight:h,hasBase:!!img&&selected,baseVisible:objectVisible,layers:effectLayers.map(layer=>({...layer,settings:cloneLayerSettings(layer.settings),prefs:layer.prefs?{...layer.prefs}:null}))};
}
function sceneDimensions(scene){
 if(scene.hasBase)return {width:scene.baseWidth,height:scene.baseHeight};
 const clips=scene.layers.filter(layer=>layer.clip).map(layer=>layer.clip);
 return {width:Math.max(128,...clips.map(clip=>clip.frameWidth)),height:Math.max(128,...clips.map(clip=>clip.frameHeight))};
}
function basicMotionState(id,t,values){
 const value=(key,fallback)=>values[key]?Number(values[key].value):fallback,d=clamp(value('duration',.8),.2,10),p=clamp((t-value('delay',0)/100)/d,0,1),e=values.easing?values.easing.value:'EASE_OUT';
 const q=e==='LINEAR'?p:e==='EASE_IN_AND_OUT'?p*p*(3-2*p):1-Math.pow(1-p,3);
 let alpha=1,dy=0,s=1,r=0;
 if(id==='fade')alpha=q;
 if(id==='rise'){alpha=q;dy=(1-q)*value('riseDistance',28)}
 if(id==='pop'){alpha=q;s=value('popScale',82)/100+(1-value('popScale',82)/100)*q;if(p>.7)s+=Math.sin((p-.7)/.3*Math.PI)*(1-p)*.2}
 if(id==='rotate'){alpha=q;r=(1-q)*-value('rotateAngle',9)}
 if(id==='bounce'&&t>=value('delay',0)/100)dy=-Math.sin(p*Math.PI*4)*Math.pow(1-p,1.2)*value('bounceHeight',26);
 return {alpha,dy,s,r};
}
function withObjectSnapshot(motion,base,width,height,run){
 const previous={preset,img,w,h,lightSource,lightDynamics,particleSeed,particleSprite,particleAppearance,renderValues,glowBoundary};
 try{
  preset=motion.preset;img=base;w=width;h=height;glowBoundary=null;
  lightSource=motion.lightSource;lightDynamics=motion.lightDynamics;particleSeed=motion.particleSeed;particleSprite=motion.particleSprite;particleAppearance=motion.particleAppearance;renderValues=motion.values;
  return run();
 }finally{({preset,img,w,h,lightSource,lightDynamics,particleSeed,particleSprite,particleAppearance,renderValues,glowBoundary}=previous)}
}
function layerTime(layer,t){const period=layerDuration(layer);return period>0&&t>period?t%period:t}
function multiplyMatrix(a,b){return {a:a.a*b.a+a.c*b.b,b:a.b*b.a+a.d*b.b,c:a.a*b.c+a.c*b.d,d:a.b*b.c+a.d*b.d,e:a.a*b.e+a.c*b.f+a.e,f:a.b*b.e+a.d*b.f+a.f,alpha:a.alpha*b.alpha}}
function identityMatrix(){return {a:1,b:0,c:0,d:1,e:0,f:0,alpha:1}}
function motionMatrix(layer,t,width,height,scale){
 const q=basicMotionState(layer.preset,layerTime(layer,t),layer.settings.values),angle=q.r*Math.PI/180,a=Math.cos(angle)*q.s,b=Math.sin(angle)*q.s,c=-b,d=a;
 return {a,b,c,d,e:width/2-a*width/2-c*height/2,f:height/2+q.dy*scale-b*width/2-d*height/2,alpha:q.alpha};
}
function stackCanvas(index,width,height){
 if(!layerCanvasPool[index])layerCanvasPool[index]=document.createElement('canvas');
 const result=layerCanvasPool[index];result.width=width;result.height=height;return result;
}
function renderEffectStack(target,t,scale,scene=compositionScene(),guideId=null){
 const dims=sceneDimensions(scene),rawW=Math.max(1,Math.round(dims.width*scale)),rawH=Math.max(1,Math.round(dims.height*scale));
 let current=stackCanvas(0,rawW,rawH),buffer=1,matrix=identityMatrix(),guide=null;
 if(scene.base&&scene.baseVisible)current.getContext('2d').drawImage(scene.base,0,0,rawW,rawH);
 for(const layer of scene.layers){
  if(!layer.visible||layer.loading)continue;
  if(layer.kind==='sequence'){
   if(!layer.clip)continue;
   const c=current.getContext('2d'),parent=layer.prefs.follow?matrix:{...identityMatrix(),e:(current.width-rawW)/2,f:(current.height-rawH)/2};
   if(layer.id===guideId)guide={matrix:{...parent},width:current.width,height:current.height,rawW,rawH,clip:layer.clip,prefs:layer.prefs};
   c.save();c.transform(parent.a,parent.b,parent.c,parent.d,parent.e,parent.f);
   paintSequenceFrame(c,layer.clip,{...layer.prefs,opacity:layer.prefs.opacity*parent.alpha},t,rawW,rawH);c.restore();
   continue;
  }
  if(!layer.settings)continue;
  const lead=Number(layer.settings.values.delay?.value||0)/100;if(!basicMotionPresets.has(layer.preset)&&layerTime(layer,t)<lead)continue;
  const beforeW=current.width,beforeH=current.height,next=stackCanvas(buffer,beforeW,beforeH),time=layerTime(layer,t);
  withObjectSnapshot(layer.settings,current,beforeW/scale,beforeH/scale,()=>drawObjectEffect(next,time,scale));
  const padX=(next.width-beforeW)/2,padY=(next.height-beforeH)/2;
  if(padX||padY){const shift={...identityMatrix(),e:padX,f:padY};matrix=multiplyMatrix(shift,matrix);if(guide)guide.matrix=multiplyMatrix(shift,guide.matrix)}
  if(basicMotionPresets.has(layer.preset)){const transform=motionMatrix(layer,t,beforeW,beforeH,scale);matrix=multiplyMatrix(transform,matrix);if(guide)guide.matrix=multiplyMatrix(transform,guide.matrix)}
  current=next;buffer=1-buffer;
 }
 target.width=current.width;target.height=current.height;target.getContext('2d').drawImage(current,0,0);
 if(guide){guide.width=target.width;guide.height=target.height}return guide;
}
function applyInspectorValues(values,dispatch=false){
 for(const [id,state] of Object.entries(values||{})){const el=document.getElementById(id);if(el){el.value=state.value;if(el.type==='checkbox')el.checked=state.checked}}
 if(dispatch)for(const id of Object.keys(values||{})){const el=document.getElementById(id);if(el)el.dispatchEvent(new Event('input',{bubbles:true}))}
}
function configureLayerInspector(layer){
 restoringLayer=true;
 try{
  preset=layer?layer.preset:'none';const seq=!!layer&&layer.kind==='sequence';
  $('parameterPanel').hidden=!layer;$('baseLayerSettings').hidden=!!layer;
  if(!layer){$('lightSourceHint').style.display='none';canvas.style.cursor='';return}
  $('editingLayerName').textContent=layer.title+' · 参数';
  applyInspectorValues(defaultControlValues);lightSource={x:50,y:46};lightDynamics=true;
  if(isParticlePreset(preset))$('duration').value=4;
  $('duration').closest('.row').hidden=seq;$('easing').closest('.row').hidden=seq;$('delay').closest('.rangeRow').hidden=seq;$('fxColor').closest('.row').hidden=seq;
  $('basicSettings').style.display=basicMotionPresets.has(preset)?'grid':'none';
  document.querySelectorAll('#basicSettings .param').forEach(field=>field.hidden=field.dataset.for!==preset);
  $('glowSettings').style.display=preset==='glow'?'block':'none';$('advancedSettings').style.display=seq||!basicMotionPresets.has(preset)&&preset!=='glow'?'block':'none';
  $('sequenceHint').style.display=seq?'block':'none';
  if(seq){sequenceClip=layer.clip||null;Object.assign(sequencePrefs,layer.prefs);sequenceLoading=!!layer.loading}
  const def=effectDefinitions[preset];if(def&&def.color)$('fxColor').value=def.color;
  buildEffectSettings(preset);
  if(layer.settings){
   const settings=layer.settings;lightSource={...settings.lightSource};lightDynamics=settings.lightDynamics;
   particleAppearance=settings.particleAppearance;particleSprite=settings.particleSprite;particleSeed=settings.particleSeed;
   applyInspectorValues(settings.values,true);
  }
  if($('toggleLightDynamics'))$('toggleLightDynamics').textContent='动态：'+(lightDynamics?'开':'关');
  canvas.style.cursor=seq?'move':['customlight','spotlight','tindal'].includes(preset)?'crosshair':'';
  $('lightSourceHint').style.display=['customlight','spotlight','tindal'].includes(preset)?'inline':'none';outputs();
 }finally{restoringLayer=false}
}
function selectEffectLayer(id){
 captureActiveLayer();activeLayerId=id;const layer=activeEffectLayer();configureLayerInspector(layer);
 if(layer)renderEffectCards(layer.kind==='sequence'?'sequence':categoryFor(layer.preset));
 render();syncMotionExport();
}
function addEffectLayer(id){
 if(id.startsWith('sequence')){renderEffectCards('sequence');return null}
 const existing=effectLayers[0];
 if(effectMode==='single'&&effectLayers.length===1&&existing.kind==='effect'&&existing.preset===id){existing.visible=true;selectEffectLayer(existing.id);restartScenePlayback();return existing}
 prepareEffectAddition();
 const layer={id:'effect-'+nextEffectLayerId++,kind:'effect',preset:id,title:objectTitle(id),visible:true,settings:null};
 effectLayers.push(layer);activeLayerId=layer.id;
 if(presetLayerDefaults.has(id))layer.settings=cloneLayerSettings(presetLayerDefaults.get(id));
 configureLayerInspector(layer);captureActiveLayer();
 if(isParticlePreset(id)){layer.settings.particleSeed=(layer.settings.particleSeed+nextEffectLayerId*104729)>>>0;if(layer.settings.particleAppearance)layer.settings.particleAppearance.seed=layer.settings.particleSeed;particleSeed=layer.settings.particleSeed}
 if(!presetLayerDefaults.has(id))presetLayerDefaults.set(id,cloneLayerSettings(layer.settings));
 renderEffectCards(categoryFor(id));restartScenePlayback();syncMotionExport();msg((effectMode==='stack'?'已添加 ':'正在预览 ')+layer.title+(effectMode==='stack'?' · 可继续添加其他效果':''),'ok');return layer;
}
function beginSequenceLayer(title){
 prepareEffectAddition();
 const prefs={...sequenceDefaultPrefs};
 const layer={id:'effect-'+nextEffectLayerId++,kind:'sequence',preset:'sequence-loop',title:title||'序列帧',visible:true,loading:true,clip:null,prefs,requestId:++sequenceLoadVersion};
 effectLayers.push(layer);activeLayerId=layer.id;configureLayerInspector(layer);render();syncMotionExport();return layer;
}
function finishSequenceLayer(layerId,clip){
 const layer=effectLayers.find(item=>item.id===layerId);if(!layer)return;
 layer.clip=clip;layer.title=clip.name;layer.loading=false;layer.prefs.fps=clip.fps;
 if(activeLayerId===layer.id)configureLayerInspector(layer);
 restartScenePlayback();renderSequenceCards();syncMotionExport();
}
function failSequenceLayer(id,message){
 removeEffectLayer(id,false);msg(message||'序列帧读取失败。','error');
}
function removeEffectLayer(id,announce=true){
 const index=effectLayers.findIndex(layer=>layer.id===id);if(index<0)return;
 const [removed]=effectLayers.splice(index,1);for(const [requestId,layerId] of pendingFigmaSequences)if(layerId===id)pendingFigmaSequences.delete(requestId);
 if(activeLayerId===id){activeLayerId=effectLayers[Math.min(index,effectLayers.length-1)]?.id||null;configureLayerInspector(activeEffectLayer())}
 render();syncMotionExport();if(announce)msg('已移除 '+removed.title+'，其余效果保留','ok');
}
function restartScenePlayback(){
 stop();scrub.value=0;sequenceAnchor=null;sequenceOffset=0;render();
 if(hasVisibleEffects()){playing=true;playBtn.textContent='❚❚ 暂停';raf=requestAnimationFrame(tick)}
}
function updateSceneUI(){
 const list=$('effectLayerList');if(!list)return;
 updateEffectModeUI();
 const signature=effectLayers.map(layer=>[layer.id,layer.title,layer.preset,layer.visible,layer.loading,activeLayerId===layer.id,layer.kind==='sequence'?layer.prefs.speed:layerDuration(layer)].join(':')).join('|');
 if(signature!==layerListSignature){
  layerListSignature=signature;list.replaceChildren();
  [...effectLayers].reverse().forEach(layer=>{
   const row=document.createElement('div');row.className='sceneLayer effectLayer'+(activeLayerId===layer.id?' selected':'')+(layer.visible?'':' isHidden');row.dataset.layerId=layer.id;
   const select=document.createElement('button');select.type='button';select.className='layerSelect';select.dataset.layerAction='select';
   if(layer.kind==='sequence'&&layer.clip?.poster){const image=document.createElement('img');image.className='layerThumb';image.src=layer.clip.poster;image.alt='';select.appendChild(image)}
   else{const symbol=document.createElement('span');symbol.className='effectSymbol';symbol.textContent=layer.kind==='sequence'?'▣':categoryFor(layer.preset)==='particles'?'✣':categoryFor(layer.preset)==='glow'?'☼':categoryFor(layer.preset)==='light'?'◈':categoryFor(layer.preset)==='displace'?'≋':basicMotionPresets.has(layer.preset)?'↔':'✦';select.appendChild(symbol)}
   const content=document.createElement('span');content.className='layerText';const title=document.createElement('b');title.textContent=layer.title;const detail=document.createElement('span');detail.textContent=layer.loading?'正在读取素材…':layer.kind==='sequence'?layer.clip.frameCount+' 帧 / '+layer.prefs.speed.toFixed(2)+'×':objectTitle(layer.preset)+' / '+layerDuration(layer).toFixed(2)+' 秒';content.append(title,detail);select.appendChild(content);
   const remove=document.createElement('button');remove.type='button';remove.className='iconButton layerRemove';remove.dataset.layerAction='remove';remove.setAttribute('aria-label','移除'+layer.title);remove.title='移除'+layer.title;remove.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m6 6 12 12M18 6 6 18"/></svg>';
   const eye=document.createElement('button');eye.type='button';eye.className='iconButton layerVisibility';eye.dataset.layerAction='visible';eye.setAttribute('aria-label',(layer.visible?'隐藏':'显示')+layer.title);eye.setAttribute('aria-pressed',String(layer.visible));eye.title=(layer.visible?'隐藏':'显示')+layer.title;eye.innerHTML=visibilityIcon(layer.visible);
   row.append(select,remove,eye);list.appendChild(row);
  });
 }
 $('baseLayer').hidden=!img;$('baseLayer').classList.toggle('selected',activeLayerId===null);
 $('baseLayerName').textContent=name||'所选对象';$('baseLayerDetail').textContent='原图 / 共享底图';
 if(img&&$('baseThumb').src!==img.src)$('baseThumb').src=img.src;
 $('baseEye').innerHTML=visibilityIcon(objectVisible);$('baseEye').setAttribute('aria-label',objectVisible?'隐藏原图':'显示原图');$('baseEye').setAttribute('aria-pressed',String(objectVisible));$('baseEye').title=objectVisible?'隐藏原图':'显示原图';
 $('emptyLayers').hidden=!!img||effectLayers.length>0;
 $('sceneLayerCount').textContent=(Number(!!img)+effectLayers.length)+' 层';
 const dims=sceneDimensions(compositionScene());$('sceneSize').textContent=dims.width+' × '+dims.height;$('sceneName').textContent=img?name:'动效合成';
 $('previewEmpty').hidden=!!img||hasVisibleEffects();
 const count=effectLayers.filter(layer=>layer.visible&&!layer.loading).length;$('compositionBadge').textContent=count?'原图 + '+count+' 个效果 · 合成预览':'原图预览';
 $('stageHint').textContent=activeEffectLayer()?.kind==='sequence'?'拖动预览调整当前序列帧的位置':effectMode==='stack'?'从下到上叠加 · 点击图层调参':'单选预览 · 选择新效果会替换当前效果';
 $('meta').textContent=sceneDuration().toFixed(2)+'s · '+count+' 个可见效果';
 $('clearEffects').disabled=effectLayers.length===0;
}
let lastSequenceGuide=null;
function updateSequenceBounds(){
 const box=$('sequenceBounds');if(!box)return;const layer=activeEffectLayer(),guide=lastSequenceGuide;
 box.hidden=!layer||layer.kind!=='sequence'||!guide;if(box.hidden)return;
 const stage=$('stage').getBoundingClientRect(),r=canvas.getBoundingClientRect(),p=guide.prefs,m=guide.matrix,fit=Math.min(guide.rawW/guide.clip.frameWidth,guide.rawH/guide.clip.frameHeight)*p.size/100;
 const x=guide.rawW*p.x/100,y=guide.rawH*p.y/100,sx=r.width/guide.width,sy=r.height/guide.height;
 box.style.left=r.left-stage.left+(m.a*x+m.c*y+m.e)*sx+'px';box.style.top=r.top-stage.top+(m.b*x+m.d*y+m.f)*sy+'px';
 box.style.width=guide.clip.frameWidth*fit*Math.hypot(m.a,m.b)*sx+'px';box.style.height=guide.clip.frameHeight*fit*Math.hypot(m.c,m.d)*sy+'px';box.style.transform='translate(-50%,-50%) rotate('+Math.atan2(m.b,m.a)*180/Math.PI+'deg)';
}
function moveSequence(e){
 const guide=lastSequenceGuide;if(!guide)return;const r=canvas.getBoundingClientRect(),m=guide.matrix,x=(e.clientX-r.left)/r.width*guide.width-m.e,y=(e.clientY-r.top)/r.height*guide.height-m.f,det=m.a*m.d-m.b*m.c;if(Math.abs(det)<1e-6)return;
 sequencePrefs.x=clamp((m.d*x-m.c*y)/det/guide.rawW*100,0,100);sequencePrefs.y=clamp((-m.b*x+m.a*y)/det/guide.rawH*100,0,100);
 for(const key of ['x','y']){if($('seq_'+key))$('seq_'+key).value=Math.round(sequencePrefs[key]);if($('seq_'+key+'_out'))$('seq_'+key+'_out').textContent=Math.round(sequencePrefs[key])+'%'}captureActiveLayer();render();
}
function initSceneUI(){
 $('effectMode').addEventListener('input',()=>setEffectMode($('effectMode').value==='1'?'stack':'single'));
 $('selectBaseLayer').addEventListener('click',()=>selectEffectLayer(null));
 $('effectLayerList').addEventListener('click',e=>{
  const button=e.target.closest('[data-layer-action]'),row=button?.closest('[data-layer-id]');if(!row)return;const id=row.dataset.layerId,action=button.dataset.layerAction;
  if(action==='select')selectEffectLayer(id);else if(action==='remove')removeEffectLayer(id);else if(action==='visible'){const layer=effectLayers.find(item=>item.id===id);layer.visible=!layer.visible;render();syncMotionExport()}
 });
 $('baseEye').addEventListener('click',()=>{objectVisible=!objectVisible;render();syncMotionExport()});
 $('clearEffects').addEventListener('click',()=>{effectLayers=[];pendingFigmaSequences.clear();activeLayerId=null;configureLayerInspector(null);stop();scrub.value=0;render();syncMotionExport()});
 document.querySelectorAll('[data-preview-bg]').forEach(b=>b.addEventListener('click',()=>{$('stage').dataset.background=b.dataset.previewBg;document.querySelectorAll('[data-preview-bg]').forEach(x=>x.classList.toggle('active',x===b))}));
 canvas.addEventListener('pointerdown',e=>{if(activeEffectLayer()?.kind!=='sequence'||!lastSequenceGuide)return;sequenceDragging=true;canvas.setPointerCapture(e.pointerId);moveSequence(e);e.preventDefault()});
 canvas.addEventListener('pointermove',e=>{if(sequenceDragging)moveSequence(e)});canvas.addEventListener('pointerup',()=>{sequenceDragging=false});canvas.addEventListener('pointercancel',()=>{sequenceDragging=false});window.addEventListener('resize',updateSequenceBounds);
}
function initializeLayerEditor(){defaultControlValues=readInspectorValues();configureLayerInspector(null);renderEffectCards('basic');render()}
