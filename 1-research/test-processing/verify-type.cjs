const fs=require('fs'),cp=require('child_process'),path=require('path');
const root=__dirname;const addon=require('/Applications/Type.app/Contents/Resources/bin/gigatype_runtime.node');
const windows=[
[2,742,783,'notice'],[2,868,901,'mcc'],[2,897,939,'activation'],[2,1060,1116,'banner'],
[3,405,459,'notice'],[3,792,847,'mcc-and-start'],[3,843,877,'card'],[1,580,620,'reward-location']];
(async()=>{let done,raw='';const r=await addon.open({modelRoot:process.env.HOME+'/Library/Application Support/Type/model-cache/gigatype',features:['llm_off'],onAsrText:t=>raw=t,onText:()=>done(raw)});
for(const [test,start,end,issue] of windows){
 const bytes=cp.execFileSync('/Applications/Type.app/Contents/Resources/bin/ffmpeg',['-v','error','-ss',String(start),'-i',path.join(root,`test-${test}.wav`),'-t',String(end-start),'-f','f32le','-ar','16000','-ac','1','pipe:1'],{maxBuffer:20000000});
 const a=new Float32Array(bytes.buffer,bytes.byteOffset,bytes.length/4);raw='';r.startRecording();r.pushAudio(a);const ready=new Promise(res=>done=res);r.stopRecording();const text=await ready;
 fs.appendFileSync(path.join(root,'verification-type.jsonl'),JSON.stringify({test,start,end,issue,text})+'\n');console.log(test,issue);
}await r.close();})().catch(e=>{console.error(e);process.exitCode=1});
