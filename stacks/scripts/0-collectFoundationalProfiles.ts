import * as Path from 'path';
import {
  CollectFoundationalProfilesOptions,
  importSlabProfiles,
} from '@double-agent/runner/lib/collectFoundationalProfiles';
import externalUserAgentConfig from '../data/external/userAgentConfig.json';

const options: CollectFoundationalProfilesOptions = {
  slabDataDir: process.env.SLAB_DATA_DIR || Path.resolve(__dirname, '../../../slab/vault/data'),
};
const profilesDir = Path.join(__dirname, '../data/external/0-foundational-profiles');

importSlabProfiles(profilesDir, externalUserAgentConfig, options).catch(console.error);
