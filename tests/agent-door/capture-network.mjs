/** Provider HTTP edge for the disposable conformance installation only. */
export default {async fetch(request){
 const url=new URL(request.url);
 if(url.pathname.endsWith('/token')){
  const body=new URLSearchParams(await request.text());
  if(request.method!=='POST'||!body.get('client_secret'))return Response.json({}, {status:400});
  const person=body.get('client_id')==='synthetic-orbit-person-client';
  if(person&&body.get('grant_type')==='refresh_token')return Response.json({error:'invalid_grant'}, {status:400});
  return Response.json({access_token:person?'synthetic-orbit-person-access':'synthetic-orbit-access',refresh_token:person?'synthetic-orbit-person-refresh':'synthetic-orbit-refresh',expires_in:3600,scope:'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/calendar.readonly',token_type:'Bearer'});
 }
 if(request.method!=='GET'||!request.headers.has('authorization'))return Response.json({}, {status:403});
 if(request.headers.get('authorization')==='Bearer synthetic-orbit-person-access'&&!url.pathname.endsWith('/labels'))return Response.json({}, {status:401});
 if(url.pathname.endsWith('/labels'))return Response.json({labels:[{id:'INBOX',name:'Inbox'}]});
 if(url.pathname.endsWith('/profile'))return Response.json({historyId:'12345'});
 if(url.pathname.endsWith('/history'))return Response.json({historyId:'12346',history:[]});
 if(url.pathname.endsWith('/messages'))return Response.json({messages:[]});
 return Response.json({}, {status:404});
}};
