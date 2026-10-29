/** Isolated paid edge. Each provider response must be supplied by its native
 * journey fixture. It cannot read application state or make its own egress. */
export default {async fetch(request,{fixture}={}) {
 if(!fixture||typeof fixture.status!=='number'||!fixture.responses)return new Response('No declared provider fixture',{status:502});
 const key=request.method+' '+new URL(request.url).pathname;
 const response=fixture.responses[key];
 if(!response)return new Response('No fixture for this provider operation',{status:502});
 return new Response(typeof response.body==='string'?response.body:JSON.stringify(response.body),{status:response.status??fixture.status,headers:response.headers??{'Content-Type':'application/json'}});
}};
