import '@ulixee/commons/lib/SourceMapSupport';
import importBrowserProfiles from '@double-agent/runner/lib/importFoundationalProfiles';
import * as externalUserAgentConfig from '../data/external/userAgentConfig.json';
import { getExternalDataPath } from '../paths';

const profilesDir = getExternalDataPath('0-foundational-profiles');

importBrowserProfiles(profilesDir, externalUserAgentConfig).catch(console.error);
