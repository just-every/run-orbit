import type {SourceSecurity} from '../../platform/source-security';
import type {ProviderFetch} from '../capture/providers/config';
import type {AuthenticatedOperator} from '../identity';
export interface SupportConfig {security?:SourceSecurity;fetcher?:ProviderFetch;origin?:string;now?:()=>Date}
export type Actor=AuthenticatedOperator;
export class SupportError extends Error {constructor(readonly status:400|401|403|404|409|413|502|503,message:string){super(message);}}
export interface Installation {id:number;subdomain:string;state:string;generation:string;checked_at:string;error:string|null}
export interface Credentials {email:string;token:string;signingSecret:string}
export interface Connection {installation:Installation;credentials:Credentials;ciphertext:string}
export interface Organization {id:number;name:string;domain_names:string[]}
export interface Ticket {id:number;organization_id:number|null;subject:string;priority:string|null;status:string;updated_at:string}
export const ownership='Zendesk owns support replies and SLA work. Orbit shows authorized summaries and sends only a reviewed handoff.';
export const now=(config:SupportConfig)=>config.now?.()??new Date();
export const organizationLink=(subdomain:string,id:string)=>`https://${subdomain}.zendesk.com/agent/organizations/${id}/tickets`;
export const ticketLink=(subdomain:string,id:string)=>`https://${subdomain}.zendesk.com/agent/tickets/${id}`;

export const contextFields=['companyName','companyDomain','contactName'] as const;
export interface HandoffInput {requesterId:string;title:string;fields:(typeof contextFields)[number][];contactId?:string}
