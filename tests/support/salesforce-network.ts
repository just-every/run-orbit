import assert from 'node:assert/strict';
export const sfOrg='00D000000000001',sfOwner='005000000000001',sfAccount='001000000000001';
export const sfPerson=(i:number)=>'003'+String(i+1).padStart(12,'0');
export const sfMailbox=(i:number)=>`synthetic-orbit-sf-${i}`+'@'+'example.test';
/** The only replaced edge: Salesforce HTTP. Native sessions, stores and imports run unchanged. */
export function salesforceNetwork(){
 const calls:{url:string;method:string;body:string}[]=[],instance='https://synthetic-orbit.my.salesforce.com';let failPage=false,scope='api refresh_token',revoked=false,refreshes=0;
 const fields={Account:[['Id','id'],['Name','string'],['OwnerId','reference'],['Description','textarea'],['Address__c','address']],Contact:[['Id','id'],['FirstName','string'],['LastName','string'],['Email','email'],['AccountId','reference'],['OwnerId','reference'],['HasOptedOutOfEmail','boolean'],['Loyalty__c','double']]};
 const accounts=[{Id:sfAccount,Name:'Synthetic Salesforce Account',OwnerId:sfOwner,Description:'Authorized source account'},{Id:'001000000000002',Name:'Synthetic second Account',OwnerId:sfOwner,Description:null}];
 const contacts=Array.from({length:12},(_,i)=>({Id:sfPerson(i),FirstName:'Synthetic',LastName:`Salesforce ${i}`,Email:sfMailbox(i),AccountId:i===11?null:i%2?'001000000000002':sfAccount,OwnerId:sfOwner,HasOptedOutOfEmail:i===0,Loyalty__c:i+4}));
 const fetcher=async(input:string,init?:RequestInit)=>{
  const url=new URL(input),method=init?.method??'GET',body=String(init?.body??'');calls.push({url:url.href,method,body});
  if(url.hostname==='test.salesforce.com'&&url.pathname==='/services/oauth2/token'){
   assert.equal(method,'POST');const form=new URLSearchParams(body);assert.equal(form.get('client_secret'),'synthetic-orbit-2');
   if(form.get('grant_type')==='refresh_token'){refreshes++;assert.equal(form.get('refresh_token'),'synthetic-orbit-4');}else{assert.equal(form.get('grant_type'),'authorization_code');assert.ok(form.get('code_verifier'));assert.equal(form.get('redirect_uri'),'https://orbit.test/api/v1/imports/salesforce/oauth/callback');}
   return Response.json({token_type:'Bearer',access_token:'synthetic-orbit-3',refresh_token:'synthetic-orbit-4',scope,instance_url:instance,id:`https://test.salesforce.com/id/${sfOrg}/${sfOwner}`});
  }
  assert.equal(url.origin,instance);assert.equal(method,'GET');assert.equal(new Headers(init?.headers).get('Authorization'),'Bearer synthetic-orbit-3');
  if(revoked)return Response.json([{errorCode:'INVALID_SESSION_ID'}],{status:401});
  for(const object of ['Account','Contact'] as const)if(url.pathname.endsWith(`/sobjects/${object}/describe`))return Response.json({name:object,queryable:true,fields:fields[object].map(([name,type])=>({name,type,label:name,custom:name.endsWith('__c')})),recordTypeInfos:[{recordTypeId:'012000000000001'}]});
  const query=url.searchParams.get('q');let object=query?.includes(' FROM Account ')?'Account':'Contact',offset=0;
  if(url.pathname.endsWith('/query/account-next')){object='Account';offset=1;if(failPage){failPage=false;return Response.json([{errorCode:'REQUEST_LIMIT_EXCEEDED'}],{status:429});}}
  if(url.pathname.endsWith('/query/contact-next')){object='Contact';offset=6;}
  if(query)assert.ok(!query.includes('Phone')&&!query.includes('Title')&&!query.includes('Address__c'),'Unavailable and unsupported fields never enter the query');
  const all=object==='Account'?accounts:contacts,records=offset?all.slice(offset):all.slice(0,object==='Account'?1:6),done=offset>0;
  return Response.json({totalSize:all.length,done,records,...done?{}:{nextRecordsUrl:`/services/data/v65.0/query/${object.toLowerCase()}-next`}});
 };
 return {fetcher,calls,accounts,contacts,failNextPage(){failPage=true;},grant(value:string){scope=value;},revoke(){revoked=true;},get refreshes(){return refreshes;}};
}
