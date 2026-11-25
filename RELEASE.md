# Orbit 0.4.13

Date: 2026-11-25

Previous version: 0.4.12

Orbit 0.4.13 supports hosted setup with mail disabled and lets the setup owner sign in with `rer signin`. It retains rer 0.2.113.

- Deploy with `MAIL_PROVIDER=none` when no mail provider is configured. Use `rer signin` to open the owner sign-in link and confirm it in the browser. The link expires and can be used once.
- Orbit disables invitations and email delivery while mail is off. Keep the existing provider configuration if the workspace uses email delivery.

### Upgrade

Stop writes and take a private backup before updating from 0.4.12 in place. Apply `migrations/core/0093_owner_signin_rer.sql` through the usual rer upgrade. The migration moves existing owner sign-in grants to the table rer uses. Preserve the migration ledger and all previously applied migrations.

[Orbit NOW queue screenshot](.github/assets/release/orbit-now-queue-1600.png)

## Migrations

- `migrations/core/0093_owner_signin_rer.sql` moves owner sign-in grants to the table shared with rer.

## Update instructions

Update from 0.4.12 in place after stopping writes and taking a private backup outside the checkout. Use rer export locally or Records → Export archive when hosted. Adopt v0.4.13 and run rer install with Node 22.20.0, pnpm 10.12.4 and rer 0.2.113. Use rer setup locally or rer deploy --env-file .dev.vars.deploy when hosted. Preserve the migration ledger, all previously applied migrations and owner customizations. Let rer apply migrations/core/0093_owner_signin_rer.sql once. Older installations must first account for earlier pending migrations. Preserve the workspace's existing provider configuration if it uses email delivery. With MAIL_PROVIDER=none, use rer signin to confirm owner access and verify existing records before resuming writes.

Release metadata prepared by sd, 2026-11-25.
