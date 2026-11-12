import {Hono} from 'hono';
import {z} from 'zod';
import type {AuthenticatedOperator} from '../identity';
import {isFullOperator} from '../access/identity-class';
import {RecordError} from '../records/shared';
import {products,saveProduct} from './products';
import {addPrice} from './price-book';
import {quoteInput} from './totals';
import {createVersion,currentVersion,quoteHistory} from './versions';
const productInput=z.object({name:z.string().trim().min(1).max(200),active:z.boolean()}).strict();
const priceInput=z.object({unitPriceCents:z.number().int().min(0).max(1_000_000_000),basePriceId:z.string().min(1).max(100).nullable()}).strict();
export function quoteRoutes(db:D1Database){
 const app=new Hono<{Variables:{operator:AuthenticatedOperator}}>();
 app.use('*',async(c,next)=>{if(!await isFullOperator(db,c.get('operator').operatorId))return c.json({error:'A current full operator is required for products and quotes.'},403);await next();});
 app.onError((error,c)=>{if(error instanceof RecordError)return c.json({error:error.message},error.status);if(error instanceof z.ZodError)return c.json({error:'Enter valid quote values, integer cents, at least two lines, an expiration date and explicit US sales-tax disclosure.'},400);throw error;});
 app.get('/products',async c=>c.json({currency:'USD',products:await products(db)}));
 app.post('/products',async c=>c.json(await saveProduct(db,c.get('operator').operatorId,productInput.parse(await c.req.json())),201));
 app.put('/products/:id',async c=>c.json(await saveProduct(db,c.get('operator').operatorId,productInput.parse(await c.req.json()),c.req.param('id'))));
 app.post('/products/:id/prices',async c=>c.json(await addPrice(db,c.get('operator').operatorId,c.req.param('id'),priceInput.parse(await c.req.json())),201));
 app.get('/deals/:id',async c=>c.json({versions:await quoteHistory(db,c.req.param('id'))}));
 app.post('/deals/:id',async c=>c.json(await createVersion(db,c.get('operator').operatorId,c.req.param('id'),quoteInput.parse(await c.req.json())),201));
 app.post('/deals/:id/versions/:version/review',async c=>c.json({quote:await currentVersion(db,c.req.param('id'),Number(c.req.param('version'))),signature:{configured:false,status:'Not sent. DocuSign setup and signature review are required.'}}));
 app.post('/deals/:id/versions/:version/progress',async c=>{await currentVersion(db,c.req.param('id'),Number(c.req.param('version')));return c.json({error:'DocuSign is not configured. No quote has been sent or signed.'},409);});
 return app;
}
