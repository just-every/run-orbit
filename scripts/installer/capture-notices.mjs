// Use the lifecycle's resolved origin, after Base has applied saved settings and
// runtime host/port overrides. Never derive it from a private sign-in URL.
export function captureRedirects(origin) {
 const url = new URL(origin);
 if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash || url.pathname !== '/') throw new Error('Capture callbacks require an origin.');
 return ['google', 'microsoft'].map(provider => `ORBIT_CAPTURE_REDIRECT ${provider} ${url.origin}/api/v1/capture/oauth/${provider}/callback`);
}

export function captureNotices(lifecycle) {
 return {...lifecycle, async run(...args) {
  const context = await lifecycle.run(...args);
  if (context.verb === 'dev') for (const line of captureRedirects(context.origin)) context.store.report(line);
  return context;
 }};
}
