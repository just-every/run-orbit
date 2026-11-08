import assert from 'node:assert/strict';
import {createApp} from '../../tests/support/app';
import {fixture,signIn} from './fixture';

export const teamEmail=(name:string)=>[`synthetic-orbit-${name}`,'people.test'].join('@');
export const accessPath='/api/v2/access/workspaces/workspace';
export const sharedPath='/api/v2/workspaces/workspace/records';
export const nativePath='/api/v1/records';

/** Real sign-in, native invitations and accepted record grants, with only the mail edge captured. */
export async function teamOperatorFixture(){
 const f=await fixture();
 try{
  const app=createApp({database:f.db,assets:{fetch:async()=>{throw Error('The record journey does not request assets.');}}});
  async function request(cookie:string,path:string,method='GET',body?:unknown){return app.request(`https://orbit.test${path}`,{method,headers:{Cookie:cookie,Origin:'https://orbit.test',...(body===undefined?{}:{'Content-Type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)})});}
  async function call(cookie:string,path:string,method='GET',body?:unknown,status=200){const response=await request(cookie,path,method,body),result=await response.json() as any;assert.equal(response.status,status,`${method} ${path}: ${JSON.stringify(result)}`);return result;}
  await call(f.cookie,'/api/v1/settings/operators','POST',{email:teamEmail('peer'),displayName:'Jordan Reyes'},201);
  const peer=await signIn(f.db,teamEmail('peer'));
  const invitation=await call(peer.cookie,`${accessPath}/invitations`,'POST',{email:teamEmail('guest'),role:'guest',expiresAt:new Date(Date.now()+86400000).toISOString()});
  const guest=await signIn(f.db,teamEmail('guest'));
  return {f,peer,guest,invitation,call,request,close:()=>f.close()};
 }catch(error){await f.close();throw error;}
}
export type TeamFixture=Awaited<ReturnType<typeof teamOperatorFixture>>;
export type TeamRecord={kind:'company'|'contact'|'opportunity';id:string;name:string;secretField:string;secret:string};

export async function teamRecords(t:TeamFixture){
 const {f,call}=t,records:TeamRecord[]=[];
 for(const [kind,input,secretField,secret] of [
  ['company',{name:'Harbour Studio',primary_domain:'harbour-studio.test'},'primary_domain','harbour-studio.test'],
  ['contact',{name:'Morgan Rivera',email:teamEmail('customer')},'email',teamEmail('customer')],
  ['opportunity',{title:'Harbour annual plan',stage_id:f.stage,value_cents:125000},'value_cents',125000],
 ] as const){
  const saved=await call(f.cookie,`${nativePath}/${kind}`,'POST',input,201);
  records.push({kind,id:saved.id,name:'name' in input?input.name:input.title,secretField,secret:String(secret)});
  await f.db.prepare('UPDATE schema_types SET fields_json=? WHERE name=?').bind(JSON.stringify({[secretField]:{sensitivity:'private'}}),kind).run();
  await f.db.prepare("UPDATE graph_records SET visibility='restricted',owner_id=? WHERE kind=? AND id=?").bind(f.nativeOperator.operatorId,kind,saved.id).run();
 }
 return records;
}
