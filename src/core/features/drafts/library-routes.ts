import {draftMailDatabase} from '../outreach/record-mail-storage';
import {Hono} from 'hono';
import {z} from 'zod';
import type {AuthenticatedOperator} from '../identity';
import {WorkbenchError} from '../workbench/repository';
import {LibraryRepository} from './library-repository';
import {renderDraft} from './render';
const id=z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/),revision=z.number().int().positive();
export const libraryContent=z.object({kind:z.enum(['template','snippet','signature']),name:z.string().trim().min(1).max(120),subject:z.string().max(998).default(''),body:z.string().min(1).max(100000),visibility:z.enum(['private','shared'])});
export function createLibraryRoutes(db:D1Database){
 const rootDatabase=db;
 const app=new Hono<{Variables:{operator:AuthenticatedOperator}}>(),library=new LibraryRepository(db);
 app.onError((error,c)=>{if(error instanceof WorkbenchError)return c.json({error:error.message},error.status);if(/runtime_controls.value/.test(String(error)))return c.json({error:'Permissions, library content or merge values changed. Reload and review again.'},409);throw error;});
 app.get('/',async c=>c.json(await library.list(c.get('operator').operatorId)));
 app.post('/',async c=>{const input=libraryContent.strict().safeParse(await c.req.json());if(!input.success)return c.json({error:'Enter a name, supported kind, body and visibility.'},400);return c.json(await library.save(c.get('operator').operatorId,input.data),201);});
 app.put('/:id',async c=>{const input=libraryContent.extend({revision}).strict().safeParse(await c.req.json()),key=id.safeParse(c.req.param('id'));if(!input.success||!key.success)return c.json({error:'Enter valid library content and its current revision.'},400);return c.json(await library.save(c.get('operator').operatorId,input.data,key.data,input.data.revision));});
 app.delete('/:id',async c=>{const input=z.object({revision}).strict().safeParse(await c.req.json()),key=id.safeParse(c.req.param('id'));if(!input.success||!key.success)return c.json({error:'Choose the current library revision.'},400);return c.json(await library.remove(c.get('operator').operatorId,key.data,input.data.revision));});
 app.post('/drafts/:id/apply',async c=>{const db=await draftMailDatabase(rootDatabase,c.req.param('id'));
  const input=z.object({revision,templateId:id.optional(),snippetId:id.optional(),signatureId:id.optional()}).strict().safeParse(await c.req.json()),key=id.safeParse(c.req.param('id'));if(!input.success||!key.success)return c.json({error:'Choose content and the saved draft revision.'},400);
  const actor=c.get('operator').operatorId,{draft}=await renderDraft(db,key.data,actor),selection:Record<string,{id:string;revision:number}>={};let subject=draft.subject,body=draft.body;
  for(const kind of ['template','snippet','signature']as const){const entryId=input.data[`${kind}Id`];if(!entryId)continue;const entry=await library.read(entryId,actor);if(entry.kind!==kind)throw new WorkbenchError(400,'Choose the matching library kind.');selection[kind]={id:entry.id,revision:entry.revision};if(kind==='template'){subject=entry.subject;body=entry.body;}else body+='\n\n'+entry.body;}
  if(!Object.keys(selection).length)throw new WorkbenchError(400,'Choose at least one library entry.');
  const result=await db.batch([library.permissionFence(actor),...Object.entries(selection).map(([kind,entry])=>db.prepare("INSERT INTO runtime_controls(name,value) SELECT 'library_content_changed',NULL WHERE NOT EXISTS(SELECT 1 FROM message_library WHERE id=? AND revision=? AND kind=? AND (visibility='shared' OR owner_id=?))").bind(entry.id,entry.revision,kind,actor)),db.prepare('UPDATE drafts SET subject=?,body=?,library_selection_json=?,merge_review_json=NULL,revision=revision+1,updated_at=? WHERE id=? AND revision=? AND is_stale=0 AND NOT EXISTS(SELECT 1 FROM outbound_messages WHERE draft_id=drafts.id AND revision=drafts.revision)').bind(subject,body,JSON.stringify(selection),new Date().toISOString(),key.data,input.data.revision)]);
  if(result.at(-1)!.meta.changes!==1)throw new WorkbenchError(409,'Draft changed, is stale or already approved. Reload it.');return c.json((await renderDraft(db,key.data,actor)).review);
 });
 app.get('/drafts/:id/render',async c=>{const db=await draftMailDatabase(rootDatabase,c.req.param('id'));if(!id.safeParse(c.req.param('id')).success)return c.json({error:'Invalid draft.'},400);return c.json((await renderDraft(db,c.req.param('id'),c.get('operator').operatorId)).review);});
 app.post('/drafts/:id/render',async c=>{const db=await draftMailDatabase(rootDatabase,c.req.param('id'));const input=z.object({revision,reviewHash:z.string().length(64)}).strict().safeParse(await c.req.json());if(!input.success||!id.safeParse(c.req.param('id')).success)return c.json({error:'Review the saved rendered message.'},400);const {review,guards}=await renderDraft(db,c.req.param('id'),c.get('operator').operatorId);if(input.data.revision!==review.revision||input.data.reviewHash!==review.reviewHash||review.missing.length||review.stale.length)throw new WorkbenchError(409,'Merge fields are missing or changed. Reload the rendered review.');const result=await db.batch([...guards,db.prepare('UPDATE drafts SET merge_review_json=? WHERE id=? AND revision=? AND is_stale=0 AND NOT EXISTS(SELECT 1 FROM outbound_messages WHERE draft_id=drafts.id AND revision=drafts.revision)').bind(JSON.stringify({...review,reviewed:true}),c.req.param('id'),review.revision)]);if(result.at(-1)!.meta.changes!==1)throw new WorkbenchError(409,'The draft changed or is stale. Review it again.');return c.json({...review,reviewed:true});});
 return app;
}
