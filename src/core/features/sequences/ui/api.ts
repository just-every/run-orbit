import type {Sequence} from '../schema';
export type SequenceStep={kind:'email'|'wait'|'call'|'meeting'|'linkedin';condition:'always'|'no_reply'|'no_meeting'|'task_completed';delayBusinessDays:number;subject?:string;body?:string;library?:{id:string;revision:number};title?:string;instructions?:string};
export type SequenceVersion={version:number;name:string;steps:SequenceStep[];calendar:{timezone:string;days:number[]};createdAt:string;createdBy:string;authorName:string};
export type SequenceView=Sequence;
export type SequenceList={actorId:string;sequences:SequenceView[]};
export const stepLabels={email:'Email',wait:'Wait',call:'Call task',meeting:'Meeting',linkedin:'Manual LinkedIn'} as const;
export const conditionLabels={always:'Always',no_reply:'If no reply',no_meeting:'If no meeting',task_completed:'After previous task is completed'} as const;
export const dayNames=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
export async function sequenceRequest<T>(path='',method='GET',data?:unknown):Promise<T>{const response=await fetch('/api/v1/sequences'+path,{method,headers:{'Content-Type':'application/json'},...(data===undefined?{}:{body:JSON.stringify(data)})});const result=await response.json() as T&{error?:string};if(!response.ok)throw new Error(result.error??'Sequence request failed.');return result as T;}
