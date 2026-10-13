import {useEffect} from 'react';

/** Brings a cited line's target (#entry-…, #handoff-…) into view once the content that holds it has rendered. */
export function ScrollToHash({ready}:{ready:boolean}){
 useEffect(()=>{if(!ready||!location.hash)return;const target=document.getElementById(decodeURIComponent(location.hash.slice(1)));target?.scrollIntoView({block:'center'});},[ready]);
 return null;
}
