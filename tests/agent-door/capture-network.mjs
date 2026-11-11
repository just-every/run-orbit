/** Provider HTTP edge for the disposable conformance installation only. */
export const captureOrigins=['https://oauth2.googleapis.com','https://gmail.googleapis.com','https://www.googleapis.com'];
export default {async fetch(request,{fixture}){
 const url=new URL(request.url);
 if(url.pathname.endsWith('/token')){
  const body=new URLSearchParams(await request.text());
  if(request.method!=='POST'||!body.get('client_secret'))return Response.json({}, {status:400});
  if(fixture?.person&&body.get('grant_type')==='refresh_token')return Response.json({error:'invalid_grant'}, {status:400});
  return Response.json({access_token:'synthetic-orbit-access',refresh_token:'synthetic-orbit-refresh',expires_in:3600,scope:'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/calendar.readonly',token_type:'Bearer'});
 }
 if(request.method!=='GET'||!request.headers.has('authorization'))return Response.json({}, {status:403});
 if(fixture?.person)return Response.json({}, {status:401});
 if(url.pathname.endsWith('/labels'))return Response.json({labels:[{id:'INBOX',name:'Inbox'}]});
 if(url.pathname.endsWith('/profile'))return Response.json({historyId:'12345'});
 if(url.pathname.endsWith('/history'))return Response.json({historyId:'12346',history:[]});
 if(url.pathname.endsWith('/messages'))return Response.json({messages:[]});
 return Response.json({}, {status:404});
}};
