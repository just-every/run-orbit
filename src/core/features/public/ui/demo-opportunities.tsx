import {useEffect,useState} from 'react';
import type {DemoDeal} from '../demo-story';
export function DemoOpportunities({deals,index,onSelect}:{deals:DemoDeal[];index:number;onSelect:(index:number)=>void}){
 const[ready,setReady]=useState(false);useEffect(()=>setReady(true),[]);
 return <aside className="panel opportunities" aria-labelledby="opportunities-title"><div className="list-title"><h2 id="opportunities-title">Opportunities</h2><p>{deals.length} total</p></div>{deals.map((deal,i)=><button key={deal.id} type="button" disabled={!ready} className={`opportunity${i===index?' selected':''}`} aria-pressed={i===index} aria-controls="opportunity-detail" onClick={()=>onSelect(i)}><span><span className="company">{deal.company}</span><span className="industry">{deal.title}</span></span><span className="queue"><small>Next action</small>{deal.queue}</span><span className="chevron" aria-hidden="true">{i===index?'›':''}</span></button>)}</aside>;
}
