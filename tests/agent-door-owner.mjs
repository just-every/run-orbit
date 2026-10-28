/** Disposable verifier only: drive Orbit's ordinary signed claim and setup. */
export default async function initialize({request,origin,claim,displayName,returnTo,reviewers}) {
 const response=await request(new URL(claim.path,origin).href,{method:'POST',redirect:'manual',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({token:claim.token,displayName,returnTo})});
 if(response.status!==303)throw Error('Native signed owner claim failed');
 const cookie=response.headers.get('set-cookie')?.split(';')[0];
 if(!cookie)throw Error('Native owner session missing');
 const setup=await request(new URL('/api/v1/setup',origin).href,{method:'POST',headers:{Origin:origin,Cookie:cookie,'Content-Type':'application/json'},body:JSON.stringify({ownerName:displayName,name:'Native sales journey',timezone:'UTC',currency:'USD',stages:'New\nQualified\nProposal'})});
 if(!setup.ok)throw Error('Native workspace setup failed');
 await reviewers.initialize('sales-reviewer',{cookie});
 return response;
}
