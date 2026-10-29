import {useEffect,useRef} from 'react';

/** Reads a record's page again every so often while the tab is shown, so a teammate's change arrives in place: the
 * page keeps its data while it reads, nothing remounts, folds and menus stay open, and a value being typed is kept. */
export function useRefresh(reload:()=>void,every=30000){
 const latest=useRef(reload);latest.current=reload;
 useEffect(()=>{const timer=setInterval(()=>{if(document.visibilityState==='visible')latest.current();},every);return()=>clearInterval(timer);},[every]);
}
