/** This script is part of the reviewed artifact, never injected when the page is served. */
export function publicFormScript(input:{slug:string;revision:number;operationId:string;fields:string[];turnstileSiteKey?:string}){
 const config=JSON.stringify(input).replaceAll('<','\\u003c');
 return `(()=>{
const config=${config},form=document.getElementById('capture'),result=document.getElementById('result'),button=document.getElementById('capture-submit'),retry=document.getElementById('capture-retry');
const endpoint='/api/public/forms/'+config.slug;
let started=false,key,fillToken='',readyAt=0,turnstileToken='',widgetId,widgetState='idle',preparing=false,sending=false,received=false;
function notice(message,error=false){result.textContent=message;result.setAttribute('role',error?'alert':'status');}
function update(){button.disabled=sending||!fillToken||Date.now()<readyAt||Boolean(config.turnstileSiteKey&&!turnstileToken);}
function prepared(){update();if(received||sending)return;if(!fillToken)return;if(Date.now()<readyAt)notice('Please wait two seconds while this form is prepared.');else if(config.turnstileSiteKey&&!turnstileToken)notice('Complete the verification before submitting.');else notice('Ready to submit.');}
function verificationFailed(message){turnstileToken='';widgetState='failed';retry.hidden=false;notice(message,true);update();}
function renderVerification(){
 widgetState='ready';
 widgetId=window.turnstile.render(document.getElementById('capture-verification'),{sitekey:config.turnstileSiteKey,action:'orbit_form',callback:token=>{turnstileToken=token;retry.hidden=Boolean(fillToken)||preparing;prepared();},'expired-callback':()=>{turnstileToken='';prepared();},'error-callback':()=>verificationFailed('Verification could not finish. Try verification again.')});
}
function verification(){
 if(!config.turnstileSiteKey||widgetState==='loading')return;
 if(widgetId!==undefined){if(widgetState==='failed'){widgetState='ready';window.turnstile.reset(widgetId);}return;}
 widgetState='loading';
 if(window.turnstile){renderVerification();return;}
 const script=document.createElement('script');script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';script.async=true;script.onload=()=>{try{renderVerification();}catch(error){verificationFailed('Verification could not load. Try verification again.');}};script.onerror=()=>{script.remove();verificationFailed('Verification could not load. Try verification again.');};document.head.appendChild(script);
}
async function prepare(){
 started=true;key??=crypto.randomUUID();retry.hidden=true;verification();
 if(fillToken){prepared();return;}if(preparing)return;preparing=true;
 notice('Preparing this form. Please wait two seconds.');
 try{
  const response=await fetch(endpoint+'/challenge',{method:'POST',credentials:'omit',headers:{'Content-Type':'application/json'},body:JSON.stringify({idempotencyKey:key})});
  const body=await response.json();if(!response.ok)throw Error(body.error||'This form could not be prepared.');
  if(typeof body.token!=='string'||!body.token)throw Error('This form could not be prepared.');
  fillToken=body.token;readyAt=Date.now()+2000;prepared();setTimeout(prepared,2000);
 }catch(error){notice(error instanceof Error?error.message:'This form could not be prepared.',true);retry.hidden=false;}
 finally{preparing=false;update();}
}
function interact(){if(!started)void prepare();}
for(const event of ['pointerdown','keydown','input'])form.addEventListener(event,interact);
retry.addEventListener('click',()=>void prepare());
form.addEventListener('submit',async event=>{
 event.preventDefault();if(button.disabled)return;
 const data=new FormData(form),values={};for(const name of config.fields)values[name]=data.get(name);
 sending=true;update();notice('Submitting enquiry…');
 try{
  const response=await fetch(endpoint,{method:'POST',credentials:'omit',headers:{'Content-Type':'application/json'},body:JSON.stringify({revision:config.revision,operationId:config.operationId,idempotencyKey:key,values,consent:data.get('consent')==='on',honeypot:String(data.get('honeypot')||''),fillToken,...(config.turnstileSiteKey?{turnstileToken}:{})})});
  const body=await response.json();if(!response.ok)throw Error(body.error||'The enquiry could not be saved.');
  received=true;notice('Your enquiry was received. Thank you.');result.focus();
 }catch(error){notice(error instanceof Error?error.message:'The enquiry was not confirmed. Try submitting again.',true);result.focus();}
 finally{sending=false;update();}
});
})();`;
}
