import {createId} from '../../shared/ids';
import {audit,RecordError,requireRecord} from '../records/shared';
import {lineTotal,quoteTotals,type QuoteInput,type QuoteLine,type QuoteContent} from './totals';
export interface QuoteVersion {id:string;version:number;createdBy:string;createdAt:string;content:QuoteContent}
type Row={id:string;version:number;createdBy:string;createdAt:string;contentJson:string};
export async function quoteHistory(db:D1Database,deal:string){
 await requireRecord(db,'opportunity',deal);
 return (await db.prepare('SELECT id,version,created_by AS createdBy,created_at AS createdAt,content_json AS contentJson FROM quote_versions WHERE opportunity_id=? ORDER BY version DESC').bind(deal).all<Row>()).results.map(({contentJson,...row})=>({...row,content:JSON.parse(contentJson) as QuoteContent}));
}
export async function currentVersion(db:D1Database,deal:string,version:number){
 const history=await quoteHistory(db,deal),current=history[0];
 if(!current)throw new RecordError(404,'No quote exists for this deal.');
 if(current.version!==version)throw new RecordError(409,`Quote version ${version} is superseded. Current quote is version ${current.version}.`);
 return current;
}
export async function createVersion(db:D1Database,actor:string,deal:string,input:QuoteInput){
 const history=await quoteHistory(db,deal),version=history[0]?.version??0;
 if(input.baseVersion!==version)throw new RecordError(409,`Quote changed. Current quote is version ${version}. Review it before editing.`);
 const at=new Date().toISOString(),issuedOn=at.slice(0,10);
 if(input.expiresOn<issuedOn)throw new RecordError(400,'Expiration must be on or after the quote issue date.');
 const lines:QuoteLine[]=[];
 for(const line of input.lines){
  const price=await db.prepare('SELECT p.name,p.active,b.unit_price_cents AS unitPriceCents FROM quote_products p JOIN quote_prices b ON b.product_id=p.id WHERE p.id=? AND b.id=? AND b.version=(SELECT MAX(version) FROM quote_prices WHERE product_id=p.id)').bind(line.productId,line.priceId).first<{name:string;active:number;unitPriceCents:number}>();
  if(!price?.active)throw new RecordError(409,'A product or USD book price changed. Reload the price book.');
  const override=line.overrideUnitPriceCents!==null;
  if(override&&!line.overrideReason)throw new RecordError(400,'Give a reason for a unit-price override.');
  const unitPriceCents=line.overrideUnitPriceCents??price.unitPriceCents;
  lines.push({productId:line.productId,priceId:line.priceId,name:price.name,quantity:line.quantity,bookUnitPriceCents:price.unitPriceCents,unitPriceCents,override,overrideReason:override?line.overrideReason:null,discountCents:line.discountCents,totalCents:lineTotal(unitPriceCents,line.quantity,line.discountCents)});
 }
 const content:QuoteContent={currency:'USD',issuedOn,expiresOn:input.expiresOn,lines,discountCents:input.discountCents,tax:input.tax,...quoteTotals(lines,input.discountCents,input.tax)},id=createId();
 try{await db.batch([db.prepare('INSERT INTO quote_versions VALUES(?,?,?,?,?,?)').bind(id,deal,version+1,JSON.stringify(content),actor,at),audit(db,actor,'quote.version.created','opportunity',deal,{version:version+1})]);}
 catch(error){if(String(error).includes('UNIQUE constraint')){const current=(await quoteHistory(db,deal))[0];throw new RecordError(409,`Quote changed. Current quote is version ${current?.version??0}. Review it before editing.`);}throw error;}
 return {id,version:version+1,createdBy:actor,createdAt:at,content};
}
/** Versions are distinct observed facts, including superseded versions and their exact original amounts. */
export async function quoteEvidence(db:D1Database,deal:string){return(await quoteHistory(db,deal)).map(row=>({id:row.id,ref:deal,label:`Quote version ${row.version}`,text:`Quote version ${row.version}, issued ${row.content.issuedOn}, expires ${row.content.expiresOn}. ${row.content.lines.map(line=>`${line.name}: ${line.quantity} at USD ${(line.unitPriceCents/100).toFixed(2)}${line.override?' (unit-price override)':''}, line discount USD ${(line.discountCents/100).toFixed(2)}`).join('; ')}. Quote discount USD ${(row.content.discountCents/100).toFixed(2)}. Total USD ${(row.content.totalCents/100).toFixed(2)}. US sales tax ${row.content.tax.treatment}: ${row.content.tax.disclosure}`,occurredAt:row.createdAt,confidence:'observed' as const,href:`/app/opportunities/${deal}#quote-${row.id}`}));}
