import {AutosaveField,textProps,useGrow} from '../autosave/field';
import type {AutosaveForm} from '../autosave/use-autosave';
import {DetailsGroup} from './details-panel';

/** One quiet text area that grows with its text and saves when left. */
function ContextField({form,field,label,placeholder,max}:{form:AutosaveForm;field:string;label:string;placeholder:string;max:number}){
 const props=textProps(form,field,{multiline:true}),grow=useGrow(String(props.value));
 return <AutosaveField form={form} field={field} label={label} quiet><textarea ref={grow} rows={1} maxLength={max} placeholder={placeholder} {...props}/></AutosaveField>;
}

/** Context: the deal's products (one per line), next step and commitments. */
export function DealContext({form}:{form:AutosaveForm}){
 return <DetailsGroup title="Context">
  <ContextField form={form} field="products" label="Products" placeholder="Add products" max={50100}/>
  <ContextField form={form} field="nextStep" label="Next step" placeholder="Add a next step" max={10000}/>
  <ContextField form={form} field="mutualCommitments" label="Commitments" placeholder="Add commitments" max={20000}/>
 </DetailsGroup>;
}
