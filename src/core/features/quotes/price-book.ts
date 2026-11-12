import {createId} from '../../shared/ids';
import {audit,RecordError} from '../records/shared';
/** New prices never rewrite a price already used by a quote. */
export async function addPrice(db:D1Database,actor:string,productId:string,input:{unitPriceCents:number;basePriceId:string|null}){
 const product=await db.prepare('SELECT active FROM quote_products WHERE id=?').bind(productId).first<{active:number}>();
 if(!product)throw new RecordError(404,'Product not found.');
 if(!product.active)throw new RecordError(409,'Activate the product before adding a price.');
 const current=await db.prepare('SELECT id,version FROM quote_prices WHERE product_id=? ORDER BY version DESC LIMIT 1').bind(productId).first<{id:string;version:number}>();
 if((current?.id??null)!==input.basePriceId)throw new RecordError(409,'The USD price book changed. Read the current price before saving.');
 const id=createId();
 try{await db.batch([db.prepare('INSERT INTO quote_prices VALUES(?,?,?,?,?,?)').bind(id,productId,(current?.version??0)+1,input.unitPriceCents,actor,new Date().toISOString()),audit(db,actor,'quote.price.created','product',productId)]);}catch(error){if(String(error).includes('UNIQUE constraint'))throw new RecordError(409,'The USD price book changed. Read the current price before saving.');throw error;}
 return {id};
}
