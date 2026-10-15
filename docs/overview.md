# Orbit

Orbit is a CRM that keeps every deal moving. When a customer replies, Orbit puts that deal in your NOW queue and tells you why, so you always know who to follow up with next. It is free and open source under the MIT licence, and you run it yourself.

## What you work with

- **NOW** is your list of deals that need you, highest score first. Each one shows why it is there: a customer reply, a delivery problem, or a score that just moved up a band.
- **Each deal's page** shows its stage, owner, value and score, the customer activity behind the score, the suggested next action, and every message you have sent.
- **Customer records** hold your contacts, companies and deals, with your own fields. You can bring contacts and companies in from a CSV file and merge duplicates.
- **Your contact form** is a simple landing page you write and publish from Orbit. Each enquiry becomes a contact with the enquiry on its timeline.
- **Collaborators** sign in with their own email address. You choose what each one can see and change.
- **Reports** count what is in your records, and **Notifications** tell you when a deal needs you or a message could not be delivered.

## How a score works

A score is what customers did, added up. A booked meeting adds 45, a reply 40, a form 25, a chat 20, and smaller things like a page view add a little. An unsubscribe or a bounced email takes points away. Older activity counts for less and stops counting after 30 days. Your own notes never change a score.

Scores run from 0 to 100. A score of 70 or more is high and 40 or more is medium. Open any deal to see what each piece of activity added.

## You approve every email

Orbit sends nothing to a customer on its own. You review the exact message, the recipient and the subject, then approve it. If anything changes after you looked, such as a new reply from the customer, Orbit asks you to look again.

When a customer replies, Orbit cancels any follow-up you scheduled for that person. Messages you send outside the recipient's working hours wait for your confirmation of their local time.

## Run it on your computer

Install [RER](https://runeditrun.com) and use Node 22 or later. RER selects Orbit's pinned Node 22.20.0 runtime and pnpm 10.12.4 automatically.

```sh
git clone https://github.com/just-every/run-orbit.git && cd run-orbit
rer dev
```

`dev` installs dependencies, prepares the local trial owner (`owner@orbit.test`) on the first launch and starts Orbit. Open the private `RER_OPEN` link it prints on this computer: you are already signed in. No email is sent locally. Your first sign-in asks for your business name, time zone, currency and pipeline stages, and then you are in. Change the trial email in Settings → Installation owner, or use your real owner mailbox from the start: run `rer install` and `rer setup --owner-email EMAIL` before `rer dev`.


Stop it with `rer dev --stop` or Ctrl-C. Your data stays on your computer between runs. Stop `dev` and `preview` before CLI export, import, reset, build or verification.

## Hosted sign-in and removal

After deployment, open `/signin` at your hosted origin, enter your active operator email, follow the emailed link and press **Confirm**. Hosted mail requires a verified `MAIL_FROM` and `SENDGRID_API_KEY`; `rer signin` recovers owner access without email. Run it from the deploying checkout with the same Cloudflare credentials as deploy; add `--environment NAME` and `--env-file FILE` as needed. Open the private link it prints once within 15 minutes, then correct a wrong owner email in Settings. RER never saves that link. A restore retains current full operators and the active hosted owner, imports new archived operators as ordinary operators and revokes sessions, so sign in again afterwards.

To remove the hosted installation, first save a private backup, then run `rer deploy --remove --yes` from the deploying checkout, adding the same `--environment NAME` if you chose one. Keep its `.rer/deploy/<environment>.json` receipt so RER can identify the resources it created and verify their removal. Removal deletes hosted data.

## Where to go next

1. [Local command reference](../RUN-LOCALLY.md) covers every local command, including reset, export and import.
2. [Operations](../OPERATIONS.md) shows how to deploy Orbit for your team and keep a backup.
3. [Signals and customer mail](../SIGNALS-AND-OUTREACH.md) connects your email and other tools, so replies and activity reach your deals.
4. [Updating and recovery](../MIGRATION-RECOVERY.md) explains how to update a deployed Orbit safely, with a backup first.
