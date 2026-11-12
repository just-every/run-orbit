# Microsoft documented permissions

Observed 2026-11-12 via the official Microsoft Graph v1.0 documentation.

- Create message: https://learn.microsoft.com/en-us/graph/api/user-post-messages?view=graph-rest-1.0
  Delegated work or school and delegated personal account: Mail.ReadWrite.
- Send existing message: https://learn.microsoft.com/en-us/graph/api/message-send?view=graph-rest-1.0
  Least privileged delegated permission: Mail.Send.
- Send mail directly: https://learn.microsoft.com/en-us/graph/api/user-sendmail?view=graph-rest-1.0
  Least privileged delegated permission: Mail.Send. This is a different flow from the required create-then-send.
- Get mailbox user profile: https://learn.microsoft.com/en-us/graph/api/user-get?view=graph-rest-1.0
  Least privileged delegated permission: User.Read; Mail.Read is not listed as an alternative.

No additional permission was requested. No Microsoft send was made. A permission decision or an explicitly authorized alternative send flow is needed before this limb can be implemented honestly.
