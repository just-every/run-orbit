import {expect} from '@playwright/test';
import {join} from 'node:path';
import {createHash,randomBytes} from 'node:crypto';
import {eml} from '../support/capture-mail.ts';

/** The existing Capture journey also opens populated native graph review. */
export async function graphProposalScreens({page,screenshots}){
 const origin=new URL(page.url()).origin,tag='synthetic-orbit-graph-'+Date.now();
 const post=async(path,data,form=false)=>{
  const r=await page.request.post(path,{headers:{Origin:origin},...(form?{form:data}:{data})});
  expect(r.ok()||r.status()===303,await r.text()).toBe(true);return r;
 };
 const create=async(kind,data)=>(await (await post('/api/v1/records/'+kind,data)).json()).id;
 const company=await create('company',{name:'Synthetic graph review account',primary_domain:tag+'.example'});
 const email=['buyer',tag+'.example'].join('@');
 const contact=await create('contact',{name:'Synthetic graph review buyer',company_id:company,email,job_title:'Analyst',contactability:'do_not_contact'});
 const settings=await (await page.request.get('/api/v1/settings')).json();
 const deal=await create('opportunity',{title:'Synthetic graph review deal',company_id:company,stage_id:settings.stages[0].id,contact_ids:[contact],primary_contact_id:contact,expected_close_at:'2026-12-01T00:00:00.000Z',value_cents:4000});
 const lines=['My new job title is Director of Operations.','Our close date moves from December 1 to December 15.','Who makes the final decision?'];
 const uploaded=await page.request.post('/api/v1/capture/imports',{headers:{Origin:origin},multipart:{files:{name:'synthetic-orbit.eml',mimeType:'message/rfc822',buffer:Buffer.from(eml({From:`Synthetic graph review buyer <${email}>`,To:['seller','orbit.test'].join('@'),Subject:tag,Date:new Date().toUTCString(),'Message-ID':`<${tag}>`},lines.join('\n')))}}});expect(uploaded.status()).toBe(201);
 const pending=(await (await page.request.get(`/api/v1/capture/proposals?recordType=company&recordId=${company}`)).json()).proposals;
 const signal=pending.find(p=>p.kind==='link_signal').signal_id;
 expect(signal).toBeTruthy();
 const client=tag,callback=origin+'/delegation/callback',verifier=randomBytes(32).toString('hex'),challenge=createHash('sha256').update(verifier).digest('base64url');
 await post('/delegation/clients',{id:client,redirect_uri:callback},true);
 const consent=await page.request.post('/delegation/authorize',{maxRedirects:0,headers:{Origin:origin},form:{client_id:client,redirect_uri:callback,response_type:'code',state:tag,code_challenge:challenge,code_challenge_method:'S256',account_id:'workspace',scope:'crm.evidence.read crm.graph.propose',targets:JSON.stringify([`companies/${company}`,`contacts/${contact}`,`opportunities/${deal}`,`signals/${signal}`])}});
 expect(consent.status(),await consent.text()).toBe(303);
 const code=new URL(consent.headers()['location']).searchParams.get('code');
 const token=await (await post('/api/delegation/v1/token',{grant_type:'authorization_code',client_id:client,redirect_uri:callback,code,code_verifier:verifier},true)).json();
 const answer=await page.request.post('/mcp',{headers:{Authorization:'Bearer '+token.access_token,'MCP-Protocol-Version':'2026-07-28','MCP-Method':'tools/call','MCP-Name':'orbit.graph.propose'},data:{jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'orbit.graph.propose',arguments:{company_id:company,signal_id:signal,job_change:{id:contact,value:'Director of Operations',citation:{quote:lines[0],label:'observed'}},close_date:{id:deal,value:'2026-12-15T00:00:00.000Z',citation:{quote:lines[1],label:'observed'}},question:{quote:lines[2],label:'inferred'},idempotency_key:tag},_meta:{'io.modelcontextprotocol/protocolVersion':'2026-07-28'}}}});
 expect(answer.status()).toBe(200);const result=await answer.json();expect(result.result.isError,JSON.stringify(result)).toBe(false);
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:900});await page.goto(`/app/companies/${company}`,{waitUntil:'networkidle'});
  if(width===1440){
   const job=page.getByRole('article',{name:'Set job_title from this message'});
   await expect(job).toContainText(lines[0]);await expect(job).toContainText('Director of Operations');await expect(job).toContainText('Proposed by '+client+' for');await expect(job).toContainText('observed');await expect(job).toContainText(signal);
   await expect(page.getByRole('article',{name:'Set expected_close_at from this message'})).toContainText(lines[1]);
   await expect(page.getByRole('article',{name:'Who is the decision-maker for this deal?'})).toContainText('no contact or stakeholder role is created');
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
  await page.screenshot({path:join(screenshots,`graph-review-${width}.png`),fullPage:true});
 }
 await page.setViewportSize({width:1440,height:900});
}
