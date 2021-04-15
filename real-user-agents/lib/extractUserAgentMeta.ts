import { UAParser } from 'ua-parser-js';

export default function extractUserAgentMeta(userAgentString) {
  const uaParser = new UAParser(userAgentString);
  const uaBrowser = uaParser.getBrowser();
  const uaOs = uaParser.getOS();
  const name = uaBrowser.name || 'unknown';
  const versions = uaBrowser.version?.split('.') || [];
  const version = { major: versions[0] || '0', minor: versions[1] || '0', patch: versions[2] };
  const osName = uaOs.name || 'unknown';
  const osVersions = uaOs.version?.split('.') || [];
  const osVersion = { major: osVersions[0] || '0', minor: osVersions[1] || '0' };
  return { name, version, osName, osVersion };
}
