# DIVERGENCE.md

## Signed provider mutations — BASE-ACCESS-004

**What did not fit.** BASE-ACCESS-004 requires every mutation to check an operator session and ownership. Orbit must also accept customer-signal events and mail delivery/reply events from configured external sources, which cannot hold an operator session.

**Why.** These callbacks are essential inputs to the product's signal and delivery lifecycles. Treating them as operator requests would either make ingestion impossible or encourage a fake session bypass.

**What Orbit does instead.** SIGNAL-009 supersedes BASE-ACCESS-004 only for `/api/v1/signals/` and `/api/v1/mail/events/`. Each request must verify a configured source or provider signature bound to this workspace, pass rate limits and schema validation, remain idempotent, and write only signals, delivery states, and their timeline entries. Every operator mutation continues to require a valid session and server-side ownership checks.

**Worth centralising.** Every seed with an inbound webhook — mail events, calendar callbacks, payment events, form relays — will write this same supersede. A `BASE-ACCESS-005 — Non-operator callers` clause ("a path declared with `additionalAuthentication` in `seed.json` is authorised by a verified provider signature bound to this deployment instead of a session, is rate-limited, is idempotent, and may write only the entities the product contract names for it") would let seeds declare the path rather than supersede a security clause. Superseding a `BASE-ACCESS-` clause should stay rare enough to be a signal.

## Suppression lists are a per-seed reinvention — BASELINE.md gap

**What did not fit.** Orbit needs RECORD-012 (do-not-contact: an operator block, an unsubscribe event, or a permanent bounce suppresses a contact, and no operation can email them). The support-inbox exemplar needs the same guarantee as CONTACT-006 (blocking). Any seed that sends customer mail needs it, and it reads identically in each.

**Why this is friction.** AGENTS.md says "if a clause would read identically in another seed, it belongs in the baseline", but BASELINE.md has no clause about contacting people. The result is that a privacy-and-deliverability guarantee is re-derived per seed with different words, different triggers, and no shared test.

**Suggested baseline clause.** `BASE-DATA-006 — Suppression`: "A recipient the product has recorded as unsubscribed, blocked, or permanently bounced is never sent another message on that channel by any operation, including jobs, retries, and extensions. Only an operator can clear the state." Orbit would then drop RECORD-012's invariant and keep only its product-specific trigger list.

## Policy and slot counts read as targets — AGENTS.md

**What did not fit.** AGENTS.md says "About eight per seed" for policies and "About ten per seed" for slots. Orbit's bootstrap landed on exactly 8 and exactly 10, and at least one policy (`opportunity.next-action.v1`) exists more to fill the count than because buyers are known to want it.

**Suggested wording.** State them as ceilings with a justification rule — "at most about eight; each must name a customisation buyers are known to want, and a seed with four good ones is better than eight" — so the number stops behaving like a quota.

## Contract format differs between AGENTS.md and the exemplar — AGENTS.md

**What did not fit.** AGENTS.md's "Contract and manifest" section shows a clause as its own H2 (`## CHAN-001 — Inbound email` followed by a paragraph), while `CONTRACT.example.md` — the stated quality bar — uses area H2s with `- **CHAN-001 — Title.** …` bullets. The two shapes imply different parsers for `pnpm verify` and different diff behaviour when a clause changes.

**Suggested fix.** Make AGENTS.md's example match the exemplar's bullet form, or state which one seed-spec parses.

## Historical generic guidance used a live clause ID — retired consumer instructions

**Historical context.** The former consumer-only file was removed during the authoritative edition conversion; current guidance is unified in AGENTS.md. The override example in AGENTS.consumer.md is `{ "AI-002": { "reason": "AI replies must remain draft-only." } }`, and the intent example is a support-inbox `## Conversations` block. In Orbit, `AI-002` is output validation, so a buyer's agent reading the shipped file sees an override recipe that names a real clause of this product and describes behaviour that is not that clause.

**Suggested fix.** Use an obvious placeholder (`"CLAUSE-ID"`) and a product-neutral intent example, or have publish substitute a real clause from the seed being shipped.

## Explicit application delegation — BASE-ACCESS-002 and BASE-ACCESS-004

The native delegation outcome recorded in HANDOVER on 27 September authorizes
selected external application access without reusing an operator cookie. CONTRACT
now records that exact narrow exception: native allowlist and consent, one-use PKCE
exchange, current scoped bearer checks and only an internal handoff write. Native
operator routes retain their session checks, and OUT-001's exact human approval is
unchanged. The token and bearer namespace is declared in seed.json and rate-limited
under the existing public limit; no new provider or customer outreach is introduced.

## Reviewed CSV move-in

The direct per-record CSV writer is replaced by the reviewed import-kit wizard. Existing native identities are linked without field replacement; changed source bytes or native edits are reported as conflicts. Imported owner names are inert evidence, never operator assignments or invitations. Missing consent is held. Import custody and undo authority stay installation-local; native records and anonymous suppression proofs remain portable. Privacy erasure withdraws uploaded originals and stale reviews.

## Sign-in moved onto Base operator-auth — AUTH-5 (12 Oct 2026)

**What changed.** Orbit's own magic-link engine, owner bootstrap and TanStack `/signin` page are replaced by Base operator-auth through its native accounts adapter over Orbit's `operators` and `sessions` (HANDOVER "Sign-in"). Base's server-rendered `/signin` and confirmation pages carry Base's wording ("Email a sign-in link", "Confirm"), and an emailed link now opens a read-only confirmation page whose **Confirm** button signs in; the former GET `/auth/verify` link redirects to `/signin`. Managed visual edits no longer reach the sign-in page, which Orbit does not render.

**Kept.** Operator ids, every foreign key, access roles, field access, invitations, grants and Slate delegations; sessions issued before the upgrade keep working until they expire; the 15-minute link and 14-day session lifetimes; the setup-token owner claim.

**Added.** Step-up (a fresh email proof) for archive export, archive import, operator erasure and delegation consent; record deletion keeps its confirmation only, as an everyday CRM action. Optional provider sign-in through `oidc-provider@1`, off by default. Dev identity behind the checkout key.


## Native automation setup (16 October 2026)

Zapier and Make use the source-scoped automation endpoint with their saved private source secret in an Authorization Bearer header over HTTPS. It shares the signed path’s schema, replay identity and current-source commit fence. Provider-native Calendly/Cal.com webhooks keep signature validation. Secrets are never placed in URLs.
