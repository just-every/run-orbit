/** A framed form can read only its own address, so the embed copies the page
 * parameters its reviewed definition declares, and no others, into the frame. */
export function formEmbedCode(origin:string,form:{slug:string;parameters:string[]}){
 const src=`${origin}/p/${form.slug}`;
 if(!form.parameters.length)return `<iframe src="${src}" title="Contact form" width="100%" height="640"></iframe>`;
 const id=`orbit-form-${form.slug}`;
 return `<iframe id="${id}" title="Contact form" width="100%" height="640"></iframe>\n<script>(()=>{const page=new URLSearchParams(location.search),src=new URL(${JSON.stringify(src)});for(const name of ${JSON.stringify(form.parameters)})if(page.has(name))src.searchParams.set(name,page.get(name));document.getElementById(${JSON.stringify(id)}).src=src;})();</script>`;
}
