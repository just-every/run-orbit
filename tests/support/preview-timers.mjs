let sequence=0;

/** Chromium blocks timer callbacks in script-disabled previews, including axe's
 * injected callbacks. Run those timers on Node's real clock, then invoke the
 * callback through the driver in the original frame. Its DOM and sandbox stay
 * intact, so the preview receives the same accessibility rules as every frame.
 * https://github.com/dequelabs/axe-core-npm/issues/1469
 */
export async function withPreviewTimers(page,analyze){
 const frames=[];
 for(const frame of page.frames().slice(1)){
  const element=await frame.frameElement();
  const disabled=await element.evaluate(node=>node.hasAttribute('sandbox')&&!node.sandbox.contains('allow-scripts'));
  await element.dispose();if(disabled)frames.push(frame);
 }
 const key=`__orbitAxeTimers${++sequence}`,binding=`${key}Dispatch`,timers=new Set(),errors=[];
 let deadline;
 try{
  if(frames.length){
   await page.exposeBinding(binding,({frame},id,delay)=>{
    const timer=setTimeout(async()=>{
     timers.delete(timer);
     try{await frame.evaluate(({key,id})=>{
      const state=globalThis[key],job=state.jobs.get(id);
      state.jobs.delete(id);if(job)job.callback(...job.args);
     },{key,id});}catch(error){errors.push(error);}
    },delay);
    timers.add(timer);
   });
   for(const frame of frames)await frame.evaluate(({key,binding})=>{
    const dispatch=globalThis[binding],state={setTimeout,clearTimeout,jobs:new Map(),next:0};
    globalThis[key]=state;
    globalThis.setTimeout=(callback,delay=0,...args)=>{
     if(typeof callback!=='function')throw Error('Accessibility timers require function callbacks.');
     const id=++state.next;state.jobs.set(id,{callback,args});void dispatch(id,Number(delay));return id;
    };
    globalThis.clearTimeout=id=>{state.jobs.delete(id);};
   },{key,binding});
  }
  const result=await Promise.race([analyze(),new Promise((_,reject)=>{
   deadline=setTimeout(()=>reject(Error('Accessibility analysis did not finish within 45 seconds.')),45000);
  })]);
  if(errors.length)throw new AggregateError(errors,'Accessibility timer callback failed.');
  return result;
 }finally{
  clearTimeout(deadline);for(const timer of timers)clearTimeout(timer);
  for(const frame of frames)await frame.evaluate(key=>{
   const state=globalThis[key];globalThis.setTimeout=state.setTimeout;globalThis.clearTimeout=state.clearTimeout;delete globalThis[key];
  },key);
 }
}
