import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/app/drafts/')({
  beforeLoad: () => { throw redirect({ to: '/app', statusCode: 302 }); },
});
