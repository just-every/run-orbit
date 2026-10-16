import type {PlatformBindings} from './core/platform/assets';
import {completeSetup} from './core/features/setup/repository';
import {seedRecords} from './demo/records';
import {seedPublication} from './demo/publication';
import {seedActivity} from './demo/activity';

export async function demoOwner(env:PlatformBindings){
 return (await env.DB.prepare("SELECT email FROM operators WHERE setup_owner=1 AND status='active'").first<{email:string}>())?.email??null;
}

/** Only withDemo calls this hook, after the native owner claim, in disposable state. */
export async function seedDemo(env:PlatformBindings,{ownerEmail,now}:{ownerEmail:string;now:Date}){
 const owner=await env.DB.prepare('SELECT id FROM operators WHERE email=? AND setup_owner=1').bind(ownerEmail).first<{id:string}>();
 if(!owner)throw new Error('Claim the demo owner before loading the sample workspace.');
 await completeSetup(env.DB,owner.id,{name:'Brightwork Studio',timezone:'Australia/Brisbane',currency:'AUD',stages:['Discovery','Evaluation','Proposal']});
 await seedRecords(env.DB,owner.id,now);
 await seedPublication(env.DB,owner.id,now);
 await seedActivity(env,owner.id,now);
}
