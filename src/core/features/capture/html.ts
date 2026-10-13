/** Read each tag once; an unclosed script/style consumes the rest of the input. */
export function stripHtml(html:string){
 // ASCII folding keeps offsets intact even when Unicode lowercasing expands a character.
 const lower=html.replace(/[A-Z]/g,character=>character.toLowerCase()),parts:string[]=[];let cursor=0,quoteDepth=0,lineStart=true;
 // Keep quoted originals readable, with the same line provenance as plain-text mail.
 function append(text:string){
  const lines=text.split('\n');
  for(let index=0;index<lines.length;index++){
   if(index){parts.push('\n');lineStart=true;}
   const line=lines[index]!;
   if(line){if(lineStart&&quoteDepth)parts.push('> ');parts.push(line);lineStart=false;}
  }
 }
 while(cursor<html.length){
  const start=html.indexOf('<',cursor);
  if(start<0){append(html.slice(cursor));break;}
  append(html.slice(cursor,start));
  const block=/^<(script|style)(?=[\s/>]|$)/.exec(lower.slice(start,start+9));
  if(block){
   const close='</'+block[1];let end=lower.indexOf(close,start+block[0].length);
   while(end>=0&&!/[\s>]/.test(lower[end+close.length]??''))end=lower.indexOf(close,end+close.length);
   if(end<0)break;
   const last=html.indexOf('>',end+close.length);if(last<0)break;
   cursor=last+1;continue;
  }
  const end=html.indexOf('>',start+1);if(end<0)break;
  const tag=lower.slice(start,end+1);
  if(/^<\/?blockquote(?=[\s/>])/.test(tag)){
   append('\n');
   quoteDepth=tag.startsWith('</')?Math.max(0,quoteDepth-1):quoteDepth+1;
  }else if(/^<br\s*\/?>$|^<\/(p|div|li|tr|h\d)>$/.test(tag))append('\n');
  cursor=end+1;
 }
 return parts.join('').replace(/&nbsp;/g,' ').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,'&');
}
