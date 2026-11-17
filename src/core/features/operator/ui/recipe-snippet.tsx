import {useEffect,useState} from 'react';
export function CopyText({text,label='Copy'}:{text:string;label?:string}){
 const[copied,setCopied]=useState(false),[error,setError]=useState('');
 useEffect(()=>{setCopied(false);setError('');},[text]);
 async function copy(){setError('');try{await navigator.clipboard.writeText(text);setCopied(true);}catch{setCopied(false);setError('Copy failed. Allow clipboard access in your browser and try again.');}}
 return <><button type="button" className="orbit-button orbit-button--secondary" onClick={()=>void copy()}>{copied?'Copied':label}</button>{error&&<p role="alert">{error}</p>}</>;
}
export function Snippet({text,name}:{text:string;name:string}){return <><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}} data-recipe={name}><code>{text}</code></pre><CopyText text={text} label="Copy code"/></>;}

export function RecipeValue({label,value}:{label:string;value:string}){
 return <div><label>{label}<input readOnly value={value} onFocus={event=>event.currentTarget.select()}/></label><CopyText text={value} label={`Copy ${label.toLowerCase()}`}/></div>;
}
export function RecipeCredential({secret,authorization=false,settingsHref="/app/settings/capture#capture-website-events"}:{secret?:string;authorization?:boolean;settingsHref?:string}){
 const[value,setValue]=useState(secret??'');
 useEffect(()=>{setValue(secret??'');},[secret]);
 return <div><label>Source secret<input type="password" autoComplete="off" value={value} onChange={event=>setValue(event.target.value.trim())}/></label><p>{secret?'Your newly generated secret is ready to copy.':<>Paste the secret you saved when connecting this source. If you no longer have it, open <a href={settingsHref}>this source in Settings › Capture</a>, expand Advanced and choose <strong>Rotate signing secret</strong>. Update every connected tool.</>} It stays on this page until you leave; keep it in the provider’s credential settings.</p>{value&&<><CopyText text={value} label="Copy source secret"/>{authorization&&<><CopyText text={`Bearer ${value}`} label="Copy authorization value"/><CopyText text={`Authorization: Bearer ${value}`} label="Copy authorization header"/></>}</>}</div>;
}
export function isHostedWebhook(url:string){
 const parsed=new URL(url),host=parsed.hostname;
 return parsed.protocol==='https:'&&!/^(localhost|127\.|\[::1\]$)/.test(host)&&!host.endsWith('.localhost')&&!host.endsWith('.local');
}
export function WebhookWarning({endpoint,settingsHref="/app/settings/capture#capture-website-events"}:{endpoint:string;settingsHref?:string}){
 return isHostedWebhook(endpoint)?null:<p role="note"><strong>Your tools cannot reach this Orbit address.</strong> This copy runs on your computer. Zapier, Make, Calendly and Cal.com need your hosted Orbit’s public HTTPS address. Deploy Orbit, open Sources in that hosted installation and connect the source there; copy its URL and secret there. To check this local installation, open <a href={settingsHref}>this source’s recipe in Settings › Capture</a> and choose <strong>Send test event</strong>. This does not test a provider connection.</p>;
}
