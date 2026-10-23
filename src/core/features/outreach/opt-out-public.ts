import {recordMailDatabase} from './record-mail-storage';
import { boundedRequestBody } from '../../platform/bounded-request-body';
import { archiveImportActive } from '../../platform/archive-maintenance';
import { findCapability, optOutPath, unsubscribe } from './opt-out-capability';
import { optOutPage } from './opt-out-page';

export async function optOutResponse(request:Request,db:D1Database):Promise<Response>{
 const url=new URL(request.url),token=url.pathname.slice(optOutPath.length);
 const response=(state:Parameters<typeof optOutPage>[0],status=200)=>new Response(optOutPage(state),{status,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'",'X-Robots-Tag':'noindex, nofollow'}});
 if(!['GET','HEAD','POST'].includes(request.method))return new Response(null,{status:405,headers:{Allow:'GET, HEAD, POST'}});
 try{
  if(await archiveImportActive(db))return response('unavailable',503);
  if(!await findCapability(db,token,url.origin)){db=recordMailDatabase(db);if(!await findCapability(db,token,url.origin))return response('invalid',404);}
  if(request.method==='GET'||request.method==='HEAD')return response('confirm');
  // RFC 8058 mail clients POST without a session or browser Origin. The opaque
  // capability is the authority; no address or contact ID is ever accepted.
  const body=await boundedRequestBody(request,1024),text=await new Response(body).text();
  if(text){
   const type=request.headers.get('Content-Type')??'';
   if(!type.startsWith('application/x-www-form-urlencoded')&&!type.startsWith('multipart/form-data'))return response('invalid',400);
   const form=await new Request(request.url,{method:'POST',headers:request.headers,body:text}).formData();
   if([...form.keys()].length!==1||form.get('List-Unsubscribe')!=='One-Click')return response('invalid',400);
  }
  return await unsubscribe(db,token,url.origin)?response('done'):response('invalid',404);
 }catch{return response('unavailable',503);}
}
