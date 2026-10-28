import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire('/Users/elfcv/Documents/Codex/cindy-mobile-chat-history/package.json');
const WebSocket=require('ws');
export const sleep = ms => new Promise(r => setTimeout(r, ms));
export async function connect() {
  const targets = await (await fetch('http://127.0.0.1:8081/json/list')).json();
  const target = targets.find(t => t.deviceName === 'Cindy-Chat-History-Perf');
  if (!target) throw new Error('No Hermes target: '+JSON.stringify(targets));
  const ws = new WebSocket(target.webSocketDebuggerUrl.replace('localhost','127.0.0.1'),{headers:{Origin:'http://127.0.0.1:8081'}});
  await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject});
  let id=0; const pending=new Map(); const events=[];
  ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);if(p){pending.delete(m.id);clearTimeout(p.timer);m.error?p.reject(new Error(JSON.stringify(m.error))):p.resolve(m.result)}}else events.push(m)};
  const send=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;const timer=setTimeout(()=>{pending.delete(n);reject(new Error('CDP timeout '+method))},120000);pending.set(n,{resolve,reject,timer});ws.send(JSON.stringify({id:n,method,params}))});
  await sleep(800);
  await send('Runtime.enable');
  async function evaluate(expression) {
    const r=await send('Runtime.evaluate',{expression,returnByValue:true});
    if(r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
    if(r.result?.subtype==='error') throw new Error(r.result.description);
    return r.result?.value;
  }
  async function asyncEval(expression,timeout=60000){
    const key='__perfResult'+Date.now();
    await evaluate(`globalThis[${JSON.stringify(key)}]={pending:true}; Promise.resolve().then(()=>(${expression})).then(value=>globalThis[${JSON.stringify(key)}]={value},e=>globalThis[${JSON.stringify(key)}]={error:String(e),stack:e.stack}); true`);
    const deadline=Date.now()+timeout;
    while(Date.now()<deadline){const v=await evaluate(`globalThis[${JSON.stringify(key)}]`);if(!v?.pending){await evaluate(`delete globalThis[${JSON.stringify(key)}]`);if(v.error)throw new Error(v.error+'\n'+v.stack);return v.value;}await sleep(100)}
    throw new Error('Async evaluation timed out');
  }
  return {target,events,send,evaluate,asyncEval,close:()=>ws.close()};
}
if(process.argv[1]?.endsWith('/cdp.mjs')){
 const c=await connect();try{const expr=process.argv[2]?.startsWith('@')?await fs.readFile(process.argv[2].slice(1),'utf8'):process.argv[2]??'({hermes:!!globalThis.HermesInternal,dev:__DEV__})';console.log(JSON.stringify(await c.evaluate(expr),null,2));}finally{c.close()}
}
