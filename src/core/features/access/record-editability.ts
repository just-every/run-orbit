import type {ActorContext,RecordProjection} from '../../shared/expansion-contracts';
import {AccessService} from './service';
import {AccessError} from './errors';
import {nativeEditableFields} from './native-boundary';
/** Current UI hints use the same field authority as the independently fenced PUT. */
export async function recordEditableFields(access:AccessService,actor:ActorContext,kind:keyof typeof nativeEditableFields,record:RecordProjection){const fields:string[]=[];for(const field of nativeEditableFields[kind]){if(!(field in record.fields))continue;try{await access.authorize(actor,'graph.update',record.ref,[field]);fields.push(field);}catch(error){if(!(error instanceof AccessError)||error.code!=='permission')throw error;}}await access.db.batch(access.fence(actor).map(statement=>access.db.prepare(statement.sql).bind(...statement.bindings)));return fields;}
