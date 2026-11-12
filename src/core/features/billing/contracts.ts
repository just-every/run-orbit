import type {SourceSecurity} from '../../platform/source-security';
import type {ProviderFetch} from '../capture/providers/config';

export interface BillingConfig {security?:SourceSecurity;fetcher?:ProviderFetch;origin?:string}
export class BillingError extends Error {constructor(readonly status:400|401|403|404|409|413|502|503,message:string){super(message);}}
export interface BillingSecrets {apiKey:string;webhookSecret:string;generation:string}
export interface CustomerIdentity {customerId:string;name:string;email:string;domain:string}
export interface ReviewedIdentity extends CustomerIdentity {companyId:string;opportunityId:string}
export const stripeEventPath='/api/v1/billing/stripe/events';
export const identityId=/^[a-zA-Z0-9_-]{1,200}$/;
