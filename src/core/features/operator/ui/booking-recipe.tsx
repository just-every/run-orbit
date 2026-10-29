import './capture-setup.css';
import './capture-providers.css';
import {useState,type FormEvent} from 'react';
import {RecipeCredential,RecipeValue,WebhookWarning,isHostedWebhook} from './recipe-snippet';

export function BookingRecipe({endpoint,sourceId,secret,onRefresh,initialVendor='calcom'}:{endpoint:string;sourceId:string;secret?:string;onRefresh:()=>void;initialVendor?:'calcom'|'calendly'}){
 const[vendor,setVendor]=useState<string>(initialVendor),[saving,setSaving]=useState(false),[status,setStatus]=useState(''),[error,setError]=useState('');
 const url=`${endpoint}/${vendor}`,hosted=isHostedWebhook(url);
 async function connect(event:FormEvent<HTMLFormElement>){
  event.preventDefault();const form=event.currentTarget,token=String(new FormData(form).get('token')??'');form.reset();setSaving(true);setError('');setStatus('');
  try{
   const response=await fetch(`/api/v1/sources/${sourceId}/calendly`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token})});
   const result=await response.json() as {error?:string};
   if(!response.ok)throw new Error(result.error??'Calendly setup was not confirmed.');
   setStatus('Calendly confirmed an active webhook. Book a meeting below to check that a real delivery reaches Orbit.');
  }catch(error){setError(error instanceof Error?error.message:'Calendly setup was not confirmed.');}
  finally{setSaving(false);}
 }
 return <><label>Booking provider<select aria-label="Booking provider" value={vendor} disabled={saving} onChange={event=>{setVendor(event.target.value);setStatus('');setError('');}}><option value="calcom">Cal.com</option><option value="calendly">Calendly</option></select></label><WebhookWarning endpoint={url}/><RecipeValue label="Webhook URL" value={url}/>
 {vendor==='calcom'?<><h3>Connect Cal.com</h3><ol className="capture-plain-steps">
 <li>Open <a href="https://app.cal.com/settings/developer/webhooks">Cal.com → Settings → Developer → Webhooks</a> and click <strong>New webhook</strong>. Choose an account webhook for all your event types, or open an event type’s Advanced settings to connect only that event type.</li>
 <li>Paste the webhook URL above into <strong>Subscriber URL</strong>. Select <strong>Booking Created</strong> and <strong>Booking Cancelled</strong>. Leave the payload template at its default.</li>
 <li>Paste the source secret below into <strong>Secret</strong>. Turn the webhook on and click <strong>Create webhook</strong> or <strong>Save</strong>.</li>
 </ol><RecipeCredential secret={secret}/><p><a href="https://cal.com/help/webhooks">Cal.com’s webhook settings help</a></p></>:<><h3>Connect Calendly</h3><p>Calendly registers webhooks through its API. Orbit makes that request for you; you do not need a server or a command line. Calendly requires a paid plan with webhook access, such as Standard, Teams or Enterprise.</p><ol className="capture-plain-steps">
 <li>Open <a href="https://calendly.com/integrations/api_webhooks">Calendly → Integrations → API &amp; Webhooks</a>. Under Personal Access Tokens choose <strong>Get a token now</strong> or <strong>Generate new token</strong>.</li>
 <li>Name it <strong>Orbit</strong>. If Calendly asks for permissions, select <code>users:read</code>, <code>webhooks:read</code>, <code>webhooks:write</code> and <code>scheduled_events:read</code>. Create it and copy the token. It is separate from your Orbit source secret.</li>
 <li>Paste it below and click <strong>Connect Calendly</strong>. Orbit registers bookings and cancellations for that Calendly user using the webhook URL above and this source’s signing secret. It replaces any subscription for this exact URL belonging to that user. It does not change your other webhooks.</li>
 </ol><form className="workbench-form" onSubmit={event=>void connect(event)}><label>Calendly personal access token<input name="token" type="password" required autoComplete="off" disabled={saving||!hosted} maxLength={4096}/></label><p>The token is used only for this setup request and is not saved by Orbit. The field clears when you submit.</p><button type="submit" disabled={saving||!hosted}>{saving?'Connecting…':'Connect Calendly'}</button></form>{error&&<p role="alert">{error}</p>}{status&&<p role="status">{status}</p>}<p><a href="https://developer.calendly.com/docs/authentication/how-to-authenticate-with-personal-access-tokens">Calendly token help</a> · <a href="https://developer.calendly.com/api-docs/calendly-api/webhooks/create-webhook-subscription">What Orbit registers with Calendly</a> · <a href="https://developer.calendly.com/docs/getting-started/frequently-asked-questions">Calendly plan requirements</a></p></>}
 <h3>Test a booking</h3><ol className="capture-plain-steps"><li>Open your public {vendor==='calcom'?'Cal.com':'Calendly'} booking page and make a booking using an email that already belongs to an Orbit contact. This is a real booking; choose a suitable test time.</li><li>Click <strong>Check latest delivery</strong> below. The latest delivery time should advance. Open the contact in <a href="/app/contacts">Contacts</a> and look for <strong>Meeting booked</strong> on its timeline. Unknown invitees wait in Unlinked review below.</li><li>Cancel the test booking in your booking tool. Check latest delivery again and look for <strong>Meeting cancelled</strong>.</li></ol><button type="button" onClick={onRefresh}>Check latest delivery</button><p>If nothing arrives, check the provider’s delivery history, this URL, the source’s enabled state and its latest error. After rotating the Orbit source secret, update Cal.com’s Secret or run Connect Calendly again before testing.</p>
 </>;
}
