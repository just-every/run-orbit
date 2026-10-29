import {useEffect,useSyncExternalStore} from 'react';
import {useBlocker,useRouter} from '@tanstack/react-router';
import {currentItem,dailyItems,settingsAreas,settingsItem} from '../nav';

/** A form the leave guard waits for (useAutosave registers each one while it is on the page). */
export interface GuardedForm{
 /** Commits what is being typed and waits for the saves in flight and queued behind them; true when nothing is left
  * unsaved. */
 settle():Promise<boolean>;
 /** Sends every failed change again; true when they all saved. */
 retry():Promise<boolean>;
 /** The first change that could not be saved: its field's label, why, and where it is. */
 unsaved():{label:string;message:string;element:HTMLElement|null}|null;
 /** Commits what is being typed and sends what is pending with fetch keepalive: the tab is hidden, or (final) the page
  * is going away. */
 leaving(final:boolean):void;
}
const forms=new Set<GuardedForm>();
export function registerForm(form:GuardedForm){forms.add(form);return()=>{forms.delete(form);};}

/** A navigation the guard refused: where it was going, and the change that kept the page. */
export interface BlockedLeave{href:string;destination:string;label:string;message:string}
let blocked:BlockedLeave|null=null;
const listeners=new Set<()=>void>();
function setBlocked(next:BlockedLeave|null){blocked=next;for(const listener of listeners)listener();}
const subscribe=(listener:()=>void)=>{listeners.add(listener);return()=>{listeners.delete(listener);};};
export const useBlockedLeave=()=>useSyncExternalStore(subscribe,()=>blocked,()=>null);
export const dismissBlockedLeave=()=>setBlocked(null);

/** The destination's own name for the note's way out: its menu entry, else "the next page". */
function destinationName(pathname:string){
 const area=currentItem(settingsAreas,pathname);
 if(area&&currentItem([settingsItem],pathname))return area.label;
 return currentItem([...dailyItems,settingsItem],pathname)?.label??'the next page';
}

/** Every in-app navigation (the menu, links, Back within the app, Done) commits the focused field and waits for the
 * saves in flight; a refused save keeps the page and names it at the top (leave-note.tsx). On pagehide and when the
 * tab is hidden, pending saves go with keepalive; what never arrives is still kept on this device (kept-edits.ts). */
export function useLeaveGuard(){
 const router=useRouter();
 useBlocker({
  enableBeforeUnload:false,
  shouldBlockFn:async({next})=>{
   if(!forms.size)return false;
   const results=await Promise.all([...forms].map(form=>form.settle()));
   if(results.every(Boolean)){setBlocked(null);return false;}
   const first=[...forms].map(form=>form.unsaved()).find(Boolean);
   first?.element?.scrollIntoView({block:'center'});
   setBlocked({href:next.pathname+router.options.stringifySearch(next.search),destination:destinationName(next.pathname),label:first?.label??'A change',message:first?.message??''});
   return true;
  },
 });
 useEffect(()=>{
  const away=()=>{for(const form of forms)form.leaving(true);};
  const hidden=()=>{if(document.visibilityState==='hidden')for(const form of forms)form.leaving(false);};
  window.addEventListener('pagehide',away);document.addEventListener('visibilitychange',hidden);
  return()=>{window.removeEventListener('pagehide',away);document.removeEventListener('visibilitychange',hidden);setBlocked(null);};
 },[]);
}

/** Retries every refused change; true when all saved. */
export async function retryAll(){const results=await Promise.all([...forms].map(form=>form.retry()));return results.every(Boolean);}
