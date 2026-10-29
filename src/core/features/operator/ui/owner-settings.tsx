import {useCallback,useMemo,useState} from 'react';
import {AutosaveField} from './autosave/field';
import {InlineConfirm} from './autosave/inline-confirm';
import {useAutosave,type Values} from './autosave/use-autosave';
import {saveRequest} from './record/record-api';

/** Settings › Team › Owner email: a new address saves when the field is left, after asking once, since every other
 * owner session and old sign-in link ends with it (a hosted install also asks for a fresh email proof). */
export function OwnerSettings({owner,onSaved}:{owner:{email:string;editable:boolean}|null;onSaved:()=>Promise<void>}) {
 const copy=useMemo(()=>owner?{email:owner.email}:null,[owner?.email]);
 const send=useCallback(async(changes:Values,base:Values,_copy:Values,init:{keepalive?:boolean})=>{await saveRequest('settings/owner','PUT',{email:changes.email,currentEmail:base.email},init);return {copy:{email:changes.email},changed:true};},[]);
 const form=useAutosave<Values>({key:'settings.owner',copy,send,reread:async()=>copy??{email:''},onSaved:()=>void onSaved()});
 const [typed,setTyped]=useState<string|null>(null),[asking,setAsking]=useState(false),[refused,setRefused]=useState('');
 if(!owner)return null;
 const current=String(form.value('email')??'');
 function left(){const next=(typed??'').trim().toLowerCase();if(typed===null||next===current){setTyped(null);return;}if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next)){setRefused('Enter an email address such as you@your-company.com.');return;}setRefused('');setAsking(true);}
 const keep=()=>{setAsking(false);setTyped(null);setRefused('');};
 return <section className="operator-surface settings-card" aria-labelledby="team-owner-email"><h2 id="team-owner-email">Owner email</h2><p className="settings-card__line">Used to recover the owner's sign-in; it travels with your records archive.</p>
  {owner.editable?<AutosaveField form={form} field="email" label="Owner email"
   after={<>{refused?<p className="r-fail" role="alert">{refused}</p>:null}{asking&&typed?<InlineConfirm sentence={`Sign in with ${typed.trim().toLowerCase()}? Other owner sessions and old sign-in links end.`} action="Use this email" keep={`Keep ${current}`} onConfirm={()=>{form.commit('email',typed.trim().toLowerCase());setAsking(false);setTyped(null);}} onKeep={keep}/>:null}</>}>
   <input type="email" maxLength={254} value={typed??current} onChange={event=>{setTyped(event.target.value);setAsking(false);}} onBlur={left} onKeyDown={event=>{if(event.key==='Enter'){event.preventDefault();left();}if(event.key==='Escape')keep();}}/>
  </AutosaveField>:<p>{owner.email}. Only the installation owner can change it.</p>}
 </section>;
}
