/** Fresh source versions for the existing two-policy conformance registration. */
export default async function workflowFixture({request,origin,cookie}){
 const response=await request(new URL('/api/workflows',origin).href,{method:'POST',headers:{Cookie:cookie,Origin:origin,'Content-Type':'application/json'},
  body:JSON.stringify({name:'synthetic-orbit-conformance-workflow',definition:{trigger:{kind:'record_changed',recordType:'opportunity'},
   conditions:[{field:'title',operator:'equals',value:'synthetic-orbit-no-trigger'}],actions:[{kind:'set',field:'title',value:'synthetic-orbit-old-definition'}]}})});
 if(response.status!==200)throw new Error('Native workflow fixture could not be saved');
 const {workflow}=await response.json();
 return {values:{workflow}};
}
