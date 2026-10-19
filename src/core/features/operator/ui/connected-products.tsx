import {useEffect,useState} from 'react';
import {OperatorState} from './operator-shell';
import {formatDate} from './formatters';
interface Product {job:string;products:string[];owns:string;state:'receiving'|'awaiting-delivery'|'unavailable';lastDeliveryAt:string|null;inOrbit:string}
const label={receiving:'Receiving bookings','awaiting-delivery':'Not set up yet',unavailable:'Not available in Orbit'} as const;
/** Separate products own these jobs; each shows only what Orbit really receives from it today. */
export function ConnectedProducts(){
 const [products,setProducts]=useState<Product[]>(),[error,setError]=useState('');
 useEffect(()=>{let active=true;void fetch('/api/v1/settings/products').then(async response=>{if(!response.ok)throw new Error('Connected products could not load.');const data=await response.json() as {products:Product[]};if(active)setProducts(data.products);}).catch(e=>{if(active)setError((e as Error).message);});return()=>{active=false;};},[]);
 return <section className="operator-surface workbench-form" aria-labelledby="connected-products"><h2 id="connected-products">Connected products</h2><p>Orbit is your sales CRM. These jobs belong to separate products, which you keep using directly. Orbit shows only what it actually receives from them.</p>
  {error&&<OperatorState kind="error">{error}</OperatorState>}{!products&&!error&&<OperatorState>Loading connected products…</OperatorState>}
  {products&&<ul className="connected-products" style={{listStyle:'none',padding:0,margin:0,display:'grid',gap:12}}>{products.map(product=><li key={product.products.join()} data-state={product.state} style={{borderTop:'1px solid var(--operator-border,#d8dce3)',paddingTop:8,overflowWrap:'anywhere'}}>
   <h3 style={{margin:'0 0 4px'}}>{product.products.join(', ')} <small>· {product.job}</small></h3>
   <p style={{margin:'0 0 4px'}}><strong>{label[product.state]}</strong>{product.lastDeliveryAt?` · Last delivery ${formatDate(product.lastDeliveryAt)}`:''}</p>
   <p style={{margin:'0 0 4px'}}>{product.inOrbit}{product.state==='awaiting-delivery'&&<> <a href="/app/sources">Open Signal sources</a></>}</p>
   <p style={{margin:0}}>Owns: {product.owns}.</p>
  </li>)}</ul>}
 </section>;
}
