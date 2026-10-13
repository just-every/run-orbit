export function protectResponse(response: Response, managementOrigin?: string, publicFormOrigins?: string[]) {
  const headers = new Headers(response.headers);
  const existing = (headers.get('Content-Security-Policy') ?? '').split(';').map(part => part.trim()).filter(part => part && !/^frame-(?:src|ancestors)(?:\s|$)/i.test(part)).join('; ');
  const ancestors=publicFormOrigins?`frame-ancestors 'self' ${publicFormOrigins.join(' ')}`:"frame-ancestors 'none'";
  const policy = [existing, ancestors, `frame-src 'self'${managementOrigin ? ` ${managementOrigin}` : ''}`].filter(Boolean).join('; ');
  headers.set('Content-Security-Policy', policy);
  if(publicFormOrigins)headers.delete('X-Frame-Options');else headers.set('X-Frame-Options', 'DENY');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'same-origin');
  return new Response(response.body, {status: response.status, statusText: response.statusText, headers});
}
