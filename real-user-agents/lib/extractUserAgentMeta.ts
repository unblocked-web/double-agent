import UAParser from 'ua-parser-js';

export default function extractUserAgentMeta(userAgentString) {
  const uaParsed = UAParser(userAgentString);
  const name = uaParsed.browser.name || 'unknown';
  const versions = uaParsed.browser.version?.split('.') || [];
  const version = { major: versions[0] || '0', minor: versions[1] || '0', patch: versions[2] };
  const osName = uaParsed.os.name || 'unknown';
  const osVersions = uaParsed.os.version?.split('.') || [];
  const osVersion = { major: osVersions[0] || '0', minor: osVersions[1] || '0' };
  return { name, version, osName, osVersion };
}
