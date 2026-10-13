import { commercialEmailKey } from '../family/sales/identity';

/** Buyer-owned implementations of the three advertised record policy extension points. */
export interface OperatorManagementPolicy {
 id:'operator.management.v1';
 canInvite(input:{actorId:string;email:string;displayName:string}):boolean;
 canRemove(input:{actorId:string;operatorId:string}):boolean;
}
export interface RecordIdentityPolicy {
 id:'record.identity.v1';
 contactKey(email:string|null|undefined):string|null;
 companyKey(domain:string|null|undefined,freeMailDomains:string[]):string|null;
}
export interface OpportunityAssignmentPolicy {
 id:'opportunity.assignment.v1';
 ownerForNewOpportunity(input:{actorId:string}):string|null;
}
export const operatorManagementPolicy:OperatorManagementPolicy={
 id:'operator.management.v1',
 canInvite:()=>true,
 canRemove:()=>true
};
export const recordIdentityPolicy:RecordIdentityPolicy={
 id:'record.identity.v1',
 contactKey:email=>commercialEmailKey(email??null),
 companyKey:(domain,freeMailDomains)=>{const key=domain?.trim().toLowerCase().replace(/^www\./,'')||null;return key&&!freeMailDomains.some(d=>d.trim().toLowerCase().replace(/^www\./,'')===key)?key:null;}
};
export const opportunityAssignmentPolicy:OpportunityAssignmentPolicy={
 id:'opportunity.assignment.v1',
 ownerForNewOpportunity:()=>null
};
