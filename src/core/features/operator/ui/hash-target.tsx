import {useEffect} from 'react';

/** Layout may keep settling for this long after the last change (sections above the target loading) before the target is left where it is. */
const QUIET_MS=3000,LIMIT_MS=15000;
const inputs=['wheel','touchmove','pointerdown','keydown'] as const;

/** Brings a cited line's target (#entry-…, #handoff-…) into view once the content that holds it has rendered, and keeps it in view while the content around it settles. Any scroll, key or pointer input by the person ends it. */
export function ScrollToHash({ready}:{ready:boolean}){
 useEffect(()=>{
  if(!ready||!location.hash)return;
  const id=decodeURIComponent(location.hash.slice(1));
  const find=()=>document.getElementById(id);
  const first=find();if(!first)return;
  let quiet:ReturnType<typeof setTimeout>;
  const observer=new ResizeObserver(()=>{find()?.scrollIntoView({block:'center'});clearTimeout(quiet);quiet=setTimeout(stop,QUIET_MS);});
  const limit=setTimeout(stop,LIMIT_MS);
  function stop(){observer.disconnect();clearTimeout(quiet);clearTimeout(limit);for(const type of inputs)window.removeEventListener(type,stop,true);}
  first.scrollIntoView({block:'center'});
  if(!first.hasAttribute('tabindex'))first.tabIndex=-1;
  first.focus({preventScroll:true});
  observer.observe(document.body);observer.observe(document.documentElement);
  quiet=setTimeout(stop,QUIET_MS);
  for(const type of inputs)window.addEventListener(type,stop,{capture:true,passive:true});
  return stop;
 },[ready]);
 return null;
}
