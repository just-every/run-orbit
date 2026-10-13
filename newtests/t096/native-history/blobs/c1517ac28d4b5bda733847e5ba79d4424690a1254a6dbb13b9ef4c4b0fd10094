/** Remove balanced RFC mailbox comments, retaining token boundaries and quoted text. */
export function withoutMailboxComments(input:string):string|null{
 if(/[\u0000-\u0008\u000a-\u001f\u007f-\u009f]/.test(input))return null;
 let depth=0,quoted=false,escaped=false,output='';
 for(const char of input){
  if(escaped){if(!depth)output+=char;escaped=false;continue;}
  if(char==='\\'&&(quoted||depth>0)){if(!depth)output+=char;escaped=true;continue;}
  if(depth){if(char==='(')depth++;else if(char===')')depth--;continue;}
  if(char==='"'){quoted=!quoted;output+=char;continue;}
  if(!quoted&&char==='('){depth=1;output+=' ';continue;}
  if(!quoted&&char===')')return null;
  output+=char;
 }
 return depth||quoted||escaped?null:output;
}
