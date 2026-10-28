import assert from 'node:assert/strict';
import {fixture,signIn} from './fixture';
import {createApp} from '../../tests/support/app';
import {defaultSalesProfile} from '../../src/core/features/teams/policy';
/** One native sales-access lifecycle, including supported reads and refused disclosure paths. */
export async function teamAccessProof(source?:Awaited<ReturnType<typeof fixture>>){
 const f=source??await fixture();try{
 const app=createApp({database:f.db,assets:{fetch:async()=>new Response('')}}),settings='/api/v1/settings/teams',root='/api/v2/workspaces/workspace';
 const request=(path:string,cookie=f.cookie,method='GET',body?:unknown)=>app.request('https://orbit.test'+path,{method,headers:{Cookie:cookie,Origin:'https://orbit.test','Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
 const json=async(path:string,cookie=f.cookie,method='GET',body?:unknown,status=200):Promise<any>=>{const response=await request(path,cookie,method,body);assert.equal(response.status,status,await response.clone().text());return response.json();};
 const person=async(name:string)=>{const email=`${name.toLowerCase()}@${'sales.test'}`;await json('/api/v1/settings/operators',f.cookie,'POST',{email,displayName:name},201);return signIn(f.db,email);};
 const manager=await person('Morgan'),rep=await person('Riley'),other=await person('Casey');
 for(const [person,role]of [[manager,'manager'],[rep,'seller'],[other,'seller']] as const)await json(settings+'/roles/'+person.operator.operatorId,f.cookie,'PUT',defaultSalesProfile(role));
 const team=await json(settings,f.cookie,'POST',{name:'Account team',active:true,defaultDashboardId:null},201);await json(settings+'/'+team.id+'/members',f.cookie,'PUT',{operatorIds:[manager.operator.operatorId,rep.operator.operatorId]});
 const company=await json('/api/v1/records/company',f.cookie,'POST',{name:'Riley account',primary_domain:'riley-business.test'},201),contact=await json('/api/v1/records/contact',f.cookie,'POST',{name:'Riley contact',company_id:company.id,email:null},201),hidden=await json('/api/v1/records/company',f.cookie,'POST',{name:'Confidential account',primary_domain:'secret-business.test'},201);
 const assign=async(kind:string,id:string,ownerId:string)=>{const review=await json('/api/v1/records/ownership/review',f.cookie,'POST',{kind,ids:[id],ownerId});await json('/api/v1/records/ownership/'+review.id+'/apply',f.cookie,'POST',{});};
 await assign('company',company.id,rep.operator.operatorId);await assign('contact',contact.id,rep.operator.operatorId);await assign('company',hidden.id,other.operator.operatorId);
 await json(settings+'/records/company/'+hidden.id+'/visibility',f.cookie,'PUT',{visibility:'restricted'});
 const list=await json(root+'/records?kind=company',rep.cookie);assert.deepEqual(list.items.map((r:any)=>r.ref.id),[company.id]);assert.equal((await json(root+'/records?kind=company',manager.cookie)).items.length,1);assert.equal((await request(root+'/records/company/'+hidden.id,rep.cookie)).status,403);assert.equal((await json('/api/v1/records/company?q=Confidential',rep.cookie)).records.length,0);
 const csv=await request(root+'/record-export?kind=company',rep.cookie);assert.equal(csv.status,200);assert.match(await csv.text(),/Riley account/);assert.ok(!(await (await request(root+'/record-export?kind=company',rep.cookie)).text()).includes('Confidential'));
 assert.equal((await request('/api/v1/assistance',rep.cookie,'POST',{})).status,403);const now=await request('/api/v1/opportunities/now',rep.cookie);assert.equal(now.status,200,await now.clone().text());assert.ok(!(await now.text()).includes('Confidential'));await json('/api/v1/settings',rep.cookie);assert.equal((await request(settings,rep.cookie)).status,403);
 const share=await json(settings+'/shares',f.cookie,'POST',{kind:'company',recordId:hidden.id,subjectKind:'team',subjectId:team.id,fields:['name'],canEdit:false},201);const shared=await json(root+'/records/company/'+hidden.id,rep.cookie);assert.equal(shared.fields.name,'Confidential account');assert.equal(shared.fields.primary_domain,undefined);assert.equal((await request(root+'/records/company/'+hidden.id,rep.cookie,'PUT',{name:'Forbidden edit'})).status,403);
 await json(settings+'/shares/'+share.id,f.cookie,'DELETE',{});assert.equal((await request(root+'/records/company/'+hidden.id,rep.cookie)).status,403);
 const returned=await signIn(f.db,rep.operator.email);assert.equal((await request(root+'/records/company/'+hidden.id,returned.cookie)).status,403);
 await assign('contact',contact.id,other.operator.operatorId);assert.equal((await json(root+'/records?kind=contact',rep.cookie)).items.length,0);assert.equal((await request(root+'/records/contact/'+contact.id,rep.cookie)).status,403);
 const deal=await json('/api/v1/records/opportunity',f.cookie,'POST',{title:'Team review deal',stage_id:f.stage,owner_id:rep.operator.operatorId,value_cents:10000},201);
 const mentioned=await json('/api/v1/records/opportunity/'+deal.id+'/entries',f.cookie,'POST',{kind:'note',text:'Review @Account team and @Riley',occurredAt:new Date(Date.now()-1000).toISOString()});assert.deepEqual(mentioned.mentions.sort(),[manager.operator.operatorId,rep.operator.operatorId].sort());
 const notices=await json('/api/v1/notifications',rep.cookie);assert.equal(notices.notifications.filter((n:any)=>n.href?.includes(mentioned.id)).length,1);
 await json('/api/v1/entries/visibility/entry/'+mentioned.id,f.cookie,'PUT',{private:true});assert.equal((await json(root+'/records/opportunity/'+deal.id+'/entries',rep.cookie)).entries.length,0);assert.equal((await json('/api/v1/notifications',rep.cookie)).notifications.some((n:any)=>n.href?.includes(mentioned.id)),false);
 await json(settings+'/roles/'+rep.operator.operatorId,f.cookie,'PUT',{...defaultSalesProfile('seller'),fields:[]});const noAmount=await json(root+'/records/opportunity/'+deal.id,rep.cookie);assert.equal(noAmount.fields.value_cents,undefined);
 const audit=await f.db.prepare("SELECT count(*) n FROM audit_entries WHERE action LIKE 'sales.%'").first<number>('n');assert.ok(audit&&audit>=7);
 // A role restriction also withdraws previously issued unrestricted delegation authority.
 const {nativeFullPredicate}=await import('../../src/core/features/delegation/authority');assert.equal(await f.db.prepare(`SELECT 1 FROM operators o WHERE o.id=? AND ${nativeFullPredicate}`).bind(rep.operator.operatorId).first(),null);
 return{rep,hiddenId:hidden.id,teamId:team.id};
 }finally{if(!source)await f.close();}
}
