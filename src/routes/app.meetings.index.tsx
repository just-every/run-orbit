import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/app/meetings/')({
  beforeLoad: () => { throw redirect({ to: '/app', statusCode: 302 }); },
});
