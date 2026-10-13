import type {Principal} from '../../shared/expansion-contracts';
export const roles=['seller','analyst','guest'] as const;
export type Role=typeof roles[number];
export const collaboratorActions=['graph.read','graph.search','graph.update','legacy.read','legacy.write','analytics.read','analytics.define','analytics.snapshot'] as const;
const bundles:Record<Role,readonly string[]>={seller:['graph.read','graph.search','graph.update','legacy.read','legacy.write','analytics.read'],analyst:['graph.read','graph.search','legacy.read','analytics.read','analytics.define','analytics.snapshot'],guest:[]};
export const principalKey=(p:Principal)=>p.kind==='operator'?`operator:${p.operatorId}`:`${p.kind}:${p.principalId}`;
export function matches(pattern:string,value:string){return pattern==='*'||pattern===value||(pattern.endsWith('.*')&&value.startsWith(pattern.slice(0,-1)));}
export function roleAllows(role:string,operation:string){return (bundles[role as Role]??[]).includes(operation);}
export function defaultRoleActions(role:Role):string[]{return [...bundles[role]];}
export {privateField} from './field-policy';
