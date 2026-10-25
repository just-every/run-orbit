import {useEffect} from 'react';
import {useRouterState} from '@tanstack/react-router';

/** Layout may keep settling for this long after the last change (sections above the target loading) before the target is left where it is. */
const QUIET_MS=3000,LIMIT_MS=15000;
const inputs=['wheel','touchmove','pointerdown','keydown'] as const;

/** Brings a cited line's target (#entry-…, #handoff-…) into view once the content that holds it has rendered, and keeps it in view while the content around it settles. Any scroll, key or pointer input by the person ends it. */
export function ScrollToHash({ready}:{ready:boolean}){
 const hash=useRouterState({select:state=>state.location.hash});
 useEffect(()=>{
  if(!ready||!location.hash)return;
  let id:string;try{id=decodeURIComponent(location.hash.slice(1));}catch{return;}
  let target:HTMLElement|null=null,quiet:ReturnType<typeof setTimeout>|undefined;
  function settle(){
   const next=document.getElementById(id);if(!next)return;
   next.scrollIntoView({block:'start'});
   if(next!==target){
    target=next;
    if(!next.hasAttribute('tabindex'))next.tabIndex=-1;
    next.focus({preventScroll:true});
   }
   clearTimeout(quiet);quiet=setTimeout(stop,QUIET_MS);
  }
  const observer=new ResizeObserver(settle);
  // Reports inserts its target after loading the workspace; settings above a target can load later too.
  const content=new MutationObserver(settle);
  const limit=setTimeout(stop,LIMIT_MS);
  function stop(){observer.disconnect();content.disconnect();clearTimeout(quiet);clearTimeout(limit);for(const type of inputs)window.removeEventListener(type,stop,true);}
  observer.observe(document.body);observer.observe(document.documentElement);
  content.observe(document.body,{childList:true,subtree:true});
  settle();
  for(const type of inputs)window.addEventListener(type,stop,{capture:true,passive:true});
  return stop;
 },[ready,hash]);
 return null;
}
