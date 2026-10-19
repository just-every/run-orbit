import {createServer} from 'node:net';
import {existsSync,readFileSync} from 'node:fs';
// A free port chosen outside automatic allocation, like the fixed verification
// ports. A kernel-chosen port (listen on 0) is released before its new owner binds
// it, and Wrangler's own port-0 listeners started in that window can be handed the
// same port, so the Worker exits with EADDRINUSE before readiness.
const first=20000,last=31999;
const ephemeral='/proc/sys/net/ipv4/ip_local_port_range';
if(existsSync(ephemeral)&&Number(readFileSync(ephemeral,'utf8').trim().split(/\s+/)[0])<=last)throw new Error(`Test ports ${first}-${last} overlap automatic allocation (${readFileSync(ephemeral,'utf8').trim()}).`);
const free=(port:number)=>new Promise<boolean>(resolve=>{const server=createServer();server.once('error',()=>resolve(false));server.listen(port,'127.0.0.1',()=>server.close(()=>resolve(true)));});
export async function availablePort(){for(let attempt=0;attempt<100;attempt++){const port=first+Math.floor(Math.random()*(last-first+1));if(await free(port))return port;}throw new Error(`No free test port in ${first}-${last}.`);}
