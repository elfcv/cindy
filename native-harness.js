(() => {
const React=__perfRequire('/react/index.js'),RN=__perfRequire('/react-native/index.js');
const renderer=__perfRequire('/Libraries/ReactNative/RendererImplementation.js');
const Auth=__perfRequire('/auth/AuthContext.tsx').AuthProvider, Device=__perfRequire('/device-link/DeviceLinkContext.tsx').DeviceLinkProvider;
const Theme=__perfRequire('/theme/ThemeProvider.tsx').ThemeOverrideProvider;
const MessageRenderer=__perfRequire('/session/MessageRenderer.tsx').MessageRenderer;
const build=__perfRequire('/session/messageRenderModel.ts').buildMobileMessageRenderItems;
const metrics=__perfRequire('/session/mobileMarkdownRenderMetrics.ts');
const roots=Array.from(__REACT_DEVTOOLS_GLOBAL_HOOK__.renderers.keys()).flatMap(id=>Array.from(__REACT_DEVTOOLS_GLOBAL_HOOK__.getFiberRoots(id)));
const rootTag=roots.map(r=>r.containerInfo?.containerTag).find(Boolean);if(!rootTag)throw Error('No native root');
const Safe=__perfRequire('/react-native-safe-area-context/src/index.tsx').SafeAreaProvider;
const h=globalThis.__nativeChat={rootTag,commits:[],api:null,sequence:0,metrics,state:{key:'empty',items:[],theme:'light',streaming:false}};
h.paragraph=n=>Array.from({length:n},(_,i)=>`**字段${i}** 和 \`value${i}\` `).join('')+' ![图](https://example.invalid/a.png)';
h.messages=(turns,body)=>Array.from({length:turns},(_,i)=>[{id:'u-'+i,clientId:'u-'+i,sessionId:'synthetic',role:'user',content:{text:'合成问题 '+i,images:[],files:[]},toolUseId:null,agentMeta:null,createdAt:new Date(1700000000000+i*10000).toISOString()},{id:'a-'+i,clientId:'a-'+i,sessionId:'synthetic',role:'assistant',content:{text:body??`回复 ${i}：**内容** 与 \`code\`。 [说明](https://example.invalid)\n\n- 步骤一\n- 步骤二`},toolUseId:null,agentMeta:null,createdAt:new Date(1700000001000+i*10000).toISOString()}]).flat();
h.make=(turns,body,streaming=false)=>build(h.messages(turns,body),{isSessionStreaming:streaming});
h.Probe=function(){const [state,setState]=React.useState(h.state);h.setState=setState;React.useLayoutEffect(()=>{h.commits.push({at:performance.now(),key:state.key,streaming:state.streaming,count:state.items.length})},[state]);return React.createElement(Theme,{mode:state.theme},React.createElement(RN.View,{style:{flex:1,paddingTop:65,paddingBottom:30,backgroundColor:state.theme==='dark'?'#171717':'#fff'}},React.createElement(RN.Text,{style:{fontSize:16,color:state.theme==='dark'?'#eee':'#111',paddingHorizontal:12}},'伙伴聊天 · 合成数据 · '+state.key),React.createElement(MessageRenderer,{key:state.key,companion:true,items:state.items,isSessionStreaming:state.streaming,makerTurnRunning:state.streaming,scrollResetKey:state.key,focusedItemKey:state.focusKey??state.items[0]?.key,devExposeList:api=>h.api=api,testID:'chat.perf'})));};
h.show=(items,options={})=>{h.state={...h.state,...options,items};h.setState(h.state);};
h.mount=(items,options={})=>{h.api=null;h.show(items,{...options,key:'fixture-'+(++h.sequence)});};
h.fibers=()=>{const out=[];function walk(f){if(!f)return;out.push(f);walk(f.child);walk(f.sibling)}for(const r of roots)walk(r.current);return out;};
h.press=(id)=>{const f=h.fibers().find(f=>f.memoizedProps?.testID===id&&typeof f.memoizedProps.onPress==='function');if(!f)return false;f.memoizedProps.onPress();return true;};
h.visibleText=()=>h.fibers().filter(f=>f.tag===6||f.tag===5).map(f=>f.tag===6?f.memoizedProps:f.memoizedProps?.text).filter(x=>typeof x==='string').join('\n');
h.wait=ms=>new Promise(r=>setTimeout(r,ms));
h.measure=async(fn)=>{const gaps=[];let previous=performance.now(),active=true;const tick=()=>{const now=performance.now();gaps.push(now-previous);previous=now;if(active)requestAnimationFrame(tick)};requestAnimationFrame(tick);metrics.resetMobileMarkdownRenderMetrics();const start=performance.now();fn();await h.wait(1800);active=false;return {elapsedMs:performance.now()-start,maxRafGapMs:Math.max(...gaps),rafGaps:gaps,parse:metrics.getMobileMarkdownRenderMetrics(),list:h.api?.getMetrics(),commits:h.commits.slice(-3)};};
metrics.resetMobileMarkdownRenderMetrics();renderer.renderElement({rootTag,element:React.createElement(Safe,null,React.createElement(Auth,null,React.createElement(Device,null,React.createElement(h.Probe))))});return {rootTag};
})()
