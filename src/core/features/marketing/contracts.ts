import type {SourceSecurity} from '../../platform/source-security';
import type {ProviderFetch} from '../capture/providers/config';
/** INTEGRATE-007: Mailchimp is a native mail-provider signal source, so its sealed key never travels in an archive. */
export const mailchimpSource='mailchimp';
/** The hidden text merge field that carries each handed-off contact's consent source and basis on the Mailchimp member. */
export const consentTag='ORBITCONS';
export const handoffFields=['name','phone'] as const;
export type HandoffField=typeof handoffFields[number];
export interface MailchimpConfig {security?:SourceSecurity;origin?:string;fetcher?:ProviderFetch}
export interface Audience {id:string;name:string;webId:number}
/** Portable, non-secret connection settings kept in the source row; the key and webhook token are sealed beside them. */
export interface ConnectionSettings {dataCenter:string;audience:Audience|null;mergeTags:string[];connectedBy:string;connectedAt:string;checkedAt:string;webhookCheckedAt:string|null}
export interface Sealed {apiKey:string;webhookToken:string}
export class MailchimpError extends Error {constructor(public status:400|403|404|409|502|503,message:string){super(message);}}
