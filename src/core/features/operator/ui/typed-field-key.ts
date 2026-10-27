const reserved=new Set(['constructor','prototype']);

/** A new field's key, made from its name (lowercase words joined by "_"), never one this record type already uses. */
export function fieldKeyFor(label:string,taken:Set<string>){
 let base=label.normalize('NFKD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'').slice(0,60).replace(/_+$/,'');
 if(!/^[a-z]/.test(base))base=('field_'+base).slice(0,60).replace(/_+$/,'');
 if(reserved.has(base))base+='_field';
 let key=base;
 for(let n=2;taken.has(key);n++)key=`${base}_${n}`;
 return key;
}
