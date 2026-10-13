# Working on Orbit

## Run it locally

Start the app this way in every checkout, in this order (Node 22.20.0 and pnpm 10.12.4 are pinned):

```sh
rer install
rer setup --owner-email EMAIL
rer dev
```

`setup` takes the real owner mailbox from `--owner-email` or its prompt, claims that owner with a private one-use setup token and exits with no app running. `dev` prints `RER_READY`, `RER_SIGNED_IN` and `RER_OPEN` once `/health` answers: open the `RER_OPEN` link on this computer and the app opens signed in as the owner, through a dev session that works only behind this checkout's key (`.rer/local/dev-key.env`). The dev badge at the top switches between the owner, `seller@dev.localhost` (a full operator), `collaborator@dev.localhost` (an invited analyst) and signed out; `rer dev --as seller` starts as a persona and `rer dev --login` turns dev sign-in off. Sign-in itself is Base operator-auth over Orbit's own operators: the email link is captured in the local outbox (behind the same key), and no email is sent locally. The first sign-in lands on first-run setup at `/setup`; finish it to reach the app. Stop `dev` with `rer dev --stop` or Ctrl-C (and `preview` with `rer preview --stop`) before build, verification or data transfer.

```sh
rer verify
rer reset --yes
rer export --output exports/installation.rer
rer import --input exports/installation.rer --yes
rer deploy
rer describe
```

- `verify` runs the complete verification with its own temporary state.
- `reset --yes` removes only `.wrangler/state`, `.rer/local`, `.seed/installer` and `.dev.vars`, and refuses while `dev` runs.
- `export` writes a new private archive of every Orbit table; `import` restores one into an empty installation (after `reset --yes`), then run `setup` with the archive's owner email. Add `--target remote --origin HTTPS_ORIGIN --session-file FILE` to move a hosted installation's Records archive.
- `deploy` deploys to the owner's Cloudflare account and needs `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, `OWNER_EMAIL`, `MAIL_FROM` and `SENDGRID_API_KEY`; `deploy --dry-run` makes no provider request. Never deploy without the owner's instruction.
- `describe` lists every command, flag, effect and pin.

## Before changing product behaviour

Orbit is a self-contained Sales edition for account selling guided by customer evidence. The owner may edit any source. Preserve their recorded intent and verify the running result; a clean merge or passing upstream suite alone is insufficient.

Read `README.md`, `HANDOVER.md`, `CONTRACT.md`, `BASELINE.md`, `DIVERGENCE.md`, `seed.json`, and any `.seed/intent.md` first. The handover distinguishes implemented behaviour from the remaining contract work. Do not infer complete release acceptance from the focused test suite.

## Implementation boundaries

- One Cloudflare Worker serves Hono HTTP routes and TanStack Start documents. Preserve native session checks on HTTP, documents and generated functions. HTML forms that change state post before hydration.
- `src/core/features` owns Orbit records, signals, scoring, recommendations and reviewed outreach. Database access belongs in repositories; validate external inputs in routes.
- `src/family/sales` and `src/modules/sendgrid-email` contain selected component source owned by this edition. Edit it directly; origins support comparison and never override local changes.
- `@runeditrun/rer` is pinned exactly in devDependencies. `src/base/` runtime and mail module retain their Base provenance; refresh shared source from its pinned Base revision and run `rer check`. Orbit's own adapter is `scripts/installer/local.mjs`.
- `src/ext/config.ts` owns the public identity plate. Keep real behaviour and failed states visible; add no mocks, semantic fallbacks or invented AI output. Test fixtures live under `tests/` and never enter application code.
- Signals retain source, event identity, occurred/received time and immutable evidence. Stage, owner, score, queue and provider delivery state stay independent.
- Every customer send requires review of exact saved content. Preserve revision/staleness checks, recipient permission, one-attempt submission and truthful ambiguous outcomes. No signal or background action approves mail.
- Preserve already-applied migration history; use new migrations for core or extension schema changes. Prefer small files and direct responsibility boundaries.

Run `rer verify` after changes and exercise the affected real workflow through `dev`. Record any unverified product or baseline clauses explicitly. For updates, choose the Git or integration method that preserves all owner intent; conflicts are the agent's work.

## Recommended defaults and shared improvements

The maintained edition defaults save integration and verification work. Configuration
and hooks are conveniences; editing domain internals, core schema, UI, framework
or infrastructure is ordinary authoring too. Choose the change that serves the
owner's outcome, without a required sequence of extension mechanisms. Complex
merges and adaptation are the agent's work. Preserve the owner's actual requirements
wherever recorded: `CONTRACT.md`, `DIVERGENCE.md`, owner instructions and optional
`.seed/intent.md`; no particular intent file or registry is required.

Feed useful mechanisms, defaults and verification cases back into shared source
when they would save work in another edition. Their natural home may be this
edition, a family, Base or an independent repository; no separate repository per
module or universal compatibility interface is required. Verify adoption against
the receiving product's requirements, including deliberate local differences.
