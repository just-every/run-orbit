import type {Brief,BriefLine} from '../../today/types';
import type {MeetingPlan} from '../../today/meeting-plan';

export type {Brief,BriefLine,MeetingPlan};
export class TodayRequestError extends Error {constructor(readonly status:number,message:string){super(message);}}

export async function todayRequest<T>(path:string,init?:{method?:string;body?:unknown}):Promise<T>{
 const response=await fetch(`/api/v1/today${path}`,{method:init?.method??(init?.body?'POST':'GET'),credentials:'same-origin',headers:{'content-type':'application/json'},...(init?.body!==undefined?{body:JSON.stringify(init.body)}:{})});
 const payload=await response.json().catch(()=>undefined) as {error?:string}|undefined;
 if(!response.ok)throw new TodayRequestError(response.status,payload?.error??'Orbit could not complete that request.');
 return payload as T;
}

const prefixes:Record<BriefLine['kind'],string>={'reply':'Reply','meeting':'Meeting','signal':'Signal','handoff-due':'Next action due','next-action-due':'Next action due','reply-unanswered':'Reply unanswered','meeting-no-next-step':'No next step after meeting','draft-unsent':'Draft not sent','handoff-proposed':'Proposed handoff','unlinked-signal':'No matching record','unlinked-reply':'Reply without a thread','held-capture':'Held for review'};
const typeLabel=(type:string)=>type.replaceAll(/[._:-]+/g,' ').replace(/^./,letter=>letter.toUpperCase());
export const linePrefix=(line:BriefLine)=>(line.kind==='meeting'||line.kind==='signal'||line.kind==='held-capture')&&line.signalType?typeLabel(line.signalType):prefixes[line.kind];
