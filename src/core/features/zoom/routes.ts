import {Hono} from 'hono';
import {z} from 'zod';
import type {AuthenticatedOperator} from '../identity';
import {isFullOperator} from '../access/identity-class';
import {RecordError} from '../records/shared';
import {ZoomError,ownership,type ZoomConfig} from './contracts';
import {connect,connection,disconnect} from './connection';
import {attach,preview} from './repository';
type Env={Variables:{operator:AuthenticatedOperator}};
const owner=(db:D1Database,id:string)=>db.prepare("SELECT 1 FROM operators WHERE id=? AND status='active' AND setup_owner=1").bind(id).first();
const credentials=z.object({accountId:z.string().trim().min(1).max(200).regex(/^[A-Za-z0-9_-]+$/),clientId:z.string().trim().min(1).max(200).regex(/^[A-Za-z0-9_-]+$/),clientSecret:z.string().trim().min(1).max(300).regex(/^[\x21-\x7e]+$/),webhookSecret:z.string().trim().min(1).max(300)}).strict();
const selection=z.object({meetingId:z.string().regex(/^\d{9,11}$/),opportunityId:z.string().regex(/^[0-9A-Z]{26}$/)}).strict();
function errors(app:Hono<Env>){app.onError((error,c)=>error instanceof ZoomError||error instanceof RecordError?c.json({error:error.message},error.status):c.json({error:'The Zoom request could not be completed. No meeting was confirmed.'},503));}
export function zoomSettingsRoutes(db:D1Database,config:ZoomConfig){
 const app=new Hono<Env>();errors(app);
 app.get('/',async c=>c.json({...await connection(db),owner:Boolean(await owner(db,c.get('operator').operatorId)),ownership,webhookPath:'/api/v1/signals/zoom',recording:'Recording and transcript content is never fetched.'}));
 app.use('*',async(c,next)=>{if(!await owner(db,c.get('operator').operatorId))throw new ZoomError(403,'Only the installation owner connects or disconnects Zoom.');await next();});
 app.post('/connect',async c=>{const input=credentials.safeParse(await c.req.json());if(!input.success)throw new ZoomError(400,'Enter the Zoom account ID, client ID, client secret and webhook secret token.');await connect(db,config,input.data,c.get('operator').operatorId);return c.json({connected:true});});
 app.post('/disconnect',async c=>{await disconnect(db,c.get('operator').operatorId);return c.json({disconnected:true});});
 return app;
}
export function zoomMeetingRoutes(db:D1Database,config:ZoomConfig){
 const app=new Hono<Env>();errors(app);
 app.use('*',async(c,next)=>{if(!await isFullOperator(db,c.get('operator').operatorId))throw new ZoomError(403,'Only full operators review and attach Zoom meetings.');await next();});
 app.post('/preview',async c=>{const input=selection.safeParse(await c.req.json());if(!input.success)throw new ZoomError(400,'Choose a deal and the exact numeric Zoom meeting ID.');const {auth:_,privacy:__,...result}=await preview(db,config,c.get('operator').operatorId,input.data.meetingId,input.data.opportunityId);return c.json(result);});
 app.post('/attach',async c=>{const input=selection.extend({previewDigest:z.string().regex(/^[a-f0-9]{64}$/),confirmed:z.literal(true)}).strict().safeParse(await c.req.json());if(!input.success)throw new ZoomError(400,'Review the exact meeting and chosen deal, then confirm attachment.');return c.json(await attach(db,config,c.get('operator').operatorId,input.data),201);});
 return app;
}
