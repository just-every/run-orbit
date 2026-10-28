import { readFileSync,writeFileSync } from 'node:fs';
import { orbitTools,notTools } from '../src/core/features/agent-door';
import { resources } from '../src/core/features/agent-door/resources';
import type { PlatformBindings } from '../src/core/platform/assets';
const tools=orbitTools({AUTH_ORIGIN:'https://orbit.example.test'} as PlatformBindings).map(({name,scope,readOnly,classes,clauses,inputSchema,widens,narrowing})=>({name,scope,readOnly,classes,clauses,inputSchema,...(widens===false?{widens,narrowing}:{})}));
tools.push({name:'orbit.events.list',scope:'events:read',readOnly:true,classes:['standard'],clauses:['BASE-AGENT-010'],inputSchema:{type:'object',properties:{after:{type:'string'},limit:{type:'integer',minimum:1,maximum:200}},additionalProperties:false}});
tools.sort((a,b)=>a.name.localeCompare(b.name));
const standard=[{class:'standard',facts:{measure:1}}];
const surface={schema:'rer-agent-surface/1',seed:'orbit',specialist:'sales rep',tools,resources:resources().map(r=>r.uriTemplate),notTools,
 witness:{tool:'orbit.operations.read',args:{}},
 journey:[
  {id:'create-company',tool:'orbit.records.create',args:{kind:'company',fields:{name:'Native conformance buyer'}},expect:standard,inject:{confirmExternal:true,classes:['standard'],approved:true}},
  {id:'read-company',tool:'orbit.records.read',args:{kind:'company',id:{$from:'create-company',pointer:'/id'},fields:['name']},target:{kind:'company',id:{$from:'create-company',pointer:'/id'}},expect:standard},
  {id:'update-company',tool:'orbit.records.update',args:{kind:'company',id:{$from:'create-company',pointer:'/id'},patch:{name:'Reviewed native buyer'},expected_revision:{$from:'read-company',pointer:'/ref/revision'}},target:{kind:'company',id:{$from:'create-company',pointer:'/id'}},expect:standard},
  {id:'list-companies',tool:'orbit.records.list',args:{kind:'company',query:'Reviewed',fields:['name']},expect:standard},
  {id:'seller-brief',tool:'orbit.briefs.read',args:{},expect:standard},
  {id:'native-witness',tool:'orbit.operations.read',args:{},expect:standard},
  {id:'events',tool:'orbit.events.list',args:{limit:100},expect:standard}
 ],
 escalations:[{id:'sponsor-grant-id',tool:'orbit.access.update',args:{subjectId:{$sponsor:'id'},resourceType:'company',resourceId:'*',actions:['graph.read'],fields:['name'],purpose:'Conformance self-widening refusal',expiresAt:null}}],
 narrowings:[],
 verification:{owner:{initializer:'tests/agent-door-owner.mjs'},reviewers:[{label:'sales-reviewer',email:'reviewer@native-orbit.example.test',initializer:'tests/agent-door-reviewer.mjs'}],replayAdmission:{prepare:['create-company']},network:{module:'tests/agent-provider-edge.mjs',origins:['https://api.twilio.com','https://us1.api.mailchimp.com','https://oauth2.googleapis.com','https://gmail.googleapis.com','https://www.googleapis.com','https://graph.microsoft.com','https://login.microsoftonline.com','https://slack.com']}}
};
const bytes=JSON.stringify(surface,null,2)+'\n';
if(process.argv.includes('--check')){if(readFileSync('agent-surface.json','utf8')!==bytes)throw Error('Agent surface differs from the registry/journey source. Regenerate it with pnpm exec tsx scripts/generate-agent-surface.ts.');}else writeFileSync('agent-surface.json',bytes);
console.log(`Agent surface: ${tools.length} tools; ${surface.resources.length} resources; ${surface.journey.length} declared native steps. Conformance must reject uncovered tool/class pairs.`);
