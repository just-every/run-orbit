import type {ReactNode} from 'react';
import './setup-help.css';

/** Setup stays beside the control that needs it, out of the everyday workflow. */
export function SetupHelp({children}:{children:ReactNode}){
 return <details className="setup-help"><summary>How to set this up</summary><div className="setup-help__body">{children}</div></details>;
}

/** Keep provider reference links readable within a sentence. */
export function SetupLink({href,children}:{href:string;children:ReactNode}){
 return <a href={href} target="_blank" rel="noopener noreferrer">{children}<span className="setup-help__new-tab"> (opens in a new tab)</span></a>;
}
