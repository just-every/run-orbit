import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const {formsLegacyBasisJourney}=await import(pathToFileURL(resolve('newtests/t096/forms-legacy-basis-journey.ts')).href);
await formsLegacyBasisJourney();
