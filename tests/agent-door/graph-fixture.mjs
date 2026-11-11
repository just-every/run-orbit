import {createHash,randomBytes,randomUUID} from 'node:crypto';

/** Genuine native consent and uploaded mail for each conformance policy phase. */
export async function graphFixture({request,origin,cookie}){
 const tag='synthetic-orbit-graph-'+randomUUID();
 const send=async(path,body,form=false,redirect='follow')=>{
  const response=await request(new URL(path,origin).href,{method:'POST',redirect,headers:{Cookie:cookie,Origin:origin,'Content-Type':form?'application/x-www-form-urlencoded':'application/json'},body:form?new URLSearchParams(body).toString():JSON.stringify(body)});
  if(response.status>=400)throw new Error('Native graph fixture request refused');return response;
 };
 const create=async(kind,record)=>(await (await send('/api/v1/records/'+kind,record)).json()).id;
 const company=await create('company',{name:tag,primary_domain:tag+'.example'});
 const email=['buyer',tag+'.example'].join('@');
 const contact=await create('contact',{name:'Synthetic graph fixture buyer',email,company_id:company,job_title:'Analyst',contactability:'do_not_contact'});
 const settings=await (await request(new URL('/api/v1/settings',origin).href,{headers:{Cookie:cookie}})).json();
 const deal=await create('opportunity',{title:tag,company_id:company,stage_id:settings.stages[0].id,value_cents:4000,contact_ids:[contact],primary_contact_id:contact,expected_close_at:'2026-12-01T00:00:00.000Z'});
 const lines=['My job title is now Director of Operations.','The close date is December 15 instead of December 1.','Who makes the final decision?'];
 const raw=`From: Synthetic graph fixture buyer <${email}>\r\nTo: seller\r\nSubject: ${tag}\r\nDate: ${new Date().toUTCString()}\r\nMessage-ID: <${tag}>\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n${lines.join('\r\n')}`;
 const form=new FormData();form.append('files',new File([raw],'synthetic-orbit.eml'));
 const imported=await request(new URL('/api/v1/capture/imports',origin).href,{method:'POST',headers:{Cookie:cookie,Origin:origin},body:form});
 if(imported.status!==201)throw new Error('Native graph fixture mail refused');
 const review=await (await request(new URL(`/api/v1/capture/proposals?recordType=company&recordId=${company}`,origin).href,{headers:{Cookie:cookie}})).json();
 const signal=review.proposals.find(p=>p.kind==='link_signal')?.signal_id;
 if(!signal)throw new Error('Native graph fixture evidence absent');
 const callback='https://assistant.example.test/callback',verifier=randomBytes(32).toString('hex');
 await send('/delegation/clients',{id:tag,redirect_uri:callback},true);
 const consent=await send('/delegation/authorize',{client_id:tag,redirect_uri:callback,response_type:'code',state:randomUUID(),code_challenge:createHash('sha256').update(verifier).digest('base64url'),code_challenge_method:'S256',account_id:'workspace',scope:'crm.evidence.read crm.graph.propose',targets:JSON.stringify([`companies/${company}`,`contacts/${contact}`,`opportunities/${deal}`,`signals/${signal}`])},true,'manual');
 if(consent.status!==303)throw new Error('Native graph fixture consent refused');
 const code=new URL(consent.headers.get('location')).searchParams.get('code');
 const credential=await (await send('/api/delegation/v1/token',{grant_type:'authorization_code',client_id:tag,redirect_uri:callback,code,code_verifier:verifier},true)).json();
 const identity=await (await request(new URL('/api/delegation/v1/identity',origin).href,{headers:{Authorization:'Bearer '+credential.access_token}})).json();
 return {values:{graph:{company_id:company,signal_id:signal,job_change:{id:contact,value:'Director of Operations',citation:{quote:lines[0],label:'observed'}},close_date:{id:deal,value:'2026-12-15T00:00:00.000Z',citation:{quote:lines[1],label:'observed'}},question:{quote:lines[2],label:'inferred'}}},clients:{graph:{token:credential.access_token,clientId:'orbit-delegation:'+identity.grantId,agent:{id:tag,name:tag,specialist:'sales rep'}}}};
}
