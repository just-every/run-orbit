// The access questions asked of every prior-data person, before and after the upgrade.
export function probes(c) {
  const w = c.workspace, list = [];
  const people = ['owner', 'seller', 'collaborator', 'analyst'];
  for (const who of people) {
    const cookie = c.people[who].session;
    list.push(
      { name: `${who}:class`, cookie, path: '/api/v2/access/class' },
      { name: `${who}:workspaces`, cookie, path: '/api/v2/access/workspaces' },
      { name: `${who}:self`, cookie, path: `/api/v2/access/workspaces/${w}/self` },
      { name: `${who}:opportunities`, cookie, path: `/api/v2/workspaces/${w}/records?kind=opportunity` },
      { name: `${who}:contacts`, cookie, path: `/api/v2/workspaces/${w}/records?kind=contact` },
      { name: `${who}:opportunity`, cookie, path: `/api/v2/workspaces/${w}/records/opportunity/${c.opportunityId}` },
      { name: `${who}:second-opportunity`, cookie, path: `/api/v2/workspaces/${w}/records/opportunity/${c.secondOpportunityId}` },
      { name: `${who}:contact`, cookie, path: `/api/v2/workspaces/${w}/records/contact/${c.contactId}` },
      { name: `${who}:workbench`, cookie, path: '/api/v1/workbench' },
      { name: `${who}:administration`, cookie, path: `/api/v2/access/workspaces/${w}/administration` },
    );
  }
  list.push(
    { name: 'leaver:class', cookie: c.people.leaver.session, path: '/api/v2/access/class' },
    { name: 'slate:identity', bearer: c.delegation.bearer, path: '/api/delegation/v1/identity' },
    { name: 'slate:check', bearer: c.delegation.bearer, path: `/api/delegation/v1/check?target=${encodeURIComponent(c.handoffTarget)}` },
    { name: 'slate:evidence', bearer: c.delegation.bearer, path: `/api/delegation/v1/evidence?target=${encodeURIComponent('opportunities/' + c.opportunityId)}` },
    { name: 'public:form', path: `/p/${c.formSlug}` },
  );
  return list;
}
