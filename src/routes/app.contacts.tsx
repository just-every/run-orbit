import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/app/contacts')({
  beforeLoad: () => { throw redirect({ href: '/app/records?kind=contact', statusCode: 302 }); },
});
