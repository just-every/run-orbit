/** Capture owns its namespace even before a source is connected. */
export const signedSourcePredicate="type<>'capture' AND lower(substr(id,1,8))<>'capture-'";
export function isCaptureSource(id:string,type?:string){return id.toLowerCase().startsWith('capture-')||type==='capture';}
