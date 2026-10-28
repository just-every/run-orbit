import {useEffect,useRef,type ButtonHTMLAttributes,type ReactElement} from 'react';
import {ActionTooltip} from '../operator/ui/action-tooltip';
type Focus={target:HTMLElement;at:number;top:number|null;timer?:ReturnType<typeof setTimeout>};
/** ActionTooltip for the dashboards' icon-only controls. ActionTooltip hides on every scroll, including the scroll a keyboard
 *  focus itself causes: when that scroll lands within 300 ms and the control keeps focus, its focus show runs again once the
 *  scroll settles. A later scroll, which moves the focused control, still hides the tip. */
export function DashboardTooltip({label,children}:{label:string;children:ReactElement<ButtonHTMLAttributes<HTMLButtonElement>>}){
 const focus=useRef<Focus|null>(null);
 const clear=()=>{if(focus.current?.timer)clearTimeout(focus.current.timer);focus.current=null;};
 useEffect(()=>{const scroll=()=>{const f=focus.current;if(!f)return;if(document.activeElement!==f.target||!f.timer&&performance.now()-f.at>300){clear();return;}const top=f.target.getBoundingClientRect().top;if(f.top===null)f.top=top;else if(Math.abs(top-f.top)>0.5){clear();return;}if(f.timer)clearTimeout(f.timer);f.timer=setTimeout(()=>{clear();if(document.activeElement===f.target)f.target.dispatchEvent(new FocusEvent('focusin',{bubbles:true}));},100);};window.addEventListener('scroll',scroll,true);return()=>{window.removeEventListener('scroll',scroll,true);clear();};},[]);
 return <span className="dash-tip" onFocus={event=>{clear();const target=event.target as HTMLElement;if(!target.matches(':focus-visible'))return;const f:Focus={target,at:performance.now(),top:null};focus.current=f;setTimeout(()=>{if(focus.current===f&&f.top===null)f.top=target.getBoundingClientRect().top;},0);}} onBlur={clear} onKeyDown={event=>{if(event.key==='Escape')clear();}}><ActionTooltip label={label}>{children}</ActionTooltip></span>;
}
