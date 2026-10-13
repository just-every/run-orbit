/** Orbit's own mail provider writes these sources; no signed tool may claim them. */
export const mailProviderSourceIds=['sendgrid-events','sendgrid-replies'] as const;
/** Capture and the mail provider own their namespaces even before a source is connected. */
export const signedSourcePredicate=`type NOT IN('capture','mail_provider') AND lower(substr(id,1,8))<>'capture-' AND lower(id) NOT IN(${mailProviderSourceIds.map(id=>`'${id}'`).join(',')})`;
export function isNativeSource(id:string,type?:string){
 const key=id.toLowerCase();
 return key.startsWith('capture-')||(mailProviderSourceIds as readonly string[]).includes(key)||type==='capture'||type==='mail_provider';
}
