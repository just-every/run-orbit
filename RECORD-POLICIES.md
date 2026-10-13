# Record policy extensions

The buyer-owned implementations live in `src/ext/records.ts`. Their interfaces
are checked by TypeScript and their defaults implement the contract.

| Extension point | Export | Editable decisions |
| --- | --- | --- |
| `operator.management.v1` | `operatorManagementPolicy` | `canInvite` and `canRemove` receive the acting operator and requested operation. Both return true by default. |
| `record.identity.v1` | `recordIdentityPolicy` | `contactKey` and `companyKey` supply exact identity keys to record editing, imports, quick creation and signed source linking. The defaults trim and lowercase email, strip leading `www.` from domains, and exclude configured free-mail domains. |
| `opportunity.assignment.v1` | `opportunityAssignmentPolicy` | `ownerForNewOpportunity` receives the acting operator and returns an active operator ID or null. The default is null. Explicit assignments still take precedence in the record editor. |

These are source extensions, so an owner can edit and test them in their fork.
Keep stored keys consistent with the selected identity policy. Existing aliases
remain identity reservations until the surviving contact or company is deleted.
The setup operator's self-removal protection and the authenticated, reviewed
customer-send boundary remain enforced outside these policies.

`tests/core/records-contract.test.ts` exercises all three hooks, their default
semantics, and the persistence boundaries they affect.
