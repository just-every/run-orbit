# Sales foundation

The shared headless source captures two needs present in both editions: a stable
commercial contact email key and a relationship that cannot point at an unknown
person or opportunity. Ferry maps people/deals to those identifiers; Orbit maps
contacts/opportunities. Database schemas and persistence stay with their editions.

Email keys trim surrounding whitespace and lowercase the address. They preserve
plus tags and dots rather than silently merging distinct contacts. Contacts may
lack email; that gives a null key. Present malformed identities fail explicitly.

Relationship validation takes the edition's known identifiers. It does not choose
roles, require a primary participant, or impose a lifecycle. Ferry's commitment
and health semantics and Orbit's signal, score and recommendation semantics are
edition-owned. This is intentionally a small foundation, not a universal CRM model.

Run `node --test core/tests/*.test.ts` on Node 26. Exported tests resolve sources
through `RER_COMPONENT_SOURCE` when provided.

This retained component guide describes the imported implementation. Current source
selection is owned by this edition's `edition.json`; edit integrated source here
and follow the root `AUTHORING.md`. Legacy family assembly is not this edition's
writer. Useful changes may be rolled back into shared source for deliberate adoption.
