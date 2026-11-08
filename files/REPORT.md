# sd-orbit-c-f140 results

Repository: just-every/run-orbit. Branch: cloud/sd-orbit-c-f140.
Candidate: dd00e08b10a0c37b5bd92030d5d7221a3de5bfde. Main used for integration: 6d869cb48cbd6bcebb1566be460b49223e892bb6.

## Outcome and scope

SURFACE-011 remains PARTIAL. This round closes only the planner-selected internal-task portions of acceptance 1 and the resulting review-entry portions of acceptance 2. The public MCP handoff calls execute under autonomous and held policies; the overview reconciles their actual class and decision groups against complete paginated public audit inventory. The emitted Worker proof retains the original public audit identities and call times and follows the held call to its open native review item. A stronger public-door receipt assertion demonstrated a native adapter defect: the receipt's operationKey was the literal string "undefined". Base removes the control argument before calling the tool and provides it as ToolContext.idempotencyKey. The handoff adapter now uses that admitted context key. The failing assertion is retained. Native task actions, policy decisions, audit identities and existing historical receipts retain their behavior; no overview redesign or copy change was made.

No Status, Gap, Evidence, acceptance sentence, clause count, policy default or hold changed. Before and after: 36 DONE, 136 PARTIAL, 32 MISSING, 204 clauses. Registered tests remain 198 plus two qualification flows, total 200. No assertion was deleted, weakened or hidden behind a new environment flag. No test was removed. Plan rows changed: none; only the selected SURFACE-011 proof slice is returned to the lane.

The full plan is in PLAN.md. Setup, evidence preparation, native proof, browser proof and mechanical checks followed that plan. Clone authentication recovered on the fifth prescribed attempt after refreshed retries at 15, 45, 90 and 150 seconds; clone-receipt.json records the actual outcomes. No alternate credential was used.

## Demonstrated adapter defect

The exact pre-fix candidate was a7912d9f0654c25023df2e746784d813b94bafe1. The native managed-owner test exited 1 at tests/core/managed-owner.test.ts:136: actual 'undefined', expected 'synthetic-orbit-overview-autonomous'. before-fix-core.log and before-fix-core-receipt.json preserve that actual failure. No CI run had been started for that unpublished candidate. It was corrected before publication; the earlier published save was never rewritten.

The fix is one expression in src/core/features/agent-door/handoffs.ts: operationKey uses ctx.idempotencyKey, supplied by the Base pipeline after requiring the mutating call's key. It no longer reads the stripped control argument. Receipt target, operation key, observed target, actual saved content and pinned public audit time are now asserted together through the real MCP door.

## Changed files and proof entry points

- tests/support/agent-door-proof.ts passes the real native opportunity, authenticated owner door, signed policy adoption and MCP transport into a focused helper in tests/core/managed-owner.test.ts. MCP test requests construct the native door after the pinned clock is installed and issue fresh test tokens.
- tests/core/managed-owner.test.ts, test "Managed owner claim verifies RER authority and creates the native owner/session exactly once", invokes internalTaskOverviewProof. It checks actual source-bound handoff receipts, persisted native task readback, returned public decision IDs, frozen current-week call times, autonomous behavior and held review linkage. Real populated event reads take the inventory beyond a page boundary. All expected overview groups come from the complete real audit inventory, with no fixed expected group counts.
- tests/agent-door/overview-proof.mjs walks every audit page, checks ordered unique public identities and unchanged policy decisions, derives this week's groups from actual rows, compares every emitted group, and checks linked open held review summaries and retained review and flag actions.
- tests/agent-door/native-journey.mjs records each actual autonomous and held conformance handoff at its existing afterStep hook, retains its public identity and time, reconciles immediately, and reconciles again in sellerDay. Source conformance uses the HTTP proof without requiring Chromium.
- tests/delegation-browser/native.test.ts, test "native browser consent, delegated handoff and same-row UI editing preserve current authority and immutable receipts", keeps its entire existing journey and then runs the same emitted-Worker conformance with the browser observer. This existing Verify browser registration supplies Chromium. There is no optional environment flag controlling whether this proof executes.
- tests/agent-door/overview-browser.mjs asserts the populated groups and linked held review item at 1440. It captures the same populated screen once at 1440 and 390, using only the emitted Worker's real responses. Native review and flag actions remain present. Receipt and screenshots are in browser/.
- sources.lock.json is regenerated by the documented edition tool after staging the final test files. No generated contract view is committed.

## Acceptance and boundaries

| Item | Result | Evidence |
| --- | --- | --- |
| Acceptance 1, internal task calls by class and decision | PASS locally on the exact candidate | core-receipt.json; conformance-receipt.json; tests/core/managed-owner.test.ts#Managed owner claim verifies RER authority and creates the native owner/session exactly once; tests/agent-door/native-journey.mjs#sellerDay and afterStep |
| Acceptance 1, customer messages, binding quotes and financial or provider work | Unclaimed | Existing holds and receiving-door prerequisites remain unchanged. |
| Acceptance 2, actual held internal-task review entries | PASS locally on the exact candidate | browser-receipt.json; browser/receipt.json; tests/delegation-browser/native.test.ts#native browser consent, delegated handoff and same-row UI editing preserve current authority and immutable receipts |
| Acceptance 2, reserved and actual provider costs and enforced caps or no-cap qualification | Unclaimed | Provider spend and cap qualification remain omitted. |
| Complete seeded sales week and full cross-run reconciliation | Unclaimed | Narrow internal-task inventory proof establishes neither. |
| Inherited BASE-AGENT-009 duty | Scoped reconciliation and linked review proof only | CONTRACT.md:2267 already cites this Base duty; retained source conformance runs its existing audit checks. |
| Inherited BASE-AGENT-011 duty | No policy or pause implementation change | Same existing citation; original native capacity and pause assertions remain in the managed-owner registration and conformance. Broader acceptance remains unclaimed. |

## DONE riders and pre-candidate checks

| Rider | Result | Basis |
| --- | --- | --- |
| 1 | PARTIAL for the full clause | The selected internal-task outcomes are exercised. All held and omitted outcomes above remain unproved; no DONE award is requested. |
| 2 | PASS for the selected slice | Real populated native tasks, public audit inventory and linked review items; autonomous and held policies both execute. Expected groups are derived from actual public calls. |
| 3 | Pending exact-SHA Verify | Existing core, source conformance and browser registrations load the proof. CI status is recorded separately in ci-receipt.json when available. |
| 4 | PASS locally | core, browser, conformance, build, typecheck and first-party receipts all name the exact final candidate and exit 0. |
| 5 | INSPECTED | SURFACE-011 already cites BASE-AGENT-009 and BASE-AGENT-011. No inheritance or receiving-door scope was narrowed. |
| 6 | PASS mechanical | Contract write and check pass. Generated views are restored from main; the Status table is untouched. Remaining scope is preserved in this report and the existing Gap. |
| 7 | PASS | No acceptance sentence, ruling, clause ID or coverage map changed. |
| 8 | INSPECTED, unchanged implementation | Original authority, rejection, replay and revocation assertions are retained and run with the touched core and conformance registrations. This proof grants no new permission. |
| 9 | PASS boundary | No live provider, legal or real spending qualification is claimed. |
| 10 | PASS | Existing autonomous and held policies are used without a new policy default. |
| 11 | Pending fleet landing | Main equality, full-history publication scan and exact-main Run site remain the guarded lander's duties. This cloud never pushes main. |

Pre-candidate check: the selected user-visible behavior has populated public-door assertions; no existing assertion was narrowed; authority, erasure and replay implementation is untouched and existing proofs retained. Browser receipt records width equal to document width, 13px minimum text, zero unnamed controls at both 1440 and 390, and no browser runtime error. The source runtime screens were inspected; no redesign or copy pin was introduced. Exact-SHA Verify remains pending. Publication scan is NOT RUN in this cloud; complete, historyScanned and findings are unestablished until the fleet scans. Run site and main equality are pending landing, never assumed.

## Mechanical checks and custody

MECHANICAL lock=node node_modules/@runeditrun/rer/edition-authoring/cli.mjs lock then check exit=0; views=node src/base/contract-docs.mjs write then check exit=0; ledger=none exit=0.

Typecheck, first-party check and app build passed locally. No migration changed. The initial coherent save was pushed as bcb8ad5ebd9d5b95d70a34f568dd2bd18c95466c with [skip ci]. The final candidate fixes the demonstrated receipt key defect and adds native receipt and exact call-time assertions; all exact-candidate local proofs pass and its guarded push is recorded in push-receipt.json. No pull request is needed: this repository's push Verify is the pre-main entry point.

CLAIM SURFACE-011 PARTIAL points=1,2 tests=tests/core/managed-owner.test.ts#Managed owner claim verifies RER authority and creates the native owner/session exactly once; tests/agent-door/native-journey.mjs#sellerDay; tests/delegation-browser/native.test.ts#native browser consent, delegated handoff and same-row UI editing preserve current authority and immutable receipts
GAP SURFACE-011: Customer messages, binding quotes, financial and provider work, reserved and actual provider spend, company caps or no-cap qualification, the complete seeded sales week and full cross-run reconciliation remain unclaimed. All existing holds and prerequisites remain unchanged.

PROBE SURFACE-011 1: source-bound MCP handoff upserts under autonomous and held policies -> native tasks saved; complete paginated audit reconciles every emitted class and decision group.
PROBE SURFACE-011 2: authenticated overview and review inventory -> held task links its original public audit identity to an open review with the saved task summary and native actions.

## Final local results

All of core, browser, conformance, build, typecheck and first-party checks exited 0 on the full candidate SHA above. Each command, start and finish time, exact HEAD, actual exit and complete non-secret log hash is in its corresponding receipt. The core registration passed with actual source-bound tasks under both policies, a complete paginated 201-row audit inventory and three audit pages. The emitted browser and source conformance each passed all 3,520 points. Browser screenshots and the actual 392-row inventory receipt record both original phase call identities and times. The actual counts are observations, never fixed expected groups.

The developer environment followed the supplied toolchain shell: Node 24.19.0 and pnpm 10.12.4. The repository pins Node 22.20.0; the supplied shell retains a newer installed Node. GitHub Verify uses the repository's pin. Chromium for local proof is /usr/bin/chromium with --no-sandbox. Every browser was closed and every test-owned server was stopped by its own PID. No full local Verify, publication scan, provider journey or live account action was run.

## Exact source locations

- src/core/features/agent-door/handoffs.ts:33: const input:Effect={operation:'orbit.handoff.upsert',operationKey:ctx.idempotencyKey!,target:String(args.target),expectedRevision:String(args.source_revision),expectedAudienceRevision:String(args.audience_revision),content:contentSchema.parse(args.content)};
- tests/core/managed-owner.test.ts:116: async function internalTaskOverviewProof(context: Parameters<typeof agentDoorProof>[0],{bindings,cookie,opportunityId,adopt,businessCall}: OverviewProofContext) {
- tests/core/managed-owner.test.ts:168: test('Managed owner claim verifies RER authority and creates the native owner/session exactly once', async context => {
- tests/agent-door/native-journey.mjs:14: export async function afterStep({phase,step,args,request,origin,cookie}) {
- tests/agent-door/native-journey.mjs:26: export default async function sellerDay({tool,request,origin,cookie}) {
- tests/agent-door/overview-proof.mjs:3: export async function auditInventory({request,origin,cookie}) {
- tests/agent-door/overview-proof.mjs:22: export async function agentOverviewProof({request,origin,cookie,calls,now=Date.now()}) {
- tests/agent-door/overview-browser.mjs:7: export async function agentOverviewBrowser(input) {
- tests/delegation-browser/native.test.ts:16: test('native browser consent, delegated handoff and same-row UI editing preserve current authority and immutable receipts',async()=>{
- tests/delegation-browser/native.test.ts:31: await withOverviewBrowser(()=>checkAgentDoor(process.cwd(),{declaration:'deploy.json'}));


## Terminal product custody

PUSHED branch=cloud/sd-orbit-c-f140 head=dd00e08b10a0c37b5bd92030d5d7221a3de5bfde

The declared remote product branch was checked with ls-remote and equals this exact candidate. Its worktree is clean. Push Verify 42480801852 on that exact SHA remains in progress with no conclusion after two REST calls spaced at least 300 seconds apart. The one watcher was stopped at cloud handoff; no green result is claimed. No PR was created because push is the existing workflow entry point. No workflow was dispatched or rerun. This is PUSHED custody, without a READY, DONE, main-equality, publication-scan or Run-site claim. The fleet owns the remaining exact-SHA and landing gates. No implementation blocker remains for the selected internal-task slice.

Product commits: bcb8ad5ebd9d5b95d70a34f568dd2bd18c95466c (coherent save, skip CI) and dd00e08b10a0c37b5bd92030d5d7221a3de5bfde (minimal adapter fix and final receipt proof). Every candidate author and committer uses the fleet identity and every candidate trailer was inspected. The published save was never rewritten, no force push occurred, and main was never pushed. All complete non-secret local receipts, screenshots, before-fix failure and terminal product provenance are explicitly selected for the separate evidence branch.
