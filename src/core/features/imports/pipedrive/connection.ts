import type {AuthenticatedOperator} from '../../identity';
import type {SourceSecurity} from '../../../platform/source-security';
import type {ProviderFetch} from '../../capture/providers/config';
import {createId} from '../../../shared/ids';
import {audit,RecordError} from '../../records/shared';
import {importAuthority,ImportRepository} from '../repository';
import {pipedriveRequest,sourceId} from './provider';
export type PipedriveConfig={security?:SourceSecurity;fetcher?:ProviderFetch;now?:()=>number};
export interface Connection {account_id:string;ciphertext:string;revision:string;actor_id:string}
export class PipedriveConnection {
 constructor(readonly db:D1Database,readonly actor:AuthenticatedOperator,readonly config:PipedriveConfig){}
 async authorized(){await new ImportRepository(this.db,this.actor).authorized();if(!await this.db.prepare("SELECT 1 FROM operators WHERE id=? AND setup_owner=1 AND status='active'").bind(this.actor.operatorId).first())throw new RecordError(403,'Only the installation owner connects and pulls Pipedrive data.');}
 predicate(){const p=importAuthority(this.actor);return{sql:`(${p.sql}) AND EXISTS(SELECT 1 FROM operators WHERE id=? AND setup_owner=1 AND status='active')`,params:[...p.params!,this.actor.operatorId]};}
 async snapshot(){await this.authorized();const connection=await this.db.prepare('SELECT account_id,ciphertext,revision,actor_id FROM crm_import_pipedrive_connections WHERE id=1 AND actor_id=?').bind(this.actor.operatorId).first<Connection>();if(!connection||!this.config.security)throw new RecordError(409,'Connect Pipedrive with fresh read authority in this installation.');let token:string;try{token=await this.config.security.open(connection.ciphertext);}catch{throw new RecordError(409,'Reconnect Pipedrive: this installation cannot open the saved credential.');}return{...connection,token};}
 async connect(token:string){await this.authorized();if(!this.config.security)throw new RecordError(409,'Pipedrive needs this installation’s encryption key before credentials can be saved.');
 const body=await pipedriveRequest(token,'/api/v1/users/me',this.config.fetcher,this.config.now?.()),account=sourceId(body.data?.company_id),revision=createId(),p=this.predicate(),ciphertext=await this.config.security.seal(token);
 await this.db.batch([this.db.prepare(`INSERT INTO runtime_controls(name,value) SELECT 'pipedrive_connect_authority',NULL WHERE NOT (${p.sql})`).bind(...p.params),
 this.db.prepare("UPDATE crm_import_pipedrive_pulls SET state='revoked',snapshot_json='{}',cursor=NULL,next_at=NULL,version=version+1 WHERE state<>'withdrawn'"),
 this.db.prepare('INSERT INTO crm_import_pipedrive_connections VALUES(1,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET account_id=excluded.account_id,ciphertext=excluded.ciphertext,revision=excluded.revision,actor_id=excluded.actor_id,connected_at=excluded.connected_at').bind(account,ciphertext,revision,this.actor.operatorId,new Date().toISOString()),audit(this.db,this.actor.operatorId,'import.pipedrive.connected','installation','workspace',{account})]);return{connected:true,account};
 }
 async disconnect(){await this.authorized();const p=this.predicate();await this.db.batch([this.db.prepare(`INSERT INTO runtime_controls(name,value) SELECT 'pipedrive_disconnect_authority',NULL WHERE NOT (${p.sql})`).bind(...p.params),this.db.prepare('DELETE FROM crm_import_pipedrive_connections'),this.db.prepare("UPDATE crm_import_pipedrive_pulls SET state='revoked',snapshot_json='{}',cursor=NULL,next_at=NULL,version=version+1"),audit(this.db,this.actor.operatorId,'import.pipedrive.disconnected','installation','workspace')]);return{connected:false};}
 async status(){await this.authorized();const row=await this.db.prepare('SELECT account_id FROM crm_import_pipedrive_connections WHERE id=1 AND actor_id=?').bind(this.actor.operatorId).first<{account_id:string}>();return{connected:!!row,account:row?.account_id??null,pulls:(await this.db.prepare('SELECT id,state,resource,cursor,version,next_at,error,created_at FROM crm_import_pipedrive_pulls WHERE actor_id=? ORDER BY created_at DESC LIMIT 20').bind(this.actor.operatorId).all()).results};}
}
