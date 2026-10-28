export type FieldDefinition={label:string;valueType:string;required:number;unique:number;options:string[];archived:number};

export const typeLabels:Record<string,string>={text:'Text',number:'Number',date:'Date',picklist:'Picklist',boolean:'Yes or no',user:'Operator',datetime:'Date and time'};

const listed=(noun:string,items:string[])=>`${noun}${items.length>1?'s':''} ${items.join(', ')}`;

/** What one saved revision changed against the revision before it, in the editor's own words; the first revision says what was created. */
export function revisionChange(definition:FieldDefinition,previous:FieldDefinition|null){
 const d=definition,p=previous;
 if(!p)return [`Created ${d.label}`,`${typeLabels[d.valueType]}${d.valueType==='picklist'?` (${d.options.join(', ')})`:''}`,d.required&&'Required',d.unique&&'Unique',d.archived&&'Archived'].filter(Boolean).join(' · ');
 const added=d.options.filter(option=>!p.options.includes(option)),removed=p.options.filter(option=>!d.options.includes(option));
 return [
  p.label!==d.label&&`Renamed ${p.label} → ${d.label}`,
  p.valueType!==d.valueType&&`Type ${typeLabels[p.valueType]} → ${typeLabels[d.valueType]}`,
  added.length>0&&listed('Added choice',added),
  removed.length>0&&listed('Removed choice',removed),
  !added.length&&!removed.length&&p.options.join('\n')!==d.options.join('\n')&&'Reordered choices',
  !p.required!==!d.required&&(d.required?'Made required':'Made optional'),
  !p.unique!==!d.unique&&(d.unique?'Made unique':'No longer unique'),
  !p.archived!==!d.archived&&(d.archived?'Archived':'Restored'),
 ].filter(Boolean).join(' · ')||'No change';
}
