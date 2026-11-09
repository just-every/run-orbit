import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const {formLegacyBasisBrowserJourney}=await import(pathToFileURL(resolve('newtests/t096/browser-form-legacy-basis.ts')).href);
await formLegacyBasisBrowserJourney(process.argv[2]);
if(process.argv[3]==='identity'){
 const {formIdentityBrowserJourney}=await import(pathToFileURL(resolve('newtests/t096/browser-form-identity.ts')).href);
 await formIdentityBrowserJourney(process.argv[2]);
}
