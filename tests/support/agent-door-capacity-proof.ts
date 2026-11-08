import assert from 'node:assert/strict';
import type {TestContext} from 'node:test';
import {orbitAgentDoor} from '../../src/core/features/agent-door';
import type {PlatformBindings} from '../../src/core/platform/assets';
import {autonomousPolicy,heldPolicy,policyEnvelope} from '../../src/base/modules/agent-door/conformance/crypto.mjs';

/** Exercise raw MCP capacity without the conformance client's automatic retry. */
export async function agentCapacityProof(
  context:TestContext,bindings:PlatformBindings,
  signer:{privateKey:CryptoKey;kid:string;issuer:string;installationId:string},
  sign:(typ:string,claims:object)=>Promise<string>,
) {
  context.mock.timers.enable({apis:['Date'],now:new Date('2030-01-07T10:00:10Z')});
  try {
    const door=orbitAgentDoor(bindings),db=bindings.DB,origin=bindings.AUTH_ORIGIN!,business='door-company';
    let sequence=Number(await db.prepare("SELECT json_extract(envelope,'$.seq') FROM agent_door_state WHERE id=1").first("json_extract(envelope,'$.seq')"));
    let requestId=0;
    const witness=async()=>Promise.all(['companies','graph_records','timeline_entries','audit_entries','agent_door_calls','agent_door_approvals','agent_door_reviews']
      .map(async table=>(await db.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all()).results));
    for(const [mode,policy] of [['autonomous',autonomousPolicy()],['held',heldPolicy()]] as const) {
      const envelope=await policyEnvelope({origin,business,seq:++sequence,revision:sequence,signer},policy);
      const adopted=await door.handle(new Request(origin+'/api/rer/agent-policy',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({policy:envelope.policy})}));
      assert.equal(adopted!.status,200,await adopted!.clone().text());
      const agent='synthetic-orbit-capacity-'+mode,now=Math.floor(Date.now()/1000);
      const bearer=await sign('at+jwt',{iss:signer.issuer,aud:origin+'/mcp',sub:'business-owner',email:bindings.OWNER_EMAIL,
        act:{sub:agent,name:agent},client_id:'synthetic-orbit-capacity',business,scope:'records:read records:write',
        consent:'synthetic-orbit-capacity',jti:crypto.randomUUID(),iat:now,exp:now+300});
      async function raw(method:string,params:Record<string,unknown>={}) {
        const response=await door.handle(new Request(origin+'/mcp',{method:'POST',headers:{Authorization:'Bearer '+bearer,
          'Content-Type':'application/json',Accept:'application/json, text/event-stream','MCP-Protocol-Version':'2026-07-28',
          'MCP-Method':method,...(method==='tools/call'?{'MCP-Name':String(params.name)}:{})},
          body:JSON.stringify({jsonrpc:'2.0',id:++requestId,method,params:{...params,_meta:{'io.modelcontextprotocol/protocolVersion':'2026-07-28'}}})}));
        assert.ok(response);
        return {response,body:await response.json() as any};
      }
      const discover=await raw('server/discover');
      assert.equal(discover.response.status,200);
      const limit=discover.body.result._meta['com.runeditrun/limits'].requestsPerMinute;
      assert.ok(Number.isSafeInteger(limit)&&limit>0,'use the capacity advertised by the actual Orbit door');
      const listed=await raw('tools/list');
      assert.equal(listed.response.status,200);
      assert.ok(listed.body.result.tools.some((tool:{name:string})=>tool.name==='orbit.records.create'));
      const established=await db.prepare('SELECT sponsor,window,requests FROM agent_door_agents WHERE id=?').bind(agent).first<{sponsor:string;window:number;requests:number}>();
      assert.ok(established,'an admitted authenticated request establishes the agent');
      assert.equal(established.requests,1);
      // Prepare the existing native admission row, retaining its sponsor and window.
      const prepared=await db.prepare('UPDATE agent_door_agents SET requests=? WHERE id=? AND sponsor=? AND window=? AND revoked=0')
        .bind(limit-1,agent,established.sponsor,established.window).run();
      assert.equal(prepared.meta.changes,1);
      const args=(suffix:string)=>({kind:'company',record:{name:agent+'-'+suffix},idempotency_key:agent+'-'+suffix});
      const beforeControl=await witness();
      const control=await raw('tools/call',{name:'orbit.records.create',arguments:args('control')});
      assert.equal(control.response.status,200);
      assert.equal(control.body.result.isError,false,JSON.stringify(control.body));
      assert.equal(control.body.result._meta['com.runeditrun/decision'].disposition,mode==='held'?'review':'autonomous');
      const controlId=control.body.result.structuredContent.id;
      assert.equal(await db.prepare('SELECT name FROM companies WHERE id=?').bind(controlId).first('name'),agent+'-control');
      const beforeRefusal=await witness();
      assert.notDeepEqual(beforeRefusal,beforeControl,'the native effect witness detects admitted writes');
      const refusedArgs=args('refused');
      async function overrun() {
        const refused=await raw('tools/call',{name:'orbit.records.create',arguments:refusedArgs});
        assert.equal(refused.response.status,429,JSON.stringify(refused.body));
        assert.equal(refused.body.error.data.code,'rate_limited');
        assert.equal(refused.body.result,undefined,'capacity refusal is a transport error, never a tool result');
        const header=refused.response.headers.get('Retry-After');
        assert.match(header??'',/^[1-9]\d*$/,'Retry-After is a usable positive delay in seconds');
        const delay=Number(header);
        assert.ok(Number.isSafeInteger(delay));
        assert.deepEqual(await witness(),beforeRefusal,'a refused native write leaves records, history and admission effects unchanged');
        return delay;
      }
      const delay=await overrun();
      context.mock.timers.tick((delay-1)*1000);
      assert.equal(await overrun(),1,'capacity stays closed immediately before the advertised retry time');
      context.mock.timers.tick(1000);
      const recovered=await raw('tools/call',{name:'orbit.records.create',arguments:refusedArgs});
      assert.equal(recovered.response.status,200);
      assert.equal(recovered.body.result.isError,false,JSON.stringify(recovered.body));
      assert.equal(recovered.response.headers.get('Retry-After'),null);
      assert.equal(await db.prepare('SELECT name FROM companies WHERE id=?').bind(recovered.body.result.structuredContent.id).first('name'),refusedArgs.record.name);
      assert.equal(await db.prepare('SELECT count(*) FROM companies WHERE name=?').bind(refusedArgs.record.name).first('count(*)'),1,'the previously refused request produces exactly one effect after recovery');
      assert.equal(await db.prepare('SELECT requests FROM agent_door_agents WHERE id=?').bind(agent).first('requests'),1,'the new capacity window admits the call');
      console.log(`PROBE BASE-AGENT-011 1: raw authenticated MCP under ${mode}; discovered capacity=${limit}; admitted native create; overrun=429 Retry-After=${delay}; early retry=429; clock recovery=200 with one native create`);
    }
  } finally {context.mock.timers.reset();}
}
