import UAParser from 'ua-parser-js';

export default function extractUserAgentMeta(userAgentString) {
  const uaParsed = UAParser(userAgentString);
  const name = uaParsed.browser.name;
  if (!uaParsed.browser.version) {
    console.log('NON-PARSABLE BROWSER VERSION: ', userAgentString, uaParsed.browser);
    console.log(new Error(''));
  }
  const versions = uaParsed.browser.version.split('.');
  const version = { major: versions[0], minor: versions[1], patch: versions[2] };
  const osName = uaParsed.os.name;
  if (!uaParsed.os.version) {
    console.log('NON-PARSABLE OS VERSION: ', userAgentString, uaParsed.os);
    console.log(new Error(''));
  }
  const osVersions = uaParsed.os.version.split('.');
  const osVersion = { major: osVersions[0], minor: osVersions[1] };
  return { name, version, osName, osVersion };
}
