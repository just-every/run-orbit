import {z} from 'zod';
export const embedOrigin=z.string().refine(value=>{try{const url=new URL(value);return url.origin===value&&url.protocol==='https:'&&!url.hostname.includes('*')&&!url.username&&!url.password;}catch{return false;}},'Use an HTTPS origin without a path.');
export async function embeddingOrigins(db:D1Database){return(await db.prepare('SELECT origin FROM form_embed_origins ORDER BY origin').all<{origin:string}>()).results.map(row=>row.origin);}
export async function saveEmbeddingOrigins(db:D1Database,origins:string[]){const at=new Date().toISOString();await db.batch([db.prepare('DELETE FROM form_embed_origins'),...origins.map(origin=>db.prepare('INSERT INTO form_embed_origins(origin,created_at) VALUES(?,?)').bind(origin,at))]);}
