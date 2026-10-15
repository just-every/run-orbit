import {canonicalJson,sha256} from '../../../modules/import-kit/d1/index';
import type {Row} from './source';

/** A mapped Company Name supplies a new source company, never a native identity match. */
export function namedCompanies(rows:Row[]):Row[]{
 const companies=new Map<string,Row>();
 for(const contact of rows){
  if(contact.kind!=='contact'||contact.error||contact.data.company_ids||!contact.data.company_name)continue;
  if(!['name','first_name','last_name','email'].some(field=>contact.data[field]))continue;
  const name=contact.data.company_name;
  if(name.length>500){contact.error='Company name exceeds 500 characters.';continue;}
  const id=`company-name:${sha256(name)}`;
  let company=companies.get(id);
  if(!company){
   const data={id,name},payload={data,separator:contact.separator};
   company={kind:'company',id,data,separator:contact.separator,unmapped:[],derivedContacts:[],source:{...contact.source,kind:'company',sourceId:id,payload,payloadHash:sha256(canonicalJson(payload))}};
   companies.set(id,company);
  }
  company.derivedContacts!.push(contact);
 }
 return [...companies.values()];
}
