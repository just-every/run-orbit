import {customFieldValue} from './import-provenance';
/** Preserve every value and nesting level while presenting records as labelled fields. */
export function fieldLabel(key:string){if(key==='custom_fields_json')return 'Custom fields';return key.replace(/([a-z])([A-Z])/g,'$1 $2').replaceAll('_',' ').replace(/^./,letter=>letter.toUpperCase());}
export function storedValue(key:string,value:unknown):unknown{
 if(key!=='custom_fields_json')return value;
 const fields=typeof value==='string'?JSON.parse(value):value;
 return fields&&typeof fields==='object'&&!Array.isArray(fields)?Object.fromEntries(Object.entries(fields).map(([name,item])=>[name,customFieldValue(name,item)])):fields;
}
export function valueText(value:unknown):string{
 if(value===null||value===undefined)return 'No value';
 if(Array.isArray(value))return value.length?value.map(valueText).join('; '):'No items';
 if(typeof value==='object')return Object.entries(value).map(([key,item])=>`${fieldLabel(key)}: ${valueText(item)}`).join('; ')||'No fields';
 return String(value);
}
export function DataValue({value}:{value:unknown}){
 if(value===null||value===undefined)return <span>No value</span>;
 if(Array.isArray(value))return value.length?<ol className="operator-data-list">{value.map((item,index)=><li key={index}><DataValue value={item}/></li>)}</ol>:<span>No items</span>;
 if(typeof value==='object')return Object.keys(value).length?<dl className="operator-data-fields">{Object.entries(value).map(([key,item])=><div key={key} data-field={key}><dt>{fieldLabel(key)}</dt><dd><DataValue value={item}/></dd></div>)}</dl>:<span>No fields</span>;
 return <span className="operator-data-value">{String(value)}</span>;
}
