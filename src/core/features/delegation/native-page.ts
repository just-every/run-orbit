import type {Context} from 'hono';
import type {ContentfulStatusCode} from 'hono/utils/http-status';
export const escapeHtml=(value:unknown)=>String(value).replace(/[&<>"']/g,character=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]!));
export function nativePage(title:string,body:string){return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(title)} · Orbit</title><link rel="stylesheet" href="/operator-native.css"></head><body><div class="operator-shell ob-app">
<a class="operator-skip-link" href="#operator-main">Skip to content</a>
<header class="operator-header">
<a class="operator-mark" href="/app" aria-label="Orbit home"><span class="ob-brand"><img class="ob-mark" src="/brand/mark.svg" alt="" width="34" height="34"><span class="ob-brand-name" data-rer-name>Orbit</span></span></a>
<button class="operator-menu-toggle" type="button" aria-expanded="false" aria-controls="operator-navigation">Menu</button>
<nav id="operator-navigation" aria-label="Operator navigation" class="operator-nav" data-open="false">
<a href="/app/records">Records</a><a href="/app">NOW</a><a href="/app/settings" aria-current="page">Settings</a><a href="/app/sources">Sources</a><a href="/app/capture">Capture</a><a href="/app/reports">Reports</a><a href="/app/forms">Forms</a><a href="/app/notifications">Notifications</a>
</nav>
<form class="operator-signout" action="/auth/signout" method="post"><button class="operator-back-link">Sign out</button></form>
</header>
<main id="operator-main" tabindex="-1" class="operator-main"><header class="operator-titlebar"><div><p class="operator-eyebrow"><a href="/app/settings#access">Settings · Access</a></p><h1>${escapeHtml(title)}</h1></div></header>${body}</main>
</div><script>
(()=>{
 const toggle=document.querySelector('.operator-menu-toggle'),navigation=document.getElementById('operator-navigation');
 const expand=value=>{toggle.setAttribute('aria-expanded',String(value));navigation.dataset.open=String(value);};
 toggle.addEventListener('click',()=>expand(toggle.getAttribute('aria-expanded')!=='true'));
 navigation.addEventListener('keydown',event=>{if(event.key==='Escape'){expand(false);toggle.focus();}});
 navigation.addEventListener('click',event=>{if(event.target.closest('a'))expand(false);});
})();
</script></body></html>`;}
export function nativeList(value:string){const values=JSON.parse(value) as unknown[];return values.length?`<ul>${values.map(item=>`<li>${escapeHtml(item)}</li>`).join('')}</ul>`:'<p>None</p>';}

export function nativeError(context:Context,code:string,status:ContentfulStatusCode){
 return context.req.header('Accept')?.includes('text/html')
  ? context.html(nativePage('Request could not be completed',`<p role="alert">${escapeHtml(code.replaceAll('_',' ').toLowerCase())}. No successful change was confirmed.</p><a href="/delegation/settings">Return to connected applications</a>`),status)
  : context.json({error:{code,message:code}},status);
}
