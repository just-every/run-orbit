/** Zoom's documented HTTP edges only. Test values never enter application code. */
export function zoomNetwork(emails=[],start=new Date(Date.now()-3600000).toISOString()){
 const credentials={accountId:'synthetic-orbit-401',clientId:'synthetic-orbit-402',clientSecret:'synthetic-orbit-403',webhookSecret:'synthetic-orbit-404'},token='synthetic-orbit-405';
 const state={tokenStatus:200,meetingStatus:200,attendanceStatus:200,requests:[],unexpected:[],meetings:new Map(),attendance:[],credentials,token};
 for(const [index,id] of ['98765432101','98765432102','98765432103'].entries())state.meetings.set(id,{id:Number(id),uuid:'synthetic-orbit-'+(410+index),type:2,topic:index?'Synthetic second Zoom meeting':'Synthetic Zoom deal review',start_time:start,duration:30,host_id:'synthetic-orbit-420',join_url:'https://zoom.us/j/'+id,settings:{auto_recording:'cloud',meeting_invitees:emails.map(email=>({email}))}});
 state.attendance=emails.map(email=>({user_email:email,join_time:start,leave_time:new Date(Date.parse(start)+1800000).toISOString()}));
 state.fetch=async(input,init={})=>{
  const request=input instanceof Request?input:new Request(String(input),init),url=new URL(request.url);state.requests.push({host:url.hostname,path:url.pathname,method:request.method});
  if(request.redirect!=='manual')throw new Error('Provider redirects must remain manual.');
  if(url.origin==='https://zoom.us'&&url.pathname==='/oauth/token'&&request.method==='POST'){
   const body=new URLSearchParams(await request.text());
   if(request.headers.get('authorization')!=='Basic '+btoa(credentials.clientId+':'+credentials.clientSecret)||body.get('grant_type')!=='account_credentials'||body.get('account_id')!==credentials.accountId)throw new Error('Incorrect documented OAuth request.');
   return state.tokenStatus===200?Response.json({access_token:token,token_type:'bearer',scope:'meeting:read:meeting:admin meeting:read:list_past_participants:admin'}):Response.json({message:credentials.clientSecret},{status:state.tokenStatus});
  }
  if(url.origin==='https://api.zoom.us'&&request.headers.get('authorization')==='Bearer '+token&&request.method==='GET'){
   const id=/^\/v2\/meetings\/(\d+)$/.exec(url.pathname)?.[1];
   if(id)return state.meetingStatus===200&&state.meetings.has(id)?Response.json(state.meetings.get(id)):Response.json({message:credentials.clientSecret},{status:state.meetingStatus===200?404:state.meetingStatus});
   if(/^\/v2\/past_meetings\/[^/]+\/participants$/.test(url.pathname))return state.attendanceStatus===200?Response.json({participants:state.attendance,next_page_token:''}):Response.json({message:credentials.clientSecret},{status:state.attendanceStatus});
  }
  state.unexpected.push(url.origin+url.pathname);throw new Error('Unexpected Zoom network edge.');
 };
 return state;
}
