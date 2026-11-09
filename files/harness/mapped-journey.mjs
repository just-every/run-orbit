import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const {formsMappedJourney}=await import(pathToFileURL(resolve('newtests/t096/forms-mapped-journey.ts')).href);
await formsMappedJourney();
