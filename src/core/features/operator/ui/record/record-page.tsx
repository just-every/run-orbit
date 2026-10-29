import type {ReactNode} from 'react';
import {textProps,useGrow} from '../autosave/field';
import {SaveFailure} from '../autosave/save-failure';
import type {AutosaveForm} from '../autosave/use-autosave';
import './record.css';

/** The record's name as a quiet field drawn as the H1: it reads as the title; hover or focus shows its one border;
 * Enter or leaving it saves. A name the record cannot do without is refused under it. */
export function RecordTitle({form,field,label,required}:{form:AutosaveForm;field:string;label:string;required?:string}){
 const props=textProps(form,field,{parse:text=>required&&!text.trim()?{error:required}:{value:text.trim()||null}}),grow=useGrow(String(props.value));
 const status=form.status(field);
 return <div className={`r-title-box ${status.state==='failed'||status.state==='conflict'?'is-failed':''}`} data-autosave="">
  <h1 className="r-title"><textarea ref={grow} rows={1} aria-label={label} maxLength={500} spellCheck={false} {...props}/></h1>
  <SaveFailure status={status} onRetry={()=>form.retry(field)} onDiscard={()=>form.discard(field)} onUseMine={()=>form.useMine(field)}/>
 </div>;
}

/** Two columns under the title: the work (what waits for a person, the next action, activity, the foot folds) and
 * the details beside it; one column from 900 px down with the details after the next action. */
export function RecordFrame({waiting,next,activity,folds,details}:{waiting?:ReactNode;next:ReactNode;activity:ReactNode;folds?:ReactNode;details:ReactNode}){
 return <div className="r-a"><div className="r-main">{waiting}{next}{activity}{folds}</div>{details}</div>;
}
