/** Only the Pipedrive HTTP boundary is replaced; routes, security, D1 and import kit are real. */
export function pipedriveNetwork(){
 const text='a'.repeat(40),number='b'.repeat(40),unsupported='c'.repeat(40),requests:{path:string;authorization:string|null;method:string}[]=[];
 const address=(id:number)=>`synthetic-orbit-${id}${'@'}migration.test`;
 const snapshot:Record<string,any[]>={
  pipelines:[{id:1,name:'New business'},{id:2,name:'Renewals'}],
  stages:[{id:101,pipeline_id:1,name:'Qualified'},{id:201,pipeline_id:2,name:'Qualified'}],
  organizationFields:[{id:1,key:text,name:'Region',field_type:'varchar'},{id:2,key:unsupported,name:'Multiple choices',field_type:'set'}],
  personFields:[{id:3,key:number,name:'Seats',field_type:'double'}],dealFields:[{id:4,key:text,name:'Source reference',field_type:'varchar'}],
  organizations:[{id:11,name:'Synthetic Orbit North',owner_id:71,custom_fields:{[text]:'North',[unsupported]:[1,2]}},{id:12,name:'Synthetic Orbit South',owner_id:72,custom_fields:{[text]:'South'}}],
  persons:[{id:21,name:'Synthetic Orbit One',org_id:11,owner_id:72,emails:[{value:address(21),primary:true}],marketing_status:'unsubscribed',custom_fields:{[number]:7}},{id:22,name:'Synthetic Orbit Two',org_id:12,owner_id:71,emails:[{value:address(22),primary:true}],custom_fields:{[number]:12}},{id:23,name:'Synthetic Orbit Three',org_id:11,owner_id:71,emails:[{value:address(23),primary:true}],custom_fields:{[number]:3}}],
  deals:[{id:31,title:'Synthetic Orbit USD North',pipeline_id:1,stage_id:101,org_id:11,person_id:21,owner_id:71,currency:'USD',value:1250.25,status:'open',custom_fields:{[text]:'Source 31'}},{id:32,title:'Synthetic Orbit USD South',pipeline_id:2,stage_id:201,org_id:12,person_id:22,owner_id:72,currency:'USD',value:42.10,status:'won'},{id:33,title:'Synthetic Orbit EUR held',pipeline_id:1,stage_id:101,org_id:11,person_id:23,currency:'EUR',value:100,status:'open'}],
  notes:[{id:41,content:'Synthetic linked provider note one',add_time:'2025-01-02 12:00:00',org_id:11,person_id:21,deal_id:31,user_id:71},{id:42,content:'Synthetic linked provider note two',add_time:'2025-01-03 12:00:00',org_id:12,person_id:22,deal_id:32,user_id:72},{id:43,content:'Synthetic person-only note',add_time:'2025-01-04 12:00:00',person_id:23,user_id:71},{id:44,content:'Unsupported deal note retained for export',add_time:'2025-01-05 12:00:00',deal_id:33,user_id:71}],
 };
 let limited=false,deny='',revoke=false;
 const fetcher=async(input:string,init?:RequestInit)=>{
  const url=new URL(input),path=url.pathname;requests.push({path:path+url.search,authorization:new Headers(init?.headers).get('Authorization'),method:init?.method??'GET'});
  if(url.origin!=='https://api.pipedrive.com'||init?.method!=='GET'||init.redirect!=='manual'||url.searchParams.has('api_token'))throw new Error('Unexpected provider request.');
  if(revoke||deny&&path.endsWith('/'+deny))return Response.json({success:false},{status:403});
  if(path.endsWith('/users/me'))return Response.json({success:true,data:{id:71,company_id:99}});
  const key=path.split('/').at(-1)!;if(!Object.hasOwn(snapshot,key))throw new Error('Unknown Pipedrive resource.');
  if(key==='organizations'){
   if(!url.searchParams.get('cursor'))return Response.json({success:true,data:[snapshot[key]![0]],additional_data:{next_cursor:'source-page-2'}});
   if(!limited){limited=true;return Response.json({success:false},{status:429,headers:{'Retry-After':'60'}});}
   return Response.json({success:true,data:[snapshot[key]![1]],additional_data:{next_cursor:null}});
  }
  return Response.json({success:true,data:snapshot[key],additional_data:path.includes('/v2/')?{next_cursor:null}:{pagination:{more_items_in_collection:false}}});
 };
 return{snapshot,requests,fetcher,address,text,number,unsupported,setDenied:(value:string)=>{deny=value;},setRevoked:(value:boolean)=>{revoke=value;}};
}
