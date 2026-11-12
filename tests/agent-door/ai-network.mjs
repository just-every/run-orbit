/** Only the paid model HTTP edge is replaced; production request validation runs. */
export default {async fetch(request){
 const url=new URL(request.url);
 if(request.method!=='POST'||url.origin!=='https://api.openai.com'||url.pathname!=='/v1/responses')return new Response('Undeclared provider edge',{status:502});
 const body=await request.json(),input=JSON.parse(body.input);
 if(body.store!==false||!input.evidence?.length)return new Response('Invalid native model request',{status:400});
 return Response.json({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify({explanation:'Follow up on the cited buyer discussion.',subject:'Buyer discussion',body:'Thank you for the discussion. Shall we review the next step?',evidenceIds:[input.evidence[0].id]})}]}],usage:{input_tokens:20,output_tokens:10}});
}};
