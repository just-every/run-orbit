# Mechanical receipt

MECHANICAL lock=node node_modules/@runeditrun/rer/edition-authoring/cli.mjs lock; node node_modules/@runeditrun/rer/edition-authoring/cli.mjs check exit=0; views=node src/base/contract-docs.mjs write; node src/base/contract-docs.mjs check exit=0; ledger=none exit=0.

The generator reports that contract documents are current after write. ACCEPTANCE.md and docs/CLAIMS.md were then restored whole from origin/main. Neither generated view is included in the product commit. sources.lock.json was regenerated after the final test-path cleanup and passes its integrity check. No migration was added or edited.

All 204 parent Status row identities remain, in order; 458 total table rows before and after. Clause acceptance text, statuses, summary counts and other judgments are unchanged. ACTION-002 Evidence and Gap are the only contract edit.

The first-party command is pnpm exec rer check --profile first-party (exit 0). The typecheck is pnpm run typecheck (exit 0). The repository retains its current rer pin and Base-derived files.

Cloud source and test commands used the supplied toolchain shim (VM Node v24.19.0, pnpm 10.12.4); the repository declares Node 22.20.0 and branch Verify uses that pin. No local full-suite or publication-scan result is claimed.
