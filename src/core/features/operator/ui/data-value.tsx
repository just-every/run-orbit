import {customFieldValue} from './import-provenance';
/** Preserve every value and nesting level while presenting records as labelled fields. */
export function fieldLabel(key:string){if(key==='import_source')return 'Import source';if(key==='id_in_old_system')return 'ID in old system';if(key==='custom_fields_json')return 'Custom fields';if(key==='lifecycle')return 'Status';if(key==='band')return 'Priority';if(key==='queue_state')return 'Attention';if(key==='pipeline_name')return 'Pipeline';if(key==='stage_name')return 'Stage';return key.replace(/([a-z])([A-Z])/g,'$1 $2').replaceAll('_',' ').replace(/^./,letter=>letter.toUpperCase());}
export function storedValue(key:string,value:unknown):unknown{
 if(key!=='custom_fields_json')return value;
 const fields=typeof value==='string'?JSON.parse(value):value;
 return fields&&typeof fields==='object'&&!Array.isArray(fields)?Object.fromEntries(Object.entries(fields).map(([name,item])=>[name,customFieldValue(name,item)])):fields;
}
export function valueText(value:unknown,emptyLabel='No value'):string{
 if(value===null||value===undefined)return emptyLabel;
 if(Array.isArray(value))return value.length?value.map(item=>valueText(item,emptyLabel)).join('; '):'No items';
 if(typeof value==='object')return Object.entries(value).map(([key,item])=>`${fieldLabel(key)}: ${valueText(item,emptyLabel)}`).join('; ')||'No fields';
 return String(value);
}
export function DataValue({value,emptyLabel='No value'}:{value:unknown;emptyLabel?:string}){
 if(value===null||value===undefined)return <span>{emptyLabel}</span>;
 if(Array.isArray(value))return value.length?<ol className="operator-data-list">{value.map((item,index)=><li key={index}><DataValue value={item} emptyLabel={emptyLabel}/></li>)}</ol>:<span>No items</span>;
 if(typeof value==='object')return Object.keys(value).length?<dl className="operator-data-fields">{Object.entries(value).map(([key,item])=><div key={key} data-field={key}><dt>{fieldLabel(key)}</dt><dd><DataValue value={item} emptyLabel={emptyLabel}/></dd></div>)}</dl>:<span>No fields</span>;
 return <span className="operator-data-value">{String(value)}</span>;
}
