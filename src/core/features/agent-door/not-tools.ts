import type {AgentDoorOptions} from '../../../base/modules/agent-door';

type NotTool = NonNullable<AgentDoorOptions['notTools']>[number] & {description: string};

/** Contract exceptions describe only these non-action parts, never a whole sales job. */
export function orbitNotTools(): NotTool[] {
  return [
    {clauses: ['TEAM-001'], reason: 'installation', description: 'The installation authorization model applies to every action; it is not an action itself.'},
    {clauses: ['TEAM-003'], reason: 'installation', description: 'The single workspace and its timezone are installation facts. Actions that configure them remain eligible for settings tools.'},
    {clauses: ['PUBLIC-001'], reason: 'screen', description: 'The public information page is a screen for a person.'},
    {clauses: ['PUBLIC-002'], reason: 'screen', description: 'The interactive fictional demo is a screen for a person, without owner-data actions.'},
    {clauses: ['PUBLIC-003'], reason: 'screen', description: 'The installation readiness and unavailable sign-in page is a screen for a person.'},
    {clauses: ['PUBLIC-004'], reason: 'screen', description: 'A person completes their own sign-in, proof confirmation and identity-provider screens.'},
    {clauses: ['MOBILE-001'], reason: 'device', description: 'Only native device, offline and push behavior is device-only. Server-side sales jobs remain eligible for tools.'},
    {clauses: ['OPS-001'], reason: 'installation', description: 'Installation and provider setup facts are not actions. Person-only provider consent remains a gated handoff; provider jobs remain eligible for tools.'},
    {clauses: ['BOUNDARY-001'], reason: 'installation', description: 'Product boundaries and the cross-product qualification journey describe the installation; sales and integration actions remain eligible for tools.'},
    {clauses: ['RECORD-008'], reason: 'import-door', description: 'CSV import uses the reviewed import door with saved preview, explicit mappings and Apply.'},
    {clauses: ['MIGRATE-001'], reason: 'import-door', description: 'HubSpot migration uses the guided migration and import door with authorization and saved review.'},
    {clauses: ['MIGRATE-002'], reason: 'import-door', description: 'Pipedrive migration uses the guided migration and import door with authorization and saved review.'},
    {clauses: ['MIGRATE-003'], reason: 'import-door', description: 'Salesforce migration uses the guided migration and import door with authorization and saved review.'},
  ];
}
