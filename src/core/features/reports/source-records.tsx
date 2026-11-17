import {useEffect,useState} from 'react';
import {label} from '../operator/ui/formatters';

type Ref={type:string;id:string};
const nameOf=(fields:Record<string,unknown>)=>[fields.title,fields.name,fields.email].find((value):value is string=>typeof value==='string'&&value.trim().length>0);

/** One page of a result's source records, each named by the record it reads, so contributions can be reconciled before opening any.
 * A name the reader may not see falls back to its type; opening a record still checks current access. */
export function SourceRecordList({workspace,refs}:{workspace:string;refs:Ref[]}){
 const [names,setNames]=useState<Record<string,string>>({}),key=refs.map(ref=>`${ref.type}:${ref.id}`).join('|');
 useEffect(()=>{
  let active=true;
  void Promise.all(refs.map(async ref=>{
   try{
    const response=await fetch(`/api/v2/workspaces/${encodeURIComponent(workspace)}/records/${encodeURIComponent(ref.type)}/${encodeURIComponent(ref.id)}`,{credentials:'same-origin',cache:'no-store'});
    if(!response.ok)return null;
    const name=nameOf(((await response.json()) as {fields?:Record<string,unknown>}).fields??{});
    return name?([`${ref.type}:${ref.id}`,name] as [string,string]):null;
   }catch{return null;}
  })).then(found=>{if(active)setNames(Object.fromEntries(found.filter((entry):entry is [string,string]=>entry!==null)));});
  return()=>{active=false;};
 },[workspace,key]);
 return <ol>{refs.map(ref=>{const name=names[`${ref.type}:${ref.id}`];return <li key={`${ref.type}:${ref.id}`}><a href={`/app/shared-records?${new URLSearchParams({kind:ref.type,id:ref.id})}`}>{name?<>{name} <span className="reports-quiet">· {label(ref.type)}</span></>:<>Open {label(ref.type)}</>}</a></li>;})}</ol>;
}
