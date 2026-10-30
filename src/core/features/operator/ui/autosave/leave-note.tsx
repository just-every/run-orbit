import {useNavigate} from '@tanstack/react-router';
import {useState} from 'react';
import {dismissBlockedLeave,retryAll,useBlockedLeave} from './leave-guard';

/** At the page's top when leaving waited for a save that was refused: the page stays, says which value and why, and
 * offers Retry (then goes on) or to keep the change on this device and go anyway. */
export function LeaveNote(){
 const blocked=useBlockedLeave(),navigate=useNavigate(),[busy,setBusy]=useState(false);
 if(!blocked)return null;
 const reason=blocked.message.replace(/^Not saved: /,'').replace(/\.$/,'');
 async function go(){const target=blocked!.href;dismissBlockedLeave();await navigate({href:target,ignoreBlocker:true});}
 async function retry(){setBusy(true);try{if(await retryAll())await go();}finally{setBusy(false);}}
 return <div className="r-leave" role="alert">
  <p><b>{blocked.label} is not saved</b>: {reason}, so you are still on this page.</p>
  <div><button type="button" className="operator-button" disabled={busy} onClick={()=>void retry()}>Retry</button><button type="button" className="operator-text-button" disabled={busy} onClick={()=>void go()}>Keep it on this device and go to {blocked.destination}</button></div>
 </div>;
}
