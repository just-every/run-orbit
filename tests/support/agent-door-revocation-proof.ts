import assert from 'node:assert/strict';
import {orbitAgentDoor} from '../../src/core/features/agent-door';
import type {PlatformBindings} from '../../src/core/platform/assets';

/** Native owner revocation also closes the authenticated transport handshakes. */
export async function agentDoorRevocationProof(
  bindings:PlatformBindings,cookie:string,companyId:string,
  tokenFor:(agent:string)=>Promise<string>,setPolicy:(mode:'autonomous'|'held')=>Promise<void>,
) {
  const origin=bindings.AUTH_ORIGIN!,door=orbitAgentDoor(bindings),version='2026-07-28';
  async function rpc(token:string,method:string,params:Record<string,unknown>={}) {
    const response=await door.handle(new Request(origin+'/mcp',{method:'POST',headers:{
      Authorization:'Bearer '+token,'Content-Type':'application/json',Accept:'application/json, text/event-stream',
      'MCP-Protocol-Version':version,'MCP-Method':method,...(method==='tools/call'?{'MCP-Name':String(params.name)}:{}),
    },body:JSON.stringify({jsonrpc:'2.0',id:126,method,params:{...params,_meta:{'io.modelcontextprotocol/protocolVersion':version}}})}));
    assert.ok(response);
    return {status:response.status,challenge:response.headers.get('www-authenticate'),body:await response.json() as any};
  }
  const ownerRequest=(path:string,method='GET')=>new Request(origin+path,{method,headers:{Cookie:cookie,Origin:origin}});
  const tables=(await bindings.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT GLOB 'sqlite_*' AND name NOT GLOB '_cf_*' AND name NOT GLOB 'd1_*' AND name<>'agent_door_agents' ORDER BY name").all<{name:string}>()).results;
  const nativeState=async()=>{
    const rows=await bindings.DB.batch(tables.map(({name})=>bindings.DB.prepare(`SELECT * FROM "${name.replaceAll('"','""')}"`)));
    return Object.fromEntries(await Promise.all(tables.map(async({name},index)=>{
      // The owner's authenticated revocation touches session activity, never its authority.
      const content=JSON.stringify(rows[index]!.results.map(row=>JSON.stringify(name==='sessions'?{...row,last_seen_at:null}:row)).sort());
      const digest=Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(content))).toString('hex');
      return [name,digest];
    })));
  };
  for(const mode of ['autonomous','held'] as const) {
    await setPolicy(mode);
    const agent='synthetic-orbit-revoked-'+mode,control='synthetic-orbit-admitted-'+mode;
    const retained=await tokenFor(agent),allowedToken=await tokenFor(control);
    // Both identities first perform a real native read, creating their admission records.
    for(const token of [retained,allowedToken]) {
      const read=await rpc(token,'tools/call',{name:'orbit.records.read',arguments:{kind:'company',id:companyId}});
      assert.equal(read.status,200);assert.equal(read.body.result.isError,false);
      assert.equal(read.body.result.structuredContent.ref.id,companyId);
    }
    const before=await nativeState();
    for(const token of [retained,allowedToken])for(const method of ['initialize','server/discover']) {
      const answer=await rpc(token,method,{protocolVersion:version,capabilities:{},clientInfo:{name:'synthetic-orbit-126',version:'1'}});
      assert.equal(answer.status,200);assert.equal(answer.body.error,undefined);
      assert.ok(answer.body.result.capabilities.tools);
    }
    const path='/agents/api/agents/'+encodeURIComponent(agent)+'/revoke';
    assert.equal((await door.handle(new Request(origin+path,{method:'POST',headers:{Origin:origin}})))!.status,401,'revocation needs a native person session');
    const revoked=await door.handle(ownerRequest(path,'POST'));
    assert.equal(revoked!.status,200);assert.deepEqual(await revoked!.json(),{revoked:true});
    const roster=await (await door.handle(ownerRequest('/agents/api/agents')))!.json() as {agents:Array<{id:string;revoked:boolean}>};
    assert.equal(roster.agents.find(row=>row.id===agent)?.revoked,true);
    assert.equal(roster.agents.find(row=>row.id===control)?.revoked,false,'only the exact native identity was revoked');
    const fresh=await tokenFor(agent);assert.notEqual(fresh,retained,'the second credential is newly issued for the same agent');
    for(const [credential,token] of [['retained',retained],['fresh',fresh]] as const)for(const method of ['initialize','server/discover']) {
      const answer=await rpc(token,method,{protocolVersion:version,capabilities:{},clientInfo:{name:'synthetic-orbit-126',version:'1'}});
      assert.equal(answer.status,401,mode+' '+credential+' '+method+' refuses the next call after native revocation');
      assert.equal(answer.challenge,'Bearer resource_metadata="'+origin+'/.well-known/oauth-protected-resource/mcp"');
      assert.deepEqual(answer.body,{jsonrpc:'2.0',id:126,error:{code:-32001,message:'Unauthorized'}});
      assert.equal(answer.body.result,undefined,'revoked handshakes expose no success result');
      const controlAnswer=await rpc(allowedToken,method,{protocolVersion:version,capabilities:{},clientInfo:{name:'synthetic-orbit-126',version:'1'}});
      assert.equal(controlAnswer.status,200);assert.equal(controlAnswer.body.error,undefined);
      assert.ok(controlAnswer.body.result.capabilities.tools,'a separate admitted agent still negotiates the transport');
    }
    assert.deepEqual(await nativeState(),before,mode+': handshake success and revocation refusals leave native records and write effects unchanged');
    console.log(JSON.stringify({proof:'BASE-AGENT-004.6',mode,methods:['initialize','server/discover'],credentials:['retained','fresh'],refused:401,resourceMetadata:true,successResult:false,control:200,unchangedNativeTables:tables.length}));
  }
}
