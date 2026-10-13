# Orbit

Orbit is the Sales edition for account selling guided by customer evidence. Its interface keeps stage, owner, score, queue and message state separate, and operators review every customer message before it is sent.

This repository is the complete source for Orbit. Public source: [just-every/run-orbit](https://github.com/just-every/run-orbit), release 0.1.0, licensed under the [MIT License](LICENSE). Read [ACCEPTANCE.md](ACCEPTANCE.md) for the product's acceptance obligations, [CONTRACT.md](CONTRACT.md) for its clauses and [OPERATIONS.md](OPERATIONS.md) for hosted configuration, mail, data transfer and recovery.

## Run it on your computer

Orbit pins Node **22.20.0** (`.node-version`) and pnpm **10.12.4** (`packageManager`, through Corepack). Every command below runs through the project's RER CLI, `node scripts/rer.mjs`; the matching package scripts take flags after `--`, for example `pnpm run setup -- --owner-email you@example.com`.

```sh
git clone https://github.com/just-every/run-orbit.git && cd run-orbit
node scripts/rer.mjs install
node scripts/rer.mjs setup --owner-email you@example.com
node scripts/rer.mjs dev
```

1. `install` installs the frozen dependencies from `pnpm-lock.yaml`.
2. `setup` asks for nothing else: it writes private local settings, including a generated source encryption key, to `.dev.vars` (mode 0600), builds Orbit, applies every migration to `.wrangler/state`, claims you as the first owner with a private one-use setup token, places a sign-in link in the local outbox and stops the app. Running it again keeps your owner, data and settings.
3. `dev` serves Orbit on `http://127.0.0.1:8787` (or the port you chose with `--port` at setup) once `/health` answers, and prints `RER_READY`, `RER_SIGNED_IN` and `RER_OPEN` lines. Open the `RER_OPEN` link on this computer: Orbit opens signed in as you. Its fragment carries this checkout's private dev key, so never share it. A dev badge at the top switches to the `seller` and `collaborator` personas or signs you out. No email is sent locally. Stop it with `node scripts/rer.mjs dev --stop` or Ctrl-C.

No owner JSON file is needed: the owner email flag and first-run form supply the installation details.

Your first sign-in opens **first-run setup at `/setup`**: confirm the business name, time zone, currency and pipeline stages, then finish. Until you do, every app page returns you to `/setup`; afterwards `/setup` takes you into the app, and Settings holds later changes.

To sign in by email link as in production, use **Email a sign-in link** at `/signin`, then `node scripts/rer.mjs outbox --owner-email you@example.com`: it requests a fresh link and prints an `RER_OPEN` link to the local outbox. Open the message's link and press **Confirm**.

### Get your first signal

Open NOW and follow the checklist. Add a company and contact with **Add your first customer**, then open Sources and connect a source. Orbit generates its signing secret and shows it once; copy it into the connected tool's private settings. Each recipe includes the installation's endpoint and an executable example. The website recipe embeds Orbit's reviewed, published contact form. **Send test event** selects your latest contact by default and records a clearly marked test through the signed ingestion path.

Open the opportunity from NOW, choose **Write follow-up**, save the exact message and review **Approve and send**. Sending needs a configured customer mail sender; source setup and manual drafts work without one. **See an example** opens a separate read-only workspace and never adds sample customers to yours.

### Verify, reset and move data

```sh
node scripts/rer.mjs verify
node scripts/rer.mjs reset --yes
node scripts/rer.mjs export --output exports/orbit.rer
node scripts/rer.mjs import --input exports/orbit.rer --yes
```

- `verify` runs every routine product and fold gate with isolated temporary state; full declared-capacity clauses remain pending. It replaces generated `verification/` outputs; tracked historical evidence is retained under `docs/retained-verification/`. Before release, run `pnpm run verify:release` for the routine gates plus the unchanged full-capacity qualification (see [TESTING.md](TESTING.md)). Stop `dev` and `preview` first; verification never touches your state.
- `reset` lists exactly what it removes (`.wrangler/state`, `.rer/local`, `.seed/installer`, `.dev.vars`) and needs `--yes`. It refuses while `dev` or another local operation owns the state, and keeps source, dependencies, `exports/` and deployment receipts in `.rer/deploy/`. Run `setup` again afterwards for a fresh, empty installation.
- `export` writes a new owner-only archive of every Orbit table with a content hash, row counts and the exclusions it lists. `import` restores an archive into an empty local installation (after `reset --yes`), then rebuilds search; run `setup` with the archive's owner email to sign in again. Archives contain private customer data.

### Deploy and release

```sh
node scripts/rer.mjs deploy --dry-run
node scripts/rer.mjs deploy
node scripts/rer.mjs release --help
```

`deploy` deploys to your own Cloudflare account with the Base deploy kit and needs `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, `OWNER_EMAIL`, `MAIL_FROM` and `SENDGRID_API_KEY` in the environment; `--dry-run` builds and validates locally without any provider request. [OPERATIONS.md](OPERATIONS.md) lists the token scopes, optional secrets and what to keep. `release` produces a source release receipt and never pushes or deploys.

`node scripts/rer.mjs describe` lists every command, flag, effect and pin; `node scripts/rer.mjs doctor` diagnoses tools and local settings.

## Author and release

`edition.json` selects the edition-owned source graph; `sources.lock.json` records effective bytes and retained comparison origins. Follow [AUTHORING.md](AUTHORING.md) to inspect, lock, check, materialize and release from this repository. `composition.lock.json` is historical import evidence only; it never replaces local source or selects a current release. Preserve migrations and recorded owner intent when integrating updates.

The Base command line (`scripts/base-cli/`), setup lifecycle (`scripts/base-onboarding/`), mail module (`src/base/modules/mail/`) and their contract documents ([RUN-LOCALLY.md](RUN-LOCALLY.md), [SEED-COMMAND-CONTRACT.md](SEED-COMMAND-CONTRACT.md)) are byte-exact copies of Base; `node scripts/rer.mjs check --profile first-party` fails if any copied byte drifts. Refresh them from a Base checkout with `node scripts/export-cli.mjs ORBIT_ROOT`.

## Customise and share improvements

The maintained edition defaults save integration and verification work. Configuration and hooks are conveniences; editing domain internals, core schema, UI, framework or infrastructure is ordinary authoring too. Choose the change that serves the owner's outcome, without a required sequence of extension mechanisms. Complex merges and adaptation are the agent's work. Preserve the owner's actual requirements wherever recorded: `CONTRACT.md`, `DIVERGENCE.md`, owner instructions and optional `.seed/intent.md`; no particular intent file or registry is required.

Feed useful mechanisms, defaults and verification cases back into shared source when they would save work in another edition. Their natural home may be this edition, a family, Base or an independent repository; no separate repository per module or universal compatibility interface is required. Verify adoption against the receiving product's requirements, including deliberate local differences.

The edition carries editable shared SendGrid transport and authoring 1.1 source. `node scripts/edition-authoring/cli.mjs changes` explains changed inputs; `extract` and `compare` provide retained source and incoming comparison context. SendGrid 202 is accepted with a nullable provider receipt: local correlation identifies the command, not remote delivery, and uncertain submissions are reconciled without automatic repetition.
