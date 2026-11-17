import {canonicalJson,sha256} from '../../../modules/import-kit/d1/index';
import type {Row} from './source';

/** Spreadsheet names resolve only within this import, never against native company names. */
export function namedCompanies(rows:Row[],matchImported=false){
 const companies=new Map<string,Row>(),contactCompanies=new Map<Row,Row>(),imported=new Map<string,Row[]>();
 const nameKey=(name:string)=>name.trim().toLowerCase();
 if(matchImported)for(const row of rows)if(row.kind==='company'&&row.data.name){
  const key=nameKey(row.data.name),matches=imported.get(key)??[];
  matches.push(row);imported.set(key,matches);
 }
 for(const contact of rows){
  if(contact.kind!=='contact'||contact.error||contact.data.company_ids||!contact.data.company_name)continue;
  if(!['name','first_name','last_name','email'].some(field=>contact.data[field]))continue;
  const name=contact.data.company_name;
  if(name.length>500){contact.error='Company name exceeds 500 characters.';continue;}
  const matches=imported.get(nameKey(name))??[];
  if(matches.length>1){contact.error='Company name matches several rows in the companies file. Map a Company ID to choose one.';continue;}
  if(matches.length){contactCompanies.set(contact,matches[0]);continue;}
  const id=`company-name:${sha256(name)}`;
  let company=companies.get(id);
  if(!company){
   const data={id,name},payload={data,separator:contact.separator};
   company={kind:'company',id,data,custom:{},separator:contact.separator,unmapped:[],derivedContacts:[],source:{...contact.source,kind:'company',sourceId:id,payload,payloadHash:sha256(canonicalJson(payload))}};
   companies.set(id,company);
  }
  company.derivedContacts!.push(contact);
  contactCompanies.set(contact,company);
 }
 return {companies:[...companies.values()],contactCompanies};
}
