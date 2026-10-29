import {useCallback,useMemo} from 'react';
import {AutosaveField,textProps,useGrow} from '../autosave/field';
import {useAutosave,type Values} from '../autosave/use-autosave';
import {workspaceInstant,workspaceLocalInput,zoneLabel} from '../formatters';
import type {RecordKind} from '../records-api';
import {saveRequest} from './record-api';

export interface ManualEntryRow{id:string;kind:string;occurredAt:string;text:string;durationMinutes?:number;contactIds?:string[]}

/** An existing manual entry's text and time, saved as they change (there is no Save entry). */
export function EntryEditor({kind,recordId,entry,onSaved}:{kind:RecordKind;recordId:string;entry:ManualEntryRow;onSaved:()=>void}){
 const copy=useMemo(()=>({text:entry.text,occurredAt:entry.occurredAt}),[entry.text,entry.occurredAt]);
 const send=useCallback(async(changes:Values,_base:Values,current:Values,init:{keepalive?:boolean})=>{
  const next={...current,...changes};
  await saveRequest(`records/${kind}/${recordId}/entries/${entry.id}`,'PUT',{kind:entry.kind.replace('manual.',''),text:next.text,occurredAt:next.occurredAt,durationMinutes:entry.durationMinutes??0,contactIds:entry.contactIds??[]},init);
  return {copy:next,changed:true};
 },[kind,recordId,entry]);
 const form=useAutosave<Values>({key:`entry.${entry.id}`,copy,send,reread:async()=>copy,onSaved});
 const text=textProps(form,'text',{multiline:true}),grow=useGrow(String(text.value));
 return <div className="r-entry-editor">
  <AutosaveField form={form} field="text" label="Text" quiet><textarea ref={grow} rows={1} autoFocus maxLength={100000} {...text}/></AutosaveField>
  <AutosaveField form={form} field="occurredAt" label={`When (${zoneLabel()})`} labelText="When" quiet><input type="datetime-local" {...textProps(form,'occurredAt',{show:value=>value?workspaceLocalInput(String(value)):'',parse:local=>{try{return {value:workspaceInstant(local)};}catch{return {error:'Enter a date and time.'};}}})}/></AutosaveField>
 </div>;
}
