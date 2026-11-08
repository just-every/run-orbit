import type {FormDefinition} from './definition';

export const inquiryDisclosure='By submitting this enquiry, you ask us to follow up one-to-one about your request. This does not subscribe you to marketing.';

export interface ContactBasis {
 kind:'marketing'|'inquiry';
 wording:string;
 accepted:boolean;
 formRevision:number;
 artifactHash:string;
 occurredAt:string;
}

/** Keep the reviewed wording and decision with the erasable submission signal. */
export function contactBasis(form:FormDefinition,consent:boolean|undefined,formRevision:number,artifactHash:string,occurredAt:string):ContactBasis{
 return {kind:form.consentWording?'marketing':'inquiry',wording:form.consentWording??inquiryDisclosure,accepted:form.consentWording?consent===true:true,formRevision,artifactHash,occurredAt};
}
