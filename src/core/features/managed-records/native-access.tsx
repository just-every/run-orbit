import type {ReactNode} from 'react';
import {useAccessPages} from '../fold-ui/workspace';

/** Collaborator grants use Shared records; native sales tools have their own authority. */
export function ManagedNativeOnly({children}:{children:ReactNode}){
 const {accessClass,salesRole}=useAccessPages();
 return accessClass==='native_full'||salesRole?<>{children}</>:null;
}
