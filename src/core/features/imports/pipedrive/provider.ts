import {RecordError} from '../../records/shared';
import type {ProviderFetch} from '../../capture/providers/config';
export const resources=[
 {key:'pipelines',version:2}, {key:'stages',version:2},
 {key:'organizationFields',version:1}, {key:'personFields',version:1}, {key:'dealFields',version:1},
 {key:'organizations',version:2}, {key:'persons',version:2}, {key:'deals',version:2}, {key:'notes',version:1},
] as const;
export type Snapshot=Record<string,Record<string,any>[]>;
export class PipedriveWait extends Error {constructor(readonly nextAt:string){super('Pipedrive rate limit: continue in the next window.');}}
export class PipedrivePermission extends RecordError {constructor(readonly path:string){super(403,`Pipedrive refused read permission for ${path}. Grant the corresponding read scope, or export that entity from Pipedrive account menu > Tools and apps > Export data and use the CSV importer.`);}}
/** Fixed host, GET only, no credentials in URLs and no redirect following. */
export async function pipedriveRequest(token:string,path:string,fetcher:ProviderFetch=fetch,now=Date.now()){
 let response:Response;
 try{response=await fetcher(`https://api.pipedrive.com${path}`,{method:'GET',redirect:'manual',headers:{Authorization:`Bearer ${token}`,Accept:'application/json'},signal:AbortSignal.timeout(20000)});}
 catch{throw new RecordError(409,'Pipedrive could not be reached. The saved source checkpoint has not advanced.');}
 if(response.status===429){const retry=response.headers.get('Retry-After'),seconds=retry&&/^\d+$/.test(retry)?Number(retry):null,date=retry?Date.parse(retry):NaN;await response.body?.cancel();throw new PipedriveWait(new Date(Math.max(now+1000,seconds!==null?now+seconds*1000:Number.isFinite(date)?date:now+60000)).toISOString());}
 if(response.status===401||response.status===403){await response.body?.cancel();throw new PipedrivePermission(path.split('?')[0]!);}
 if(!response.ok){await response.body?.cancel();throw new RecordError(409,'Pipedrive refused this page. No checkpoint advanced; retry or export the entity from account menu > Tools and apps > Export data.');}
 // Bound source pages before decoding, so an error body or redirect can never expose credentials.
 const reader=response.body?.getReader();let raw='',size=0;const decoder=new TextDecoder();
 if(!reader)throw new RecordError(409,'Pipedrive returned an empty page.');
 try{for(;;){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>2_000_000)throw new Error();raw+=decoder.decode(part.value,{stream:true});}raw+=decoder.decode();}
 catch{await reader.cancel();throw new RecordError(409,'Pipedrive page exceeds the supported 2 MB review limit. Export a smaller selection from account menu > Tools and apps > Export data.');}
 let body:any;try{body=JSON.parse(raw);}catch{throw new RecordError(409,'Pipedrive returned an unreadable page; checkpoint unchanged.');}
 if(body?.success!==true||body.data===undefined)throw new RecordError(409,'Pipedrive returned an incomplete page; checkpoint unchanged.');
 return body;
}
export function pagePath(index:number,cursor:string|null){const resource=resources[index];if(!resource)throw new RecordError(409,'The source pull is already complete.');const query=new URLSearchParams({limit:'100'});query.set(resource.version===2?'cursor':'start',cursor??(resource.version===2?'':'0'));return `/api/v${resource.version}/${resource.key}?${query}`;}
export function nextPage(index:number,body:any,current:string|null){
 const resource=resources[index]!,next=resource.version===2?body.additional_data?.next_cursor:body.additional_data?.pagination?.more_items_in_collection?body.additional_data.pagination.next_start:null;
 if(next===null||next===undefined||next==='')return null;
 const value=String(next);if(value.length>1000||value===current||resource.version===1&&!/^\d+$/.test(value))throw new RecordError(409,'Pipedrive returned an invalid continuation; checkpoint unchanged.');return value;
}
export function sourceId(value:any):string{const id=value&&typeof value==='object'?value.id:value;if((typeof id!=='string'&&typeof id!=='number')||!/^\d+$/.test(String(id))||typeof id==='number'&&!Number.isSafeInteger(id))throw new RecordError(409,'Pipedrive returned an invalid source ID; export this entity with its exact IDs.');return String(id);}
