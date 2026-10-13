/** Redact case-insensitively without replacing one mailbox inside another, or one word inside another.
 * Scan in D1 so erasure never loads a customer's complete history into memory.
 */
export function redactionSql(column:string,boundary:'email'|'word'){
 const position='instr(lower(rest),lower(value))',end=`${position}+length(value)`;
 const before=`CASE WHEN ${position}=1 THEN previous ELSE substr(rest,${position}-1,1) END`,after=`substr(rest,${end},1)`;
 const local="'[a-z0-9.!#$%&''*+/=?^_`{|}~@-]'",domain="'[a-z0-9_@.-]'";
 const mailbox=`lower(${before}) NOT GLOB ${local} AND (lower(${after}) NOT GLOB ${domain} OR (${after}='.' AND lower(substr(rest,${end}+1,1)) NOT GLOB ${domain}))`;
 // A name matches only as a whole word: 'Mark' never matches inside 'Marketing', nor 'Ann' inside 'Annual' or 'Anné'.
 // A name touching '@' is part of a mailbox, never a name on its own.
 const wordCharacter=(character:string)=>`(${character} GLOB '[A-Za-z0-9_@]' OR coalesce(unicode(${character}),0)>127)`;
 const word=`NOT ${wordCharacter(before)} AND NOT ${wordCharacter(after)}`;
 return `(WITH RECURSIVE target(value,replacement) AS (VALUES(?,?)), redaction(rest,clean,previous) AS (
 SELECT ${column},'',' ' UNION ALL
 SELECT substr(rest,${end}),clean||substr(rest,1,${position}-1)||CASE WHEN ${boundary==='email'?mailbox:word} THEN replacement ELSE substr(rest,${position},length(value)) END,substr(rest,${end}-1,1)
 FROM redaction,target WHERE ${position}>0)
 SELECT clean||rest FROM redaction,target WHERE ${position}=0 LIMIT 1)`;
}

/** True when `name` occurs in `text` as a whole word, compared case-insensitively. */
export function containsWord(text:string,name:string){
 const escaped=name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 return new RegExp(`(^|[^\\p{L}\\p{N}_@])${escaped}($|[^\\p{L}\\p{N}_@])`,'iu').test(text);
}

/** Replace the mailbox, then the whole-word name, in every string value of a JSON document; keys and structure stay as they are. */
export function redactJsonText(text:string,name:string,mailbox:string,replacement:string){
 let value:unknown;try{value=JSON.parse(text);}catch{return text;}
 const quote=(input:string)=>input.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 const address=new RegExp(`(^|[^a-z0-9.!#$%&'*+/=?^_\`{|}~@-])${quote(mailbox)}(?=$|[^a-z0-9_@.-]|\\.(?![a-z0-9_@.-]))`,'gi');
 const word=new RegExp(`(^|[^\\p{L}\\p{N}_@])${quote(name)}(?=$|[^\\p{L}\\p{N}_@])`,'giu');
 const redact=(input:string)=>input.replace(address,(_,before:string)=>before+replacement).replace(word,(_,before:string)=>before+replacement);
 // A lowercase identifier-like value (an enum or key such as a note kind) is not free text.
 const walk=(item:unknown):unknown=>typeof item==='string'?(/^[a-z0-9_.:-]+$/.test(item)?item:redact(item)):Array.isArray(item)?item.map(walk):item&&typeof item==='object'?Object.fromEntries(Object.entries(item).map(([key,entry])=>[key,walk(entry)])):item;
 const next=JSON.stringify(walk(value));
 return next===JSON.stringify(value)?text:next;
}
