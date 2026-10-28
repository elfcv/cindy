import fs from 'node:fs/promises';import {connect} from './cdp.mjs';const c=await connect();try{
const rows=[];
console.log(await c.evaluate(`({root:__nativeChat.rootTag,api:!!__nativeChat.api})`));
await c.asyncEval(`__nativeChat.measure(()=>__nativeChat.mount(__nativeChat.make(1,__nativeChat.paragraph(200))))`);
for(const scenario of ['long-18k','history-600'])for(let sample=0;sample<3;sample++)for(const variant of sample%2?['after','before']:['before','after']){
 await c.evaluate(`__chatPerf.use(${JSON.stringify(variant)}); true`);
 const value=await c.asyncEval(`__nativeChat.measure(()=>__nativeChat.mount(__nativeChat.make(${scenario==='long-18k'?'1,__nativeChat.paragraph(800)':'300'})))`,90000);
 rows.push({scenario,sample,variant,...value});console.log(JSON.stringify({scenario,sample,variant,parse:value.parse,list:value.list,maxRafGapMs:value.maxRafGapMs}));
 await fs.writeFile(new URL('native-results.json',import.meta.url),JSON.stringify(rows,null,2));
}
await c.evaluate(`__chatPerf.use('after');true`);
}finally{c.close()}
