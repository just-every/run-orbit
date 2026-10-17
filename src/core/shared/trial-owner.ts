/** `rer dev` names a checkout's zero-setup owner `owner@<folder>.test` (owner@run-orbit.test for the documented clone); `.test` is reserved, so no real mailbox matches. */
export const isTrialOwnerEmail=(email:string)=>/^owner@[a-z0-9-]{1,63}\.test$/.test(email.toLowerCase());
/** The same rule over an SQL text expression. */
export const trialOwnerSql=(email:string)=>`(lower(${email}) GLOB 'owner@?*.test' AND length(${email})<=74 AND substr(lower(${email}),7,length(${email})-11) NOT GLOB '*[^a-z0-9-]*')`;
/** `rer dev` personas live at `<as>@dev.localhost`, a reserved name no real mailbox uses. */
export const isDevPersonaEmail=(email:string)=>email.toLowerCase().endsWith('@dev.localhost');
export const devPersonaSql=(email:string)=>`(lower(${email}) LIKE '%@dev.localhost')`;
