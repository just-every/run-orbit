import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const {formsBasisJourney}=await import(pathToFileURL(resolve('newtests/t096/forms-basis-journey.ts')).href);
await formsBasisJourney();
