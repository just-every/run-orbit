import assert from 'node:assert/strict';

// Use the page's native cookie transport, including Chromium's secure-cookie
// exception for loopback development. Playwright's Node request jar differs.
export async function browserAPI(page,path,method='GET',body){
 const response=await page.evaluate(async({path,method,body})=>{
  const result=await fetch(path,{method,headers:body===undefined?{}:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
  return {status:result.status,ok:result.ok,body:await result.json()};
 },{path,method,body});
 assert.ok(response.ok,`${method} ${path} returned ${response.status}`);
 return response.body;
}

export async function fontEvidence(page){
 return page.evaluate(async()=>{await document.fonts.ready;return {body:getComputedStyle(document.body).fontFamily,heading:getComputedStyle(document.querySelector('h1,h2')).fontFamily,loaded:[...document.fonts].filter(font=>font.status==='loaded').map(font=>({family:font.family,weight:font.weight}))};});
}
