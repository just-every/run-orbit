import {CaptureProviderError} from '../contracts';
export class ResponseTooLarge extends CaptureProviderError {constructor(){super('unavailable','The provider response exceeds the capture size limit.');}}
/** Only a successful individual message read may be skipped for size. */
export class MessageTooLarge extends Error {readonly reason='Message exceeds the capture size limit';}
/** Bound streamed responses before decoding; neither oversized bodies nor provider error text enter status. */
export async function boundedResponse(response:Response,limit=8*1024*1024){
 const reader=response.body?.getReader();if(!reader)return response;
 const chunks:Uint8Array[]=[];let length=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>limit){await reader.cancel();throw new ResponseTooLarge();}chunks.push(value);}}
 catch(error){if(error instanceof CaptureProviderError)throw error;throw new CaptureProviderError('unavailable','The provider response was interrupted.');}
 const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
 return new Response(bytes,{status:response.status,headers:response.headers});
}
export async function objectResponse(response:Response):Promise<Record<string,any>>{
 let value:unknown;try{value=await response.json();}catch{throw new CaptureProviderError('unavailable','The provider returned unreadable data.');}
 if(!value||typeof value!=='object'||Array.isArray(value))throw new CaptureProviderError('unavailable','The provider returned an invalid response.');return value as Record<string,any>;
}
export function list(value:Record<string,any>,key:string,empty=false):any[]{
 if(value[key]===undefined&&empty)return [];
 if(!Array.isArray(value[key])||value[key].some((entry:unknown)=>!entry||typeof entry!=='object'||Array.isArray(entry)))throw new CaptureProviderError('unavailable','The provider returned an invalid collection.');
 return value[key];
}
export function opaque(value:unknown){if(value!==undefined&&(typeof value!=='string'||!value))throw new CaptureProviderError('unavailable','The provider returned an invalid continuation.');return value as string|undefined;}

export interface PageProgress{anchor:string;span:number;steps:number}
/** Brent's cycle detector retains one checkpoint, regardless of mailbox size.
 * Empty pages and repeated items are valid; only a repeated continuation stops a round.
 * Persist this alongside the provider cursor, and clear it at the end of that round.
 */
export function pageProgress(current:string|undefined,next:string|undefined,progress?:PageProgress):PageProgress|undefined{
 if(!next)return undefined;
 if(progress&&(typeof progress.anchor!=='string'||!Number.isSafeInteger(progress.span)||progress.span<1||!Number.isSafeInteger(progress.steps)||progress.steps<0||progress.steps>=progress.span))throw new CaptureProviderError('unavailable','Invalid pagination checkpoint.');
 if(next===current||next===progress?.anchor)throw new CaptureProviderError('unavailable','The provider repeated a page continuation; intake stopped at the last saved page.');
 if(!progress||progress.steps+1===progress.span)return {anchor:next,span:Math.min((progress?.span??0)*2||1,Number.MAX_SAFE_INTEGER),steps:0};
 return {...progress,steps:progress.steps+1};
}
