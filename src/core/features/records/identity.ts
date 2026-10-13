import { recordIdentityPolicy } from '../../../ext/records';
export function contactEmailKey(email:string|null|undefined):string|null{return recordIdentityPolicy.contactKey(email);}
export function companyDomainKey(domain:string|null|undefined,freeMailDomains:string[]):string|null{return recordIdentityPolicy.companyKey(domain,freeMailDomains);}
