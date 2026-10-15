import { parseCsv } from '../../shared/csv';
import { canonicalJson,sha256,type SourceBundle,type SourceRecord } from '../../../modules/import-kit/d1/index';
import { fields,type ImportInput } from './contracts';
export interface Row {kind:string;id:string;data:Record<string,string>;source:SourceRecord;separator:string;unmapped:number[];reviewColumns?:Record<string,number>;error?:string;derivedContacts?:Row[]}
export function readImport(input:ImportInput){
 const namespace=`orbit:${input.vendor}:${input.account}`,source:SourceBundle={records:[],artifacts:[],diagnostics:[]},rows:Row[]=[];
 if(new Set(input.files.map(f=>f.kind)).size!==input.files.length)throw new Error('Choose at most one file of each type.');
 for(const file of input.files){
  if(Object.keys(file.mapping).some(key=>!fields[file.kind].includes(key)))throw new Error('Unknown mapping field.');
  const parsed=parseCsv(file.csv.replace(/^\uFEFF/,'')),headers=parsed.shift();if(!headers?.length||new Set(headers).size!==headers.length)throw new Error('Each CSV needs unique column headers.');
  if(parsed.length>1000)throw new Error('Each file supports up to 1,000 rows per reviewed import.');
  if(Object.values(file.mapping).some(header=>!headers.includes(header)))throw new Error('A mapped column is absent from its file.');
  const emailIdentity=input.vendor==='csv'&&file.kind==='contact'&&!file.mapping.id;
  if(emailIdentity&&!file.mapping.email)throw new Error('Map an email or a stable source ID for generic CSV contacts.');
  if(!emailIdentity&&!file.mapping.id&&file.kind!=='suppression')throw new Error(`Map a stable source ID for ${file.kind}.`);
  if(file.kind==='suppression'&&!file.mapping.email)throw new Error('Map an email for the suppression file.');
  if(Buffer.byteLength(file.csv)>2_000_000)throw new Error('Each CSV supports up to 2 MB of UTF-8 data.');
  const hash=sha256(file.csv),name=`${file.kind}/${file.name}`;
  source.artifacts.push({name,sha256:hash,size:Buffer.byteLength(file.csv),original:{status:'available',base64:Buffer.from(file.csv).toString('base64')}});
  for(const [index,values] of parsed.entries()){
   const data=Object.fromEntries(Object.entries(file.mapping).map(([key,header])=>[key,values[headers.indexOf(header)]?.trim()??'']));
   // Only generic contacts may use their exact normalized mailbox as source identity.
   // Hash it so provenance does not repeat the mailbox. Explicit vendor IDs stay unchanged.
   const address=emailIdentity?email(data.email??''):undefined;
   const id=data.id||(file.kind==='suppression'?data.email.toLowerCase():address?`email:${sha256(address)}`:`missing:${index+2}`);
   const payload={data,separator:file.separator,...file.kind==='contact'&&input.contactability==='confirmed_contactable'?{contactability:input.contactability}:{}};
   const record:SourceRecord={namespace,kind:file.kind,sourceId:id,payload,payloadHash:sha256(canonicalJson(payload)),artifactHash:hash,location:{artifact:name,row:index+2}};
   const reviewColumns=file.kind==='contact'?Object.fromEntries(['name','first_name','last_name','email'].filter(field=>file.mapping[field]).map(field=>[field,headers.indexOf(file.mapping[field])])):undefined;
   source.records.push(record);rows.push({kind:file.kind,id,data,source:record,separator:file.separator,reviewColumns,unmapped:headers.flatMap((header,index)=>Object.values(file.mapping).includes(header)?[]:[index+1]),error:values.length!==headers.length?'Column count differs from header.':emailIdentity&&!address?'Generic CSV contacts without an ID require a valid email.':!emailIdentity&&!data.id&&file.kind!=='suppression'?'Source ID is empty.':values.some(v=>v.length>100000)?'A cell exceeds 100,000 characters.':undefined});
  }
 }
 return {namespace,source,rows};
}
export const ids=(value:string|undefined,separator:string)=>value?value.split(separator).map(v=>v.trim()).filter(Boolean):[];
export const email=(value:string)=>/^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/.test(value)?value.toLowerCase():undefined;
export const positive=(value:string|undefined)=>!!value&&!['false','no','0','none'].includes(value.toLowerCase());
export function nativeId(namespace:string,kind:string,id:string){const hex=sha256(canonicalJson([namespace,kind,id]));let n=BigInt('0x'+hex.slice(0,32));const alphabet='0123456789ABCDEFGHJKMNPQRSTVWXYZ';let result='';for(let i=0;i<26;i++){result=alphabet[Number(n%32n)]+result;n/=32n;}return result;}
