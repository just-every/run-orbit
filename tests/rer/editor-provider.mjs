// Labeled management provider fixture. No real service auth or API is simulated in product code.
import { createServer } from 'node:http';
export async function fixtureProvider() {
  const state = { allowed: '', mode: 'valid', requests: 0 };
  const server=createServer((req,res)=>{
    state.requests++;
    res.setHeader('content-type','text/html');
    res.setHeader('content-security-policy',`frame-ancestors ${state.mode==='denied'?"'none'":state.allowed}`);
    res.end(`<!doctype html><html><body><div style="width:min(350px,calc(100vw - 16px));box-sizing:border-box;padding:20px;background:white;border:1px solid #bbc;border-radius:12px;font:16px system-ui">Labeled local management fixture</div><script>
const parentOrigin=new URL(location.href).searchParams.get('parentOrigin');
const installationId=new URL(location.href).searchParams.get('installation');
let sessionId;window.received=[];
function send(type,payload={}) { parent.postMessage({...payload,protocol:'rer-editor',version:1,installationId,type,...(sessionId?{sessionId}:{})},parentOrigin); }
window.send=send;
function regions(){if(sessionId)send('interactive-regions',{viewport:{width:innerWidth,height:innerHeight},regions:[{x:8,y:8,width:Math.min(350,innerWidth-16),height:100}]});}
addEventListener('resize',regions);
addEventListener('message',e=>{if(e.origin!==parentOrigin||e.source!==parent)return;const m=e.data;window.received.push(m);if(m.type==='protocol-offer') {sessionId=m.sessionId;if(${JSON.stringify(state.mode)}==='valid')send('protocol-accept');else if(${JSON.stringify(state.mode)}==='incompatible')parent.postMessage({protocol:'rer-editor',version:999,installationId,type:'ready'},parentOrigin);}if(m.type==='protocol-connected'||m.type==='editor-visibility')regions();});
parent.postMessage({protocol:'rer-editor',version:${state.mode==='incompatible'?999:1},installationId,type:'ready'},parentOrigin);
</script></body></html>`);
  });
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  return { state, origin:`http://127.0.0.1:${server.address().port}`, close:()=>new Promise(r=>server.close(r)) };
}
