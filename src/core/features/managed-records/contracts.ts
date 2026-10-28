import {z} from 'zod';
export const managedKind=z.string().regex(/^[a-z][a-z0-9_]{1,63}$/);
export const managedId=z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/);
export const fieldKey=z.string().regex(/^[a-z][a-z0-9_]{0,63}$/);
export const definitionSchema=z.object({label:z.string().trim().min(1).max(120),type:z.enum(['text','number','boolean','date']),required:z.boolean(),sensitivity:z.enum(['public','private'])}).strict();
const reservedFields=new Set(['id','kind','owner_id','created_at','updated_at','revision','visibility','team_id','retired_into_id','__proto__','constructor','prototype']);
export const definitionsSchema=z.record(fieldKey,definitionSchema).refine(fields=>Object.keys(fields).length<=50&&!Object.keys(fields).some(k=>reservedFields.has(k))&&fields.name?.type==='text'&&fields.name.required,'Define a required text name and at most 50 fields.');
export const typeInputSchema=z.object({name:managedKind,label:z.string().trim().min(1).max(120),fields:definitionsSchema}).strict();
export const typeUpdateSchema=typeInputSchema.omit({name:true}).extend({version:z.number().int().positive()});
export const fieldsSchema=z.record(fieldKey,z.union([z.string().max(20000),z.number().finite(),z.boolean(),z.null()])).refine(fields=>Object.keys(fields).length<=50&&!Object.keys(fields).some(k=>reservedFields.has(k)),'Enter only editable record fields.');
export const createSchema=z.object({fields:fieldsSchema,owner_id:managedId.nullable()}).strict();
export const updateSchema=z.object({fields:fieldsSchema.optional(),owner_id:managedId.nullable().optional(),revision:z.number().int().positive().optional()}).strict().refine(i=>i.fields!==undefined||i.owner_id!==undefined,'Choose a change to save.');
export const deleteSchema=z.object({confirmed:z.literal(true),revision:z.number().int().positive().optional()}).strict();
export type FieldDefinition=z.infer<typeof definitionSchema>;
export type ManagedType={name:string;label:string;fields:Record<string,FieldDefinition>;version:number};
export type ManagedValues=z.infer<typeof fieldsSchema>;
export type CreateManagedInput=z.infer<typeof createSchema>;
export type UpdateManagedInput=z.infer<typeof updateSchema>;
export interface ManagedRow {id:string;kind:string;owner_id:string|null;fields_json:string;revision:number;created_at:string;updated_at:string}
export interface DefinitionsResponse {types:ManagedType[];canManageTypes:boolean;canWrite:boolean;canDelete:boolean;operatorId:string;allowUnassigned:boolean;writableFields:Record<string,string[]>}
export interface ManagedProjection {ref:{id:string;type:string;revision?:number};kind:string;fields:ManagedValues;canEdit?:boolean;canDelete?:boolean;editableFields?:string[]}
