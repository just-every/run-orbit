export type FieldValue=string|number|boolean|null;
export type FieldType='string'|'number'|'boolean'|'empty';

/** Preserve compatible values; a replacement always needs the operator's review. */
export function convertFieldValue(current:FieldValue,type:FieldType):{value:FieldValue;replaces:boolean}{
 if(type==='string')return {value:current===null?'':String(current),replaces:false};
 if(type==='empty')return {value:null,replaces:current!==null&&current!==''};
 if(type==='number'){
  if(typeof current==='number')return {value:current,replaces:false};
  if(typeof current==='string'&&current.trim()&&Number.isFinite(Number(current)))return {value:Number(current),replaces:false};
  return {value:0,replaces:current!==null&&current!==''};
 }
 if(typeof current==='boolean')return {value:current,replaces:false};
 if(typeof current==='string'){
  if(/^(true|yes)$/i.test(current.trim()))return {value:true,replaces:false};
  if(/^(false|no)$/i.test(current.trim()))return {value:false,replaces:false};
 }
 return {value:false,replaces:current!==null&&current!==''};
}
