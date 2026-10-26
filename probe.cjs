const fs=require('node:fs');
const label=process.env.RUN_LABEL||'sample';
const out=__dirname+'/'+label;fs.mkdirSync(out,{recursive:true});
const {createRequire}=require('node:module');
const assert=require('node:assert/strict');
const req=createRequire(process.cwd()+'/package.json');
(async()=>{
const b=await req('playwright-core').chromium.connectOverCDP('http://127.0.0.1:9243');
try{
const p=b.contexts()[0].pages().find(p=>!new URL(p.url()).search);
if(!p.url().startsWith(process.env.TEST_RENDERER_URL))throw Error('Wrong renderer');
const sid=await p.evaluate(async()=>{
 const s=await window.electronAPI.localDb.sessions.create({title:'Stream profiling synthetic',workspaceKind:'dialogue',agentKind:'codex',model:'gpt-6.1-sol'});
 const id=s.id??s.session?.id;
 await window.electronAPI.localDb.messages.create(id,{clientId:'stream-probe-user',role:'user',content:{text:'Synthetic stream profiling',images:[],files:[]}});
 location.hash='/cc-agent/'+id;return id;
});
await p.getByTestId('layout-root-content').getByText('Synthetic stream profiling',{exact:true}).waitFor({timeout:30000});
const cdp=await p.context().newCDPSession(p);await cdp.send('Profiler.enable');await cdp.send('Profiler.start');
const errors=[];p.on('pageerror',e=>errors.push(e.message));
const result={at:new Date().toISOString(),scope:'Full Electron UI driven by synthetic events through existing store test ingress; real renderer/store/Markdown; no agent, network or main streaming ingress',scenarios:[]};
for(const theme of ['light','dark']){
 const run=await p.evaluate(async({sid,theme})=>{
   const {makerChatStore:store}=await import('/lib/makerChatStore.ts');
   const {applyThemeClass}=await import('/hooks/useTheme.ts');applyThemeClass(theme,true);
   const viewportModule=await (await fetch('/components/chat/useMessageViewport.ts')).text();
   const geometryUrl=viewportModule.match(/from ["']([^"']*messageViewportGeometry[^"']*)["']/)[1];
   const {MessageViewportGeometry:G}=await import(geometryUrl);
   const originalRefresh=G.prototype.refresh, originalMutations=G.prototype.mutations;
   const metrics={refreshes:0,fadeClassRecords:0,markerRecords:0,otherRecords:0,rowMeasurements:0};
   const rect=HTMLElement.prototype.getBoundingClientRect;
   HTMLElement.prototype.getBoundingClientRect=function(...args){if(this.hasAttribute('data-render-item-key'))metrics.rowMeasurements++;return rect.apply(this,args);};
   G.prototype.refresh=function(...args){metrics.refreshes++;return originalRefresh.apply(this,args);};
   G.prototype.mutations=function(records,...args){for(const r of records){if(r.type==='attributes'&&r.attributeName==='class'&&r.target.hasAttribute('data-wf-key'))metrics.fadeClassRecords++;else if(r.attributeName==='data-stream-marker')metrics.markerRecords++;else metrics.otherRecords++;}return originalMutations.call(this,records,...args);};
   const id='perfstreamprobe-stream-'+theme;const frames=[];let last=0;let running=true;
   const frame=t=>{if(last)frames.push(t-last);last=t;if(running)requestAnimationFrame(frame);};requestAnimationFrame(frame);
   const longTasks=[];const observer=new PerformanceObserver(list=>longTasks.push(...list.getEntries().map(e=>e.duration)));observer.observe({type:'longtask',buffered:false});
   const emit=(type,data)=>store.__applyStreamEventForTest(sid,{type,source:'codex',sessionId:sid,persistId:id,data});
   store.__applyStatusUpdateForTest(sid,{isRunning:true,status:'Working',tokenUsage:0,contextTokens:0,contextWindow:0});
   const code=Array.from({length:400},(_,i)=>'export const stream'+i+' = '+i+';').join('\n');
   let text='# 流式代码验收 '+theme+'\n\n```ts\n'+code+'\n```\n\n';
   emit('text',{text,isFinal:false});
   const start=performance.now();
   for(let i=1;i<=100;i++){
     const delta='片段'+String(i).padStart(3,'0')+' ';text+=delta;emit('text',{text:delta,isFinal:false});
     await new Promise(r=>setTimeout(r,25));
   }
   text+='\n\nSTREAMstreamprobe_'+theme+'_END';emit('text',{text,isFinal:true,isFullText:true});emit('done',{status:'completed'});
   store.__applyStatusUpdateForTest(sid,{isRunning:false,status:'Completed',tokenUsage:0,contextTokens:0,contextWindow:0});
   await new Promise(r=>setTimeout(r,800));running=false;observer.disconnect();
   G.prototype.refresh=originalRefresh;G.prototype.mutations=originalMutations;HTMLElement.prototype.getBoundingClientRect=rect;
   const message=store.getSnapshot(sid).messages.find(m=>m.clientId===id);
   return {theme,id,metrics,elapsedMs:performance.now()-start,expected:text,actual:message?.content,isStreaming:message?.isStreaming,frames,longTasks,finalVisible:document.body.innerText.includes('STREAMstreamprobe_'+theme+'_END')};
 },{sid,theme});
 assert.equal(run.actual,run.expected);assert(!run.isStreaming);
 await p.getByText('STREAMstreamprobe_'+theme+'_END',{exact:true}).waitFor({timeout:10000});
 await p.getByText('STREAMstreamprobe_'+theme+'_END',{exact:true}).scrollIntoViewIfNeeded();
 await p.screenshot({path:out+'/stream-'+theme+'.png'});
 await p.getByTestId('layout-root-content').screenshot({path:out+'/chat-'+theme+'.png'});
 delete run.actual;delete run.expected;run.complete100OrderedSegments=true;result.scenarios.push(run);
}
const profile=await cdp.send('Profiler.stop');fs.writeFileSync(out+'/profile.cpuprofile',JSON.stringify(profile.profile));result.pageErrors=errors;assert.equal(errors.length,0);
fs.writeFileSync(out+'/desktop-stream.json',JSON.stringify(result,null,2));
console.log(JSON.stringify({scenarios:result.scenarios.map(x=>({theme:x.theme,metrics:x.metrics,complete:x.complete100OrderedSegments,longTasks:x.longTasks.length,maxFrameGap:Math.max(...x.frames)})),pageErrors:errors}));
await p.reload();
}finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
