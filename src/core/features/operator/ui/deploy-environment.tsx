import {useState} from 'react';

/** rer names the Worker `sales-orbit-<environment>`, so a workers.dev address tells which environment this is. */
export function deployedEnvironment(hostname:string){return /^sales-orbit-([a-z0-9-]+)\.[a-z0-9-]+\.workers\.dev$/.exec(hostname)?.[1]??'production';}

/** The environment name hosted setup commands use: filled in from this address, editable for a custom domain. */
export function useDeployEnvironment(){
 const [environment,setEnvironment]=useState(()=>typeof window==='undefined'?'production':deployedEnvironment(window.location.hostname));
 return {environment,setEnvironment,name:/^[a-z0-9-]+$/.test(environment)?environment:'NAME'};
}

export function EnvironmentField({id,environment,setEnvironment}:{id:string;environment:string;setEnvironment:(value:string)=>void}){
 return <><label>Deployment environment name<input value={environment} onChange={e=>setEnvironment(e.target.value)} aria-describedby={id}/></label>
  <p id={id}>The name you gave <code>rer deploy --environment</code> when you created this installation; <code>production</code> if you gave none. Orbit fills it in from this address when it can.</p></>;
}
