import {CopyField} from './capture-copy-field';

/** The installer puts `rer` in ~/.local/bin, which a new terminal may not search. One line to paste makes every `rer` step on the page work. */
export const rerPathLine='export PATH="$HOME/.local/bin:$PATH"';
export function RerPathHint(){
 return <><p>If the terminal says <code>rer: command not found</code>, run this line once in it, then repeat the step. Add the same line to <code>~/.zshrc</code> (or <code>~/.bashrc</code>) so every new terminal finds <code>rer</code>.</p><CopyField label="Line that puts rer on your path" value={rerPathLine}/></>;
}
