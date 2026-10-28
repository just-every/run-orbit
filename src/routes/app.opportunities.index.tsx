import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/app/opportunities/')({
  beforeLoad: () => { throw redirect({ to: '/app/records', statusCode: 302 }); },
});
