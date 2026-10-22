import type {Json} from '../../shared/expansion-contracts';
/** Predicates consume the graph's already-projected values, never the raw native row. */
export function salesFilterValue(values:Record<string,Json>,name:string):{value:Json;sourceField:string}|null{
 if(Object.hasOwn(values,name)&&['string','number','boolean'].includes(typeof values[name]))return {value:values[name]!,sourceField:name};
 if(typeof values.custom_fields_json==='string'){
  const custom=JSON.parse(values.custom_fields_json) as Record<string,Json>;
  if(Object.hasOwn(custom,name)&&['string','number','boolean'].includes(typeof custom[name]))return {value:custom[name]!,sourceField:'custom_fields_json'};
 }
 return null;
}
