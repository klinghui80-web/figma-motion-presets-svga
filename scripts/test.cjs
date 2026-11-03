const {spawnSync}=require('node:child_process');
const path=require('node:path');
for(const test of ['particles','sequence','composition','exports']){
 const result=spawnSync(process.execPath,[path.join(__dirname,'..','tests',test+'.test.cjs')],{stdio:'inherit'});
 if(result.error){console.error(result.error);process.exit(1)}
 if(result.status!==0)process.exit(result.status||1);
}
