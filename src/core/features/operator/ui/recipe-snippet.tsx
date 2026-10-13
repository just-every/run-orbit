import {useEffect,useState} from 'react';
export function CopyText({text,label='Copy'}:{text:string;label?:string}){
 const[copied,setCopied]=useState(false),[error,setError]=useState('');
 useEffect(()=>{setCopied(false);setError('');},[text]);
 async function copy(){setError('');try{await navigator.clipboard.writeText(text);setCopied(true);}catch{setCopied(false);setError('Copy failed. Select and copy the displayed text.');}}
 return <><button type="button" className="orbit-button orbit-button--secondary" onClick={()=>void copy()}>{copied?'Copied':label}</button>{error&&<p role="alert">{error}</p>}</>;
}
export function Snippet({text,name}:{text:string;name:string}){return <><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}} data-recipe={name}><code>{text}</code></pre><CopyText text={text} label="Copy code"/></>;}
