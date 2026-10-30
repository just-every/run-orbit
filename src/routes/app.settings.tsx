import {createFileRoute,Outlet} from '@tanstack/react-router';
/** Settings: each area is a page of its own (/app/settings/<area>); /app/settings itself answers a 308 to Workspace. */
export const Route=createFileRoute('/app/settings')({component:Outlet});
