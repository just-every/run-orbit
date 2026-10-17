import {useEffect,useState} from 'react';
import {recordsRequest,type RecordKind} from './records-api';

export interface RecordOperator {id:string;display_name:string;status:string}
export interface OwnerReview {
 id:string;kind:RecordKind;ownerId:string|null;ownerName:string|null;expiresAt:string;
 items:{id:string;name:string;previousOwnerId:string|null;previousOwnerName:string|null;status:'ready'|'unavailable';reason?:string}[];
}
export interface OwnerResult {
 batchId:string;changed:{id:string;name:string}[];failures:{id:string;name?:string;reason:string}[];replayed?:boolean;
}
export interface OwnerBatch {batchId:string;kind:RecordKind;newOwnerName:string|null;createdAt:string;changedCount:number;undoneCount:number;canUndo:boolean}
export function useRecordOperators(){
 const [operators,setOperators]=useState<RecordOperator[]>([]),[error,setError]=useState('');
 useEffect(()=>{let active=true;void recordsRequest<{operators:RecordOperator[]}>('records/owners/context').then(data=>{if(active)setOperators(data.operators);}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[]);
 return {operators,error};
}
export function OwnerOptions({operators}:{operators:RecordOperator[]}){
 return <>{operators.filter(operator=>operator.status==='active').map(operator=><option key={operator.id} value={operator.id}>{operator.display_name}</option>)}</>;
}
