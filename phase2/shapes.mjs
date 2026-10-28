import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
const variant=process.argv[2]??'probe';
import {connect} from '../mobile-chat-history-2026-10-29/cdp.mjs';
const c=await connect(),results=[];
try{
await c.evaluate(`globalThis.__perfRequire=(suffix)=>{const found=Array.from(__r.getModules()).filter(([id,m])=>m.verboseName&&('/'+m.verboseName).endsWith(suffix));if(found.length!==1)throw Error('Module '+suffix);return __r(found[0][0]);};true`);
await fs.writeFile(new URL(variant+'-identity.json',import.meta.url),JSON.stringify(await c.evaluate(`({identity:__perfRequire('/debug/mobileRuntimeIdentity.ts').mobileRuntimeIdentity(),dev:__DEV__,hermes:HermesInternal.getRuntimeProperties()})`),null,2));
await c.evaluate(`globalThis.__auditOriginalElement=Array.from(__REACT_DEVTOOLS_GLOBAL_HOOK__.renderers.keys()).flatMap(id=>Array.from(__REACT_DEVTOOLS_GLOBAL_HOOK__.getFiberRoots(id)))[0].current.memoizedState.element;true`);
await c.evaluate(await fs.readFile(new URL('../mobile-chat-history-2026-10-29/native-harness.js',import.meta.url),'utf8'));
await c.asyncEval(`new Promise(r=>setTimeout(r,1500))`);
await c.asyncEval(`__nativeChat.measure(()=>__nativeChat.mount(__nativeChat.make(1,__nativeChat.paragraph(80))))`);
for(let sample=0;sample<3;sample++)for(const shape of sample%2?['formatted','plain','formatted-image']:['plain','formatted-image','formatted']){
const body=shape==='plain'?`'普通长回复正文 '.repeat(2300)`:`__nativeChat.paragraph(800)${shape==='formatted'?".split(' ![图]')[0]":''}`;
const result=await c.asyncEval(`__nativeChat.measure(()=>__nativeChat.mount(__nativeChat.make(1,${body})))`,90000);
const nodes=await c.evaluate(`({fibers:__nativeChat.fibers().length,text:__nativeChat.visibleText().length})`);
if(sample===0)execFileSync('xcrun',['simctl','io','9772E400-9F44-4623-88B8-8D283D29130F','screenshot',new URL(variant+'-'+shape+'.png',import.meta.url).pathname],{stdio:'pipe'});
results.push({sample,shape,...result,nodes});console.log(JSON.stringify({sample,shape,gap:result.maxRafGapMs,parse:result.parse.parseDurationMsTotal,nodes}));
await fs.writeFile(new URL(variant+'-shapes.json',import.meta.url),JSON.stringify(results,null,2));
}
const stream=await c.evaluate(`(()=>{const parse=__perfRequire('/session/messageMarkdown.ts');const rows=[];const text=__nativeChat.paragraph(800).split(' ![图]')[0];for(let sample=0;sample<3;sample++)for(const step of [64,256,1024]){let previous=null,total=0,max=0,reusedInline=0,parsed=0,calls=0;for(let end=step;end<text.length+step;end+=step){const start=performance.now();previous=parse.parseMobileMarkdownIncremental(text.slice(0,end),previous);const elapsed=performance.now()-start;total+=elapsed;max=Math.max(max,elapsed);parsed+=previous.parsedSourceUtf16Length;reusedInline+=previous.reusedInlineUtf16Length??0;calls++;}rows.push({sample,step,totalMs:total,maxMs:max,reusedInline,parsed,calls,equal:JSON.stringify(previous.blocks)===JSON.stringify(parse.parseMobileMarkdown(text))});}return rows;})()`);
await fs.writeFile(new URL(variant+'-stream.json',import.meta.url),JSON.stringify(stream,null,2));console.log(JSON.stringify(stream));
}finally{await c.evaluate(`__perfRequire('/Libraries/ReactNative/RendererImplementation.js').renderElement({rootTag:__nativeChat.rootTag,element:__auditOriginalElement});true`);c.close();}
