/** The fixed compiler emits one capture script. Owner review renders its exact
 * visible document with capture disabled; the stored approved artifact is intact.
 * Removing the script avoids a blocked-script console error in the sandbox. */
export function readOnlyPublicationPreview(html:string){return html.replace(/<script>[\s\S]*?<\/script>/g,'');}
