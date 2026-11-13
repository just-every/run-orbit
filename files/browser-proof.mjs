import {chromium,expect} from '/workspace/run-orbit/node_modules/@playwright/test/index.mjs';
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const packet=process.env.HOME+'/rer-consolidation/work/main-orbit-meeting-attendees-1/packet';
const head=execFileSync('git',['-C','/workspace/run-orbit','rev-parse','HEAD'],{encoding:'utf8'}).trim();
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
const errors=[];page.on('pageerror',error=>errors.push(error.message));
try{
 await page.goto(readFileSync('/workspace/run-orbit/.rer/local/open-url','utf8').trim());
 await page.waitForURL(u=>u.pathname==='/app',{timeout:30000});
 const origin=new URL(page.url()).origin,domain='cedargrove-proof.example';
 const create=async(kind,data)=>{const response=await page.request.post(origin+`/api/v1/records/${kind}`,{headers:{Origin:origin},data});expect(response.status(),await response.text()).toBe(201);return (await response.json()).id;};
 const company=await create('company',{name:'Cedar Grove Final',primary_domain:domain});
 const known=[];
 for(const [name,local,title] of [['Maya Chen','maya','Cedar expansion'],['Aisha Patel','aisha','Cedar renewal'],['Jordan Lee','jordan','Cedar planning']]){
  const email=`${local}@${domain}`,id=await create('contact',{name,email,company_id:company});known.push({id,name,email,title});
 }
 const inventory=await (await page.request.get(origin+'/api/v1/workbench')).json(),stage=inventory.stages[0].id;
 for(const person of known)await create('opportunity',{title:person.title,stage_id:stage,company_id:company,contact_ids:[person.id],primary_contact_id:person.id,value_cents:125000});
 const scenarios=[
  {title:'Cedar captured plan with named attendees',known,unknown:[`unknown@${domain}`],lines:[`ATTENDEE;CN=Maya Chen:mailto:maya@${domain}`,`ATTENDEE;CN=Aisha Patel:mailto:aisha@${domain}`,`ATTENDEE;CN=Unknown Buyer:mailto:unknown@${domain}`,`ORGANIZER;CN=Jordan Lee:mailto:jordan@${domain}`]},
  {title:'Cedar captured plan without attendee names',known,unknown:[`no-cn@${domain}`],lines:[`ATTENDEE:mailto:maya@${domain}`,`ATTENDEE:mailto:aisha@${domain}`,`ATTENDEE:mailto:no-cn@${domain}`,`ORGANIZER:mailto:jordan@${domain}`]},
  {title:'Cedar captured plan with unresolved organizer',known:known.slice(0,2),unknown:[`third@${domain}`,`host@${domain}`],lines:[`ATTENDEE;CN=Maya Chen:mailto:maya@${domain}`,`ATTENDEE:mailto:aisha@${domain}`,`ATTENDEE:mailto:third@${domain}`,`ORGANIZER;CN=New Host:mailto:host@${domain}`]}
 ];
 const results=[];
 for(const [i,scenario] of scenarios.entries()){
  await page.setViewportSize({width:1440,height:1000});
  const stamp=d=>d.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,''),start=new Date(Date.now()+86400000);
  const raw=['BEGIN:VCALENDAR','VERSION:2.0','METHOD:REQUEST','BEGIN:VEVENT',`UID:synthetic-orbit-final-${i+1}@${domain}`,`DTSTAMP:${stamp(new Date(Date.now()-60000))}`,`DTSTART:${stamp(start)}`,`DTEND:${stamp(new Date(+start+1800000))}`,`SUMMARY:${scenario.title}`,...scenario.lines,'END:VEVENT','END:VCALENDAR'].join('\r\n');
  writeFileSync(`${packet}/input-${i+1}.ics`,raw);
  await page.goto(origin+'/app/settings/capture/connect/files');
  await page.getByLabel('Mail (.eml or mbox) and calendar (.ics) files').setInputFiles({name:`synthetic-orbit-${i+1}.ics`,mimeType:'text/calendar',buffer:Buffer.from(raw)});
  await page.getByRole('button',{name:'Add files',exact:true}).click();
  await expect(page.getByRole('region',{name:'Import result'})).toBeVisible();
  const imported=await page.getByRole('region',{name:'Import result'}).innerText();
  await page.getByRole('link',{name:/^Review \d+ proposed changes?$/}).click();
  const proposal=page.getByRole('article',{name:/^Link this booked meeting to /}).filter({hasText:scenario.title});
  await proposal.getByRole('button',{name:'Accept',exact:true}).click();await expect(proposal).toHaveCount(0);
  await page.goto(origin+'/app/brief');
  const line=page.locator('li.today-line').filter({hasText:scenario.title});
  await line.getByRole('link',{name:'Plan this meeting',exact:true}).click();
  await expect(page.getByTestId('meeting-plan')).toBeVisible();
  const signalId=new URL(page.url()).pathname.split('/').at(-1),response=await page.request.get(origin+`/api/v1/today/meetings/${signalId}`);
  expect(response.status()).toBe(200);const {plan}=await response.json();
  expect(plan.attendees.map(p=>p.contact.id).sort()).toEqual(scenario.known.map(p=>p.id).sort());
  expect(plan.unresolved.map(p=>p.email).sort()).toEqual([...scenario.unknown].sort());
  const list=page.locator('section[aria-labelledby="plan-attendees"]');
  for(const person of scenario.known){
   await expect(list.getByRole('link',{name:person.name,exact:true})).toBeVisible();
   await expect(list).toContainText(person.title);
   const resolved=plan.attendees.find(p=>p.contact.id===person.id);
   expect(resolved.company?.id).toBe(company);expect(resolved.opportunities.map(o=>o.title)).toContain(person.title);
  }
  for(const email of scenario.unknown){await expect(list.getByText(email,{exact:true})).toBeVisible();await expect(list.getByRole('button',{name:`Create contact ${email}`,exact:true})).toBeVisible();}
  const row={title:scenario.title,imported,expectedKnown:scenario.known.map(p=>p.email),expectedUnresolved:scenario.unknown,plan,attendeesText:await list.innerText(),assertions:'passed'};
  if(i===0)for(const width of [1440,390]){await page.setViewportSize({width,height:1000});await page.screenshot({path:`${packet}/meeting-plan-${width}.png`,fullPage:true});}
  if(i===1){
   const email=scenario.unknown[0];await list.getByRole('button',{name:`Create contact ${email}`,exact:true}).click();
   await expect(list.getByRole('link',{name:email,exact:true})).toBeVisible();await expect(list.getByRole('button',{name:`Create contact ${email}`,exact:true})).toHaveCount(0);
   const after=(await (await page.request.get(origin+`/api/v1/today/meetings/${signalId}`)).json()).plan;
   expect(after.unresolved).toEqual([]);expect(after.attendees.find(p=>p.email===email)?.email).toBe(email);
   row.createExactAddress={email,unresolvedAfter:after.unresolved,created:after.attendees.find(p=>p.email===email)};
  }
  results.push(row);console.log(scenario.title,scenario.known.length,'resolved',scenario.unknown.length,'unresolved: passed');
 }
 expect(errors).toEqual([]);
 writeFileSync(packet+'/browser-receipt.json',JSON.stringify({repository:'just-every/run-orbit',head,branch:'cloud/main-orbit-meeting-attendees-1',productChanged:false,source:'fresh main after fetch/rebase; public rer dev file upload and reviewed linking',assertionViewport:1440,screenshotWidths:[1440,390],results,errors},null,2)+'\n');
}finally{await browser.close();}
