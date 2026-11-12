import {createId} from '../../shared/ids';
import {audit,RecordError} from '../records/shared';
export async function products(db:D1Database){return (await db.prepare(`SELECT p.id,p.name,p.active,p.updated_at AS updatedAt,b.id AS priceId,b.unit_price_cents AS unitPriceCents,b.version AS priceVersion FROM quote_products p LEFT JOIN quote_prices b ON b.product_id=p.id AND b.version=(SELECT MAX(version) FROM quote_prices WHERE product_id=p.id) ORDER BY p.name,p.id`).all()).results;}
export async function saveProduct(db:D1Database,actor:string,input:{name:string;active:boolean},id?:string){
 const at=new Date().toISOString(),key=id??createId();
 if(id&&!await db.prepare('SELECT 1 FROM quote_products WHERE id=?').bind(id).first())throw new RecordError(404,'Product not found.');
 await db.batch([id?db.prepare('UPDATE quote_products SET name=?,active=?,updated_at=? WHERE id=?').bind(input.name,Number(input.active),at,key):db.prepare('INSERT INTO quote_products VALUES(?,?,?,?,?)').bind(key,input.name,Number(input.active),at,at),audit(db,actor,id?'quote.product.updated':'quote.product.created','product',key)]);
 return {id:key};
}
