import {useId} from 'react';

/** A card that opens a page of its own: a short title, one line and one action. */
export function LinkCard({title,text,href,action='Open'}:{title:string;text:string;href:string;action?:string}){
 const id=useId();
 return <section className="operator-surface settings-card" aria-labelledby={id}>
  <div className="settings-card__head"><h2 id={id}>{title}</h2><a className="orbit-button orbit-button--secondary" href={href}>{action}</a></div>
  <p className="settings-card__line">{text}</p>
 </section>;
}
