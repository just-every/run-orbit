import {randomBytes} from 'node:crypto';
/** Disposable installation key; never retained in conformance output. */
export default function encryption(){return randomBytes(32).toString('hex');}
