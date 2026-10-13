import { z } from 'zod';
export class DelegationError extends Error { constructor(public status:number,public code:string){super(code);} }
export const deny=(status:number,code:string):never=>{throw new DelegationError(status,code);};
export function canonical(value:unknown):string {
 if(value===null||typeof value==='string'||typeof value==='boolean')return JSON.stringify(value);
 if(typeof value==='number'&&Number.isFinite(value))return JSON.stringify(value);
 if(Array.isArray(value))return `[${value.map(canonical).join(',')}]`;
 if(typeof value==='object'&&value)return `{${Object.keys(value).sort().map(k=>`${JSON.stringify(k)}:${canonical((value as Record<string,unknown>)[k])}`).join(',')}}`;
 throw new Error('Invalid canonical value');
}
export async function hash(value:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('');}
export const revision=(value:unknown)=>hash(canonical(value));
export const random=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');
export const scopes=['crm.evidence.read','crm.handoff.write'] as const;
export const targetSchema=z.string().regex(/^(?:opportunities|contacts|companies|signals)\/[A-Za-z0-9_-]{1,100}(?:\/handoffs\/[A-Za-z0-9_-]{1,100})?$/).refine(v=>!v.includes('/handoffs/')||v.startsWith('opportunities/'));
export const contentSchema=z.object({title:z.string().min(1).max(300).refine(v=>v.trim().length>0),description:z.string().max(20000),assigneeId:z.string().min(1).max(100).nullable(),dueAt:z.iso.datetime().nullable(),status:z.enum(['open','completed','cancelled']),evidence:z.array(z.string().regex(/^[A-Za-z0-9_-]{1,100}$/)).min(1).max(20).optional()}).strict();
export const effectSchema=z.object({operationKey:z.string().regex(/^[A-Za-z0-9_-]{1,160}$/),operation:z.literal('orbit.handoff.upsert'),target:targetSchema,expectedRevision:z.string().regex(/^[a-f0-9]{64}$/),expectedAudienceRevision:z.string().regex(/^[a-f0-9]{64}$/),content:contentSchema}).strict();
export type Effect=z.infer<typeof effectSchema>;
export type Grant={id:string;client_id:string;principal_id:string;account_id:string;scopes_json:string;targets_json:string;expires_at:string;revoked_at:string|null;token_hash:string|null};
export function scoped(g:Grant,target:string,scope:string){if(!JSON.parse(g.scopes_json).includes(scope))deny(403,'SCOPE_DENIED');const targets:string[]=JSON.parse(g.targets_json);if(!targets.includes(target)&&!targets.some(t=>/^opportunities\/[^/]+$/.test(t)&&target.startsWith(t+'/handoffs/')))deny(404,'NOT_FOUND');}

export const recordStateSchema='crm.handoff-state/1';
export function requestedRecordState(header:string|undefined){if(header!==undefined&&header!==recordStateSchema)deny(422,'UNSUPPORTED_RECORD_STATE_SCHEMA');return header!==undefined;}
