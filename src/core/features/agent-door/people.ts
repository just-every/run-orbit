import type {PeopleAdapter, Person} from '../../../base/modules/agent-door/index.ts';
import type {TeamAdapter, ManagedMember} from '../../../base/modules/business-settings/types.ts';
import {createOrbitIdentity} from '../identity/auth';
import {personColumns, personOf, type PersonRow} from '../identity/store';
import type {PlatformBindings} from '../../platform/assets';
import {AuthError} from '@runeditrun/rer/modules/operator-auth';

export const nativePersonAdmission = `(o.setup_owner=1 OR NOT EXISTS(SELECT 1 FROM identity_domain_policies p WHERE p.domain=substr(lower(o.email),instr(o.email,'@')+1)) OR EXISTS(
 SELECT 1 FROM identity_domain_policies p JOIN oa_identity_providers ip ON ip.provider_id=p.provider_id
 JOIN identity_bindings b ON b.issuer=ip.issuer AND b.operator_id=o.id
 WHERE p.domain=substr(lower(o.email),instr(o.email,'@')+1) AND ip.status='linked'
 AND EXISTS(SELECT 1 FROM identity_settings WHERE id=1 AND idp_sign_in=1)))`;

/** Business subjects bind to operators.id. Roster email is never a bearer identity. */
export function orbitPeople(bindings: PlatformBindings): PeopleAdapter {
  const db = bindings.DB;
  async function person(id: string): Promise<Person | null> {
    const native = personOf(await db.prepare(`SELECT ${personColumns('o')} FROM operators o WHERE o.id=? AND ${nativePersonAdmission}`).bind(id).first<PersonRow>());
    if (!native || native.status !== 'active') return null;
    const membership = await db.prepare("SELECT 1 FROM access_memberships WHERE operator_id=? AND status='active'").bind(id).first();
    if (!membership) return null;
    return {id: native.id, email: native.email, name: native.displayName, role: native.role, active: true};
  }
  const owner = () => db.prepare("SELECT id FROM operators WHERE setup_owner=1 AND status='active'").first<{id:string}>();
  async function businessMember(subject: Person) {
    if (!await person(subject.id)) return null;
    const settings = await db.prepare('SELECT owner_id FROM bs_settings WHERE singleton=1 AND stopped=0').first<{owner_id:string|null}>();
    if (!settings) return null;
    if (settings.owner_id && (await owner())?.id === subject.id) return {id: settings.owner_id, role: 'owner' as const};
    const rows = (await db.prepare("SELECT business_id,business_role FROM bs_team WHERE operator_id=? AND state='active' AND business_id IS NOT NULL").bind(subject.id).all<{business_id:string;business_role:string}>()).results;
    return rows.length === 1 ? {id: rows[0]!.business_id, role: rows[0]!.business_role === 'admin' ? 'editor' as const : null} : null;
  }
  return {
    person, businessMember,
    businessRole: subject => subject.role === 'owner' ? 'owner' : subject.role === 'admin' ? 'editor' : null,
    async sponsor({sub}) {
      const settings = await db.prepare('SELECT owner_id FROM bs_settings WHERE singleton=1 AND stopped=0').first<{owner_id:string|null}>();
      if (!settings) return null;
      if (settings.owner_id === sub) {const native = await owner(); return native ? person(native.id) : null;}
      const row = await db.prepare("SELECT operator_id FROM bs_team WHERE business_id=? AND state='active'").bind(sub).first<{operator_id:string|null}>();
      return row?.operator_id ? person(row.operator_id) : null;
    },
    async session(request) {
      const identity = createOrbitIdentity(bindings);
      if (!identity) return null;
      try {const current = await identity.auth.getSession(request);return current ? person(current.operator.id) : null;}
      catch(error) {if(error instanceof AuthError)return null;throw error;}
    },
  };
}

/** Native onboarding remains native. Signed roster sync binds existing people;
 * it neither creates a full seller nor accepts a collaborator invitation. */
export function orbitTeam(db: D1Database): TeamAdapter {
  return {
    async ownerEmail() {return (await db.prepare("SELECT email FROM operators WHERE setup_owner=1 AND status='active'").first<{email:string}>())?.email ?? null;},
    async prepare({members, managed}) {
      const rows: ManagedMember[] = [];
      for (const member of members) {
        const prior = managed.find(row => member.id && row.businessId === member.id) ?? managed.find(row => row.email === member.email);
        // Once bound, even a removed identity owns its mapping. Address changes
        // cannot move work, audit or pending approval to a different operator.
        const native = prior?.operatorId
          ? await db.prepare('SELECT id,status FROM operators WHERE id=?').bind(prior.operatorId).first<{id:string;status:string}>()
          : await db.prepare('SELECT id,status FROM operators WHERE lower(email)=?').bind(member.email).first<{id:string;status:string}>();
        const membership = native && await db.prepare("SELECT 1 FROM access_memberships WHERE operator_id=? AND status='active'").bind(native.id).first();
        const duplicate = native && rows.some(row => row.operatorId === native.id);
        const owner = native && await db.prepare('SELECT 1 FROM operators WHERE id=? AND setup_owner=1').bind(native.id).first();
        rows.push({email:member.email, operatorId:native?.id ?? prior?.operatorId ?? null, invite:member.invite,
          state: duplicate || owner || !native ? 'conflict' : native.status === 'active' && membership ? 'active' : 'inactive'});
      }
      for (const old of managed) if (!members.some(member => member.email === old.email)) rows.push({...old,state:'inactive'});
      return {statements:[], rows, async afterCommit() {}};
    },
  };
}
