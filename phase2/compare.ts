import {strict as assert} from 'node:assert';
import * as before from '/Users/elfcv/Documents/Codex/cindy-mobile-chat-history/apps/mobile/node_modules/.cache/chat-phase2-baseline/messageMarkdown.ts';
import * as after from '/Users/elfcv/Documents/Codex/cindy-mobile-chat-history/apps/mobile/src/session/messageMarkdown.ts';
const atoms=['word ', '中文 ', '**粗体** ', '`code` ', 'abc123，。;；、=+- ', '\t', '\n', '**a b** ', '`a b` '];
const syntax=['![x](src/a.png)', '[file](src/a.ts:3)', 'src/a.ts', 'C:\\foo\\a.ts', 'https://example.invalid/a', '**', '*', '_', '~~', '`', '```', '\\', '$x$', '\\(x\\)', '<!-- hidden -->', '<div>', '<img src="src/a.png">', '\n---\n', '\n# h\n', '\n\n', '😀', '\u0301', '[', ']', '(', ')', 'a.b', '**x**_y_', '**https://example.invalid/a**'];
let seed=6015; const rand=()=>seed=(Math.imul(seed,1664525)+1013904223)>>>0;
let checks=0;
for(let n=0;n<1200;n++) {
 let text=Array.from({length:160},()=>atoms[rand()%atoms.length]).join('');
 // Include old non-incremental behavior as the oracle: both new paths could
 // otherwise agree on the same incorrect split.
 let prev=after.parseMobileMarkdownIncremental(text);
 assert.deepEqual(prev.blocks,before.parseMobileMarkdown(text));checks++;
 const suffix=Array.from({length:3},()=>syntax[rand()%syntax.length]).join(n%2?' ':'');
 for(let p=0;p<suffix.length;p++){
  text+=suffix[p];prev=after.parseMobileMarkdownIncremental(text,prev);
  try { assert.deepEqual(prev.blocks,before.parseMobileMarkdown(text));assert.deepEqual(after.parseMobileMarkdown(text),before.parseMobileMarkdown(text)); }
  catch(e){console.error(JSON.stringify({n,p,text}));throw e;}
  checks++;
 }
 const edit='changed '+text.slice(16);assert.deepEqual(after.parseMobileMarkdownIncremental(edit,prev).blocks,before.parseMobileMarkdown(edit));checks++;
}
console.log(JSON.stringify({checks,seed:6015,oracle:'HEAD 2b79f51a full document',passed:true}));
for(const step of [64,256,1024]) {
 const text=Array.from({length:800},(_,i)=>`**字段${i}** 和 \`value${i}\` `).join('');
 const rows=[];
 for(let sample=0;sample<3;sample++)for(const variant of sample%2?['after','before']:['before','after']){
  const parser=variant==='before'?before:after;let prev=null;let reused=0;let max=0;const start=performance.now();
  for(let end=step;end<text.length+step;end+=step){const t=performance.now();prev=parser.parseMobileMarkdownIncremental(text.slice(0,end),prev);max=Math.max(max,performance.now()-t);reused+=prev.reusedInlineUtf16Length??0;}
  rows.push({variant,sample,ms:performance.now()-start,max,reused});
 }
 console.log(JSON.stringify({step,rows}));
}
