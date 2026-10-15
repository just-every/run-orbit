import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {get} from 'node:https';
import {connect} from 'node:net';
import {createHash,X509Certificate} from 'node:crypto';
import {availablePort} from '../../tests/support/available-port';
import {customCertificate} from '../../tests/support/http-listener-fixture';
import {workerDiagnostics} from './emitted-diagnostics';
import {TEST_SESSION_SECRET} from '../../tests/support/worker-identity.mjs';
/** Actual emitted Worker, TLS and a single owner of the fixture's persisted D1.
 * Bind the exact certificate identity; Wrangler otherwise defaults to localhost.
 * Keep the Worker request scheme HTTPS too: the emitted dev config retains HTTP. */
export async function emittedWorker(target:{directory:string;close():Promise<void>},configure?:(origin:string)=>Promise<void>,bindings:Record<string,string>={}){const port=await availablePort(),origin=`https://127.0.0.1:${port}`,certificate=await customCertificate(target.directory),secrets=join(target.directory,'native-auth.env'),fixtureCredential=crypto.randomUUID();await configure?.(origin);await writeFile(secrets,`AUTH_ORIGIN=${origin}\nMAIL_FROM=signin@fixture.test\nSENDGRID_API_KEY=${fixtureCredential}\n`+Object.entries({SESSION_SECRET:TEST_SESSION_SECRET,OWNER_EMAIL:'owner@orbit.test',...bindings}).map(([key,value])=>`${key}=${value}\n`).join(''),{mode:0o600});await target.close();
 const worker=spawn(process.execPath,['node_modules/wrangler/bin/wrangler.js','dev','--config','dist/server/wrangler.json','--local','--persist-to',target.directory,'--ip','127.0.0.1','--port',String(port),'--inspector-port','0','--local-protocol','https','--upstream-protocol','https','--https-key-path',certificate.keyPath,'--https-cert-path',certificate.certPath,'--env-file',secrets],{stdio:['ignore','pipe','pipe'],env:{...Object.fromEntries(['PATH','HOME','TMPDIR','USER','LANG','LC_ALL'].flatMap(name=>process.env[name]?[[name,process.env[name]!]]:[])),CI:'1',WRANGLER_SEND_METRICS:'false',WRANGLER_WRITE_LOGS:'false'}}),diagnostics=workerDiagnostics(worker,[fixtureCredential,...Object.values(bindings)]);
 let disposed=false;async function dispose(){if(disposed)return;disposed=true;if(worker.exitCode===null)worker.kill('SIGTERM');await diagnostics.closed;await new Promise<void>((resolve,reject)=>{const socket=connect(port,'127.0.0.1');socket.once('error',()=>resolve());socket.once('connect',()=>{socket.destroy();reject(new Error('Owned Worker port remained open.'));});});}
 try{let ready=false,lastStatus:number|undefined,lastTransportError:string|undefined;for(let attempt=0;attempt<300;attempt++){if(worker.exitCode!==null||diagnostics.spawnError)throw new Error('Emitted Worker exited before readiness; inspect its private sanitized log.');ready=await new Promise<boolean>(resolve=>{const request=get(origin+'/health',{ca:certificate.cert},response=>{lastStatus=response.statusCode;response.resume();resolve(response.statusCode===200);});request.on('error',(error:NodeJS.ErrnoException)=>{lastTransportError=error.code;resolve(false);});request.setTimeout(500,()=>request.destroy());});if(ready)break;await new Promise(resolve=>setTimeout(resolve,100));}assert.equal(ready,true,`Actual emitted Worker must become healthy (status ${lastStatus??'none'}, transport ${lastTransportError??'none'}; private log ${diagnostics.log})`);return{origin,port,pid:worker.pid,certificate,browserArgs:certificateTrust(certificate.cert),dispose};}catch(error){await dispose();throw error;}
}
/** Chromium trusts exactly this fixture key during the TLS handshake. A per-context
 * certificate-error override is decided after the handshake, so connections started
 * before a new context's first override fail and are retried until Chromium gives up. */
function certificateTrust(cert:string){return[`--ignore-certificate-errors-spki-list=${createHash('sha256').update(new X509Certificate(cert).publicKey.export({type:'spki',format:'der'})).digest('base64')}`];}
