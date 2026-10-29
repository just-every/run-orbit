# Connected applications

A connected application is another program, for example your own Penny, that reads records you choose in Orbit, and can propose handoff tasks, on your behalf. It never gets your password. It can never send or approve customer mail, invite people or change who signs in. You set it up in Orbit under **Settings › Team › Connected applications** (`/delegation/settings`), and everything below can be done from that page.

## Do you need this?

Only when an application's setup asks you to connect Orbit. Today that is Penny's Learning, which reads chosen Orbit opportunities as evidence. If you use no such application, there is nothing to do: Orbit works fully without it.

## Two words used here

- **Consent**: Orbit shows you exactly which records the application asks for and what it wants to do with them. Nothing happens until you choose **Allow selected access**. If you signed in more than 10 minutes ago, Orbit first emails you a “Confirm it's you” link to open in the same browser.
- **Delegation**: what you hand over when you allow it. The application acts as you, only on those records and only for those actions, for 30 days or until you revoke it.

What an application may do is one or both of:

| On the consent page | What it means |
| --- | --- |
| Read the chosen records | It reads each chosen record; an opportunity includes its contacts and company. |
| Propose handoff tasks on the chosen opportunities | It adds internal tasks, which a person accepts, edits or dismisses. |

## Step 1: Register the application

Fill in two values and choose **Register application**.

- **Client identifier**: a short name for the application, using letters, numbers, `-` and `_`, for example `penny`. If the application's setup names one, use exactly that; otherwise choose one.
- **Exact callback URL**: where Orbit sends you back after you choose Allow. Use the address the application's setup gives you. If it gives none, as with Penny today, keep Orbit's own address, which the page fills in for you: your Orbit address followed by `/delegation/callback`, for example `https://orbit.example.com/delegation/callback`. Orbit then shows you the access key to paste into the application.

Tick “The application runs on this computer” only for a test copy of the application whose callback starts with `http://localhost` or `http://127.0.0.1`. Every other callback must start with `https://`.

## Step 2: Connect it

- **With Orbit's own callback**: choose **Connect** beside the application. Search for records by name, tick each one, keep or change what it may do, and choose **Continue to consent**. Choose **Allow selected access**; if Orbit says it emailed you, open the “Confirm it's you” email in the same browser and choose Allow again. Orbit shows the access key once, and a test listing what the application can now read.
- **With the application's own callback**: start from the application. It opens Orbit's consent page with the records it asks for; choose Allow there.

## Step 3: Check that it works

The page Orbit shows after you allow an application says **Test passed** and lists the records it can read. Later, choose **Check this connection** beside any delegation to see the same test, or why it no longer works (revoked, expired, its application disabled, or never collected its access key). Choose **Revoke** to stop it at once; **Disable application** stops every delegation it holds.

## Example: connecting Penny

1. In Orbit, register client identifier `penny` and keep Orbit's own callback, for example `https://orbit.example.com/delegation/callback`.
2. Choose **Connect** beside penny. Search for the opportunities Penny should learn from, tick them, keep “Read the chosen records” and choose **Continue to consent**.
3. Choose **Allow selected access**. If Orbit says it emailed you, open the “Confirm it's you” email in this browser and choose Allow again.
4. Orbit shows “Test passed: penny can read 2 records as …”, the access key, and an `orbit` section like this one to paste into Penny's `PENNY_LEARNING` deployment setting:

   ```json
   {
     "origin": "https://orbit.example.com",
     "token": "the access key Orbit showed",
     "installationId": "the installation ID Orbit showed",
     "audiencePrincipalIds": ["the Orbit people who can see these records"],
     "readCostMicros": 0
   }
   ```

5. Penny lists the records by name with the records call below, and reads each one as evidence.

## For application developers

Orbit speaks `rer-delegation/1`; the calls, scopes and errors are in [Delegation protocol](DELEGATION-PROTOCOL.md).
