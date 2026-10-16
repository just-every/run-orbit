import {useEffect,useId,useState} from 'react';
import {FoldWorkspace} from '../../fold-ui/workspace';
import {FormsConsole} from '../../forms/console';
export interface RecipeContext {contacts:{id:string;name:string|null;email:string|null}[];forms:{slug:string;operationId:string;revision:number}[]}
export {CopyText} from './recipe-snippet';
import {Snippet} from './recipe-snippet';
import {AutomationRecipe} from './automation-recipe';
import {BookingRecipe} from './booking-recipe';
export function SourceRecipes({sourceId,context,secret,onRefresh}:{sourceId:string;context:RecipeContext;secret?:string;onRefresh:()=>void}){
 const recipeLabel=useId(),formLabel=useId();
 const[recipe,setRecipe]=useState('website'),[formSlug,setFormSlug]=useState(context.forms[0]?.slug??'');
 const origin=window.location.origin,endpoint=`${origin}/api/v1/signals/${sourceId}`,email=context.contacts[0]?.email??'customer@example.com';
 const form=context.forms.find(item=>item.slug===formSlug)??context.forms[0];
 useEffect(()=>{setFormSlug(form?.slug??'');},[form?.slug]);

 return <section className="operator-surface workbench-form"><h2>Connect your tools</h2><label><span id={recipeLabel}>Recipe</span><select aria-labelledby={recipeLabel} value={recipe} onChange={e=>setRecipe(e.target.value)}><option value="website">Website form</option><option value="booking">Booking tool</option><option value="automation">Zapier or Make</option></select></label>
 {recipe==='website'?<><ol><li>Create your contact form below, review the compiled page, then approve and publish it.</li><li>Add your website in <a href="/app/settings#form-embedding">allowed embedding origins</a>, refresh published forms and copy the embed into your website.</li><li>Submit the form using your customer's email. Orbit matches it to that contact and adds the signal.</li></ol><details><summary>Create or publish a form</summary><FoldWorkspace title="Publish your contact form" embedded>{workspace=><FormsConsole workspaceId={workspace}/>}</FoldWorkspace></details><button type="button" onClick={onRefresh}>Refresh published forms</button>{form?<><label><span id={formLabel}>Published form</span><select aria-labelledby={formLabel} value={form.slug} onChange={e=>setFormSlug(e.target.value)}>{context.forms.map(item=><option key={item.slug} value={item.slug}>{item.slug}</option>)}</select></label><Snippet name="website-embed" text={`<iframe src="${origin}/p/${form.slug}" title="Contact form" width="100%" height="640"></iframe>`}/><iframe title="Published contact form" src={`/p/${form.slug}`} style={{width:'100%',height:640,border:0}}/><details><summary>Run a form submission in Node</summary><Snippet name="website" text={`const response=await fetch(${JSON.stringify(origin+'/api/public/forms/'+form.slug)},{method:'POST',headers:{'Content-Type':'application/json','Origin':${JSON.stringify(origin)}},body:JSON.stringify({operationId:${JSON.stringify(form.operationId)},revision:${form.revision},idempotencyKey:crypto.randomUUID(),values:{name:${JSON.stringify(context.contacts[0]?.name??'Customer')},email:${JSON.stringify(email)},message:'Please follow up'},consent:false})});\nif(!response.ok) throw Error(await response.text());\nconsole.log(await response.json());`}/></details></>:<p>Publish a reviewed form to see its live embed here.</p>}</>:recipe==='booking'?<BookingRecipe key={sourceId} endpoint={endpoint} sourceId={sourceId} secret={secret} onRefresh={onRefresh}/>:<AutomationRecipe key={sourceId} endpoint={endpoint} secret={secret} onRefresh={onRefresh}/>}
 </section>;
}
