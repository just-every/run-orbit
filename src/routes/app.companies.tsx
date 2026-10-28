import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/app/companies')({
  beforeLoad: () => { throw redirect({ href: '/app/records?kind=company', statusCode: 302 }); },
});
