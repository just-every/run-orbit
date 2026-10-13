import assert from 'node:assert/strict';
import {readdirSync} from 'node:fs';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {eml,type CaptureFixture} from './capture-fixture';
import {createId} from '../../src/core/shared/ids';
import {finish,json} from './crm-import-flow';
import {importCopies} from './crm-import-privacy';

export async function captureErasureFixture(f:CaptureFixture){
 const alias='ana.old@acme.example',words='Our budget is 40k and I am leaving Acme in December.',aliasWords='Her retired mailbox must also disappear.',privateWords='Private account planning statement 47 thousand';
 await f.db.prepare("INSERT INTO record_aliases VALUES('contact',?,?,?,?)").bind(alias,f.ana,createId(),new Date().toISOString()).run();
 const post=(path:string,body:unknown={})=>f.request(`/api/v1/${path}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
 const stage=await f.db.prepare('SELECT stage_id FROM opportunities WHERE id=?').bind(f.opportunity).first('stage_id');
 const opportunity=await json(await post('records/opportunity',{title:'Bob expansion',stage_id:stage,value_cents:0,company_id:f.company,contact_ids:[f.bob],primary_contact_id:f.bob}));
 const message=(id:string,body:string,headers:Record<string,string>={})=>eml({From:'Bob Stone <bob@acme.example>',To:'seller@orbit.test',Date:new Date(Date.now()-60000).toUTCString(),'Message-ID':`<${id}@acme.example>`,...headers},body);
 const files=[
  {name:'quoted.eml',text:message('quoted','Looping back.\n\nOn Mon, Ana Ruiz <ana@acme.example> wrote:\n> '+words)},
  {name:'reply-to.eml',text:message('reply-to',`${privateWords}\nPhone: +1 415 555 0123`,{'Reply-To':'Ana Ruiz <ANA@acme.example>'})},
  {name:'alias-quoted.eml',text:message('alias-quoted',`Looping back.\n\nOn Mon, Ana Ruiz <${alias}> wrote:\n> ${aliasWords}`)},
  {name:'alias-reply-to.eml',text:message('alias-reply-to','Phone: +1 212 555 0185',{'Reply-To':`Ana Ruiz <${alias}>`})},
  ...['joana@acme.example','ana@acme.example.evil.invalid','x.ana@acme.example','ana.old@acme.example.evil.invalid'].map((email,index)=>({name:`lookalike-${index}.eml`,text:message(`lookalike-${index}`,`Distinct customer <${email}> has separate words.`,{'Reply-To':email})})),
 ];
 assert.equal((await f.upload(files)).status,201);
 const proposals=(await f.db.prepare("SELECT p.* FROM capture_proposals p JOIN capture_items i ON i.signal_id=p.signal_id WHERE i.headers LIKE '%<reply-to@acme.example>%' ORDER BY p.id").all<{id:string;kind:string;record_id:string;signal_id:string}>()).results;
 const queue=proposals.find(p=>p.kind==='next_action'&&p.record_id===opportunity.id)!;
 assert.ok(queue,'the private original proposes a queue change on Bob\'s opportunity');
 await json(await post(`capture/proposals/${queue.id}/accept`));
 await json(await post(`capture/proposals/${proposals.find(p=>p.kind==='link_signal')!.id}/decline`));
 const phone=await f.db.prepare("SELECT p.id FROM capture_proposals p JOIN capture_items i ON i.signal_id=p.signal_id WHERE i.headers LIKE '%<alias-reply-to@acme.example>%' AND p.field='phone'").first<{id:string}>();
 await json(await post(`capture/proposals/${phone!.id}/accept`));
 assert.equal(await f.db.prepare("SELECT status FROM capture_proposals WHERE id=?").bind(proposals.find(p=>p.kind==='set_field')!.id).first('status'),'pending');
 const copied=await f.db.prepare("SELECT payload_json FROM timeline_entries WHERE json_extract(payload_json,'$.proposalId')=?").bind(queue.id).first<string>('payload_json');
 assert.ok(copied?.includes(privateWords)&&!JSON.parse(copied).signalId,'accepted non-contact timeline evidence is a real proposal-only copy');
 const bobBefore=await f.db.prepare('SELECT * FROM contacts WHERE id=?').bind(f.bob).first();
 const queueValue=async()=>f.db.prepare('SELECT queue_state,queue_reason,next_due_at FROM opportunities WHERE id=?').bind(opportunity.id).first();
 const queueBefore=await queueValue();
 const retained=async()=>({
  items:(await f.db.prepare("SELECT * FROM capture_items WHERE headers LIKE '%lookalike-%' ORDER BY id").all()).results,
  signals:(await f.db.prepare("SELECT s.* FROM signals s JOIN capture_items i ON i.signal_id=s.id WHERE i.headers LIKE '%lookalike-%' ORDER BY s.id").all()).results,
  proposals:(await f.db.prepare("SELECT p.* FROM capture_proposals p JOIN capture_items i ON i.signal_id=p.signal_id WHERE i.headers LIKE '%lookalike-%' ORDER BY p.id").all()).results,
 });
 const before=await retained();assert.equal(before.items.length,4);
 const importFixture={request:(path:string,method='GET',body?:unknown)=>f.request(`/api/v1/${path}`,{method,headers:{'content-type':'application/json'},...(method!=='GET'?{body:JSON.stringify(body??{})}:{})})};
 const source={vendor:'hubspot',account:'Capture erasure copies',files:[{kind:'contact',name:'contacts.csv',csv:`Record ID,Email,First Name\r\nperson-1,ana@acme.example,Ana\r\nperson-2,${alias},Ana`,mapping:{id:'Record ID',email:'Email',first_name:'First Name'},separator:';'}],stages:{}};
 const review=await json(await importFixture.request('imports/dry-run','POST',source));
 await finish(importFixture,review);
 assert.ok((await importCopies(f.db)).includes(alias),'decoded uploaded originals must exercise the alias');
 const identities=['ana@acme.example',alias];
 const carriesIdentity=(text:string)=>identities.some(identity=>new RegExp(`(^|[^a-z0-9.!#$%&'*+/=?^_\x60{|}~@-])${identity.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}(?=$|[^a-z0-9_@.-]|\\.(?![a-z0-9_@.-]))`,'i').test(text));
 const items=(await f.db.prepare('SELECT * FROM capture_items').all<{id:string;signal_id:string;headers:string;body:string}>()).results;
 const signalIds=items.filter(item=>carriesIdentity(JSON.stringify(item))).map(item=>item.signal_id);
 const proposalIds=(await f.db.prepare("SELECT id FROM capture_proposals WHERE signal_id IN(SELECT value FROM json_each(?)) OR (record_type='contact' AND record_id=?) OR EXISTS(SELECT 1 FROM json_each(details_json,'$.contactIds') WHERE value=?)").bind(JSON.stringify(signalIds),f.ana,f.ana).all<{id:string}>()).results.map(row=>row.id);
 assert.ok(signalIds.includes(queue.signal_id)&&proposalIds.includes(queue.id)&&proposalIds.length>proposals.length,'scan covers exact owned IDs across accepted, declined and pending proposals');
 const matches=(text:string)=>carriesIdentity(text)||[words,aliasWords,privateWords,'Can we talk on Tuesday?',...signalIds,...proposalIds].some(value=>text.includes(value));
 const unaffected=async()=>(await f.db.prepare('SELECT * FROM capture_items ORDER BY id').all()).results.filter(row=>!matches(JSON.stringify(row)));
 const unaffectedBefore=await unaffected();assert.ok(unaffectedBefore.length>0);
 async function scan(){
  // Inspect the physical store read-only: D1 forbids SELECT on its own metadata tables.
  const directory=join(f.platform.directory,'v3','d1');
  const files=readdirSync(directory,{recursive:true}).filter((name):name is string=>typeof name==='string'&&name.endsWith('.sqlite'));
  assert.ok(files.length>0);
  for(const file of files){
  const store=new DatabaseSync(join(directory,file),{readOnly:true});
  try{
   const tables=store.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as {name:string}[];
   for(const {name} of tables){
    const rows=store.prepare(`SELECT * FROM "${name.replaceAll('"','""')}"`).all();
    assert.ok(!matches(JSON.stringify(rows)),`erased data absent from ${name}`);
   }
  }finally{store.close();}
  }
  assert.ok(!matches(await importCopies(f.db)),'decoded import plans and base64 originals are erased');
  assert.deepEqual(await retained(),before,'lookalike originals keep every byte');
  assert.deepEqual(await unaffected(),unaffectedBefore,'all unrelated captured originals keep every byte');
  assert.deepEqual(await f.db.prepare('SELECT * FROM contacts WHERE id=?').bind(f.bob).first(),bobBefore,'the other contact and their accepted phone value survive');
  assert.deepEqual(await queueValue(),queueBefore,'the accepted queue value survives removal of its private evidence');
 }
 return {matches,scan,counts:{capturedItems:signalIds.length,proposals:proposalIds.length},async undo(){await finish(importFixture,review,'undo');await scan();}};
}
