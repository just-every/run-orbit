import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/app/now')({
  beforeLoad: () => { throw redirect({ to: '/app', statusCode: 302 }); },
});
