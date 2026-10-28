import { writeFileSync, readFileSync } from 'node:fs';
import { orbitTools } from '../src/core/features/agent-door';
import { resources } from '../src/core/features/agent-door/resources';
import type { PlatformBindings } from '../src/core/platform/assets';
const tools=orbitTools({AUTH_ORIGIN:'https://orbit.example.test'} as PlatformBindings).sort((a,b)=>a.name.localeCompare(b.name));
const header=`# Agents in Orbit

Orbit's agent door uses the sponsoring person's current native identity and permissions. Open Agents at /agents to inspect policy, activity, reviews and pending approvals. An unset, expired, unanswered, blocked or paused policy permits no agent effect. People can continue working while agents are paused.

A Business owner and teammates must be mapped by signed Business settings before their agent credentials work. Token email never selects a person. A local API credential keeps its original deal operations, records, fields and expiry; a connected-application credential keeps its selected evidence and internal-handoff scopes. Neither credential acquires customer-mail authority.

Prepare a seller's day by reading the cited brief, selected CRM records and current meeting plan. Use the native source and audience revisions for an internal handoff, save permitted CRM edits and a follow-up draft, then let company policy decide customer dispatch. Review delivery, timeline and forecast as separate facts. A deal amount is CRM data, not a payment or legal acceptance.

External sends preserve saved content, current contact permission, native staleness and one-attempt provider custody. An unknown provider handoff is not proof of delivery and is not blindly resent. Scheduled agent messages retain their agent, sponsor, consent and original scopes and enter the policy door again before dispatch. No generic signal or background task supplies a person's approval.

The Agents page shows named preparer, sponsor and actual approvers. Approval binds the exact revision and summary hash; a changed summary refuses. A machine cannot manufacture native human verification. Import, owner claim, OAuth credentials and person authentication retain their native doors.

Spend caps are **not enforced** by this Base revision. Native quotas, provider consent and uncertainty rules still apply. No quote, signature, payment, Zoom or post-sale executor is added. The current native full-operator/collaborator model remains; a Business editor is not a sales manager.

This adoption is a draft candidate. The retained versioned REST adapters still use their original native admission and are not yet covered by company policy through this door. Agents activity covers the shared door only. Contract alignment, complete production conformance and a single policy boundary remain release requirements; the tool inventory is not an acceptance claim.

## Tool inventory

Canonical MCP is /mcp, with protocol eras 2026-07-28 and 2025-11-25. Discovery and specialist prompts come from this registry. Mutations require idempotency_key; tools with a native revision also accept expected_revision.

| Tool | Scope | Possible classes | Native job |
| --- | --- | --- | --- |
`;
const table=tools.map(t=>`| \`${t.name}\` | \`${t.scope}\` | ${t.classes.join(', ')} | ${t.description.replaceAll('|','\\|')} |`).join('\n');
const text=header+table+`\n| \`orbit.events.list\` | \`events:read\` | standard | Read retained changes visible to the current sponsor and credential. |\n\n## Resources\n\n`+resources().map(r=>`- \`${r.uriTemplate}\` — scope \`${r.scope}\`; current native visibility and record-derived classification, with outside text marked untrusted.`).join('\n')+'\n';
if(process.argv.includes('--check')){if(readFileSync('docs/AGENT-DOOR.md','utf8')!==text)throw Error('Agent docs differ from the native registry. Run pnpm exec tsx scripts/generate-agent-docs.ts.');}else writeFileSync('docs/AGENT-DOOR.md',text);
console.log(`Agent inventory: ${tools.length+1} tools; ${resources().length} resource templates.`);
