export interface MailSettings {provider?:'rer'|'sendgrid';present:number;total:number;missing:string[];problem:string|null}
export interface OnboardingState {mailConfigured:boolean;mailSettings?:MailSettings|null;mailChecked:number;aiConfigured:boolean;customer:number;records:number;source:number;test:number;draft:number;sent:number;opportunityId:string|null;draftId:string|null}
export async function readOnboarding():Promise<OnboardingState>{const response=await fetch('/api/v1/workbench/onboarding');if(!response.ok)throw Error('Setup progress could not load.');return response.json();}

/** NOW's setup line: while first-hour steps remain, "Finish setting up:" and each remaining step as a link, in order. */
export function SetupLine({state}:{state:OnboardingState|null}){
 if(!state)return null;
 const opportunity=state.opportunityId?`/app/opportunities/${state.opportunityId}`:'/app/new',review=state.draftId?`/app/drafts/${state.draftId}`:opportunity;
 const steps=[[state.mailConfigured?'Check your mail sender':'Set up your mail sender',state.mailChecked,'/app/settings/mail'],['Add your first customer',state.customer,'/app/new'],['Connect a source',state.source,'/app/settings/capture'],['Send a test event',state.test,'/app/settings/capture'],['Write your first follow-up',state.draft,opportunity],['Approve and send',state.sent,review]] as const;
 const remaining=steps.filter(([,done])=>!done);
 if(!remaining.length)return null;
 return <p className="now-line"><span>Finish setting up:</span>{remaining.map(([name,,path],index)=><span className="now-line__step" key={name}>{index?<span className="now-line__sep" aria-hidden="true">·</span>:null}<a href={path}>{name}</a></span>)}</p>;
}
