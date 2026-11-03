const send=(type,data)=>figma.ui.postMessage(Object.assign({type},data||{}));
const safeScale=value=>Math.max(.25,Math.min(3,Number(value)||1));
async function exportNode(node,scale){
  if(typeof node.exportAsync!=="function")throw new Error(`“${node.name}”不支持 PNG 导出。`);
  const bytes=await node.exportAsync({format:"PNG",constraint:{type:"SCALE",value:safeScale(scale)}});
  return {bytes,name:node.name,width:node.width,height:node.height};
}
let selectionRevision=0;
async function preview(node,revision){
  try{send("preview",Object.assign(await exportNode(node,1),{revision}))}
  catch(e){send("preview",{revision,message:e&&e.message?e.message:String(e)})}
}
function state(){
  const selection=figma.currentPage.selection,revision=++selectionRevision;
  send("state",{revision,count:selection.length,name:selection.length===1?selection[0].name:"",names:selection.map(n=>n.name)});
  if(selection.length===1)preview(selection[0],revision);
  else if(!selection.length)send("preview",{bytes:null,revision,message:"请选中一个对象以预览"});
}
async function loadSequence(scale,requestId){
  try{
    const selection=[...figma.currentPage.selection].sort((a,b)=>a.name.localeCompare(b.name,"en",{numeric:true,sensitivity:"base"}));
    if(selection.length<2)throw new Error("序列帧至少需要选中 2 个图层。请多选各帧，按图层名称自然排序读取。");
    if(selection.length>240)throw new Error("一次最多读取 240 个帧图层。");
    const frames=[];
    for(let i=0;i<selection.length;i++){
      frames.push(await exportNode(selection[i],scale));
      send("progress",{requestId,message:`正在读取序列帧 ${i+1} / ${selection.length}…`});
    }
    send("sequenceData",{frames,requestId});
  }catch(e){send("sequenceError",{requestId,message:e&&e.message?e.message:String(e)})}
}
figma.showUI(__html__,{width:1180,height:720,themeColors:true});
figma.on("selectionchange",state);
figma.ui.onmessage=async m=>{
  if(!m)return;
  if(m.type==="refresh")state();
  if(m.type==="loadSequence")await loadSequence(m.scale,m.requestId);
  if(m.type==="export"){
    try{send("exportData",await exportNode(figma.currentPage.selection[0],m.scale))}
    catch(e){send("exportData",{bytes:null,message:e&&e.message?e.message:String(e)})}
  }
};
state();
