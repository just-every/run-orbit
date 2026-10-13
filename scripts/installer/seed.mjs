import * as presentation from './ui/seed.mjs';
import { adapter } from './local.mjs';
export function createSeed() {
 return { ...adapter, product: presentation.product.name, setup: { manifestFile: 'rer-setup.json' }, browserModule: 'scripts/installer/ui/seed.mjs', background: 'scripts/installer/ui/background.svg' };
}
