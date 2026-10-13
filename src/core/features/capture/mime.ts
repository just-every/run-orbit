import {stripHtml} from './html';
/** A small RFC 5322 / MIME reader for captured mail. It keeps what it read and never guesses. */
export interface Mailbox {name:string;email:string}
export interface MimeEntity {headers:[string,string][];body:string}
export interface ParsedMessage {
 headers:[string,string][];
 header(name:string):string|undefined;
 headerAll(name:string):string[];
 /** Undecoded values: address lists are split on these, never on decoded text. */
 rawHeader(name:string):string|undefined;
 rawHeaderAll(name:string):string[];
 /** The readable text of the message: the first text/plain part, else stripped text/html. */
 text:string;
 /** A delivery-status report's machine-readable part, when the message is one. */
 deliveryStatus?:string;
 /** The returned original message's headers inside a delivery report. */
 returnedHeaders?:[string,string][];
}

const latin1=(text:string)=>Uint8Array.from(text,character=>character.charCodeAt(0)&255);
function decodeBytes(bytes:Uint8Array,charset='utf-8'){
 try{return new TextDecoder(charset.trim().toLowerCase()||'utf-8').decode(bytes);}catch{return new TextDecoder('utf-8').decode(bytes);}
}
function quotedPrintable(text:string,header=false){
 const source=header?text.replaceAll('_',' '):text.replace(/=\r?\n/g,'');
 const bytes:number[]=[];
 for(let index=0;index<source.length;index++){
  const hex=source[index]==='='?source.slice(index+1,index+3):'';
  if(/^[0-9A-Fa-f]{2}$/.test(hex)){bytes.push(parseInt(hex,16));index+=2;}else bytes.push(source.charCodeAt(index)&255);
 }
 return Uint8Array.from(bytes);
}
function base64(text:string){try{return latin1(atob(text.replace(/[^A-Za-z0-9+/=]/g,'')));}catch{return new Uint8Array();}}

/** RFC 2047 encoded words in header values. */
export function decodeHeader(value:string){
 return value.replace(/(=\?[^?\s]+\?[bBqQ]\?[^?\s]*\?=)(\s+(?==\?))?/g,word=>{
  const match=/^=\?([^?*]+)(?:\*[^?]*)?\?([bBqQ])\?([^?]*)\?=/.exec(word.trim());if(!match)return word;
  return decodeBytes(match[2]!.toLowerCase()==='b'?base64(match[3]!):quotedPrintable(match[3]!,true),match[1]);
 });
}

function splitEntity(raw:string):MimeEntity{
 const text=raw.replace(/\r\n?/g,'\n'),end=text.startsWith('\n')?-1:text.search(/\n\n/);
 const head=text.startsWith('\n')?'':end<0?text:text.slice(0,end),body=text.startsWith('\n')?text.slice(1):end<0?'':text.slice(end+2);
 const headers:[string,string][]=[];
 for(const line of head.split('\n')){
  if(/^[ \t]/.test(line)&&headers.length){headers[headers.length-1]![1]+=' '+line.trim();continue;}
  const match=/^([!-9;-~]+):/.exec(line);
  if(match){
   const value=line.slice(match[0].length);
   // Preserve dot-matching's line-separator rejection without retrying the whitespace prefix.
   if(!/[\u2028\u2029]/.test(value))headers.push([match[1]!.toLowerCase(),value.trim()]);
  }
 }
 return {headers,body};
}
const first=(headers:[string,string][],name:string)=>headers.find(([key])=>key===name)?.[1];
/** Split a structured header value into its main value and lowercased parameters. */
export function parameters(value:string|undefined){
 const [main='',...rest]=(value??'').split(';'),result:Record<string,string>={};
 for(const part of rest){
  const match=/^\s*([^=\s]+)\s*=/.exec(part);if(!match)continue;
  // Retain optional quotes and unquoted trailing whitespace with one scan of the value.
  let content=part.slice(match[0].length).trimStart();if(content.startsWith('"'))content=content.slice(1);
  const quote=content.indexOf('"');
  if(quote>=0&&content.slice(quote+1).trim())continue;
  result[match[1]!.toLowerCase()]=quote<0?content:content.slice(0,quote);
 }
 return {value:main.trim().toLowerCase(),params:result};
}
function bodyText(entity:MimeEntity){
 const type=parameters(first(entity.headers,'content-type')??'text/plain'),encoding=(first(entity.headers,'content-transfer-encoding')??'').toLowerCase();
 // Unencoded bodies are already UTF-8 text; do not allocate a byte array for them.
 if(encoding!=='base64'&&encoding!=='quoted-printable')return entity.body;
 return decodeBytes(encoding==='base64'?base64(entity.body):quotedPrintable(entity.body),type.params.charset);
}
interface Walk {plain?:string;html?:string;deliveryStatus?:string;returnedHeaders?:[string,string][]}
function walk(entity:MimeEntity,found:Walk,depth=0){
 if(depth>8)return;
 const type=parameters(first(entity.headers,'content-type')??'text/plain');
 if(type.value.startsWith('multipart/')&&type.params.boundary){
  // The preamble before the first delimiter and the epilogue after the closing one are not content.
  const parts=('\n'+entity.body.replace(/\r\n?/g,'\n')).split('\n--'+type.params.boundary).slice(1);
  for(const part of parts){if(part.startsWith('--'))break;walk(splitEntity(part.replace(/^[^\n]*\n/,'')),found,depth+1);}
  return;
 }
 if(type.value==='message/delivery-status'){found.deliveryStatus??=bodyText(entity);return;}
 if(type.value==='text/rfc822-headers'){found.returnedHeaders??=splitEntity(bodyText(entity)+'\n\n').headers;return;}
 if(type.value==='message/rfc822'){const inner=splitEntity(bodyText(entity));found.returnedHeaders??=inner.headers;return;}
 if(/attachment/i.test(first(entity.headers,'content-disposition')??''))return;
 if(type.value==='text/plain')found.plain??=bodyText(entity);
 else if(type.value==='text/html')found.html??=stripHtml(bodyText(entity));
}

const addressHeaders=new Set(['from','sender','reply-to','to','cc','bcc']);
const all=(headers:[string,string][],name:string)=>headers.filter(([key])=>key===name.toLowerCase()).map(([,value])=>value);
export function parseMessage(raw:string):ParsedMessage{
 const entity=splitEntity(raw),found:Walk={};walk(entity,found);
 const headers=entity.headers.map(([name,value])=>[name,addressHeaders.has(name)?decodeAddressList(value):decodeHeader(value)] as [string,string]);
 return {headers,header:name=>first(headers,name.toLowerCase()),headerAll:name=>all(headers,name),rawHeader:name=>first(entity.headers,name.toLowerCase()),rawHeaderAll:name=>all(entity.headers,name),
  text:(found.plain??found.html??'').replace(/\r\n?/g,'\n'),deliveryStatus:found.deliveryStatus,returnedHeaders:found.returnedHeaders};
}

/** Split an address list on its own commas; quoted strings, comments and angle addresses keep theirs. */
function listItems(value:string){
 const items:string[]=[];let current='',quoted=false,angle=false,depth=0;
 for(const character of value){
  if(character==='"'&&depth===0)quoted=!quoted;
  else if(!quoted&&character==='(')depth++;
  else if(!quoted&&character===')'&&depth)depth--;
  else if(!quoted&&depth===0&&character==='<')angle=true;
  else if(!quoted&&depth===0&&character==='>')angle=false;
  if(character===','&&!quoted&&!angle&&depth===0){items.push(current);current='';}else current+=character;
 }
 items.push(current);
 return items;
}
const unquote=(phrase:string)=>phrase.trim().replace(/^"(.*)"$/,'$1').replace(/\\(.)/g,'$1').trim();
/** RFC 2047 words are display text only: decode a mailbox's phrase and quote it, so it can never become list structure. */
function decodeAddressList(value:string){
 return listItems(value).map(item=>{
  const angled=/^(.*)(<[^<>]+>\s*)$/.exec(item);if(!angled)return item;
  const name=decodeHeader(unquote(angled[1]!));
  return name===unquote(angled[1]!)?item:`${/^\s/.test(item)?' ':''}"${name.replace(/["\\]/g,'\\$&')}" ${angled[2]}`;
 }).join(',');
}

/**
 * Parse an undecoded address list. A mailbox without a valid address is dropped, never repaired.
 * Encoded words are decoded only inside a display name, after the list is split.
 */
export function mailboxes(value:string|undefined):Mailbox[]{
 if(!value)return [];
 const result:Mailbox[]=[];
 for(const item of listItems(value)){
  const withoutComments=item.replace(/\([^()]*\)/g,' ').trim(),angled=/^(.*)<([^<>]+)>\s*$/.exec(withoutComments);
  const email=(angled?angled[2]!:withoutComments).trim().toLowerCase(),name=angled?decodeHeader(unquote(angled[1]!)):'';
  if(/^[^\s@<>()",;]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(email))result.push({name,email});
 }
 return result;
}
