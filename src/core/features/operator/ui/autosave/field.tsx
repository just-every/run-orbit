import {useEffect,useRef,type ReactNode} from 'react';
import {SavedLabel} from './saved-label';
import {SaveFailure} from './save-failure';
import type {AutosaveForm,Parse} from './use-autosave';
import './autosave.css';

/** A labelled value that saves itself: the label with ✓ Saved beside it, the control, and the one line under it when the
 * value did not save. Quiet fields read as text until hovered or focused; standard fields keep their border. */
export function AutosaveField({form,field,label,labelText,quiet=false,describe,className='',after,children}:{form:AutosaveForm;field:string;label:ReactNode;labelText?:string;quiet?:boolean;describe?:(value:unknown)=>string;className?:string;after?:ReactNode;children:ReactNode}){
 const box=useRef<HTMLDivElement>(null),status=form.status(field);
 useEffect(()=>{form.describe(field,labelText??(typeof label==='string'?label:'A value'),()=>box.current);});
 return <div ref={box} data-autosave="" className={`${quiet?'r-quiet':'r-field'} ${status.state==='failed'||status.state==='conflict'?'is-failed':''} ${className}`}>
  <label><span className="r-label"><span id={labelId(form,field)}>{label}</span><SavedLabel show={form.saved(field)}/></span>{children}</label>
  {after}
  <SaveFailure status={status} describe={describe} onRetry={()=>form.retry(field)} onDiscard={()=>form.discard(field)} onUseMine={()=>form.useMine(field)}/>
 </div>;
}

/** The id of a field's label words. Its control names itself by them alone (aria-labelledby), so a choice's options,
 * a text area's text and ✓ Saved never become part of its name. */
export const labelId=(form:AutosaveForm,field:string)=>`f-${form.key}-${field}`.replace(/[^\w-]/g,'-');

/** A text control's props: typing shows at once; leaving the field, or Enter in a one-line field, saves it. */
/** show writes the saved value at rest (A$18,000); editText writes it for typing (18000); parse reads the typing back. */
export function textProps(form:AutosaveForm,field:string,{multiline=false,parse,show=plain,editText=show}:{multiline?:boolean;parse?:Parse;show?:(value:unknown)=>string;editText?:(value:unknown)=>string}={}){
 return {
  'aria-labelledby':labelId(form,field),
  value:form.typing(field)?String(form.value(field)??''):show(form.value(field)),
  onFocus:()=>{if(!form.typing(field))form.edit(field,editText(form.value(field)),parse);},
  onChange:(event:React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement>)=>form.edit(field,event.target.value,parse),
  onBlur:()=>form.commit(field),
  onKeyDown:(event:React.KeyboardEvent)=>{if(event.key==='Enter'&&(!multiline||event.metaKey||event.ctrlKey)){event.preventDefault();form.commit(field);}if(event.key==='Escape'&&form.typing(field)){form.discard(field);}},
 };
}
const plain=(value:unknown)=>value===null||value===undefined?'':String(value);

/** A choice's props: it saves on change. */
export function choiceProps(form:AutosaveForm,field:string,parse:(value:string)=>unknown=value=>value){
 return {'aria-labelledby':labelId(form,field),value:String(form.value(field)??''),onChange:(event:React.ChangeEvent<HTMLSelectElement>)=>form.commit(field,parse(event.target.value))};
}

/** Grows a text area with its text (no resize handle). */
export function useGrow(value:string){
 const area=useRef<HTMLTextAreaElement>(null);
 useEffect(()=>{const element=area.current;if(!element)return;element.style.height='auto';element.style.height=`${element.scrollHeight+3}px`;},[value]);
 return area;
}
