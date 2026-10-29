import type {PropsWithChildren, ReactNode} from 'react';
import {OperatorShell} from '../operator-shell';
import '../records.css';
import './settings.css';

/** A Settings area's page: the eyebrow Settings, the area as its title, then its cards one under another. */
export function SettingsArea({title,action,children}:PropsWithChildren<{title:string;action?:ReactNode}>){
 return <OperatorShell eyebrow="Settings" title={title} action={action}><div className="settings-stack">{children}</div></OperatorShell>;
}
