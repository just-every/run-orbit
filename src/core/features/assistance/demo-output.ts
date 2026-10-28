/** Demo-only provider success, grounded in the exact request the visitor reviewed. */
export function demoOutput(preview:unknown){
 const request=preview as {operation?:string;account?:{name:string};lines?:{evidenceId:string;title:string;detail:string}[];contact?:{name?:string};company?:{name:string};evidence?:{id:string;subject?:string;fields?:{subject?:string}}[]};
 if(request.operation==='brief.summary'){
  const lines=request.lines??[];
  return {summary:`${request.account!.name}: ${lines.slice(0,3).map(line=>[line.title,line.detail].filter(Boolean).join(' — ')).join('. ').slice(0,900)}. Review the linked evidence before choosing your next step.`,evidenceIds:lines.slice(0,3).map(line=>line.evidenceId)};
 }
 const evidence=request.evidence??[],name=request.contact?.name?.split(' ')[0]??'there';
 const activity=evidence.map(item=>item.subject??item.fields?.subject).find(subject=>subject?.trim());
 return {explanation:`${activity?`Review the latest customer activity: ${activity}.`:'Review the customer details included in this request.'} A short follow-up can confirm the next step.`,subject:`Next steps${request.company?.name?' for '+request.company.name:''}`,body:`Hi ${name},\n\nThanks for sharing your team's plans. Would a short walkthrough help you review the workflow together?\n\nBest,\nAlex`,evidenceIds:evidence.slice(0,3).map(item=>item.id)};
}
