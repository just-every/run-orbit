export type RecordType='contact'|'company'|'opportunity';
export interface RecordRef {type:RecordType;id:string}
export type EvidenceType='signal'|'timeline'|'draft'|'handoff'|'opportunity'|'unlinked-reply';
export type LineKind='reply'|'meeting'|'signal'|'handoff-due'|'next-action-due'|'reply-unanswered'|'meeting-no-next-step'|'draft-unsent'|'handoff-proposed'|'unlinked-signal'|'unlinked-reply'|'held-capture';
export type LineGroup='new'|'promise'|'proposal'|'unresolved'|'held';

/** One brief line. It exists only with the evidence it rests on and a link to that record or timeline entry. */
export interface BriefLine {
 id:string;kind:LineKind;group:LineGroup;signalType:string|null;confidence:'observed'|'inferred'|null;
 title:string;detail:string|null;occurredAt:string;dueAt:string|null;
 evidence:{type:EvidenceType;id:string};records:RecordRef[];href:string;planHref:string|null;
}
export interface BriefAccount {key:string;type:RecordType;id:string;name:string;href:string;lines:BriefLine[]}
export interface Brief {
 generatedAt:string;since:string;sinceBasis:'seen'|'stale-interval';
 policy:{staleIntervalDays:number;awaitingResponseWorkingDays:number;timezone:string};
 accounts:BriefAccount[];unresolved:BriefLine[];held:BriefLine[];
 /** An application's lines that rest only on signals it selected by id, under no account it may see; always empty for an operator. */
 selectedSignals:BriefLine[];
 counts:{replies:number;meetings:number;observed:number;inferred:number;promises:number;proposals:number;unresolved:number;held:number};
 truncated:boolean;
}
