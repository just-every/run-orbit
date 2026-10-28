# Getting started

Orbit runs on your own computer. Open a terminal (on a Mac, Terminal in Applications → Utilities; on Windows, your WSL2 distribution), copy this line into it and press Enter:

```sh
curl -fsSL https://runeditrun.com/install.sh | sh -s -- dev just-every/run-orbit
```

Git is required; rer brings Node and pnpm. Already have Node 22 or later? `npx -y @runeditrun/rer dev just-every/run-orbit` does the same.

The line installs `rer`, the Run Edit Run command, clones Orbit's `main` into a `run-orbit` folder, installs everything, prepares a local trial owner (`owner@run-orbit.test`) and starts Orbit. Open the private `RER_OPEN` link it prints, on the same computer: you are already signed in. Your first sign-in asks for your business name, time zone, currency and pipeline stages. This free copy runs only on your computer and nobody else can open it. It sends no email until you add your own SendGrid settings in Settings → Customer mail sender; after that, customer mail you approve is real.

If the installer prints a line that puts `rer` on your PATH, run that line too. To start Orbit again later, run the same line from the same folder, or `cd run-orbit && rer dev`. `rer dev --stop` stops it.

Next: the [Overview](overview.md) explains NOW, scores and approvals, [Run it locally](../RUN-LOCALLY.md) lists every command, and [Operations](../OPERATIONS.md) covers deploying Orbit to your own Cloudflare account.
