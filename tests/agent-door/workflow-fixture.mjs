import {graphFixture} from './graph-fixture.mjs';

/** Fresh source versions for the existing two-policy conformance registration. */
export default async function workflowFixture({request,origin,cookie,mail}){
 const response=await request(new URL('/api/workflows',origin).href,{method:'POST',headers:{Cookie:cookie,Origin:origin,'Content-Type':'application/json'},
  body:JSON.stringify({name:'synthetic-orbit-conformance-workflow',definition:{trigger:{kind:'record_changed',recordType:'opportunity'},
   conditions:[{field:'title',operator:'equals',value:'synthetic-orbit-no-trigger'}],actions:[{kind:'set',field:'title',value:'synthetic-orbit-old-definition'}]}})});
 if(response.status!==200){console.error(JSON.stringify({fixture:'native-workflow',method:'POST',path:'/api/workflows',status:response.status}));throw new Error('Native workflow fixture could not be saved');}
 const {workflow}=await response.json();
 // Use the native schedule path so conformance is independent of the runner's weekday and hour.
 const messageSchedule=new Date(Date.now()+7*86400000).toISOString();
 const graph=await graphFixture({request,origin,cookie,mail});
 return {...graph,values:{...graph.values,workflow,messageSchedule}};
}
