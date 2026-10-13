import type { EditionIdentity } from './base/identity';
import { publicProductConfig } from './core/app/mounts/public-config';
import site from '../deploy-site.json';

export const identity: EditionIdentity = {
  product: 'Orbit',
  deployment: publicProductConfig.name,
  purpose: '{deployment}’s customer records, signals and next actions, in one private workspace.',
  tagline: 'Your next deal finds you.',
  signInPath: '/signin',
  runSite: `https://${site.domain}`,
  installedHome: 'lobby',
  theme: '/rer-theme.css',
  mark: '/brand/mark.svg',
  band: '/brand/band.svg',
  fonts: '/brand/fonts.css',
};
