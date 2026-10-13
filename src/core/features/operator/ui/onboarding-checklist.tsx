import './onboarding-checklist.css';
export interface OnboardingState {mailConfigured:boolean;aiConfigured:boolean;customer:number;records:number;source:number;test:number;draft:number;sent:number;opportunityId:string|null;draftId:string|null}
export async function readOnboarding():Promise<OnboardingState>{const response=await fetch('/api/v1/workbench/onboarding');if(!response.ok)throw Error('Setup progress could not load.');return response.json();}
export function OnboardingChecklist({state}:{state:OnboardingState|null}){
 if(!state)return null;
 const opportunity=state.opportunityId?`/app/opportunities/${state.opportunityId}`:'/app/new',review=state.draftId?`/app/drafts/${state.draftId}`:opportunity;
 const steps=[['Mail sender configured and checked',state.mailConfigured,'/app/settings#mail-sender'],['Add your first customer',state.customer,'/app/new'],['Connect a source',state.source,'/app/sources'],['Send a test event',state.test,'/app/sources'],['Write your first follow-up',state.draft,opportunity],['Approve and send',state.sent,review]] as const;
 const complete=steps.every(([,done])=>Boolean(done));
 return <details className="operator-surface operator-detail__section onboarding-checklist" open={!complete}><summary>{complete?'Setup complete':'Get started with Orbit'}</summary><ol>{steps.map(([name,done,path])=><li key={name} data-complete={Boolean(done)}>{done?<span>Done · {name}</span>:<a href={path}>{name}</a>}</li>)}</ol><a href="/demo">See an example</a></details>;
}
