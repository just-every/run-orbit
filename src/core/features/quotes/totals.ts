import {z} from 'zod';
import {RecordError} from '../records/shared';
const cents=z.number().int().min(0).max(1_000_000_000);
export const taxSchema=z.object({treatment:z.enum(['not-collected','added','included']),rateBasisPoints:z.number().int().min(0).max(10000),disclosure:z.string().trim().min(1).max(1000)}).strict();
export const quoteInput=z.object({baseVersion:z.number().int().min(0),expiresOn:z.iso.date(),lines:z.array(z.object({productId:z.string().min(1).max(100),priceId:z.string().min(1).max(100),quantity:z.number().int().min(1).max(1_000_000),discountCents:cents,overrideUnitPriceCents:cents.nullable(),overrideReason:z.string().trim().max(500).nullable()}).strict()).min(2).max(50),discountCents:cents,tax:taxSchema}).strict();
export type QuoteInput=z.infer<typeof quoteInput>;
export interface QuoteLine {productId:string;priceId:string;name:string;quantity:number;bookUnitPriceCents:number;unitPriceCents:number;override:boolean;overrideReason:string|null;discountCents:number;totalCents:number}
export interface QuoteContent {currency:'USD';issuedOn:string;expiresOn:string;lines:QuoteLine[];discountCents:number;tax:z.infer<typeof taxSchema>;subtotalCents:number;netCents:number;taxCents:number;totalCents:number}
const integer=(amount:bigint)=>{if(amount<0n||amount>BigInt(Number.MAX_SAFE_INTEGER))throw new RecordError(400,'Quote exceeds the supported integer-cent amount.');return Number(amount);};
export function lineTotal(unit:number,quantity:number,discount:number){return integer(BigInt(unit)*BigInt(quantity)-BigInt(discount));}
/** Discounts apply before tax. Round the tax once to the nearest cent, with halves up. */
export function quoteTotals(lines:QuoteLine[],discountCents:number,tax:QuoteContent['tax']){
 const subtotal=lines.reduce((sum,line)=>sum+BigInt(line.totalCents),0n),net=subtotal-BigInt(discountCents);
 integer(net);
 if(tax.treatment==='not-collected'&&tax.rateBasisPoints!==0)throw new RecordError(400,'Not-collected tax must use a zero rate and disclose the US sales-tax treatment.');
 const denominator=tax.treatment==='included'?10000n+BigInt(tax.rateBasisPoints):10000n;
 const numerator=net*BigInt(tax.rateBasisPoints),taxCents=tax.treatment==='not-collected'?0n:(numerator+denominator/2n)/denominator;
 return {subtotalCents:integer(subtotal),netCents:integer(net),taxCents:integer(taxCents),totalCents:integer(net+(tax.treatment==='added'?taxCents:0n))};
}
