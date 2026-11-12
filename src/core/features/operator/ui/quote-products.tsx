import {useEffect,useState} from 'react';
import {recordsRequest} from './records-api';
import {centsFromText,quoteMoney} from './record/quote-panel';
type Product={id:string;name:string;active:number;priceId:string|null;unitPriceCents:number|null};
export function QuoteProducts(){
 const [products,setProducts]=useState<Product[]>([]),[error,setError]=useState(''),[notice,setNotice]=useState('');
 async function load(){setProducts((await recordsRequest<{products:Product[]}>('quotes/products')).products);}
 useEffect(()=>{void load().catch(e=>setError(e.message));},[]);
 async function save(product:Product|undefined,input:{name:string;price:string;active:boolean}){
  setError('');setNotice('');try{const cents=centsFromText(input.price);const saved=await recordsRequest<{id:string}>(`quotes/products${product?'/'+product.id:''}`,product?'PUT':'POST',{name:input.name,active:input.active});if(input.active&&cents!==product?.unitPriceCents)await recordsRequest(`quotes/products/${saved.id}/prices`,'POST',{unitPriceCents:cents,basePriceId:product?.priceId??null});await load();setNotice('Product and USD price saved. Issued quote versions keep their prices.');return true;}catch(e){setError((e as Error).message);await load().catch(()=>undefined);return false;}
 }
 return <section id="quote-products" className="operator-surface settings-card quote-panel" aria-label="Products and USD price book"><h2>Products and USD price book</h2><p>Book prices supply new quote versions. Unit-price overrides are recorded on the quote.</p>{error?<p role="alert">{error}</p>:null}{notice?<p role="status">{notice}</p>:null}
  {products.map(product=><ProductForm key={`${product.id}-${product.priceId}-${product.name}-${product.active}`} product={product} onSave={input=>save(product,input)}/>)}
  <details><summary>Add product</summary><ProductForm onSave={input=>save(undefined,input)}/></details>
 </section>;
}
function ProductForm({product,onSave}:{product?:Product;onSave:(input:{name:string;price:string;active:boolean})=>Promise<boolean>}){
 const [name,setName]=useState(product?.name??''),[price,setPrice]=useState(String((product?.unitPriceCents??0)/100)),[active,setActive]=useState(product?Boolean(product.active):true),[busy,setBusy]=useState(false);
 return <form className="quote-book-row" aria-label={product?`Product ${product.name}`:'New product'} onSubmit={async e=>{e.preventDefault();setBusy(true);try{if(await onSave({name,price,active})&&!product){setName('');setPrice('0');}}finally{setBusy(false);}}}>
  <label>Product name<input required maxLength={200} value={name} onChange={e=>setName(e.target.value)}/></label><label>USD unit price<input required inputMode="decimal" value={price} onChange={e=>setPrice(e.target.value)}/></label>
  {product?<label>Availability<select value={active?'active':'archived'} onChange={e=>setActive(e.target.value==='active')}><option value="active">Active</option><option value="archived">Archived</option></select></label>:null}
  {product?.unitPriceCents!==null&&product?.unitPriceCents!==undefined?<p>Current book price {quoteMoney(product.unitPriceCents)}</p>:null}
  <button disabled={busy} type="submit">{product?'Save product':'Create product'}</button>
 </form>;
}
