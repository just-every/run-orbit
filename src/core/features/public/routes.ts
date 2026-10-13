import {Hono} from 'hono';
import {demoStory} from './demo-story';
export function createPublicDemoRoutes(enabled=true){
 const app=new Hono();
 app.get('/',c=>{if(!enabled)return c.notFound();if(Object.keys(c.req.query()).length)return c.json({error:'The example workspace cannot select customer records.'},400);return c.json(demoStory(),200,{'Cache-Control':'no-store'});});
 app.all('*',c=>c.notFound());return app;
}
