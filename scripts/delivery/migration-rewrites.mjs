import {readMigrationRewrites, withRewrites, validateMigrations} from '@runeditrun/rer/internal/modules/deploy-kit/migrations.mjs';
import {synchronizeOwnershipSql} from '../installer/ownership-sql.mjs';
import {array, keys} from './base/bindings.mjs';

/** Direct and Managed packaging use RER's same reviewed migration declaration. */
export async function withReviewedMigrationRewrites(root, migrations) {
  await synchronizeOwnershipSql(root, {check:true});
  const rewrites = await readMigrationRewrites(root);
  for (const rewrite of rewrites) {
    if (migrations.filter(item => item.name === rewrite.migration).length !== 1) throw Error('Reviewed migration rewrite requires one unambiguous migration binding');
  }
  return withRewrites(migrations, rewrites);
}

/** The artifact carries only the prior digest and reason, as native RER does. */
export function validateMigrationRewrites(migration) {
  if (migration.rewrites === undefined) return;
  const rewrites = array(migration.rewrites, 'migration rewrites');
  if (rewrites.length > 1000 || new Set(rewrites.map(item => item?.from)).size !== rewrites.length) throw Error('Invalid migration rewrites');
  for (const rewrite of rewrites) {
    keys(rewrite, ['from','reason'], 'migration rewrite');
    if (typeof rewrite.reason !== 'string' || rewrite.reason.length > 1000) throw Error('Invalid migration rewrite reason');
  }
  validateMigrations([migration]);
}
