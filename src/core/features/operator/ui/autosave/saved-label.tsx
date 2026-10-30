/** "✓ Saved" beside a field's label for 2 s after the server answered; one at a time per form. */
export function SavedLabel({show}:{show:boolean}){
 return show?<span className="r-saved" role="status">✓ Saved</span>:null;
}
