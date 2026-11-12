import {useEffect,useState} from 'react';
import {recordsRequest} from '../records-api';
import type {QuoteVersion} from '../../../quotes/versions';
import type {QuoteInput} from '../../../quotes/totals';
import './quotes.css';
type Product={id:string;name:string;active:number;priceId:string|null;unitPriceCents:number|null};
export const quoteMoney=(cents:number)=>`USD ${(cents/100).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
export function centsFromText(text:string){if(!/^\d+(?:\.\d{1,2})?$/.test(text))throw new Error('Enter a nonnegative USD amount with at most two decimal places.');const [whole,fraction='']=text.split('.');const cents=Number(whole)*100+Number(fraction.padEnd(2,'0'));if(!Number.isSafeInteger(cents))throw new Error('Enter a smaller USD amount.');return cents;}
type EditLine={productId:string;quantity:string;discount:string;override:string;reason:string};
const blankLine=():EditLine=>({productId:'',quantity:'1',discount:'0',override:'',reason:''});
export function DealQuotePanel({id}:{id:string}){
 const [versions,setVersions]=useState<QuoteVersion[]>([]),[products,setProducts]=useState<Product[]>([]),[loaded,setLoaded]=useState(false),[error,setError]=useState(''),[busy,setBusy]=useState(false),[editing,setEditing]=useState(false),[notice,setNotice]=useState('');
 const [baseVersion,setBaseVersion]=useState(0),[lines,setLines]=useState<EditLine[]>([blankLine(),blankLine()]),[expires,setExpires]=useState(''),[discount,setDiscount]=useState('0'),[treatment,setTreatment]=useState<'not-collected'|'added'|'included'>('not-collected'),[rate,setRate]=useState('0'),[disclosure,setDisclosure]=useState('');
 async function load(){const [history,book]=await Promise.all([recordsRequest<{versions:QuoteVersion[]}>(`quotes/deals/${id}`),recordsRequest<{products:Product[]}>('quotes/products')]);setVersions(history.versions);setProducts(book.products);setLoaded(true);return history.versions;}
 useEffect(()=>{setLoaded(false);void load().catch(e=>setError(e.message));},[id]);
 function edit(){const current=versions[0];setBaseVersion(current?.version??0);setLines(current?current.content.lines.map(line=>({productId:line.productId,quantity:String(line.quantity),discount:String(line.discountCents/100),override:line.override?String(line.unitPriceCents/100):'',reason:line.overrideReason??''})):[blankLine(),blankLine()]);setExpires(current?.content.expiresOn??'');setDiscount(String((current?.content.discountCents??0)/100));setTreatment(current?.content.tax.treatment??'not-collected');setRate(String((current?.content.tax.rateBasisPoints??0)/100));setDisclosure(current?.content.tax.disclosure??'');setEditing(true);setError('');setNotice('');void load().catch(e=>setError(e.message));}
 const change=(index:number,patch:Partial<EditLine>)=>setLines(current=>current.map((line,i)=>i===index?{...line,...patch}:line));
 async function save(event:React.FormEvent){event.preventDefault();setError('');setBusy(true);try{
  const body:QuoteInput={baseVersion,expiresOn:expires,discountCents:centsFromText(discount),tax:{treatment,rateBasisPoints:treatment==='not-collected'?0:centsFromText(rate),disclosure},lines:lines.map(line=>{const product=products.find(p=>p.id===line.productId);if(!product?.priceId)throw new Error('Choose an active product with a USD book price for every line.');return {productId:product.id,priceId:product.priceId,quantity:Number(line.quantity),discountCents:centsFromText(line.discount),overrideUnitPriceCents:line.override===''?null:centsFromText(line.override),overrideReason:line.reason||null};})};
  const saved=await recordsRequest<QuoteVersion>(`quotes/deals/${id}`,'POST',body);await load();setEditing(false);setNotice(`Quote version ${saved.version} saved. Nothing has been sent.`);
 }catch(e){setError((e as Error).message);await load().catch(()=>undefined);}finally{setBusy(false);}}
 async function review(version:number){setBusy(true);setError('');try{const result=await recordsRequest<{signature:{status:string}}>(`quotes/deals/${id}/versions/${version}/review`,'POST',{});setNotice(result.signature.status);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 return <section className="r-group quote-panel" aria-label="Deal quotes" data-testid="deal-quotes"><h3>Quotes</h3>
  {!loaded&&!error?<p>Loading quotes…</p>:null}{error?<p role="alert">{error}</p>:null}{notice?<p role="status">{notice}</p>:null}
  {versions.map((quote,index)=><details className="quote-version" id={`quote-${quote.id}`} key={quote.id} open={index===0||undefined}><summary>Quote version {quote.version}{index===0?' · Current':' · Superseded'}</summary>
   <p>Issued {quote.content.issuedOn} · Expires {quote.content.expiresOn}</p>
   {quote.content.lines.map((line,i)=><p key={i}><strong>{line.name}</strong><br/>{line.quantity} × {quoteMoney(line.unitPriceCents)}{line.override?<><br/>Override from {quoteMoney(line.bookUnitPriceCents)}: {line.overrideReason}</>:null}<br/>Line discount {quoteMoney(line.discountCents)} · {quoteMoney(line.totalCents)}</p>)}
   <dl><div><dt>Lines after discounts</dt><dd>{quoteMoney(quote.content.subtotalCents)}</dd></div><div><dt>Quote discount</dt><dd>{quoteMoney(quote.content.discountCents)}</dd></div><div><dt>US sales tax ({quote.content.tax.treatment})</dt><dd>{quoteMoney(quote.content.taxCents)}</dd></div><div><dt>Total</dt><dd><strong>{quoteMoney(quote.content.totalCents)}</strong></dd></div></dl>
   <p>{quote.content.tax.disclosure}</p><p>Not sent or signed. DocuSign setup is unresolved.</p>
   <button type="button" disabled={busy} onClick={()=>void review(quote.version)}>Review version {quote.version}</button>
  </details>)}
  {loaded&&!versions.length?<p>No quote yet.</p>:null}
  {!editing&&loaded?<button type="button" onClick={edit}>{versions.length?'Edit current quote':'Create quote'}</button>:null}
  {editing?<form aria-label="Quote version" onSubmit={event=>void save(event)}>
   <p>Saving creates version {baseVersion+1}. Previous versions keep their original prices and dates.</p>
   {lines.map((line,index)=>{const product=products.find(p=>p.id===line.productId);return <fieldset key={index}><legend>Line {index+1}</legend>
    <label>Product<select required value={line.productId} onChange={e=>change(index,{productId:e.target.value})}><option value="">Choose product</option>{products.filter(p=>p.active&&p.priceId).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
    {product?.unitPriceCents!==null&&product?.unitPriceCents!==undefined?<p>Book unit price {quoteMoney(product.unitPriceCents)}</p>:null}
    <label>Quantity<input required type="number" min="1" step="1" value={line.quantity} onChange={e=>change(index,{quantity:e.target.value})}/></label>
    <label>Line discount (USD)<input required inputMode="decimal" value={line.discount} onChange={e=>change(index,{discount:e.target.value})}/></label>
    <details><summary>Override unit price</summary><label>Override price (USD)<input inputMode="decimal" value={line.override} onChange={e=>change(index,{override:e.target.value})}/></label><label>Override reason<input required={line.override!==''} value={line.reason} onChange={e=>change(index,{reason:e.target.value})}/></label></details>
    {lines.length>2?<button type="button" onClick={()=>setLines(current=>current.filter((_,i)=>i!==index))}>Remove line {index+1}</button>:null}
   </fieldset>;})}
   <button type="button" disabled={lines.length>=50} onClick={()=>setLines(current=>[...current,blankLine()])}>Add product line</button>
   <label>Quote discount (USD)<input required inputMode="decimal" value={discount} onChange={e=>setDiscount(e.target.value)}/></label>
   <label>Expires on<input required type="date" value={expires} onChange={e=>setExpires(e.target.value)}/></label>
   <label>US sales-tax treatment<select value={treatment} onChange={e=>setTreatment(e.target.value as typeof treatment)}><option value="not-collected">Not collected</option><option value="added">Added to total</option><option value="included">Included in prices</option></select></label>
   {treatment!=='not-collected'?<label>Tax rate (percent)<input required inputMode="decimal" value={rate} onChange={e=>setRate(e.target.value)}/></label>:null}
   <label>US sales-tax disclosure<textarea required rows={3} value={disclosure} onChange={e=>setDisclosure(e.target.value)}/></label>
   <p>Orbit calculates totals when saved. Tax is entered explicitly; no tax service has determined it.</p>
   <div className="quote-actions"><button disabled={busy} type="submit">Save new version</button><button disabled={busy} type="button" onClick={()=>setEditing(false)}>Cancel edit</button></div>
  </form>:null}
  <a href="/app/settings/workspace#quote-products">Maintain products and USD prices in Settings</a>
 </section>;
}
