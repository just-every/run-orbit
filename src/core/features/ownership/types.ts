export type OwnershipKind='contact'|'company';
export interface Ownership {ownerId:string|null;ownerName:string|null;revision:number}
export interface OwnershipBatch {id:string;record_type:OwnershipKind;owner_id:string|null;actor_id:string|null;state:'reviewed'|'applied'|'undone'|'held';item_count:number;created_at:string;applied_at:string|null;undone_at:string|null}
export interface OwnershipItem {batch_id:string;ordinal:number;record_id:string;record_name:string;previous_owner_id:string|null;previous_owner_name:string|null;new_owner_name:string|null;reviewed_revision:number;reviewed_record_revision:number;reviewed_updated_at:string|null;applied_revision:number|null;failure:string|null;applied:number;undone:number}
