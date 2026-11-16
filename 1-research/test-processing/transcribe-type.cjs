// Uses the installed Type/GigaType ASR; llm_off preserves raw recognised speech.
const fs=require('fs'),cp=require('child_process'),path=require('path');
const addon=require('/Applications/Type.app/Contents/Resources/bin/gigatype_runtime.node');
(async()=>{
let resolveChunk, asrText='';
let r=await addon.open({modelRoot:process.env.HOME+'/Library/Application Support/Type/model-cache/gigatype',features:['llm_off'],onAsrText:t=>{asrText=t},onText:(t,answer)=>resolveChunk({text:asrText||t,answer})});
for(let num=1;num<=3;num++){
 const input=path.join(__dirname,`test-${num}.wav`),out=path.join(__dirname,`test-${num}.type.jsonl`);
 const b=cp.execFileSync('/Applications/Type.app/Contents/Resources/bin/ffmpeg',['-v','error','-i',input,'-f','f32le','-ar','16000','-ac','1','pipe:1'],{maxBuffer:150000000});
 const audio=new Float32Array(b.buffer,b.byteOffset,b.length/4);
 const existing=fs.existsSync(out)?fs.readFileSync(out,'utf8').trim().split('\n').filter(Boolean).map(JSON.parse):[];
 for(let start=0;start<audio.length/16000;start+=29){
  if(existing.some(x=>x.start===start))continue;
  asrText='';const end=Math.min(start+30,audio.length/16000);
  r.startRecording();r.pushAudio(audio.subarray(start*16000,Math.floor(end*16000)));
  const done=new Promise(res=>resolveChunk=res);r.stopRecording();
  const result=await done;
  fs.appendFileSync(out,JSON.stringify({start,end,...result})+'\n');
  console.log(`test-${num} ${end.toFixed(1)}/${(audio.length/16000).toFixed(1)}`);
 }
 const chunks=fs.readFileSync(out,'utf8').trim().split('\n').map(JSON.parse);
 fs.writeFileSync(path.join(__dirname,`test-${num}.type.txt`),chunks.map(x=>`[${x.start.toFixed(0)}–${x.end.toFixed(0)}] ${x.text}`).join('\n\n'));
}
await r.close();
})().catch(e=>{console.error(e);process.exitCode=1});
