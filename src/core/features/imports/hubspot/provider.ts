import type {SourceSecurity} from '../../../platform/source-security';
import type {ProviderFetch} from '../../capture/providers/config';
export interface HubSpotConfig {security?:SourceSecurity;fetcher?:ProviderFetch}
export const objectTypes=['companies','contacts','deals','notes','calls','meetings','tasks'] as const;
export type ObjectType=typeof objectTypes[number];
export const readScopes=['crm.objects.contacts.read','crm.objects.companies.read','crm.objects.deals.read','crm.objects.owners.read'];
export class HubSpotError extends Error {
 constructor(readonly status:400|403|404|409|429|502|503,message:string,readonly retryAt:string|null=null){super(message);}
}
/** Provider bodies and request headers never become diagnostics: either can echo a private token. */
export async function hubspotRead(config:HubSpotConfig,token:string,path:string,body?:unknown):Promise<any>{
 if(!path.startsWith('/crm/')&&path!=='/oauth/v2/private-apps/get/access-token-info')throw new HubSpotError(400,'Unsupported HubSpot read.');
 let response:Response;
 try{response=await(config.fetcher??fetch)(`https://api.hubapi.com${path}`,{method:body?'POST':'GET',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},redirect:'error',signal:AbortSignal.timeout(20_000),...(body?{body:JSON.stringify(body)}:{})});}
 catch{throw new HubSpotError(502,'HubSpot did not answer. Resume from the saved page checkpoint.');}
 if(response.status===429){const value=response.headers.get('Retry-After'),seconds=Number(value),date=value?Date.parse(value):NaN,delay=value&&Number.isFinite(seconds)?Math.max(1,seconds)*1000:Number.isFinite(date)?Math.max(1000,date-Date.now()):60_000;throw new HubSpotError(429,'HubSpot rate limit. Resume this saved pull after the displayed retry time.',new Date(Date.now()+delay).toISOString());}
 if(response.status===401||response.status===403){let scopes:string[]=[];try{const data=await response.json() as any;scopes=(data.errors??[]).flatMap((error:any)=>error.context?.requiredScopes??[]).concat(data.requiredScopes??[]).filter((s:unknown)=>typeof s==='string'&&/^crm\.[a-z._]+$/.test(s as string));}catch{}
  throw new HubSpotError(409,`HubSpot refused ${path.split('?')[0]}. ${scopes.length?`Grant read scope ${[...new Set(scopes)].join(', ')}.`:'Check the private app read permission for this object.'} Export the refused object and its associations from HubSpot, then import its CSV explicitly. Nothing was skipped.`);
 }
 if(!response.ok)throw new HubSpotError(502,`HubSpot could not read ${path.split('?')[0]} (HTTP ${response.status}). Export that object with its IDs and associations if this account cannot grant access. Nothing was skipped.`);
 const text=await response.text();if(text.length>500_000)throw new HubSpotError(409,'This HubSpot page exceeds the reviewed import limit. Export smaller CSV files with stable IDs.');
 try{return JSON.parse(text);}catch{throw new HubSpotError(502,'HubSpot returned an unreadable page. Resume from the saved checkpoint.');}
}
