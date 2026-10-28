import {z} from 'zod';
export const salesRoles=['sales-admin','manager','seller','read-only'] as const;
export const salesScopes=['all','team','assigned'] as const;
export const salesFields=['amounts','notes','mail','files'] as const;
export const salesPermissions=['import','export','forecast.override','source.connect','record.delete','workflow.author','workflow.activate','sequence.author','sequence.enroll','analytics.define','forecast.read'] as const;
export type SalesRole=typeof salesRoles[number];
export type SalesScope=typeof salesScopes[number];
export interface SalesProfile {role:SalesRole;scope:SalesScope;fields:string[];permissions:string[];includeAssociations:boolean}
export const identifier=z.string().regex(/^[a-zA-Z0-9_-]{1,120}$/);
export const fieldsSchema=z.array(z.string().regex(/^(\*|[a-z_][a-z0-9_.]*)$/).max(120)).max(100).transform(a=>[...new Set(a)]);
export const profileSchema=z.object({role:z.enum(salesRoles),scope:z.enum(salesScopes),fields:fieldsSchema,permissions:z.array(z.enum(salesPermissions)).max(salesPermissions.length).transform(a=>[...new Set(a)]),includeAssociations:z.boolean()}).strict();
export const teamSchema=z.object({name:z.string().trim().min(1).max(120),active:z.boolean(),defaultDashboardId:identifier.nullable()}).strict();
export const membersSchema=z.object({operatorIds:z.array(identifier).max(1000).transform(a=>[...new Set(a)])}).strict();
export const shareSchema=z.object({kind:identifier,recordId:identifier,subjectKind:z.enum(['user','team']),subjectId:identifier,fields:fieldsSchema,canEdit:z.boolean()}).strict();
export type ShareInput=z.infer<typeof shareSchema>;
export interface Team {id:string;name:string;active:boolean;defaultDashboardId:string|null;memberIds:string[]}
export interface SalesMember {id:string;name:string;email:string;owner:boolean;profile:SalesProfile|null}
export interface RecordShare extends ShareInput {id:string;name:string;subjectName:string}
export interface TeamSettings {members:SalesMember[];teams:Team[];shares:RecordShare[];dashboards:{id:string;name:string}[]}
export function defaultSalesProfile(role:SalesRole):SalesProfile {
 const permissions:Record<SalesRole,string[]>={
  'sales-admin':[...salesPermissions],
  manager:['import','export','forecast.override','workflow.author','sequence.author','sequence.enroll','analytics.define','forecast.read'],
  seller:['export','sequence.author','sequence.enroll','forecast.read'],
  'read-only':['export','forecast.read']
 };
 return {role,scope:role==='sales-admin'?'all':role==='manager'?'team':'assigned',fields:role==='sales-admin'?['*']:role==='read-only'?[]:[...salesFields],permissions:permissions[role],includeAssociations:false};
}
