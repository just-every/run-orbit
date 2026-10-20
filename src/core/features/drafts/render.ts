import {LibraryRepository,type LibraryKind} from './library-repository';
import {WorkbenchError} from '../workbench/repository';
import {payloadHash} from '../../platform/source-security';
export type LibrarySelection=Partial<Record<LibraryKind,{id:string;revision:number}>>;
interface RenderDraft {id:string;revision:number;subject:string;body:string;recipient_email:string;library_selection_json:string;merge_review_json:string|null}
export interface RenderReview {revision:number;sourceSubject:string;sourceBody:string;subject:string;body:string;recipientEmail:string;fields:{name:string;value:string|null}[];missing:string[];stale:string[];reviewHash:string;required:boolean;reviewed:boolean}
const contextSql=`SELECT json_object('contact.name',c.name,'contact.email',c.email,'contact.job_title',c.job_title,'company.name',co.name,'deal.title',o.title,'owner.name',a.display_name,'owner.email',a.email) AS value FROM drafts d JOIN contacts c ON c.id=d.recipient_contact_id JOIN opportunities o ON o.id=d.opportunity_id LEFT JOIN companies co ON co.id=COALESCE(c.company_id,o.company_id) LEFT JOIN operators a ON a.id=o.owner_id WHERE d.id=?`;
export async function renderDraft(db:D1Database,id:string,actor:string){
 const library=new LibraryRepository(db);await library.access(actor);
 const draft=await db.prepare('SELECT id,revision,subject,body,recipient_email,library_selection_json,merge_review_json FROM drafts WHERE id=?').bind(id).first<RenderDraft>();
 if(!draft)throw new WorkbenchError(404,'Draft not found.');
 const context=await db.prepare(contextSql).bind(id).first<{value:string}>();if(!context)throw new WorkbenchError(409,'Choose a current linked recipient before rendering.');
 const values=JSON.parse(context.value) as Record<string,string|null>,fields=new Map<string,string|null>(),missing:string[]=[],stale:string[]=[];
 const expand=(source:string)=>{const rendered=source.replace(/\{\{\s*([^{}]+?)\s*\}\}/g,(_,name:string)=>{const value=values[name]??null;fields.set(name,value);if(!value?.trim())missing.push(name);return value??`{{${name}}}`;});if(rendered.includes('{{')||rendered.includes('}}'))missing.push('Unresolved merge field');return rendered;};
 const selection=JSON.parse(draft.library_selection_json) as LibrarySelection,selectionGuards:D1PreparedStatement[]=[];
 for(const [kind,selected]of Object.entries(selection)){
  const entry=await db.prepare("SELECT id,revision,kind FROM message_library WHERE id=? AND (visibility='shared' OR owner_id=?)").bind(selected.id,actor).first<{id:string;revision:number;kind:string}>();
  if(!entry||entry.kind!==kind||entry.revision!==selected.revision)stale.push(`${kind} changed or is no longer available; apply its current revision again`);
  selectionGuards.push(db.prepare("INSERT INTO runtime_controls(name,value) SELECT 'merge_review_changed',NULL WHERE NOT EXISTS(SELECT 1 FROM message_library WHERE id=? AND revision=? AND kind=? AND (visibility='shared' OR owner_id=?))").bind(selected.id,selected.revision,kind,actor));
 }
 const subject=expand(draft.subject),body=expand(draft.body);
 if(subject.length>998||body.length>100000)missing.push('Rendered message exceeds the subject or body limit');
 const required=fields.size>0||Object.keys(selection).length>0;
 const snapshot={revision:draft.revision,sourceSubject:draft.subject,sourceBody:draft.body,subject,body,recipientEmail:draft.recipient_email,fields:[...fields].map(([name,value])=>({name,value})),selection,context:context.value};
 const reviewHash=await payloadHash(JSON.stringify(snapshot));
 const review:RenderReview={...snapshot,missing:[...new Set(missing)],stale,reviewHash,required,reviewed:!required||Boolean(draft.merge_review_json&&JSON.parse(draft.merge_review_json).reviewHash===reviewHash)};
 const guards=[library.permissionFence(actor),db.prepare(`INSERT INTO runtime_controls(name,value) SELECT 'merge_review_changed',NULL WHERE COALESCE((${contextSql}),'')<>? OR NOT EXISTS(SELECT 1 FROM drafts WHERE id=? AND revision=? AND subject=? AND body=? AND recipient_email=? AND library_selection_json=?)`).bind(id,context.value,id,draft.revision,draft.subject,draft.body,draft.recipient_email,draft.library_selection_json),...selectionGuards];
 return {draft,review,guards};
}
export function requireRendered(review:RenderReview){if(review.missing.length||review.stale.length)throw new WorkbenchError(409,`Resolve merge fields before approval: ${[...review.missing,...review.stale].join('; ')}`);if(!review.reviewed)throw new WorkbenchError(409,'Merge variables changed or have not been reviewed. Review the exact rendered message again.');}
