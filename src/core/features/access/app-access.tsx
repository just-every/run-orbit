import {createContext,useContext} from 'react';
import type {AppAccess} from './collaborator-home';
/** The document's verified access also governs client navigation and write controls. */
export const AppAccessContext=createContext<AppAccess>({full:true,workspace:true,reports:true});
export const useAppAccess=()=>useContext(AppAccessContext);
