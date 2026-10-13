import {createServer} from 'node:https';
import {connect} from 'node:net';
import type {Hono} from 'hono';
import {customCertificate,serverOrigin,closeServer} from '../../tests/support/http-listener-fixture';

/** Real native Hono/D1 handler over TLS; fault injection stays at D1's ACK boundary. */
export async function nativeArchiveHttp(app:Hono<any>,directory:string){
 const certificate=await customCertificate(directory);let origin='';
 const server=createServer({key:certificate.key,cert:certificate.cert},async(request,response)=>{try{
  const chunks:Buffer[]=[];for await(const chunk of request)chunks.push(Buffer.from(chunk));
  const headers=new Headers();for(const [name,value] of Object.entries(request.headers))if(value!==undefined)headers.set(name,Array.isArray(value)?value.join(','):value);
  const result=await app.request(new Request(origin+request.url,{method:request.method,headers,...(!['GET','HEAD'].includes(request.method??'GET')?{body:Buffer.concat(chunks)}:{})}));
  response.writeHead(result.status,Object.fromEntries(result.headers));response.end(Buffer.from(await result.arrayBuffer()));
 }catch{response.writeHead(500);response.end('Native test transport failed.');}});
 const url=await serverOrigin(server,'127.0.0.1',true);origin=url.origin;
 return{origin,certificate,async dispose(){await closeServer(server);await new Promise<void>((resolve,reject)=>{const socket=connect(Number(url.port),'127.0.0.1');socket.once('error',()=>resolve());socket.once('connect',()=>{socket.destroy();reject(Error('Owned native test listener remained open'));});});}};
}
