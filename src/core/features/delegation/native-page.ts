import type {Context} from 'hono';
import type {ContentfulStatusCode} from 'hono/utils/http-status';
import {currentItem,settingsAreas,type NavItem} from '../operator/ui/nav';
export const escapeHtml=(value:unknown)=>String(value).replace(/[&<>"']/g,character=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]!));
/** The Settings areas, the one for this address marked; the same entries the console's Settings menu draws (nav.ts). */
const areas=(current:NavItem|undefined)=>settingsAreas.map(item=>`<a href="${escapeHtml(item.path)}"${item===current?' aria-current="page"':''}>${escapeHtml(item.label)}</a>`).join('');
const back='<span aria-hidden="true">← </span>NOW';
/** Connected applications are drawn in the console's Settings frame with Team current, phone sheet included. */
export function nativePage(title:string,body:string){const current=currentItem(settingsAreas,'/delegation/settings');return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(title)} · Orbit</title><link rel="stylesheet" href="/operator-native.css"></head><body><div class="operator-shell ob-app">
<a class="operator-skip-link" href="#operator-main">Skip to content</a>
<header class="operator-header" data-menu="settings">
<a class="operator-mark" href="/app" aria-label="Orbit home"><span class="ob-brand"><img class="ob-mark" src="/brand/mark.svg" alt="" width="34" height="34"><span class="ob-brand-name" data-rer-name>Orbit</span></span></a>
<nav aria-label="Settings menu" class="operator-nav"><a class="operator-nav__back" href="/app">${back}</a><span class="operator-nav__label" aria-hidden="true">Settings</span>${areas(current)}</nav>
<div class="operator-header__end"><form class="operator-signout" action="/auth/signout" method="post"><button class="operator-back-link">Sign out</button></form></div>
<button class="operator-menu-toggle" type="button" aria-expanded="false" aria-controls="operator-menu-sheet">Menu</button>
<nav id="operator-menu-sheet" class="operator-menu-sheet" aria-label="Settings menu" hidden><a class="operator-menu-sheet__back" href="/app">${back}</a><p class="operator-menu-sheet__label" aria-hidden="true">Settings</p>${areas(current)}<hr><form action="/auth/signout" method="post"><button>Sign out</button></form></nav>
</header>
<div class="operator-menu-scrim" aria-hidden="true" hidden></div>
<main id="operator-main" tabindex="-1" class="operator-main"><header class="operator-titlebar"><div><p class="operator-eyebrow"><a href="/app/settings/team">Settings › Team</a></p><h1>${escapeHtml(title)}</h1></div></header>${body}</main>
</div><script>
(()=>{
 const toggle=document.querySelector('.operator-menu-toggle'),sheet=document.getElementById('operator-menu-sheet'),scrim=document.querySelector('.operator-menu-scrim');
 const show=(open,refocus)=>{toggle.setAttribute('aria-expanded',String(open));sheet.hidden=!open;scrim.hidden=!open;if(open)sheet.querySelector('a,button').focus();else if(refocus)toggle.focus();};
 toggle.addEventListener('click',()=>show(sheet.hidden,false));
 scrim.addEventListener('click',()=>show(false,true));
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!sheet.hidden){event.preventDefault();show(false,true);}});
 sheet.addEventListener('click',event=>{if(event.target.closest('a'))show(false,false);});
})();
</script></body></html>`;}
export function nativeList(value:string){const values=JSON.parse(value) as unknown[];return values.length?`<ul>${values.map(item=>`<li>${escapeHtml(item)}</li>`).join('')}</ul>`:'<p>None</p>';}

export function nativeError(context:Context,code:string,status:ContentfulStatusCode){
 return context.req.header('Accept')?.includes('text/html')
  ? context.html(nativePage('Request could not be completed',`<p role="alert">${escapeHtml(code.replaceAll('_',' ').toLowerCase())}. No successful change was confirmed.</p><a href="/delegation/settings">Return to connected applications</a>`),status)
  : context.json({error:{code,message:code}},status);
}
