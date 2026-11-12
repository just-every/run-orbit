/** Review uses people's field names; the editor alone teaches the merge syntax. */
const labels:Record<string,string>={
 'company.name':'Company name','contact.name':'Contact name','contact.email':'Contact email',
 'contact.job_title':'Contact job title','deal.title':'Deal title','owner.name':'Owner name','owner.email':'Owner email',
};
export const mergeFieldLabel=(name:string)=>labels[name]??name.replaceAll('.',' ').replaceAll('_',' ').replace(/^./,letter=>letter.toUpperCase());
