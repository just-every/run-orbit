import type {FormDefinition} from './definition';
import {escapeHtml} from '../content/model';

export const inquiryDisclosure='By submitting this enquiry, you ask us to follow up one-to-one about your request. This does not subscribe you to marketing.';
export const inquiryDisclosureHtml=`<p id="inquiry-disclosure">${escapeHtml(inquiryDisclosure)}</p>`;

export interface ContactBasis {
 kind:'marketing'|'inquiry';
 wording:string;
 accepted:boolean;
 formRevision:number;
 artifactHash:string;
 occurredAt:string;
}

/** An unchanged older artifact cannot attest to a disclosure added after publication. */
export function contactBasis(form:FormDefinition,consent:boolean|undefined,formRevision:number,artifactHash:string,occurredAt:string,publishedHtml:string):ContactBasis|null{
 if(!form.consentWording&&!publishedHtml.includes(inquiryDisclosureHtml))return null;
 return {kind:form.consentWording?'marketing':'inquiry',wording:form.consentWording??inquiryDisclosure,accepted:form.consentWording?consent===true:true,formRevision,artifactHash,occurredAt};
}
