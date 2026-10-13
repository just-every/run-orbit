import {readFile,stat} from 'node:fs/promises';

export async function readSessionCookie(path){
  const info=await stat(path);
  if(!info.isFile()||info.size>4096)throw new Error('The session file must be a small regular file containing the native Orbit session cookie.');
  const cookie=(await readFile(path,'utf8')).trim();
  if(!/^__Host-orbit_session=[A-Za-z0-9_-]+$/.test(cookie))throw new Error('Session file must contain only the native Orbit session cookie. Sign in normally to obtain it.');
  return cookie;
}
