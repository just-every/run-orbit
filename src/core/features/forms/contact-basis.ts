import type {FormDefinition} from './definition';
import {escapeHtml} from '../content/model';

export const inquiryDisclosure='By submitting this enquiry, you ask us to follow up one-to-one about your request. This does not subscribe you to marketing.';

export interface ContactBasis {
 kind:'marketing'|'inquiry';
 wording:string;
 accepted:boolean;
 formRevision:number;
 artifactHash:string;
 occurredAt:string;
}

/** Only the exact reviewed artifact can establish that an inquiry disclosure was shown.
 * Fixed compiler prose is escaped, so this element cannot come from user-authored HTML. */
export function contactBasis(form:FormDefinition,consent:boolean|undefined,formRevision:number,artifactHash:string,occurredAt:string,artifactHtml:string):ContactBasis|null{
 if(!form.consentWording&&!artifactHtml.includes(`<p id="inquiry-disclosure">${escapeHtml(inquiryDisclosure)}</p>`))return null;
 return {kind:form.consentWording?'marketing':'inquiry',wording:form.consentWording??inquiryDisclosure,accepted:form.consentWording?consent===true:true,formRevision,artifactHash,occurredAt};
}
