import assert from 'node:assert/strict';
/** Documented Zendesk API shapes; only the HTTP boundary is replaced. */
export function zendeskNetwork(){
 const token='synthetic-orbit-token-1',signingSecret='synthetic-orbit-signature-1',email=['synthetic-orbit-1','example.test'].join('@'),subdomain='synthetic-orbit-1';
 const organizations=new Map<number,{id:number;name:string;domain_names:string[]}>([[11,{id:11,name:'synthetic-orbit-1',domain_names:['synthetic-orbit-1.test']}],[22,{id:22,name:'synthetic-orbit-other',domain_names:['synthetic-orbit-other.test']}]]);
 const ticket=(id:number,organization=11)=>({id,organization_id:organization,subject:`synthetic-orbit-ticket-${id}`,priority:'high',status:'open',updated_at:'2026-11-01T12:00:00Z',description:'synthetic-orbit-hidden-description',comments:[{body:'synthetic-orbit-hidden-comment'}],attachments:[{url:'https://example.test/hidden-file'}]});
 const tickets=new Map<number,ReturnType<typeof ticket>>([[101,ticket(101)],[102,ticket(102)]]),unreadable=new Set<number>(),calls:{method:string;path:string;body:any}[]=[],creates:any[]=[];
 let revoked=false,uncertain=false,beforeRead:(()=>Promise<void>)|undefined;
 const fetcher:typeof fetch=async(input,init)=>{
  const url=new URL(String(input));assert.equal(url.origin,`https://${subdomain}.zendesk.com`);assert.equal(init?.redirect,'manual');
  const auth=new Headers(init?.headers).get('Authorization'),method=init?.method??'GET',body=init?.body?JSON.parse(String(init.body)):null;
  assert.ok(auth?.startsWith('Basic '));calls.push({method,path:url.pathname,body});
  if(revoked||auth!==`Basic ${btoa(`${email}/token:${token}`)}`)return Response.json({error:'Unauthorized'},{status:401});
  if(url.pathname==='/api/v2/users/me.json')return Response.json({user:{id:1,role:'admin',active:true,suspended:false}});
  const org=/^\/api\/v2\/organizations\/(\d+)\.json$/.exec(url.pathname);if(org)return organizations.has(Number(org[1]))?Response.json({organization:organizations.get(Number(org[1]))}):Response.json({error:'RecordNotFound'},{status:404});
  const list=/^\/api\/v2\/organizations\/(\d+)\/tickets\.json$/.exec(url.pathname);if(list){if(beforeRead){const action=beforeRead;beforeRead=undefined;await action();}return Response.json({tickets:[...tickets.values()].filter(t=>t.organization_id===Number(list[1])),next_page:null});}
  const single=/^\/api\/v2\/tickets\/(\d+)\.json$/.exec(url.pathname);if(single){const id=Number(single[1]);return unreadable.has(id)?Response.json({error:'Forbidden'},{status:403}):tickets.has(id)?Response.json({ticket:tickets.get(id)}):Response.json({error:'RecordNotFound'},{status:404});}
  if(url.pathname==='/api/v2/tickets.json'&&method==='POST'){
   creates.push(body);if(uncertain)throw new TypeError('synthetic-orbit-uncertain');
   const created={...ticket(200+creates.length,body.ticket.organization_id),subject:body.ticket.subject};tickets.set(created.id,created);return Response.json({ticket:created},{status:201});
  }
  throw Error(`Unexpected Zendesk HTTP resource ${method} ${url.pathname}`);
 };
 return{token,signingSecret,email,subdomain,organizations,tickets,unreadable,calls,creates,fetcher,setRevoked:(value:boolean)=>revoked=value,setUncertain:(value:boolean)=>uncertain=value,beforeRead:(action:()=>Promise<void>)=>beforeRead=action};
}
