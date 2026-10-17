import {z} from 'zod';

export const relationshipId=z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/);
export const stakeholderRoles=['champion','decision_maker','evaluator','procurement','other'] as const;
export type StakeholderRole=typeof stakeholderRoles[number];
const revision=z.string().regex(/^[a-f0-9]{64}$/);
const roles=z.array(z.enum(stakeholderRoles)).max(stakeholderRoles.length).refine(values=>new Set(values).size===values.length,'Choose each role once.');
const stakeholder=z.object({contactId:relationshipId,roles,verified:z.boolean()}).strict();
export const opportunityContextInput=z.object({
 revision,companyId:relationshipId.nullable(),primaryContactId:relationshipId.nullable(),
 stakeholders:z.array(stakeholder).max(1000),products:z.array(z.string().trim().min(1).max(500)).max(100),
 nextStep:z.string().trim().max(10000),mutualCommitments:z.string().trim().max(20000)
}).strict().superRefine((value,ctx)=>{
 const ids=value.stakeholders.map(item=>item.contactId);
 if(new Set(ids).size!==ids.length)ctx.addIssue({code:'custom',message:'Associate each contact once.'});
 if(ids.length?!value.primaryContactId||!ids.includes(value.primaryContactId):value.primaryContactId!==null)ctx.addIssue({code:'custom',message:'Choose one associated primary recipient, or none when the deal has no contacts.'});
 if(new Set(value.products.map(product=>product.toLowerCase())).size!==value.products.length)ctx.addIssue({code:'custom',message:'List each product once.'});
});
export const contactContextInput=z.object({revision,secondaryCompanies:z.array(z.object({companyId:relationshipId,verified:z.boolean()}).strict()).max(1000)}).strict().refine(value=>new Set(value.secondaryCompanies.map(item=>item.companyId)).size===value.secondaryCompanies.length,'Associate each company once.');
export type OpportunityContextInput=z.infer<typeof opportunityContextInput>;
export type ContactContextInput=z.infer<typeof contactContextInput>;
export type CompanyReference={id:string;name:string};
export type Verification={verified:boolean;verifiedBy:string|null;verifiedAt:string|null};
export type Stakeholder=Verification&{contactId:string;name:string|null;email:string|null;contactability:string;isPrimary:boolean;roles:StakeholderRole[]};
export type OpportunityContext={kind:'opportunity';recordId:string;revision:string;company:CompanyReference|null;stakeholders:Stakeholder[];products:string[];nextStep:string;mutualCommitments:string};
export type SecondaryCompany=Verification&{companyId:string;name:string};
export type ContactContext={kind:'contact';recordId:string;revision:string;primaryCompany:CompanyReference|null;secondaryCompanies:SecondaryCompany[]};
